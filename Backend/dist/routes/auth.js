import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rosuighor_super_secret_key_iffat_25082002';
// Sign Up / Register
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phone, password, language_pref, theme_pref } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'Name, email, and password required' });
            return;
        }
        // Check existing
        const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (existing.rows.length > 0) {
            res.status(409).json({ success: false, message: 'Email already registered' });
            return;
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const result = await query(`INSERT INTO users (name, email, phone, password_hash, language_pref, theme_pref)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, language_pref, theme_pref, created_at`, [
            name.trim(),
            email.toLowerCase().trim(),
            phone ? phone.trim() : null,
            passwordHash,
            language_pref || 'bn',
            theme_pref || 'light'
        ]);
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
});
// Sign In / Login
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password required' });
            return;
        }
        const result = await query('SELECT id, name, email, phone, password_hash, language_pref, theme_pref FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            success: true,
            message: 'Signed in successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                language_pref: user.language_pref,
                theme_pref: user.theme_pref
            }
        });
    }
    catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ success: false, message: 'Server error during signin' });
    }
});
// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await query('SELECT id, name, email, phone, avatar_url, language_pref, theme_pref, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, user: result.rows[0] });
    }
    catch (error) {
        console.error('Me endpoint error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Update Preferences (Language or Theme)
router.patch('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { language_pref, theme_pref } = req.body;
        const result = await query(`UPDATE users
       SET language_pref = COALESCE($1, language_pref),
           theme_pref = COALESCE($2, theme_pref)
       WHERE id = $3
       RETURNING id, name, email, language_pref, theme_pref`, [language_pref, theme_pref, userId]);
        res.json({ success: true, user: result.rows[0] });
    }
    catch (error) {
        console.error('Preferences error:', error);
        res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
});
export default router;
