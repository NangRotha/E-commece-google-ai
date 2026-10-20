export interface ProjectBlueprintFile {
  projectKey: 'google-apps-script' | 'backend-fastapi' | 'frontend-user' | 'frontend-admin';
  projectTitle: string;
  projectSubtitle: string;
  deployTarget: string;
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const THREE_PROJECT_BLUEPRINTS: ProjectBlueprintFile[] = [
  {
    projectKey: 'google-apps-script',
    projectTitle: 'Google Sheets + Apps Script Database',
    projectSubtitle: 'Extensions -> Apps Script -> Deploy as Web App',
    deployTarget: 'Google Cloud / Google Sheets',
    filename: 'projects/google-apps-script/Code.gs',
    language: 'javascript',
    description:
      'ភ្ជាប់ Google Sheet ជា Database ល្បឿនលឿន៖ បង្កើតផ្ទាំង Products, Orders, Members, និង StockLogs ដោយស្វ័យប្រវត្តិ ព្រមទាំងប្រើ LockService ការពារការកាត់ស្តុកជាន់គ្នា។',
    code: `// Open Google Sheets -> Extensions -> Apps Script -> Paste into Code.gs
const SHEET_TABS = {
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  MEMBERS: 'Members',
  STOCK_LOGS: 'StockLogs'
};

function ensureSheetsInitialized() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schemas = {
    [SHEET_TABS.PRODUCTS]: ['id', 'sku', 'name', 'nameKm', 'category', 'price', 'stock', 'minStockThreshold', 'autoRestockEnabled', 'autoRestockAmount', 'visualKey', 'description', 'soldCount', 'updatedAt'],
    [SHEET_TABS.ORDERS]: ['id', 'customerName', 'customerPhone', 'shippingAddress', 'cityProvince', 'memberId', 'memberTier', 'itemsJson', 'subtotal', 'tierDiscount', 'pointsRedeemed', 'pointsDiscount', 'shippingFee', 'total', 'pointsEarned', 'paymentMethod', 'paymentReference', 'status', 'createdAt'],
    [SHEET_TABS.MEMBERS]: ['id', 'name', 'phone', 'email', 'points', 'lifetimePoints', 'tier', 'totalSpent', 'ordersCount', 'joinedAt'],
    [SHEET_TABS.STOCK_LOGS]: ['id', 'productId', 'sku', 'productName', 'change', 'previousStock', 'newStock', 'reason', 'referenceId', 'timestamp']
  };

  Object.keys(schemas).forEach(function(tabName) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(schemas[tabName]);
    }
  });
  return ss;
}

function doGet(e) {
  const ss = ensureSheetsInitialized();
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    products: readRows(ss.getSheetByName(SHEET_TABS.PRODUCTS)),
    orders: readRows(ss.getSheetByName(SHEET_TABS.ORDERS)),
    members: readRows(ss.getSheetByName(SHEET_TABS.MEMBERS)),
    stockLogs: readRows(ss.getSheetByName(SHEET_TABS.STOCK_LOGS))
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = ensureSheetsInitialized();
    const body = JSON.parse(e.postData.contents || '{}');
    const sheet = ss.getSheetByName(body.sheetTab);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowValues = headers.map(function(k) {
      const val = body.record[k];
      return typeof val === 'object' ? JSON.stringify(val) : (val ?? '');
    });
    sheet.appendRow(rowValues);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, row: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`,
  },
  {
    projectKey: 'backend-fastapi',
    projectTitle: 'Project 1: backend (Python + FastAPI + Google Sheet)',
    projectSubtitle: 'Deploy on Vercel (api-aurakhmer.vercel.app)',
    deployTarget: 'Vercel Python Serverless (@vercel/python)',
    filename: 'projects/backend-fastapi/main.py',
    language: 'python',
    description:
      'Backend API សរសេរដោយ Python + FastAPI ភ្ជាប់ទៅ Google Sheet តាមរយៈ Google Apps Script URL និងផ្តល់ REST API ទៅកាន់ frontend-user និង frontend-admin។',
    code: `import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal

app = FastAPI(title="AuraKhmer FastAPI + Google Sheets Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows frontend-user.vercel.app & frontend-admin.vercel.app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_APPS_SCRIPT_URL = os.getenv("GOOGLE_APPS_SCRIPT_URL", "")

class OrderItemPayload(BaseModel):
    productId: str
    quantity: int

class CreateOrderRequest(BaseModel):
    customerName: str
    customerPhone: str
    shippingAddress: str
    cityProvince: str
    paymentMethod: Literal["KHQR", "ABA_PAY", "WING", "COD"]
    pointsToRedeem: int = 0
    items: List[OrderItemPayload]

@app.get("/api/bootstrap")
async def get_all_sheet_data():
    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
        resp = await client.get(f"{GOOGLE_APPS_SCRIPT_URL}?action=ALL")
        return resp.json()

@app.post("/api/orders")
async def create_order_and_deduct_stock(payload: CreateOrderRequest):
    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
        resp = await client.post(
            GOOGLE_APPS_SCRIPT_URL,
            json={"action": "APPEND_ROW", "sheetTab": "Orders", "record": payload.model_dump()}
        )
        return resp.json()`,
  },
  {
    projectKey: 'frontend-user',
    projectTitle: 'Project 2: frontend-user (React + Tailwind CSS)',
    projectSubtitle: 'Deploy on Vercel (shop-aurakhmer.vercel.app)',
    deployTarget: 'Vercel Static / Vite SPA',
    filename: 'projects/frontend-user/src/api.ts & vercel.json',
    language: 'typescript',
    description:
      'វេបសាយសម្រាប់អតិថិជនទិញទំនិញ ទូទាត់ប្រាក់តាម KHQR/ABA/COD តាមដានការបញ្ជាទិញផ្ទាល់ និងប្តូរពិន្ទុសមាជិក ដោយទាញទិន្នន័យទាំងអស់ពី Backend API។',
    code: `// projects/frontend-user/.env.production
VITE_API_BASE_URL="https://backend-fastapi-aurakhmer.vercel.app"

// projects/frontend-user/src/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchStorefrontCatalog() {
  const res = await fetch(\`\${API_BASE}/api/bootstrap\`);
  if (!res.ok) throw new Error('Failed to load catalog from backend');
  return res.json();
}

export async function submitCustomerOrder(orderData: unknown) {
  const res = await fetch(\`\${API_BASE}/api/orders\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return res.json();
}

// projects/frontend-user/vercel.json
// {
//   "framework": "vite",
//   "buildCommand": "npm run build",
//   "outputDirectory": "dist",
//   "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
// }`,
  },
  {
    projectKey: 'frontend-admin',
    projectTitle: 'Project 3: frontend-admin (React + Tailwind CSS)',
    projectSubtitle: 'Deploy on Vercel (admin-aurakhmer.vercel.app)',
    deployTarget: 'Vercel Static / Vite SPA',
    filename: 'projects/frontend-admin/src/api.ts & vercel.json',
    language: 'typescript',
    description:
      'ផ្ទាំងគ្រប់គ្រងសម្រាប់ Admin តាមដានការបញ្ជាទិញក្នុងពេលជាក់ស្តែង (Real-time Order Pipeline) គ្រប់គ្រងស្តុកស្វ័យប្រវត្តិ (Auto-Restock) និងគ្រប់គ្រងសមាជិក។',
    code: `// projects/frontend-admin/.env.production
VITE_API_BASE_URL="https://backend-fastapi-aurakhmer.vercel.app"

// projects/frontend-admin/src/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function updateOrderStatusLive(orderId: string, status: string, note?: string) {
  const res = await fetch(\`\${API_BASE}/api/orders/\${orderId}/status\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  });
  return res.json();
}

export async function adjustProductInventory(productId: string, delta: number, autoRestockEnabled?: boolean) {
  const res = await fetch(\`\${API_BASE}/api/products/\${productId}/stock\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta, autoRestockEnabled }),
  });
  return res.json();
}`,
  },
];
