import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Package,
  Award,
  ArrowRight,
  QrCode,
  Truck,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { ProductVisual } from '../components/ProductVisual';
import {
  calculateOrderPricing,
  evaluateLoyaltyTier,
  getStockHealthStatus,
} from '../utils/commerceRules';
import type {
  Product,
  Order,
  Member,
  LoyaltyReward,
  PaymentMethod,
  OrderStatus,
} from '../types/commerce';

export type UserSubView = 'shop' | 'track' | 'rewards';

interface StorefrontViewProps {
  activeSubView: UserSubView;
  onChangeSubView: (view: UserSubView) => void;
  products: Product[];
  orders: Order[];
  members: Member[];
  rewards: LoyaltyReward[];
  cart: Array<{ productId: string; quantity: number }>;
  isCartOpen: boolean;
  onOpenCart: () => void;
  onCloseCart: () => void;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onSubmitOrder: (payload: {
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    cityProvince: string;
    paymentMethod: PaymentMethod;
    pointsToRedeem: number;
    items: Array<{ productId: string; quantity: number }>;
  }) => Promise<Order>;
  onRegisterMember: (name: string, phone: string, email: string) => Promise<Member>;
  onRedeemReward: (memberId: string, rewardId: string) => Promise<{ voucherCode: string }>;
}

const ORDER_STEPS: Array<{ status: OrderStatus; label: string; labelKm: string }> = [
  { status: 'PENDING', label: 'Order Placed', labelKm: 'បានដាក់បញ្ជាទិញ' },
  { status: 'PAID', label: 'Payment Verified', labelKm: 'ទូទាត់ប្រាក់រួច' },
  { status: 'PACKING', label: 'Packing', labelKm: 'កំពុងវេចខ្ចប់' },
  { status: 'SHIPPED', label: 'Out for Delivery', labelKm: 'កំពុងដឹកជញ្ជូន' },
  { status: 'DELIVERED', label: 'Delivered', labelKm: 'ដឹកជញ្ជូនជោគជ័យ' },
];

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  activeSubView,
  onChangeSubView,
  products,
  orders,
  members,
  rewards,
  cart,
  isCartOpen,
  onCloseCart,
  onAddToCart,
  onUpdateCartQuantity,
  onSubmitOrder,
  onRegisterMember,
  onRedeemReward,
}) => {
  // Catalog Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

  // Order Tracking States
  const [trackSearchInput, setTrackSearchInput] = useState<string>('ORD-1042');

  // Loyalty Member States
  const [memberPhoneLookup, setMemberPhoneLookup] = useState<string>('012345678');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [memberFeedback, setMemberFeedback] = useState<string | null>(null);
  const [redeemedVoucherBanner, setRedeemedVoucherBanner] = useState<string | null>(null);

  // Checkout Drawer States
  const [customerName, setCustomerName] = useState<string>('Sokha Chan (ចាន់ សុខា)');
  const [customerPhone, setCustomerPhone] = useState<string>('012345678');
  const [shippingAddress, setShippingAddress] = useState<string>('#42 Street 240, Daun Penh');
  const [cityProvince, setCityProvince] = useState<string>('Phnom Penh (ភ្នំពេញ)');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('KHQR');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState<boolean>(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const categories = ['ALL', 'Audio & Tech', 'Workspace', 'Coffee & Living'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nameKm.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart & Member Lookup for Checkout
  const cartDetails = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);
  }, [cart, products]);

  const checkoutMember = useMemo(() => {
    const clean = customerPhone.replace(/\s+/g, '');
    return members.find((m) => m.phone.replace(/\s+/g, '') === clean) || null;
  }, [members, customerPhone]);

  const pricingBreakdown = useMemo(() => {
    return calculateOrderPricing({
      items: cartDetails.map((c) => ({ price: c.product.price, quantity: c.quantity })),
      memberLifetimePoints: checkoutMember?.lifetimePoints ?? 0,
      availableMemberPoints: checkoutMember?.points ?? 0,
      requestedPointsToRedeem: useLoyaltyPoints ? (checkoutMember?.points ?? 0) : 0,
    });
  }, [cartDetails, checkoutMember, useLoyaltyPoints]);

  // Active Tracked Order
  const trackedOrder = useMemo(() => {
    const q = trackSearchInput.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return orders[0] || null;
    return (
      orders.find(
        (o) =>
          o.id.toLowerCase() === q ||
          o.id.toLowerCase().includes(q) ||
          o.customerPhone.replace(/\s+/g, '').includes(q)
      ) || null
    );
  }, [orders, trackSearchInput]);

  // Active Looked-up Member in Rewards View
  const activeLoyaltyMember = useMemo(() => {
    const clean = memberPhoneLookup.trim().replace(/\s+/g, '');
    return members.find((m) => m.phone.replace(/\s+/g, '') === clean) || null;
  }, [members, memberPhoneLookup]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setCheckoutError('សូមបំពេញឈ្មោះ លេខទូរស័ព្ទ និងអាសយដ្ឋានដឹកជញ្ជូនឱ្យបានគ្រប់គ្រាន់។');
      return;
    }

    if (cartDetails.length === 0) {
      setCheckoutError('កន្ត្រកទំនិញរបស់អ្នកទទេ។ សូមជ្រើសរើសទំនិញជាមុនសិន។');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const created = await onSubmitOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        cityProvince,
        paymentMethod,
        pointsToRedeem: pricingBreakdown.pointsRedeemed,
        items: cartDetails.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
      });
      setConfirmedOrder(created);
      setTrackSearchInput(created.id);
    } catch (err: any) {
      setCheckoutError(err?.message || 'មានបញ្ហាក្នុងការបញ្ជាទិញ។');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberFeedback(null);
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      setMemberFeedback('សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទដើម្បីចុះឈ្មោះសមាជិក។');
      return;
    }
    try {
      const created = await onRegisterMember(newMemberName, newMemberPhone, newMemberEmail);
      setMemberPhoneLookup(created.phone);
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberEmail('');
      setMemberFeedback(`ចុះឈ្មោះជោគជ័យ! អ្នកទទួលបាន +100 ពិន្ទុស្វាគមន៍ (${created.name})។`);
    } catch (err: any) {
      setMemberFeedback(err?.message || 'មិនអាចចុះឈ្មោះសមាជិកបានទេ។');
    }
  };

  const handleRedeemClick = async (reward: LoyaltyReward) => {
    if (!activeLoyaltyMember) return;
    try {
      const res = await onRedeemReward(activeLoyaltyMember.id, reward.id);
      setRedeemedVoucherBanner(
        `ប្តូររង្វាន់ជោគជ័យ៖ "${reward.titleKm}" · កូដប័ណ្ណរបស់អ្នកគឺ ${res.voucherCode}`
      );
    } catch (err: any) {
      setRedeemedVoucherBanner(err?.message || 'ពិន្ទុមិនគ្រប់គ្រាន់សម្រាប់ប្តូររង្វាន់នេះទេ។');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900">
      {/* SUBVIEW 1: SHOP CATALOG */}
      {activeSubView === 'shop' && (
        <div>
          {/* 1. Storefront Hero Section (Split-Screen Architectural Showcase) */}
          <section className="max-w-[1280px] mx-auto px-6 pt-8 pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-800 tracking-wide">
                    ហាងលក់ទំនិញអនឡាញទំនើប · ភ្ជាប់ប្រព័ន្ធស្តុក Google Sheets ស្វ័យប្រវត្តិ
                  </p>
                  <h1
                    className="font-bold text-stone-900 tracking-tight mt-3 leading-[1.15]"
                    style={{ fontSize: 'clamp(2rem, 3.4vw, 3.1rem)' }}
                  >
                    សម្ភារៈបច្ចេកវិទ្យា និងការរស់នៅប្រចាំថ្ងៃ ជាមួយប្រព័ន្ធទូទាត់ប្រាក់រហ័ស
                  </h1>
                  <p className="text-base text-stone-600 mt-4 leading-relaxed max-w-[60ch]">
                    ទិញទំនិញដោយទំនុកចិត្តជាមួយប្រព័ន្ធទូទាត់ KHQR, ABA PAY និងបង់ប្រាក់ពេលទទួលទំនិញ (COD)។
                    រាល់ការបញ្ជាទិញនឹងកាត់ស្តុកដោយស្វ័យប្រវត្តិ និងផ្តល់ពិន្ទុសមាជិកសម្រាប់ប្តូររង្វាន់ពិសេស។
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-200 flex flex-wrap items-center gap-4">
                  <a
                    href="#collection-grid"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>ទិញទំនិញឥឡូវនេះ (Shop Collection)</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onChangeSubView('track')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Package className="w-4 h-4 text-amber-800" />
                    <span>តាមដានការបញ្ជាទិញ (Track Order)</span>
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span>ដឹកជញ្ជូនឥតគិតថ្លៃចាប់ពី $50.00</span>
                  <span aria-hidden="true">·</span>
                  <span>សន្សំពិន្ទុសមាជិករហូតដល់ 2x</span>
                  <span aria-hidden="true">·</span>
                  <span>ទិន្នន័យស្តុកផ្ទាល់ពី Backend & Google Sheet</span>
                </div>
              </div>

              <div className="lg:col-span-6 min-h-[320px] lg:min-h-[440px]">
                <ProductVisual
                  visualKey="hero"
                  alt="AuraKhmer architectural studio workspace showcase"
                  className="w-full h-full"
                />
              </div>
            </div>
          </section>

          {/* 2. Featured Collection Grid */}
          <section id="collection-grid" className="max-w-[1280px] mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-200">
              <div>
                <p className="text-xs font-medium text-stone-500">
                  បញ្ជីទំនិញក្នុងស្តុកផ្ទាល់ · Live Inventory from FastAPI / Google Sheets
                </p>
                <h2 className="text-2xl font-bold text-stone-900 mt-1">
                  ទំនិញពេញនិយមប្រចាំហាង (Featured Collection)
                </h2>
              </div>

              {/* Filter & Search Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-stone-200/75 rounded-lg">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {cat === 'ALL' ? 'ទាំងអស់ (All)' : cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    aria-label="ស្វែងរកទំនិញ (Search products)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ស្វែងរកទំនិញ ឬ SKU..."
                    className="pl-9 pr-4 py-1.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 w-56"
                  />
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white border border-stone-200 rounded-xl mt-8">
                <p className="text-base font-medium text-stone-800">
                  មិនមានទំនិញត្រូវនឹងការស្វែងរករបស់អ្នកទេ។
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 cursor-pointer whitespace-nowrap shrink-0"
                >
                  បង្ហាញទំនិញទាំងអស់ឡើងវិញ (Reset Filters)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {filteredProducts.map((product) => {
                  const stockHealth = getStockHealthStatus(product.stock, product.minStockThreshold);
                  const inCartQty = cart.find((c) => c.productId === product.id)?.quantity ?? 0;

                  return (
                    <article
                      key={product.id}
                      className="group bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
                    >
                      <div>
                        {/* 70% height visual container */}
                        <div
                          onClick={() => setSelectedProductModal(product)}
                          className="h-60 w-full cursor-pointer relative"
                        >
                          <ProductVisual
                            visualKey={product.visualKey}
                            imageUrl={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full"
                          />
                        </div>

                        <div className="p-6">
                          {/* Unboxed Clean Metadata (Zero-Pill Rule) */}
                          <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                            <div className="flex items-center gap-1.5">
                              <span className="uppercase tracking-wider font-medium text-stone-500">
                                {product.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">{product.sku}</span>
                            </div>
                            <span
                              className={`font-mono-tabular font-medium ${
                                stockHealth === 'OUT_OF_STOCK'
                                  ? 'text-red-700'
                                  : stockHealth === 'LOW_STOCK'
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {stockHealth === 'OUT_OF_STOCK'
                                ? 'អស់ពីស្តុក (Out of Stock)'
                                : stockHealth === 'LOW_STOCK'
                                  ? `ជិតអស់ពីស្តុក (${product.stock} គ្រឿង)`
                                  : `មានក្នុងស្តុក (${product.stock} គ្រឿង)`}
                            </span>
                          </div>

                          <h3
                            onClick={() => setSelectedProductModal(product)}
                            className="text-base font-semibold text-stone-900 mt-2 cursor-pointer hover:text-amber-800 transition-colors"
                          >
                            {product.nameKm}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">{product.name}</p>
                          <p className="text-sm text-stone-600 mt-2.5 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[15px] font-bold font-mono-tabular text-stone-900">
                            ${product.price.toFixed(2)}
                          </div>
                          <div className="text-xs text-stone-500 font-mono-tabular">
                            +{Math.floor(product.price * 10)} ពិន្ទុសមាជិក
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProductModal(product)}
                            className="px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            លម្អិត
                          </button>
                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() => onAddToCart(product.id, 1)}
                            aria-label={`Add ${product.name} to cart`}
                            className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {inCartQty > 0
                              ? `ក្នុងកន្ត្រក (${inCartQty}) +១`
                              : 'ដាក់ចូលកន្ត្រក'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. Craftsmanship, Automated Stock & Loyalty Value Proposition */}
          <section className="max-w-[1280px] mx-auto px-6 py-12">
            <div className="bg-white border border-stone-200 rounded-2xl p-8 lg:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-mono-tabular text-amber-800 font-semibold">01. EASY PAYMENT</p>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  ប្រព័ន្ធទូទាត់ប្រាក់ងាយស្រួល និងរហ័ស
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  គាំទ្រការស្កេនបង់ប្រាក់តាម Bakong KHQR គ្រប់ធនាគារ, ABA PAY, Wing Bank និងសេវាបង់ប្រាក់ពេលទទួលទំនិញដល់ផ្ទះ (Cash on Delivery)។
                </p>
              </div>
              <div>
                <p className="text-xs font-mono-tabular text-amber-800 font-semibold">02. AUTO STOCK SYNC</p>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  កាត់ស្តុក និងបញ្ជាទិញបន្ថែមស្វ័យប្រវត្តិ
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  ភ្ជាប់ផ្ទាល់ជាមួយ Google Sheets & Apps Script។ នៅពេលស្តុកធ្លាក់ដល់កម្រិតកំណត់ (Threshold) ប្រព័ន្ធនឹងបញ្ចូលស្តុកថ្មី (Auto-Restock) ភ្លាមៗ។
                </p>
              </div>
              <div>
                <p className="text-xs font-mono-tabular text-amber-800 font-semibold">03. LOYALTY REWARDS</p>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  ប្រព័ន្ធសមាជិកផ្តល់រង្វាន់ជាប្រចាំ
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  រាល់ការចំណាយ $1 ទទួលបាន 10–20 ពិន្ទុ តាមលំដាប់សមាជិក (Bronze, Silver, Gold, Platinum) សម្រាប់ប្តូរយកការបញ្ចុះតម្លៃភ្លាមៗ។
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SUBVIEW 2: REAL-TIME ORDER TRACKING */}
      {activeSubView === 'track' && (
        <section className="max-w-[1100px] mx-auto px-6 py-10">
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
              <div>
                <p className="text-xs font-medium text-amber-800">
                  តាមដានការបញ្ជាទិញក្នុងពេលជាក់ស្តែង · Real-Time Order Pipeline
                </p>
                <h1 className="text-2xl font-bold text-stone-900 mt-1">
                  ពិនិត្យស្ថានភាពការបញ្ជាទិញរបស់អ្នក (Live Order Tracking)
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label="បញ្ចូលលេខកូដបញ្ជាទិញ ឬលេខទូរស័ព្ទ"
                  value={trackSearchInput}
                  onChange={(e) => setTrackSearchInput(e.target.value)}
                  placeholder="ឧ. ORD-1042 ឬ 012345678"
                  className="px-3.5 py-2 text-sm font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 w-60"
                />
              </div>
            </div>

            {/* Quick Select Sample Orders */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-600">
              <span>ការបញ្ជាទិញថ្មីៗ៖</span>
              {orders.slice(0, 5).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setTrackSearchInput(o.id)}
                  className={`px-2.5 py-1 font-mono-tabular rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    trackedOrder?.id === o.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {o.id} ({o.status})
                </button>
              ))}
            </div>

            {!trackedOrder ? (
              <div className="py-12 text-center">
                <p className="text-sm text-stone-600">
                  រកមិនឃើញការបញ្ជាទិញសម្រាប់ "{trackSearchInput}" ទេ។ សូមសាកល្បងលេខកូដ ORD-1042 ឬលេខទូរស័ព្ទ 012345678។
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {/* Order Summary Header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-stone-50 border border-stone-200 rounded-xl">
                  <div>
                    <div className="text-xs text-stone-500">លេខកូដបញ្ជាទិញ (Order ID)</div>
                    <div className="text-base font-bold font-mono-tabular text-stone-900 mt-0.5">
                      {trackedOrder.id}
                    </div>
                    <div className="text-xs text-stone-500 font-mono-tabular mt-0.5">
                      Google Sheet Row #{trackedOrder.sheetRowId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">អតិថិជន (Customer)</div>
                    <div className="text-sm font-semibold text-stone-900 mt-0.5">
                      {trackedOrder.customerName}
                    </div>
                    <div className="text-xs font-mono-tabular text-stone-600">
                      {trackedOrder.customerPhone} · {trackedOrder.cityProvince}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">ការទូទាត់ (Payment)</div>
                    <div className="text-sm font-semibold font-mono-tabular text-stone-900 mt-0.5">
                      {trackedOrder.paymentMethod} · ${trackedOrder.total.toFixed(2)}
                    </div>
                    <div className="text-xs font-mono-tabular text-emerald-700">
                      +{trackedOrder.pointsEarned} ពិន្ទុសមាជិក
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">ស្ថានភាពបច្ចុប្បន្ន (Current Status)</div>
                    <div className="text-sm font-bold text-amber-800 mt-0.5">
                      {trackedOrder.status}
                    </div>
                    <div className="text-xs text-stone-500 font-mono-tabular">
                      {trackedOrder.createdAt}
                    </div>
                  </div>
                </div>

                {/* 5-Stage Visual Progress Pipeline */}
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-4">
                    ដំណើរការដឹកជញ្ជូនផ្ទាល់ (5-Stage Live Fulfillment Pipeline)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {ORDER_STEPS.map((step, index) => {
                      const statusOrder = ['PENDING', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED'];
                      const currentIdx = statusOrder.indexOf(trackedOrder.status);
                      const isCompleted = currentIdx >= index && trackedOrder.status !== 'CANCELLED';
                      const isCurrent = currentIdx === index;

                      return (
                        <div
                          key={step.status}
                          className={`p-4 rounded-xl border transition-colors ${
                            isCurrent
                              ? 'bg-amber-50/80 border-amber-700 text-stone-900'
                              : isCompleted
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-stone-50 text-stone-400 border-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono-tabular">
                            <span>0{index + 1}</span>
                            <span>{isCompleted ? '✓' : '—'}</span>
                          </div>
                          <div className="text-sm font-bold mt-2">{step.labelKm}</div>
                          <div className="text-xs opacity-80 mt-0.5">{step.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Timeline & Itemized Receipt */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-stone-200">
                  <div className="lg:col-span-7">
                    <h3 className="text-sm font-bold text-stone-900 mb-4">
                      កំណត់ត្រាពេលវេលាជាក់ស្តែង (Live Event Log)
                    </h3>
                    <div className="space-y-4">
                      {trackedOrder.timeline.map((event, idx) => (
                        <div
                          key={`${event.status}-${idx}`}
                          className="p-4 bg-stone-50 border border-stone-200 rounded-lg flex items-start justify-between gap-4"
                        >
                          <div>
                            <div className="text-sm font-semibold text-stone-900">
                              {event.labelKm} · <span className="text-stone-600 font-normal">{event.label}</span>
                            </div>
                            <p className="text-xs text-stone-600 mt-1">{event.note}</p>
                          </div>
                          <span className="text-xs font-mono-tabular text-stone-500 whitespace-nowrap shrink-0">
                            {event.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <h3 className="text-sm font-bold text-stone-900 mb-4">
                      បញ្ជីទំនិញក្នុងវិក្កយបត្រ (Order Receipt)
                    </h3>
                    <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                      {trackedOrder.items.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium text-stone-900">{item.nameKm}</span>
                            <span className="text-xs font-mono-tabular text-stone-500 ml-2">
                              ×{item.quantity}
                            </span>
                          </div>
                          <span className="font-mono-tabular font-medium text-stone-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}

                      <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs text-stone-600">
                        <div className="flex justify-between font-mono-tabular">
                          <span>សរុបបឋម (Subtotal)</span>
                          <span>${trackedOrder.subtotal.toFixed(2)}</span>
                        </div>
                        {trackedOrder.tierDiscount > 0 && (
                          <div className="flex justify-between font-mono-tabular text-emerald-700">
                            <span>បញ្ចុះតម្លៃសមាជិក ({trackedOrder.memberTier})</span>
                            <span>-${trackedOrder.tierDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        {trackedOrder.pointsDiscount > 0 && (
                          <div className="flex justify-between font-mono-tabular text-emerald-700">
                            <span>ប្តូរពិន្ទុសមាជិក ({trackedOrder.pointsRedeemed} pts)</span>
                            <span>-${trackedOrder.pointsDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-mono-tabular">
                          <span>ថ្លៃដឹកជញ្ជូន (Shipping)</span>
                          <span>
                            {trackedOrder.shippingFee === 0 ? 'ឥតគិតថ្លៃ ($0.00)' : `$${trackedOrder.shippingFee.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-stone-900 font-mono-tabular pt-2 border-t border-stone-200">
                          <span>សរុបទឹកប្រាក់ (Total)</span>
                          <span>${trackedOrder.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* SUBVIEW 3: LOYALTY MEMBERSHIP & CUSTOMER REWARDS */}
      {activeSubView === 'rewards' && (
        <section className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
              <div>
                <p className="text-xs font-medium text-amber-800">
                  ប្រព័ន្ធសមាជិកដើម្បីផ្តល់រង្វាន់ដល់អតិថិជនជាប្រចាំ · Customer Loyalty & Tier Rewards
                </p>
                <h1 className="text-2xl font-bold text-stone-900 mt-1">
                  ពិនិត្យពិន្ទុសមាជិក និងប្តូរយករង្វាន់ (Loyalty Rewards Club)
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="member-lookup-phone" className="text-xs font-medium text-stone-600">
                  លេខទូរស័ព្ទសមាជិក៖
                </label>
                <input
                  id="member-lookup-phone"
                  type="text"
                  value={memberPhoneLookup}
                  onChange={(e) => setMemberPhoneLookup(e.target.value)}
                  placeholder="012345678"
                  className="px-3.5 py-2 text-sm font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 w-48"
                />
              </div>
            </div>

            {/* Quick Member Switcher for Demo Verification */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-600">
              <span>គណនីសមាជិកគំរូ៖</span>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberPhoneLookup(m.phone)}
                  className={`px-3 py-1 font-mono-tabular rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeLoyaltyMember?.id === m.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {m.name} · {m.tier} ({m.points} pts)
                </button>
              ))}
            </div>

            {redeemedVoucherBanner && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-medium text-emerald-900 flex items-center justify-between">
                <span>{redeemedVoucherBanner}</span>
                <button
                  type="button"
                  onClick={() => setRedeemedVoucherBanner(null)}
                  className="text-xs underline cursor-pointer ml-4"
                >
                  បិទ
                </button>
              </div>
            )}

            {activeLoyaltyMember ? (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Active Member Status Card */}
                <div className="lg:col-span-5 bg-stone-900 text-stone-100 rounded-2xl p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-400 font-mono-tabular">
                      <span>AURAKHMER MEMBER PASS</span>
                      <span>ID: {activeLoyaltyMember.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-3">{activeLoyaltyMember.name}</h2>
                    <p className="text-xs font-mono-tabular text-amber-400 mt-1">
                      លំដាប់សមាជិក៖ {activeLoyaltyMember.tier} Tier · ទូរស័ព្ទ {activeLoyaltyMember.phone}
                    </p>

                    <div className="mt-6 pt-6 border-t border-stone-800 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-stone-400">ពិន្ទុអាចប្រើបាន (Available Points)</div>
                        <div className="text-2xl font-bold font-mono-tabular text-amber-400 mt-1">
                          {activeLoyaltyMember.points.toLocaleString()} pts
                        </div>
                        <div className="text-xs text-stone-400 font-mono-tabular mt-0.5">
                          ស្មើនឹងទឹកប្រាក់បញ្ចុះតម្លៃ ${(Math.floor(activeLoyaltyMember.points / 100)).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-stone-400">ការទិញសរុប (Total Spent)</div>
                        <div className="text-2xl font-bold font-mono-tabular text-white mt-1">
                          ${activeLoyaltyMember.totalSpent.toFixed(2)}
                        </div>
                        <div className="text-xs text-stone-400 font-mono-tabular mt-0.5">
                          បញ្ជាទិញចំនួន {activeLoyaltyMember.ordersCount} ដង
                        </div>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const tierInfo = evaluateLoyaltyTier(activeLoyaltyMember.lifetimePoints);
                    return (
                      <div className="mt-8 pt-5 border-t border-stone-800 text-xs text-stone-300">
                        <div className="flex justify-between font-mono-tabular">
                          <span>អត្ថប្រយោជន៍បច្ចុប្បន្ន៖ បញ្ចុះតម្លៃ {(tierInfo.discountRate * 100).toFixed(0)}% ស្វ័យប្រវត្តិ</span>
                          <span>គុណពិន្ទុ {tierInfo.pointsMultiplier}x</span>
                        </div>
                        {tierInfo.nextTier && (
                          <p className="text-stone-400 mt-2">
                            ត្រូវការ <strong className="text-white font-mono-tabular">{tierInfo.pointsToNextTier} ពិន្ទុ</strong> ទៀតដើម្បីឡើងទៅកាន់លំដាប់ {tierInfo.nextTier}។
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Rewards Redemption Catalog */}
                <div className="lg:col-span-7">
                  <h3 className="text-base font-bold text-stone-900 mb-4">
                    បញ្ជីរង្វាន់សម្រាប់អតិថិជនប្រចាំ (Redeemable Member Rewards)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rewards.map((reward) => {
                      const canAfford = activeLoyaltyMember.points >= reward.pointsCost;
                      return (
                        <div
                          key={reward.id}
                          className="p-5 bg-stone-50 border border-stone-200 rounded-xl flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs font-mono-tabular text-stone-500">
                              <span>Min Tier: {reward.minTier}</span>
                              <span className="font-bold text-amber-800">{reward.pointsCost} pts</span>
                            </div>
                            <h4 className="text-sm font-bold text-stone-900 mt-2">{reward.titleKm}</h4>
                            <p className="text-xs text-stone-600 mt-1">{reward.description}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between">
                            <span className="text-xs font-mono-tabular text-stone-600">
                              តម្លៃរង្វាន់៖ ${reward.discountValue.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => handleRedeemClick(reward)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              {canAfford ? 'ប្តូរយករង្វាន់ (Redeem)' : 'ពិន្ទុមិនគ្រប់'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-6 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600">
                មិនទាន់មានគណនីសមាជិកសម្រាប់លេខទូរស័ព្ទនេះទេ។ សូមចុះឈ្មោះខាងក្រោមដើម្បីទទួលបាន +100 ពិន្ទុស្វាគមន៍ភ្លាមៗ!
              </div>
            )}
          </div>

          {/* Instant Member Registration Form */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-stone-900">
              ចុះឈ្មោះសមាជិកថ្មីដោយឥតគិតថ្លៃ (ទទួលបាន +100 ពិន្ទុភ្លាមៗ)
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              ទិន្នន័យសមាជិកនឹងត្រូវបានរក្សាទុកក្នុងផ្ទាំង Members នៃ Google Sheet ដោយស្វ័យប្រវត្តិ។
            </p>

            {memberFeedback && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-medium text-amber-900">
                {memberFeedback}
              </div>
            )}

            <form onSubmit={handleCreateMemberSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label htmlFor="reg-member-name" className="block text-xs font-medium text-stone-700 mb-1">
                  ឈ្មោះអតិថិជន (Full Name)
                </label>
                <input
                  id="reg-member-name"
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="ឧ. វណ្ណា សុខ (Vanna Sok)"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="reg-member-phone" className="block text-xs font-medium text-stone-700 mb-1">
                  លេខទូរស័ព្ទ (Phone Number)
                </label>
                <input
                  id="reg-member-phone"
                  type="text"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="ឧ. 015889900"
                  className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="reg-member-email" className="block text-xs font-medium text-stone-700 mb-1">
                  អ៊ីមែល (Email - Optional)
                </label>
                <input
                  id="reg-member-email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="vanna@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  ចុះឈ្មោះសមាជិក (+100 pts)
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* PRODUCT DETAIL MODAL (Contiguous Purchase Module) */}
      {selectedProductModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selectedProductModal.name}
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-6 min-h-[280px]">
              <ProductVisual
                visualKey={selectedProductModal.visualKey}
                imageUrl={selectedProductModal.imageUrl}
                alt={selectedProductModal.name}
                className="w-full h-full"
              />
            </div>
            <div className="md:col-span-6 p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-mono-tabular">
                    {selectedProductModal.category} · {selectedProductModal.sku}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedProductModal(null)}
                    aria-label="Close product detail modal"
                    className="p-1 text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-xl font-bold text-stone-900 mt-2">{selectedProductModal.nameKm}</h2>
                <p className="text-xs text-stone-500">{selectedProductModal.name}</p>

                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-2xl font-bold font-mono-tabular text-stone-900">
                    ${selectedProductModal.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-mono-tabular text-emerald-700">
                    ស្តុកនៅសល់៖ {selectedProductModal.stock} គ្រឿង (Auto-Restock @ ≤{selectedProductModal.minStockThreshold})
                  </span>
                </div>

                <p className="text-sm text-stone-600 mt-4 leading-relaxed">
                  {selectedProductModal.description}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-stone-200 pt-4 text-xs text-stone-600">
                  {selectedProductModal.specs.map((spec) => (
                    <li key={spec} className="flex items-center gap-2">
                      <span>·</span>
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-200 flex items-center gap-3">
                <button
                  type="button"
                  disabled={selectedProductModal.stock <= 0}
                  onClick={() => {
                    onAddToCart(selectedProductModal.id, 1);
                    setSelectedProductModal(null);
                  }}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  ដាក់ចូលកន្ត្រក និងទូទាត់ប្រាក់ (Add to Cart)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER CART & EASY PAYMENT CHECKOUT DRAWER */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Cart and Easy Checkout"
        >
          <div className="bg-white w-full max-w-xl h-full flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  កន្ត្រកទំនិញ និងប្រព័ន្ធទូទាត់ប្រាក់រហ័ស (Easy Checkout)
                </h2>
                <p className="text-xs text-stone-500">
                  កាត់ស្តុកស្វ័យប្រវត្តិ និងផ្តល់ពិន្ទុសមាជិកភ្លាមៗក្នុង Google Sheet
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onCloseCart();
                }}
                aria-label="បិទកន្ត្រកទំនិញ (Close Cart)"
                className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmedOrder ? (
              /* POST-ORDER CONFIRMATION RECEIPT */
              <div className="p-6 space-y-6 flex-1">
                <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span>ការបញ្ជាទិញជោគជ័យ! ({confirmedOrder.id})</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed">
                    ទិន្នន័យបញ្ជាទិញត្រូវបានកត់ត្រាចូល Google Sheets (Row #{confirmedOrder.sheetRowId}) ហើយស្តុកទំនិញត្រូវបានកាត់ដោយស្វ័យប្រវត្តិ។
                  </p>
                  <div className="mt-4 pt-3 border-t border-emerald-200 grid grid-cols-2 gap-3 text-xs font-mono-tabular text-emerald-950">
                    <div>ការទូទាត់៖ {confirmedOrder.paymentMethod}</div>
                    <div>សរុប៖ ${confirmedOrder.total.toFixed(2)}</div>
                    <div>ពិន្ទុទទួលបាន៖ +{confirmedOrder.pointsEarned} pts</div>
                    <div>ស្ថានភាព៖ {confirmedOrder.status}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const orderId = confirmedOrder.id;
                      setConfirmedOrder(null);
                      onCloseCart();
                      setTrackSearchInput(orderId);
                      onChangeSubView('track');
                    }}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    តាមដានការបញ្ជាទិញផ្ទាល់ (Track Order)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedOrder(null);
                      onCloseCart();
                    }}
                    className="py-2.5 px-4 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    បន្តទិញទំនិញ
                  </button>
                </div>
              </div>
            ) : cartDetails.length === 0 ? (
              <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-stone-300 mb-3" />
                <p className="text-base font-semibold text-stone-800">មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ</p>
                <p className="text-xs text-stone-500 mt-1">
                  សូមជ្រើសរើសទំនិញពីតារាងដើម្បីគណនាពិន្ទុសមាជិក និងទូទាត់ប្រាក់។
                </p>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-6 flex-1">
                {/* 1. Cart Items List */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    បញ្ជីទំនិញដែលបានជ្រើសរើស ({cartDetails.length})
                  </div>
                  {cartDetails.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-900 truncate">{product.nameKm}</div>
                        <div className="text-xs font-mono-tabular text-stone-500">
                          ${product.price.toFixed(2)} · ស្តុកនៅសល់ {product.stock}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${product.name}`}
                          onClick={() => onUpdateCartQuantity(product.id, quantity - 1)}
                          className="p-1.5 bg-white border border-stone-300 rounded-md hover:bg-stone-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-mono-tabular font-semibold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          disabled={quantity >= product.stock}
                          aria-label={`Increase quantity of ${product.name}`}
                          onClick={() => onUpdateCartQuantity(product.id, quantity + 1)}
                          className="p-1.5 bg-white border border-stone-300 rounded-md hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${product.name} from cart`}
                          onClick={() => onUpdateCartQuantity(product.id, 0)}
                          className="p-1.5 text-stone-400 hover:text-red-600 cursor-pointer ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Customer Delivery & Loyalty Member Phone Lookup */}
                <div className="space-y-3 pt-4 border-t border-stone-200">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    ព័ត៌មានដឹកជញ្ជូន និងសមាជិកភាព (Customer & Member Lookup)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="checkout-phone" className="block text-xs font-medium text-stone-700 mb-1">
                        លេខទូរស័ព្ទ (ភ្ជាប់ពិន្ទុសមាជិកស្វ័យប្រវត្តិ)
                      </label>
                      <input
                        id="checkout-phone"
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="012345678"
                        className="w-full px-3 py-2 text-sm font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-name" className="block text-xs font-medium text-stone-700 mb-1">
                        ឈ្មោះអតិថិជន (Customer Name)
                      </label>
                      <input
                        id="checkout-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Sokha Chan"
                        className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {checkoutMember ? (
                    <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-stone-900">
                          សមាជិក {checkoutMember.tier} ({checkoutMember.name})
                        </span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="font-mono-tabular text-amber-900">
                          មាន {checkoutMember.points} ពិន្ទុ
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-900 shrink-0">
                        <input
                          type="checkbox"
                          checked={useLoyaltyPoints}
                          onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                          className="rounded border-stone-400"
                        />
                        <span>ប្រើពិន្ទុបញ្ចុះតម្លៃ</span>
                      </label>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">
                      លេខទូរស័ព្ទថ្មីនឹងត្រូវបានចុះឈ្មោះជាសមាជិកថ្មីដោយស្វ័យប្រវត្តិនៅពេលបញ្ជាទិញ។
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label htmlFor="checkout-address" className="block text-xs font-medium text-stone-700 mb-1">
                        អាសយដ្ឋានដឹកជញ្ជូន (Delivery Address)
                      </label>
                      <input
                        id="checkout-address"
                        type="text"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="#42 Street 240, Daun Penh"
                        className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-city" className="block text-xs font-medium text-stone-700 mb-1">
                        រាជធានី/ខេត្ត
                      </label>
                      <select
                        id="checkout-city"
                        value={cityProvince}
                        onChange={(e) => setCityProvince(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg"
                      >
                        <option value="Phnom Penh (ភ្នំពេញ)">Phnom Penh (ភ្នំពេញ)</option>
                        <option value="Siem Reap (សៀមរាប)">Siem Reap (សៀមរាប)</option>
                        <option value="Battambang (បាត់ដំបង)">Battambang (បាត់ដំបង)</option>
                        <option value="Sihanoukville (ព្រះសីហនុ)">Sihanoukville (ព្រះសីហនុ)</option>
                        <option value="Kampot (កំពត)">Kampot (កំពត)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Easy Payment System Selector */}
                <div className="space-y-3 pt-4 border-t border-stone-200">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    ជ្រើសរើសមធ្យោបាយទូទាត់ប្រាក់ងាយស្រួល (Easy Payment System)
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'KHQR', label: 'Bakong KHQR', sub: 'ស្កេនគ្រប់ធនាគារ' },
                        { id: 'ABA_PAY', label: 'ABA PAY', sub: 'ទូទាត់រហ័ស' },
                        { id: 'WING', label: 'Wing Bank', sub: 'Wing គណនី' },
                        { id: 'COD', label: 'Cash (COD)', sub: 'បង់ពេលទទួល' },
                      ] as const
                    ).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          paymentMethod === pm.id
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <div className="text-xs font-bold font-mono-tabular">{pm.label}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{pm.sub}</div>
                      </button>
                    ))}
                  </div>

                  {paymentMethod !== 'COD' && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-4">
                      <div className="w-16 h-16 bg-white border border-stone-300 rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-11 h-11 text-stone-900" />
                      </div>
                      <div className="text-xs text-stone-600 leading-relaxed">
                        <div className="font-bold text-stone-900">
                          {paymentMethod} Dynamic QR · សរុប ${pricingBreakdown.total.toFixed(2)}
                        </div>
                        <p className="mt-0.5">
                          ស្កេនកូដ QR ឬចុចប៊ូតុងបញ្ជាក់ខាងក្រោមដើម្បីទូទាត់ និងកាត់ស្តុកក្នុង Google Sheet ភ្លាមៗ។
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Order Pricing Summary */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between font-mono-tabular text-stone-600">
                    <span>តម្លៃទំនិញសរុប (Subtotal)</span>
                    <span>${pricingBreakdown.subtotal.toFixed(2)}</span>
                  </div>
                  {pricingBreakdown.tierDiscount > 0 && (
                    <div className="flex justify-between font-mono-tabular text-emerald-700">
                      <span>
                        បញ្ចុះតម្លៃសមាជិក {pricingBreakdown.tier} (-{(pricingBreakdown.tierDiscountRate * 100).toFixed(0)}%)
                      </span>
                      <span>-${pricingBreakdown.tierDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {pricingBreakdown.pointsDiscount > 0 && (
                    <div className="flex justify-between font-mono-tabular text-emerald-700">
                      <span>ប្តូរពិន្ទុសមាជិក ({pricingBreakdown.pointsRedeemed} pts)</span>
                      <span>-${pricingBreakdown.pointsDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono-tabular text-stone-600">
                    <span>ថ្លៃដឹកជញ្ជូន (Free ≥ $50.00)</span>
                    <span>
                      {pricingBreakdown.shippingFee === 0 ? 'ឥតគិតថ្លៃ ($0.00)' : `$${pricingBreakdown.shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex justify-between text-base font-bold text-stone-900 font-mono-tabular">
                    <span>ទឹកប្រាក់ត្រូវទូទាត់ (Total)</span>
                    <span>${pricingBreakdown.total.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] font-mono-tabular text-amber-800 pt-1">
                    អ្នកនឹងទទួលបាន +{pricingBreakdown.pointsEarned} ពិន្ទុសមាជិកសម្រាប់ការបញ្ជាទិញនេះ
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs font-medium text-red-800">
                    {checkoutError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full py-3 px-5 text-sm font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {isSubmittingOrder
                    ? 'កំពុងដំណើរការបញ្ជាទិញ និងកាត់ស្តុក...'
                    : `បញ្ជាក់ការបញ្ជាទិញ និងទូទាត់ប្រាក់ ($${pricingBreakdown.total.toFixed(2)})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
