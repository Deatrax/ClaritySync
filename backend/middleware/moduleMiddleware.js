const supabase = require('../db');

/**
 * Middleware to check if a specific module is enabled.
 * Returns 503 Service Unavailable if the module is disabled.
 */
const checkModule = (moduleName) => {
    return async (req, res, next) => {
        try {
            const { data: isEnabled, error } = await supabase.rpc('fn_is_module_enabled', {
                p_module_name: moduleName.toUpperCase()
            });

            if (error) {
                console.error(`Error checking module ${moduleName}:`, error.message);
                return next(); // Default to allowed if check fails
            }

            if (isEnabled === false) {
                return res.status(503).json({
                    error: 'Module Disabled',
                    message: `The ${moduleName} module is currently disabled by the administrator.`,
                    module: moduleName
                });
            }

            next();
        } catch (err) {
            console.error(`Middleware error for module ${moduleName}:`, err);
            next();
        }
    };
};

module.exports = { checkModule };
