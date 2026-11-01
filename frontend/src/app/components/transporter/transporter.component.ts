import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-transporter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="portal-header-sm">
      <div>
        <h2>🚚 Delivery Driver Portal</h2>
        <span class="subtitle">Assigned Routes, Handshakes & Cash Collection</span>
      </div>
    </div>

    <div *ngIf="statusMessage" class="alert alert-info compact-alert">
      {{ statusMessage }}
    </div>

    <div *ngIf="deliveries.length === 0" class="clean-card empty-card">
      <p>🚚 No active deliveries assigned right now.</p>
    </div>

    <div class="deliveries-grid-sm">
      <div *ngFor="let d of deliveries" class="clean-card delivery-card-sm">
        <div class="card-head-sm">
          <div>
            <strong class="hub-name">{{ d.hub_name }}</strong>
            <p class="landmark-sub">📍 {{ d.delivery_landmark }} ({{ d.delivery_pincode }})</p>
          </div>
          <span class="badge" [ngClass]="'badge-' + d.status">{{ d.status }}</span>
        </div>

        <!-- Compact Farmer Code Chip -->
        <div class="farmer-chip-banner">
          <span>🚜 Farmer Code: <strong>{{ d.farmer_verification_code || '------' }}</strong></span>
          <span class="hint-inline">(Show to customers to verify genuine delivery)</span>
        </div>

        <div class="delivery-stats-compact">
          <span>{{ d.produce_name }} ({{ d.current_quantity }} {{ d.unit }})</span>
          <span>Farmer: {{ d.farmer_name }}</span>
          <span>Freight Fee: <strong class="text-success">₹{{ d.total_transport_cost }}</strong></span>
        </div>

        <button class="btn btn-primary btn-block btn-xs" style="margin-top: 8px;" (click)="openRoster(d)">
          📋 Open Delivery List ({{ d.current_quantity }} {{ d.unit }})
        </button>
      </div>
    </div>

    <!-- COMPACT DELIVERY ROSTER MODAL -->
    <div *ngIf="activeDelivery" class="modal-overlay">
      <div class="modal-content compact-modal" style="max-width: 520px;">
        <h4 style="margin: 0 0 4px;">🤝 Drop Point Delivery List</h4>
        <p class="modal-sub-text">Hub: {{ activeDelivery.hub_name }} · Landmark: {{ activeDelivery.delivery_landmark }}</p>

        <!-- Compact Farmer Verification Code -->
        <div class="farmer-chip-banner" style="margin: 6px 0;">
          <span>🚜 Farmer Code: <strong>{{ activeDelivery.farmer_verification_code }}</strong></span>
          <span class="hint-inline">(Show to customers)</span>
        </div>

        <div class="roster-compact-list">
          <div *ngFor="let m of roster" class="roster-compact-item" [class.delivered]="m.delivery_status === 'delivered'">
            <div class="driver-item-info">
              <strong style="font-size: 13px;">{{ m.customer_name }}</strong>
              <span class="order-sub">📦 {{ m.quantity }} {{ activeDelivery.unit }}</span>
              <span class="cash-sub">Collect: <strong class="text-primary">₹{{ m.remaining_cod_due }}</strong></span>
              <span class="pin-badge">🔑 PIN: <strong>{{ m.pickup_pin }}</strong></span>
            </div>

            <div class="driver-item-actions">
              <span class="badge" [ngClass]="'badge-' + m.delivery_status">{{ m.delivery_status }}</span>
              <div *ngIf="m.delivery_status === 'pending'" style="display: flex; gap: 4px; margin-top: 4px;">
                <button class="btn btn-primary btn-xs" (click)="openPinModal(m)">
                  ✅ Verify PIN
                </button>
                <button class="btn btn-danger btn-xs" (click)="markNoShow(m)">
                  No-Show
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions-sm" style="margin-top: 10px;">
          <button class="btn btn-secondary btn-xs" (click)="activeDelivery = null">Close Sheet</button>
        </div>
      </div>
    </div>

    <!-- COMPACT 6-DIGIT VERIFICATION MODAL -->
    <div *ngIf="handshakeMember" class="modal-overlay">
      <div class="modal-content compact-modal text-center" style="max-width: 340px;">
        <h4 style="margin: 0 0 4px;">🔑 Verify PIN & Collect Cash</h4>
        <p class="modal-sub-text">Customer: {{ handshakeMember.customer_name }} · Cash: <strong>₹{{ handshakeMember.remaining_cod_due }}</strong></p>

        <div class="form-group" style="margin: 10px 0; text-align: left;">
          <label class="form-label" style="font-size: 11px;">Enter customer's 6-digit code (Expected: {{ handshakeMember.pickup_pin }}):</label>
          <input type="text" class="form-control pin-input-compact" maxlength="6" [(ngModel)]="inputPin" placeholder="e.g. 649120">
        </div>

        <div class="modal-actions-sm">
          <button class="btn btn-secondary btn-xs" (click)="handshakeMember = null">Cancel</button>
          <button class="btn btn-primary btn-xs" (click)="confirmHandshake()">Confirm Handover</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portal-header-sm { margin-bottom: 12px; }
    .portal-header-sm h2 { font-size: 18px; margin: 0; }
    .subtitle { font-size: 12px; color: var(--text-muted); }

    .compact-alert { padding: 6px 10px; font-size: 12px; margin-bottom: 8px; }

    .deliveries-grid-sm {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
    }
    .delivery-card-sm { padding: 10px 12px; }
    .card-head-sm { display: flex; justify-content: space-between; align-items: flex-start; }
    .hub-name { font-size: 14px; color: var(--dark); }
    .landmark-sub { font-size: 11px; color: var(--text-muted); margin: 2px 0 4px; }

    .farmer-chip-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      color: #1e40af;
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }
    .hint-inline { font-size: 10px; color: var(--text-muted); }

    .delivery-stats-compact {
      background: #f8fafc;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 4px 0;
    }

    .roster-compact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
      max-height: 350px;
      overflow-y: auto;
    }
    .roster-compact-item {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .roster-compact-item.delivered {
      opacity: 0.65;
      background: #f8fafc;
    }
    .driver-item-info {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-size: 12px;
    }
    .order-sub { color: var(--dark); }
    .cash-sub { color: var(--text-muted); }
    .pin-badge {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 11px;
    }
    .driver-item-actions { text-align: right; }

    .pin-input-compact {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 4px;
      text-align: center;
      height: 36px;
      padding: 4px;
    }

    .btn-xs { padding: 3px 8px; font-size: 11px; min-height: 26px; border-radius: 4px; }
    .compact-modal { max-width: 400px; padding: 14px; border-radius: 10px; }
    .modal-sub-text { font-size: 11px; color: var(--text-muted); margin: 0; }
    .modal-actions-sm { display: flex; justify-content: flex-end; gap: 6px; }
  `]
})
export class TransporterComponent implements OnInit {
  deliveries: any[] = [];
  statusMessage = '';
  activeDelivery: any = null;
  roster: any[] = [];
  handshakeMember: any = null;
  inputPin = '';

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.loadDeliveries();
  }

  loadDeliveries() {
    this.api.getTransporterDeliveries().subscribe({
      next: (res) => this.deliveries = res.deliveries || [],
      error: (err) => console.error(err)
    });
  }

  openRoster(d: any) {
    this.activeDelivery = d;
    this.api.getDeliveryRoster(d.id).subscribe({
      next: (res) => {
        this.roster = res.roster || [];
        this.activeDelivery = res.bucket || d;
      },
      error: (err) => alert(err.error?.error || 'Failed to fetch roster.')
    });
  }

  openPinModal(m: any) {
    this.handshakeMember = m;
    this.inputPin = '';
  }

  confirmHandshake() {
    if (!this.handshakeMember || !this.inputPin) {
      alert('Please enter the 6-digit customer verification code.');
      return;
    }
    this.api.completeHandshake(this.handshakeMember.member_id, this.inputPin).subscribe({
      next: (res) => {
        this.statusMessage = res.message;
        this.handshakeMember = null;
        if (this.activeDelivery) {
          this.openRoster(this.activeDelivery);
        }
        this.loadDeliveries();
      },
      error: (err) => alert(err.error?.error || 'Incorrect code.')
    });
  }

  markNoShow(m: any) {
    if (confirm(`Mark customer ${m.customer_name} as No-Show? This will freeze their account.`)) {
      this.api.markNoShow(m.member_id, 'Customer absent at pickup window.').subscribe({
        next: (res) => {
          this.statusMessage = res.message;
          if (this.activeDelivery) {
            this.openRoster(this.activeDelivery);
          }
        },
        error: (err) => alert(err.error?.error || 'Failed to mark no-show.')
      });
    }
  }
}
