import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, FirestoreErrorInfo } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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

export const authService = {
  getCurrentUser() {
    return currentUser;
  },
  async login(credentials: { username: string, password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    currentUser = await safeJson(res);
    localStorage.setItem('user', JSON.stringify(currentUser));
    if (currentUser.loginBackground) localStorage.setItem('lastLoginBg', currentUser.loginBackground);
    return currentUser;
  },
  async logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    localStorage.removeItem('user');
    window.location.assign('/'); // Use assign for cleaner redirect
  },
  async getProfile() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 401) {
        currentUser = null;
        localStorage.removeItem('user');
      }
      return null;
    }
    const data = await safeJson(res);
    currentUser = data;
    localStorage.setItem('user', JSON.stringify(data));
    if (data.loginBackground) localStorage.setItem('lastLoginBg', data.loginBackground);
    return data;
  },
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include'
      });
      
      currentUser = await safeJson(res);
      localStorage.setItem('user', JSON.stringify(currentUser));
      if (currentUser.loginBackground) localStorage.setItem('lastLoginBg', currentUser.loginBackground);
      return currentUser;
    } catch (e: any) {
      console.error("Google Auth Error:", e);
      throw e;
    }
  },
  async updateSettings(settings: { loginBackground?: string, appBackground?: string, displayName?: string }) {
    const res = await fetch('/api/auth/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      credentials: 'include'
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
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    return await safeJson(res);
  },
  async saveUser(user: any) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      credentials: 'include'
    });
    return await safeJson(res);
  },
  async deleteUser(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
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
      const res = await fetch('/api/households', { credentials: 'include' });
      return await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.GET, 'households');
    }
  },

  async createHousehold(name: string) {
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include'
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
        const res = await fetch(`/api/households/${householdId}/members`, { credentials: 'include' });
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
        const res = await fetch(`/api/households/${householdId}/transactions`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'transactions');
    }
  },

  async deleteTransaction(householdId: string, txId: string) {
    try {
      const res = await fetch(`/api/households/${householdId}/transactions/${txId}`, { 
        method: 'DELETE',
        credentials: 'include'
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
        const res = await fetch(`/api/households/${householdId}/budgets`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'budgets');
    }
  },

  async deleteBudget(householdId: string, budgetId: string) {
    try {
      const res = await fetch(`/api/households/${householdId}/budgets/${budgetId}`, { 
        method: 'DELETE',
        credentials: 'include'
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
        const res = await fetch(`/api/households/${householdId}/bills`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'bills');
    }
  },

  async updateBill(householdId: string, billId: string, updates: any) {
    try {
      const res = await fetch(`/api/households/${householdId}/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, 'bills');
    }
  },

  async deleteBill(householdId: string, billId: string) {
    try {
      const res = await fetch(`/api/households/${householdId}/bills/${billId}`, { 
        method: 'DELETE',
        credentials: 'include'
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
        const res = await fetch(`/api/households/${householdId}/planning`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'planning');
    }
  },

  async updatePlanningItem(householdId: string, itemId: string, updates: any) {
    try {
      const res = await fetch(`/api/households/${householdId}/planning/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, 'planning');
    }
  },

  async deletePlanningItem(householdId: string, itemId: string) {
    try {
      const res = await fetch(`/api/households/${householdId}/planning/${itemId}`, { 
        method: 'DELETE',
        credentials: 'include'
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
        const res = await fetch(`/api/households/${householdId}/messages`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'messages');
    }
  },

  subscribeTyping(householdId: string, callback: (typingUsers: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/typing`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping }),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) { console.error(e); }
  },

  // Gallery
  subscribeGallery(householdId: string, callback: (items: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/gallery`, { credentials: 'include' });
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
      const res = await fetch(`/api/households/${householdId}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'gallery');
    }
  },

  async deleteGalleryItem(householdId: string, itemId: string) {
    try {
      const res = await fetch(`/api/households/${householdId}/gallery/${itemId}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      await safeJson(res);
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'gallery');
    }
  }
};
