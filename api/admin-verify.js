const crypto = require('crypto');

module.exports = (req, res) => {
    // Set content type
    res.setHeader('Content-Type', 'application/json');

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret';

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { token } = body;

        if (!token) {
            return res.status(401).json({ valid: false, error: 'No token provided' });
        }

        const parts = token.split(':');
        if (parts.length !== 3) {
            return res.status(401).json({ valid: false, error: 'Invalid token format' });
        }

        const [timestamp, expiresAt, signature] = parts;
        const payload = `${timestamp}:${expiresAt}`;

        // Verify HMAC signature
        const expectedSignature = crypto
            .createHmac('sha256', TOKEN_SECRET)
            .update(payload)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(401).json({ valid: false, error: 'Invalid token' });
        }

        // Check expiry
        if (Date.now() > parseInt(expiresAt, 10)) {
            return res.status(401).json({ valid: false, error: 'Token expired' });
        }

        return res.status(200).json({ valid: true });
    } catch (err) {
        return res.status(500).json({ valid: false, error: 'Token validation failed: ' + err.message });
    }
};
