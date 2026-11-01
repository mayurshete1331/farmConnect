const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// All endpoints in this file are restricted to Admin role
router.use(authenticate, requireRole('admin'));

// 1. GET PENDING / REJECTED / APPROVED ACCOUNTS QUEUE
router.get('/approvals', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const [users] = await db.query(
      `SELECT u.id, u.name, u.phone, u.role, u.pincode, u.address, u.profile_photo_url, 
              u.approval_status, u.rejection_reason, u.created_at,
              fp.farm_name, fp.village, fp.district, fp.state, fp.upi_id,
              tp.vehicle_type, tp.vehicle_number, tp.operating_pincodes
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN transporter_profiles tp ON u.id = tp.user_id
       WHERE u.approval_status = ? AND u.role != 'admin'
       ORDER BY u.created_at DESC`,
      [status]
    );

    return res.json({ users });
  } catch (err) {
    console.error('Fetch approvals error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending account approvals.' });
  }
});

// 2. DECIDE ON ACCOUNT (APPROVE OR REJECT)
router.post('/approvals/:id/decide', async (req, res) => {
  try {
    const userId = req.params.id;
    const { decision, rejection_reason } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected.' });
    }

    const [user] = await db.query('SELECT id, name, role FROM users WHERE id = ?', [userId]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.query(
      'UPDATE users SET approval_status = ?, rejection_reason = ? WHERE id = ?',
      [decision, decision === 'rejected' ? rejection_reason || 'Application not eligible.' : null, userId]
    );

    return res.json({
      message: `Account for ${user[0].name} has been ${decision}.`,
      userId,
      decision
    });
  } catch (err) {
    console.error('Account decision error:', err);
    return res.status(500).json({ error: 'Failed to update account approval status.' });
  }
});

// 3. GET PLATFORM OVERVIEW & METRICS
router.get('/overview', async (req, res) => {
  try {
    const [userCount] = await db.query(
      `SELECT role, approval_status, COUNT(*) as count 
       FROM users GROUP BY role, approval_status`
    );

    const [bucketCount] = await db.query(
      `SELECT status, COUNT(*) as count, SUM(current_quantity) as total_quantity 
       FROM buckets GROUP BY status`
    );

    const [disputeCount] = await db.query(
      `SELECT COUNT(*) as pending_disputes 
       FROM farmer_reviews WHERE dispute_status = 'pending_review'`
    );

    const [complaintCount] = await db.query(
      `SELECT COUNT(*) as pending_complaints 
       FROM customer_complaints WHERE status = 'submitted'`
    );

    const [depositStats] = await db.query(
      `SELECT SUM(security_deposit_balance) as total_deposit_held 
       FROM farmer_profiles`
    );

    return res.json({
      users: userCount,
      buckets: bucketCount,
      pending_disputes: disputeCount[0]?.pending_disputes || 0,
      pending_complaints: complaintCount[0]?.pending_complaints || 0,
      total_deposit_held: depositStats[0]?.total_deposit_held || 0
    });
  } catch (err) {
    console.error('Overview error:', err);
    return res.status(500).json({ error: 'Failed to fetch platform metrics.' });
  }
});

// 4. USERS MANAGEMENT (View with unmasked phone numbers, block/unblock, penalty)
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, phone, role, pincode, approval_status, is_blocked, 
              penalty_due, strikes_count, profile_photo_url, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.post('/users/:id/toggle-block', async (req, res) => {
  try {
    const userId = req.params.id;
    const [user] = await db.query('SELECT is_blocked FROM users WHERE id = ?', [userId]);
    if (user.length === 0) return res.status(404).json({ error: 'User not found.' });

    const newBlockedState = !user[0].is_blocked;
    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [newBlockedState, userId]);

    return res.json({
      message: `User has been ${newBlockedState ? 'blocked' : 'unblocked'}.`,
      is_blocked: newBlockedState
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not toggle user block status.' });
  }
});

router.post('/users/:id/penalty', async (req, res) => {
  try {
    const userId = req.params.id;
    const { penalty_amount, action } = req.body; // action: 'set' or 'clear'

    if (action === 'clear') {
      await db.query('UPDATE users SET penalty_due = 0.00, is_blocked = FALSE WHERE id = ?', [userId]);
      return res.json({ message: 'User penalty cleared and account unblocked.' });
    } else {
      await db.query('UPDATE users SET penalty_due = ?, is_blocked = TRUE WHERE id = ?', [penalty_amount, userId]);
      return res.json({ message: `Penalty of ₹${penalty_amount} set. Account blocked until settled.` });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Could not update penalty.' });
  }
});

// 5. FARMER SECURITY DEPOSITS MANAGEMENT
router.get('/deposits', async (req, res) => {
  try {
    const [deposits] = await db.query(
      `SELECT fp.id as profile_id, fp.user_id, u.name as farmer_name, u.phone,
              fp.farm_name, fp.village, fp.district, fp.upi_id,
              fp.security_deposit_balance, fp.deposit_status
       FROM farmer_profiles fp
       JOIN users u ON fp.user_id = u.id
       ORDER BY fp.security_deposit_balance DESC`
    );

    const [transactions] = await db.query(
      `SELECT dt.id, dt.farmer_id, u.name as farmer_name, dt.transaction_type, 
              dt.amount, dt.upi_reference, dt.admin_notes, dt.created_at
       FROM deposit_transactions dt
       JOIN users u ON dt.farmer_id = u.id
       ORDER BY dt.created_at DESC LIMIT 50`
    );

    return res.json({ deposits, transactions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch deposits data.' });
  }
});

router.post('/deposits/record', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { farmer_id, transaction_type, amount, upi_reference, admin_notes } = req.body;
    const numAmount = parseFloat(amount);

    if (!farmer_id || !transaction_type || isNaN(numAmount) || numAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Valid farmer ID, transaction type, and amount are required.' });
    }

    // Insert audit record
    await connection.query(
      `INSERT INTO deposit_transactions (farmer_id, transaction_type, amount, upi_reference, admin_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [farmer_id, transaction_type, numAmount, upi_reference || null, admin_notes || null]
    );

    // Update farmer balance
    if (transaction_type === 'initial_deposit' || transaction_type === 'rolling_hold') {
      await connection.query(
        `UPDATE farmer_profiles 
         SET security_deposit_balance = security_deposit_balance + ?, deposit_status = 'active' 
         WHERE user_id = ?`,
        [numAmount, farmer_id]
      );
    } else if (transaction_type === 'penalty_deduction' || transaction_type === 'deposit_refund') {
      await connection.query(
        `UPDATE farmer_profiles 
         SET security_deposit_balance = GREATEST(0, security_deposit_balance - ?) 
         WHERE user_id = ?`,
        [numAmount, farmer_id]
      );
    }

    await connection.commit();
    return res.json({ message: 'Deposit transaction recorded and balance updated.' });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to record deposit transaction.' });
  } finally {
    connection.release();
  }
});

// 6. DISPUTES & COMPLAINTS CONSOLE
router.get('/disputes', async (req, res) => {
  try {
    // Quality disputes with photos from customers
    const [disputes] = await db.query(
      `SELECT fr.id, fr.farmer_id, f.name as farmer_name, fr.customer_id, c.name as customer_name,
              fr.bucket_id, fr.rating, fr.issue_reported, fr.evidence_photo_url, fr.review_comment,
              fr.dispute_status, fr.refund_issued, fr.created_at, b.hub_name
       FROM farmer_reviews fr
       JOIN users f ON fr.farmer_id = f.id
       JOIN users c ON fr.customer_id = c.id
       JOIN buckets b ON fr.bucket_id = b.id
       WHERE fr.issue_reported != 'none'
       ORDER BY fr.created_at DESC`
    );

    // Farmer complaints against customers
    const [complaints] = await db.query(
      `SELECT cc.id, cc.farmer_id, f.name as farmer_name, cc.customer_id, c.name as customer_name,
              cc.bucket_id, cc.complaint_reason, cc.incident_details, cc.status, 
              cc.admin_action_notes, cc.created_at
       FROM customer_complaints cc
       JOIN users f ON cc.farmer_id = f.id
       JOIN users c ON cc.customer_id = c.id
       ORDER BY cc.created_at DESC`
    );

    return res.json({ disputes, complaints });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch disputes and complaints.' });
  }
});

// Resolve a customer quality dispute (optionally refund from farmer deposit and block farmer)
router.post('/disputes/:id/resolve', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const disputeId = req.params.id;
    const { action, refund_amount, block_farmer } = req.body; // action: 'refund' | 'reject'

    const [dispute] = await connection.query(
      'SELECT farmer_id, customer_id, bucket_id FROM farmer_reviews WHERE id = ?',
      [disputeId]
    );

    if (dispute.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Dispute record not found.' });
    }

    const { farmer_id } = dispute[0];

    if (action === 'refund') {
      const refundNum = parseFloat(refund_amount) || 0;
      await connection.query(
        'UPDATE farmer_reviews SET dispute_status = "refunded_from_deposit", refund_issued = ? WHERE id = ?',
        [refundNum, disputeId]
      );

      // Deduct from farmer deposit
      if (refundNum > 0) {
        await connection.query(
          `UPDATE farmer_profiles 
           SET security_deposit_balance = GREATEST(0, security_deposit_balance - ?) 
           WHERE user_id = ?`,
          [refundNum, farmer_id]
        );
        await connection.query(
          `INSERT INTO deposit_transactions (farmer_id, transaction_type, amount, admin_notes)
           VALUES (?, 'penalty_deduction', ?, 'Refund issued to customer for faulty produce')`,
          [farmer_id, refundNum]
        );
      }
    } else {
      await connection.query(
        'UPDATE farmer_reviews SET dispute_status = "rejected" WHERE id = ?',
        [disputeId]
      );
    }

    if (block_farmer) {
      await connection.query('UPDATE users SET is_blocked = TRUE WHERE id = ?', [farmer_id]);
    }

    await connection.commit();
    return res.json({ message: 'Dispute updated successfully.' });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ error: 'Could not resolve dispute.' });
  } finally {
    connection.release();
  }
});

// 7. PLATFORM SETTINGS
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await db.query('SELECT setting_key, setting_value FROM platform_settings');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    return res.json({ settings: settingsMap });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      );
    }
    return res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// 8. ALL BUCKETS & VERIFICATION CODES (Admin Oversight)
router.get('/buckets', async (req, res) => {
  try {
    const [buckets] = await db.query(
      `SELECT b.id, b.hub_name, b.delivery_pincode, b.delivery_landmark, b.delivery_address,
              b.current_quantity, b.target_quantity, b.status, b.farmer_verification_code,
              l.produce_name, l.unit,
              u_farmer.name as farmer_name, u_farmer.phone as farmer_phone,
              u_driver.name as driver_name, u_driver.phone as driver_phone
       FROM buckets b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u_farmer ON l.farmer_id = u_farmer.id
       LEFT JOIN users u_driver ON b.assigned_driver_id = u_driver.id
       ORDER BY b.created_at DESC`
    );

    const [members] = await db.query(
      `SELECT bm.id, bm.bucket_id, bm.customer_id, bm.quantity, bm.total_bill,
              bm.advance_amount_due, bm.remaining_cod_due, bm.pickup_pin,
              bm.delivery_status, u.name as customer_name, u.phone as customer_phone
       FROM bucket_members bm
       JOIN users u ON bm.customer_id = u.id
       ORDER BY bm.bucket_id DESC, bm.id ASC`
    );

    return res.json({ buckets, members });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch buckets and verification codes.' });
  }
});

module.exports = router;
