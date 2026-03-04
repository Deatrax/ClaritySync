const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

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
const moduleRoutes = require('./routes/moduleRoutes');
const settingsGeneralRoutes = require('./routes/settingsGeneralRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const employeeTypeRoutes = require('./routes/employeeTypeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const warrantyRoutes = require('./routes/warrantyRoutes');
const rolesRoutes = require('./routes/rolesRoutes');

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
app.use('/api/activity-log', logsRoutes);
app.use('/api/settings/modules', moduleRoutes);
app.use('/api/settings/general', settingsGeneralRoutes);
app.use('/api/settings/roles', rolesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/employee-types', employeeTypeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/warranty', warrantyRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
