import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Reusable token verification
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
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key to bypass RLS
    if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return createClient(url, key);
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    // Auth check
    const token = req.headers['x-admin-token'];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ error: '未授权' });
    }

    const { action } = req.query;
    const supabase = getSupabase();

    try {
        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

            // --- CREATE ---
            if (action === 'create') {
                const { error } = await supabase.from('products').insert([body]);
                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            // --- UPDATE ---
            if (action === 'update') {
                const { id, ...updateData } = body;
                if (!id) return res.status(400).json({ error: '缺少 ID' });
                const { error } = await supabase.from('products').update(updateData).eq('id', id);
                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            // --- DELETE ---
            if (action === 'delete') {
                const { id } = body;
                if (!id) return res.status(400).json({ error: '缺少 ID' });
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            // --- REORDER ---
            if (action === 'reorder') {
                const { updates } = body; // Array of {id, sort_order}
                if (!Array.isArray(updates)) return res.status(400).json({ error: '无效的数据格式' });

                // Perform sequential updates (Supabase JS doesn't support bulk update with different values easily)
                for (const u of updates) {
                    const { error } = await supabase.from('products').update({ sort_order: u.sort_order }).eq('id', u.id);
                    if (error) throw error;
                }
                return res.status(200).json({ success: true });
            }
        }

        return res.status(400).json({ error: '无效的请求' });
    } catch (err) {
        console.error(`Product Admin API Error (${action}):`, err);
        return res.status(500).json({ error: err.message || '操作失败' });
    }
}
