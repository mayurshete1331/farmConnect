import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-consumer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Compact Top Bar -->
    <div class="portal-header">
      <div class="portal-title-wrap">
        <h2>🛒 Society Group Buying</h2>
        <span class="subtitle">Direct harvest from verified farmers at wholesale prices</span>
      </div>
      <div class="pincode-bar">
        <span>📍 Delivery Pincode: </span>
        <input type="text" class="form-control pincode-input" [(ngModel)]="searchPincode" (change)="loadData()" placeholder="400063">
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-bar">
      <button class="tab-btn" [class.active]="activeTab === 'explore'" (click)="activeTab = 'explore'">
        🌱 Browse Harvests & Groups ({{ filteredBuckets.length + filteredListings.length }})
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'reviews'" (click)="switchTab('reviews')">
        ⭐ Community Reviews & Ratings ({{ communityReviews.length }})
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'orders'" (click)="activeTab = 'orders'">
        📦 My Orders & Codes ({{ orders.length }})
      </button>
    </div>

    <div *ngIf="statusMessage" class="alert alert-info compact-alert">
      {{ statusMessage }}
    </div>

    <!-- TAB 1: BUY PRODUCE & ACTIVE SOCIETY POOLS WITH SEARCH & SORT -->
    <div *ngIf="activeTab === 'explore'">
      <!-- Universal Search, Filter & Sort Control Bar -->
      <div class="search-filter-card">
        <!-- Row 1: Search Box + Direct Sort Buttons (Price & Review) -->
        <div class="search-main-row">
          <div class="search-box-wrap">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              class="search-input-field" 
              [(ngModel)]="searchQuery" 
              (input)="applyFilters()" 
              placeholder="Search apartment (Lodha, Oberoi), area (Goregaon, Pune), farmer (Ratnagiri, Maval), or produce (rice, mango, turmeric)..."
            />
            <button *ngIf="searchQuery" class="clear-search-btn" (click)="clearSearch()">✕</button>
          </div>

          <!-- Quick 1-Click Sort Buttons for Price & Review -->
          <div class="sort-quick-bar">
            <span class="control-label">Sort:</span>
            <button class="sort-pill" [class.active]="sortBy === 'price_asc'" (click)="setSort('price_asc')" title="Sort Price: Lowest to Highest">
              💰 Price: Low → High
            </button>
            <button class="sort-pill" [class.active]="sortBy === 'price_desc'" (click)="setSort('price_desc')" title="Sort Price: Highest to Lowest">
              💎 Price: High → Low
            </button>
            <button class="sort-pill" [class.active]="sortBy === 'review_desc'" (click)="setSort('review_desc')" title="Sort by Highest Farmer Rating & Reviews">
              ⭐ Top Rated & Reviews
            </button>
            <button class="sort-pill" [class.active]="sortBy === 'popularity'" (click)="setSort('popularity')" title="Sort by % Pooled">
              🔥 % Pooled
            </button>
            <select class="control-select-sm" [(ngModel)]="sortBy" (change)="applyFilters()">
              <option value="price_asc">💰 Price: Low to High</option>
              <option value="price_desc">💎 Price: High to Low</option>
              <option value="review_desc">⭐ Top Rated (5★ First)</option>
              <option value="review_count">💬 Most Reviewed</option>
              <option value="popularity">🔥 Highest % Pooled</option>
              <option value="name">🔤 Produce (A - Z)</option>
              <option value="deadline">⏳ Earliest Delivery</option>
            </select>
          </div>
        </div>

        <!-- Row 2: Fast Category & Quick Search Pills -->
        <div class="quick-tags-row">
          <span class="tags-label">Category:</span>
          <button class="tag-chip" [class.active]="selectedCategory === 'all' && !searchQuery" (click)="setCategory('all')">All</button>
          <button class="tag-chip" [class.active]="selectedCategory === 'Grains & Pulses'" (click)="setCategory('Grains & Pulses')">🌾 Rice & Grains</button>
          <button class="tag-chip" [class.active]="selectedCategory === 'Fruits'" (click)="setCategory('Fruits')">🥭 Mango & Fruits</button>
          <button class="tag-chip" [class.active]="selectedCategory === 'Spices'" (click)="setCategory('Spices')">🌿 Turmeric & Spices</button>
          <button class="tag-chip" [class.active]="selectedCategory === 'Vegetables'" (click)="setCategory('Vegetables')">🧅 Onions & Veggies</button>

          <span class="tag-divider">|</span>
          <span class="tags-label">Quick Search:</span>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'rice'" (click)="setSearchTerm('rice')">🌾 Rice</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'mango'" (click)="setSearchTerm('mango')">🥭 Mango</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'turmeric'" (click)="setSearchTerm('turmeric')">🌿 Turmeric</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'lodha'" (click)="setSearchTerm('Lodha')">🏢 Lodha</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'oberoi'" (click)="setSearchTerm('Oberoi')">🏢 Oberoi</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'gokuldham'" (click)="setSearchTerm('Gokuldham')">🏢 Gokuldham</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'ratnagiri'" (click)="setSearchTerm('Ratnagiri')">📍 Ratnagiri</button>
          <button class="tag-chip tag-apt" [class.active]="searchQuery.toLowerCase() === 'maval'" (click)="setSearchTerm('Maval')">📍 Maval</button>
        </div>
      </div>

      <!-- Active Sort & Filter Indicator Banner -->
      <div class="results-meta-bar">
        <span>
          Showing <strong>{{ filteredBuckets.length }}</strong> pools & <strong>{{ filteredListings.length }}</strong> harvests · 
          Sorted by: <strong class="sort-indicator">{{ getSortLabel() }}</strong>
          <span *ngIf="searchQuery || selectedCategory !== 'all'"> (matching "<span class="highlight-query">{{ searchQuery || selectedCategory }}</span>")</span>
        </span>
        <button *ngIf="searchQuery || selectedCategory !== 'all' || sortBy !== 'price_asc'" class="reset-filter-link" (click)="resetAllFilters()">Reset Filters</button>
      </div>

      <!-- SECTION 1: Active Society Groups Near You -->
      <div class="section-block">
        <div class="section-header-compact">
          <h3>🤝 Active Society Groups Forming ({{ filteredBuckets.length }})</h3>
          <span class="section-hint">Join a group to share bulk logistics cost with your neighbors</span>
        </div>

        <div *ngIf="filteredBuckets.length === 0" class="clean-card empty-card-sm">
          <p>No active society groups matching your filter. Browse available harvests below to start a pool for your building!</p>
        </div>

        <div class="cards-grid">
          <div *ngFor="let b of filteredBuckets" class="clean-card compact-bucket-card">
            <div class="card-head-row">
              <span class="hub-name-text">🏢 {{ b.hub_name }}</span>
              <span class="badge" [ngClass]="'badge-' + b.status">{{ b.status }}</span>
            </div>
            <p class="landmark-text">📍 {{ b.delivery_landmark }} · {{ b.delivery_address }} (PIN: {{ b.delivery_pincode }})</p>

            <div class="produce-compact-row">
              <div>
                <strong>{{ b.produce_name }}</strong>
                <span class="category-pill-sm">{{ b.category }}</span>
              </div>
              <span class="price-text">₹{{ b.price_per_unit }}/{{ b.unit }}</span>
            </div>

            <!-- Farmer Name, Location & CLICKABLE Star Rating / Reviews -->
            <div class="farmer-review-row">
              <span class="farmer-location-text">
                👨‍🌾 {{ b.farm_name }} <span *ngIf="b.village">· 📍 {{ b.village }}{{ b.district ? ', ' + b.district : '' }}</span>
              </span>
              <button type="button" class="rating-badge-btn" (click)="openFarmerReviews(b.farmer_id, b.farm_name)" title="Click to read verified reviews for {{ b.farm_name }}">
                ⭐ <strong>{{ b.average_rating || '5.0' }}</strong> ({{ b.total_reviews || 0 }}) · <u class="see-rev-link">See Reviews</u>
              </button>
            </div>

            <!-- Compact Progress -->
            <div class="progress-wrap-sm">
              <div class="progress-labels-sm">
                <span>Pooled: <strong>{{ b.current_quantity }}/{{ b.target_quantity }} {{ b.unit }}</strong></span>
                <span class="percent-text">{{ getPercent(b.current_quantity, b.target_quantity) }}%</span>
              </div>
              <div class="progress-container-sm">
                <div class="progress-fill" [style.width.%]="getPercent(b.current_quantity, b.target_quantity)"></div>
              </div>
            </div>

            <button class="btn btn-primary btn-block btn-xs" style="margin-top: 8px;" (click)="openJoinModal(b)">
              <span *ngIf="b.user_pledged_quantity > 0">✏️ Add More (Ordered: {{ b.user_pledged_quantity }} {{ b.unit }})</span>
              <span *ngIf="!b.user_pledged_quantity || b.user_pledged_quantity == 0">🤝 Join Society Pool</span>
            </button>
          </div>
        </div>
      </div>

      <!-- SECTION 2: Fresh Harvest Catalog -->
      <div class="section-block" style="margin-top: 14px;">
        <div class="section-header-compact">
          <h3>🌾 Available Farm Harvests ({{ filteredListings.length }})</h3>
          <span class="section-hint">Select any harvest batch to launch a pool for your building</span>
        </div>

        <div *ngIf="filteredListings.length === 0" class="clean-card empty-card-sm">
          <p>No farm harvests match your filter criteria. Try clearing the search or category filters.</p>
        </div>

        <div class="cards-grid">
          <div *ngFor="let l of filteredListings" class="clean-card compact-produce-card">
            <div class="card-head-row">
              <strong class="produce-title">{{ l.produce_name }}</strong>
              <span class="badge badge-active">{{ l.category }}</span>
            </div>

            <!-- Farmer Location & CLICKABLE Star Rating / Reviews -->
            <div class="farmer-review-row">
              <p class="farmer-sub">👨‍🌾 {{ l.farm_name }} · 📍 {{ l.village }}{{ l.district ? ', ' + l.district : '' }}</p>
              <button type="button" class="rating-badge-btn" (click)="openFarmerReviews(l.farmer_id, l.farm_name)" title="Click to read verified reviews for {{ l.farm_name }}">
                ⭐ <strong>{{ l.average_rating || '5.0' }}</strong> ({{ l.total_reviews || 0 }}) · <u class="see-rev-link">See Reviews</u>
              </button>
            </div>

            <div class="price-row-compact">
              <span class="price-num">₹{{ l.price_per_unit }}</span>
              <span class="unit-sub">/ {{ l.unit }}</span>
              <span class="min-sub">· Min Pool: {{ l.min_bucket_quantity }} {{ l.unit }}</span>
              <span class="stock-sub" *ngIf="l.available_stock">· Stock: {{ l.available_stock }}</span>
            </div>

            <p class="desc-line">{{ l.description }}</p>

            <button class="btn btn-outline btn-block btn-xs" style="margin-top: 8px;" (click)="openCreateBucketModal(l)">
              🚀 Start Group for My Building
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: DEDICATED COMMUNITY REVIEWS FEED -->
    <div *ngIf="activeTab === 'reviews'">
      <div class="section-header-compact">
        <h3>⭐ Verified Society Reviews & Freshness Ratings</h3>
        <span class="section-hint">Genuine feedback from apartment residents across Mumbai and Pune</span>
      </div>

      <div *ngIf="communityReviews.length === 0" class="clean-card empty-card-sm">
        <p>Loading community reviews...</p>
      </div>

      <div class="reviews-feed-grid">
        <div *ngFor="let r of communityReviews" class="clean-card review-feed-card">
          <div class="rev-card-head">
            <div>
              <strong class="rev-author-name">👤 {{ r.customer_name }}</strong>
              <span class="rev-hub-sub" *ngIf="r.hub_name">🏢 {{ r.hub_name }}</span>
            </div>
            <div class="star-rating-box">
              <span class="stars-gold">{{ getStars(r.rating) }}</span>
              <span class="rating-num">({{ r.rating }}/5)</span>
            </div>
          </div>

          <div class="rev-meta-sub">
            <span>👨‍🌾 <strong>{{ r.farm_name }}</strong> ({{ r.village }})</span>
            <span *ngIf="r.produce_name" class="rev-produce-tag">📦 {{ r.produce_name }}</span>
          </div>

          <p class="rev-comment-text">“{{ r.review_comment }}”</p>

          <div class="rev-foot-row">
            <span class="rev-tags" *ngIf="r.tags">🏷️ {{ r.tags }}</span>
            <span class="rev-date">{{ r.created_at | date:'mediumDate' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: MY ORDERS (SPACE-EFFECTIVE COMPACT LIST - NO BIG OVERSIZED NUMBERS) -->
    <div *ngIf="activeTab === 'orders'">
      <div class="section-header-compact">
        <h3>📦 My Orders & Drop Point Verification</h3>
        <span class="section-hint">Present your pickup PIN to the delivery driver to collect your package</span>
      </div>

      <div *ngIf="orders.length === 0" class="clean-card empty-card">
        <p>No orders yet. Browse harvests above to start or join a group order!</p>
      </div>

      <div class="orders-compact-list">
        <div *ngFor="let o of orders" class="order-compact-card">
          <!-- Top Row: Produce Title, Quantity, Landmark, Status -->
          <div class="order-row-top">
            <div class="order-info-left">
              <strong class="produce-name-text">{{ o.produce_name }}</strong>
              <span class="qty-pill">{{ o.quantity }} {{ o.unit }}</span>
              <span class="landmark-pill">🏢 {{ o.hub_name }} · 📍 {{ o.delivery_landmark }}</span>
            </div>
            <span class="badge" [ngClass]="'badge-' + o.delivery_status">
              {{ o.delivery_status === 'pending' ? (o.bucket_status === 'locked' ? 'Locked (Preparing)' : o.bucket_status) : o.delivery_status }}
            </span>
          </div>

          <!-- Middle Row: Compact Verification Chips (Space-Effective, No Oversized Numbers) -->
          <div class="order-row-middle">
            <div class="code-chip-compact code-customer" title="Tell this 6-digit PIN to driver at drop point">
              <span class="code-label">🔑 YOUR PICKUP PIN:</span>
              <strong class="code-number">{{ o.pickup_pin }}</strong>
            </div>

            <div class="code-chip-compact code-farmer" title="Check this 6-digit code on driver's packing sheet">
              <span class="code-label">🚜 FARMER CODE:</span>
              <strong class="code-number">{{ o.farmer_verification_code || '------' }}</strong>
            </div>

            <div class="finance-pill-compact">
              <span class="fin-item">Total Bill: <strong>₹{{ o.total_bill }}</strong></span>
              <span class="fin-divider">|</span>
              <span class="fin-item">Driver Cash Due: <strong class="text-primary">₹{{ o.remaining_cod_due }}</strong></span>
            </div>

            <div class="order-actions-compact">
              <button *ngIf="o.advance_payment_status === 'pending'" class="btn btn-primary btn-xs" (click)="openUpiModal(o)">
                💳 Pay ₹{{ o.advance_amount_due }} Advance
              </button>
              <span *ngIf="o.advance_payment_status === 'verified'" class="badge badge-paid">✓ 50% Advance Paid</span>
              <button *ngIf="o.delivery_status === 'delivered'" class="btn btn-outline btn-xs" (click)="openReviewModal(o)">
                ⭐ Rate Freshness
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- POPUP MODAL: FARMER REVIEWS & REPUTATION BREAKDOWN -->
    <div *ngIf="reviewModalFarmer" class="modal-overlay">
      <div class="modal-content reviews-modal-box">
        <div class="modal-header-row">
          <div>
            <h4 style="margin: 0;">👨‍🌾 {{ reviewModalFarmer.farm_name }}</h4>
            <p class="modal-sub-text">📍 {{ reviewModalFarmer.village }}, {{ reviewModalFarmer.district }} ({{ reviewModalFarmer.state || 'Maharashtra' }})</p>
          </div>
          <button type="button" class="close-x-btn" (click)="reviewModalFarmer = null">✕</button>
        </div>

        <!-- Rating Overview Banner -->
        <div class="rating-overview-banner">
          <div class="score-large-wrap">
            <span class="score-num">⭐ {{ reviewModalFarmer.average_rating || '5.0' }}</span>
            <span class="score-sub">out of 5.0</span>
          </div>
          <div class="score-meta-wrap">
            <span class="rev-count-badge">Based on <strong>{{ reviewModalFarmer.total_reviews }}</strong> verified deliveries</span>
            <span class="deposit-guarantee">🛡️ Security Collateral: <strong>₹{{ reviewModalFarmer.security_deposit_balance || '10000' }}</strong> held in Admin Escrow</span>
          </div>
        </div>

        <!-- Star Filter Tabs inside modal -->
        <div class="modal-filter-row">
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Filter:</span>
          <button class="filter-pill-sm" [class.active]="starFilter === 0" (click)="filterModalReviews(0)">All ({{ reviewModalList.length }})</button>
          <button class="filter-pill-sm" [class.active]="starFilter === 5" (click)="filterModalReviews(5)">5 Stars</button>
          <button class="filter-pill-sm" [class.active]="starFilter === 4" (click)="filterModalReviews(4)">4 Stars</button>
        </div>

        <!-- Scrollable Reviews List -->
        <div class="modal-reviews-scroll">
          <div *ngIf="filteredModalReviews.length === 0" class="empty-reviews-state">
            <p>No reviews match this star filter.</p>
          </div>

          <div *ngFor="let rev of filteredModalReviews" class="review-item-compact">
            <div class="rev-item-top">
              <strong style="font-size: 12px; color: var(--dark);">👤 {{ rev.customer_name }}</strong>
              <span class="stars-gold">{{ getStars(rev.rating) }}</span>
            </div>
            <div class="rev-item-sub">
              <span *ngIf="rev.hub_name">🏢 {{ rev.hub_name }}</span>
              <span *ngIf="rev.produce_name">· 📦 {{ rev.produce_name }}</span>
              <span class="rev-time-sub">· {{ rev.created_at | date:'mediumDate' }}</span>
            </div>
            <p class="rev-text-quote">“{{ rev.review_comment }}”</p>
            <span class="rev-tag-pill" *ngIf="rev.tags">🏷️ {{ rev.tags }}</span>
          </div>
        </div>

        <div class="modal-actions-sm" style="margin-top: 10px;">
          <button class="btn btn-secondary btn-xs" (click)="reviewModalFarmer = null">Close</button>
        </div>
      </div>
    </div>

    <!-- COMPACT JOIN BUCKET MODAL -->
    <div *ngIf="modalBucket" class="modal-overlay">
      <div class="modal-content compact-modal">
        <h4 style="margin: 0 0 6px;">{{ modalBucket.user_pledged_quantity > 0 ? 'Add to Your Order' : 'Join Society Group' }}</h4>
        <p class="modal-sub-text">Hub: <strong>{{ modalBucket.hub_name }}</strong> | {{ modalBucket.produce_name }} (₹{{ modalBucket.price_per_unit }}/{{ modalBucket.unit }})</p>

        <div class="form-group" style="margin: 10px 0;">
          <label class="form-label" style="font-size: 12px;">Quantity ({{ modalBucket.unit }})</label>
          <div class="qty-control-row">
            <button type="button" class="btn-qty" (click)="decreaseQty()">-</button>
            <input type="number" class="form-control qty-input" [(ngModel)]="pledgeQty" min="1" (input)="calcPledgeEstimate()">
            <button type="button" class="btn-qty" (click)="increaseQty()">+</button>
          </div>
        </div>

        <div class="price-box-compact">
          <div class="summary-line-sm">
            <span>Total: <strong>{{ (modalBucket.user_pledged_quantity * 1 || 0) + (pledgeQty * 1) }} {{ modalBucket.unit }}</strong></span>
            <span>Bill: <strong class="text-primary">₹{{ estTotal }}</strong></span>
          </div>
          <p class="pay-hint">Pay 50% (₹{{ estTotal / 2 }}) by UPI, remaining 50% (₹{{ estTotal / 2 }}) cash to driver at delivery.</p>
        </div>

        <div class="modal-actions-sm">
          <button class="btn btn-secondary btn-xs" (click)="modalBucket = null">Cancel</button>
          <button class="btn btn-primary btn-xs" (click)="confirmJoin()">Confirm Order</button>
        </div>
      </div>
    </div>

    <!-- COMPACT CREATE BUCKET MODAL -->
    <div *ngIf="modalListing" class="modal-overlay">
      <div class="modal-content compact-modal">
        <h4 style="margin: 0 0 6px;">Start Group for Your Building</h4>
        <p class="modal-sub-text">{{ modalListing.produce_name }} (₹{{ modalListing.price_per_unit }}/{{ modalListing.unit }})</p>

        <div class="form-group" style="margin-top: 10px;">
          <label class="form-label" style="font-size: 12px;">Society / Apartment Hub Name</label>
          <input type="text" class="form-control form-control-sm" [(ngModel)]="createBucketForm.hub_name" placeholder="e.g. Lodha Belmondo - Tower C">
        </div>

        <div class="form-row-compact">
          <div class="form-group col">
            <label class="form-label" style="font-size: 12px;">Pincode</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="createBucketForm.delivery_pincode" placeholder="400063">
          </div>
          <div class="form-group col">
            <label class="form-label" style="font-size: 12px;">Initial Qty ({{ modalListing.unit }})</label>
            <input type="number" class="form-control form-control-sm" [(ngModel)]="createBucketForm.pledge_quantity" min="1">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: 12px;">Pickup Landmark (e.g. Main Gate)</label>
          <input type="text" class="form-control form-control-sm" [(ngModel)]="createBucketForm.delivery_landmark" placeholder="e.g. Security Gate 2">
        </div>

        <div class="modal-actions-sm">
          <button class="btn btn-secondary btn-xs" (click)="modalListing = null">Cancel</button>
          <button class="btn btn-primary btn-xs" (click)="confirmCreateBucket()">Launch Group</button>
        </div>
      </div>
    </div>

    <!-- COMPACT UPI MODAL -->
    <div *ngIf="upiOrder" class="modal-overlay">
      <div class="modal-content compact-modal text-center">
        <h4 style="margin: 0 0 4px;">💳 50% Advance UPI</h4>
        <p class="modal-sub-text">{{ upiOrder.produce_name }} · Amount: <strong>₹{{ upiOrder.advance_amount_due }}</strong></p>

        <div style="margin: 8px auto;">
          <img [src]="getUpiQrUrl(upiOrder)" style="width: 120px; height: 120px; border-radius: 8px; border: 1px solid var(--border);" alt="UPI QR">
        </div>

        <div class="form-group" style="text-align: left; margin: 8px 0;">
          <label class="form-label" style="font-size: 11px;">12-Digit UPI UTR Reference Number</label>
          <input type="text" class="form-control form-control-sm" [(ngModel)]="upiUtr" placeholder="e.g. 409182736451">
        </div>

        <div class="modal-actions-sm">
          <button class="btn btn-secondary btn-xs" (click)="upiOrder = null">Cancel</button>
          <button class="btn btn-primary btn-xs" (click)="submitUtr()">Confirm Payment</button>
        </div>
      </div>
    </div>

    <!-- COMPACT REVIEW MODAL -->
    <div *ngIf="reviewOrder" class="modal-overlay">
      <div class="modal-content compact-modal">
        <h4 style="margin: 0 0 6px;">⭐ Rate Freshness</h4>
        <p class="modal-sub-text">{{ reviewOrder.produce_name }}</p>

        <div class="form-group" style="margin: 8px 0;">
          <label class="form-label" style="font-size: 12px;">Rating</label>
          <select class="form-control form-control-sm" [(ngModel)]="reviewForm.rating">
            <option value="5">⭐⭐⭐⭐⭐ 5 Stars - Super Fresh</option>
            <option value="4">⭐⭐⭐⭐ 4 Stars - Good Quality</option>
            <option value="3">⭐⭐⭐ 3 Stars - Average</option>
            <option value="2">⭐⭐ 2 Stars - Substandard</option>
            <option value="1">⭐ 1 Star - Damaged</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 10px;">
          <label class="form-label" style="font-size: 12px;">Feedback</label>
          <textarea class="form-control form-control-sm" [(ngModel)]="reviewForm.review_comment" rows="2" placeholder="Taste and freshness comments"></textarea>
        </div>

        <div class="modal-actions-sm">
          <button class="btn btn-secondary btn-xs" (click)="reviewOrder = null">Cancel</button>
          <button class="btn btn-primary btn-xs" (click)="submitReview()">Submit</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .portal-title-wrap h2 { font-size: 17px; margin: 0; color: var(--dark); font-weight: 700; }
    .subtitle { font-size: 11px; color: var(--text-muted); }
    .pincode-bar { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; }
    .pincode-input { max-width: 80px; padding: 3px 6px; font-size: 11px; height: 26px; }
    .compact-alert { padding: 6px 10px; font-size: 11px; margin-bottom: 8px; }

    /* Space-Effective Search & Filter Bar */
    .search-filter-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .search-main-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .search-box-wrap {
      flex: 1;
      min-width: 240px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 8px;
      font-size: 13px;
      color: var(--text-muted);
      pointer-events: none;
    }
    .search-input-field {
      width: 100%;
      height: 30px;
      padding: 4px 26px 4px 28px;
      font-size: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input-field:focus {
      border-color: var(--primary);
    }
    .clear-search-btn {
      position: absolute;
      right: 6px;
      background: none;
      border: none;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 4px;
    }

    /* Sort Quick Bar */
    .sort-quick-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .control-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--dark);
      white-space: nowrap;
    }
    .sort-pill {
      background: #f8fafc;
      border: 1px solid var(--border);
      font-size: 11px;
      font-weight: 600;
      color: var(--dark);
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      height: 28px;
    }
    .sort-pill:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .sort-pill.active {
      background: #ecfdf5;
      border-color: #10b981;
      color: #065f46;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(16, 185, 129, 0.15);
    }
    .control-select-sm {
      height: 28px;
      font-size: 11px;
      padding: 2px 4px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
      outline: none;
      font-weight: 500;
    }

    /* Fast Filter Chips */
    .quick-tags-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      flex-wrap: wrap;
      padding-top: 6px;
      border-top: 1px dashed #f1f5f9;
    }
    .tags-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-right: 2px;
    }
    .tag-divider {
      color: var(--border);
      margin: 0 4px;
      font-size: 12px;
    }
    .tag-chip {
      background: #f8fafc;
      border: 1px solid var(--border);
      font-size: 11px;
      font-weight: 500;
      color: var(--dark);
      padding: 2px 8px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tag-chip:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .tag-chip.active {
      background: var(--primary-light);
      border-color: var(--primary-border);
      color: var(--primary);
      font-weight: 700;
    }
    .tag-apt {
      background: #faf5ff;
      border-color: #e9d5ff;
      color: #6b21a8;
    }
    .tag-apt.active {
      background: #f3e8ff;
      border-color: #c084fc;
      color: #581c87;
    }

    .results-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 8px;
      padding: 0 4px;
      flex-wrap: wrap;
      gap: 4px;
    }
    .sort-indicator { color: var(--primary); font-weight: 700; }
    .highlight-query { color: var(--dark); font-weight: 700; }
    .reset-filter-link {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    .section-block { margin-bottom: 12px; }
    .section-header-compact {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 4px;
    }
    .section-header-compact h3 { font-size: 13px; font-weight: 700; color: var(--dark); margin: 0; }
    .section-hint { font-size: 11px; color: var(--text-muted); }
    .empty-card-sm { padding: 12px; text-align: center; font-size: 12px; color: var(--text-muted); }

    /* High-Density Responsive Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 8px;
    }

    .clean-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .card-head-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }
    .hub-name-text { font-size: 13px; font-weight: 700; color: var(--dark); }
    .landmark-text { font-size: 11px; color: var(--text-muted); margin: 2px 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .produce-compact-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin-bottom: 2px;
    }
    .category-pill-sm {
      background: #f1f5f9;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      padding: 1px 5px;
      border-radius: 4px;
      margin-left: 4px;
    }
    .price-text { font-weight: 700; color: var(--primary); font-size: 13px; }

    /* Farmer & CLICKABLE Rating Badge Button */
    .farmer-review-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      margin: 2px 0 4px;
    }
    .farmer-location-text { font-size: 10.5px; color: var(--text-muted); }
    .farmer-sub { font-size: 10.5px; color: var(--text-muted); margin: 0; }
    
    .rating-badge-btn {
      background: #fefce8;
      border: 1px solid #fef08a;
      color: #854d0e;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }
    .rating-badge-btn:hover {
      background: #fef9c3;
      border-color: #fde047;
      transform: translateY(-1px);
    }
    .see-rev-link { color: #b45309; font-weight: 600; }

    .progress-wrap-sm { margin: 2px 0; }
    .progress-labels-sm { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted); }
    .percent-text { font-weight: 700; color: var(--dark); }
    .progress-container-sm { background: #e2e8f0; border-radius: 4px; height: 5px; overflow: hidden; margin-top: 2px; }

    /* Produce Cards */
    .produce-title { font-size: 13px; color: var(--dark); }
    .price-row-compact { display: flex; align-items: baseline; gap: 3px; font-size: 11px; }
    .price-num { font-size: 15px; font-weight: 800; color: var(--primary); }
    .unit-sub { font-weight: 600; color: var(--text-muted); font-size: 11px; }
    .min-sub { color: var(--text-muted); font-size: 10.5px; }
    .stock-sub { color: #0369a1; font-size: 10.5px; font-weight: 600; }
    .desc-line {
      font-size: 10.5px;
      color: var(--text-muted);
      margin-top: 3px;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* REVIEWS FEED TAB STYLING */
    .reviews-feed-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 8px;
    }
    .review-feed-card {
      background: #fff;
      border: 1px solid var(--border);
      border-left: 3px solid #f59e0b;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rev-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
    }
    .rev-author-name { font-size: 12px; color: var(--dark); }
    .rev-hub-sub { display: block; font-size: 10.5px; color: var(--text-muted); }
    .star-rating-box { display: flex; align-items: center; gap: 3px; }
    .stars-gold { color: #f59e0b; font-size: 12px; letter-spacing: 1px; }
    .rating-num { font-size: 10px; font-weight: 700; color: var(--text-muted); }
    .rev-meta-sub {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }
    .rev-produce-tag {
      background: #f1f5f9;
      color: var(--dark);
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .rev-comment-text {
      font-size: 11.5px;
      color: #334155;
      line-height: 1.35;
      margin: 4px 0 2px;
      font-style: italic;
    }
    .rev-foot-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--text-muted);
      border-top: 1px dashed #f1f5f9;
      padding-top: 4px;
      margin-top: 2px;
    }
    .rev-tags { color: #0284c7; font-weight: 600; }

    /* SPACE-EFFECTIVE ORDERS LIST (NO OVERSIZED BIG NUMBERS) */
    .orders-compact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .order-compact-card {
      background: #fff;
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
      border-radius: 6px;
      padding: 7px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .order-row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .order-info-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .produce-name-text { font-size: 13px; font-weight: 700; color: var(--dark); }
    .qty-pill {
      background: #f1f5f9;
      color: var(--dark);
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .landmark-pill { font-size: 11px; color: var(--text-muted); }

    .order-row-middle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      border-top: 1px solid #f8fafc;
      padding-top: 4px;
    }

    /* Sleek, Compact Verification Chips */
    .code-chip-compact {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    .code-customer {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }
    .code-farmer {
      background: #eff6ff;
      border: 1px solid #bae6fd;
      color: #1e40af;
    }
    .code-label { font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
    .code-number { font-size: 13px; font-weight: 800; letter-spacing: 1px; font-family: monospace; }

    .finance-pill-compact {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-muted);
      background: #f8fafc;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .fin-item strong { color: var(--dark); }
    .fin-divider { color: var(--border); }

    .order-actions-compact {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* REVIEWS MODAL STYLES */
    .reviews-modal-box {
      max-width: 480px;
      padding: 14px;
      border-radius: 12px;
    }
    .modal-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .close-x-btn {
      background: none;
      border: none;
      font-size: 16px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 6px;
      line-height: 1;
    }
    .rating-overview-banner {
      background: #fffbeb;
      border: 1px solid #fef08a;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .score-large-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      border-right: 1px solid #fde047;
      padding-right: 12px;
    }
    .score-num { font-size: 18px; font-weight: 800; color: #854d0e; }
    .score-sub { font-size: 9.5px; color: #a16207; }
    .score-meta-wrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 11px;
    }
    .rev-count-badge { color: var(--dark); }
    .deposit-guarantee { color: #047857; font-size: 10.5px; }

    .modal-filter-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
    }
    .filter-pill-sm {
      background: #f1f5f9;
      border: 1px solid var(--border);
      font-size: 10.5px;
      font-weight: 600;
      color: var(--dark);
      padding: 2px 8px;
      border-radius: 12px;
      cursor: pointer;
    }
    .filter-pill-sm.active {
      background: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
    }

    .modal-reviews-scroll {
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-right: 2px;
    }
    .empty-reviews-state {
      text-align: center;
      padding: 16px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .review-item-compact {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .rev-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rev-item-sub {
      font-size: 10px;
      color: var(--text-muted);
      margin: 1px 0 3px;
    }
    .rev-time-sub { color: #94a3b8; }
    .rev-text-quote {
      font-size: 11px;
      color: #1e293b;
      margin: 2px 0;
      line-height: 1.3;
    }
    .rev-tag-pill {
      font-size: 9.5px;
      color: #0284c7;
      font-weight: 600;
    }

    /* Small Utility Styles */
    .btn-xs {
      padding: 3px 8px;
      font-size: 11px;
      min-height: 25px;
      border-radius: 4px;
    }
    .compact-modal {
      max-width: 360px;
      padding: 14px;
      border-radius: 10px;
    }
    .modal-sub-text { font-size: 11px; color: var(--text-muted); margin: 0; }
    .qty-control-row { display: flex; align-items: center; gap: 6px; }
    .btn-qty {
      width: 26px;
      height: 26px;
      border: 1px solid var(--border);
      background: #f1f5f9;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
    }
    .qty-input { width: 55px; height: 26px; text-align: center; font-size: 13px; font-weight: 700; padding: 2px; }
    .price-box-compact { background: #f8fafc; border-radius: 6px; padding: 6px 8px; margin: 6px 0; }
    .summary-line-sm { display: flex; justify-content: space-between; font-size: 11.5px; }
    .pay-hint { font-size: 10px; color: var(--text-muted); margin: 3px 0 0; }
    .modal-actions-sm { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
    .form-row-compact { display: flex; gap: 6px; }
    .form-row-compact .col { flex: 1; }
    .form-control-sm { padding: 3px 6px; font-size: 11px; height: 28px; }
  `]
})
export class ConsumerComponent implements OnInit {
  activeTab = 'explore';
  searchPincode = '400063';

  // Raw data from server
  rawListings: any[] = [];
  rawBuckets: any[] = [];

  // Filtered & Sorted data displayed to user
  filteredListings: any[] = [];
  filteredBuckets: any[] = [];

  // Filter & Sort States
  searchQuery = '';
  selectedCategory = 'all';
  sortBy = 'price_asc'; // Default to Price: Low to High

  orders: any[] = [];
  statusMessage = '';

  // Community Reviews Platform Feed
  communityReviews: any[] = [];

  // Farmer Specific Reviews Modal
  reviewModalFarmer: any = null;
  reviewModalList: any[] = [];
  filteredModalReviews: any[] = [];
  starFilter = 0; // 0 = all

  modalBucket: any = null;
  pledgeQty = 2;
  estTotal = 0;

  modalListing: any = null;
  createBucketForm = {
    hub_name: '',
    delivery_pincode: '400063',
    delivery_address: 'Gokuldham, Goregaon East',
    delivery_landmark: 'Main Security Gate',
    pledge_quantity: 2
  };

  upiOrder: any = null;
  upiUtr = '';

  reviewOrder: any = null;
  reviewForm = {
    rating: 5,
    issue_reported: 'none',
    review_comment: ''
  };

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.loadData();
    this.loadCommunityReviews();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'reviews') {
      this.loadCommunityReviews();
    }
  }

  loadData() {
    this.api.explore(this.searchPincode).subscribe(res => {
      this.rawListings = res.listings || [];
      this.rawBuckets = res.buckets || [];
      this.applyFilters();
    });
    this.api.getConsumerOrders().subscribe(res => {
      this.orders = res.orders || [];
    });
  }

  loadCommunityReviews() {
    this.api.getCommunityReviews().subscribe(res => {
      this.communityReviews = res.reviews || [];
    });
  }

  // Open Reviews Modal for specific Farmer
  openFarmerReviews(farmerId: number, farmNameFallback?: string) {
    if (!farmerId) return;
    this.starFilter = 0;
    this.api.getFarmerReviewsForConsumer(farmerId).subscribe({
      next: (res) => {
        this.reviewModalFarmer = res.farmer;
        this.reviewModalList = res.reviews || [];
        this.filteredModalReviews = [...this.reviewModalList];
      },
      error: () => {
        // Fallback info if API error
        this.reviewModalFarmer = {
          farm_name: farmNameFallback || 'Farmer Profile',
          average_rating: '5.0',
          total_reviews: 0
        };
        this.reviewModalList = [];
        this.filteredModalReviews = [];
      }
    });
  }

  filterModalReviews(stars: number) {
    this.starFilter = stars;
    if (stars === 0) {
      this.filteredModalReviews = [...this.reviewModalList];
    } else {
      this.filteredModalReviews = this.reviewModalList.filter(r => parseInt(r.rating, 10) === stars);
    }
  }

  getStars(rating: number): string {
    const r = Math.round(rating || 5);
    return '★'.repeat(r) + '☆'.repeat(Math.max(0, 5 - r));
  }

  // Set sort mode
  setSort(sortKey: string) {
    this.sortBy = sortKey;
    this.applyFilters();
  }

  getSortLabel(): string {
    switch (this.sortBy) {
      case 'price_asc': return 'Price: Low to High';
      case 'price_desc': return 'Price: High to Low';
      case 'review_desc': return 'Top Rated & Reviews (5★ First)';
      case 'review_count': return 'Most Reviewed';
      case 'popularity': return 'Highest % Pooled';
      case 'name': return 'Produce Name (A - Z)';
      case 'deadline': return 'Earliest Delivery';
      default: return 'Custom';
    }
  }

  // Universal Filter & Sort Logic
  applyFilters() {
    let q = (this.searchQuery || '').toLowerCase().trim();
    q = q.replace(/termaric/g, 'turmeric');

    // 1. Filter Buckets (Society Groups)
    this.filteredBuckets = this.rawBuckets.filter(b => {
      if (this.selectedCategory !== 'all') {
        const catMatch = (b.category || '').toLowerCase() === this.selectedCategory.toLowerCase();
        if (!catMatch) return false;
      }

      if (q) {
        const matchField = (
          (b.hub_name || '') + ' ' +
          (b.delivery_landmark || '') + ' ' +
          (b.delivery_address || '') + ' ' +
          (b.delivery_pincode || '') + ' ' +
          (b.produce_name || '') + ' ' +
          (b.category || '') + ' ' +
          (b.farm_name || '') + ' ' +
          (b.village || '') + ' ' +
          (b.district || '')
        ).toLowerCase();

        if (!matchField.includes(q)) return false;
      }
      return true;
    });

    // 2. Filter Listings (Farm Harvests)
    this.filteredListings = this.rawListings.filter(l => {
      if (this.selectedCategory !== 'all') {
        const catMatch = (l.category || '').toLowerCase() === this.selectedCategory.toLowerCase();
        if (!catMatch) return false;
      }

      if (q) {
        const matchField = (
          (l.produce_name || '') + ' ' +
          (l.category || '') + ' ' +
          (l.farm_name || '') + ' ' +
          (l.village || '') + ' ' +
          (l.district || '') + ' ' +
          (l.description || '')
        ).toLowerCase();

        if (!matchField.includes(q)) return false;
      }
      return true;
    });

    // 3. Apply Sorting
    this.sortBuckets();
    this.sortListings();
  }

  sortBuckets() {
    this.filteredBuckets.sort((a, b) => {
      if (this.sortBy === 'price_asc') {
        return parseFloat(a.price_per_unit) - parseFloat(b.price_per_unit);
      }
      if (this.sortBy === 'price_desc') {
        return parseFloat(b.price_per_unit) - parseFloat(a.price_per_unit);
      }
      if (this.sortBy === 'review_desc') {
        const ratingA = parseFloat(a.average_rating || '0');
        const ratingB = parseFloat(b.average_rating || '0');
        if (Math.abs(ratingB - ratingA) > 0.01) {
          return ratingB - ratingA;
        }
        return (parseInt(b.total_reviews, 10) || 0) - (parseInt(a.total_reviews, 10) || 0);
      }
      if (this.sortBy === 'review_count') {
        return (parseInt(b.total_reviews, 10) || 0) - (parseInt(a.total_reviews, 10) || 0);
      }
      if (this.sortBy === 'popularity') {
        const pctA = (a.current_quantity || 0) / (a.target_quantity || 1);
        const pctB = (b.current_quantity || 0) / (b.target_quantity || 1);
        return pctB - pctA;
      }
      if (this.sortBy === 'name') {
        return (a.produce_name || '').localeCompare(b.produce_name || '');
      }
      if (this.sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });
  }

  sortListings() {
    this.filteredListings.sort((a, b) => {
      if (this.sortBy === 'price_asc') {
        return parseFloat(a.price_per_unit) - parseFloat(b.price_per_unit);
      }
      if (this.sortBy === 'price_desc') {
        return parseFloat(b.price_per_unit) - parseFloat(a.price_per_unit);
      }
      if (this.sortBy === 'review_desc') {
        const ratingA = parseFloat(a.average_rating || '0');
        const ratingB = parseFloat(b.average_rating || '0');
        if (Math.abs(ratingB - ratingA) > 0.01) {
          return ratingB - ratingA;
        }
        return (parseInt(b.total_reviews, 10) || 0) - (parseInt(a.total_reviews, 10) || 0);
      }
      if (this.sortBy === 'review_count') {
        return (parseInt(b.total_reviews, 10) || 0) - (parseInt(a.total_reviews, 10) || 0);
      }
      if (this.sortBy === 'name') {
        return (a.produce_name || '').localeCompare(b.produce_name || '');
      }
      if (this.sortBy === 'deadline') {
        return new Date(a.dispatch_deadline).getTime() - new Date(b.dispatch_deadline).getTime();
      }
      return 0;
    });
  }

  setCategory(cat: string) {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  setSearchTerm(term: string) {
    this.searchQuery = term;
    this.applyFilters();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters();
  }

  resetAllFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.sortBy = 'price_asc';
    this.applyFilters();
  }

  getPercent(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  increaseQty() {
    this.pledgeQty = (this.pledgeQty || 0) + 1;
    this.calcPledgeEstimate();
  }

  decreaseQty() {
    if (this.pledgeQty > 1) {
      this.pledgeQty--;
      this.calcPledgeEstimate();
    }
  }

  openJoinModal(b: any) {
    this.modalBucket = b;
    this.pledgeQty = 2;
    this.calcPledgeEstimate();
  }

  calcPledgeEstimate() {
    if (!this.modalBucket) return;
    const existingQty = parseFloat(this.modalBucket.user_pledged_quantity || '0');
    const totalQty = existingQty + (this.pledgeQty || 0);
    this.estTotal = totalQty * parseFloat(this.modalBucket.price_per_unit);
  }

  confirmJoin() {
    if (!this.modalBucket) return;
    this.api.joinBucket(this.modalBucket.id, {
      pledge_quantity: this.pledgeQty
    }).subscribe({
      next: (res) => {
        this.statusMessage = res.message;
        this.modalBucket = null;
        this.activeTab = 'orders';
        this.loadData();
      },
      error: (err) => alert(err.error?.error || 'Failed to join group.')
    });
  }

  openCreateBucketModal(l: any) {
    this.modalListing = l;
  }

  confirmCreateBucket() {
    if (!this.modalListing) return;
    this.api.createBucket({
      listing_id: this.modalListing.id,
      ...this.createBucketForm
    }).subscribe({
      next: (res) => {
        this.statusMessage = 'Group order initialized! Tell neighbors to pool orders.';
        this.modalListing = null;
        this.activeTab = 'orders';
        this.loadData();
      },
      error: (err) => alert(err.error?.error || 'Failed to start group.')
    });
  }

  openUpiModal(o: any) {
    this.upiOrder = o;
    this.upiUtr = '';
  }

  getUpiQrUrl(o: any): string {
    const upiUri = `upi://pay?pa=admin-escrow@upi&pn=FarmConnect&am=${o.advance_amount_due}&cu=INR&tn=AdvanceOrder${o.member_id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;
  }

  submitUtr() {
    if (!this.upiOrder) return;
    this.api.submitAdvanceUtr(this.upiOrder.member_id, this.upiUtr).subscribe({
      next: (res) => {
        this.statusMessage = res.message;
        this.upiOrder = null;
        this.loadData();
      },
      error: (err) => alert(err.error?.error || 'Invalid UTR.')
    });
  }

  openReviewModal(o: any) {
    this.reviewOrder = o;
    this.reviewForm = {
      rating: 5,
      issue_reported: 'none',
      review_comment: ''
    };
  }

  submitReview() {
    if (!this.reviewOrder) return;
    this.api.submitConsumerReview(this.reviewOrder.member_id, this.reviewForm).subscribe({
      next: (res) => {
        this.statusMessage = res.message;
        this.reviewOrder = null;
        this.loadData();
        this.loadCommunityReviews();
      },
      error: (err) => alert(err.error?.error || 'Failed to submit review.')
    });
  }
}
