const supabase = require('../db');

// 7. Banking Accounts Endpoints
const getAllAccounts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('banking_account')
            .select('account_id, account_name, bank_name, branch_name, account_number, current_balance')
            .order('account_id', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createAccount = async (req, res) => {
    const { account_name, bank_name, branch_name, account_number, current_balance, account_type } = req.body;

    if (!account_name || !bank_name) {
        return res.status(400).json({ error: 'Account name and bank name are required' });
    }

    try {
        const { data, error } = await supabase
            .from('banking_account')
            .insert([{
                account_name,
                bank_name,
                branch_name: branch_name || null,
                account_number: account_number || null,
                current_balance: current_balance || 0,
                account_type: account_type || 'BANK'
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const deleteAccount = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('banking_account')
            .delete()
            .eq('account_id', id);

        if (error) throw error;
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllAccounts,
    createAccount,
    deleteAccount
};
