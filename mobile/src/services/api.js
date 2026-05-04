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
  async createStake(data) { return this.request('POST', '/api/stakes', data); }
  async getMyStakes() { return this.request('GET', '/api/stakes'); }
  async getStake(id) { return this.request('GET', `/api/stakes/${id}`); }
  async cancelStake(id) { return this.request('POST', `/api/stakes/${id}/cancel`); }
  async submitProof(stakeId, formData) {
    const headers = await this.getHeaders();
    delete headers['Content-Type'];
    const response = await fetch(`${API_URL}/api/stakes/${stakeId}/proof`, {
      method: 'POST', headers, body: formData,
    });
    if (!response.ok) throw new Error('Failed to submit proof');
    return response.json();
  }

  // Payments
  // createPaymentSheet normalizes the backend response so Stripe SDK always gets
  // paymentIntentClientSecret regardless of which field name the backend uses
  async createPaymentSheet(stakeAmount) {
    const raw = await this.request('POST', '/api/payments/create-payment-sheet', { amount: stakeAmount });
    // Backend returns { paymentIntent, ephemeralKey, customer, publishableKey, payment_intent_id, amount }
    // Stripe SDK needs paymentIntentClientSecret
    return {
      paymentIntentClientSecret: raw.paymentIntent || raw.client_secret,
      ephemeralKey: raw.ephemeralKey,
      customer: raw.customer,
      publishableKey: raw.publishableKey,
      paymentIntentId: raw.payment_intent_id,
      amount: raw.amount,
    };
  }

  // Legacy — returns { client_secret, payment_intent_id, amount }
  async createPaymentIntent(stakeAmount) {
    return this.request('POST', '/api/payments/create-intent', { amount: stakeAmount });
  }

  async getPaymentHistory() { return this.request('GET', '/api/payments/history'); }

  // User
  async getProfile() { return this.request('GET', '/api/users/me'); }
  async updateProfile(data) { return this.request('PATCH', '/api/users/me', data); }
  async getStats() { return this.request('GET', '/api/users/me/stats'); }

  // Groups
  async getMyGroups() { return this.request('GET', '/api/groups'); }
  async createGroup(data) { return this.request('POST', '/api/groups', data); }
  async joinGroup(invite_code) { return this.request('POST', '/api/groups/join', { invite_code }); }
  async getGroup(id) { return this.request('GET', `/api/groups/${id}`); }
  async getGroupFeed(id) { return this.request('GET', `/api/groups/${id}/feed`); }
  async leaveGroup(id) { return this.request('DELETE', `/api/groups/${id}/leave`); }

  // Challenges
  async getGroupChallenges(groupId) { return this.request('GET', `/api/challenges/group/${groupId}`); }
  async getChallenge(id) { return this.request('GET', `/api/challenges/${id}`); }
  async createChallenge(data) { return this.request('POST', '/api/challenges', data); }
  async joinChallengeWithStake(challengeId, data) {
    return this.request('POST', `/api/challenges/${challengeId}/join`, data);
  }
}

export const api = new ApiService();
