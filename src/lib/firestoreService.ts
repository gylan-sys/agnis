import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, FirestoreErrorInfo } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Mock Auth State for local migration
let currentUser: any = JSON.parse(localStorage.getItem('user') || 'null');

// Safe JSON parsing helper
async function safeJson(res: Response) {
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      currentUser = null;
      localStorage.removeItem('user');
    }
    try {
      const err = JSON.parse(text);
      throw new Error(err.error || `HTTP ${res.status}: ${res.statusText}`);
    } catch {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("rate exceeded")) throw new Error("Terlalu banyak permintaan. Silakan tunggu sebentar.");
      if (lowerText.includes("<!doctype") || lowerText.includes("<html")) {
        throw new Error(`Server Error (${res.status}): API mengembalikan HTML. Pastikan server/proxy terkonfigurasi dengan benar.`);
      }
      throw new Error(text.substring(0, 100) || `Error ${res.status}`);
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("<!doctype") || lowerText.includes("<html")) {
      throw new Error("Server mengembalikan halaman HTML (SPA fallback). Pastikan URL API benar.");
    }
    throw new Error("Respons server tidak valid (bukan JSON)");
  }
}

// Global API Fetch Helper
async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (currentUser?.token) {
    headers.set('Authorization', `Bearer ${currentUser.token}`);
  }
  
  try {
    return await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  } catch (e: any) {
    console.error(`Network error reaching ${url}:`, e);
    throw new Error(`Koneksi Gagal: Tidak dapat menghubungi server (${url}). Periksa koneksi internet atau status server.`);
  }
}

export const authService = {
  getCurrentUser() {
    return currentUser;
  },
  async login(credentials: { username: string, password: string }) {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    currentUser = await safeJson(res);
    localStorage.setItem('user', JSON.stringify(currentUser));
    if (currentUser.loginBackground) localStorage.setItem('lastLoginBg', currentUser.loginBackground);
    return currentUser;
  },
  async logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    localStorage.removeItem('user');
    window.location.assign('/'); // Use assign for cleaner redirect
  },
  async getProfile() {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) {
      if (res.status === 401) {
        currentUser = null;
        localStorage.removeItem('user');
      }
      return null;
    }
    const data = await safeJson(res);
    currentUser = { ...data, token: currentUser?.token }; // Keep token from login response
    localStorage.setItem('user', JSON.stringify(currentUser));
    if (data.loginBackground) localStorage.setItem('lastLoginBg', data.loginBackground);
    return currentUser;
  },
  async updateSettings(settings: { loginBackground?: string, appBackground?: string, displayName?: string }) {
    const res = await apiFetch('/api/auth/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      await safeJson(res); // Will throw appropriate error
    }
    return await this.getProfile();
  },
  onAuthStateChanged(callback: (user: any) => void) {
    callback(currentUser);
    return () => {};
  }
};

export const adminService = {
  async getUsers() {
    const res = await apiFetch('/api/admin/users');
    return await safeJson(res);
  },
  async saveUser(user: any) {
    const res = await apiFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return await safeJson(res);
  },
  async deleteUser(userId: string) {
    const res = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
    return await safeJson(res);
  }
};

function handleApiError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: currentUser?.id,
      email: currentUser?.email,
    },
    operationType,
    path
  };
  console.error('API Error: ', JSON.stringify(errInfo));
  throw new Error(message); // Throw simple message for UI
}

export const firestoreService = {
  // Household
  async getHouseholds() {
    try {
      const res = await apiFetch('/api/households');
      return await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.GET, 'households');
    }
  },

  async createHousehold(name: string) {
    try {
      const res = await apiFetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await safeJson(res);
      return data.id;
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'households');
    }
  },

  // Members
  subscribeMembers(householdId: string, callback: (members: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/members`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for members, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  },

  // Transactions
  subscribeTransactions(householdId: string, callback: (txs: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/transactions`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for transactions, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  },

  async addTransaction(householdId: string, data: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'transactions');
    }
  },

  async deleteTransaction(householdId: string, txId: string) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/transactions/${txId}`, { 
        method: 'DELETE',
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'transactions');
    }
  },

  // Budgets
  subscribeBudgets(householdId: string, period: string, callback: (budgets: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/budgets`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for budgets, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  },

  async addBudget(householdId: string, data: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'budgets');
    }
  },

  async deleteBudget(householdId: string, budgetId: string) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/budgets/${budgetId}`, { 
        method: 'DELETE',
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'budgets');
    }
  },

  // Bills
  subscribeBills(householdId: string, callback: (bills: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/bills`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for bills, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  },

  async addBill(householdId: string, data: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'bills');
    }
  },

  async updateBill(householdId: string, billId: string, updates: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, 'bills');
    }
  },

  async deleteBill(householdId: string, billId: string) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/bills/${billId}`, { 
        method: 'DELETE',
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'bills');
    }
  },

  // Planning
  subscribePlanning(householdId: string, period: string, callback: (items: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/planning`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for planning, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  },

  async addPlanningItem(householdId: string, data: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'planning');
    }
  },

  async updatePlanningItem(householdId: string, itemId: string, updates: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/planning/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, 'planning');
    }
  },

  async deletePlanningItem(householdId: string, itemId: string) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/planning/${itemId}`, { 
        method: 'DELETE',
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'planning');
    }
  },

  // Chat
  subscribeMessages(householdId: string, callback: (messages: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/messages`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for messages, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  },

  async sendMessage(householdId: string, content: string) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'messages');
    }
  },

  subscribeTyping(householdId: string, callback: (typingUsers: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/typing`);
        const data = await safeJson(res);
        if (Array.isArray(data)) {
          // Filter out current user's typing status
          const filtered = data.filter((t: any) => t.userId !== currentUser?.id);
          callback(filtered);
        } else {
          console.warn('Expected array for typing, got:', data);
        }
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  },

  async updateTypingStatus(householdId: string, isTyping: boolean) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping }),
      });
      await safeJson(res);
    } catch (e) { console.error(e); }
  },

  // Gallery
  subscribeGallery(householdId: string, callback: (items: any[]) => void) {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/households/${householdId}/gallery`);
        const data = await safeJson(res);
        if (Array.isArray(data)) callback(data);
        else console.warn('Expected array for gallery, got:', data);
      } catch (e) { console.error(e); }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  },

  async addGalleryItem(householdId: string, item: any) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'gallery');
    }
  },

  async deleteGalleryItem(householdId: string, itemId: string) {
    try {
      const res = await apiFetch(`/api/households/${householdId}/gallery/${itemId}`, { 
        method: 'DELETE',
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'gallery');
    }
  }
};
