const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'farmconnect_super_secure_jwt_secret_key_2026_india';

// Verify token and load user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const [rows] = await db.query(
      'SELECT id, name, phone, role, pincode, profile_photo_url, approval_status, rejection_reason, is_blocked, penalty_due FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    const user = rows[0];

    if (user.is_blocked) {
      return res.status(403).json({
        error: 'Your account is currently blocked due to a penalty or policy violation.',
        penalty_due: user.penalty_due
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

// Ensure user account has been approved by admin
const requireApproved = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }
  if (req.user.approval_status === 'pending') {
    return res.status(403).json({
      error: 'Your account is pending Admin approval. You will receive access once verified.',
      approval_status: 'pending'
    });
  }
  if (req.user.approval_status === 'rejected') {
    return res.status(403).json({
      error: 'Your account application was rejected by Admin.',
      approval_status: 'rejected',
      rejection_reason: req.user.rejection_reason
    });
  }
  next();
};

// Role based access guard
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions.' });
    }
    next();
  };
};

module.exports = {
  authenticate,
  requireApproved,
  requireRole,
  JWT_SECRET
};
