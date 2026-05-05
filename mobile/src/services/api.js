import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  async getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
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
  async createPaymentSheet(stakeAmount) {
    const raw = await this.request('POST', '/api/payments/create-payment-sheet', { amount: stakeAmount });
    return {
      paymentIntentClientSecret: raw.paymentIntent || raw.client_secret,
      ephemeralKey: raw.ephemeralKey,
      customer: raw.customer,
      publishableKey: raw.publishableKey,
      paymentIntentId: raw.payment_intent_id,
      paymentIntent: raw.paymentIntent || raw.client_secret,
      payment_intent_id: raw.payment_intent_id,
      amount: raw.amount,
    };
  }
  async createPaymentIntent(stakeAmount) {
    return this.request('POST', '/api/payments/create-intent', { amount: stakeAmount });
  }
  async getPaymentHistory() { return this.request('GET', '/api/payments/history'); }

  // Pro subscription
  async subscribe() { return this.request('POST', '/api/payments/subscribe'); }
  async cancelSubscription() { return this.request('POST', '/api/payments/cancel-subscription'); }

  // User
  async getProfile() { return this.request('GET', '/api/users/me'); }
  async updateProfile(data) { return this.request('PATCH', '/api/users/me', data); }
  async getStats() { return this.request('GET', '/api/users/me/stats'); }
  async checkUsername(username) { return this.request('GET', `/api/users/check-username/${username}`); }

  // Groups
  async getMyGroups() { return this.request('GET', '/api/groups'); }
  async createGroup(data) { return this.request('POST', '/api/groups', data); }
  async joinGroup(invite_code) { return this.request('POST', '/api/groups/join', { invite_code }); }
  async getGroup(id) { return this.request('GET', `/api/groups/${id}`); }
  async getGroupFeed(id) { return this.request('GET', `/api/groups/${id}/feed`); }
  async leaveGroup(id) { return this.request('DELETE', `/api/groups/${id}/leave`); }
  async deleteGroup(id) { return this.request('DELETE', `/api/groups/${id}`); }
  async removeMember(groupId, userId) { return this.request('DELETE', `/api/groups/${groupId}/members/${userId}`); }
  async transferAdmin(groupId, newAdminUserId) {
    return this.request('POST', `/api/groups/${groupId}/transfer-admin`, { new_admin_user_id: newAdminUserId });
  }

  // Challenges
  async getGroupChallenges(groupId) { return this.request('GET', `/api/challenges/group/${groupId}`); }
  async getChallenge(id) { return this.request('GET', `/api/challenges/${id}`); }
  async createChallenge(data) { return this.request('POST', '/api/challenges', data); }
  async joinChallengeWithStake(challengeId, data) {
    return this.request('POST', `/api/challenges/${challengeId}/join`, data);
  }
}

export const api = new ApiService();
