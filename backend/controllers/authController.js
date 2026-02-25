const supabase = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Signup
const signup = async (req, res) => {
    const { email, password, employee_id } = req.body;

    try {
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        let targetEmployeeId = employee_id;

        // Special handling for first-time setup (if no employee_id provided)
        if (!targetEmployeeId) {
            // Check if any users exist
            const { count, error: countError } = await supabase
                .from('user_account')
                .select('*', { count: 'exact', head: true });

            if (countError) throw countError;

            // If no users exist, this is the First Run. Create a default Admin Employee.
            if (count === 0) {
                console.log('First user signup detected. Creating default Administrator employee...');

                const { data: newAdmin, error: adminError } = await supabase
                    .from('employee')
                    .insert([{
                        name: 'Administrator',
                        role: 'Admin',
                        designation: 'System Admin',
                        email: email, // Use the signup email for the employee record too
                        basic_salary: 0,
                        join_date: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
                        is_active: true
                    }])
                    .select('employee_id')
                    .single();

                if (adminError) {
                    console.error('Failed to create default admin:', adminError);
                    return res.status(500).json({ error: 'Failed to create default admin profile' });
                }

                targetEmployeeId = newAdmin.employee_id;
            } else {
                // Not the first user, so employee profile is mandatory
                return res.status(400).json({ error: 'Employee profile is required' });
            }
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('user_account')
            .select('user_id')
            .eq('email', email)
            .limit(1);

        if (existingUser && existingUser.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if employee_id already has a user account
        const { data: existingEmployeeUser } = await supabase
            .from('user_account')
            .select('user_id')
            .eq('employee_id', parseInt(targetEmployeeId))
            .limit(1);

        if (existingEmployeeUser && existingEmployeeUser.length > 0) {
            return res.status(400).json({ error: 'This employee profile already has a user account' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user account
        const { data: newUser, error } = await supabase
            .from('user_account')
            .insert([{
                email,
                password_hash: passwordHash,
                employee_id: parseInt(targetEmployeeId),
                is_active: true
            }])
            .select('user_id, email, employee_id')
            .single();

        if (error) throw error;

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

// Login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const { data: user } = await supabase
            .from('user_account')
            .select('user_id, email, password_hash, is_active, employee_id')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(401).json({ error: 'User account is inactive' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last_login
        await supabase
            .from('user_account')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', user.user_id);

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

// Logout
const logout = (req, res) => {
    // Token is removed on frontend
    res.json({ message: 'Logged out successfully' });
};

// Profile
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
