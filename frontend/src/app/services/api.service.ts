import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: number;
  name: string;
  phone: string;
  role: 'consumer' | 'farmer' | 'transporter' | 'admin';
  pincode: string;
  address?: string;
  profile_photo_url: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_blocked: boolean;
  penalty_due: number;
  strikes_count?: number;
  // Farmer specific
  farm_name?: string;
  village?: string;
  district?: string;
  state?: string;
  upi_id?: string;
  security_deposit_balance?: number;
  deposit_status?: string;
  // Transporter specific
  vehicle_type?: string;
  vehicle_number?: string;
  operating_pincodes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private getApiUrl(): string {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes(':4200')) {
        return 'http://127.0.0.1:5000/api';
      }
      return origin + '/api';
    }
    return 'http://127.0.0.1:5000/api';
  }

  private apiUrl = this.getApiUrl();
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  constructor(private http: HttpClient) {}

  private getStoredUser(): User | null {
    const data = localStorage.getItem('fc_user');
    return data ? JSON.parse(data) : null;
  }

  public getToken(): string | null {
    return localStorage.getItem('fc_token');
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  public getPhotoUrl(path: string | undefined | null): string {
    if (!path) return 'assets/default-avatar.png';
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    if (typeof window !== 'undefined') {
      if (window.location.origin.includes(':4200')) {
        return 'http://127.0.0.1:5000' + path;
      }
      return window.location.origin + path;
    }
    return 'http://127.0.0.1:5000' + path;
  }

  // AUTH
  login(phone: string, password: string):Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { phone, password }).pipe(
      tap(res => {
        if (res.token && res.user) {
          localStorage.setItem('fc_token', res.token);
          localStorage.setItem('fc_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData);
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`, { headers: this.getHeaders() }).pipe(
      tap(res => {
        if (res.user) {
          localStorage.setItem('fc_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    this.currentUserSubject.next(null);
  }

  // ADMIN
  getApprovals(status = 'pending'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/approvals?status=${status}`, { headers: this.getHeaders() });
  }

  decideApproval(userId: number, decision: 'approved' | 'rejected', rejection_reason?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/approvals/${userId}/decide`, { decision, rejection_reason }, { headers: this.getHeaders() });
  }

  getAdminOverview(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/overview`, { headers: this.getHeaders() });
  }

  getAllUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users`, { headers: this.getHeaders() });
  }

  toggleBlockUser(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/users/${userId}/toggle-block`, {}, { headers: this.getHeaders() });
  }

  setPenalty(userId: number, penalty_amount: number, action: 'set' | 'clear'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/users/${userId}/penalty`, { penalty_amount, action }, { headers: this.getHeaders() });
  }

  getAdminDeposits(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/deposits`, { headers: this.getHeaders() });
  }

  recordDeposit(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/deposits/record`, data, { headers: this.getHeaders() });
  }

  getDisputes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/disputes`, { headers: this.getHeaders() });
  }

  resolveDispute(id: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/disputes/${id}/resolve`, data, { headers: this.getHeaders() });
  }

  getSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/settings`, { headers: this.getHeaders() });
  }

  getAdminBuckets(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/buckets`, { headers: this.getHeaders() });
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/settings`, { settings }, { headers: this.getHeaders() });
  }

  // FARMER
  getFarmerWallet(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/farmer/wallet`, { headers: this.getHeaders() });
  }

  createListing(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/farmer/listings`, data, { headers: this.getHeaders() });
  }

  getFarmerListings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/farmer/listings`, { headers: this.getHeaders() });
  }

  getFarmerBuckets(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/farmer/buckets`, { headers: this.getHeaders() });
  }

  getBucketMembers(bucketId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/farmer/buckets/${bucketId}/members`, { headers: this.getHeaders() });
  }

  farmerBucketAction(bucketId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/farmer/buckets/${bucketId}/action`, data, { headers: this.getHeaders() });
  }

  getDrivers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/farmer/drivers`, { headers: this.getHeaders() });
  }

  fileFarmerComplaint(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/farmer/complaints`, data, { headers: this.getHeaders() });
  }

  getFarmerReviews(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/farmer/reviews`, { headers: this.getHeaders() });
  }

  // CONSUMER
  explore(pincode?: string, search?: string): Observable<any> {
    const params: string[] = [];
    if (pincode) params.push(`pincode=${encodeURIComponent(pincode)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<any>(`${this.apiUrl}/consumer/explore${q}`, { headers: this.getHeaders() });
  }

  createBucket(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consumer/buckets`, data, { headers: this.getHeaders() });
  }

  joinBucket(bucketId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consumer/buckets/${bucketId}/join`, data, { headers: this.getHeaders() });
  }

  submitAdvanceUtr(memberId: number, upi_utr: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consumer/orders/${memberId}/advance-utr`, { upi_utr }, { headers: this.getHeaders() });
  }

  getConsumerOrders(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consumer/orders`, { headers: this.getHeaders() });
  }

  submitConsumerReview(memberId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consumer/orders/${memberId}/review`, data, { headers: this.getHeaders() });
  }

  getFarmerReviewsForConsumer(farmerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consumer/farmers/${farmerId}/reviews`, { headers: this.getHeaders() });
  }

  getCommunityReviews(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consumer/reviews`, { headers: this.getHeaders() });
  }

  // TRANSPORTER
  getTransporterDeliveries(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/transporter/deliveries`, { headers: this.getHeaders() });
  }

  getDeliveryRoster(bucketId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/transporter/deliveries/${bucketId}/roster`, { headers: this.getHeaders() });
  }

  completeHandshake(memberId: number, pickup_pin: string, cash_collected?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transporter/deliveries/${memberId}/handshake`, { pickup_pin, cash_collected }, { headers: this.getHeaders() });
  }

  markNoShow(memberId: number, notes?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transporter/deliveries/${memberId}/no-show`, { notes }, { headers: this.getHeaders() });
  }
}
