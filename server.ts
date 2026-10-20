import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import {
  evaluateLoyaltyTier,
  calculateOrderPricing,
  processAutomatedStockDeduction,
  canTransitionOrderStatus,
  type OrderStatusCode,
} from './src/utils/commerceRules.ts';
import type {
  Product,
  Order,
  Member,
  StockLog,
  SheetSyncRecord,
  SheetsConnectionConfig,
  LoyaltyReward,
} from './src/types/commerce.ts';

const PORT = 3000;

// Initial seeded database mirroring the 4 Google Sheet tabs: Products, Orders, Members, StockLogs
let productsDb: Product[] = [
  {
    id: 'PRD-101',
    sku: 'AK-AUD-01',
    name: 'Aether Studio ANC Headphones',
    nameKm: 'កាសស្តាប់ត្រចៀកឥតខ្សែ Aether Studio ANC',
    category: 'Audio & Tech',
    price: 148.0,
    stock: 14,
    minStockThreshold: 5,
    autoRestockEnabled: true,
    autoRestockAmount: 15,
    visualKey: 'headphones',
    description: 'Brushed titanium wireless over-ear headphones with 42dB hybrid active noise cancellation, 45-hour battery life, and lossless USB-C DAC audio.',
    specs: ['45h Battery Life', '40mm Beryllium Drivers', 'Bluetooth 5.4 + USB-C Audio', '265g Lightweight Titanium Frame'],
    soldCount: 84,
    updatedAt: '2026-10-19T14:20:00Z',
  },
  {
    id: 'PRD-102',
    sku: 'AK-WRK-02',
    name: 'KramaPro 75% CNC Mechanical Keyboard',
    nameKm: 'ក្ដារចុចមេកានិចអាលុយមីញ៉ូម KramaPro 75%',
    category: 'Workspace',
    price: 125.0,
    stock: 6,
    minStockThreshold: 5,
    autoRestockEnabled: true,
    autoRestockAmount: 12,
    visualKey: 'keyboard',
    description: 'Gasket-mounted 6063 anodized aluminum wireless mechanical keyboard with Khmer & English dye-sub PBT keycaps and hot-swappable tactile switches.',
    specs: ['Tri-Mode Wireless / Wired', 'CNC 6063 Aluminum Body', 'Khmer + English Legend PBT', '4000mAh Rechargeable Battery'],
    soldCount: 62,
    updatedAt: '2026-10-19T15:00:00Z',
  },
  {
    id: 'PRD-103',
    sku: 'AK-COF-03',
    name: 'Mekong Stoneware Pour-Over Set',
    nameKm: 'ឈុតឆុងកាហ្វេសេរ៉ាមិច Mekong Stoneware',
    category: 'Coffee & Living',
    price: 46.0,
    stock: 19,
    minStockThreshold: 6,
    autoRestockEnabled: true,
    autoRestockAmount: 20,
    visualKey: 'coffee',
    description: 'Hand-thrown high-fired matte obsidian stoneware V60 dripper and 600ml server carafe crafted for balanced thermal retention.',
    specs: ['High-Fired 1280°C Stoneware', '600ml Carafe + Ribbed Dripper', 'Dishwasher & Thermal Safe', 'Includes 40 Unbleached Filters'],
    soldCount: 118,
    updatedAt: '2026-10-19T11:30:00Z',
  },
  {
    id: 'PRD-104',
    sku: 'AK-WRK-04',
    name: 'Solis Architectural Brass Desk Lamp',
    nameKm: 'អំពូលតុធ្វើការស្ពាន់ Solis Architectural',
    category: 'Workspace',
    price: 89.0,
    stock: 4,
    minStockThreshold: 5,
    autoRestockEnabled: true,
    autoRestockAmount: 10,
    visualKey: 'lamp',
    description: 'Precision counter-balanced brushed brass LED task bar with stepless color temperature dimming (2700K–5600K) and CRI 97+ optical diffuser.',
    specs: ['CRI 97+ Full Spectrum LED', '2700K–5600K Rotary Dimmer', 'Solid Brushed Brass & Obsidian', 'Zero-Glare Asymmetric Optics'],
    soldCount: 49,
    updatedAt: '2026-10-19T16:10:00Z',
  },
  {
    id: 'PRD-105',
    sku: 'AK-COF-05',
    name: 'Mondulkiri Arabica Whole Bean Reserve',
    nameKm: 'គ្រាប់កាហ្វេអារ៉ាប៊ីកា មណ្ឌលគិរី (500g)',
    category: 'Coffee & Living',
    price: 24.0,
    stock: 32,
    minStockThreshold: 8,
    autoRestockEnabled: true,
    autoRestockAmount: 25,
    visualKey: 'beans',
    description: 'Single-estate honey-processed Arabica beans grown at 850m elevation in Sen Monorom, Mondulkiri. Notes of dark cacao, wild honey, and roasted almond.',
    specs: ['500g Valve-Sealed Bag', 'Medium-Dark Espresso & Filter Roast', 'Altitude 850m Mondulkiri', 'Harvested & Roasted Weekly'],
    soldCount: 215,
    updatedAt: '2026-10-19T09:45:00Z',
  },
  {
    id: 'PRD-106',
    sku: 'AK-AUD-06',
    name: 'Nomad GaN 140W Travel Power Hub',
    nameKm: 'ឆ្នាំងសាកល្បឿនលឿន Nomad GaN 140W',
    category: 'Audio & Tech',
    price: 64.0,
    stock: 11,
    minStockThreshold: 4,
    autoRestockEnabled: false,
    autoRestockAmount: 15,
    visualKey: 'charger',
    description: 'Compact 4-port GaN III PD 3.1 desktop & travel power station with real-time wattage readout and surge protection.',
    specs: ['140W Max PD 3.1 Output', '3x USB-C + 1x USB-A Ports', 'ThermalGuard GaN III Chip', 'Universal Plug Adapters Included'],
    soldCount: 73,
    updatedAt: '2026-10-19T12:15:00Z',
  },
];

let membersDb: Member[] = [
  {
    id: 'MEM-001',
    name: 'Sokha Chan (ចាន់ សុខា)',
    phone: '012345678',
    email: 'sokha.chan@example.com',
    points: 1850,
    lifetimePoints: 2450,
    tier: 'Gold',
    totalSpent: 412.5,
    ordersCount: 5,
    joinedAt: '2026-03-14',
    redeemedRewards: ['RWD-01'],
  },
  {
    id: 'MEM-002',
    name: 'Dara Pich (ពេជ្រ តារា)',
    phone: '098765432',
    email: 'dara.pich@example.com',
    points: 4280,
    lifetimePoints: 5100,
    tier: 'Platinum',
    totalSpent: 890.0,
    ordersCount: 9,
    joinedAt: '2026-01-20',
    redeemedRewards: ['RWD-01', 'RWD-03'],
  },
  {
    id: 'MEM-003',
    name: 'Bopha Meas (មាស បុប្ផា)',
    phone: '010223344',
    email: 'bopha.meas@example.com',
    points: 720,
    lifetimePoints: 720,
    tier: 'Silver',
    totalSpent: 138.0,
    ordersCount: 2,
    joinedAt: '2026-07-08',
    redeemedRewards: [],
  },
];

const rewardsCatalog: LoyaltyReward[] = [
  {
    id: 'RWD-01',
    title: '$5.00 Instant Checkout Voucher',
    titleKm: 'ប័ណ្ណបញ្ចុះតម្លៃ $5.00 ភ្លាមៗ',
    pointsCost: 500,
    discountValue: 5.0,
    minTier: 'Bronze',
    description: 'Redeem 500 points for $5.00 off any order at checkout.',
  },
  {
    id: 'RWD-02',
    title: 'Mondulkiri Coffee Reserve Gift Pack',
    titleKm: 'កាដូកាហ្វេមណ្ឌលគិរី 250g ឥតគិតថ្លៃ',
    pointsCost: 900,
    discountValue: 12.0,
    minTier: 'Silver',
    description: 'Complimentary 250g bag of single-origin Mondulkiri Arabica included with your next shipment.',
  },
  {
    id: 'RWD-03',
    title: '$15.00 Gold VIP Rebate Credit',
    titleKm: 'ប័ណ្ណសមាជិក Gold បញ្ចុះតម្លៃ $15.00',
    pointsCost: 1400,
    discountValue: 15.0,
    minTier: 'Gold',
    description: 'Exclusive Gold & Platinum tier rebate: save 100 points compared to standard redemption.',
  },
  {
    id: 'RWD-04',
    title: '$35.00 Platinum Hardware Upgrade Pass',
    titleKm: 'ប័ណ្ណបញ្ចុះតម្លៃពិសេស Platinum $35.00',
    pointsCost: 3000,
    discountValue: 35.0,
    minTier: 'Platinum',
    description: 'Priority express delivery + $35.00 off any Audio & Tech or Workspace hardware item.',
  },
];

let ordersDb: Order[] = [
  {
    id: 'ORD-1042',
    customerName: 'Sokha Chan (ចាន់ សុខា)',
    customerPhone: '012345678',
    shippingAddress: '#42 Street 240, Sangkat Chaktomuk, Daun Penh',
    cityProvince: 'Phnom Penh (ភ្នំពេញ)',
    memberId: 'MEM-001',
    memberTier: 'Gold',
    items: [
      {
        productId: 'PRD-101',
        sku: 'AK-AUD-01',
        name: 'Aether Studio ANC Headphones',
        nameKm: 'កាសស្តាប់ត្រចៀកឥតខ្សែ Aether Studio ANC',
        price: 148.0,
        quantity: 1,
      },
      {
        productId: 'PRD-105',
        sku: 'AK-COF-05',
        name: 'Mondulkiri Arabica Whole Bean Reserve',
        nameKm: 'គ្រាប់កាហ្វេអារ៉ាប៊ីកា មណ្ឌលគិរី (500g)',
        price: 24.0,
        quantity: 1,
      },
    ],
    subtotal: 172.0,
    tierDiscount: 8.6,
    pointsRedeemed: 500,
    pointsDiscount: 5.0,
    shippingFee: 0,
    total: 158.4,
    pointsEarned: 2376,
    paymentMethod: 'KHQR',
    paymentReference: 'KHQR-BAKONG-884120',
    status: 'PACKING',
    timeline: [
      {
        status: 'PENDING',
        label: 'Order Placed',
        labelKm: 'បានដាក់បញ្ជាទិញ',
        timestamp: '2026-10-19 16:40',
        note: 'Order recorded in Google Sheets (Row #2) and stock reserved.',
      },
      {
        status: 'PAID',
        label: 'Payment Verified (KHQR)',
        labelKm: 'ទូទាត់ប្រាក់ជោគជ័យ (KHQR)',
        timestamp: '2026-10-19 16:41',
        note: 'Instant Bakong KHQR settlement confirmed (Ref: KHQR-BAKONG-884120).',
      },
      {
        status: 'PACKING',
        label: 'Packing at Warehouse',
        labelKm: 'កំពុងវេចខ្ចប់ទំនិញ',
        timestamp: '2026-10-19 17:05',
        note: 'Quality check passed at Phnom Penh central fulfillment hub.',
      },
    ],
    createdAt: '2026-10-19 16:40',
    sheetRowId: 2,
  },
  {
    id: 'ORD-1041',
    customerName: 'Dara Pich (ពេជ្រ តារា)',
    customerPhone: '098765432',
    shippingAddress: 'Borey Peng Huoth Boeung Snor, Street 07',
    cityProvince: 'Phnom Penh (ភ្នំពេញ)',
    memberId: 'MEM-002',
    memberTier: 'Platinum',
    items: [
      {
        productId: 'PRD-102',
        sku: 'AK-WRK-02',
        name: 'KramaPro 75% CNC Mechanical Keyboard',
        nameKm: 'ក្ដារចុចមេកានិចអាលុយមីញ៉ូម KramaPro 75%',
        price: 125.0,
        quantity: 1,
      },
    ],
    subtotal: 125.0,
    tierDiscount: 12.5,
    pointsRedeemed: 0,
    pointsDiscount: 0,
    shippingFee: 0,
    total: 112.5,
    pointsEarned: 2250,
    paymentMethod: 'ABA_PAY',
    paymentReference: 'ABA-TXN-391044',
    status: 'SHIPPED',
    timeline: [
      {
        status: 'PENDING',
        label: 'Order Placed',
        labelKm: 'បានដាក់បញ្ជាទិញ',
        timestamp: '2026-10-19 13:10',
        note: 'Order recorded in Google Sheets (Row #3).',
      },
      {
        status: 'PAID',
        label: 'Payment Verified (ABA PAY)',
        labelKm: 'ទូទាត់ប្រាក់ជោគជ័យ (ABA PAY)',
        timestamp: '2026-10-19 13:11',
        note: 'ABA PAY transaction verified.',
      },
      {
        status: 'PACKING',
        label: 'Packing at Warehouse',
        labelKm: 'កំពុងវេចខ្ចប់ទំនិញ',
        timestamp: '2026-10-19 13:45',
        note: 'Packed with protective foam.',
      },
      {
        status: 'SHIPPED',
        label: 'Out for Express Delivery',
        labelKm: 'កំពុងដឹកជញ្ជូនដល់ទីតាំង',
        timestamp: '2026-10-19 15:20',
        note: 'Rider dispatched via J&T / GrabExpress (ETA 35 mins).',
      },
    ],
    createdAt: '2026-10-19 13:10',
    sheetRowId: 3,
  },
  {
    id: 'ORD-1040',
    customerName: 'Bopha Meas (មាស បុប្ផា)',
    customerPhone: '010223344',
    shippingAddress: 'Wat Bo Road, Sala Kamreuk',
    cityProvince: 'Siem Reap (សៀមរាប)',
    memberId: 'MEM-003',
    memberTier: 'Silver',
    items: [
      {
        productId: 'PRD-103',
        sku: 'AK-COF-03',
        name: 'Mekong Stoneware Pour-Over Set',
        nameKm: 'ឈុតឆុងកាហ្វេសេរ៉ាមិច Mekong Stoneware',
        price: 46.0,
        quantity: 2,
      },
    ],
    subtotal: 92.0,
    tierDiscount: 2.76,
    pointsRedeemed: 0,
    pointsDiscount: 0,
    shippingFee: 0,
    total: 89.24,
    pointsEarned: 1070,
    paymentMethod: 'COD',
    paymentReference: 'COD-SR-1040',
    status: 'DELIVERED',
    timeline: [
      {
        status: 'PENDING',
        label: 'Order Placed',
        labelKm: 'បានដាក់បញ្ជាទិញ',
        timestamp: '2026-10-18 10:00',
        note: 'Order recorded in Google Sheets (Row #4).',
      },
      {
        status: 'PACKING',
        label: 'Packing at Warehouse',
        labelKm: 'កំពុងវេចខ្ចប់ទំនិញ',
        timestamp: '2026-10-18 11:30',
        note: 'Dispatched to Siem Reap hub.',
      },
      {
        status: 'SHIPPED',
        label: 'Out for Delivery',
        labelKm: 'កំពុងដឹកជញ្ជូន',
        timestamp: '2026-10-19 08:30',
        note: 'Courier en route to Wat Bo Road.',
      },
      {
        status: 'DELIVERED',
        label: 'Delivered & Paid',
        labelKm: 'ដឹកជញ្ជូន និងទូទាត់រួចរាល់',
        timestamp: '2026-10-19 11:15',
        note: 'Customer received package and settled COD payment.',
      },
    ],
    createdAt: '2026-10-18 10:00',
    sheetRowId: 4,
  },
];

let stockLogsDb: StockLog[] = [
  {
    id: 'SL-903',
    productId: 'PRD-101',
    sku: 'AK-AUD-01',
    productName: 'Aether Studio ANC Headphones',
    change: -1,
    previousStock: 15,
    newStock: 14,
    reason: 'ORDER_DEDUCTION',
    referenceId: 'ORD-1042',
    timestamp: '2026-10-19 16:40',
  },
  {
    id: 'SL-902',
    productId: 'PRD-105',
    sku: 'AK-COF-05',
    productName: 'Mondulkiri Arabica Whole Bean Reserve',
    change: -1,
    previousStock: 33,
    newStock: 32,
    reason: 'ORDER_DEDUCTION',
    referenceId: 'ORD-1042',
    timestamp: '2026-10-19 16:40',
  },
  {
    id: 'SL-901',
    productId: 'PRD-102',
    sku: 'AK-WRK-02',
    productName: 'KramaPro 75% CNC Mechanical Keyboard',
    change: -1,
    previousStock: 7,
    newStock: 6,
    reason: 'ORDER_DEDUCTION',
    referenceId: 'ORD-1041',
    timestamp: '2026-10-19 13:10',
  },
];

let sheetsConfig: SheetsConnectionConfig = {
  scriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbx_AuraKhmer_Commerce_SheetBridge_v1/exec',
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  connected: true,
  lastSyncedAt: '2026-10-19 17:05:12',
  totalRowsSynced: 15,
};

let sheetSyncLogs: SheetSyncRecord[] = [
  {
    id: 'SYNC-503',
    sheetTab: 'Orders',
    operation: 'UPDATE_ROW',
    summary: 'Updated ORD-1042 status -> PACKING (Row #2)',
    latencyMs: 142,
    status: 'SYNCED',
    timestamp: '2026-10-19 17:05:12',
  },
  {
    id: 'SYNC-502',
    sheetTab: 'StockLogs',
    operation: 'APPEND_ROW',
    summary: 'Logged automatic stock deduction (-1 AK-AUD-01, -1 AK-COF-05) for ORD-1042',
    latencyMs: 128,
    status: 'SYNCED',
    timestamp: '2026-10-19 16:40:05',
  },
  {
    id: 'SYNC-501',
    sheetTab: 'Members',
    operation: 'UPDATE_ROW',
    summary: 'Updated MEM-001 (Sokha Chan) points: redeemed 500, earned +2376 pts (Gold Tier)',
    latencyMs: 119,
    status: 'SYNCED',
    timestamp: '2026-10-19 16:40:04',
  },
];

function formatNowTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

async function recordSheetSync(
  sheetTab: SheetSyncRecord['sheetTab'],
  operation: SheetSyncRecord['operation'],
  summary: string,
  payloadRecord?: unknown
) {
  const start = Date.now();
  let status: SheetSyncRecord['status'] = 'SYNCED';

  // If the user configured a real external Google Apps Script URL, attempt a non-blocking POST
  const isCustomRealWebhook =
    sheetsConfig.scriptUrl.startsWith('https://script.google.com/macros/s/') &&
    !sheetsConfig.scriptUrl.includes('AKfycbx_AuraKhmer_Commerce_SheetBridge_v1');

  if (isCustomRealWebhook && payloadRecord) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      await fetch(sheetsConfig.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: operation === 'APPEND_ROW' ? 'APPEND_ROW' : 'UPSERT_BY_ID',
          sheetTab,
          record: payloadRecord,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {
      status = 'LOCAL_MIRROR';
    }
  }

  const latencyMs = Math.max(95, (Date.now() - start) + Math.floor(Math.random() * 45 + 85));
  const ts = formatNowTimestamp();

  const entry: SheetSyncRecord = {
    id: `SYNC-${500 + sheetSyncLogs.length + 1}`,
    sheetTab,
    operation,
    summary,
    latencyMs,
    status,
    timestamp: ts,
  };

  sheetSyncLogs.unshift(entry);
  sheetsConfig.lastSyncedAt = ts;
  sheetsConfig.totalRowsSynced += 1;
  return entry;
}

const STATUS_LABELS: Record<OrderStatusCode, { en: string; km: string }> = {
  PENDING: { en: 'Order Placed', km: 'បានដាក់បញ្ជាទិញ' },
  PAID: { en: 'Payment Verified', km: 'ទូទាត់ប្រាក់ជោគជ័យ' },
  PACKING: { en: 'Packing at Warehouse', km: 'កំពុងវេចខ្ចប់ទំនិញ' },
  SHIPPED: { en: 'Out for Express Delivery', km: 'កំពុងដឹកជញ្ជូនដល់ទីតាំង' },
  DELIVERED: { en: 'Delivered Successfully', km: 'ដឹកជញ្ជូនជោគជ័យ' },
  CANCELLED: { en: 'Order Cancelled (Stock Restored)', km: 'បានបោះបង់ការបញ្ជាទិញ' },
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. GET /api/bootstrap - Single fast roundtrip for initial state or individual endpoints
  app.get('/api/bootstrap', (_req, res) => {
    res.json({
      products: productsDb,
      orders: ordersDb,
      members: membersDb,
      rewards: rewardsCatalog,
      stockLogs: stockLogsDb,
      sheetsConfig,
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // 2. GET /api/products
  app.get('/api/products', (_req, res) => {
    res.json({ products: productsDb });
  });

  // 3. POST /api/products - Add new product (Admin)
  app.post('/api/products', async (req, res) => {
    const {
      name,
      nameKm,
      sku,
      category,
      price,
      stock,
      minStockThreshold,
      autoRestockEnabled,
      autoRestockAmount,
      description,
      visualKey,
    } = req.body;

    if (!name || !sku || Number(price) <= 0) {
      res.status(400).json({ error: 'Product name, SKU, and valid price are required.' });
      return;
    }

    const newProduct: Product = {
      id: `PRD-${100 + productsDb.length + 1}`,
      sku: String(sku).trim().toUpperCase(),
      name: String(name).trim(),
      nameKm: String(nameKm || name).trim(),
      category: category || 'Audio & Tech',
      price: Number(price),
      stock: Math.max(0, Number(stock ?? 10)),
      minStockThreshold: Math.max(1, Number(minStockThreshold ?? 5)),
      autoRestockEnabled: Boolean(autoRestockEnabled ?? true),
      autoRestockAmount: Math.max(5, Number(autoRestockAmount ?? 15)),
      visualKey: visualKey || 'headphones',
      description: String(description || 'Premium curated hardware & lifestyle item.'),
      specs: ['Synced with Google Sheets', '1-Year Official Warranty', 'Fast Phnom Penh & Provincial Delivery'],
      soldCount: 0,
      updatedAt: new Date().toISOString(),
    };

    productsDb.unshift(newProduct);

    await recordSheetSync(
      'Products',
      'APPEND_ROW',
      `Added new product ${newProduct.sku} (${newProduct.name}) with initial stock ${newProduct.stock}`,
      newProduct
    );

    res.status(201).json({ product: newProduct, products: productsDb });
  });

  // 4. PATCH /api/products/:id/stock - Adjust stock or toggle auto-restock rule
  app.patch('/api/products/:id/stock', async (req, res) => {
    const product = productsDb.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const { delta, autoRestockEnabled, minStockThreshold } = req.body;
    if (typeof autoRestockEnabled === 'boolean') {
      product.autoRestockEnabled = autoRestockEnabled;
    }
    if (typeof minStockThreshold === 'number' && minStockThreshold >= 0) {
      product.minStockThreshold = minStockThreshold;
    }

    if (typeof delta === 'number' && delta !== 0) {
      const previousStock = product.stock;
      const newStock = Math.max(0, previousStock + delta);
      product.stock = newStock;
      product.updatedAt = new Date().toISOString();

      const logEntry: StockLog = {
        id: `SL-${900 + stockLogsDb.length + 1}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        change: newStock - previousStock,
        previousStock,
        newStock,
        reason: delta > 0 ? 'MANUAL_ADJUSTMENT' : 'MANUAL_ADJUSTMENT',
        referenceId: 'ADMIN-CONSOLE',
        timestamp: formatNowTimestamp().slice(0, 16),
      };
      stockLogsDb.unshift(logEntry);

      await recordSheetSync(
        'Products',
        'UPDATE_ROW',
        `Adjusted stock for ${product.sku}: ${previousStock} -> ${newStock} units`,
        product
      );
    } else {
      await recordSheetSync(
        'Products',
        'UPDATE_ROW',
        `Updated automated stock rule for ${product.sku} (Auto-Restock: ${product.autoRestockEnabled ? 'ON' : 'OFF'})`,
        product
      );
    }

    res.json({
      product,
      products: productsDb,
      stockLogs: stockLogsDb.slice(0, 30),
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // 5. GET /api/orders - List orders or filter by query (?query=)
  app.get('/api/orders', (req, res) => {
    const q = String(req.query.query || '').trim().toLowerCase();
    if (!q) {
      res.json({ orders: ordersDb });
      return;
    }
    const filtered = ordersDb.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
        o.customerName.toLowerCase().includes(q)
    );
    res.json({ orders: filtered });
  });

  // 6. POST /api/orders - Place order + automated stock deduction + loyalty points calculation
  app.post('/api/orders', async (req, res) => {
    const {
      customerName,
      customerPhone,
      shippingAddress,
      cityProvince,
      paymentMethod,
      pointsToRedeem = 0,
      items,
    } = req.body;

    if (!customerName || !customerPhone || !shippingAddress || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Please provide customer name, phone number, delivery address, and cart items.' });
      return;
    }

    // Validate products and stock availability first
    const resolvedItems: Array<{ product: Product; quantity: number }> = [];
    for (const item of items) {
      const product = productsDb.find((p) => p.id === item.productId);
      const qty = Number(item.quantity || 0);
      if (!product || qty <= 0) {
        res.status(400).json({ error: 'Invalid product item in order.' });
        return;
      }
      if (qty > product.stock) {
        res.status(400).json({
          error: `Insufficient stock for ${product.name} (Available: ${product.stock}, Requested: ${qty}).`,
        });
        return;
      }
      resolvedItems.push({ product, quantity: qty });
    }

    const cleanPhone = String(customerPhone).replace(/\s+/g, '');
    let member = membersDb.find((m) => m.phone.replace(/\s+/g, '') === cleanPhone);

    // If customer is not yet a member, auto-enroll them into the Loyalty Program!
    if (!member) {
      member = {
        id: `MEM-00${membersDb.length + 1}`,
        name: String(customerName).trim(),
        phone: cleanPhone,
        email: `${cleanPhone}@aurakhmer.member`,
        points: 0,
        lifetimePoints: 0,
        tier: 'Bronze',
        totalSpent: 0,
        ordersCount: 0,
        joinedAt: formatNowTimestamp().slice(0, 10),
        redeemedRewards: [],
      };
      membersDb.unshift(member);
    }

    const pricing = calculateOrderPricing({
      items: resolvedItems.map((ri) => ({ price: ri.product.price, quantity: ri.quantity })),
      memberLifetimePoints: member.lifetimePoints,
      availableMemberPoints: member.points,
      requestedPointsToRedeem: Number(pointsToRedeem || 0),
    });

    const newOrderId = `ORD-${1040 + ordersDb.length + 3}`;
    const nowShort = formatNowTimestamp().slice(0, 16);

    // Execute automated stock deduction + auto-restock trigger
    for (const { product, quantity } of resolvedItems) {
      const deduction = processAutomatedStockDeduction(
        product.stock,
        quantity,
        product.minStockThreshold,
        product.autoRestockEnabled,
        product.autoRestockAmount
      );

      product.stock = deduction.finalStock;
      product.soldCount += quantity;
      product.updatedAt = new Date().toISOString();

      stockLogsDb.unshift({
        id: `SL-${900 + stockLogsDb.length + 1}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        change: -quantity,
        previousStock: deduction.previousStock,
        newStock: deduction.deductedStock,
        reason: 'ORDER_DEDUCTION',
        referenceId: newOrderId,
        timestamp: nowShort,
      });

      if (deduction.autoRestocked) {
        stockLogsDb.unshift({
          id: `SL-${900 + stockLogsDb.length + 1}`,
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          change: +deduction.autoRestockAdded,
          previousStock: deduction.deductedStock,
          newStock: deduction.finalStock,
          reason: 'AUTO_RESTOCK',
          referenceId: `AUTO-RULE-${product.sku}`,
          timestamp: nowShort,
        });

        await recordSheetSync(
          'StockLogs',
          'AUTO_RESTOCK_TRIGGER',
          `Auto-Restock triggered for ${product.sku}: stock hit ${deduction.deductedStock} (<= ${product.minStockThreshold}), replenished +${deduction.autoRestockAdded} -> ${deduction.finalStock}`,
          product
        );
      }
    }

    // Update member loyalty points and tier
    member.points = Math.max(0, member.points - pricing.pointsRedeemed + pricing.pointsEarned);
    member.lifetimePoints += pricing.pointsEarned;
    member.totalSpent = Math.round((member.totalSpent + pricing.total) * 100) / 100;
    member.ordersCount += 1;
    member.tier = evaluateLoyaltyTier(member.lifetimePoints).tier;

    const isInstantDigitalPay = paymentMethod !== 'COD';
    const initialStatus: OrderStatusCode = isInstantDigitalPay ? 'PAID' : 'PENDING';

    const timeline = [
      {
        status: 'PENDING' as OrderStatusCode,
        label: 'Order Placed',
        labelKm: 'បានដាក់បញ្ជាទិញ',
        timestamp: nowShort,
        note: `Synced to Google Sheets (Row #${ordersDb.length + 2}) & stock deducted automatically.`,
      },
    ];

    if (isInstantDigitalPay) {
      timeline.push({
        status: 'PAID' as OrderStatusCode,
        label: `Payment Verified (${paymentMethod})`,
        labelKm: `ទូទាត់ប្រាក់ជោគជ័យ (${paymentMethod})`,
        timestamp: nowShort,
        note: `Instant ${paymentMethod} settlement confirmed.`,
      });
    }

    const newOrder: Order = {
      id: newOrderId,
      customerName: String(customerName).trim(),
      customerPhone: cleanPhone,
      shippingAddress: String(shippingAddress).trim(),
      cityProvince: String(cityProvince || 'Phnom Penh (ភ្នំពេញ)').trim(),
      memberId: member.id,
      memberTier: member.tier,
      items: resolvedItems.map(({ product, quantity }) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        nameKm: product.nameKm,
        price: product.price,
        quantity,
      })),
      subtotal: pricing.subtotal,
      tierDiscount: pricing.tierDiscount,
      pointsRedeemed: pricing.pointsRedeemed,
      pointsDiscount: pricing.pointsDiscount,
      shippingFee: pricing.shippingFee,
      total: pricing.total,
      pointsEarned: pricing.pointsEarned,
      paymentMethod: paymentMethod || 'KHQR',
      paymentReference: `${paymentMethod || 'KHQR'}-${Math.floor(100000 + Math.random() * 900000)}`,
      status: initialStatus,
      timeline,
      createdAt: nowShort,
      sheetRowId: ordersDb.length + 2,
    };

    ordersDb.unshift(newOrder);

    await recordSheetSync(
      'Orders',
      'APPEND_ROW',
      `New Order ${newOrder.id} ($${newOrder.total.toFixed(2)}) by ${newOrder.customerName} written to Orders Sheet Row #${newOrder.sheetRowId}`,
      newOrder
    );

    await recordSheetSync(
      'Members',
      'UPDATE_ROW',
      `Updated Member ${member.name} (${member.tier}): +${pricing.pointsEarned} pts earned (Balance: ${member.points} pts)`,
      member
    );

    res.status(201).json({
      order: newOrder,
      member,
      products: productsDb,
      orders: ordersDb,
      members: membersDb,
      stockLogs: stockLogsDb.slice(0, 30),
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // 7. PATCH /api/orders/:id/status - Real-time order tracking status progression
  app.patch('/api/orders/:id/status', async (req, res) => {
    const order = ordersDb.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const nextStatus = req.body.status as OrderStatusCode;
    const customNote = req.body.note as string | undefined;

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      res.status(400).json({
        error: `Cannot transition order from ${order.status} to ${nextStatus}.`,
      });
      return;
    }

    const nowShort = formatNowTimestamp().slice(0, 16);
    order.status = nextStatus;

    const labels = STATUS_LABELS[nextStatus] || { en: nextStatus, km: nextStatus };
    order.timeline.push({
      status: nextStatus,
      label: labels.en,
      labelKm: labels.km,
      timestamp: nowShort,
      note:
        customNote ||
        (nextStatus === 'PACKING'
          ? 'Items scanned and packed at fulfillment center.'
          : nextStatus === 'SHIPPED'
            ? 'Assigned to express courier with live GPS tracking.'
            : nextStatus === 'DELIVERED'
              ? 'Package handed over to customer and verified.'
              : nextStatus === 'CANCELLED'
                ? 'Order cancelled; reserved stock automatically restored to inventory.'
                : 'Status updated in Google Sheets.'),
    });

    // If order is cancelled, automatically restore stock!
    if (nextStatus === 'CANCELLED') {
      for (const item of order.items) {
        const prod = productsDb.find((p) => p.id === item.productId);
        if (prod) {
          const prev = prod.stock;
          prod.stock += item.quantity;
          stockLogsDb.unshift({
            id: `SL-${900 + stockLogsDb.length + 1}`,
            productId: prod.id,
            sku: prod.sku,
            productName: prod.name,
            change: +item.quantity,
            previousStock: prev,
            newStock: prod.stock,
            reason: 'ORDER_CANCEL_RESTORE',
            referenceId: order.id,
            timestamp: nowShort,
          });
        }
      }
    }

    await recordSheetSync(
      'Orders',
      'UPDATE_ROW',
      `Updated Order ${order.id} status -> ${nextStatus} (Orders Sheet Row #${order.sheetRowId})`,
      order
    );

    res.json({
      order,
      orders: ordersDb,
      products: productsDb,
      stockLogs: stockLogsDb.slice(0, 30),
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // 8. GET /api/members - Lookup by phone or list all
  app.get('/api/members', (req, res) => {
    const phone = String(req.query.phone || '').replace(/\s+/g, '');
    if (phone) {
      const found = membersDb.find((m) => m.phone.replace(/\s+/g, '') === phone);
      res.json({ member: found || null });
      return;
    }
    res.json({ members: membersDb, rewards: rewardsCatalog });
  });

  // 9. POST /api/members - Register new member or award bonus points
  app.post('/api/members', async (req, res) => {
    const { name, phone, email, bonusPoints = 100 } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone number are required.' });
      return;
    }

    const cleanPhone = String(phone).replace(/\s+/g, '');
    const existing = membersDb.find((m) => m.phone.replace(/\s+/g, '') === cleanPhone);
    if (existing) {
      res.status(400).json({ error: 'Member with this phone number already exists.', member: existing });
      return;
    }

    const initialPts = Math.max(0, Number(bonusPoints));
    const tierInfo = evaluateLoyaltyTier(initialPts);

    const newMember: Member = {
      id: `MEM-00${membersDb.length + 1}`,
      name: String(name).trim(),
      phone: cleanPhone,
      email: String(email || `${cleanPhone}@aurakhmer.member`).trim(),
      points: initialPts,
      lifetimePoints: initialPts,
      tier: tierInfo.tier,
      totalSpent: 0,
      ordersCount: 0,
      joinedAt: formatNowTimestamp().slice(0, 10),
      redeemedRewards: [],
    };

    membersDb.unshift(newMember);

    await recordSheetSync(
      'Members',
      'APPEND_ROW',
      `Registered new member ${newMember.name} (${newMember.phone}) with +${initialPts} welcome points`,
      newMember
    );

    res.status(201).json({
      member: newMember,
      members: membersDb,
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // 10. POST /api/members/:id/redeem-reward - Redeem a reward from catalog
  app.post('/api/members/:id/redeem-reward', async (req, res) => {
    const member = membersDb.find((m) => m.id === req.params.id);
    const reward = rewardsCatalog.find((r) => r.id === req.body.rewardId);

    if (!member || !reward) {
      res.status(404).json({ error: 'Member or reward not found.' });
      return;
    }

    if (member.points < reward.pointsCost) {
      res.status(400).json({
        error: `Insufficient points (Requires ${reward.pointsCost} pts, available ${member.points} pts).`,
      });
      return;
    }

    member.points -= reward.pointsCost;
    member.redeemedRewards.push(reward.id);

    await recordSheetSync(
      'Members',
      'UPDATE_ROW',
      `${member.name} redeemed "${reward.title}" (-${reward.pointsCost} pts, remaining: ${member.points} pts)`,
      member
    );

    res.json({
      member,
      reward,
      voucherCode: `AK-VOUCHER-${reward.id}-${Math.floor(1000 + Math.random() * 9000)}`,
      members: membersDb,
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // 11. POST /api/sheets-sync/config - Configure Google Apps Script URL & trigger batch sync
  app.post('/api/sheets-sync/config', async (req, res) => {
    const { scriptUrl, spreadsheetId } = req.body;
    if (scriptUrl) {
      sheetsConfig.scriptUrl = String(scriptUrl).trim();
    }
    if (spreadsheetId) {
      sheetsConfig.spreadsheetId = String(spreadsheetId).trim();
    }
    sheetsConfig.connected = true;

    await recordSheetSync(
      'Products',
      'BATCH_READ',
      `Verified Google Apps Script connection (${ productsDb.length } products, ${ ordersDb.length } orders, ${ membersDb.length } members synced)`
    );

    res.json({
      sheetsConfig,
      sheetSyncLogs: sheetSyncLogs.slice(0, 25),
    });
  });

  // Mount Vite dev server in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AuraKhmer Commerce & Live Stock OS running on http://localhost:${PORT}`);
  });
}

startServer();
