/**
 * MedicalPilot — Auth_Check.gs
 * שירות S02 — בדיקת הרשאות גישה
 * גרסה: v97.6 | תאריך: 09/04/2026
 */

function checkGmailAccess() {
  try {
    const threads = GmailApp.getInboxThreads(0, 1);
    Logger.log("Gmail: תקין");
    return true;
  } catch (e) {
    Logger.log("Gmail: נכשל — " + e.message);
    return false;
  }
}

function checkDriveAccess() {
  try {
    const root = DriveApp.getRootFolder();
    Logger.log("Drive: תקין");
    return true;
  } catch (e) {
    Logger.log("Drive: נכשל — " + e.message);
    return false;
  }
}

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