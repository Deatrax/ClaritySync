const supabase = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST /api/auth/signup  →  calls sp_signup_user RPC
// bcrypt hashing stays in JS; all DB logic is in the RPC.
const signup = async (req, res) => {
    const { email, password, employee_id } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password in Node.js (bcrypt cannot run inside PostgreSQL)
        const passwordHash = await bcrypt.hash(password, 10);

        // Call Supabase RPC — handles first-user employee creation,
        // duplicate checks, and user_account insert atomically.
        const { data: newUser, error } = await supabase.rpc('sp_signup_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_employee_id: employee_id ? parseInt(employee_id) : null
        });

        if (error) {
            // Surface specific error messages raised from the RPC
            const msg = error.message || '';
            if (msg.includes('EMAIL_EXISTS')) return res.status(400).json({ error: 'Email already registered' });
            if (msg.includes('EMPLOYEE_REQUIRED')) return res.status(400).json({ error: 'Employee profile is required' });
            if (msg.includes('EMPLOYEE_ACCOUNT_EXISTS')) return res.status(400).json({ error: 'This employee profile already has a user account' });
            throw error;
        }

        // Generate JWT token
        const token = jwt.sign(
            { user_id: newUser.user_id, email: newUser.email, employee_id: newUser.employee_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: newUser
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Signup failed', details: err.message });
    }
};

// Helper — fire-and-forget login log (never blocks the response)
const recordLogin = (email, success, failureReason, ip, userAgent) => {
    supabase.rpc('proc_record_login', {
        p_email: email,
        p_success: success,
        p_failure_reason: failureReason || null,
        p_ip_address: ip || null,
        p_user_agent: userAgent || null
    }).then(({ error }) => {
        if (error) console.error('proc_record_login error:', error.message);
    });
};

// POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Fetch user (password comparison must happen in JS via bcrypt)
        const { data: user } = await supabase
            .from('user_account')
            .select('user_id, email, password_hash, is_active, employee_id')
            .eq('email', email)
            .single();

        if (!user) {
            recordLogin(email, false, 'USER_NOT_FOUND', ip, userAgent);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active) {
            recordLogin(email, false, 'ACCOUNT_INACTIVE', ip, userAgent);
            return res.status(401).json({ error: 'User account is inactive' });
        }

        // Verify password (bcrypt comparison stays in JS)
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            recordLogin(email, false, 'INVALID_PASSWORD', ip, userAgent);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Record successful login (proc_record_login also updates last_login)
        recordLogin(email, true, null, ip, userAgent);

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, employee_id: user.employee_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                employee_id: user.employee_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
};

// POST /api/auth/logout
const logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('user_account')
            .select('user_id, email, employee_id, is_active')
            .eq('user_id', req.user.user_id)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

module.exports = {
    signup,
    login,
    logout,
    getProfile
};
