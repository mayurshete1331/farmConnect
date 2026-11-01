import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, User } from './services/api.service';
import { AuthComponent } from './components/auth/auth.component';
import { AdminComponent } from './components/admin/admin.component';
import { FarmerComponent } from './components/farmer/farmer.component';
import { ConsumerComponent } from './components/consumer/consumer.component';
import { TransporterComponent } from './components/transporter/transporter.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AuthComponent,
    AdminComponent,
    FarmerComponent,
    ConsumerComponent,
    TransporterComponent
  ],
  template: `
    <!-- Top Navbar -->
    <header class="navbar">
      <div class="nav-content">
        <a class="logo-area" href="/">
          <span>🌾</span>
          <span>FarmConnect</span>
          <span class="logo-badge">Direct F2C</span>
        </a>

        <!-- User Profile & Session Header -->
        <div *ngIf="user" class="user-badge">
          <img [src]="api.getPhotoUrl(user.profile_photo_url)" class="user-avatar" alt="Avatar">
          <div class="user-meta hide-mobile">
            <span class="user-name">{{ user.name }}</span>
            <span class="badge" [ngClass]="'badge-' + user.role">{{ user.role }}</span>
          </div>
          <button class="btn btn-outline btn-sm" (click)="onLogout()">Logout</button>
        </div>
      </div>
    </header>

    <main class="app-container">
      <!-- 1. NOT LOGGED IN: SHOW AUTH SCREEN -->
      <app-auth *ngIf="!user"></app-auth>

      <!-- 2. LOGGED IN BUT BLOCKED DUE TO PENALTY / VIOLATION -->
      <div *ngIf="user && user.is_blocked" class="card blocked-card">
        <div class="text-center">
          <span class="warn-icon">🚫</span>
          <h2>Account Temporarily Frozen</h2>
          <p class="meta-sub" style="margin-top: 8px;">
            Your account has been blocked due to a delivery no-show or pending penalty.
          </p>
          <div class="penalty-tag" *ngIf="user.penalty_due > 0">
            Penalty Due: <strong>₹{{ user.penalty_due }}</strong>
          </div>
          <p class="meta-sub" style="margin-top: 14px;">
            Please contact the Super Admin or settle the fine at the community office to unblock your account.
          </p>
        </div>
      </div>

      <!-- 3. LOGGED IN BUT PENDING ADMIN APPROVAL (User Request Requirement!) -->
      <div *ngIf="user && !user.is_blocked && user.approval_status === 'pending' && user.role !== 'admin'" class="card pending-card">
        <div class="text-center">
          <span class="warn-icon">⏳</span>
          <h2>Awaiting Super Admin Approval</h2>
          <p class="applicant-lead">
            Welcome, <strong>{{ user.name }}</strong>! Your <strong>{{ user.role }}</strong> account has been created and submitted to the Admin Gatekeeper queue.
          </p>
          <div class="approval-info-box">
            <p>🛡️ <strong>Why is my account pending?</strong></p>
            <p class="meta-sub">
              FarmConnect manually screens all farmers, transporters, and buyers to eliminate ghost orders, guarantee fresh harvest quality, and protect community members.
            </p>
            <div class="applicant-preview">
              <img [src]="api.getPhotoUrl(user.profile_photo_url)" class="applicant-avatar">
              <p>Registered Phone: <strong>{{ user.phone }}</strong> (Admin-Only)</p>
              <p>Area Pincode: <strong>{{ user.pincode }}</strong></p>
            </div>
          </div>
          <p class="meta-sub" style="margin-top: 16px;">
            The Admin will verify your details and approve your account shortly.
          </p>
          <button class="btn btn-outline btn-sm" style="margin-top: 12px;" (click)="refreshProfile()">
            🔄 Check Approval Status
          </button>
        </div>
      </div>

      <!-- 4. LOGGED IN BUT REJECTED BY ADMIN -->
      <div *ngIf="user && !user.is_blocked && user.approval_status === 'rejected' && user.role !== 'admin'" class="card blocked-card">
        <div class="text-center">
          <span class="warn-icon">❌</span>
          <h2>Application Rejected by Admin</h2>
          <p class="meta-sub" style="margin-top: 8px;">
            Your account application could not be approved at this time.
          </p>
          <div *ngIf="user.rejection_reason" class="penalty-tag" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
            Reason: {{ user.rejection_reason }}
          </div>
        </div>
      </div>

      <!-- 5. APPROVED & ACTIVE: RENDER SPECIFIC PORTAL -->
      <div *ngIf="user && !user.is_blocked && (user.approval_status === 'approved' || user.role === 'admin')" style="margin-top: 20px;">
        <app-admin *ngIf="user.role === 'admin'"></app-admin>
        <app-farmer *ngIf="user.role === 'farmer'"></app-farmer>
        <app-consumer *ngIf="user.role === 'consumer'"></app-consumer>
        <app-transporter *ngIf="user.role === 'transporter'"></app-transporter>
      </div>
    </main>
  `,
  styles: [`
    .user-meta { display: flex; flex-direction: column; text-align: right; }
    .user-name { font-size: 13px; font-weight: 700; }
    .blocked-card, .pending-card {
      max-width: 540px;
      margin: 40px auto;
      padding: 36px 24px;
      border-radius: 20px;
    }
    .warn-icon { font-size: 52px; display: block; margin-bottom: 12px; }
    .penalty-tag {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 8px 16px;
      border-radius: 8px;
      display: inline-block;
      margin-top: 14px;
      font-size: 14px;
    }
    .approval-info-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 16px;
      margin: 18px 0;
      text-align: left;
    }
    .applicant-lead { font-size: 14px; color: var(--text-muted); margin-top: 8px; }
    .applicant-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 12px;
      gap: 4px;
      font-size: 12px;
    }
    .applicant-avatar {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 3px solid var(--primary);
      object-fit: cover;
      margin-bottom: 6px;
    }
    @media (max-width: 600px) {
      .hide-mobile { display: none; }
    }
  `]
})
export class AppComponent implements OnInit {
  user: User | null = null;

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.api.currentUser$.subscribe(u => {
      this.user = u;
    });

    if (this.api.getToken()) {
      this.refreshProfile();
    }
  }

  refreshProfile() {
    this.api.getProfile().subscribe({
      next: (res) => {},
      error: () => this.api.logout()
    });
  }

  onLogout() {
    this.api.logout();
  }
}
