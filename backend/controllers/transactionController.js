const supabase = require('../db');

// 9. Transactions Endpoints
const getAllTransactions = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transaction')
            .select(`
                transaction_id,
                transaction_type,
                amount,
                description,
                transaction_date,
                category_id,
                to_account_id,
                from_account_id,
                transaction_category(name),
                to_account:banking_account!transaction_to_account_id_fkey(account_name),
                from_account:banking_account!transaction_from_account_id_fkey(account_name)
            `)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        const transactions = (data || []).map(t => ({
            transaction_id: t.transaction_id,
            transaction_type: t.transaction_type,
            amount: t.amount,
            description: t.description,
            transaction_date: t.transaction_date,
            category_id: t.category_id,
            category_name: t.transaction_category?.name || 'Uncategorized',
            account_name: ['INCOME', 'RECEIVE', 'SALE', 'INVESTMENT', 'DEPOSIT'].includes(t.transaction_type)
                ? t.to_account?.account_name
                : t.from_account?.account_name
        }));

        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const getTransactionById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('transaction')
            .select('*')
            .eq('transaction_id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const createTransaction = async (req, res) => {
    const {
        transaction_type,
        amount,
        description,
        transaction_date,
        banking_account_id,
        from_account_id,
        to_account_id,
        contact_id,
        category_id
    } = req.body;

    // 1. Validation
    if (!transaction_type || !amount) {
        return res.status(400).json({ error: 'Type and amount are required' });
    }

    // 2. Normalize Types for Database Enum
    let dbType = transaction_type;
    if (transaction_type === 'SALE') dbType = 'RECEIVE';
    if (transaction_type === 'INCOME') dbType = 'RECEIVE';
    if (transaction_type === 'EXPENSE') dbType = 'PAYMENT';

    // 3. Resolve Account IDs
    const isMoneyIn = ['RECEIVE', 'INVESTMENT', 'INCOME', 'SALE'].includes(dbType);
    const isMoneyOut = ['PAYMENT', 'TRANSFER', 'EXPENSE'].includes(dbType);

    let final_to_account_id = to_account_id ? parseInt(to_account_id) : null;
    let final_from_account_id = from_account_id ? parseInt(from_account_id) : null;

    if (banking_account_id) {
        if (isMoneyIn) final_to_account_id = parseInt(banking_account_id);
        else if (isMoneyOut) final_from_account_id = parseInt(banking_account_id);
    }

    try {
        // 4. INSERT ONLY
        // We do NOT manually update banking_account or contacts here.
        // SQL Triggers will do it automatically.
        const { data: transactionData, error: transError } = await supabase
            .from('transaction')
            .insert([{
                transaction_type: dbType, // We send 'RECEIVE' or 'PAYMENT'
                amount: parseFloat(amount),
                from_account_id: final_from_account_id,
                to_account_id: final_to_account_id,
                contact_id: contact_id ? parseInt(contact_id) : null,
                category_id: category_id ? parseInt(category_id) : null,
                description: description || null,
                transaction_date: transaction_date || new Date().toISOString()
            }])
            .select();

        if (transError) throw transError;

        // 5. Fetch updated balance (Purely for UI feedback)
        const target_account_id = isMoneyIn ? final_to_account_id : final_from_account_id;
        const { data: account } = await supabase
            .from('banking_account')
            .select('current_balance')
            .eq('account_id', target_account_id)
            .single();

        res.status(201).json({
            ...transactionData[0],
            new_balance: account?.current_balance
        });

    } catch (err) {
        console.error("Transaction Error:", err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = {
    getAllTransactions,
    getTransactionById,
    createTransaction
};
