import axios from 'axios';

// Ensure this matches your backend port (default 5000)
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

export const getProducts = () => api.get('/products');
export const addProduct = (data) => api.post('/products', data);

export const getAccounts = () => api.get('/accounts');
export const addAccount = (data) => api.post('/accounts', data);

export const getTransactions = () => api.get('/transactions');
export const addTransaction = (data) => api.post('/transactions', data);

export const getEmployees = () => api.get('/employees');
export const addEmployee = (data) => api.post('/employees', data);

export default api;
