const supabase = require('../db');
const { bustSettingsCache } = require('../utils/settingsCache');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
// Use the service-role key for storage writes (falls back to anon key if not set)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const BUCKET = 'company-assets';

const ALLOWED_ASSETS = {
    logo: { path: 'logo/logo.png', mimes: ['image/png', 'image/jpeg', 'image/webp'] },
    favicon: { path: 'favicon/favicon.ico', mimes: ['image/x-icon', 'image/png'] },
    banner: { path: 'banner/social-banner.png', mimes: ['image/png', 'image/jpeg', 'image/webp'] },
};

// GET /api/settings/general
const getGeneralSettings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('v_general_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('getGeneralSettings error:', err);
        res.status(500).json({ error: 'Failed to fetch general settings', details: err.message });
    }
};

// PUT /api/settings/general
const updateGeneralSettings = async (req, res) => {
    const userId = req.user.user_id;
    const {
        company_name, company_email, company_phone, company_address, company_website,
        currency_code, currency_symbol, currency_position,
        logo_url, favicon_url, social_banner_url,
    } = req.body;

    try {
        const { error } = await supabase.rpc('proc_update_general_settings', {
            p_acting_user_id: userId,
            p_company_name: company_name ?? null,
            p_company_email: company_email ?? null,
            p_company_phone: company_phone ?? null,
            p_company_address: company_address ?? null,
            p_company_website: company_website ?? null,
            p_currency_code: currency_code ?? null,
            p_currency_symbol: currency_symbol ?? null,
            p_currency_position: currency_position ?? null,
            p_logo_url: logo_url ?? null,
            p_favicon_url: favicon_url ?? null,
            p_social_banner_url: social_banner_url ?? null,
        });

        if (error) throw error;

        bustSettingsCache();
        res.json({ success: true, message: 'General settings updated successfully.' });
    } catch (err) {
        console.error('updateGeneralSettings error:', err);
        res.status(500).json({ error: 'Failed to update general settings', details: err.message });
    }
};

// POST /api/settings/general/upload/:asset
const uploadAsset = async (req, res) => {
    const { asset } = req.params;
    const userId = req.user.user_id;

    const assetConfig = ALLOWED_ASSETS[asset];
    if (!assetConfig) {
        return res.status(400).json({ error: `Unknown asset type: ${asset}` });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    const { path: storagePath, mimes } = assetConfig;
    const mimeType = req.file.mimetype;

    if (!mimes.includes(mimeType)) {
        return res.status(400).json({ error: `Invalid file type for ${asset}. Allowed: ${mimes.join(', ')}` });
    }

    try {
        // Upload to Supabase Storage (upsert overwrites the same path so the URL never changes)
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: req.file.buffer,
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': mimeType,
                'x-upsert': 'true',
            },
        });

        if (!uploadRes.ok) {
            const errBody = await uploadRes.text();
            throw new Error(`Storage upload failed (${uploadRes.status}): ${errBody}`);
        }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

        // Persist the URL in the DB via the procedure
        const colParam = {
            logo: 'p_logo_url',
            favicon: 'p_favicon_url',
            banner: 'p_social_banner_url',
        }[asset];

        const { error: rpcError } = await supabase.rpc('proc_update_general_settings', {
            p_acting_user_id: userId,
            [colParam]: publicUrl,
        });

        if (rpcError) throw rpcError;

        bustSettingsCache();
        res.json({ url: publicUrl });
    } catch (err) {
        console.error(`uploadAsset(${asset}) error:`, err);
        res.status(500).json({ error: 'Asset upload failed', details: err.message });
    }
};

module.exports = { getGeneralSettings, updateGeneralSettings, uploadAsset };
