export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: string; // YYYY-MM
  updatedAt: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'unpaid' | 'paid';
  category: string;
}

export interface PlanningItem {
  id: string;
  name: string;
  amount: number;
  group: string;
  period: string;
  isBought: boolean;
  productUrl?: string;
  storeNote?: string;
  createdAt: string;
}

export interface Member {
  userId: string;
  displayName: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  timestamp: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'image' | 'video';
  userId: string;
  userName: string;
  timestamp: string;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
