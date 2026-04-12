/**
 * MedicalPilot — Auth_Check.gs
 * שירות S02 — בדיקת הרשאות גישה
 * גרסה: v97.9 | תאריך: 12/04/2026
 * שינוי: הוספת בדיקת חיבור GitHub ל-checkUserAccess
 */

/**
 * פונקציה מרכזית המציגה את סטטוס כל ההרשאות
 */
function checkUserAccess() {
  const gmail  = checkGmailAccess();
  const drive  = checkDriveAccess();
  const docs   = checkDocsAccess();
  const github = checkGitHubAccess();

  const msg =
    "בדיקת הרשאות מערכת:\n" +
    (gmail  ? "✅" : "❌") + " הרשאת Gmail\n" +
    (drive  ? "✅" : "❌") + " הרשאת Drive\n" +
    (docs   ? "✅" : "❌") + " הרשאת Docs\n" +
    (github ? "✅" : "❌") + " חיבור GitHub";

  SpreadsheetApp.getUi().alert(msg);
}

/**
 * בדיקת גישה לשירות Gmail
 * @return {boolean}
 */
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

/**
 * בדיקת גישה לשירות Drive
 * @return {boolean}
 */
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

/**
 * בדיקת גישה למסמכי Google Docs
 * @return {boolean}
 */
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

/**
 * בדיקת חיבור GitHub — טוקן + גישה ל-API
 * @return {boolean}
 */
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
        method: "get",
        headers: {
          "Authorization": "token " + token,
          "Accept": "application/vnd.github.v3+json"
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