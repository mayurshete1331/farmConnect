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
              placeholder="Enter your registered mobile number" 
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
            {{ loading ? 'Signing In...' : 'Sign In to FarmConnect' }}
          </button>

          <!-- Professional Security & Support Trust Footer -->
          <div class="auth-trust-footer">
            <span class="trust-shield">🔒 256-Bit Encrypted • Verified Farm Origin</span>
            <p class="help-link">Need help accessing your account? Contact your society coordinator.</p>
          </div>
        </form>

        <!-- REGISTRATION FORM -->
        <form *ngIf="mode === 'register'" (ngSubmit)="onRegister()">
          <!-- Role Selector -->
          <div class="form-group">
            <label class="form-label">I am registering as:</label>
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
            <label class="form-label">Mobile Number</label>
            <input type="tel" class="form-control" [(ngModel)]="regData.phone" name="phone" required placeholder="10-digit mobile number">
          </div>

          <div class="form-group">
            <label class="form-label">Create Password</label>
            <input type="password" class="form-control" [(ngModel)]="regData.password" name="password" required placeholder="Minimum 6 characters">
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
              <label class="form-label">UPI ID for Direct Payments</label>
              <input type="text" class="form-control" [(ngModel)]="regData.upi_id" name="upi_id" placeholder="e.g. rameshpatil@okaxis">
            </div>
          </div>

          <!-- TRANSPORTER SPECIFIC -->
          <div *ngIf="regData.role === 'transporter'" class="special-section">
            <h4 class="sec-title">🚚 Vehicle & Transport Details</h4>
            <div class="form-group">
              <label class="form-label">Vehicle Type</label>
              <select class="form-control" [(ngModel)]="regData.vehicle_type" name="vehicle_type">
                <option value="Bolero Maxi Truck">Bolero Maxi Truck (1.5 Ton)</option>
                <option value="Tata Ace / Chhota Hathi">Tata Ace / Chhota Hathi (750 kg)</option>
                <option value="Eicher Pro Truck">Eicher Pro Truck (3-5 Ton)</option>
                <option value="Tempo Traveller">Tempo Traveller Cargo</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Vehicle Registration Number</label>
              <input type="text" class="form-control" [(ngModel)]="regData.vehicle_number" name="vehicle_number" placeholder="e.g. MH 04 AB 1234">
            </div>
          </div>

          <div class="admin-notice">
            ℹ️ <strong>Account Verification:</strong> New registrations are reviewed by the platform administrator for quality and location compliance before activation.
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Submitting Application...' : 'Submit Registration' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .auth-card {
      max-width: 440px;
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      background: #ffffff;
      padding: 24px;
      border: 1px solid var(--border);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .brand .icon {
      font-size: 24px;
    }
    .brand h2 {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary);
      margin: 0;
    }
    .tagline {
      font-size: 12px;
      color: var(--text-muted);
      margin: 4px 0 0;
    }
    .mode-toggle {
      display: flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      margin-bottom: 20px;
    }
    .toggle-btn {
      flex: 1;
      padding: 8px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-muted);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: #ffffff;
      color: var(--dark);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .role-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .role-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 4px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .role-card input {
      display: none;
    }
    .role-icon {
      font-size: 20px;
    }
    .role-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--dark);
    }
    .role-card.selected {
      border-color: var(--primary);
      background: var(--primary-light);
    }
    .form-row {
      display: flex;
      gap: 8px;
    }
    .form-row .col {
      flex: 1;
    }
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
      font-size: 11.5px;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .auth-trust-footer {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
    }
    .trust-shield {
      font-size: 11px;
      font-weight: 600;
      color: #047857;
      background: #ecfdf5;
      padding: 3px 10px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .help-link {
      font-size: 11px;
      color: var(--text-muted);
      margin: 0;
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
