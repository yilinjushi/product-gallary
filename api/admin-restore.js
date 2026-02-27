import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers['x-admin-token'];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ error: '未授权' });
    }

    const supabase = getSupabase();

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { backupId, uploadedData } = body;

        let restoreData;

        if (uploadedData) {
            // Restore from uploaded JSON
            restoreData = uploadedData;
        } else if (backupId) {
            // Restore from backups table
            const { data, error } = await supabase
                .from('backups')
                .select('data')
                .eq('id', backupId)
                .single();
            if (error) throw error;
            restoreData = data.data;
        } else {
            return res.status(400).json({ error: '请提供备份 ID 或上传的数据' });
        }

        // Validate restore data
        if (!restoreData || !restoreData.products || !Array.isArray(restoreData.products)) {
            return res.status(400).json({ error: '无效的备份数据格式' });
        }

        // Validate record count
        if (restoreData.record_count !== undefined && restoreData.record_count !== restoreData.products.length) {
            return res.status(400).json({
                error: `数据完整性校验失败：声明 ${restoreData.record_count} 条记录，实际 ${restoreData.products.length} 条`
            });
        }

        // --- Step 1: Create a safety snapshot before restoring ---
        const { data: currentProducts, error: cpErr } = await supabase
            .from('products')
            .select('*')
            .order('sort_order', { ascending: true });
        if (cpErr) throw cpErr;

        const { data: currentSettings, error: csErr } = await supabase
            .from('site_settings')
            .select('*');
        if (csErr) throw csErr;

        const safetySnapshot = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            record_count: (currentProducts || []).length,
            products: currentProducts || [],
            site_settings: currentSettings || [],
        };

        const { error: snapErr } = await supabase
            .from('backups')
            .insert([{
                label: `⚠️ 恢复前自动快照 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
                data: safetySnapshot,
                record_count: safetySnapshot.record_count,
            }]);
        if (snapErr) throw snapErr;

        // --- Step 2: Delete all existing products ---
        const { error: delErr } = await supabase
            .from('products')
            .delete()
            .not('id', 'is', null); // Delete all rows
        if (delErr) throw delErr;

        // --- Step 3: Insert restored products ---
        if (restoreData.products.length > 0) {
            // Clean up products for insert (remove any generated fields that might conflict)
            const cleanProducts = restoreData.products.map(p => ({
                id: p.id,
                title: p.title,
                description: p.description || '',
                images: p.images || [],
                tag: p.tag || null,
                fav: p.fav ?? 300,
                views: p.views ?? 3000,
                sort_order: p.sort_order ?? 0,
                user_id: p.user_id || null,
                created_at: p.created_at || new Date().toISOString(),
            }));

            // Insert in batches of 50 to avoid payload limits
            for (let i = 0; i < cleanProducts.length; i += 50) {
                const batch = cleanProducts.slice(i, i + 50);
                const { error: insErr } = await supabase
                    .from('products')
                    .insert(batch);
                if (insErr) throw insErr;
            }
        }

        // --- Step 4: Restore site_settings if present ---
        if (restoreData.site_settings && restoreData.site_settings.length > 0) {
            for (const setting of restoreData.site_settings) {
                const { error: setErr } = await supabase
                    .from('site_settings')
                    .update({
                        about_text: setting.about_text,
                        contact_text: setting.contact_text,
                    })
                    .eq('id', setting.id);
                if (setErr) throw setErr;
            }
        }

        return res.status(200).json({
            success: true,
            restored_count: restoreData.products.length,
        });
    } catch (err) {
        return res.status(500).json({ error: '恢复失败: ' + err.message });
    }
}
