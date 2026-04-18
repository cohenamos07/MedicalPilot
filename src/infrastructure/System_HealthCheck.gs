/**
 * MedicalPilot — System_HealthCheck.gs
 * Module: S02 — בדיקות בוקר וסטטוס מערכת
 * @version v97.9 | @updated 18/04/2026 | @service S02
 *
 * שינויים בהוטפיקס זה:
 *  - תיקון 404 ב-_checkAiAuthorization (מעבר ל-endpoint של רשימת מודלים)
 *  - הפרדת חלונות: runSystemHealthCheck = חלון 1 | checkPermissions = חלון 2
 *  - checkSystemMorning קורא לשני החלונות ברצף
 *  - _getMorningStats מוצג ב-toast בלבד, ללא שורות AI
 */

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — נקודת הכניסה הראשית
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkSystemMorning
 * מריץ את שני חלונות הבדיקה ברצף ומציג toast עם סטטיסטיקות בסיסיות.
 * חלון 1: runSystemHealthCheck  → Alert כללי (רשת, Gmail, Drive, GitHub)
 * חלון 2: checkPermissions      → Modal ייעודי (AI קישוריות + הרשאות)
 */
function checkSystemMorning() {
  try {
    // חלון 1 — בדיקת תשתיות רשת ושירותי Google
    runSystemHealthCheck();

    // חלון 2 — בדיקת AI והרשאות
    checkPermissions();

    // Toast — סטטיסטיקות בוקר בסיסיות
    const statsMessage = _getMorningStats();
    SpreadsheetApp.getActiveSpreadsheet().toast(statsMessage, "סטטוס בוקר MedicalPilot", 10);

  } catch (e) {
    const errorMsg = "שגיאה בהרצת בדיקת בוקר: " + e.message;
    Logger.log(errorMsg);
    SpreadsheetApp.getUi().alert(errorMsg);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — חלון 2: Modal ייעודי לבדיקת AI והרשאות
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkPermissions
 * מציג Modal עם תוצאות בדיקת קישוריות והרשאות AI.
 * נקרא גם ישירות מהתפריט וגם מתוך checkSystemMorning.
 */
function checkPermissions() {
  const aiConn = _checkAiConnectivity();
  const aiAuth = _checkAiAuthorization();

  const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");

  function rowClass(val) {
    if (val.indexOf("✅") !== -1) return "ok";
    if (val.indexOf("❌") !== -1) return "err";
    return "warn";
  }

  function icon(val) {
    if (val.indexOf("✅") !== -1) return "✅";
    if (val.indexOf("❌") !== -1) return "❌";
    return "⚠️";
  }

  const htmlBody =
    "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
    "<style>" +
    "  body{font-family:'Segoe UI',Arial,sans-serif;direction:rtl;padding:20px 24px;" +
    "       background:#f8f9fa;margin:0;min-width:320px;}" +
    "  h2{color:#1a73e8;font-size:15px;margin:0 0 14px 0;display:flex;" +
    "     align-items:center;gap:8px;}" +
    "  .card{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.12);" +
    "        padding:10px 14px;margin-bottom:10px;}" +
    "  .row{display:flex;align-items:center;gap:10px;padding:6px 0;}" +
    "  .row + .row{border-top:1px solid #f0f0f0;}" +
    "  .label{flex:1;color:#444;font-size:13px;font-weight:600;}" +
    "  .val{font-size:13px;}" +
    "  .ok{color:#188038;}" +
    "  .err{color:#c62828;}" +
    "  .warn{color:#e37400;}" +
    "  .sep{font-size:11px;color:#999;margin-top:12px;text-align:center;}" +
    "</style></head><body>" +

    "<h2>🔐 בדיקת הרשאות ו-AI</h2>" +

    "<div class='card'>" +
    "  <div class='row'>" +
    "    <span class='label'>חיבור שירות AI</span>" +
    "    <span class='val " + rowClass(aiConn) + "'>" + icon(aiConn) + "&nbsp;" + aiConn.replace(/^[✅❌⚠️]\s*/, "") + "</span>" +
    "  </div>" +
    "  <div class='row'>" +
    "    <span class='label'>הרשאת שירות AI</span>" +
    "    <span class='val " + rowClass(aiAuth) + "'>" + icon(aiAuth) + "&nbsp;" + aiAuth.replace(/^[✅❌⚠️]\s*/, "") + "</span>" +
    "  </div>" +
    "</div>" +

    "<div class='sep'>MedicalPilot v97.9 &nbsp;|&nbsp; " + now + "</div>" +

    "</body></html>";

  const html = HtmlService.createHtmlOutput(htmlBody)
    .setWidth(380)
    .setHeight(200);

  SpreadsheetApp.getUi().showModalDialog(html, "בדיקת הרשאות ו-AI — MedicalPilot");
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE — סטטיסטיקות לתצוגת Toast בלבד (ללא AI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * _getMorningStats
 * מחזיר מחרוזת סטטיסטיקות בסיסיות לתצוגת toast.
 * הסטטוס AI מוצג בנפרד דרך checkPermissions (חלון 2).
 * @returns {string}
 */
function _getMorningStats() {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const timeZone   = "GMT+3";
  const dateFormat = "dd/MM/yyyy HH:mm";
  const nowFormatted = Utilities.formatDate(new Date(), timeZone, dateFormat);

  // ── ספירת שורות גיליון ניהול_מיילים ──────────────────────────────────────
  const sheet = ss.getSheetByName("ניהול_מיילים");
  let emailCount = 0;
  if (sheet) {
    const lastRow = sheet.getLastRow();
    emailCount = lastRow > 0 ? lastRow - 1 : 0;
  }

  // ── תאריך סריקת Drive אחרונה ──────────────────────────────────────────────
  const driveSyncProp = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
  let driveSyncStatus = "טרם בוצעה";
  if (driveSyncProp) {
    try {
      const driveDate = new Date(driveSyncProp);
      driveSyncStatus = Utilities.formatDate(driveDate, timeZone, dateFormat);
    } catch (e) {
      driveSyncStatus = driveSyncProp;
    }
  }

  return "גרסה: v97.9\n" +
         "זמן נוכחי: "           + nowFormatted    + "\n" +
         "שורות בניהול מיילים: " + emailCount      + "\n" +
         "סריקת Drive אחרונה: "  + driveSyncStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE — בדיקות AI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * _checkAiConnectivity
 * בודק נגישות לשרת Gemini API ללא תלות במפתח.
 * משתמש ב-endpoint של רשימת מודלים עם מפתח dummy —
 * תגובת 400 מעידה שהשרת מגיב (מפתח לא תקין אך שרת פעיל).
 * @returns {string}
 */
function _checkAiConnectivity() {
  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=PING_TEST_ONLY";
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true
    });
    const statusCode = response.getResponseCode();

    // כל תגובה מהשרת (גם 400/401/403) מאשרת שיש קישוריות
    if (statusCode === 200 || statusCode === 400 ||
        statusCode === 401 || statusCode === 403) {
      return "✅ תקין";
    } else if (statusCode === 0 || statusCode === -1) {
      return "❌ לא זמין (אין חיבור)";
    } else {
      return "⚠️ קוד תגובה לא צפוי: " + statusCode;
    }
  } catch (e) {
    return "❌ לא זמין: " + e.message;
  }
}

/**
 * _checkAiAuthorization
 * מאמת שה-GEMINI_API_KEY קיים ותקין על-ידי שאילתת רשימת מודלים.
 * שימוש ב-endpoint /v1beta/models (GET) — קל, ללא צריכת quota.
 * תיקון 404: הוחלף generateContent ב-models listing שאינו תלוי בשם מודל.
 * @returns {string}
 */
function _checkAiAuthorization() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

    if (!apiKey || apiKey.trim() === "") {
      return "❌ מפתח חסר (GEMINI_API_KEY לא הוגדר)";
    }

    // שאילתת רשימת מודלים — תגובת 200 מאשרת הרשאה מלאה
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true
    });
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      return "✅ מורשה";
    } else if (statusCode === 400) {
      const body = response.getContentText();
      if (body.indexOf("API_KEY_INVALID") !== -1 || body.indexOf("invalid") !== -1) {
        return "❌ מפתח לא תקין (400)";
      }
      return "⚠️ תגובה חלקית (400) — בדוק את המפתח";
    } else if (statusCode === 401) {
      return "❌ לא מורשה — אימות נכשל (401)";
    } else if (statusCode === 403) {
      return "❌ גישה נדחתה — בדוק הרשאות API (403)";
    } else if (statusCode === 429) {
      return "⚠️ מכסה מוצתה (429) — המפתח תקין";
    } else {
      return "⚠️ קוד תגובה לא צפוי: " + statusCode;
    }
  } catch (e) {
    return "⚠️ שגיאה: " + e.message;
  }
}