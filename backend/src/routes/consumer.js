const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole, requireApproved } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

router.use(authenticate, requireRole('consumer'), requireApproved);

// Helper to save base64 live photo
const saveBase64Photo = (base64String, prefix = 'pickup') => {
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

// Helper to check if a valid photo exists (file, base64, or uploaded user profile photo)
const hasValidPhoto = (file, base64, userPhoto) => {
  if (file && file.filename) return true;
  if (base64 && typeof base64 === 'string' && base64.includes('base64,') && base64.length > 100) return true;
  if (userPhoto && typeof userPhoto === 'string' && !userPhoto.includes('default-') && userPhoto.trim().length > 0) return true;
  return false;
};

// 1. EXPLORE PRODUCE & NEARBY BUCKETS (Pincode Proximity & Universal Search)
router.get('/explore', async (req, res) => {
  try {
    const userPincode = req.query.pincode || req.user.pincode;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let listingSql = `
      SELECT l.id, l.farmer_id, l.produce_name, l.category, l.description, l.unit, l.price_per_unit,
             l.min_bucket_quantity, l.available_stock, l.dispatch_deadline, l.image_url,
             fp.farm_name, fp.village, fp.district, fp.average_rating, fp.total_reviews,
             fp.upi_id
      FROM listings l
      JOIN farmer_profiles fp ON l.farmer_id = fp.user_id
      JOIN users u ON l.farmer_id = u.id
      WHERE l.status = 'active' AND l.dispatch_deadline > NOW() AND u.is_blocked = FALSE
    `;
    const listingParams = [];

    if (search) {
      listingSql += ` AND (l.produce_name LIKE ? OR l.category LIKE ? OR l.description LIKE ? OR fp.farm_name LIKE ? OR fp.village LIKE ? OR fp.district LIKE ?)`;
      listingParams.push(search, search, search, search, search, search);
    }
    listingSql += ` ORDER BY l.created_at DESC`;

    const [listings] = await db.query(listingSql, listingParams);

    let bucketSql = `
      SELECT b.id, b.listing_id, l.farmer_id, b.hub_name, b.delivery_pincode, b.delivery_address, 
             b.delivery_landmark, b.target_quantity, b.current_quantity, b.deadline, 
             b.status, b.farmer_verification_code, l.produce_name, l.category, l.unit, 
             l.price_per_unit, l.image_url,
             fp.farm_name, fp.village, fp.district, fp.average_rating, fp.total_reviews,
             bm.quantity as user_pledged_quantity,
             bm.pickup_pin as user_pickup_pin
      FROM buckets b
      JOIN listings l ON b.listing_id = l.id
      JOIN farmer_profiles fp ON l.farmer_id = fp.user_id
      LEFT JOIN bucket_members bm ON b.id = bm.bucket_id AND bm.customer_id = ?
      WHERE b.status IN ('collecting', 'locked')
    `;
    const bucketParams = [req.user.id];

    if (search) {
      bucketSql += ` AND (b.hub_name LIKE ? OR b.delivery_landmark LIKE ? OR b.delivery_address LIKE ? OR b.delivery_pincode LIKE ? OR l.produce_name LIKE ? OR l.category LIKE ? OR fp.farm_name LIKE ? OR fp.village LIKE ? OR fp.district LIKE ?)`;
      bucketParams.push(search, search, search, search, search, search, search, search, search);
    }

    bucketSql += ` ORDER BY (b.delivery_pincode = ?) DESC, b.created_at DESC`;
    bucketParams.push(userPincode);

    const [buckets] = await db.query(bucketSql, bucketParams);

    return res.json({ listings, buckets });
  } catch (err) {
    console.error('Explore error:', err);
    return res.status(500).json({ error: 'Failed to explore produce and pools.' });
  }
});

// 2. CREATE A NEW BUCKET (Initiate Pool at Custom Landmark)
router.post('/buckets', upload.single('pickup_photo'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      listing_id,
      hub_name,
      delivery_pincode,
      delivery_address,
      delivery_landmark,
      pledge_quantity,
      live_photo_base64
    } = req.body;

    const qty = parseFloat(pledge_quantity);
    if (!listing_id || !hub_name || !delivery_pincode || !delivery_address || !delivery_landmark || isNaN(qty) || qty <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'All delivery landmark and pledge quantity fields are required.' });
    }

    // Prevent duplicate orders: Check if user already has an active order for this listing in any bucket
    const [existingOrderForListing] = await connection.query(
      `SELECT bm.id, b.hub_name 
       FROM bucket_members bm 
       JOIN buckets b ON bm.bucket_id = b.id 
       WHERE bm.customer_id = ? AND b.listing_id = ? AND bm.delivery_status IN ('pending', 'delivered')`,
      [req.user.id, listing_id]
    );

    if (existingOrderForListing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        error: `You already have an active order for this produce in bucket "${existingOrderForListing[0].hub_name}". To prevent duplicate packages and confused delivery, please manage your existing order.`
      });
    }

    // Atomic row lock on listing
    const [listingRows] = await connection.query(
      'SELECT id, price_per_unit, min_bucket_quantity, available_stock, dispatch_deadline, status FROM listings WHERE id = ? FOR UPDATE',
      [listing_id]
    );

    if (listingRows.length === 0 || listingRows[0].status !== 'active') {
      await connection.rollback();
      return res.status(404).json({ error: 'Produce listing is no longer active.' });
    }

    const listing = listingRows[0];
    if (listing.available_stock < qty) {
      await connection.rollback();
      return res.status(400).json({ error: `Insufficient farmer stock. Only ${listing.available_stock} units available.` });
    }

    // Determine pickup photo (optional)
    let photoUrl = req.user.profile_photo_url || null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (live_photo_base64 && live_photo_base64.includes('base64,')) {
      photoUrl = saveBase64Photo(live_photo_base64, 'pickup');
    }

    if (photoUrl && (!req.user.profile_photo_url || req.user.profile_photo_url.includes('default-') || live_photo_base64 || req.file)) {
      await connection.query('UPDATE users SET profile_photo_url = ? WHERE id = ?', [photoUrl, req.user.id]);
    }

    // Generate 6-digit random verification number for Farmer / Dispatch
    const farmerCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create Bucket with 6-digit Farmer Verification Code
    const targetQuantity = Math.max(parseFloat(listing.min_bucket_quantity), qty);
    const [bucketResult] = await connection.query(
      `INSERT INTO buckets (listing_id, creator_user_id, hub_name, delivery_pincode, delivery_address, 
                             delivery_landmark, target_quantity, current_quantity, deadline, status, farmer_verification_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [listing_id, req.user.id, hub_name, delivery_pincode, delivery_address, delivery_landmark, targetQuantity, qty, listing.dispatch_deadline, 'collecting', farmerCode]
    );

    const bucketId = bucketResult.insertId;

    // Generate 6-digit customer pickup verification PIN
    const pickupPin = Math.floor(100000 + Math.random() * 900000).toString();

    // Financial calculations
    const produceSubtotal = qty * parseFloat(listing.price_per_unit);
    const platformFee = 0.00; // Platform fee begins at ₹0
    const initialTransportShare = 0.00; // Finalized upon driver dispatch
    const totalBill = produceSubtotal + initialTransportShare + platformFee;
    const advanceDue = totalBill / 2;
    const codDue = totalBill / 2;

    await connection.query(
      `INSERT INTO bucket_members (bucket_id, customer_id, quantity, produce_subtotal, transport_share, 
                                   platform_fee, total_bill, advance_amount_due, remaining_cod_due, 
                                   pickup_pin, pickup_photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bucketId, req.user.id, qty, produceSubtotal, initialTransportShare, platformFee, totalBill, advanceDue, codDue, pickupPin, photoUrl]
    );

    // Decrement available stock atomically
    await connection.query(
      'UPDATE listings SET available_stock = available_stock - ? WHERE id = ?',
      [qty, listing_id]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'New Bucket created! Neighbors can now join to complete the minimum batch.',
      bucketId,
      pickupPin,
      advance_due: advanceDue
    });
  } catch (err) {
    await connection.rollback();
    console.error('Create bucket error:', err);
    return res.status(500).json({ error: 'Failed to create bucket.' });
  } finally {
    connection.release();
  }
});

// 3. JOIN AN EXISTING OPEN BUCKET
router.post('/buckets/:id/join', upload.single('pickup_photo'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const bucketId = req.params.id;
    const { pledge_quantity, live_photo_base64 } = req.body;
    const qty = parseFloat(pledge_quantity);

    if (isNaN(qty) || qty <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Please enter a valid pledge quantity.' });
    }

    // Lock bucket & check status
    const [bucketRows] = await connection.query(
      'SELECT * FROM buckets WHERE id = ? FOR UPDATE',
      [bucketId]
    );

    if (bucketRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Bucket not found.' });
    }

    const bucket = bucketRows[0];
    if (bucket.status !== 'collecting') {
      await connection.rollback();
      return res.status(400).json({ error: `This bucket is ${bucket.status} and cannot accept new members.` });
    }

    // Check listing stock
    const [listingRows] = await connection.query(
      'SELECT price_per_unit, available_stock FROM listings WHERE id = ? FOR UPDATE',
      [bucket.listing_id]
    );

    if (listingRows[0].available_stock < qty) {
      await connection.rollback();
      return res.status(400).json({ error: `Not enough stock available. Only ${listingRows[0].available_stock} left.` });
    }

    // Prevent multiple orders across different buckets for the same harvest
    const [otherBucketOrder] = await connection.query(
      `SELECT bm.id, b.hub_name 
       FROM bucket_members bm 
       JOIN buckets b ON bm.bucket_id = b.id 
       WHERE bm.customer_id = ? AND b.listing_id = ? AND b.id != ? AND bm.delivery_status IN ('pending', 'delivered')`,
      [req.user.id, bucket.listing_id, bucketId]
    );

    if (otherBucketOrder.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        error: `You already have an active order for this produce in bucket "${otherBucketOrder[0].hub_name}". To prevent duplicate packages and confused delivery, please manage your existing order.`
      });
    }

    // Determine pickup photo (optional)
    let photoUrl = req.user.profile_photo_url || null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (live_photo_base64 && live_photo_base64.includes('base64,')) {
      photoUrl = saveBase64Photo(live_photo_base64, 'pickup');
    }

    if (photoUrl && (!req.user.profile_photo_url || req.user.profile_photo_url.includes('default-') || live_photo_base64 || req.file)) {
      await connection.query('UPDATE users SET profile_photo_url = ? WHERE id = ?', [photoUrl, req.user.id]);
    }

    // Check if user already has an existing pledge in THIS bucket -> CONSOLIDATE INTO SINGLE ORDER!
    const [existingMember] = await connection.query(
      'SELECT * FROM bucket_members WHERE bucket_id = ? AND customer_id = ? FOR UPDATE',
      [bucketId, req.user.id]
    );

    let returnPickupPin = '';
    let isUpdated = false;
    let finalCustomerQty = qty;
    let advanceDue = 0;

    if (existingMember.length > 0) {
      // TOP-UP / UPDATE EXISTING PLEDGE (CONSOLIDATED SINGLE ORDER)
      const existing = existingMember[0];
      finalCustomerQty = parseFloat(existing.quantity) + qty;
      const produceSubtotal = finalCustomerQty * parseFloat(listingRows[0].price_per_unit);
      const platformFee = parseFloat(existing.platform_fee) || 0.00;
      const initialTransportShare = parseFloat(existing.transport_share) || 0.00;
      const totalBill = produceSubtotal + initialTransportShare + platformFee;
      advanceDue = totalBill / 2;
      const codDue = totalBill / 2;
      returnPickupPin = existing.pickup_pin;
      isUpdated = true;

      await connection.query(
        `UPDATE bucket_members 
         SET quantity = ?, produce_subtotal = ?, total_bill = ?, 
             advance_amount_due = ?, remaining_cod_due = ?, 
             advance_payment_status = CASE WHEN advance_payment_status = 'verified' THEN 'pending' ELSE advance_payment_status END,
             pickup_photo_url = COALESCE(?, pickup_photo_url)
         WHERE id = ?`,
        [finalCustomerQty, produceSubtotal, totalBill, advanceDue, codDue, photoUrl, existing.id]
      );
    } else {
      // NEW SINGLE ORDER IN THIS BUCKET - 6-Digit Verification Number
      const pickupPin = Math.floor(100000 + Math.random() * 900000).toString();
      returnPickupPin = pickupPin;
      const produceSubtotal = qty * parseFloat(listingRows[0].price_per_unit);
      const platformFee = 0.00;
      const initialTransportShare = 0.00;
      const totalBill = produceSubtotal + initialTransportShare + platformFee;
      advanceDue = totalBill / 2;
      const codDue = totalBill / 2;

      await connection.query(
        `INSERT INTO bucket_members (bucket_id, customer_id, quantity, produce_subtotal, transport_share, 
                                     platform_fee, total_bill, advance_amount_due, remaining_cod_due, 
                                     pickup_pin, pickup_photo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bucketId, req.user.id, qty, produceSubtotal, initialTransportShare, platformFee, totalBill, advanceDue, codDue, pickupPin, photoUrl]
      );
    }

    // Update current quantity on bucket
    const newBucketQty = parseFloat(bucket.current_quantity) + qty;
    let newStatus = bucket.status;
    if (newBucketQty >= parseFloat(bucket.target_quantity)) {
      newStatus = 'locked'; // Automatically lock when target met!
    }

    await connection.query(
      'UPDATE buckets SET current_quantity = ?, status = ? WHERE id = ?',
      [newBucketQty, newStatus, bucketId]
    );

    // Deduct stock from listing
    await connection.query(
      'UPDATE listings SET available_stock = available_stock - ? WHERE id = ?',
      [qty, bucket.listing_id]
    );

    await connection.commit();

    return res.status(200).json({
      message: isUpdated 
        ? `Pledge updated! Added ${qty} units. Your consolidated order is now ${finalCustomerQty} units with Pickup PIN: ${returnPickupPin}.`
        : (newStatus === 'locked' ? 'Pledged! Target reached - Bucket is now LOCKED!' : 'Joined bucket successfully!'),
      bucket_status: newStatus,
      pickupPin: returnPickupPin,
      advance_due: advanceDue,
      is_updated: isUpdated,
      total_quantity: finalCustomerQty
    });
  } catch (err) {
    await connection.rollback();
    console.error('Join bucket error:', err);
    return res.status(500).json({ error: 'Failed to join bucket.' });
  } finally {
    connection.release();
  }
});

// 4. SUBMIT 50% ADVANCE PAYMENT UTR (0% Fee Direct UPI)
router.post('/orders/:memberId/advance-utr', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const { upi_utr } = req.body;

    if (!upi_utr || upi_utr.trim().length < 6) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UPI Reference / UTR Number.' });
    }

    const [rows] = await db.query(
      'SELECT id, advance_payment_status FROM bucket_members WHERE id = ? AND customer_id = ?',
      [memberId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    await db.query(
      'UPDATE bucket_members SET advance_upi_utr = ?, advance_payment_status = "verified" WHERE id = ?',
      [upi_utr.trim(), memberId]
    );

    return res.json({ message: '50% Advance UTR submitted successfully! Order is verified for processing.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record advance payment UTR.' });
  }
});

// 5. GET OWN ORDERS & PICKUP PASSES
router.get('/orders', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT bm.id as member_id, bm.quantity, bm.produce_subtotal, bm.transport_share, 
              bm.platform_fee, bm.total_bill, bm.advance_amount_due, bm.advance_payment_status,
              bm.advance_upi_utr, bm.remaining_cod_due, bm.cod_payment_status, bm.pickup_pin,
              bm.pickup_photo_url, bm.delivery_status, bm.created_at as order_date,
              b.id as bucket_id, b.hub_name, b.delivery_landmark, b.delivery_address, 
              b.status as bucket_status, b.farmer_verification_code, b.delivery_window_start, b.delivery_window_end,
              l.produce_name, l.unit, l.price_per_unit, l.image_url,
              fp.farm_name, fp.upi_id as farmer_upi_id
       FROM bucket_members bm
       JOIN buckets b ON bm.bucket_id = b.id
       JOIN listings l ON b.listing_id = l.id
       JOIN farmer_profiles fp ON l.farmer_id = fp.user_id
       WHERE bm.customer_id = ?
       ORDER BY bm.created_at DESC`,
      [req.user.id]
    );

    return res.json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
});

// 6. SUBMIT FARMER REVIEW & REPORT QUALITY DISPUTE (With Photo Proof)
router.post('/orders/:memberId/review', upload.single('evidence_photo'), async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const { rating, tags, review_comment, issue_reported, evidence_photo_base64 } = req.body;

    const [order] = await db.query(
      `SELECT bm.id, bm.bucket_id, bm.delivery_status, l.farmer_id 
       FROM bucket_members bm
       JOIN buckets b ON bm.bucket_id = b.id
       JOIN listings l ON b.listing_id = l.id
       WHERE bm.id = ? AND bm.customer_id = ?`,
      [memberId, req.user.id]
    );

    if (order.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if (!photoUrl && evidence_photo_base64) {
      photoUrl = saveBase64Photo(evidence_photo_base64, 'dispute');
    }

    const hasIssue = issue_reported && issue_reported !== 'none';
    const disputeStatus = hasIssue ? 'pending_review' : 'none';

    await db.query(
      `INSERT INTO farmer_reviews (farmer_id, customer_id, bucket_id, rating, tags, review_comment, 
                                   issue_reported, evidence_photo_url, dispute_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order[0].farmer_id,
        req.user.id,
        order[0].bucket_id,
        parseInt(rating, 10) || 5,
        tags || null,
        review_comment || null,
        issue_reported || 'none',
        photoUrl,
        disputeStatus
      ]
    );

    // Update farmer average rating
    const [stats] = await db.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM farmer_reviews WHERE farmer_id = ?',
      [order[0].farmer_id]
    );

    if (stats.length > 0) {
      await db.query(
        'UPDATE farmer_profiles SET average_rating = ?, total_reviews = ? WHERE user_id = ?',
        [stats[0].avg_rating || 0, stats[0].count || 0, order[0].farmer_id]
      );
    }

    return res.status(201).json({
      message: hasIssue 
        ? 'Feedback & Quality Dispute submitted! Admin will review the photo evidence for deposit compensation.'
        : 'Thank you for your review!'
    });
  } catch (err) {
    console.error('Review error:', err);
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// 7. GET FARMER REVIEWS & REPUTATION (Consumer Public View)
router.get('/farmers/:farmerId/reviews', async (req, res) => {
  try {
    const farmerId = req.params.farmerId;

    const [farmerRows] = await db.query(
      `SELECT fp.user_id as farmer_id, fp.farm_name, fp.village, fp.district, fp.state,
              fp.average_rating, fp.total_reviews, fp.security_deposit_balance, fp.deposit_status,
              u.name as farmer_name
       FROM farmer_profiles fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.user_id = ?`,
      [farmerId]
    );

    if (farmerRows.length === 0) {
      return res.status(404).json({ error: 'Farmer profile not found.' });
    }

    const [reviews] = await db.query(
      `SELECT fr.id, fr.rating, fr.tags, fr.review_comment, fr.created_at,
              fr.issue_reported, fr.evidence_photo_url,
              u.name as customer_name,
              b.hub_name,
              l.produce_name
       FROM farmer_reviews fr
       JOIN users u ON fr.customer_id = u.id
       LEFT JOIN buckets b ON fr.bucket_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       WHERE fr.farmer_id = ?
       ORDER BY fr.created_at DESC`,
      [farmerId]
    );

    return res.json({
      farmer: farmerRows[0],
      reviews
    });
  } catch (err) {
    console.error('Fetch farmer reviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// 8. GET ALL RECENT COMMUNITY REVIEWS (Platform Feed)
router.get('/reviews', async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT fr.id, fr.rating, fr.tags, fr.review_comment, fr.created_at,
              fr.farmer_id,
              u.name as customer_name,
              fp.farm_name, fp.village, fp.district, fp.average_rating,
              b.hub_name,
              l.produce_name
       FROM farmer_reviews fr
       JOIN users u ON fr.customer_id = u.id
       JOIN farmer_profiles fp ON fr.farmer_id = fp.user_id
       LEFT JOIN buckets b ON fr.bucket_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       ORDER BY fr.created_at DESC
       LIMIT 30`
    );

    return res.json({ reviews });
  } catch (err) {
    console.error('Fetch all reviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch platform reviews.' });
  }
});

module.exports = router;
