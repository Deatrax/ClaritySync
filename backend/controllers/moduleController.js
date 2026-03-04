const supabase = require('../db');

// GET /api/settings/modules
const getModules = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('v_module_config')
            .select('*');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('getModules error:', err);
        res.status(500).json({ error: 'Failed to fetch module configuration' });
    }
};

// PUT /api/settings/modules/:moduleName
const toggleModule = async (req, res) => {
    const { moduleName } = req.params;
    const { is_enabled } = req.body;
    const userId = req.user.user_id;

    try {
        const { error } = await supabase.rpc('proc_toggle_module', {
            p_acting_user_id: userId,
            p_module_name: moduleName.toUpperCase(),
            p_enable: is_enabled
        });

        if (error) throw error;
        res.json({ success: true, message: `Module ${moduleName} ${is_enabled ? 'enabled' : 'disabled'} successfully.` });
    } catch (err) {
        console.error('toggleModule error:', err);
        res.status(500).json({ error: 'Failed to toggle module', details: err.message });
    }
};

module.exports = {
    getModules,
    toggleModule
};
