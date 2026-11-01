-- FarmConnect Database Initialization Script
-- Charset: utf8mb4 for complete unicode & emoji support

CREATE DATABASE IF NOT EXISTS farmconnect_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE farmconnect_db;

-- 1. Users Table (Multi-role with Live Profile Photo & Admin Approval Gatekeeper)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL COMMENT 'Admin-Only Visibility',
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('consumer', 'farmer', 'transporter', 'admin') NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    address TEXT NULL,
    profile_photo_url VARCHAR(255) NOT NULL COMMENT 'Live Photo for Visual Delivery Handshake',
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason VARCHAR(255) NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    penalty_due DECIMAL(10, 2) DEFAULT 0.00,
    strikes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_pincode (pincode),
    INDEX idx_role (role),
    INDEX idx_approval (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Farmer Profiles & Security Deposit Wallet
CREATE TABLE IF NOT EXISTS farmer_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    farm_name VARCHAR(150) NOT NULL,
    village VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    upi_id VARCHAR(100) NOT NULL,
    security_deposit_balance DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Collateral held by Admin',
    deposit_status ENUM('unpaid', 'active', 'below_minimum', 'withdrawn') DEFAULT 'unpaid',
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Deposit Transaction Ledger (Audit Trail)
CREATE TABLE IF NOT EXISTS deposit_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    transaction_type ENUM('initial_deposit', 'penalty_deduction', 'deposit_refund', 'rolling_hold') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    upi_reference VARCHAR(50) NULL,
    admin_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Produce Listings (Guarded by 10x Deposit Multiplier)
CREATE TABLE IF NOT EXISTS listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    produce_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    unit ENUM('kg', 'dozen', 'crate', 'piece') NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    min_bucket_quantity DECIMAL(10, 2) NOT NULL,
    available_stock DECIMAL(10, 2) NOT NULL,
    dispatch_deadline DATETIME NOT NULL,
    image_url VARCHAR(255) NULL,
    status ENUM('active', 'sold_out', 'expired', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id),
    INDEX idx_listing_lookup (status, dispatch_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Buckets (Community Demand Pools)
CREATE TABLE IF NOT EXISTS buckets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    creator_user_id INT NOT NULL,
    hub_name VARCHAR(150) NOT NULL,
    delivery_pincode VARCHAR(10) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_landmark VARCHAR(150) NOT NULL,
    target_quantity DECIMAL(10, 2) NOT NULL,
    current_quantity DECIMAL(10, 2) DEFAULT 0.00,
    total_transport_cost DECIMAL(10, 2) DEFAULT 0.00,
    deadline DATETIME NOT NULL,
    status ENUM('collecting', 'locked', 'processing', 'dispatched', 'delivered', 'cancelled') DEFAULT 'collecting',
    assigned_driver_id INT NULL,
    farmer_verification_code VARCHAR(6) NULL COMMENT '6-digit code for customer to validate farmer/dispatch',
    delivery_window_start DATETIME NULL,
    delivery_window_end DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    FOREIGN KEY (creator_user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_driver_id) REFERENCES users(id),
    INDEX idx_bucket_search (delivery_pincode, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Bucket Members (50% Advance via UPI + 50% COD at Handover)
CREATE TABLE IF NOT EXISTS bucket_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bucket_id INT NOT NULL,
    customer_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    produce_subtotal DECIMAL(10, 2) NOT NULL,
    transport_share DECIMAL(10, 2) DEFAULT 0.00,
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    total_bill DECIMAL(10, 2) NOT NULL,
    advance_amount_due DECIMAL(10, 2) NOT NULL COMMENT '50% of Total Bill',
    advance_payment_status ENUM('pending', 'verified', 'refunded') DEFAULT 'pending',
    advance_upi_utr VARCHAR(50) NULL,
    remaining_cod_due DECIMAL(10, 2) NOT NULL COMMENT '50% of Total Bill',
    cod_payment_status ENUM('pending', 'paid') DEFAULT 'pending',
    pickup_pin VARCHAR(6) NOT NULL,
    pickup_photo_url VARCHAR(255) NULL,
    delivery_status ENUM('pending', 'delivered', 'no_show', 'cancelled') DEFAULT 'pending',
    delivered_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bucket_id) REFERENCES buckets(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT uq_bucket_customer UNIQUE (bucket_id, customer_id),
    INDEX idx_pickup_verification (bucket_id, pickup_pin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Transporter Profiles & Bids
CREATE TABLE IF NOT EXISTS transporter_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    operating_pincodes TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transporter_bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bucket_id INT NOT NULL,
    transporter_id INT NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bucket_id) REFERENCES buckets(id),
    FOREIGN KEY (transporter_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Reviews & Quality Disputes for Farmers
CREATE TABLE IF NOT EXISTS farmer_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    customer_id INT NOT NULL,
    bucket_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    tags VARCHAR(255) NULL,
    review_comment TEXT NULL,
    issue_reported ENUM('none', 'damaged_spoiled', 'wrong_quantity', 'poor_quality') DEFAULT 'none',
    evidence_photo_url VARCHAR(255) NULL COMMENT 'Photo proof of faulty piece',
    dispute_status ENUM('none', 'pending_review', 'refunded_from_deposit', 'rejected') DEFAULT 'none',
    refund_issued DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Compensated from farmer deposit',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (bucket_id) REFERENCES buckets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Complaints Against Customers (Farmer -> Customer, Moderated by Admin)
CREATE TABLE IF NOT EXISTS customer_complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    customer_id INT NOT NULL,
    bucket_id INT NOT NULL,
    complaint_reason ENUM('refused_cash_payment', 'abusive_behavior', 'chronic_delay', 'damage_claim_fraud', 'other') NOT NULL,
    incident_details TEXT NOT NULL,
    status ENUM('submitted', 'under_investigation', 'upheld_penalized', 'dismissed') DEFAULT 'submitted',
    admin_action_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (farmer_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (bucket_id) REFERENCES buckets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Penalties & Blacklist Log
CREATE TABLE IF NOT EXISTS penalties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bucket_id INT NOT NULL,
    penalty_amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('unpaid', 'cleared', 'waived') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cleared_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bucket_id) REFERENCES buckets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO platform_settings (setting_key, setting_value) VALUES 
('platform_fee_fixed', '0.00'),
('advance_payment_percentage', '50'),
('min_farmer_deposit', '1000.00'),
('deposit_exposure_multiplier', '10'),
('unnotified_cancellation_penalty', '300.00')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
