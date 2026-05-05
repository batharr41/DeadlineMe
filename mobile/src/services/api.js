import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  async getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
    };
  }

  async request(method, endpoint, body = null) {
    const headers = await this.getHeaders();
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, config);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }
    return response.json();
  }

  // Stakes
  async createStake(data) {
    return this.request('POST', '/api/stakes', data);
  }

  async getMyStakes() {
    return this.request('GET', '/api/stakes');
  }

  async getStake(id) {
    return this.request('GET', `/api/stakes/${id}`);
  }

  async submitProof(stakeId, formData) {
    const headers = await this.getHeaders();
    delete headers['Content-Type'];
    const response = await fetch(`${API_URL}/api/stakes/${stakeId}/proof`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to submit proof');
    return response.json();
  }

  // Payments
  async createPaymentIntent(stakeAmount) {
    return this.request('POST', '/api/payments/create-intent', {
      amount: stakeAmount,
    });
  }

  async createPaymentSheet(stakeAmount) {
    const data = await this.request('POST', '/api/payments/create-payment-sheet', {
      amount: stakeAmount,
    });
    // Normalize — return a consistent paymentIntentClientSecret field
    return {
      ...data,
      paymentIntentClientSecret: data.paymentIntent || data.client_secret,
    };
  }

  async getPaymentHistory() {
    return this.request('GET', '/api/payments/history');
  }

  // Pro subscription
  async subscribe() {
    return this.request('POST', '/api/payments/subscribe');
  }

  async cancelSubscription() {
    return this.request('POST', '/api/payments/cancel-subscription');
  }

  // User
  async getProfile() {
    return this.request('GET', '/api/users/me');
  }

  async updateProfile(data) {
    return this.request('PATCH', '/api/users/me', data);
  }

  async getStats() {
    return this.request('GET', '/api/users/me/stats');
  }
}

export const api = new ApiService();
