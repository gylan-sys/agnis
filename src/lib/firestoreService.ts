import { OperationType, FirestoreErrorInfo } from '../types';

// Mock Auth State for local migration
let currentUser: any = JSON.parse(localStorage.getItem('user') || 'null');

export const authService = {
  getCurrentUser() {
    return currentUser;
  },
  async login(credentials: { username: string, password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login gagal');
    }
    currentUser = await res.json();
    localStorage.setItem('user', JSON.stringify(currentUser));
    return currentUser;
  },
  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    localStorage.removeItem('user');
    window.location.reload();
  },
  async getProfile() {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    currentUser = data;
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },
  async updateSettings(settings: { loginBackground?: string, appBackground?: string, displayName?: string }) {
    const res = await fetch('/api/auth/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Gagal memperbarui pengaturan');
    return await this.getProfile();
  },
  onAuthStateChanged(callback: (user: any) => void) {
    callback(currentUser);
    return () => {};
  }
};

function handleApiError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.id,
      email: currentUser?.email,
    },
    operationType,
    path
  };
  console.error('API Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firestoreService = {
  // Household
  async getHouseholds() {
    try {
      const res = await fetch('/api/households');
      return await res.json();
    } catch (e) {
      handleApiError(e, OperationType.GET, 'households');
    }
  },

  async createHousehold(name: string) {
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      return data.id;
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'households');
    }
  },

  // Members
  subscribeMembers(householdId: string, callback: (members: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/members`);
        const data = await res.json();
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
        const res = await fetch(`/api/households/${householdId}/transactions`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'transactions');
    }
  },

  async deleteTransaction(householdId: string, txId: string) {
    try {
      await fetch(`/api/households/${householdId}/transactions/${txId}`, { method: 'DELETE' });
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'transactions');
    }
  },

  // Budgets
  subscribeBudgets(householdId: string, period: string, callback: (budgets: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/budgets`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'budgets');
    }
  },

  async deleteBudget(householdId: string, budgetId: string) {
    try {
      await fetch(`/api/households/${householdId}/budgets/${budgetId}`, { method: 'DELETE' });
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'budgets');
    }
  },

  // Bills
  subscribeBills(householdId: string, callback: (bills: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/bills`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'bills');
    }
  },

  async updateBill(householdId: string, billId: string, updates: any) {
    try {
      await fetch(`/api/households/${householdId}/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, 'bills');
    }
  },

  async deleteBill(householdId: string, billId: string) {
    try {
      await fetch(`/api/households/${householdId}/bills/${billId}`, { method: 'DELETE' });
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'bills');
    }
  },

  // Planning
  subscribePlanning(householdId: string, period: string, callback: (items: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/planning`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'planning');
    }
  },

  async updatePlanningItem(householdId: string, itemId: string, updates: any) {
    try {
      await fetch(`/api/households/${householdId}/planning/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, 'planning');
    }
  },

  async deletePlanningItem(householdId: string, itemId: string) {
    try {
      await fetch(`/api/households/${householdId}/planning/${itemId}`, { method: 'DELETE' });
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'planning');
    }
  },

  // Chat
  subscribeMessages(householdId: string, callback: (messages: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/messages`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'messages');
    }
  },

  subscribeTyping(householdId: string, callback: (typingUsers: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/typing`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping })
      });
    } catch (e) { console.error(e); }
  },

  // Gallery
  subscribeGallery(householdId: string, callback: (items: any[]) => void) {
    const poll = async () => {
      try {
        const res = await fetch(`/api/households/${householdId}/gallery`);
        const data = await res.json();
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
      await fetch(`/api/households/${householdId}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (e) {
      handleApiError(e, OperationType.WRITE, 'gallery');
    }
  },

  async deleteGalleryItem(householdId: string, itemId: string) {
    try {
      await fetch(`/api/households/${householdId}/gallery/${itemId}`, { method: 'DELETE' });
    } catch (e) {
      handleApiError(e, OperationType.DELETE, 'gallery');
    }
  }
};
