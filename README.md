# 🌾 FarmConnect India

> **Decentralized Farm-to-Consumer (F2C) Society Group Buying Platform**  
> Direct harvest pools, 50-50 split payments (Free UPI Advance + COD at Delivery), 6-Digit Drop Point Verification, Farmer Security Deposit Escrow, and Admin Gatekeeper Approval.

---

## 🚀 Key Features Built

1. **Admin Account Approval Gatekeeper:**
   - Every registered Farmer, Transporter, and Buyer starts in `approval_status = 'pending'`.
   - The Super Admin has an Approval Queue with applicant details, location, and farm/vehicle credentials to **Accept** or **Reject** accounts with custom rejection reasons.

2. **50-50 Split Payment Model (100% Free Stack):**
   - **50% Advance via Direct UPI** (`upi://pay` QR code with 0% payment gateway fees).
   - **50% Cash on Delivery (COD)** collected at the society drop point.

3. **6-Digit Random Verification Numbers (Private Drop Point Handshake):**
   - **Customer Delivery PIN:** Private 6-digit number shown only to the buyer and admin. Driver enters this PIN upon package handover.
   - **Farmer Verification Code:** Unique 6-digit code assigned per bucket that customers check on the driver's manifest to verify genuine farm origin.
   - Prevents unauthorized parcel pickups and duplicate order package mix-ups.

4. **Farmer Security Deposit Shield & Exposure Limits:**
   - Farmers maintain caution collateral with the Admin to prevent ghost crops or bait-and-switch quality scams.
   - 10x exposure cap protects platform float.
   - Any spoiled produce photo disputes filed by buyers are refunded directly from the farmer's security deposit.

5. **Universal Search, Category Filtering & Multi-Dimensional Sorting:**
   - **Search:** Apartment/society wise (`Lodha`, `Oberoi`, `Gokuldham`), area wise (`Goregaon`, `Powai`, `Hadapsar`), farmer location (`Ratnagiri`, `Maval`, `Wardha`, `Nashik`), or produce (`rice`, `mango`, `turmeric`, `wheat`, `onions`).
   - **Sorting:** Price (Low to High, High to Low), Top Rated Farmers / Reviews (5★ First), Most Reviewed, % Pooled, Produce A-Z.

6. **Verified Resident Reviews & Reputation:**
   - Community reviews from apartment residents with star ratings and quality feedback.
   - Instant 1-click review breakdown on every produce item and society pool card.

7. **Space-Effective High-Density Design:**
   - Clean, compact horizontal cards and data tables without bloated numbers or wasted whitespace.

---

## 🛠️ Tech Stack

- **Frontend:** Angular 17 (Standalone Components, Reactive Services, Mobile-First High-Density CSS)
- **Backend:** Node.js + Express (REST API, JWT Authentication, Multer file handling)
- **Database:** MySQL 8.0 (InnoDB, parameterized queries, row-level locking)

---

## 🏃 Running the Application

### 1. Database Setup
```bash
# Ensure MySQL is running on 127.0.0.1:3306
mysql -u root -p < database/schema.sql

# Seed catalog & community reviews
cd backend
node src/seed.js
node src/seed_catalog.js
node src/seed_reviews.js
```

### 2. Backend & API Server
```bash
cd backend
npm install
node src/app.js
# Runs on http://127.0.0.1:5000
```

### 3. Frontend (Angular)
```bash
cd frontend
npm install
npm run build
# Or for live development:
npm start
```

---

## 👥 Demo Logins (Password: `password123`)

- **Admin:** Phone `9999999999`
- **Consumer:** Phone `9811122233` *(Amit Sharma)*
- **Farmer 1 (Mangoes):** Phone `9876543210` *(Ramesh Patil - Ratnagiri)*
- **Farmer 2 (Rice):** Phone `9822334455` *(Tukaram Shinde - Maval Pune)*
- **Farmer 3 (Turmeric):** Phone `9823334455` *(Balasaheb Jadhav - Waigaon Wardha)*
- **Farmer 4 (Onions & Grapes):** Phone `9824445566` *(Eknath Gaikwad - Lasalgaon Nashik)*
- **Transporter (Driver):** Phone `9123456780` *(Suresh Tempo Logistics)*
