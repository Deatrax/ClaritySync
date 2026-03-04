// utils/settingsCache.js
// In-memory cache for general settings — avoids a DB round-trip on every request.
// Cache is busted whenever settings are updated or an asset is uploaded.

let _cache = null;
let _cacheTime = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid() {
    return _cache !== null && (Date.now() - _cacheTime) < CACHE_TTL_MS;
}

async function getCachedSettings(supabase) {
    if (isCacheValid()) return _cache;

    const { data, error } = await supabase
        .from('v_general_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) throw error;

    _cache = data;
    _cacheTime = Date.now();
    return _cache;
}

function bustSettingsCache() {
    _cache = null;
    _cacheTime = null;
}

module.exports = { getCachedSettings, bustSettingsCache };
