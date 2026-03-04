const supabase = require('../db');

/**
 * Shared utility for logging system activity.
 * 
 * @param {Object} req - Express request object (used to extract user info and IP)
 * @param {Object} options - Log details
 * @param {string} options.action - e.g. 'INSERT', 'UPDATE', 'DELETE', 'ADD_STOCK'
 * @param {string} options.module - e.g. 'INVENTORY', 'SALES', 'EMPLOYEES'
 * @param {string} [options.targetTable] - The DB table affected
 * @param {number} [options.targetId] - The ID of the record affected
 * @param {Object} [options.oldValues] - JSON object of values before the action
 * @param {Object} [options.newValues] - JSON object of values after the action
 * @param {string} [options.description] - Human-readable description
 */
const logActivity = async (req, { action, module, targetTable, targetId, oldValues, newValues, description }) => {
    try {
        const user = req.user; // Set by verifyToken middleware
        const ip = req.ip || req.headers['x-forwarded-for'] || null;

        // Fetch employee name for the log if not provided
        let employeeName = null;
        if (user?.employee_id) {
            const { data: emp } = await supabase
                .from('employee')
                .select('name')
                .eq('employee_id', user.employee_id)
                .single();
            employeeName = emp?.name;
        }

        const { error } = await supabase
            .from('system_activity_log')
            .insert([{
                user_id: user?.user_id || null,
                employee_name: employeeName || 'System',
                action,
                module,
                target_table: targetTable,
                target_id: targetId,
                old_values: oldValues,
                new_values: newValues,
                description,
                ip_address: ip
            }]);

        if (error) {
            console.error('logActivity error:', error.message);
        }
    } catch (err) {
        console.error('logActivity helper error:', err.message);
    }
};

module.exports = { logActivity };
