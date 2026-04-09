/**
 * MedicalPilot — System_HealthCheck.gs
 * שירות S01 — בדיקת תקינות מערכת
 * גרסה: v97.6 | תאריך: 09/04/2026
 */

function checkSystemMorning() {
  try {
    if (typeof runSystemHealthCheck === 'function') {
      runSystemHealthCheck();
    } else {
      SpreadsheetApp.getUi().alert(
        "בדיקת תקינות מערכת — v97.6",
        "חיבור לשרת גוגל: תקין ✓\nגרסה: 97.6",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  } catch (e) {
    Logger.log("שגיאה ב-checkSystemMorning: " + e.message);
  }
}

function runSystemHealthCheck() {
  try {
    const networkOk = (typeof checkExternalNetwork === 'function') ? checkExternalNetwork() : false;
    const githubOk = (typeof checkGitHubAccess === 'function') ? checkGitHubAccess() : false;
    const gmailOk = (typeof checkGmailAccess === 'function') ? checkGmailAccess() : false;
    const driveOk = (typeof checkDriveAccess === 'function') ? checkDriveAccess() : false;
    const docsOk = (typeof checkDocsAccess === 'function') ? checkDocsAccess() : false;

    const message =
      "רשת חיצונית: " + (networkOk ? "תקין ✓" : "נכשל ✗") + "\n" +
      "גישה לגיטהאב: " + (githubOk ? "נגיש ✓" : "לא נגיש ✗") + "\n" +
      "הרשאת Gmail: " + (gmailOk ? "תקין ✓" : "נכשל ✗") + "\n" +
      "הרשאת Drive: " + (driveOk ? "תקין ✓" : "נכשל ✗") + "\n" +
      "הרשאת Docs: " + (docsOk ? "תקין ✓" : "נכשל ✗");

    SpreadsheetApp.getUi().alert(
      "בדיקת תקינות מערכת — v97.6",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log("שגיאה ב-runSystemHealthCheck: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בהרצת בדיקת תקינות: " + e.message);
  }
}
