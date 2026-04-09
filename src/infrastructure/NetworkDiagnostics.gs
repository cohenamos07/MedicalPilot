/**
 * MedicalPilot — NetworkDiagnostics.gs
 * שירות S01 — בדיקות רשת ונגישות
 * גרסה: v97.5 | תאריך: 09/04/2026
 */

function checkExternalNetwork() {
  const url = "https://httpbin.org/get";
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

function checkGitHubAccess() {
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
    const githubOk = checkGitHubAccess();
    const networkStatus = networkOk ? "תקין ✓" : "נכשל ✗";
    const githubStatus = githubOk ? "נגיש ✓" : "לא נגיש ✗";
    const message = "רשת חיצונית: " + networkStatus + "\nגישה לגיטהאב: " + githubStatus;
    SpreadsheetApp.getUi().alert("בדיקת תקינות מערכת — v97.5", message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log("שגיאה ב-runSystemHealthCheck: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בהרצת בדיקת תקינות: " + e.message);
  }
}
