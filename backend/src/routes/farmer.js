const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole, requireApproved } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate, requireRole('farmer'), requireApproved);

// 1. GET FARMER WALLET & SECURITY DEPOSIT STATUS
router.get('/wallet', async (req, res) => {
  try {
    const [profile] = await db.query(
      `SELECT security_deposit_balance, deposit_status, upi_id, average_rating, total_reviews 
       FROM farmer_profiles WHERE user_id = ?`,
      [req.user.id]
    );

    const depositBalance = parseFloat(profile[0]?.security_deposit_balance || 0);

    // Calculate current active listing exposure
    const [exposure] = await db.query(
      `SELECT SUM(price_per_unit * available_stock) as current_exposure 
       FROM listings 
       WHERE farmer_id = ? AND status = 'active'`,
      [req.user.id]
    );

    const currentExposure = parseFloat(exposure[0]?.current_exposure || 0);
    const maxAllowedExposure = depositBalance * 10; // 10x exposure rule

    const [transactions] = await db.query(
      `SELECT id, transaction_type, amount, upi_reference, admin_notes, created_at 
       FROM deposit_transactions 
       WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );

    return res.json({
      deposit_balance: depositBalance,
      deposit_status: profile[0]?.deposit_status || 'unpaid',
      current_exposure: currentExposure,
      max_allowed_exposure: maxAllowedExposure,
      exposure_remaining: Math.max(0, maxAllowedExposure - currentExposure),
      upi_id: profile[0]?.upi_id,
      transactions
    });
  } catch (err) {
    console.error('Wallet error:', err);
    return res.status(500).json({ error: 'Could not fetch farmer wallet data.' });
  }
});

// 2. CREATE CROP LISTING (Guarded by 10x Deposit Multiplier)
router.post('/listings', upload.single('image'), async (req, res) => {
  try {
    const {
      produce_name,
      category,
      description,
      unit,
      price_per_unit,
      min_bucket_quantity,
      available_stock,
      dispatch_deadline
    } = req.body;

    if (!produce_name || !unit || !price_per_unit || !min_bucket_quantity || !available_stock || !dispatch_deadline) {
      return res.status(400).json({ error: 'All produce details and deadlines are required.' });
    }

    const price = parseFloat(price_per_unit);
    const stock = parseFloat(available_stock);
    const minBucket = parseFloat(min_bucket_quantity);
    const newExposure = price * stock;

    // Check farmer deposit exposure limit
    const [profile] = await db.query(
      'SELECT security_deposit_balance FROM farmer_profiles WHERE user_id = ?',
      [req.user.id]
    );

    const depositBalance = parseFloat(profile[0]?.security_deposit_balance || 0);
    const maxAllowed = depositBalance * 10;

    const [activeExposure] = await db.query(
      `SELECT SUM(price_per_unit * available_stock) as exposure 
       FROM listings WHERE farmer_id = ? AND status = 'active'`,
      [req.user.id]
    );
    const currentExposure = parseFloat(activeExposure[0]?.exposure || 0);

    if (depositBalance > 0 && (currentExposure + newExposure > maxAllowed)) {
      return res.status(400).json({
        error: `Listing exceeds your 10x deposit quota. Current deposit: ₹${depositBalance} allows ₹${maxAllowed}. Adding this listing would require higher deposit collateral.`
      });
    }

    let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO listings (farmer_id, produce_name, category, description, unit, price_per_unit, 
                             min_bucket_quantity, available_stock, dispatch_deadline, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, produce_name, category || 'Fruits & Veg', description || null, unit, price, minBucket, stock, dispatch_deadline, imageUrl]
    );

    return res.status(201).json({
      message: 'Produce listed successfully!',
      listingId: result.insertId
    });
  } catch (err) {
    console.error('Create listing error:', err);
    return res.status(500).json({ error: 'Failed to create produce listing.' });
  }
});

// 3. GET OWN LISTINGS
router.get('/listings', async (req, res) => {
  try {
    const [listings] = await db.query(
      `SELECT l.*, 
              (SELECT COUNT(*) FROM buckets b WHERE b.listing_id = l.id) as total_buckets,
              (SELECT COALESCE(SUM(b.current_quantity), 0) FROM buckets b WHERE b.listing_id = l.id) as total_pledged
       FROM listings l
       WHERE l.farmer_id = ?
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    return res.json({ listings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch listings.' });
  }
});

// 4. GET BUCKETS FORMING FOR FARMER PRODUCE
router.get('/buckets', async (req, res) => {
  try {
    const [buckets] = await db.query(
      `SELECT b.*, l.produce_name, l.unit, l.price_per_unit,
              u.name as creator_name,
              d.name as driver_name
       FROM buckets b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.creator_user_id = u.id
       LEFT JOIN users d ON b.assigned_driver_id = d.id
       WHERE l.farmer_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return res.json({ buckets });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch buckets.' });
  }
});

// 5. GET DETAILED BUCKET ROSTER & MEMBERS
router.get('/buckets/:id/members', async (req, res) => {
  try {
    const bucketId = req.params.id;

    // Verify ownership
    const [bucket] = await db.query(
      `SELECT b.*, l.produce_name, l.farmer_id 
       FROM buckets b 
       JOIN listings l ON b.listing_id = l.id 
       WHERE b.id = ? AND l.farmer_id = ?`,
      [bucketId, req.user.id]
    );

    if (bucket.length === 0) {
      return res.status(404).json({ error: 'Bucket not found or access unauthorized.' });
    }

    // Members list with 6-digit delivery verification PIN for Farmer validation
    const [members] = await db.query(
      `SELECT bm.id, bm.quantity, bm.produce_subtotal, bm.transport_share, bm.platform_fee,
              bm.total_bill, bm.advance_amount_due, bm.advance_payment_status, bm.advance_upi_utr,
              bm.remaining_cod_due, bm.cod_payment_status, bm.pickup_pin, bm.pickup_photo_url, bm.delivery_status,
              u.name as customer_name, u.profile_photo_url as customer_photo
       FROM bucket_members bm
       JOIN users u ON bm.customer_id = u.id
       WHERE bm.bucket_id = ?
       ORDER BY bm.created_at ASC`,
      [bucketId]
    );

    return res.json({ bucket: bucket[0], members });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch bucket members.' });
  }
});

// 6. FARMER ACTION ON BUCKET (Accept partial, Extend, Dispatch, Cancel)
router.post('/buckets/:id/action', async (req, res) => {
  try {
    const bucketId = req.params.id;
    const { action, new_deadline, driver_id, total_transport_cost, delivery_window_start, delivery_window_end } = req.body;

    const [bucket] = await db.query(
      `SELECT b.*, l.farmer_id, l.price_per_unit 
       FROM buckets b 
       JOIN listings l ON b.listing_id = l.id 
       WHERE b.id = ? AND l.farmer_id = ?`,
      [bucketId, req.user.id]
    );

    if (bucket.length === 0) {
      return res.status(404).json({ error: 'Bucket not found or not owned by you.' });
    }

    const currentBucket = bucket[0];

    if (action === 'accept_partial') {
      // Farmer accepts under-threshold quantity
      await db.query(
        'UPDATE buckets SET status = "processing" WHERE id = ?',
        [bucketId]
      );
      return res.json({ message: 'Partial bucket accepted! Now ready for packing and dispatch.' });
    } else if (action === 'extend_deadline') {
      if (!new_deadline) return res.status(400).json({ error: 'New deadline is required.' });
      await db.query('UPDATE buckets SET deadline = ? WHERE id = ?', [new_deadline, bucketId]);
      return res.json({ message: 'Bucket deadline extended successfully.' });
    } else if (action === 'cancel') {
      await db.query('UPDATE buckets SET status = "cancelled" WHERE id = ?', [bucketId]);
      return res.json({ message: 'Bucket cancelled.' });
    } else if (action === 'dispatch') {
      if (!driver_id) return res.status(400).json({ error: 'Driver/Transporter must be assigned for dispatch.' });

      const transportCost = parseFloat(total_transport_cost) || currentBucket.total_transport_cost || 0;

      // Update bucket status to dispatched with driver
      await db.query(
        `UPDATE buckets 
         SET status = 'dispatched', assigned_driver_id = ?, total_transport_cost = ?,
             delivery_window_start = ?, delivery_window_end = ?
         WHERE id = ?`,
        [driver_id, transportCost, delivery_window_start || null, delivery_window_end || null, bucketId]
      );

      // Recalculate each member's proportional transport cost and 50/50 splits
      const [members] = await db.query(
        'SELECT id, quantity, produce_subtotal, platform_fee FROM bucket_members WHERE bucket_id = ?',
        [bucketId]
      );

      const totalQuantity = parseFloat(currentBucket.current_quantity) || 1;

      for (const m of members) {
        const memberQty = parseFloat(m.quantity);
        const transportShare = totalQuantity > 0 ? (transportCost * (memberQty / totalQuantity)) : 0;
        const totalBill = parseFloat(m.produce_subtotal) + transportShare + parseFloat(m.platform_fee);
        const advanceDue = totalBill / 2;
        const codDue = totalBill / 2;

        await db.query(
          `UPDATE bucket_members 
           SET transport_share = ?, total_bill = ?, advance_amount_due = ?, remaining_cod_due = ?
           WHERE id = ?`,
          [transportShare, totalBill, advanceDue, codDue, m.id]
        );
      }

      return res.json({ message: 'Order dispatched with driver! Proportional transport costs allocated.' });
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('Bucket action error:', err);
    return res.status(500).json({ error: 'Failed to process bucket action.' });
  }
});

// 7. GET REGISTERED TRANSPORTERS / DRIVERS FOR DISPATCH
router.get('/drivers', async (req, res) => {
  try {
    const [drivers] = await db.query(
      `SELECT u.id, u.name, u.profile_photo_url, tp.vehicle_type, tp.vehicle_number, tp.operating_pincodes
       FROM users u
       JOIN transporter_profiles tp ON u.id = tp.user_id
       WHERE u.approval_status = 'approved' AND u.is_blocked = FALSE`
    );
    return res.json({ drivers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch drivers.' });
  }
});

// 8. FILE COMPLAINT AGAINST A DISRUPTIVE CUSTOMER
router.post('/complaints', async (req, res) => {
  try {
    const { customer_id, bucket_id, complaint_reason, incident_details } = req.body;
    if (!customer_id || !bucket_id || !complaint_reason || !incident_details) {
      return res.status(400).json({ error: 'All complaint fields are required.' });
    }

    await db.query(
      `INSERT INTO customer_complaints (farmer_id, customer_id, bucket_id, complaint_reason, incident_details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, customer_id, bucket_id, complaint_reason, incident_details]
    );

    return res.status(201).json({ message: 'Complaint filed and routed to Admin investigation queue.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to file complaint.' });
  }
});

// 9. GET FARMER REVIEWS
router.get('/reviews', async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT fr.*, u.name as customer_name, b.hub_name 
       FROM farmer_reviews fr
       JOIN users u ON fr.customer_id = u.id
       JOIN buckets b ON fr.bucket_id = b.id
       WHERE fr.farmer_id = ?
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    );
    return res.json({ reviews });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

module.exports = router;
