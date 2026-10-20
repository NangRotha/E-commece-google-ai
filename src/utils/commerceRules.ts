export type LoyaltyTierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export type StockHealthStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type OrderStatusCode = 'PENDING' | 'PAID' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface TierConfig {
  tier: LoyaltyTierName;
  minLifetimePoints: number;
  discountRate: number; // e.g., 0.05 for 5%
  pointsMultiplier: number; // e.g., 1.5x points per $1
  nextTier: LoyaltyTierName | null;
  pointsToNextTier: number;
}

export function evaluateLoyaltyTier(lifetimePoints: number): TierConfig {
  const safePoints = Math.max(0, Math.floor(lifetimePoints));
  if (safePoints >= 4000) {
    return {
      tier: 'Platinum',
      minLifetimePoints: 4000,
      discountRate: 0.10,
      pointsMultiplier: 2.0,
      nextTier: null,
      pointsToNextTier: 0,
    };
  }
  if (safePoints >= 1500) {
    return {
      tier: 'Gold',
      minLifetimePoints: 1500,
      discountRate: 0.05,
      pointsMultiplier: 1.5,
      nextTier: 'Platinum',
      pointsToNextTier: 4000 - safePoints,
    };
  }
  if (safePoints >= 500) {
    return {
      tier: 'Silver',
      minLifetimePoints: 500,
      discountRate: 0.03,
      pointsMultiplier: 1.2,
      nextTier: 'Gold',
      pointsToNextTier: 1500 - safePoints,
    };
  }
  return {
    tier: 'Bronze',
    minLifetimePoints: 0,
    discountRate: 0.0,
    pointsMultiplier: 1.0,
    nextTier: 'Silver',
    pointsToNextTier: 500 - safePoints,
  };
}

export interface OrderPricingInput {
  items: Array<{ price: number; quantity: number }>;
  memberLifetimePoints?: number;
  availableMemberPoints?: number;
  requestedPointsToRedeem?: number;
}

export interface OrderPricingBreakdown {
  subtotal: number;
  tier: LoyaltyTierName;
  tierDiscountRate: number;
  tierDiscount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  shippingFee: number;
  total: number;
  pointsEarned: number;
}

/**
 * Calculates full order pricing breakdown:
 * - Tier discount applied on subtotal
 * - Points redemption: 100 pts = $1.00, capped at 50% of post-tier-discount amount and available member points
 * - Free shipping when subtotal >= $50.00, otherwise $2.50
 * - Base 10 points earned per $1.00 spent (multiplied by tier multiplier)
 */
export function calculateOrderPricing(input: OrderPricingInput): OrderPricingBreakdown {
  const rawSubtotal = input.items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(item.quantity));
    const price = Math.max(0, item.price);
    return sum + price * qty;
  }, 0);

  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const tierConfig = evaluateLoyaltyTier(input.memberLifetimePoints ?? 0);
  const tierDiscount = Math.round(subtotal * tierConfig.discountRate * 100) / 100;

  const afterTierSubtotal = Math.max(0, subtotal - tierDiscount);
  const maxRedeemableDollars = Math.floor((afterTierSubtotal * 0.5) * 100) / 100;
  const maxPointsByCap = Math.floor(maxRedeemableDollars * 100);
  const availablePoints = Math.max(0, Math.floor(input.availableMemberPoints ?? 0));
  const requestedPoints = Math.max(0, Math.floor(input.requestedPointsToRedeem ?? 0));

  // Redeem in clean multiples of 100 points
  const usablePoints = Math.min(requestedPoints, availablePoints, maxPointsByCap);
  const pointsRedeemed = Math.floor(usablePoints / 100) * 100;
  const pointsDiscount = Math.round((pointsRedeemed / 100) * 100) / 100;

  const shippingFee = subtotal === 0 ? 0 : subtotal >= 50 ? 0 : 2.5;
  const total = Math.max(0, Math.round((afterTierSubtotal - pointsDiscount + shippingFee) * 100) / 100);

  const netMerchandiseSpend = Math.max(0, afterTierSubtotal - pointsDiscount);
  const pointsEarned = Math.floor(netMerchandiseSpend * 10 * tierConfig.pointsMultiplier);

  return {
    subtotal,
    tier: tierConfig.tier,
    tierDiscountRate: tierConfig.discountRate,
    tierDiscount,
    pointsRedeemed,
    pointsDiscount,
    shippingFee,
    total,
    pointsEarned,
  };
}

export function getStockHealthStatus(stock: number, minStockThreshold: number): StockHealthStatus {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export interface StockDeductionResult {
  success: boolean;
  error?: string;
  previousStock: number;
  deductedStock: number;
  finalStock: number;
  autoRestocked: boolean;
  autoRestockAdded: number;
  statusAfter: StockHealthStatus;
}

/**
 * Deducts ordered quantity from product stock and triggers automated restock if enabled
 * and remaining stock falls at or below minStockThreshold.
 */
export function processAutomatedStockDeduction(
  currentStock: number,
  orderQuantity: number,
  minStockThreshold: number,
  autoRestockEnabled: boolean,
  autoRestockAmount: number
): StockDeductionResult {
  if (orderQuantity <= 0) {
    return {
      success: false,
      error: 'Order quantity must be greater than zero.',
      previousStock: currentStock,
      deductedStock: currentStock,
      finalStock: currentStock,
      autoRestocked: false,
      autoRestockAdded: 0,
      statusAfter: getStockHealthStatus(currentStock, minStockThreshold),
    };
  }

  if (orderQuantity > currentStock) {
    return {
      success: false,
      error: `Insufficient stock (requested ${orderQuantity}, available ${currentStock}).`,
      previousStock: currentStock,
      deductedStock: currentStock,
      finalStock: currentStock,
      autoRestocked: false,
      autoRestockAdded: 0,
      statusAfter: getStockHealthStatus(currentStock, minStockThreshold),
    };
  }

  const deductedStock = currentStock - orderQuantity;
  let finalStock = deductedStock;
  let autoRestocked = false;
  let autoRestockAdded = 0;

  if (autoRestockEnabled && deductedStock <= minStockThreshold && autoRestockAmount > 0) {
    autoRestocked = true;
    autoRestockAdded = autoRestockAmount;
    finalStock = deductedStock + autoRestockAmount;
  }

  return {
    success: true,
    previousStock: currentStock,
    deductedStock,
    finalStock,
    autoRestocked,
    autoRestockAdded,
    statusAfter: getStockHealthStatus(finalStock, minStockThreshold),
  };
}

const VALID_STATUS_TRANSITIONS: Record<OrderStatusCode, OrderStatusCode[]> = {
  PENDING: ['PAID', 'PACKING', 'CANCELLED'],
  PAID: ['PACKING', 'SHIPPED', 'CANCELLED'],
  PACKING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(current: OrderStatusCode, next: OrderStatusCode): boolean {
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getNextRecommendedStatus(current: OrderStatusCode): OrderStatusCode | null {
  switch (current) {
    case 'PENDING':
      return 'PAID';
    case 'PAID':
      return 'PACKING';
    case 'PACKING':
      return 'SHIPPED';
    case 'SHIPPED':
      return 'DELIVERED';
    default:
      return null;
  }
}
