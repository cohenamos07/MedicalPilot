/**
 * MedicalPilot — Auth_Check.gs
 * @version 97.11 | @updated 20/05/2026 17:00 | @service S02
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Auth_Check.gs
 * @impacts בדיקת הרשאות ל-5 שירותים: Gmail, Drive, Docs, GitHub API, Apps Script API.
 *          מציגה דוח ✅/❌ אחוד למשתמש בלבד — אין כתיבה לגיליון ואין עצירת תהליכים.
 *          תלויות: GITHUB_PAT ב-Script Properties + OAuth Token של הסקריפט.
 *          נקראת ידנית מהתפריט בלבד — אינה חלק מזרימת עיבוד אוטומטי.
 * @note [FIX-1] תיקון הרשאות גישה לתהליכי המערכת
 *       [FIX-2] הוספת checkAppsScriptAccess — בדיקת גישה לתהליכי Apps Script
 */

// ════════════════════════════════════════════════════════════════════
// בדיקת הרשאות — לב לב המערכת
// ════════════════════════════════════════════════════════════════════

function checkUserAccess() {
  const gmail      = checkGmailAccess();
  const drive      = checkDriveAccess();
  const docs       = checkDocsAccess();
  const github     = checkGitHubAccess();
  const appsScript = checkAppsScriptAccess();

  const msg =
    "בדיקת הרשאות גישה לשירותים:\n" +
    (gmail      ? "✅" : "❌") + " הרשאות Gmail\n"            +
    (drive      ? "✅" : "❌") + " הרשאות Drive\n"            +
    (docs       ? "✅" : "❌") + " הרשאות Docs\n"             +
    (github     ? "✅" : "❌") + " חיבור GitHub\n"            +
    (appsScript ? "✅" : "❌") + " גישה לתהליכי Apps Script";

  SpreadsheetApp.getUi().alert(msg);
}

// ════════════════════════════════════════════════════════════════════
// בדיקת גישה לתהליכי-Gmail
// ════════════════════════════════════════════════════════════════════

function checkGmailAccess() {
  try {
    GmailApp.getInboxThreads(0, 1);
    Logger.log("Gmail: קריאה נכונה");
    return true;
  } catch (e) {
    Logger.log("Gmail: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// בדיקת גישה לתהליכי-Drive
// ════════════════════════════════════════════════════════════════════

function checkDriveAccess() {
  try {
    DriveApp.getRootFolder();
    Logger.log("Drive: קריאה נכונה");
    return true;
  } catch (e) {
    Logger.log("Drive: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// בדיקת גישה לתהליכי-Google Docs
// ════════════════════════════════════════════════════════════════════

function checkDocsAccess() {
  try {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_DOCS);
    if (files.hasNext()) { files.next(); }
    Logger.log("Docs: קריאה נכונה");
    return true;
  } catch (e) {
    Logger.log("Docs: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// בדיקת חיבור GitHub
// ════════════════════════════════════════════════════════════════════

function checkGitHubAccess() {
  try {
    const token = PropertiesService.getScriptProperties().getProperty("GITHUB_PAT");
    if (!token) {
      Logger.log("GitHub: טוקן לא נמצא");
      return false;
    }
    const response = UrlFetchApp.fetch(
      "https://api.github.com/repos/cohenamos07/MedicalPilot",
      {
        method:             "get",
        headers:            {
          "Authorization": "token " + token,
          "Accept":        "application/vnd.github.v3+json"
        },
        muteHttpExceptions: true
      }
    );
    const ok = response.getResponseCode() === 200;
    Logger.log("GitHub: " + (ok ? "קריאה נכונה" : "כישלון — קוד " + response.getResponseCode()));
    return ok;
  } catch (e) {
    Logger.log("GitHub: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// [FIX-2] בדיקת גישה לתהליכי Apps Script API
// ════════════════════════════════════════════════════════════════════

function checkAppsScriptAccess() {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const url      = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";

    const response = UrlFetchApp.fetch(url, {
      method:             "get",
      headers:            { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();

    if (code !== 200) {
      Logger.log("Apps Script API: כישלון — קוד " + code);
      return false;
    }

    const data  = JSON.parse(response.getContentText());
    const files = (data.files || []).filter(f => f.type === "SERVER_JS");

    if (files.length === 0) {
      Logger.log("Apps Script API: לא נמצאו קבצי סקריפט — בדוק Script ID");
      return false;
    }

    Logger.log("Apps Script API: קריאה נכונה — " + files.length + " קבצים נמצאו");
    return true;

  } catch (e) {
    Logger.log("Apps Script API: כישלון — " + e.message);
    return false;
  }
}