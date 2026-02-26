const crypto = require('crypto');

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret';

module.exports = (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body || {};

    if (!token) {
        return res.status(401).json({ valid: false, error: 'No token provided' });
    }

    try {
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
        return res.status(401).json({ valid: false, error: 'Token validation failed' });
    }
};
