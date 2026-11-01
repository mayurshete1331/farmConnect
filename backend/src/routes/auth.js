const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Helper to save base64 live photo if provided as string
const saveBase64Photo = (base64String, prefix = 'profile') => {
  if (!base64String || !base64String.includes('base64,')) {
    return null;
  }
  const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
};

// 1. REGISTER USER
router.post('/register', upload.single('profile_photo'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      name,
      phone,
      password,
      role,
      pincode,
      address,
      live_photo_base64,
      // Farmer specific fields
      farm_name,
      village,
      district,
      state,
      upi_id,
      // Transporter specific fields
      vehicle_type,
      vehicle_number,
      operating_pincodes
    } = req.body;

    if (!name || !phone || !password || !role || !pincode) {
      await connection.rollback();
      return res.status(400).json({ error: 'Name, phone, password, role, and pincode are required.' });
    }

    if (!['consumer', 'farmer', 'transporter'].includes(role)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Role must be consumer, farmer, or transporter.' });
    }

    // Determine photo URL
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (live_photo_base64) {
      photoUrl = saveBase64Photo(live_photo_base64, 'profile');
    }

    if (!photoUrl) {
      // Default placeholder if camera access was unavailable during demo
      photoUrl = '/uploads/default-avatar.png';
    }

    // Check if phone already registered
    const [existing] = await connection.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'This phone number is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Default approval status: 'pending' (Admin must approve/reject)
    const approval_status = 'pending';

    const [userResult] = await connection.query(
      `INSERT INTO users (name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, password_hash, role, pincode, address || null, photoUrl, approval_status]
    );

    const userId = userResult.insertId;

    if (role === 'farmer') {
      if (!farm_name || !village || !district || !state || !upi_id) {
        await connection.rollback();
        return res.status(400).json({ error: 'Farm name, village, district, state, and UPI ID are required for farmers.' });
      }
      await connection.query(
        `INSERT INTO farmer_profiles (user_id, farm_name, village, district, state, upi_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, farm_name, village, district, state, upi_id]
      );
    } else if (role === 'transporter') {
      if (!vehicle_type || !vehicle_number || !operating_pincodes) {
        await connection.rollback();
        return res.status(400).json({ error: 'Vehicle type, vehicle number, and operating pincodes are required for transporters.' });
      }
      await connection.query(
        `INSERT INTO transporter_profiles (user_id, vehicle_type, vehicle_number, operating_pincodes)
         VALUES (?, ?, ?, ?)`,
        [userId, vehicle_type, vehicle_number, operating_pincodes]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Account registered successfully! Your account is submitted for Admin approval.',
      userId,
      approval_status: 'pending'
    });
  } catch (err) {
    await connection.rollback();
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  } finally {
    connection.release();
  }
});

// 2. LOGIN USER
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required.' });
    }

    const [users] = await db.query(
      `SELECT id, name, phone, password_hash, role, pincode, address, profile_photo_url, 
              approval_status, rejection_reason, is_blocked, penalty_due 
       FROM users WHERE phone = ?`,
      [phone]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        error: 'Your account is currently blocked.',
        penalty_due: user.penalty_due
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return profile (omit sensitive password hash)
    delete user.password_hash;

    return res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. GET CURRENT PROFILE (/me)
router.get('/me', authenticate, async (req, res) => {
  try {
    let profileDetails = {};

    if (req.user.role === 'farmer') {
      const [fRows] = await db.query(
        'SELECT farm_name, village, district, state, upi_id, security_deposit_balance, deposit_status, average_rating, total_reviews FROM farmer_profiles WHERE user_id = ?',
        [req.user.id]
      );
      if (fRows.length > 0) profileDetails = fRows[0];
    } else if (req.user.role === 'transporter') {
      const [tRows] = await db.query(
        'SELECT vehicle_type, vehicle_number, operating_pincodes FROM transporter_profiles WHERE user_id = ?',
        [req.user.id]
      );
      if (tRows.length > 0) profileDetails = tRows[0];
    }

    return res.json({
      user: {
        ...req.user,
        ...profileDetails
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Could not fetch user profile.' });
  }
});

module.exports = router;
