/**
 * MedicalPilot — NetworkDiagnostics.gs
 * שירות S01 — בדיקות רשת ונגישות
 * @version v97.9 | @updated 19/04/2026 | @service S01
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

    const aiConnStatus = _checkAiConnectivity();
    const aiAuthStatus = _checkAiAuthorization();

    const message =
      "רשת חיצונית: "        + (networkOk ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "גישה לגיטהאב: "       + (githubOk  ? "נגיש ✓" : "לא נגיש ✗") + "\n" +
      "חיבור Gmail: "        + (gmailOk   ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "חיבור Drive: "        + (driveOk   ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "──────────────\n"                                                      +
      "זמן: "                + now                                     + "\n" +
      "שורות בגליון: "       + rowCount                                + "\n" +
      "סריקת Drive אחרונה: " + driveStatus                            + "\n" +
      "──────────────\n"                                                      +
      "חיבור שירות AI: "     + aiConnStatus                           + "\n" +
      "הרשאת שירות AI: "     + aiAuthStatus;

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