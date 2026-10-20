import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateLoyaltyTier,
  calculateOrderPricing,
  getStockHealthStatus,
  processAutomatedStockDeduction,
  canTransitionOrderStatus,
  getNextRecommendedStatus,
} from './commerceRules.ts';

test('evaluateLoyaltyTier assigns Bronze, Silver, Gold, and Platinum accurately', () => {
  const bronze = evaluateLoyaltyTier(120);
  assert.equal(bronze.tier, 'Bronze');
  assert.equal(bronze.discountRate, 0);
  assert.equal(bronze.pointsToNextTier, 380);

  const silver = evaluateLoyaltyTier(650);
  assert.equal(silver.tier, 'Silver');
  assert.equal(silver.discountRate, 0.03);
  assert.equal(silver.pointsMultiplier, 1.2);

  const gold = evaluateLoyaltyTier(2000);
  assert.equal(gold.tier, 'Gold');
  assert.equal(gold.discountRate, 0.05);
  assert.equal(gold.pointsMultiplier, 1.5);
  assert.equal(gold.pointsToNextTier, 2000);

  const platinum = evaluateLoyaltyTier(5200);
  assert.equal(platinum.tier, 'Platinum');
  assert.equal(platinum.discountRate, 0.10);
  assert.equal(platinum.nextTier, null);
});

test('calculateOrderPricing applies tier discount, point redemption cap, and free shipping threshold', () => {
  const pricing = calculateOrderPricing({
    items: [
      { price: 40, quantity: 2 }, // $80 subtotal
    ],
    memberLifetimePoints: 2000, // Gold -> 5% discount ($4.00 off -> $76.00)
    availableMemberPoints: 1200,
    requestedPointsToRedeem: 550, // Rounded down to 500 pts = $5.00 off
  });

  assert.equal(pricing.subtotal, 80);
  assert.equal(pricing.tier, 'Gold');
  assert.equal(pricing.tierDiscount, 4);
  assert.equal(pricing.pointsRedeemed, 500);
  assert.equal(pricing.pointsDiscount, 5);
  assert.equal(pricing.shippingFee, 0); // >= $50 free shipping
  assert.equal(pricing.total, 71);
  // Net merchandise spend = $71, Gold multiplier 1.5x -> 71 * 10 * 1.5 = 1065 points
  assert.equal(pricing.pointsEarned, 1065);
});

test('calculateOrderPricing charges $2.50 shipping below $50 and caps points at 50% of order', () => {
  const pricing = calculateOrderPricing({
    items: [{ price: 20, quantity: 1 }],
    memberLifetimePoints: 100, // Bronze
    availableMemberPoints: 5000,
    requestedPointsToRedeem: 3000, // Capped at 50% of $20 = $10 (1000 pts)
  });

  assert.equal(pricing.subtotal, 20);
  assert.equal(pricing.pointsRedeemed, 1000);
  assert.equal(pricing.pointsDiscount, 10);
  assert.equal(pricing.shippingFee, 2.5);
  assert.equal(pricing.total, 12.5);
});

test('processAutomatedStockDeduction deducts stock and triggers auto-restock when threshold reached', () => {
  const res = processAutomatedStockDeduction(10, 6, 5, true, 20);
  assert.equal(res.success, true);
  assert.equal(res.previousStock, 10);
  assert.equal(res.deductedStock, 4); // 4 <= 5 threshold -> triggers auto-restock (+20)
  assert.equal(res.autoRestocked, true);
  assert.equal(res.finalStock, 24);
  assert.equal(res.statusAfter, 'IN_STOCK');
});

test('processAutomatedStockDeduction rejects overselling', () => {
  const res = processAutomatedStockDeduction(3, 5, 5, false, 15);
  assert.equal(res.success, false);
  assert.equal(res.finalStock, 3);
  assert.equal(getStockHealthStatus(3, 5), 'LOW_STOCK');
  assert.equal(getStockHealthStatus(0, 5), 'OUT_OF_STOCK');
});

test('order status pipeline validates transitions accurately', () => {
  assert.equal(canTransitionOrderStatus('PENDING', 'PAID'), true);
  assert.equal(canTransitionOrderStatus('PAID', 'PACKING'), true);
  assert.equal(canTransitionOrderStatus('PACKING', 'SHIPPED'), true);
  assert.equal(canTransitionOrderStatus('SHIPPED', 'DELIVERED'), true);
  assert.equal(canTransitionOrderStatus('DELIVERED', 'CANCELLED'), false);
  assert.equal(getNextRecommendedStatus('PACKING'), 'SHIPPED');
});
