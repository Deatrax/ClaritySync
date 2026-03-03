const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const setupRoutes = require('./routes/setupRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const salesRoutes = require('./routes/salesRoutes');
const contactRoutes = require('./routes/contactRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionCategoryRoutes = require('./routes/transactionCategoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');
const logsRoutes = require('./routes/logsRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/banking/categories', transactionCategoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/settings/admin-users', adminUsersRoutes);
app.use('/api/settings/logs', logsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
