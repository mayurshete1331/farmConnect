const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedReviews() {
  try {
    console.log('🌱 Seeding verified community reviewers & reviews...');
    const hashedPw = await bcrypt.hash('password123', 10);

    // 1. Ensure Verified Consumer Users exist
    const consumers = [
      { name: 'Priya Patel (Oberoi Resident)', phone: '9811122234', pincode: '400063', address: 'Oberoi Woods, Tower B, Goregaon East' },
      { name: 'Rahul Mehta (Gokuldham Resident)', phone: '9811122235', pincode: '400063', address: 'Gokuldham Society, A Wing, Goregaon' },
      { name: 'Sneha Kulkarni (Lodha Resident)', phone: '9811122236', pincode: '410506', address: 'Lodha Belmondo, Tower C, Maval Pune' },
      { name: 'Vikram Singhania (Powai Resident)', phone: '9811122237', pincode: '400076', address: 'Hiranandani Gardens, Heritage Club, Powai' },
      { name: 'Anita Deshmukh (Amanora Resident)', phone: '9811122238', pincode: '411028', address: 'Amanora Park Town, Sector 2, Hadapsar Pune' }
    ];

    const customerIds = {};
    for (const c of consumers) {
      const [existing] = await db.query('SELECT id FROM users WHERE phone = ?', [c.phone]);
      if (existing.length > 0) {
        customerIds[c.phone] = existing[0].id;
      } else {
        const [res] = await db.query(
          `INSERT INTO users (name, phone, password_hash, role, pincode, address, approval_status, profile_photo_url)
           VALUES (?, ?, ?, 'consumer', ?, ?, 'approved', '/uploads/default-consumer.png')`,
          [c.name, c.phone, hashedPw, c.pincode, c.address]
        );
        customerIds[c.phone] = res.insertId;
      }
    }

    // Also get Amit Sharma (id: 4)
    const amitId = 4;

    // 2. Fetch buckets to link
    const [buckets] = await db.query('SELECT id, hub_name, listing_id FROM buckets');
    const bucketMap = {};
    for (const b of buckets) {
      bucketMap[b.hub_name] = b.id;
    }
    const defaultBucketId = buckets.length > 0 ? buckets[0].id : 1;

    // 3. Clear old test reviews
    await db.query('DELETE FROM farmer_reviews');

    // 4. Sample Realistic Reviews
    const reviewData = [
      // Ramesh Patil (Farmer id: 2) - Ratnagiri Mangoes
      {
        farmer_id: 2,
        customer_id: amitId,
        bucket_id: bucketMap['Gokuldham Society - Main Gate'] || defaultBucketId,
        rating: 5,
        tags: 'Tree-Ripened, GI Tagged, Super Sweet',
        review_comment: 'Authentic Ratnagiri Alphonso mangoes. Naturally tree-ripened without calcium carbide chemical ripening. The natural aroma filled the entire apartment lobby when the crate opened!',
        created_at: new Date(Date.now() - 2 * 86400000)
      },
      {
        farmer_id: 2,
        customer_id: customerIds['9811122235'] || amitId,
        bucket_id: bucketMap['Oberoi Woods - A Wing'] || defaultBucketId,
        rating: 5,
        tags: 'Orchard Direct, Safe Packaging',
        review_comment: 'Our entire society pool in Oberoi Woods was thrilled with the mango quality. Every fruit had the GI certification sticker and straw cushioning. No black spots or bruises.',
        created_at: new Date(Date.now() - 5 * 86400000)
      },
      {
        farmer_id: 2,
        customer_id: customerIds['9811122234'] || amitId,
        bucket_id: bucketMap['Gokuldham Society - Main Gate'] || defaultBucketId,
        rating: 5,
        tags: 'Juicy, Rich Pulp',
        review_comment: 'Rich golden saffron pulp, very thin skin and small stone. Kids loved it! Directly paying Ramesh Patil ensured genuine farm price.',
        created_at: new Date(Date.now() - 8 * 86400000)
      },

      // Balasaheb Jadhav (Farmer id: 6) - Waigaon Turmeric
      {
        farmer_id: 6,
        customer_id: customerIds['9811122234'] || amitId,
        bucket_id: bucketMap['Oberoi Woods - A Wing'] || defaultBucketId,
        rating: 5,
        tags: 'High Curcumin, Pure Aroma, Zero Color',
        review_comment: 'Outstanding turmeric quality! You can smell the authentic high-curcumin aroma as soon as you open the pouch. Tested in warm milk, zero artificial color residue.',
        created_at: new Date(Date.now() - 1 * 86400000)
      },
      {
        farmer_id: 6,
        customer_id: customerIds['9811122237'] || amitId,
        bucket_id: bucketMap['Oberoi Woods - A Wing'] || defaultBucketId,
        rating: 5,
        tags: 'Wardha Farm Direct, GI Batch',
        review_comment: 'Ordered 5 kg for our apartment group pool. Ground fresh directly in Waigaon, Wardha. The purity and medicinal potency are night and day compared to packaged retail brands.',
        created_at: new Date(Date.now() - 4 * 86400000)
      },
      {
        farmer_id: 6,
        customer_id: amitId,
        bucket_id: bucketMap['Oberoi Woods - A Wing'] || defaultBucketId,
        rating: 5,
        tags: 'Aromatic, Sealed Pouch',
        review_comment: 'Deep natural golden hue with potent aroma. Foil sealed moisture-proof packaging kept it fresh. Highly recommended authentic farmer.',
        created_at: new Date(Date.now() - 7 * 86400000)
      },

      // Kishor Deshmukh / Tukaram Shinde (Farmer id: 5) - Rice & Grains
      {
        farmer_id: 5,
        customer_id: customerIds['9811122236'] || amitId,
        bucket_id: bucketMap['Lodha Belmondo - Tower C Lobby'] || defaultBucketId,
        rating: 5,
        tags: 'Fragrant Indrayani, Soft Cooking',
        review_comment: 'Indrayani organic rice has an authentic fragrant aroma when boiled. Non-sticky, perfect for daily khichdi and steamed rice. Direct harvest from Maval slopes.',
        created_at: new Date(Date.now() - 3 * 86400000)
      },
      {
        farmer_id: 5,
        customer_id: customerIds['9811122238'] || amitId,
        bucket_id: bucketMap['Amanora Park Town - Sector 2'] || defaultBucketId,
        rating: 5,
        tags: 'Slender Grain, Cleaned',
        review_comment: 'Wada Kolam traditional grains are delicate and long. Much fresher than store packaged rice and almost 30% cheaper since we bought directly through society group pool.',
        created_at: new Date(Date.now() - 6 * 86400000)
      },
      {
        farmer_id: 5,
        customer_id: customerIds['9811122235'] || amitId,
        bucket_id: bucketMap['Lodha Belmondo - Tower C Lobby'] || defaultBucketId,
        rating: 5,
        tags: 'Stone-free, Fresh Milling',
        review_comment: 'Super clean, zero stones, vacuum packed 10kg bags. Shinde Organic Farm has earned a permanent customer in our society!',
        created_at: new Date(Date.now() - 9 * 86400000)
      },

      // Eknath Gaikwad (Farmer id: 7) - Onions, Grapes, Pomegranates
      {
        farmer_id: 7,
        customer_id: customerIds['9811122237'] || amitId,
        bucket_id: bucketMap['Hiranandani Gardens - Heritage Club'] || defaultBucketId,
        rating: 5,
        tags: 'Crisp Onions, Great Savings',
        review_comment: 'Lasalgaon red onions are fresh, firm, and pungent. Stored in dry basket and not a single onion spoiled after 3 weeks. Great group buying experience.',
        created_at: new Date(Date.now() - 1 * 86400000)
      },
      {
        farmer_id: 7,
        customer_id: customerIds['9811122238'] || amitId,
        bucket_id: bucketMap['Rustomjee Urbania - Athena Gate'] || defaultBucketId,
        rating: 5,
        tags: 'Export Grade Grapes, Sweet',
        review_comment: 'Export quality Sonaka seedless grapes! Extremely crunchy and sweet, harvested in Nashik and reached our building in Thane within 24 hours.',
        created_at: new Date(Date.now() - 4 * 86400000)
      },
      {
        farmer_id: 7,
        customer_id: amitId,
        bucket_id: bucketMap['Hiranandani Gardens - Heritage Club'] || defaultBucketId,
        rating: 4,
        tags: 'Deep Red Arils, Fresh Plucked',
        review_comment: 'Bhagwa pomegranates have deep ruby red arils and soft seeds. Very sweet and juicy juice yield.',
        created_at: new Date(Date.now() - 8 * 86400000)
      }
    ];

    for (const r of reviewData) {
      await db.query(
        `INSERT INTO farmer_reviews (farmer_id, customer_id, bucket_id, rating, tags, review_comment, issue_reported, dispute_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'none', 'none', ?)`,
        [r.farmer_id, r.customer_id, r.bucket_id, r.rating, r.tags, r.review_comment, r.created_at]
      );
    }

    // 5. Update farmer profile aggregate ratings and counts
    for (const fid of [2, 5, 6, 7]) {
      const [stats] = await db.query(
        'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM farmer_reviews WHERE farmer_id = ?',
        [fid]
      );
      if (stats.length > 0) {
        await db.query(
          'UPDATE farmer_profiles SET average_rating = ?, total_reviews = ? WHERE user_id = ?',
          [stats[0].avg_rating || 5.0, stats[0].count || 0, fid]
        );
      }
    }

    console.log('✅ Successfully seeded authentic community reviews & updated farmer ratings!');
    process.exit(0);
  } catch (err) {
    console.error('Seed reviews error:', err);
    process.exit(1);
  }
}

seedReviews();
