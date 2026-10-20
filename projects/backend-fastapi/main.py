"""
Project 1: backend-fastapi (Python + FastAPI + Google Sheets Apps Script Bridge)
Deploy on Vercel using `vercel --prod`
"""
import os
import time
from datetime import datetime
from typing import List, Optional, Literal
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="AuraKhmer Commerce & Automated Stock API",
    description="FastAPI Backend powered by Google Sheets + Google Apps Script",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows frontend-user.vercel.app & frontend-admin.vercel.app
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


class UpdateOrderStatusRequest(BaseModel):
    status: Literal["PENDING", "PAID", "PACKING", "SHIPPED", "DELIVERED", "CANCELLED"]
    note: Optional[str] = None


class AdjustStockRequest(BaseModel):
    delta: int
    reason: Literal["MANUAL_ADJUSTMENT", "AUTO_RESTOCK"] = "MANUAL_ADJUSTMENT"


async def push_to_google_sheet(sheet_tab: str, record: dict, action: str = "UPSERT_BY_ID"):
    """Asynchronously syncs state changes to Google Sheets via Google Apps Script Web App."""
    if not GOOGLE_APPS_SCRIPT_URL:
        return {"ok": True, "mode": "LOCAL_MEMORY"}
    async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
        resp = await client.post(
            GOOGLE_APPS_SCRIPT_URL,
            json={"action": action, "sheetTab": sheet_tab, "record": record},
        )
        return resp.json()


def evaluate_tier(lifetime_points: int):
    if lifetime_points >= 4000:
        return ("Platinum", 0.10, 2.0)
    if lifetime_points >= 1500:
        return ("Gold", 0.05, 1.5)
    if lifetime_points >= 500:
        return ("Silver", 0.03, 1.2)
    return ("Bronze", 0.0, 1.0)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "engine": "FastAPI + Google Sheets Apps Script",
        "sheetsWebhookConfigured": bool(GOOGLE_APPS_SCRIPT_URL),
    }
