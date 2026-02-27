import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Reusable token verification (same logic as admin-verify.js)
function verifyToken(token) {
    const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret';
    const parts = token.split(':');
    if (parts.length !== 3) return false;
    const [timestamp, expiresAt, signature] = parts;
    const payload = `${timestamp}:${expiresAt}`;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    if (signature !== expected) return false;
    if (Date.now() > parseInt(expiresAt, 10)) return false;
    return true;
}

function getSupabase() {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    return createClient(url, key);
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    // Auth check
    const token = req.headers['x-admin-token'];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ error: '未授权' });
    }

    const supabase = getSupabase();
    const action = req.query.action || '';

    // --- LIST backups ---
    if (req.method === 'GET' && action === 'list') {
        try {
            const { data, error } = await supabase
                .from('backups')
                .select('id, label, record_count, created_at')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return res.status(200).json({ backups: data });
        } catch (err) {
            return res.status(500).json({ error: '获取备份列表失败: ' + err.message });
        }
    }

    // --- CREATE backup ---
    if (req.method === 'POST' && action === 'create') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const label = body.label || '';

            // Fetch all products
            const { data: products, error: pErr } = await supabase
                .from('products')
                .select('*')
                .order('sort_order', { ascending: true });
            if (pErr) throw pErr;

            // Fetch site settings
            const { data: settings, error: sErr } = await supabase
                .from('site_settings')
                .select('*');
            if (sErr) throw sErr;

            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                record_count: (products || []).length,
                products: products || [],
                site_settings: settings || [],
            };

            // Insert into backups table
            const { error: insertErr } = await supabase
                .from('backups')
                .insert([{
                    label: label || `备份 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
                    data: backupData,
                    record_count: backupData.record_count,
                }]);
            if (insertErr) throw insertErr;

            return res.status(200).json({ success: true, record_count: backupData.record_count });
        } catch (err) {
            return res.status(500).json({ error: '创建备份失败: ' + err.message });
        }
    }

    // --- GET full backup data (for download) ---
    if (req.method === 'GET' && action === 'download') {
        try {
            const id = req.query.id;
            if (!id) {
                // Download current live data (not from backups table)
                const { data: products, error: pErr } = await supabase
                    .from('products')
                    .select('*')
                    .order('sort_order', { ascending: true });
                if (pErr) throw pErr;

                const { data: settings, error: sErr } = await supabase
                    .from('site_settings')
                    .select('*');
                if (sErr) throw sErr;

                const backupData = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    record_count: (products || []).length,
                    products: products || [],
                    site_settings: settings || [],
                };
                return res.status(200).json(backupData);
            }

            // Download from a specific backup record
            const { data, error } = await supabase
                .from('backups')
                .select('data')
                .eq('id', parseInt(id))
                .single();
            if (error) throw error;
            return res.status(200).json(data.data);
        } catch (err) {
            return res.status(500).json({ error: '下载备份失败: ' + err.message });
        }
    }

    // --- DELETE backup ---
    if (req.method === 'POST' && action === 'delete') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const { id } = body;
            if (!id) return res.status(400).json({ error: '缺少备份 ID' });

            const { error } = await supabase
                .from('backups')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: '删除备份失败: ' + err.message });
        }
    }

    return res.status(400).json({ error: '无效的 action 参数' });
}
