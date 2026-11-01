const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole, requireApproved } = require('../middleware/auth');

router.use(authenticate, requireRole('transporter'), requireApproved);

// 1. GET ASSIGNED DELIVERIES
router.get('/deliveries', async (req, res) => {
  try {
    const [deliveries] = await db.query(
      `SELECT b.id, b.hub_name, b.delivery_pincode, b.delivery_address, b.delivery_landmark,
              b.current_quantity, b.total_transport_cost, b.status, b.farmer_verification_code,
              b.delivery_window_start, b.delivery_window_end,
              l.produce_name, l.unit, fp.farm_name, fp.village as farm_location,
              u.name as farmer_name
       FROM buckets b
       JOIN listings l ON b.listing_id = l.id
       JOIN farmer_profiles fp ON l.farmer_id = fp.user_id
       JOIN users u ON l.farmer_id = u.id
       WHERE b.assigned_driver_id = ? AND b.status IN ('dispatched', 'delivered')
       ORDER BY b.delivery_window_start ASC, b.created_at DESC`,
      [req.user.id]
    );

    return res.json({ deliveries });
  } catch (err) {
    console.error('Fetch deliveries error:', err);
    return res.status(500).json({ error: 'Failed to fetch assigned deliveries.' });
  }
});

// 2. GET DELIVERY ROSTER WITH LIVE CUSTOMER PHOTOS FOR VISUAL HANDSHAKE
router.get('/deliveries/:bucketId/roster', async (req, res) => {
  try {
    const bucketId = req.params.bucketId;

    const [bucket] = await db.query(
      `SELECT b.*, l.produce_name, l.unit 
       FROM buckets b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ? AND b.assigned_driver_id = ?`,
      [bucketId, req.user.id]
    );

    if (bucket.length === 0) {
      return res.status(404).json({ error: 'Delivery order not found or unauthorized.' });
    }

    // Return members with 6-digit verification code, package quantity, and remaining COD cash
    const [members] = await db.query(
      `SELECT bm.id as member_id, bm.quantity, bm.remaining_cod_due, bm.cod_payment_status,
              bm.delivery_status, bm.delivered_at, bm.pickup_pin, bm.pickup_photo_url,
              u.id as customer_id, u.name as customer_name, u.profile_photo_url as customer_avatar
       FROM bucket_members bm
       JOIN users u ON bm.customer_id = u.id
       WHERE bm.bucket_id = ?
       ORDER BY bm.delivery_status ASC, bm.id ASC`,
      [bucketId]
    );

    return res.json({
      bucket: bucket[0],
      roster: members
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch delivery roster.' });
  }
});

// 3. COMPLETE DELIVERY HANDSHAKE (PIN Verification + Cash Collection)
router.post('/deliveries/:memberId/handshake', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const memberId = req.params.memberId;
    const { pickup_pin, cash_collected } = req.body;

    if (!pickup_pin) {
      await connection.rollback();
      return res.status(400).json({ error: 'Please enter the 6-digit delivery verification number shown on the customer screen.' });
    }

    const [memberRows] = await connection.query(
      `SELECT bm.*, b.assigned_driver_id 
       FROM bucket_members bm
       JOIN buckets b ON bm.bucket_id = b.id
       WHERE bm.id = ? FOR UPDATE`,
      [memberId]
    );

    if (memberRows.length === 0 || memberRows[0].assigned_driver_id !== req.user.id) {
      await connection.rollback();
      return res.status(404).json({ error: 'Member order not found or driver unauthorized.' });
    }

    const member = memberRows[0];

    if (member.delivery_status === 'delivered') {
      await connection.rollback();
      return res.status(400).json({ error: 'Order has already been handed over.' });
    }

    // Verify PIN match
    if (member.pickup_pin !== pickup_pin.toString().trim()) {
      await connection.rollback();
      return res.status(400).json({ error: 'Incorrect Pickup PIN. Please check customer screen.' });
    }

    const collectedAmount = parseFloat(cash_collected) || parseFloat(member.remaining_cod_due);

    await connection.query(
      `UPDATE bucket_members 
       SET delivery_status = 'delivered', cod_payment_status = 'paid', 
           delivered_at = NOW()
       WHERE id = ?`,
      [memberId]
    );

    // Check if all members in the bucket have been completed
    const [pendingMembers] = await connection.query(
      'SELECT COUNT(*) as pending_count FROM bucket_members WHERE bucket_id = ? AND delivery_status = "pending"',
      [member.bucket_id]
    );

    if (pendingMembers[0].pending_count === 0) {
      await connection.query(
        'UPDATE buckets SET status = "delivered" WHERE id = ?',
        [member.bucket_id]
      );
    }

    await connection.commit();

    return res.json({
      message: `Delivery verified! Collected ₹${collectedAmount} in cash.`,
      memberId,
      delivery_status: 'delivered'
    });
  } catch (err) {
    await connection.rollback();
    console.error('Handshake error:', err);
    return res.status(500).json({ error: 'Delivery handshake failed.' });
  } finally {
    connection.release();
  }
});

// 4. MARK CUSTOMER AS NO-SHOW (Instant Account Blacklist & Penalty)
router.post('/deliveries/:memberId/no-show', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const memberId = req.params.memberId;
    const { notes } = req.body;

    const [memberRows] = await connection.query(
      `SELECT bm.*, b.assigned_driver_id 
       FROM bucket_members bm
       JOIN buckets b ON bm.bucket_id = b.id
       WHERE bm.id = ? FOR UPDATE`,
      [memberId]
    );

    if (memberRows.length === 0 || memberRows[0].assigned_driver_id !== req.user.id) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found or driver unauthorized.' });
    }

    const member = memberRows[0];
    const penaltyAmount = 150.00; // Default penalty amount

    // Mark delivery as no_show
    await connection.query(
      'UPDATE bucket_members SET delivery_status = "no_show" WHERE id = ?',
      [memberId]
    );

    // Immediately freeze/block customer account and apply penalty
    await connection.query(
      `UPDATE users 
       SET is_blocked = TRUE, penalty_due = penalty_due + ?, strikes_count = strikes_count + 1 
       WHERE id = ?`,
      [penaltyAmount, member.customer_id]
    );

    // Record in penalties log
    await connection.query(
      `INSERT INTO penalties (user_id, bucket_id, penalty_amount, reason, status)
       VALUES (?, ?, ?, ?, 'unpaid')`,
      [member.customer_id, member.bucket_id, penaltyAmount, notes || 'Customer was absent at scheduled delivery drop point']
    );

    await connection.commit();

    return res.json({
      message: 'Customer marked as No-Show. Account has been blacklisted and penalized.',
      memberId,
      customer_id: member.customer_id,
      penalty_applied: penaltyAmount
    });
  } catch (err) {
    await connection.rollback();
    console.error('No show error:', err);
    return res.status(500).json({ error: 'Could not record no-show.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
