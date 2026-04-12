/**
 * MedicalPilot — NetworkDiagnostics.gs
 * שירות S01 — בדיקות רשת ונגישות
 * גרסה: v97.7 | תאריך: 12/04/2026
 * שינויים: הוספת בדיקות Gmail ו-Drive, הוספת נתונים סטטיסטיים ל-alert
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

function runSystemHealthCheck() {
  try {
    const networkOk = checkExternalNetwork();
    const githubOk  = checkGitHubConnectivity();

    let gmailOk = false;
    try { GmailApp.getInboxThreads(0, 1); gmailOk = true; } catch (e) {}

    let driveOk = false;
    try { DriveApp.getRootFolder(); driveOk = true; } catch (e) {}

    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
    const rowCount = sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0;

    const lastRun = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
    let driveStatus = "טרם בוצעה";
    if (lastRun) {
      try { driveStatus = Utilities.formatDate(new Date(lastRun), "GMT+3", "dd/MM/yyyy HH:mm"); }
      catch (e) { driveStatus = lastRun; }
    }

    const message =
      "רשת חיצונית: "    + (networkOk ? "תקין ✓" : "נכשל ✗") + "\n" +
      "גישה לגיטהאב: "   + (githubOk  ? "נגיש ✓" : "לא נגיש ✗") + "\n" +
      "חיבור Gmail: "    + (gmailOk   ? "תקין ✓" : "נכשל ✗") + "\n" +
      "חיבור Drive: "    + (driveOk   ? "תקין ✓" : "נכשל ✗") + "\n" +
      "──────────────\n" +
      "זמן: "            + now + "\n" +
      "שורות בגליון: "   + rowCount + "\n" +
      "סריקת Drive אחרונה: " + driveStatus;

    SpreadsheetApp.getUi().alert(
      "בדיקת תקינות מערכת — v97.7",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (e) {
    Logger.log("שגיאה ב-runSystemHealthCheck: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בהרצת בדיקת תקינות: " + e.message);
  }
}