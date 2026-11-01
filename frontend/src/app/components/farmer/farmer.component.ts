import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-farmer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="portal-header-compact">
      <div class="title-wrap">
        <h2>👨‍🌾 Farmer Dashboard</h2>
        <span class="subtitle">Publish Harvests, Monitor Society Buckets & Dispatch Trucks</span>
      </div>

      <!-- Compact Security Deposit Bar -->
      <div class="deposit-compact-bar" *ngIf="wallet">
        <span>Collateral: <strong>₹{{ wallet.deposit_balance }}</strong></span>
        <span>10x Limit: <strong>₹{{ wallet.max_allowed_exposure }}</strong></span>
        <span>Quota Left: <strong class="text-success">₹{{ wallet.exposure_remaining }}</strong></span>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-bar">
      <button class="tab-btn" [class.active]="activeTab === 'buckets'" (click)="activeTab = 'buckets'">
        Active Buckets ({{ buckets.length }})
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'create'" (click)="activeTab = 'create'">
        + List Produce
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'listings'" (click)="activeTab = 'listings'">
        My Produce Catalog
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'feedback'" (click)="activeTab = 'feedback'">
        Reviews & Complaints
      </button>
    </div>

    <div *ngIf="statusMessage" class="alert alert-info compact-alert">
      {{ statusMessage }}
    </div>

    <!-- TAB 1: ACTIVE BUCKETS FORMING -->
    <div *ngIf="activeTab === 'buckets'">
      <div *ngIf="buckets.length === 0" class="clean-card empty-card">
        <p>No buckets formed yet. Create a produce listing to allow consumers to start pooling!</p>
      </div>

      <div class="buckets-grid">
        <div *ngFor="let b of buckets" class="clean-card bucket-card-sm">
          <div class="bucket-header-sm">
            <div>
              <strong class="hub-title">{{ b.hub_name }}</strong>
              <p class="landmark-sub">📍 {{ b.delivery_landmark }} ({{ b.delivery_pincode }})</p>
            </div>
            <span class="badge" [ngClass]="'badge-' + b.status">{{ b.status }}</span>
          </div>

          <div class="bucket-produce-row">
            <span>📦 {{ b.produce_name }}</span>
            <strong>₹{{ b.price_per_unit }}/{{ b.unit }}</strong>
          </div>

          <!-- Compact Farmer Code Chip -->
          <div class="code-chip-bar">
            <span>🚜 Farmer Code:</span>
            <strong class="code-val">{{ b.farmer_verification_code || '------' }}</strong>
          </div>

          <!-- Compact Progress Bar -->
          <div class="progress-wrap-sm">
            <div class="progress-labels-sm">
              <span>Pooled: <strong>{{ b.current_quantity }}/{{ b.target_quantity }} {{ b.unit }}</strong></span>
              <span>{{ getPercent(b.current_quantity, b.target_quantity) }}%</span>
            </div>
            <div class="progress-container-sm">
              <div class="progress-fill" [style.width.%]="getPercent(b.current_quantity, b.target_quantity)"></div>
            </div>
          </div>

          <div class="bucket-actions-sm">
            <button class="btn btn-secondary btn-xs" (click)="viewRoster(b)">
              📋 Packing Sheet
            </button>
            <button *ngIf="b.status === 'collecting'" class="btn btn-primary btn-xs" (click)="acceptPartial(b.id)">
              ✅ Accept ({{ b.current_quantity }} {{ b.unit }})
            </button>
            <button *ngIf="b.status === 'locked' || b.status === 'processing'" class="btn btn-primary btn-xs" (click)="openDispatchModal(b)">
              🚚 Dispatch Truck
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: CREATE PRODUCE LISTING -->
    <div *ngIf="activeTab === 'create'">
      <div class="clean-card form-card-compact">
        <h4 style="margin: 0 0 10px;">List New Harvest Batch</h4>

        <form (ngSubmit)="submitListing()">
          <div class="form-group">
            <label class="form-label">Produce Name</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="newListing.produce_name" name="produce_name" required placeholder="e.g. Ratnagiri Alphonso Mangoes">
          </div>

          <div class="form-row-sm">
            <div class="form-group col">
              <label class="form-label">Category</label>
              <select class="form-control form-control-sm" [(ngModel)]="newListing.category" name="category">
                <option value="Fruits">Fruits</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Grains & Pulses">Grains & Pulses</option>
              </select>
            </div>
            <div class="form-group col">
              <label class="form-label">Unit</label>
              <select class="form-control form-control-sm" [(ngModel)]="newListing.unit" name="unit">
                <option value="dozen">Dozen</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="crate">Crate</option>
              </select>
            </div>
          </div>

          <div class="form-row-sm">
            <div class="form-group col">
              <label class="form-label">Price Per Unit (₹)</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="newListing.price_per_unit" name="price" required placeholder="750">
            </div>
            <div class="form-group col">
              <label class="form-label">Min Bucket Size</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="newListing.min_bucket_quantity" name="min_bucket" required placeholder="20">
            </div>
            <div class="form-group col">
              <label class="form-label">Stock</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="newListing.available_stock" name="stock" required placeholder="100">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Harvest / Dispatch Deadline</label>
            <input type="datetime-local" class="form-control form-control-sm" [(ngModel)]="newListing.dispatch_deadline" name="deadline" required>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="newListing.description" name="description" placeholder="Quality details"></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-xs" style="margin-top: 10px;">
            🚀 Publish Produce
          </button>
        </form>
      </div>
    </div>

    <!-- TAB 3: MY LISTINGS -->
    <div *ngIf="activeTab === 'listings'">
      <div class="listings-grid-compact">
        <div *ngFor="let l of listings" class="clean-card listing-item-sm">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 14px;">{{ l.produce_name }}</strong>
            <span class="badge" [ngClass]="'badge-' + l.status">{{ l.status }}</span>
          </div>
          <p class="price-tag-sm">₹{{ l.price_per_unit }}/{{ l.unit }}</p>
          <div class="listing-meta-row">
            <span>Min: {{ l.min_bucket_quantity }} {{ l.unit }}</span>
            <span>Stock: {{ l.available_stock }} {{ l.unit }}</span>
            <span>Buckets: {{ l.total_buckets }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: REVIEWS & COMPLAINTS -->
    <div *ngIf="activeTab === 'feedback'">
      <div *ngFor="let r of reviews" class="clean-card review-card-sm">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <strong>{{ r.customer_name }}</strong>
          <span>⭐ {{ r.rating }}/5</span>
        </div>
        <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-muted);">"{{ r.review_comment }}"</p>
      </div>
    </div>

    <!-- DISPATCH MODAL -->
    <div *ngIf="dispatchingBucket" class="modal-overlay">
      <div class="modal-content compact-modal">
        <h4 style="margin: 0 0 6px;">🚚 Dispatch Bucket to Driver</h4>
        <p class="modal-sub-text">Hub: {{ dispatchingBucket.hub_name }} ({{ dispatchingBucket.current_quantity }} {{ dispatchingBucket.unit }})</p>

        <div class="form-group" style="margin-top: 10px;">
          <label class="form-label" style="font-size: 12px;">Select Driver</label>
          <select class="form-control form-control-sm" [(ngModel)]="dispatchForm.driver_id">
            <option *ngFor="let d of drivers" [value]="d.id">
              {{ d.name }} - {{ d.vehicle_type }} ({{ d.vehicle_number }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: 12px;">Total Freight Cost (₹)</label>
          <input type="number" class="form-control form-control-sm" [(ngModel)]="dispatchForm.total_transport_cost" placeholder="500">
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: 12px;">Expected Arrival Window</label>
          <input type="datetime-local" class="form-control form-control-sm" [(ngModel)]="dispatchForm.delivery_window_start">
        </div>

        <div class="modal-actions-sm">
          <button class="btn btn-secondary btn-xs" (click)="dispatchingBucket = null">Cancel</button>
          <button class="btn btn-primary btn-xs" (click)="confirmDispatch()">Confirm Dispatch</button>
        </div>
      </div>
    </div>

    <!-- ROSTER PACKING SHEET MODAL (SPACE-EFFECTIVE COMPACT) -->
    <div *ngIf="rosterBucket" class="modal-overlay">
      <div class="modal-content compact-modal" style="max-width: 520px;">
        <h4 style="margin: 0 0 4px;">📋 Customer Packing & Code Sheet</h4>
        <p class="modal-sub-text">Hub: {{ rosterBucket.hub_name }} · Landmark: {{ rosterBucket.delivery_landmark }}</p>

        <!-- Compact Farmer Verification Code Chip -->
        <div class="code-banner-compact">
          <span>🚜 Farmer Dispatch Code:</span>
          <strong>{{ rosterBucket.farmer_verification_code }}</strong>
        </div>

        <div class="roster-compact-list">
          <div *ngFor="let m of rosterMembers" class="roster-compact-item">
            <div class="item-left">
              <strong>{{ m.customer_name }}</strong>
              <span class="qty-sub">📦 {{ m.quantity }} {{ rosterBucket.unit }}</span>
              <span class="pin-sub">🔑 PIN: <strong>{{ m.pickup_pin }}</strong></span>
            </div>
            <div class="item-right">
              <span class="cod-text">Cash: <strong>₹{{ m.remaining_cod_due }}</strong></span>
              <span class="badge" [ngClass]="'badge-' + m.delivery_status">{{ m.delivery_status }}</span>
            </div>
          </div>
        </div>

        <div class="modal-actions-sm" style="margin-top: 12px;">
          <button class="btn btn-secondary btn-xs" (click)="rosterBucket = null">Close Sheet</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portal-header-compact {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .title-wrap h2 { font-size: 18px; margin: 0; color: var(--dark); }
    .subtitle { font-size: 12px; color: var(--text-muted); }

    .deposit-compact-bar {
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      border-radius: 6px;
      padding: 4px 10px;
      display: flex;
      gap: 12px;
      font-size: 12px;
    }

    .compact-alert { padding: 6px 10px; font-size: 12px; margin-bottom: 8px; }

    .buckets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 10px;
    }
    .bucket-card-sm { padding: 10px 12px; }
    .bucket-header-sm { display: flex; justify-content: space-between; align-items: flex-start; }
    .hub-title { font-size: 14px; color: var(--dark); }
    .landmark-sub { font-size: 11px; color: var(--text-muted); margin: 2px 0 6px; }

    .bucket-produce-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .code-chip-bar {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 3px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      margin: 4px 0;
    }
    .code-val { color: #1e40af; font-weight: 700; letter-spacing: 1px; }

    .progress-wrap-sm { margin: 6px 0; }
    .progress-labels-sm { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); }
    .progress-container-sm { background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden; margin-top: 2px; }

    .bucket-actions-sm { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }

    /* Listings */
    .listings-grid-compact {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    .listing-item-sm { padding: 10px 12px; }
    .price-tag-sm { font-size: 15px; font-weight: 800; color: var(--primary); margin: 4px 0; }
    .listing-meta-row { display: flex; gap: 8px; font-size: 11px; color: var(--text-muted); }

    .review-card-sm { padding: 8px 12px; margin-bottom: 6px; }

    /* Compact Roster Sheet */
    .code-banner-compact {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      border-radius: 6px;
      padding: 5px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin: 8px 0;
      color: #1e40af;
    }
    .roster-compact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
      max-height: 340px;
      overflow-y: auto;
    }
    .roster-compact-item {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .item-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .qty-sub { color: var(--dark); }
    .pin-sub {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 1px 6px;
    }
    .item-right { display: flex; align-items: center; gap: 8px; }
    .cod-text { color: var(--text-muted); }

    /* Form Styles */
    .form-card-compact { max-width: 500px; margin: 0 auto; padding: 14px 16px; }
    .form-row-sm { display: flex; gap: 8px; }
    .form-row-sm .col { flex: 1; }
    .form-control-sm { height: 30px; padding: 4px 8px; font-size: 12px; }
    .btn-xs { padding: 3px 8px; font-size: 11px; min-height: 26px; border-radius: 4px; }
    .compact-modal { max-width: 400px; padding: 16px; border-radius: 10px; }
    .modal-sub-text { font-size: 11px; color: var(--text-muted); margin: 0; }
    .modal-actions-sm { display: flex; justify-content: flex-end; gap: 6px; }
  `]
})
export class FarmerComponent implements OnInit {
  activeTab = 'buckets';
  wallet: any = null;
  buckets: any[] = [];
  listings: any[] = [];
  reviews: any[] = [];
  drivers: any[] = [];
  statusMessage = '';

  newListing = {
    produce_name: '',
    category: 'Fruits',
    unit: 'dozen',
    price_per_unit: 750,
    min_bucket_quantity: 20,
    available_stock: 100,
    dispatch_deadline: '',
    description: ''
  };

  dispatchingBucket: any = null;
  dispatchForm = {
    driver_id: null as number | null,
    total_transport_cost: 400,
    delivery_window_start: ''
  };

  rosterBucket: any = null;
  rosterMembers: any[] = [];

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.getFarmerWallet().subscribe(res => this.wallet = res);
    this.api.getFarmerBuckets().subscribe(res => this.buckets = res.buckets || []);
    this.api.getFarmerListings().subscribe(res => this.listings = res.listings || []);
    this.api.getFarmerReviews().subscribe(res => this.reviews = res.reviews || []);
    this.api.getDrivers().subscribe(res => {
      this.drivers = res.drivers || [];
      if (this.drivers.length > 0) this.dispatchForm.driver_id = this.drivers[0].id;
    });
  }

  getPercent(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  submitListing() {
    this.api.createListing(this.newListing).subscribe({
      next: (res) => {
        this.statusMessage = 'Produce batch published successfully!';
        this.activeTab = 'listings';
        this.loadData();
      },
      error: (err) => alert(err.error?.error || 'Failed to list produce.')
    });
  }

  viewRoster(b: any) {
    this.rosterBucket = b;
    this.api.getBucketMembers(b.id).subscribe({
      next: (res) => {
        this.rosterMembers = res.members || [];
        this.rosterBucket = res.bucket || b;
      },
      error: (err) => alert(err.error?.error || 'Failed to fetch members.')
    });
  }

  acceptPartial(bucketId: number) {
    if (confirm('Accept group order at current pledged quantity?')) {
      this.api.farmerBucketAction(bucketId, { action: 'accept_partial' }).subscribe({
        next: (res) => {
          this.statusMessage = res.message;
          this.loadData();
        },
        error: (err) => alert(err.error?.error || 'Failed to update.')
      });
    }
  }

  openDispatchModal(b: any) {
    this.dispatchingBucket = b;
  }

  confirmDispatch() {
    if (!this.dispatchingBucket) return;
    this.api.farmerBucketAction(this.dispatchingBucket.id, {
      action: 'dispatch',
      ...this.dispatchForm
    }).subscribe({
      next: (res) => {
        this.statusMessage = 'Bucket assigned to driver and marked dispatched!';
        this.dispatchingBucket = null;
        this.loadData();
      },
      error: (err) => alert(err.error?.error || 'Failed to dispatch.')
    });
  }
}
