/**
 * MedicalPilot — System_HealthCheck.gs
 * Module: S02 — בדיקות בוקר וסטטוס מערכת
 * @version v97.9 | @updated 19/04/2026 | @service S02
 */

function checkSystemMorning() {
  try {
    runSystemHealthCheck();
    checkPermissions();
    const statsMessage = _getMorningStats();
    SpreadsheetApp.getActiveSpreadsheet().toast(statsMessage, "סטטוס בוקר MedicalPilot", 10);
  } catch (e) {
    const errorMsg = "שגיאה בהרצת בדיקת בוקר: " + e.message;
    Logger.log(errorMsg);
    SpreadsheetApp.getUi().alert(errorMsg);
  }
}

function checkPermissions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let sheetAccess = false;
    let rowCount    = 0;
    try {
      const sheet = ss.getSheetByName("ניהול_מיילים");
      if (sheet) {
        sheetAccess = true;
        rowCount    = Math.max(sheet.getLastRow() - 1, 0);
      }
    } catch (e) {}

    let propsAccess = false;
    try {
      PropertiesService.getScriptProperties().getKeys();
      propsAccess = true;
    } catch (e) {}

    let driveAccess = false;
    try { DriveApp.getRootFolder(); driveAccess = true; } catch (e) {}

    let gmailAccess = false;
    try { GmailApp.getInboxThreads(0, 1); gmailAccess = true; } catch (e) {}

    const aiConnStatus = _checkAiConnectivity();
    const aiAuthStatus = _checkAiAuthorization();

    const message =
      "גישה לגיליון ניהול_מיילים: " + (sheetAccess ? "תקין ✓" : "נכשל ✗") + "\n" +
      "שורות בגיליון: "              + rowCount                              + "\n" +
      "גישה ל-Script Properties: "   + (propsAccess ? "תקין ✓" : "נכשל ✗") + "\n" +
      "גישה ל-Drive: "               + (driveAccess ? "תקין ✓" : "נכשל ✗") + "\n" +
      "גישה ל-Gmail: "               + (gmailAccess ? "תקין ✓" : "נכשל ✗") + "\n" +
      "──────────────\n"                                                            +
      "חיבור שירות AI: "             + aiConnStatus                          + "\n" +
      "הרשאת שירות AI: "             + aiAuthStatus;

    SpreadsheetApp.getUi().alert(
      "בדיקת הרשאות — v97.9",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (e) {
    Logger.log("שגיאה ב-checkPermissions: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בבדיקת הרשאות: " + e.message);
  }
}

function _getMorningStats() {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const timeZone   = "GMT+3";
  const dateFormat = "dd/MM/yyyy HH:mm";
  const nowFormatted = Utilities.formatDate(new Date(), timeZone, dateFormat);

  const sheet = ss.getSheetByName("ניהול_מיילים");
  let emailCount = 0;
  if (sheet) {
    const lastRow = sheet.getLastRow();
    emailCount = lastRow > 0 ? lastRow - 1 : 0;
  }

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

function _checkAiConnectivity() {
  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=PING_TEST_ONLY";
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true
    });
    const code = response.getResponseCode();
    if (code === 200 || code === 400 || code === 401 || code === 403) {
      return "תקין ✓";
    }
    return "נכשל ✗ (קוד: " + code + ")";
  } catch (e) {
    return "נכשל ✗ (" + e.message + ")";
  }
}

function _checkAiAuthorization() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

    if (!apiKey || apiKey.trim() === "") {
      return "לא מורשה ✗ (מפתח חסר)";
    }

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true,
      followRedirects: true
    });
    const code = response.getResponseCode();

    if (code === 200) {
      return "מורשה ✓";
    } else if (code === 400) {
      const body = response.getContentText();
      if (body.indexOf("API_KEY_INVALID") !== -1 || body.indexOf("invalid") !== -1) {
        return "לא מורשה ✗ (מפתח לא תקין)";
      }
      return "לא מורשה ✗ (שגיאה 400)";
    } else if (code === 401) {
      return "לא מורשה ✗ (401 — אימות נכשל)";
    } else if (code === 403) {
      return "לא מורשה ✗ (403 — גישה נדחתה)";
    } else if (code === 429) {
      return "מורשה ✓ (429 — מכסה מוצתה, מפתח תקין)";
    } else {
      return "לא מורשה ✗ (קוד: " + code + ")";
    }
  } catch (e) {
    return "לא מורשה ✗ (" + e.message + ")";
  }
}