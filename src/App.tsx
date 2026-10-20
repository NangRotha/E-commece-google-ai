/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StorefrontView, type UserSubView } from './frontend-user/StorefrontView';
import { AdminDashboardView, type AdminTab } from './frontend-admin/AdminDashboardView';
import type {
  Product,
  Order,
  Member,
  LoyaltyReward,
  StockLog,
  SheetSyncRecord,
  SheetsConnectionConfig,
  PaymentMethod,
  ProductCategory,
} from './types/commerce';
import type { OrderStatusCode } from './utils/commerceRules';

type AppWorkspace = 'user' | 'admin';

export default function App() {
  const [workspace, setWorkspace] = useState<AppWorkspace>('user');
  const [userSubView, setUserSubView] = useState<UserSubView>('shop');
  const [adminTab, setAdminTab] = useState<AdminTab>('orders');

  // Shared Backend State (Fetched from /api/bootstrap)
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConnectionConfig>({
    scriptUrl: 'https://script.google.com/macros/s/AKfycbx_AuraKhmer_Commerce_SheetBridge_v1/exec',
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    connected: true,
    lastSyncedAt: '2026-10-19 17:05:12',
    totalRowsSynced: 15,
  });
  const [sheetSyncLogs, setSheetSyncLogs] = useState<SheetSyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Shopping Cart State (frontend-user)
  const [cart, setCart] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: 'PRD-103', quantity: 1 },
  ]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const loadBootstrapData = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Failed to load backend data');
      const data = await res.json();
      setProducts(data.products || []);
      setOrders(data.orders || []);
      setMembers(data.members || []);
      setRewards(data.rewards || []);
      setStockLogs(data.stockLogs || []);
      if (data.sheetsConfig) setSheetsConfig(data.sheetsConfig);
      if (data.sheetSyncLogs) setSheetSyncLogs(data.sheetSyncLogs);
    } catch (err) {
      console.error('Error fetching bootstrap data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrapData();
  }, [loadBootstrapData]);

  // Cart Handlers
  const handleAddToCart = (productId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { productId, quantity: Math.min(product.stock, quantity) }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : quantity;
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(maxStock, quantity) } : i
      )
    );
  };

  // Order Submission Handler (POST /api/orders)
  const handleSubmitOrder = async (payload: {
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    cityProvince: string;
    paymentMethod: PaymentMethod;
    pointsToRedeem: number;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<Order> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Order submission failed');
    }
    setProducts(data.products);
    setOrders(data.orders);
    setMembers(data.members);
    setStockLogs(data.stockLogs);
    setSheetSyncLogs(data.sheetSyncLogs);
    setCart([]);
    return data.order;
  };

  // Order Status Progression Handler (PATCH /api/orders/:id/status)
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatusCode) => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrders(data.orders);
      setProducts(data.products);
      setStockLogs(data.stockLogs);
      setSheetSyncLogs(data.sheetSyncLogs);
    }
  };

  // Stock Adjustment Handler (PATCH /api/products/:id/stock)
  const handleAdjustStock = async (
    productId: string,
    delta: number,
    autoRestockEnabled?: boolean
  ) => {
    const res = await fetch(`/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, autoRestockEnabled }),
    });
    const data = await res.json();
    if (res.ok) {
      setProducts(data.products);
      setStockLogs(data.stockLogs);
      setSheetSyncLogs(data.sheetSyncLogs);
    }
  };

  // Create Product Handler (POST /api/products)
  const handleCreateProduct = async (payload: {
    name: string;
    nameKm: string;
    sku: string;
    category: ProductCategory;
    price: number;
    stock: number;
    minStockThreshold: number;
    autoRestockEnabled: boolean;
    autoRestockAmount: number;
    visualKey: string;
    description: string;
  }) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      setProducts(data.products);
      loadBootstrapData();
    }
  };

  // Member Registration Handler (POST /api/members)
  const handleRegisterMember = async (
    name: string,
    phone: string,
    email: string
  ): Promise<Member> => {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register member');
    }
    setMembers(data.members);
    setSheetSyncLogs(data.sheetSyncLogs);
    return data.member;
  };

  // Reward Redemption Handler (POST /api/members/:id/redeem-reward)
  const handleRedeemReward = async (
    memberId: string,
    rewardId: string
  ): Promise<{ voucherCode: string }> => {
    const res = await fetch(`/api/members/${memberId}/redeem-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to redeem reward');
    }
    setMembers(data.members);
    setSheetSyncLogs(data.sheetSyncLogs);
    return { voucherCode: data.voucherCode };
  };

  // Save Google Sheets Connection Config
  const handleSaveSheetsConfig = async (scriptUrl: string, spreadsheetId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheets-sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl, spreadsheetId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSheetsConfig(data.sheetsConfig);
        setSheetSyncLogs(data.sheetSyncLogs);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-3 md:gap-8 px-4 md:px-6 py-3.5 bg-white border-b border-stone-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#storefront"
          onClick={(e) => {
            e.preventDefault();
            setWorkspace('user');
            setUserSubView('shop');
          }}
          className="text-base md:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
        >
          AuraKhmer
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          className="flex items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-stone-600 overflow-x-auto no-scrollbar"
          aria-label="Primary Navigation"
        >
          <a
            href="#shop"
            onClick={(e) => {
              e.preventDefault();
              setWorkspace('user');
              setUserSubView('shop');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'user' && userSubView === 'shop'
                ? 'text-stone-900 underline underline-offset-8 decoration-2 decoration-amber-700'
                : ''
            }`}
          >
            ហាងទំនិញ (Shop)
          </a>

          <a
            href="#track"
            onClick={(e) => {
              e.preventDefault();
              setWorkspace('user');
              setUserSubView('track');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'user' && userSubView === 'track'
                ? 'text-stone-900 underline underline-offset-8 decoration-2 decoration-amber-700'
                : ''
            }`}
          >
            តាមដានការបញ្ជាទិញ (Track)
          </a>

          <a
            href="#rewards"
            onClick={(e) => {
              e.preventDefault();
              setWorkspace('user');
              setUserSubView('rewards');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'user' && userSubView === 'rewards'
                ? 'text-stone-900 underline underline-offset-8 decoration-2 decoration-amber-700'
                : ''
            }`}
          >
            សមាជិកភាព (Rewards)
          </a>

          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              setWorkspace('admin');
              setAdminTab('orders');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'admin' && adminTab !== 'sheets'
                ? 'text-stone-900 underline underline-offset-8 decoration-2 decoration-amber-700'
                : ''
            }`}
          >
            ផ្ទាំងគ្រប់គ្រង (Admin)
          </a>

          <a
            href="#3-projects"
            onClick={(e) => {
              e.preventDefault();
              setWorkspace('admin');
              setAdminTab('sheets');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'admin' && adminTab === 'sheets'
                ? 'text-stone-900 underline underline-offset-8 decoration-2 decoration-amber-700'
                : ''
            }`}
          >
            3-Project Vercel
          </a>
        </nav>

        {/* Zone 3: 1 primary action button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setWorkspace('user');
              setIsCartOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-amber-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 font-mono-tabular"
          >
            កន្ត្រកទំនិញ ({totalCartItems})
          </button>
        </div>
      </header>

      {/* Main Viewport Content */}
      {isLoading ? (
        <div className="max-w-[1280px] w-full mx-auto px-6 py-12 space-y-6">
          <div className="h-64 bg-stone-200/70 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-80 bg-stone-200/70 rounded-xl animate-pulse" />
            <div className="h-80 bg-stone-200/70 rounded-xl animate-pulse" />
            <div className="h-80 bg-stone-200/70 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : workspace === 'user' ? (
        <StorefrontView
          activeSubView={userSubView}
          onChangeSubView={setUserSubView}
          products={products}
          orders={orders}
          members={members}
          rewards={rewards}
          cart={cart}
          isCartOpen={isCartOpen}
          onOpenCart={() => setIsCartOpen(true)}
          onCloseCart={() => setIsCartOpen(false)}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onClearCart={() => setCart([])}
          onSubmitOrder={handleSubmitOrder}
          onRegisterMember={handleRegisterMember}
          onRedeemReward={handleRedeemReward}
        />
      ) : (
        <AdminDashboardView
          activeTab={adminTab}
          onChangeTab={setAdminTab}
          products={products}
          orders={orders}
          members={members}
          stockLogs={stockLogs}
          sheetsConfig={sheetsConfig}
          sheetSyncLogs={sheetSyncLogs}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onAdjustStock={handleAdjustStock}
          onCreateProduct={handleCreateProduct}
          onRegisterMember={handleRegisterMember}
          onSaveSheetsConfig={handleSaveSheetsConfig}
          isSyncing={isSyncing}
        />
      )}

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6 px-6">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            AuraKhmer Commerce · frontend-user + frontend-admin + Python FastAPI + Google Sheets Apps Script
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setWorkspace('user');
                setUserSubView('shop');
              }}
              className="hover:text-stone-900 cursor-pointer"
            >
              frontend-user
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setWorkspace('admin');
                setAdminTab('orders');
              }}
              className="hover:text-stone-900 cursor-pointer"
            >
              frontend-admin
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setWorkspace('admin');
                setAdminTab('sheets');
              }}
              className="hover:text-stone-900 cursor-pointer"
            >
              Google Sheets & Vercel Deploy Code
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
