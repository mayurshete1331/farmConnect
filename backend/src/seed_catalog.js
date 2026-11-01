const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seedCatalog() {
  const connection = await db.getConnection();
  try {
    console.log('🌾 Seeding Expanded Farm Products, Farmers & Society Pools...');
    await connection.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('password123', salt);

    // 1. Additional Farmers
    // Farmer 5: Tukaram Shinde (Rice Specialist - Maval, Pune)
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (5, 'Tukaram Shinde (Rice Farmer)', '9822114455', ?, 'farmer', '410506', 'Maval Valley, Pune', '/uploads/default-farmer.png', 'approved')
       ON DUPLICATE KEY UPDATE approval_status = 'approved'`,
      [passHash]
    );
    await connection.query(
      `INSERT INTO farmer_profiles (user_id, farm_name, village, district, state, upi_id, security_deposit_balance, deposit_status, average_rating, total_reviews)
       VALUES (5, 'Shinde Organic Rice Valley', 'Maval', 'Pune', 'Maharashtra', 'shinderice@upi', 5000.00, 'active', 4.9, 32)
       ON DUPLICATE KEY UPDATE security_deposit_balance = 5000.00, deposit_status = 'active'`
    );

    // Farmer 6: Balasaheb Jadhav (Turmeric & Spices Specialist - Waigaon, Wardha)
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (6, 'Balasaheb Jadhav (Spices Farmer)', '9823334455', ?, 'farmer', '442001', 'Waigaon Farm Belt, Wardha', '/uploads/default-farmer.png', 'approved')
       ON DUPLICATE KEY UPDATE approval_status = 'approved'`,
      [passHash]
    );
    await connection.query(
      `INSERT INTO farmer_profiles (user_id, farm_name, village, district, state, upi_id, security_deposit_balance, deposit_status, average_rating, total_reviews)
       VALUES (6, 'Waigaon Natural Spices Collective', 'Waigaon', 'Wardha', 'Maharashtra', 'waigaonspices@upi', 4000.00, 'active', 5.0, 24)
       ON DUPLICATE KEY UPDATE security_deposit_balance = 4000.00, deposit_status = 'active'`
    );

    // Farmer 7: Eknath Gaikwad (Onions & Fruits Specialist - Lasalgaon, Nashik)
    await connection.query(
      `INSERT INTO users (id, name, phone, password_hash, role, pincode, address, profile_photo_url, approval_status)
       VALUES (7, 'Eknath Gaikwad (Agro Collective)', '9824445566', ?, 'farmer', '422306', 'Lasalgaon APMC Road, Nashik', '/uploads/default-farmer.png', 'approved')
       ON DUPLICATE KEY UPDATE approval_status = 'approved'`,
      [passHash]
    );
    await connection.query(
      `INSERT INTO farmer_profiles (user_id, farm_name, village, district, state, upi_id, security_deposit_balance, deposit_status, average_rating, total_reviews)
       VALUES (7, 'Sahyadri Fresh Farms & Orchards', 'Lasalgaon', 'Nashik', 'Maharashtra', 'sahyadrifresh@upi', 4500.00, 'active', 4.8, 41)
       ON DUPLICATE KEY UPDATE security_deposit_balance = 4500.00, deposit_status = 'active'`
    );

    // 2. Clear and Insert Realistic Produce Catalog
    const deadline1 = new Date(); deadline1.setDate(deadline1.getDate() + 4);
    const deadline2 = new Date(); deadline2.setDate(deadline2.getDate() + 5);
    const deadline3 = new Date(); deadline3.setDate(deadline3.getDate() + 6);
    const deadline4 = new Date(); deadline4.setDate(deadline4.getDate() + 7);

    const catalogItems = [
      { id: 1, farmer_id: 2, name: 'Ratnagiri Alphonso Mangoes (GI Tagged)', cat: 'Fruits', unit: 'dozen', price: 750, min: 10, stock: 120, dl: deadline1, desc: 'Grade-A 100% naturally grass-ripened coastal mangoes from Pawas orchards.' },
      { id: 2, farmer_id: 5, name: 'Indrayani Fragrant Organic Rice (Unpolished)', cat: 'Grains & Rice', unit: 'kg', price: 95, min: 25, stock: 400, dl: deadline2, desc: 'Direct farm unpolished heritage Indrayani rice from Maval with rich natural aroma.' },
      { id: 3, farmer_id: 6, name: 'Waigaon Pure Curcumin Turmeric Powder (GI Tagged)', cat: 'Spices & Turmeric', unit: 'kg', price: 260, min: 10, stock: 250, dl: deadline3, desc: 'High 6.5% natural curcumin content turmeric grown without synthetic pesticides.' },
      { id: 4, farmer_id: 5, name: 'Wada Kolam Traditional Heritage Rice', cat: 'Grains & Rice', unit: 'kg', price: 82, min: 20, stock: 350, dl: deadline2, desc: 'Slender aromatic daily eating Wada Kolam rice directly milled at farm origin.' },
      { id: 5, farmer_id: 7, name: 'Lasalgaon Pink Red Onions (Direct Farm Grade)', cat: 'Vegetables', unit: 'kg', price: 28, min: 30, stock: 600, dl: deadline1, desc: 'Export quality cured firm red onions with high shelf-life from Lasalgaon.' },
      { id: 6, farmer_id: 7, name: 'Bhagwa Sweet Export Pomegranates', cat: 'Fruits', unit: 'crate', price: 650, min: 5, stock: 90, dl: deadline4, desc: 'Deep ruby red arils, high sweetness Bhagwa pomegranates (5kg sealed crate).' },
      { id: 7, farmer_id: 7, name: 'Nashik Dindori Fresh Seedless Grapes', cat: 'Fruits', unit: 'kg', price: 110, min: 15, stock: 220, dl: deadline2, desc: 'Crunchy sweet Thompson seedless green grapes directly harvested from Dindori.' },
      { id: 8, farmer_id: 5, name: 'Sharbati Golden Whole Wheat Grains (MP Sehore)', cat: 'Grains & Rice', unit: 'kg', price: 52, min: 30, stock: 500, dl: deadline4, desc: 'Golden heavy grain Sharbati whole wheat, ideal for soft rotis and bhakri.' }
    ];

    for (const item of catalogItems) {
      await connection.query(
        `INSERT INTO listings (id, farmer_id, produce_name, category, description, unit, price_per_unit, min_bucket_quantity, available_stock, dispatch_deadline, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE 
           produce_name = VALUES(produce_name),
           category = VALUES(category),
           description = VALUES(description),
           unit = VALUES(unit),
           price_per_unit = VALUES(price_per_unit),
           min_bucket_quantity = VALUES(min_bucket_quantity),
           available_stock = VALUES(available_stock),
           dispatch_deadline = VALUES(dispatch_deadline),
           status = 'active'`,
        [item.id, item.farmer_id, item.name, item.cat, item.desc, item.unit, item.price, item.min, item.stock, item.dl]
      );
    }

    // 3. Seed Realistic Active Society Pools (Buckets) in Various Apartments/Areas
    const sampleBuckets = [
      {
        id: 1,
        listing_id: 1, // Mango
        creator_user_id: 4,
        hub_name: 'Gokuldham Society - Main Gate',
        delivery_pincode: '400063',
        delivery_address: 'Film City Road, Gokuldham, Goregaon East, Mumbai',
        delivery_landmark: 'Main Security Gate No. 1',
        target_quantity: 20,
        current_quantity: 11,
        deadline: deadline1,
        status: 'collecting',
        farmer_verification_code: '713550'
      },
      {
        id: 2,
        listing_id: 2, // Indrayani Rice
        creator_user_id: 4,
        hub_name: 'Lodha Belmondo - Tower C',
        delivery_pincode: '412101',
        delivery_address: 'Mumbai-Pune Expressway, Gahunje, Pune',
        delivery_landmark: 'Tower C Concierge Lobby',
        target_quantity: 50,
        current_quantity: 35,
        deadline: deadline2,
        status: 'collecting',
        farmer_verification_code: '849120'
      },
      {
        id: 3,
        listing_id: 3, // Waigaon Turmeric
        creator_user_id: 4,
        hub_name: 'Oberoi Woods - A Wing',
        delivery_pincode: '400063',
        delivery_address: 'Mohan Gokhale Road, Goregaon East, Mumbai',
        delivery_landmark: 'A Wing Security Entrance',
        target_quantity: 20,
        current_quantity: 16,
        deadline: deadline3,
        status: 'collecting',
        farmer_verification_code: '319482'
      },
      {
        id: 4,
        listing_id: 5, // Lasalgaon Onions
        creator_user_id: 4,
        hub_name: 'Hiranandani Gardens - Heritage Club',
        delivery_pincode: '400076',
        delivery_address: 'Central Avenue, Powai, Mumbai',
        delivery_landmark: 'Clubhouse Delivery Gate',
        target_quantity: 60,
        current_quantity: 45,
        deadline: deadline1,
        status: 'collecting',
        farmer_verification_code: '620194'
      },
      {
        id: 5,
        listing_id: 7, // Grapes
        creator_user_id: 4,
        hub_name: 'Amanora Park Town - Sector 2',
        delivery_pincode: '411028',
        delivery_address: 'Amanora Magarpatta Road, Hadapsar, Pune',
        delivery_landmark: 'Sector 2 Main Security Gate',
        target_quantity: 30,
        current_quantity: 22,
        deadline: deadline2,
        status: 'collecting',
        farmer_verification_code: '482015'
      },
      {
        id: 6,
        listing_id: 4, // Wada Kolam Rice
        creator_user_id: 4,
        hub_name: 'Rustomjee Urbania - Azziano',
        delivery_pincode: '400601',
        delivery_address: 'Majiwada, Thane West',
        delivery_landmark: 'Azziano Security Gate No. 2',
        target_quantity: 40,
        current_quantity: 28,
        deadline: deadline2,
        status: 'collecting',
        farmer_verification_code: '903417'
      }
    ];

    for (const b of sampleBuckets) {
      await connection.query(
        `INSERT INTO buckets (id, listing_id, creator_user_id, hub_name, delivery_pincode, delivery_address, 
                               delivery_landmark, target_quantity, current_quantity, deadline, status, farmer_verification_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           hub_name = VALUES(hub_name),
           delivery_pincode = VALUES(delivery_pincode),
           delivery_address = VALUES(delivery_address),
           delivery_landmark = VALUES(delivery_landmark),
           target_quantity = VALUES(target_quantity),
           current_quantity = VALUES(current_quantity),
           status = VALUES(status),
           farmer_verification_code = VALUES(farmer_verification_code)`,
        [b.id, b.listing_id, b.creator_user_id, b.hub_name, b.delivery_pincode, b.delivery_address, b.delivery_landmark, b.target_quantity, b.current_quantity, b.deadline, b.status, b.farmer_verification_code]
      );
    }

    await connection.commit();
    console.log('✅ Catalog & Society Pools seeded successfully!');
  } catch (err) {
    await connection.rollback();
    console.error('Seed catalog error:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedCatalog();
