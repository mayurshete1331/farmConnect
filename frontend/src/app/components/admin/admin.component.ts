import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="portal-header">
      <div>
        <h2>🛡️ Super Admin Control Center</h2>
        <p class="subtitle">Platform Governance, Approvals, Delivery Pools & Risk Management</p>
      </div>
      <div class="overview-pills" *ngIf="overview">
        <span class="pill">Pending Approvals: <strong>{{ pendingUsers.length }}</strong></span>
        <span class="pill">Farmer Deposits: <strong>₹{{ overview.total_deposit_held || 0 }}</strong></span>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-bar">
      <button class="tab-btn" [class.active]="activeTab === 'approvals'" (click)="activeTab = 'approvals'">
        Approvals ({{ pendingUsers.length }})
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'pools'" (click)="activeTab = 'pools'; loadBuckets()">
        Delivery Pools & 6-Digit Codes
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'deposits'" (click)="activeTab = 'deposits'">
        Farmer Security Deposits
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'disputes'" (click)="activeTab = 'disputes'">
        Disputes & Complaints
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'users'" (click)="activeTab = 'users'">
        All Users & Blocklist
      </button>
      <button class="tab-btn" [class.active]="activeTab === 'settings'" (click)="activeTab = 'settings'">
        Settings
      </button>
    </div>

    <!-- Alert Banner -->
    <div *ngIf="statusMessage" class="alert alert-info">
      {{ statusMessage }}
    </div>

    <!-- TAB 1: ACCOUNT APPROVALS QUEUE -->
    <div *ngIf="activeTab === 'approvals'">
      <div class="section-intro">
        <h3>New Account Applications</h3>
        <p>Review candidate details and decide approval status before granting access.</p>
      </div>

      <div *ngIf="pendingUsers.length === 0" class="card empty-card">
        <p>🎉 All pending account applications have been processed!</p>
      </div>

      <div class="approvals-grid">
        <div *ngFor="let u of pendingUsers" class="card user-approval-card">
          <div class="card-top">
            <div class="applicant-meta">
              <h4>{{ u.name }}</h4>
              <span class="badge" [ngClass]="'badge-' + u.role">{{ u.role }}</span>
              <p class="phone">📞 {{ u.phone }}</p>
              <p class="meta-sub">📍 Pincode: {{ u.pincode }} | {{ u.address }}</p>
            </div>
          </div>

          <!-- Role Details -->
          <div *ngIf="u.role === 'farmer'" class="role-details">
            <p><strong>Farm:</strong> {{ u.farm_name }}</p>
            <p><strong>Location:</strong> {{ u.village }}, {{ u.district }} ({{ u.state }})</p>
            <p><strong>UPI ID:</strong> {{ u.upi_id }}</p>
          </div>

          <div *ngIf="u.role === 'transporter'" class="role-details">
            <p><strong>Vehicle:</strong> {{ u.vehicle_type }} ({{ u.vehicle_number }})</p>
            <p><strong>Operating Pincodes:</strong> {{ u.operating_pincodes }}</p>
          </div>

          <div class="approval-actions">
            <button class="btn btn-primary btn-sm" (click)="decide(u.id, 'approved')">
              ✅ Approve
            </button>
            <button class="btn btn-danger btn-sm" (click)="openRejectModal(u)">
              ❌ Reject
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: DELIVERY POOLS & 6-DIGIT VERIFICATION CODES (ADMIN OVERSIGHT) -->
    <div *ngIf="activeTab === 'pools'">
      <div class="section-intro">
        <h3>Society Delivery Pools & 6-Digit Verification Codes</h3>
        <p>Admin master view: validate 6-digit Farmer Dispatch Codes and individual 6-digit Customer Delivery Codes.</p>
      </div>

      <div *ngIf="adminBuckets.length === 0" class="card empty-card">
        <p>No active buckets found.</p>
      </div>

      <div *ngFor="let b of adminBuckets" class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 style="margin: 0; font-size: 16px;">{{ b.hub_name }} ({{ b.produce_name }})</h4>
            <p class="meta-sub" style="margin: 4px 0;">📍 {{ b.delivery_landmark }} | Farmer: <strong>{{ b.farmer_name }}</strong> ({{ b.farmer_phone }}) | Driver: <strong>{{ b.driver_name || 'Unassigned' }}</strong></p>
          </div>
          <span class="badge" [ngClass]="'badge-' + b.status">{{ b.status }}</span>
        </div>

        <div style="margin: 6px 0;">
          <span class="badge" style="background: #eff6ff; border: 1px solid #93c5fd; font-size: 11.5px; padding: 3px 8px; color: #1e40af; display: inline-flex; align-items: center; gap: 4px;">
            🚜 Farmer Verification Code: <strong style="font-size: 13px; letter-spacing: 1px; font-family: monospace;">{{ b.farmer_verification_code || '------' }}</strong>
          </span>
        </div>

        <div style="margin-top: 8px;">
          <h5 style="margin-bottom: 6px; font-size: 12px;">Customer Orders & 6-Digit Pickup Codes:</h5>
          <table class="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone (Admin)</th>
                <th>Quantity</th>
                <th>6-Digit Verification PIN</th>
                <th>Driver Cash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of getBucketMembers(b.id)">
                <td><strong>{{ m.customer_name }}</strong></td>
                <td>{{ m.customer_phone }}</td>
                <td>{{ m.quantity }} {{ b.unit }}</td>
                <td><span style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 4px; padding: 2px 6px; font-weight: 700; letter-spacing: 1px; font-size: 12px; font-family: monospace; color: #047857;">{{ m.pickup_pin }}</span></td>
                <td>₹{{ m.remaining_cod_due }}</td>
                <td><span class="badge" [ngClass]="'badge-' + m.delivery_status">{{ m.delivery_status }}</span></td>
              </tr>
              <tr *ngIf="getBucketMembers(b.id).length === 0">
                <td colspan="6" style="text-align: center; color: var(--text-muted);">No members joined yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: FARMER SECURITY DEPOSITS -->
    <div *ngIf="activeTab === 'deposits'">
      <div class="section-intro">
        <h3>Farmer Security Collateral Shield</h3>
        <p>Deposit ledger guaranteeing quality and exposure limits (10x deposit rule).</p>
      </div>

      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>Farmer Name</th>
              <th>Farm / Location</th>
              <th>Phone</th>
              <th>Current Deposit</th>
              <th>Max 10x Listing Limit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of deposits">
              <td><strong>{{ f.farmer_name }}</strong></td>
              <td>{{ f.farm_name }} ({{ f.village }}, {{ f.district }})</td>
              <td>{{ f.phone }}</td>
              <td><span class="deposit-amt">₹{{ f.security_deposit_balance }}</span></td>
              <td>₹{{ (f.security_deposit_balance * 10) | number }}</td>
              <td>
                <button class="btn btn-outline btn-xs" (click)="openDepositModal(f)">+ Record Top-Up / Deduction</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 4: DISPUTES -->
    <div *ngIf="activeTab === 'disputes'">
      <div class="section-intro">
        <h3>Customer Quality Disputes & Complaints</h3>
      </div>

      <div *ngIf="disputes.length === 0" class="card empty-card">
        <p>✨ No open quality disputes on record.</p>
      </div>

      <div *ngFor="let d of disputes" class="card dispute-card">
        <div class="dispute-header">
          <div>
            <h4>{{ d.hub_name }} - {{ d.issue_reported }}</h4>
            <p class="meta-sub">Farmer: <strong>{{ d.farmer_name }}</strong> | Customer: <strong>{{ d.customer_name }}</strong></p>
          </div>
          <span class="badge" [ngClass]="'badge-' + d.dispute_status">{{ d.dispute_status }}</span>
        </div>
        <p>Rating: ⭐ {{ d.rating }}/5 | "{{ d.review_comment }}"</p>

        <div *ngIf="d.dispute_status === 'pending_review'" class="dispute-actions">
          <input type="number" class="form-control refund-input" [(ngModel)]="d.tempRefundAmount" placeholder="Refund ₹">
          <button class="btn btn-primary btn-sm" (click)="resolveDispute(d, 'refund')">Deduct from Farmer Deposit</button>
          <button class="btn btn-secondary btn-sm" (click)="resolveDispute(d, 'reject')">Dismiss Dispute</button>
        </div>
      </div>
    </div>

    <!-- TAB 5: ALL USERS & BLOCKLIST -->
    <div *ngIf="activeTab === 'users'">
      <div class="section-intro">
        <h3>All Registered Users (Admin Phone Visibility)</h3>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Pincode</th>
              <th>Approval</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of allUsers" [class.row-blocked]="u.is_blocked">
              <td><strong>{{ u.name }}</strong></td>
              <td>{{ u.phone }}</td>
              <td><span class="badge" [ngClass]="'badge-' + u.role">{{ u.role }}</span></td>
              <td>{{ u.pincode }}</td>
              <td><span class="badge" [ngClass]="'badge-' + u.approval_status">{{ u.approval_status }}</span></td>
              <td>
                <span *ngIf="u.is_blocked" class="badge badge-danger">Blocked</span>
                <span *ngIf="!u.is_blocked" class="badge badge-approved">Active</span>
              </td>
              <td>
                <button class="btn btn-sm" [ngClass]="u.is_blocked ? 'btn-primary' : 'btn-danger'" (click)="toggleBlock(u.id)">
                  {{ u.is_blocked ? 'Unblock' : 'Block' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 6: SETTINGS -->
    <div *ngIf="activeTab === 'settings'">
      <div class="card form-card">
        <h3>Platform Policy Settings</h3>
        <div class="form-group" style="margin-top: 14px;">
          <label class="form-label">Platform Fee (₹)</label>
          <input type="number" class="form-control" [(ngModel)]="platformFee">
        </div>
        <div class="form-group">
          <label class="form-label">Default No-Show Penalty (₹)</label>
          <input type="number" class="form-control" [(ngModel)]="defaultPenalty">
        </div>
        <button class="btn btn-primary" (click)="saveSettings()">Save Settings</button>
      </div>
    </div>

    <!-- REJECT MODAL -->
    <div *ngIf="rejectingUser" class="modal-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <h3>Reject Account Application</h3>
        <p>Applicant: <strong>{{ rejectingUser.name }}</strong> ({{ rejectingUser.role }})</p>
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label">Reason for Rejection</label>
          <input type="text" class="form-control" [(ngModel)]="rejectionReason" placeholder="e.g. Invalid farm address">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
          <button class="btn btn-secondary" (click)="rejectingUser = null">Cancel</button>
          <button class="btn btn-danger" (click)="confirmReject()">Reject Application</button>
        </div>
      </div>
    </div>

    <!-- DEPOSIT TRANSACTION MODAL -->
    <div *ngIf="modalFarmer" class="modal-overlay">
      <div class="modal-content" style="max-width: 420px;">
        <h3>Record Farmer Deposit Transaction</h3>
        <p>Farmer: <strong>{{ modalFarmer.farmer_name }}</strong></p>
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label">Transaction Type</label>
          <select class="form-control" [(ngModel)]="depositForm.transaction_type">
            <option value="initial_deposit">Deposit Top-Up / Collateral Addition</option>
            <option value="penalty_deduction">Penalty / Dispute Quality Deduction</option>
            <option value="deposit_refund">Collateral Refund to Farmer</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹)</label>
          <input type="number" class="form-control" [(ngModel)]="depositForm.amount">
        </div>
        <div class="form-group">
          <label class="form-label">UPI Reference / UTR</label>
          <input type="text" class="form-control" [(ngModel)]="depositForm.upi_reference" placeholder="e.g. 408192837465">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
          <button class="btn btn-secondary" (click)="modalFarmer = null">Cancel</button>
          <button class="btn btn-primary" (click)="submitDepositRecord()">Save Deposit</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .overview-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pill {
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .approvals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
    }
    .user-approval-card { padding: 10px 12px; border-radius: 8px; }
    .applicant-meta h4 { margin: 0 0 2px; font-size: 14px; }
    .phone { font-weight: 700; color: var(--primary); margin: 2px 0; font-size: 12px; }
    .role-details {
      background: #f8fafc;
      padding: 6px 8px;
      border-radius: 6px;
      margin: 6px 0;
      font-size: 11px;
    }
    .role-details p { margin: 2px 0; }
    .approval-actions { display: flex; gap: 6px; margin-top: 8px; }
    .table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .table th, .table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); }
    .table th { background: #f8fafc; font-weight: 600; font-size: 11px; }
    .deposit-amt { font-weight: 700; color: var(--primary); font-size: 13px; }
    .dispute-card { border-left: 4px solid var(--danger); margin-bottom: 8px; padding: 10px 12px; }
    .dispute-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .dispute-actions { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
    .refund-input { max-width: 100px; height: 28px; font-size: 12px; padding: 4px; }
    .row-blocked { background: #fff1f2; }
    .btn-xs { font-size: 11px; padding: 2px 6px; min-height: 24px; border-radius: 4px; }
  `]
})
export class AdminComponent implements OnInit {
  activeTab = 'approvals';
  overview: any = null;
  pendingUsers: any[] = [];
  adminBuckets: any[] = [];
  adminBucketMembers: any[] = [];
  disputes: any[] = [];
  deposits: any[] = [];
  allUsers: any[] = [];
  statusMessage = '';

  platformFee = 0;
  defaultPenalty = 150;

  rejectingUser: any = null;
  rejectionReason = '';

  modalFarmer: any = null;
  depositForm = {
    transaction_type: 'initial_deposit',
    amount: 1000,
    upi_reference: ''
  };

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.getAdminOverview().subscribe(res => this.overview = res);
    this.api.getApprovals('pending').subscribe(res => this.pendingUsers = res.users || []);
    this.api.getDisputes().subscribe(res => this.disputes = res.disputes || []);
    this.api.getAdminDeposits().subscribe(res => this.deposits = res.deposits || []);
    this.api.getAllUsers().subscribe(res => this.allUsers = res.users || []);
    this.api.getSettings().subscribe(res => {
      if (res.settings) {
        this.platformFee = parseFloat(res.settings.platform_fee_fixed || '0');
        this.defaultPenalty = parseFloat(res.settings.default_penalty_amount || '150');
      }
    });
    this.loadBuckets();
  }

  loadBuckets() {
    this.api.getAdminBuckets().subscribe(res => {
      this.adminBuckets = res.buckets || [];
      this.adminBucketMembers = res.members || [];
    });
  }

  getBucketMembers(bucketId: number) {
    return this.adminBucketMembers.filter(m => m.bucket_id === bucketId);
  }

  decide(userId: number, decision: 'approved' | 'rejected', reason?: string) {
    this.api.decideApproval(userId, decision, reason).subscribe({
      next: (res) => {
        this.statusMessage = res.message;
        this.loadData();
      }
    });
  }

  openRejectModal(user: any) {
    this.rejectingUser = user;
    this.rejectionReason = '';
  }

  confirmReject() {
    if (!this.rejectingUser) return;
    this.decide(this.rejectingUser.id, 'rejected', this.rejectionReason);
    this.rejectingUser = null;
  }

  resolveDispute(d: any, action: 'refund' | 'reject') {
    const refundAmt = d.tempRefundAmount || 0;
    this.api.resolveDispute(d.id, { action, refund_amount: refundAmt, block_farmer: false }).subscribe({
      next: (res) => {
        this.statusMessage = res.message;
        this.loadData();
      }
    });
  }

  toggleBlock(userId: number) {
    this.api.toggleBlockUser(userId).subscribe(res => {
      this.statusMessage = res.message;
      this.loadData();
    });
  }

  openDepositModal(farmer: any) {
    this.modalFarmer = farmer;
    this.depositForm = {
      transaction_type: 'initial_deposit',
      amount: 1000,
      upi_reference: ''
    };
  }

  submitDepositRecord() {
    if (!this.modalFarmer) return;
    this.api.recordDeposit({
      farmer_id: this.modalFarmer.user_id,
      ...this.depositForm
    }).subscribe(res => {
      this.statusMessage = res.message;
      this.modalFarmer = null;
      this.loadData();
    });
  }

  saveSettings() {
    this.api.updateSettings({
      platform_fee_fixed: this.platformFee,
      default_penalty_amount: this.defaultPenalty
    }).subscribe(res => {
      this.statusMessage = 'Settings updated successfully.';
    });
  }
}
