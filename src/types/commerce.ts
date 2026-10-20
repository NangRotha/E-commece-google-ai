export type ProductCategory = 'Audio & Tech' | 'Workspace' | 'Coffee & Living' | 'Artisanal Craft';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameKm: string;
  category: ProductCategory;
  price: number;
  stock: number;
  minStockThreshold: number;
  autoRestockEnabled: boolean;
  autoRestockAmount: number;
  visualKey: string;
  imageUrl?: string;
  description: string;
  specs: string[];
  soldCount: number;
  updatedAt: string;
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  totalSpent: number;
  ordersCount: number;
  joinedAt: string;
  redeemedRewards: string[];
}

export interface LoyaltyReward {
  id: string;
  title: string;
  titleKm: string;
  pointsCost: number;
  discountValue: number;
  minTier: LoyaltyTier;
  description: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type PaymentMethod = 'KHQR' | 'ABA_PAY' | 'WING' | 'COD';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  nameKm: string;
  price: number;
  quantity: number;
}

export interface OrderStatusStep {
  status: OrderStatus;
  label: string;
  labelKm: string;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  cityProvince: string;
  memberId?: string;
  memberTier?: LoyaltyTier;
  items: OrderItem[];
  subtotal: number;
  tierDiscount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  shippingFee: number;
  total: number;
  pointsEarned: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  status: OrderStatus;
  timeline: OrderStatusStep[];
  createdAt: string;
  sheetRowId: number;
}

export interface StockLog {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  change: number;
  previousStock: number;
  newStock: number;
  reason: 'ORDER_DEDUCTION' | 'AUTO_RESTOCK' | 'MANUAL_ADJUSTMENT' | 'ORDER_CANCEL_RESTORE';
  referenceId: string;
  timestamp: string;
}

export interface SheetSyncRecord {
  id: string;
  sheetTab: 'Products' | 'Orders' | 'Members' | 'StockLogs';
  operation: 'APPEND_ROW' | 'UPDATE_ROW' | 'BATCH_READ' | 'AUTO_RESTOCK_TRIGGER';
  summary: string;
  latencyMs: number;
  status: 'SYNCED' | 'LOCAL_MIRROR';
  timestamp: string;
}

export interface SheetsConnectionConfig {
  scriptUrl: string;
  spreadsheetId: string;
  connected: boolean;
  lastSyncedAt: string;
  totalRowsSynced: number;
}
