import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrap">
      <div class="card auth-card">
        <div class="auth-header">
          <div class="brand">
            <span class="icon">🌾</span>
            <h2>FarmConnect India</h2>
          </div>
          <p class="tagline">Direct Farm-to-Consumer Group Buying</p>
        </div>

        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button 
            type="button" 
            class="toggle-btn" 
            [class.active]="mode === 'login'"
            (click)="setMode('login')">
            Sign In
          </button>
          <button 
            type="button" 
            class="toggle-btn" 
            [class.active]="mode === 'register'"
            (click)="setMode('register')">
            Create Account
          </button>
        </div>

        <!-- Alerts -->
        <div *ngIf="errorMessage" class="alert alert-danger">
          ⚠️ {{ errorMessage }}
        </div>
        <div *ngIf="successMessage" class="alert alert-info">
          ✅ {{ successMessage }}
        </div>

        <!-- LOGIN FORM -->
        <form *ngIf="mode === 'login'" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input 
              type="tel" 
              class="form-control" 
              placeholder="e.g. 9876543210" 
              [(ngModel)]="loginPhone" 
              name="phone" 
              required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input 
              type="password" 
              class="form-control" 
              placeholder="Enter your password" 
              [(ngModel)]="loginPassword" 
              name="password" 
              required>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Signing In...' : 'Sign In' }}
          </button>

          <!-- Quick Test Logins -->
          <div class="demo-logins">
            <p class="demo-title">Quick Demo Login (Password: password123):</p>
            <div class="demo-buttons">
              <button type="button" class="btn btn-sm btn-outline" (click)="quickFill('9999999999')">🛡️ Admin</button>
              <button type="button" class="btn btn-sm btn-outline" (click)="quickFill('9876543210')">👨‍🌾 Farmer</button>
              <button type="button" class="btn btn-sm btn-outline" (click)="quickFill('9123456780')">🚚 Driver</button>
              <button type="button" class="btn btn-sm btn-outline" (click)="quickFill('9811122233')">🛒 Customer</button>
            </div>
          </div>
        </form>

        <!-- REGISTRATION FORM -->
        <form *ngIf="mode === 'register'" (ngSubmit)="onRegister()">
          <!-- Role Selector -->
          <div class="form-group">
            <label class="form-label">I am a:</label>
            <div class="role-grid">
              <label class="role-card" [class.selected]="regData.role === 'consumer'">
                <input type="radio" [(ngModel)]="regData.role" name="role" value="consumer">
                <span class="role-icon">🛒</span>
                <span class="role-name">Customer</span>
              </label>

              <label class="role-card" [class.selected]="regData.role === 'farmer'">
                <input type="radio" [(ngModel)]="regData.role" name="role" value="farmer">
                <span class="role-icon">👨‍🌾</span>
                <span class="role-name">Farmer</span>
              </label>

              <label class="role-card" [class.selected]="regData.role === 'transporter'">
                <input type="radio" [(ngModel)]="regData.role" name="role" value="transporter">
                <span class="role-icon">🚚</span>
                <span class="role-name">Driver</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-control" [(ngModel)]="regData.name" name="name" required placeholder="e.g. Ramesh Patil">
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" class="form-control" [(ngModel)]="regData.phone" name="phone" required placeholder="e.g. 9876543210">
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" [(ngModel)]="regData.password" name="password" required placeholder="Create password">
          </div>

          <div class="form-group">
            <label class="form-label">Pincode</label>
            <input type="text" class="form-control" [(ngModel)]="regData.pincode" name="pincode" required placeholder="e.g. 400063">
          </div>

          <div class="form-group">
            <label class="form-label">Address / Landmark</label>
            <input type="text" class="form-control" [(ngModel)]="regData.address" name="address" placeholder="e.g. Flat 402, Gokuldham, Goregaon East">
          </div>

          <!-- FARMER SPECIFIC -->
          <div *ngIf="regData.role === 'farmer'" class="special-section">
            <h4 class="sec-title">🌾 Farm Details</h4>
            <div class="form-group">
              <label class="form-label">Farm / Orchard Name</label>
              <input type="text" class="form-control" [(ngModel)]="regData.farm_name" name="farm_name" placeholder="e.g. Patil Mango Orchards">
            </div>
            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">Village</label>
                <input type="text" class="form-control" [(ngModel)]="regData.village" name="village" placeholder="e.g. Pawas">
              </div>
              <div class="form-group col">
                <label class="form-label">District</label>
                <input type="text" class="form-control" [(ngModel)]="regData.district" name="district" placeholder="e.g. Ratnagiri">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">UPI ID (For Advance Transfers)</label>
              <input type="text" class="form-control" [(ngModel)]="regData.upi_id" name="upi_id" placeholder="e.g. patilfarm@upi">
            </div>
          </div>

          <!-- TRANSPORTER SPECIFIC -->
          <div *ngIf="regData.role === 'transporter'" class="special-section">
            <h4 class="sec-title">🚚 Vehicle Details</h4>
            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">Vehicle Type</label>
                <input type="text" class="form-control" [(ngModel)]="regData.vehicle_type" name="vehicle_type" placeholder="e.g. Bolero Maxi Truck">
              </div>
              <div class="form-group col">
                <label class="form-label">Vehicle No.</label>
                <input type="text" class="form-control" [(ngModel)]="regData.vehicle_number" name="vehicle_number" placeholder="e.g. MH-08-AG-4021">
              </div>
            </div>
          </div>

          <div class="admin-notice">
            🛡️ <strong>Admin Gatekeeper:</strong> Accounts are reviewed and approved by the Super Admin before activation.
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Submitting...' : 'Register Account' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 120px);
      padding: 20px 0;
    }
    .auth-card {
      max-width: 440px;
      width: 100%;
      border-radius: 16px;
      padding: 24px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 18px;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--primary);
    }
    .tagline {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 2px;
    }
    .mode-toggle {
      display: flex;
      background: #f1f5f9;
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 16px;
    }
    .toggle-btn {
      flex: 1;
      padding: 8px;
      border: none;
      background: none;
      border-radius: 8px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: #fff;
      color: var(--primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .role-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .role-card {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 6px;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .role-card input { display: none; }
    .role-card.selected {
      border-color: var(--primary);
      background: var(--primary-light);
    }
    .role-icon { font-size: 22px; }
    .role-name { font-size: 13px; font-weight: 700; }
    .form-row {
      display: flex;
      gap: 10px;
    }
    .form-row .col { flex: 1; }
    .special-section {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 14px;
    }
    .sec-title {
      font-size: 13px;
      margin-bottom: 10px;
      color: var(--dark);
    }
    .admin-notice {
      background: #fefce8;
      border: 1px solid #fef08a;
      color: #854d0e;
      font-size: 12px;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .demo-logins {
      margin-top: 20px;
      border-top: 1px solid var(--border);
      padding-top: 12px;
      text-align: center;
    }
    .demo-title {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .demo-buttons {
      display: flex;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
    }
  `]
})
export class AuthComponent {
  mode: 'login' | 'register' = 'login';
  loading = false;
  errorMessage = '';
  successMessage = '';

  loginPhone = '';
  loginPassword = '';

  regData = {
    role: 'consumer',
    name: '',
    phone: '',
    password: '',
    pincode: '',
    address: '',
    farm_name: '',
    village: '',
    district: '',
    state: 'Maharashtra',
    upi_id: '',
    vehicle_type: 'Bolero Maxi Truck',
    vehicle_number: ''
  };

  constructor(private api: ApiService) {}

  setMode(m: 'login' | 'register') {
    this.mode = m;
    this.errorMessage = '';
    this.successMessage = '';
  }

  quickFill(phone: string) {
    this.loginPhone = phone;
    this.loginPassword = 'password123';
    this.onLogin();
  }

  onLogin() {
    if (!this.loginPhone || !this.loginPassword) {
      this.errorMessage = 'Please enter phone and password.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.api.login(this.loginPhone, this.loginPassword).subscribe({
      next: (res) => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Invalid credentials or login failed.';
      }
    });
  }

  onRegister() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.register(this.regData).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = 'Registration submitted! Please wait for Admin approval.';
        this.mode = 'login';
        this.loginPhone = this.regData.phone;
        this.loginPassword = this.regData.password;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Registration failed.';
      }
    });
  }
}
