import React, { useState, useMemo } from 'react';
import {
  Package,
  Boxes,
  Users,
  Database,
  Plus,
  RefreshCw,
  ArrowRight,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  getStockHealthStatus,
  getNextRecommendedStatus,
  canTransitionOrderStatus,
  type OrderStatusCode,
} from '../utils/commerceRules';
import { ArchitectureBlueprintPanel } from '../components/ArchitectureBlueprintModal';
import type {
  Product,
  Order,
  Member,
  StockLog,
  SheetSyncRecord,
  SheetsConnectionConfig,
  ProductCategory,
} from '../types/commerce';

export type AdminTab = 'orders' | 'inventory' | 'members' | 'sheets';

interface AdminDashboardViewProps {
  activeTab: AdminTab;
  onChangeTab: (tab: AdminTab) => void;
  products: Product[];
  orders: Order[];
  members: Member[];
  stockLogs: StockLog[];
  sheetsConfig: SheetsConnectionConfig;
  sheetSyncLogs: SheetSyncRecord[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatusCode) => Promise<void>;
  onAdjustStock: (productId: string, delta: number, autoRestockEnabled?: boolean) => Promise<void>;
  onCreateProduct: (payload: {
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
  }) => Promise<void>;
  onRegisterMember: (name: string, phone: string, email: string) => Promise<Member>;
  onSaveSheetsConfig: (scriptUrl: string, spreadsheetId: string) => Promise<void>;
  isSyncing: boolean;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  activeTab,
  onChangeTab,
  products,
  orders,
  members,
  stockLogs,
  sheetsConfig,
  sheetSyncLogs,
  onUpdateOrderStatus,
  onAdjustStock,
  onCreateProduct,
  onRegisterMember,
  onSaveSheetsConfig,
  isSyncing,
}) => {
  // Orders Filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // New Product Form Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdNameKm, setNewProdNameKm] = useState<string>('');
  const [newProdSku, setNewProdSku] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('Audio & Tech');
  const [newProdPrice, setNewProdPrice] = useState<string>('59');
  const [newProdStock, setNewProdStock] = useState<string>('15');
  const [newProdThreshold, setNewProdThreshold] = useState<string>('5');
  const [newProdAutoRestock, setNewProdAutoRestock] = useState<boolean>(true);
  const [newProdVisualKey, setNewProdVisualKey] = useState<string>('headphones');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [prodFormError, setProdFormError] = useState<string | null>(null);

  // Admin Add Member State
  const [adminMemberName, setAdminMemberName] = useState<string>('');
  const [adminMemberPhone, setAdminMemberPhone] = useState<string>('');
  const [adminMemberEmail, setAdminMemberEmail] = useState<string>('');

  // KPIs
  const totalRevenue = useMemo(
    () => orders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  const activePipelineCount = useMemo(
    () => orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length,
    [orders]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.minStockThreshold).length,
    [products]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
      const q = orderSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFormError(null);
    if (!newProdName.trim() || !newProdSku.trim() || Number(newProdPrice) <= 0) {
      setProdFormError('សូមបញ្ចូលឈ្មោះទំនិញ កូដ SKU និងតម្លៃឱ្យបានត្រឹមត្រូវ។');
      return;
    }

    await onCreateProduct({
      name: newProdName.trim(),
      nameKm: newProdNameKm.trim() || newProdName.trim(),
      sku: newProdSku.trim().toUpperCase(),
      category: newProdCategory,
      price: Number(newProdPrice),
      stock: Number(newProdStock || 10),
      minStockThreshold: Number(newProdThreshold || 5),
      autoRestockEnabled: newProdAutoRestock,
      autoRestockAmount: 15,
      visualKey: newProdVisualKey,
      description: newProdDesc.trim() || 'ទំនិញគុណភាពខ្ពស់ ភ្ជាប់ប្រព័ន្ធស្តុកស្វ័យប្រវត្តិ។',
    });

    setNewProdName('');
    setNewProdNameKm('');
    setNewProdSku('');
    setNewProdDesc('');
    setIsAddProductOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-stone-900 flex flex-col lg:flex-row">
      {/* Left Sidebar Navigation (260px on Desktop) */}
      <aside className="w-full lg:w-[260px] bg-white border-b lg:border-b-0 lg:border-r border-stone-200 shrink-0 flex flex-col justify-between p-5">
        <div>
          <div className="pb-4 border-b border-stone-200">
            <p className="text-xs font-mono-tabular text-amber-800 font-semibold">
              FRONTEND-ADMIN CONSOLE
            </p>
            <h1 className="text-base font-bold text-stone-900 mt-0.5">
              ប្រព័ន្ធគ្រប់គ្រងហាង និងស្តុក
            </h1>
          </div>

          <nav className="mt-4 space-y-1" aria-label="Admin Console Navigation">
            <button
              type="button"
              onClick={() => onChangeTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Package className="w-4 h-4 shrink-0" />
                <span>ការបញ្ជាទិញផ្ទាល់ (Live Orders)</span>
              </span>
              <span className="font-mono-tabular">{orders.length}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('inventory')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Boxes className="w-4 h-4 shrink-0" />
                <span>ស្តុកស្វ័យប្រវត្តិ (Auto Stock)</span>
              </span>
              <span className="font-mono-tabular">{products.length}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('members')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'members'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>សមាជិកភាព (Loyalty CRM)</span>
              </span>
              <span className="font-mono-tabular">{members.length}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('sheets')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'sheets'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Database className="w-4 h-4 shrink-0" />
                <span>Google Sheet & Vercel</span>
              </span>
              <span className="font-mono-tabular">4</span>
            </button>
          </nav>
        </div>

        <div className="hidden lg:block pt-4 border-t border-stone-200 text-xs text-stone-500 space-y-1">
          <div className="font-semibold text-stone-800">Google Sheets DB Bridge</div>
          <div className="font-mono-tabular">Rows Synced: {sheetsConfig.totalRowsSynced}</div>
          <div className="font-mono-tabular truncate">Sync: {sheetsConfig.lastSyncedAt}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-[1320px] w-full mx-auto space-y-6">
        {/* Top KPI Strip (Tabular Numerals) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs text-stone-500">ចំណូលលក់សរុប (Total Revenue)</div>
            <div className="text-2xl font-bold font-mono-tabular text-stone-900 mt-1">
              ${totalRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-stone-500 font-mono-tabular mt-1">
              KHQR · ABA PAY · Wing · COD
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs text-stone-500">កំពុងដំណើរការដឹកជញ្ជូន (Active Orders)</div>
            <div className="text-2xl font-bold font-mono-tabular text-amber-800 mt-1">
              {activePipelineCount} ការបញ្ជាទិញ
            </div>
            <div className="text-xs text-stone-500 font-mono-tabular mt-1">
              សរុបទាំងអស់ {orders.length} វិក្កយបត្រ
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs text-stone-500">ការជូនដំណឹងស្តុកទាប (Low Stock Rules)</div>
            <div className="text-2xl font-bold font-mono-tabular text-stone-900 mt-1">
              {lowStockCount} មុខទំនិញ
            </div>
            <div className="text-xs text-emerald-700 font-mono-tabular mt-1">
              Auto-Restock Rule ដំណើរការស្វ័យប្រវត្តិ
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs text-stone-500">សមាជិកសន្សំពិន្ទុ (Loyalty Members)</div>
            <div className="text-2xl font-bold font-mono-tabular text-stone-900 mt-1">
              {members.length} នាក់
            </div>
            <div className="text-xs text-stone-500 font-mono-tabular mt-1">
              Bronze · Silver · Gold · Platinum
            </div>
          </div>
        </div>

        {/* TAB 1: REAL-TIME ORDER TRACKING & FULFILLMENT */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  ផ្ទាំងគ្រប់គ្រងការបញ្ជាទិញក្នុងពេលជាក់ស្តែង (Real-Time Order Fulfillment)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  ចុចប៊ូតុងប្តូរស្ថានភាព (Advance Status) ដើម្បីធ្វើបច្ចុប្បន្នភាពក្នុង Google Sheet និងបង្ហាញដល់អតិថិជនភ្លាមៗ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg">
                  {['ALL', 'PENDING', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        orderStatusFilter === st
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    aria-label="Search orders by ID or phone"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="ស្វែងរក ORD ឬទូរស័ព្ទ..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg w-48"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                    <th className="py-3 px-4">Order ID / Sheet Row</th>
                    <th className="py-3 px-4">អតិថិជន (Customer)</th>
                    <th className="py-3 px-4">ទំនិញ (Items)</th>
                    <th className="py-3 px-4 text-right">ទឹកប្រាក់ (Total)</th>
                    <th className="py-3 px-4">ស្ថានភាព (Status)</th>
                    <th className="py-3 px-4 text-right">សកម្មភាព (Next Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {filteredOrders.map((order) => {
                    const nextRec = getNextRecommendedStatus(order.status);
                    const canCancel = canTransitionOrderStatus(order.status, 'CANCELLED');

                    return (
                      <tr key={order.id} className="hover:bg-stone-50/75">
                        <td className="py-3.5 px-4 font-mono-tabular">
                          <div className="font-bold text-stone-900">{order.id}</div>
                          <div className="text-stone-500">
                            Row #{order.sheetRowId} · {order.createdAt}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-stone-900">{order.customerName}</div>
                          <div className="font-mono-tabular text-stone-500">
                            {order.customerPhone} · {order.cityProvince}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">
                          {order.items.map((item) => (
                            <div key={item.productId} className="truncate max-w-[230px]">
                              {item.nameKm} <span className="font-mono-tabular">×{item.quantity}</span>
                            </div>
                          ))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular">
                          <div className="font-bold text-stone-900">${order.total.toFixed(2)}</div>
                          <div className="text-stone-500">{order.paymentMethod}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular font-semibold">
                          <span
                            className={
                              order.status === 'DELIVERED'
                                ? 'text-emerald-700'
                                : order.status === 'CANCELLED'
                                  ? 'text-red-700'
                                  : 'text-amber-800'
                            }
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {nextRec && (
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(order.id, nextRec)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <span>ប្តូរទៅ {nextRec}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => onUpdateOrderStatus(order.id, 'CANCELLED')}
                                className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                បោះបង់
                              </button>
                            )}
                            {!nextRec && !canCancel && (
                              <span className="text-stone-400 font-mono-tabular">បានបញ្ចប់ (Completed)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AUTOMATED INVENTORY & STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញដោយស្វ័យប្រវត្តិ (Automated Inventory Engine)
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    កាត់ស្តុកស្វ័យប្រវត្តិពេលមានការបញ្ជាទិញ និងបញ្ចូលស្តុកបន្ថែមស្វ័យប្រវត្តិ (Auto-Restock) ពេលដល់កម្រិតកំណត់
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>បន្ថែមទំនិញថ្មី (Add Product)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                      <th className="py-3 px-4">SKU / ឈ្មោះទំនិញ</th>
                      <th className="py-3 px-4">ប្រភេទ</th>
                      <th className="py-3 px-4 text-right">តម្លៃ</th>
                      <th className="py-3 px-4 text-right">ស្តុកបច្ចុប្បន្ន</th>
                      <th className="py-3 px-4">ស្ថានភាពស្តុក</th>
                      <th className="py-3 px-4">មុខងារបញ្ចូលស្តុកស្វ័យប្រវត្តិ (Auto-Restock)</th>
                      <th className="py-3 px-4 text-right">កែប្រែស្តុករហ័ស</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {products.map((prod) => {
                      const health = getStockHealthStatus(prod.stock, prod.minStockThreshold);
                      return (
                        <tr key={prod.id} className="hover:bg-stone-50/75">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-stone-900">{prod.nameKm}</div>
                            <div className="font-mono-tabular text-stone-500">
                              {prod.sku} · {prod.name}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">{prod.category}</td>
                          <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-stone-900">
                            ${prod.price.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-stone-900">
                            {prod.stock} គ្រឿង
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular">
                            <span
                              className={
                                health === 'OUT_OF_STOCK'
                                  ? 'text-red-700 font-semibold'
                                  : health === 'LOW_STOCK'
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-emerald-700 font-medium'
                              }
                            >
                              {health} (Min ≤{prod.minStockThreshold})
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => onAdjustStock(prod.id, 0, !prod.autoRestockEnabled)}
                              className={`px-3 py-1 text-xs font-mono-tabular rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                prod.autoRestockEnabled
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                  : 'bg-stone-100 text-stone-600 border-stone-300'
                              }`}
                            >
                              {prod.autoRestockEnabled
                                ? `ON (+${prod.autoRestockAmount} @ ≤${prod.minStockThreshold})`
                                : 'OFF (Manual Only)'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onAdjustStock(prod.id, -1)}
                                className="px-2.5 py-1 text-xs font-mono-tabular bg-stone-100 hover:bg-stone-200 rounded-md cursor-pointer"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() => onAdjustStock(prod.id, 10)}
                                className="px-2.5 py-1 text-xs font-mono-tabular font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                              >
                                +10 Restock
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Automated Stock Movement Ledger (StockLogs Sheet Tab) */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    កំណត់ត្រាចលនាស្តុកស្វ័យប្រវត្តិ (Google Sheet: StockLogs Tab)
                  </h3>
                  <p className="text-xs text-stone-500">
                    កត់ត្រារាល់ការកាត់ស្តុកពីការបញ្ជាទិញ (ORDER_DEDUCTION) និងការបញ្ចូលស្តុកស្វ័យប្រវត្តិ (AUTO_RESTOCK)
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                      <th className="py-2.5 px-4">Log ID</th>
                      <th className="py-2.5 px-4">SKU / ទំនិញ</th>
                      <th className="py-2.5 px-4">មូលហេតុ (Reason)</th>
                      <th className="py-2.5 px-4 text-right">ចំនួនផ្លាស់ប្តូរ</th>
                      <th className="py-2.5 px-4 text-right">ស្តុកមុន → ស្តុកថ្មី</th>
                      <th className="py-2.5 px-4 text-right">ពេលវេលា</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {stockLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/75">
                        <td className="py-2.5 px-4 font-mono-tabular text-stone-700">{log.id}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono-tabular font-semibold text-stone-900">{log.sku}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span className="text-stone-600">{log.productName}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono-tabular text-stone-700">
                          {log.reason} ({log.referenceId})
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono-tabular font-bold ${
                            log.change > 0 ? 'text-emerald-700' : 'text-amber-800'
                          }`}
                        >
                          {log.change > 0 ? `+${log.change}` : log.change}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-stone-700">
                          {log.previousStock} → <strong>{log.newStock}</strong>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-stone-500">
                          {log.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LOYALTY MEMBERS CRM */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-stone-200">
                <h2 className="text-lg font-bold text-stone-900">
                  បញ្ជីសមាជិក និងពិន្ទុរង្វាន់ (Google Sheet: Members Tab)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  តាមដានពិន្ទុសន្សំ លំដាប់សមាជិក (Bronze, Silver, Gold, Platinum) និងប្រវត្តិការប្តូររង្វាន់
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                      <th className="py-3 px-4">Member ID</th>
                      <th className="py-3 px-4">ឈ្មោះសមាជិក</th>
                      <th className="py-3 px-4">លេខទូរស័ព្ទ</th>
                      <th className="py-3 px-4">លំដាប់ (Tier)</th>
                      <th className="py-3 px-4 text-right">ពិន្ទុនៅសល់</th>
                      <th className="py-3 px-4 text-right">ពិន្ទុសរុប (Lifetime)</th>
                      <th className="py-3 px-4 text-right">ចំណាយសរុប</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50/75">
                        <td className="py-3.5 px-4 font-mono-tabular font-semibold text-stone-900">
                          {m.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-900">{m.name}</td>
                        <td className="py-3.5 px-4 font-mono-tabular text-stone-700">{m.phone}</td>
                        <td className="py-3.5 px-4 font-mono-tabular font-bold text-amber-800">
                          {m.tier}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-stone-900">
                          {m.points.toLocaleString()} pts
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular text-stone-600">
                          {m.lifetimePoints.toLocaleString()} pts
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-stone-900">
                          ${m.totalSpent.toFixed(2)} ({m.ordersCount} orders)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Add Member Form in Admin */}
            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-stone-900">
                បន្ថែមសមាជិកថ្មីពីផ្ទាំង Admin (Add Loyalty Member)
              </h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adminMemberName.trim() || !adminMemberPhone.trim()) return;
                  await onRegisterMember(adminMemberName, adminMemberPhone, adminMemberEmail);
                  setAdminMemberName('');
                  setAdminMemberPhone('');
                  setAdminMemberEmail('');
                }}
                className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label htmlFor="adm-mem-name" className="block text-xs text-stone-600 mb-1">
                    ឈ្មោះសមាជិក
                  </label>
                  <input
                    id="adm-mem-name"
                    type="text"
                    value={adminMemberName}
                    onChange={(e) => setAdminMemberName(e.target.value)}
                    placeholder="ឈ្មោះអតិថិជន"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="adm-mem-phone" className="block text-xs text-stone-600 mb-1">
                    លេខទូរស័ព្ទ
                  </label>
                  <input
                    id="adm-mem-phone"
                    type="text"
                    value={adminMemberPhone}
                    onChange={(e) => setAdminMemberPhone(e.target.value)}
                    placeholder="012998877"
                    className="w-full px-3 py-2 text-xs font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="adm-mem-email" className="block text-xs text-stone-600 mb-1">
                    អ៊ីមែល
                  </label>
                  <input
                    id="adm-mem-email"
                    type="email"
                    value={adminMemberEmail}
                    onChange={(e) => setAdminMemberEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  បង្កើតគណនីសមាជិក (+100 pts)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: GOOGLE SHEETS + FASTAPI + VERCEL 3-PROJECT HUB */}
        {activeTab === 'sheets' && (
          <ArchitectureBlueprintPanel
            sheetsConfig={sheetsConfig}
            sheetSyncLogs={sheetSyncLogs}
            onSaveSheetsConfig={onSaveSheetsConfig}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* ADD NEW PRODUCT MODAL */}
      {isAddProductOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="បន្ថែមទំនិញថ្មីចូលស្តុក (Add New Product)"
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                បន្ថែមទំនិញថ្មីចូលស្តុក Google Sheets (Add Product)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                បិទ (Close)
              </button>
            </div>

            {prodFormError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800">
                {prodFormError}
              </div>
            )}

            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="np-name-km" className="block font-medium text-stone-700 mb-1">
                    ឈ្មោះទំនិញ (ភាសាខ្មែរ)
                  </label>
                  <input
                    id="np-name-km"
                    type="text"
                    value={newProdNameKm}
                    onChange={(e) => setNewProdNameKm(e.target.value)}
                    placeholder="ឧ. កាសស្តាប់ត្រចៀកស្ទូឌីយោ"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="np-name-en" className="block font-medium text-stone-700 mb-1">
                    Product Name (English)
                  </label>
                  <input
                    id="np-name-en"
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Studio Monitor Headphones"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="np-sku" className="block font-medium text-stone-700 mb-1">
                    កូដ SKU
                  </label>
                  <input
                    id="np-sku"
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="AK-NEW-07"
                    className="w-full px-3 py-2 font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="np-price" className="block font-medium text-stone-700 mb-1">
                    តម្លៃ ($)
                  </label>
                  <input
                    id="np-price"
                    type="number"
                    step="0.01"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3 py-2 font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="np-stock" className="block font-medium text-stone-700 mb-1">
                    ចំនួនស្តុកដំបូង
                  </label>
                  <input
                    id="np-stock"
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3 py-2 font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="np-cat" className="block font-medium text-stone-700 mb-1">
                    ប្រភេទទំនិញ
                  </label>
                  <select
                    id="np-cat"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                  >
                    <option value="Audio & Tech">Audio & Tech</option>
                    <option value="Workspace">Workspace</option>
                    <option value="Coffee & Living">Coffee & Living</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="np-visual" className="block font-medium text-stone-700 mb-1">
                    រូបភាពគំរូ (Studio Render)
                  </label>
                  <select
                    id="np-visual"
                    value={newProdVisualKey}
                    onChange={(e) => setNewProdVisualKey(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                  >
                    <option value="headphones">Headphones</option>
                    <option value="keyboard">Mechanical Keyboard</option>
                    <option value="coffee">Stoneware Coffee</option>
                    <option value="lamp">Brass Desk Lamp</option>
                    <option value="beans">Mondulkiri Coffee</option>
                    <option value="charger">GaN Power Hub</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="np-threshold" className="block font-medium text-stone-700 mb-1">
                    កម្រិតស្តុកទាប (Min)
                  </label>
                  <input
                    id="np-threshold"
                    type="number"
                    value={newProdThreshold}
                    onChange={(e) => setNewProdThreshold(e.target.value)}
                    className="w-full px-3 py-2 font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="np-desc" className="block font-medium text-stone-700 mb-1">
                  ការពិពណ៌នាទំនិញ
                </label>
                <textarea
                  id="np-desc"
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="ពិពណ៌នាអំពីគុណភាព និងលក្ខណៈពិសេស..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newProdAutoRestock}
                  onChange={(e) => setNewProdAutoRestock(e.target.checked)}
                />
                <span>បើកមុខងារបញ្ចូលស្តុកស្វ័យប្រវត្តិ (+15 units នៅពេលស្តុកធ្លាក់ដល់កម្រិតកំណត់)</span>
              </label>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-stone-700 bg-stone-100 rounded-lg cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg cursor-pointer"
                >
                  រក្សាទុកក្នុងស្តុក (Save to Sheet)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
