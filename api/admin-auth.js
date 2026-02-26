const crypto = require('crypto');

module.exports = (req, res) => {
    // CORS headers
    res.setHeader('Content-Type', 'application/json');

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret';
        const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { password } = body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            return res.status(500).json({ error: 'ADMIN_PASSWORD env var not set' });
        }

        if (password !== adminPassword) {
            return res.status(401).json({ error: '密码错误' });
        }

        // Generate a signed token with timestamp
        const timestamp = Date.now();
        const expiresAt = timestamp + TOKEN_MAX_AGE_MS;
        const payload = `${timestamp}:${expiresAt}`;
        const signature = crypto
            .createHmac('sha256', TOKEN_SECRET)
            .update(payload)
            .digest('hex');
        const token = `${payload}:${signature}`;

        return res.status(200).json({
            success: true,
            token,
            expiresAt,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
};
