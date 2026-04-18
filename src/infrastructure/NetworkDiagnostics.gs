/**
 * MedicalPilot — NetworkDiagnostics.gs
 * שירות S01 — בדיקות רשת ונגישות
 * @version v97.9 | @updated 18/04/2026 | @service S01
 *
 * שינויים בהוטפיקס זה:
 *  - הסרת שורות AI מה-Alert (עברו לחלון 2 — checkPermissions ב-System_HealthCheck.gs)
 *  - כל שאר הלוגיקה שמורה ללא שינוי
 */

// ─────────────────────────────────────────────────────────────────────────────
// בדיקת רשת חיצונית
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkExternalNetwork
 * בודק נגישות לאינטרנט על-ידי פינג ל-google.com.
 * @returns {boolean}
 */
function checkExternalNetwork() {
  const url = "https://www.google.com";
  try {
    const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200) {
      Logger.log("רשת חיצונית תקינה");
      return true;
    } else {
      Logger.log("רשת חיצונית נכשלה — קוד: " + code);
      return false;
    }
  } catch (e) {
    Logger.log("שגיאת רשת: " + e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// בדיקת נגישות GitHub
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkGitHubConnectivity
 * בודק נגישות ל-GitHub API. קוד 403 נחשב תקין.
 * @returns {boolean}
 */
function checkGitHubConnectivity() {
  const url = "https://api.github.com";
  try {
    const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200 || code === 403) {
      Logger.log("שרת גיטהאב נגיש");
      return true;
    } else {
      Logger.log("שרת גיטהאב לא נגיש — קוד: " + code);
      return false;
    }
  } catch (e) {
    Logger.log("שגיאת גישה לגיטהאב: " + e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// בדיקת תקינות מלאה — חלון 1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * runSystemHealthCheck
 * חלון 1: Alert כללי עם סטטוס רשת, GitHub, Gmail ו-Drive.
 * סטטוס AI מוצג בנפרד דרך checkPermissions (חלון 2).
 */
function runSystemHealthCheck() {
  try {
    // ── בדיקות רשת ושירותי Google ─────────────────────────────────────────
    const networkOk = checkExternalNetwork();
    const githubOk  = checkGitHubConnectivity();

    let gmailOk = false;
    try { GmailApp.getInboxThreads(0, 1); gmailOk = true; } catch (e) {}

    let driveOk = false;
    try { DriveApp.getRootFolder(); driveOk = true; } catch (e) {}

    // ── נתוני זמן וגליון ──────────────────────────────────────────────────
    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");

    const sheet    = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
    const rowCount = sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0;

    const lastRun = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
    let driveStatus = "טרם בוצעה";
    if (lastRun) {
      try {
        driveStatus = Utilities.formatDate(new Date(lastRun), "GMT+3", "dd/MM/yyyy HH:mm");
      } catch (e) {
        driveStatus = lastRun;
      }
    }

    // ── מחרוזת הפלט (ללא שורות AI — עברו לחלון 2) ────────────────────────
    const message =
      "רשת חיצונית: "        + (networkOk ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "גישה לגיטהאב: "       + (githubOk  ? "נגיש ✓" : "לא נגיש ✗") + "\n" +
      "חיבור Gmail: "        + (gmailOk   ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "חיבור Drive: "        + (driveOk   ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "──────────────\n"                                                      +
      "זמן: "                + now                                     + "\n" +
      "שורות בגליון: "       + rowCount                                + "\n" +
      "סריקת Drive אחרונה: " + driveStatus;

    SpreadsheetApp.getUi().alert(
      "בדיקת תקינות מערכת — v97.9",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (e) {
    Logger.log("שגיאה ב-runSystemHealthCheck: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בהרצת בדיקת תקינות: " + e.message);
  }
}