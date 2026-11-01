const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
  const connection = await db.getConnection();
  try {
    console.log('🌱 Starting FarmConnect Seed Script...');
    await connection.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    // 1. Seed Super Admin
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (1, 'Admin Mayur', '9999999999', ?, 'admin', '400001', 'Admin HQ, Mumbai', '/uploads/default-admin.png', 'approved')
       ON DUPLICATE KEY UPDATE approval_status = 'approved', password_hash = VALUES(password_hash)`,
      [defaultPasswordHash]
    );

    // 2. Seed Approved Farmer (Ramesh Patil)
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (2, 'Ramesh Patil (Farmer)', '9876543210', ?, 'farmer', '415612', 'Guhagar Road, Ratnagiri', '/uploads/default-farmer.png', 'approved')
       ON DUPLICATE KEY UPDATE approval_status = 'approved', password_hash = VALUES(password_hash)`,
      [defaultPasswordHash]
    );

    await connection.query(
      `INSERT INTO farmer_profiles (user_id, farm_name, village, district, state, upi_id, security_deposit_balance, deposit_status, average_rating, total_reviews)
       VALUES (2, 'Patil Mango Orchards', 'Pawas', 'Ratnagiri', 'Maharashtra', 'patilfarm@upi', 3000.00, 'active', 4.9, 18)
       ON DUPLICATE KEY UPDATE security_deposit_balance = 3000.00, deposit_status = 'active'`,
    );

    // Initial Deposit Transaction
    await connection.query(
      `INSERT INTO deposit_transactions (farmer_id, transaction_type, amount, upi_reference, admin_notes)
       VALUES (2, 'initial_deposit', 3000.00, 'UPI/2026/0491823', 'Approved initial security deposit')`
    );

    // 3. Seed Crop Listing (Ratnagiri Alphonso Mangoes)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);

    await connection.query(
      `INSERT INTO listings (id, farmer_id, produce_name, category, description, unit, price_per_unit, min_bucket_quantity, available_stock, dispatch_deadline, status)
       VALUES (1, 2, 'Ratnagiri Alphonso Mangoes (GI Tagged)', 'Fruits', '100% naturally ripened in grass hay. Directly harvested from Pawas coastal belt.', 'dozen', 750.00, 20.00, 100.00, ?, 'active')
       ON DUPLICATE KEY UPDATE available_stock = 100.00, status = 'active'`,
      [deadline]
    );

    // 4. Seed Approved Transporter / Driver (Suresh)
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (3, 'Suresh Tempo Logistics', '9123456780', ?, 'transporter', '400063', 'Goregaon Logistics Park, Mumbai', '/uploads/default-transporter.png', 'approved')
       ON DUPLICATE KEY UPDATE approval_status = 'approved', password_hash = VALUES(password_hash)`,
      [defaultPasswordHash]
    );

    await connection.query(
      `INSERT INTO transporter_profiles (user_id, vehicle_type, vehicle_number, operating_pincodes)
       VALUES (3, 'Mahindra Bolero Maxi Truck (Insulated)', 'MH-08-AG-4021', '400063, 400097, 400064, 400062')
       ON DUPLICATE KEY UPDATE vehicle_number = 'MH-08-AG-4021'`
    );

    // 5. Seed a Pending User (To test Admin Approval Queue!)
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (4, 'Amit Sharma (Buyer)', '9811122233', ?, 'consumer', '400063', 'Flat 402, Gokuldham, Goregaon East', '/uploads/default-consumer.png', 'pending')
       ON DUPLICATE KEY UPDATE approval_status = 'pending', password_hash = VALUES(password_hash)`,
      [defaultPasswordHash]
    );

    await connection.commit();
    console.log('✅ FarmConnect Seeded Successfully!');
    console.log('👤 Admin: Phone 9999999999 / Password: password123');
    console.log('🌾 Farmer: Phone 9876543210 / Password: password123');
    console.log('🚚 Transporter: Phone 9123456780 / Password: password123');
    console.log('🛒 Consumer (Pending Approval): Phone 9811122233 / Password: password123');
  } catch (err) {
    await connection.rollback();
    console.error('Seed error:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed();
