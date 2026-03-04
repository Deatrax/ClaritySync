const supabase = require('../db');

// Setup Database Tables
const initTables = async (req, res) => {
    try {
        console.log('Starting database initialization...');

        // Test connection
        const testResult = await supabase.from('category').select('*').limit(1);
        if (!testResult.error) {
            return res.json({ message: 'Database already initialized or tables exist' });
        }

        // Try to create tables using RPC or direct SQL
        // Since we can't run raw SQL via JS client, we'll try creating tables one by one
        const tables = [
            {
                name: 'category',
                check: async () => await supabase.from('category').select('*').limit(1)
            },
            {
                name: 'product',
                check: async () => await supabase.from('product').select('*').limit(1)
            },
            {
                name: 'category_attribute',
                check: async () => await supabase.from('category_attribute').select('*').limit(1)
            },
            {
                name: 'product_attribute_value',
                check: async () => await supabase.from('product_attribute_value').select('*').limit(1)
            }
        ];

        let missingTables = [];
        for (const table of tables) {
            const result = await table.check();
            if (result.error) {
                missingTables.push(table.name);
            }
        }

        if (missingTables.length > 0) {
            return res.status(400).json({
                error: 'Missing tables',
                missing: missingTables,
                hint: 'Please run the schema SQL in Supabase SQL Editor'
            });
        }

        res.json({ message: 'All tables initialized successfully' });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Setup error', details: err.message });
    }
};

module.exports = {
    initTables
};
