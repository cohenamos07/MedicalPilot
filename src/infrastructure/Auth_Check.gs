/**
 * MedicalPilot — Auth_Check.gs
 * @version 97.10 | @updated 05/05/2026 19:00 | @service S02
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Auth_Check.gs
 * שינוי: [FIX-1] כותרת תקנית לסטנדרט המערכת
 *         [FIX-2] הוספת checkAppsScriptAccess — בדיקת גישה לעורך Apps Script
 */

// ══════════════════════════════════════════════════════════════════
// בדיקה מרכזית — כל ההרשאות
// ══════════════════════════════════════════════════════════════════

function checkUserAccess() {
  const gmail       = checkGmailAccess();
  const drive       = checkDriveAccess();
  const docs        = checkDocsAccess();
  const github      = checkGitHubAccess();
  const appsScript  = checkAppsScriptAccess();

  const msg =
    "בדיקת הרשאות מערכת:\n" +
    (gmail      ? "✅" : "❌") + " הרשאת Gmail\n"               +
    (drive      ? "✅" : "❌") + " הרשאת Drive\n"               +
    (docs       ? "✅" : "❌") + " הרשאת Docs\n"                +
    (github     ? "✅" : "❌") + " חיבור GitHub\n"              +
    (appsScript ? "✅" : "❌") + " גישה לעורך Apps Script";

  SpreadsheetApp.getUi().alert(msg);
}

// ══════════════════════════════════════════════════════════════════
// בדיקת גישה ל-Gmail
// ══════════════════════════════════════════════════════════════════

function checkGmailAccess() {
  try {
    GmailApp.getInboxThreads(0, 1);
    Logger.log("Gmail: תקין");
    return true;
  } catch (e) {
    Logger.log("Gmail: נכשל — " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת גישה ל-Drive
// ══════════════════════════════════════════════════════════════════

function checkDriveAccess() {
  try {
    DriveApp.getRootFolder();
    Logger.log("Drive: תקין");
    return true;
  } catch (e) {
    Logger.log("Drive: נכשל — " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת גישה ל-Google Docs
// ══════════════════════════════════════════════════════════════════

function checkDocsAccess() {
  try {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_DOCS);
    if (files.hasNext()) { files.next(); }
    Logger.log("Docs: תקין");
    return true;
  } catch (e) {
    Logger.log("Docs: נכשל — " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת חיבור GitHub
// ══════════════════════════════════════════════════════════════════

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
    Logger.log("GitHub: " + (ok ? "תקין" : "נכשל — קוד " + response.getResponseCode()));
    return ok;
  } catch (e) {
    Logger.log("GitHub: נכשל — " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// [FIX-2] בדיקת גישה לעורך Apps Script API
// ══════════════════════════════════════════════════════════════════

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
      Logger.log("Apps Script API: נכשל — קוד " + code);
      return false;
    }

    const data  = JSON.parse(response.getContentText());
    const files = (data.files || []).filter(f => f.type === "SERVER_JS");

    if (files.length === 0) {
      Logger.log("Apps Script API: מחובר אבל לא מחזיר קבצים — בדוק Script ID");
      return false;
    }

    Logger.log("Apps Script API: תקין — " + files.length + " קבצים נמצאו");
    return true;

  } catch (e) {
    Logger.log("Apps Script API: נכשל — " + e.message);
    return false;
  }
}