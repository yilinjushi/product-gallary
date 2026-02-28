import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Reusable token verification (same as admin-verify.js)
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
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for admin ops
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
    return createClient(url, key);
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    // Auth check
    const token = req.headers['x-admin-token'];
    if (!token || !verifyToken(token)) {
        return res.status(401).json({ error: '未授权' });
    }

    try {
        const supabase = getSupabase();
        const action = req.query.action || '';

        if (req.method !== 'POST') {
            return res.status(405).json({ error: '只支持 POST 方法' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        // --- CREATE ---
        if (action === 'create') {
            const { title, description, images, tag, fav, views } = body;
            const { data, error } = await supabase.from('products').insert([{
                title,
                description,
                images,
                tag,
                fav,
                views,
                created_at: new Date().toISOString()
            }]).select();
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }

        // --- UPDATE ---
        if (action === 'update') {
            const { id, title, description, images, tag, fav, views } = body;
            if (!id) return res.status(400).json({ error: '缺少产品 ID' });

            const { data, error } = await supabase.from('products')
                .update({ title, description, images, tag, fav, views })
                .eq('id', id)
                .select();
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }

        // --- DELETE ---
        if (action === 'delete') {
            const { id } = body;
            if (!id) return res.status(400).json({ error: '缺少产品 ID' });

            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        // --- REORDER ---
        if (action === 'reorder') {
            const { updates } = body; // Array of { id, sort_order }
            if (!Array.isArray(updates)) return res.status(400).json({ error: '无效的数据格式' });

            // Perform updates sequentially or in parallel depending on scale
            for (const u of updates) {
                const { error } = await supabase.from('products')
                    .update({ sort_order: u.sort_order })
                    .eq('id', u.id);
                if (error) throw error;
            }
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: '无效的 action' });

    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
