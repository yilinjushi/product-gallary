import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        // No product ID, serve normal page
        return serveStaticHtml(res);
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return serveStaticHtml(res);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: product, error } = await supabase
            .from('products')
            .select('id, title, description, images')
            .eq('id', id)
            .single();

        if (error || !product) {
            return serveStaticHtml(res);
        }

        const title = `先越科技 - ${product.title || '产品'}`;
        const description = title; // No functional parameters as requested
        const image = product.images && product.images.length > 0 ? product.images[0] : '';
        const url = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/?product=${id}`;

        // Read the built index.html and inject OG tags
        const html = generateHtml(title, description, image, url, id);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (err) {
        console.error('product-og error:', err);
        return serveStaticHtml(res);
    }
}

function serveStaticHtml(res) {
    // Redirect to the normal SPA
    res.setHeader('Location', '/');
    return res.status(302).end();
}

function generateHtml(title, description, image, url, productId) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#000000" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <!-- Open Graph / WeChat -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}

    <meta http-equiv="refresh" content="0;url=/?product=${escapeHtml(productId)}" />
</head>
<body>
    <p>正在跳转到产品页面...</p>
</body>
</html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
