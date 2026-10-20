/**
 * AuraKhmer Commerce OS — Google Apps Script Database Engine (Code.gs)
 * Deploy as Web App:
 *   1. Open your Google Sheet -> Extensions -> Apps Script
 *   2. Paste this code into Code.gs and click Save
 *   3. Click Deploy -> New deployment -> Select type: Web app
 *   4. Execute as: "Me", Who has access: "Anyone"
 *   5. Copy the Web App URL (https://script.google.com/macros/s/.../exec)
 *      and set it as GOOGLE_APPS_SCRIPT_URL in your FastAPI backend / Vercel env.
 */

const SHEET_TABS = {
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  MEMBERS: 'Members',
  STOCK_LOGS: 'StockLogs'
};

function ensureSheetsInitialized() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schemas = {
    [SHEET_TABS.PRODUCTS]: ['id', 'sku', 'name', 'nameKm', 'category', 'price', 'stock', 'minStockThreshold', 'autoRestockEnabled', 'autoRestockAmount', 'visualKey', 'description', 'specsJson', 'soldCount', 'updatedAt'],
    [SHEET_TABS.ORDERS]: ['id', 'customerName', 'customerPhone', 'shippingAddress', 'cityProvince', 'memberId', 'memberTier', 'itemsJson', 'subtotal', 'tierDiscount', 'pointsRedeemed', 'pointsDiscount', 'shippingFee', 'total', 'pointsEarned', 'paymentMethod', 'paymentReference', 'status', 'timelineJson', 'createdAt'],
    [SHEET_TABS.MEMBERS]: ['id', 'name', 'phone', 'email', 'points', 'lifetimePoints', 'tier', 'totalSpent', 'ordersCount', 'joinedAt', 'redeemedRewardsJson'],
    [SHEET_TABS.STOCK_LOGS]: ['id', 'productId', 'sku', 'productName', 'change', 'previousStock', 'newStock', 'reason', 'referenceId', 'timestamp']
  };

  Object.keys(schemas).forEach(function(tabName) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(schemas[tabName]);
      sheet.getRange(1, 1, 1, schemas[tabName].length).setFontWeight('bold').setBackground('#F5F5F4');
    }
  });
  return ss;
}

function readSheetAsObjects(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(function(row, idx) {
    const obj = { _rowNumber: idx + 2 };
    headers.forEach(function(h, colIdx) {
      obj[h] = row[colIdx];
    });
    return obj;
  });
}

function doGet(e) {
  const ss = ensureSheetsInitialized();
  const action = (e && e.parameter && e.parameter.action) || 'ALL';

  if (action === 'ALL') {
    const payload = {
      ok: true,
      products: readSheetAsObjects(ss.getSheetByName(SHEET_TABS.PRODUCTS)),
      orders: readSheetAsObjects(ss.getSheetByName(SHEET_TABS.ORDERS)),
      members: readSheetAsObjects(ss.getSheetByName(SHEET_TABS.MEMBERS)),
      stockLogs: readSheetAsObjects(ss.getSheetByName(SHEET_TABS.STOCK_LOGS)),
      syncedAt: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, status: 'AuraKhmer Apps Script Ready' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = ensureSheetsInitialized();
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'APPEND_ROW') {
      const sheet = ss.getSheetByName(body.sheetTab);
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const rowData = headers.map(function(key) {
        const val = body.record[key];
        return typeof val === 'object' && val !== null ? JSON.stringify(val) : (val !== undefined ? val : '');
      });
      sheet.appendRow(rowData);
      return jsonResponse({ ok: true, action: action, rowNumber: sheet.getLastRow() });
    }

    if (action === 'UPSERT_BY_ID') {
      const sheet = ss.getSheetByName(body.sheetTab);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIdx = headers.indexOf('id');
      let targetRow = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]) === String(body.record.id)) {
          targetRow = i + 1;
          break;
        }
      }

      const rowValues = headers.map(function(key) {
        const val = body.record[key];
        return typeof val === 'object' && val !== null ? JSON.stringify(val) : (val !== undefined ? val : '');
      });

      if (targetRow > 0) {
        sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
        targetRow = sheet.getLastRow();
      }
      return jsonResponse({ ok: true, action: action, rowNumber: targetRow });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
