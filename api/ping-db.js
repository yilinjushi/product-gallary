import { createClient } from '@supabase/supabase-js';

// Vercel Cron Job to keep Supabase from pausing
// Runs according to the schedule in vercel.json
export default async function handler(req, res) {
    // Optional: Verify the request is coming from Vercel Cron
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error('Supabase credentials missing');
        }

        const supabase = createClient(url, key);

        // Perform a lightweight query to wake/keep the database active
        const { data, error } = await supabase
            .from('site_settings')
            .select('id')
            .limit(1);

        if (error) throw error;

        return res.status(200).json({
            status: 'success',
            message: 'Supabase pinged successfully',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Ping failed:', err);
        return res.status(500).json({ error: 'Ping failed: ' + err.message });
    }
}
