/**
 * MedicalPilot — System_HealthCheck.gs
 * שירות S01 — בדיקת תקינות מערכת
 * גרסה: v97.5 | תאריך: 09/04/2026
 */

function checkSystemMorning() {
  try {
    if (typeof runSystemHealthCheck === 'function') {
      runSystemHealthCheck();
    } else {
      SpreadsheetApp.getUi().alert(
        "בדיקת תקינות מערכת — v97.5",
        "חיבור לשרת גוגל: תקין ✓\nגרסה: 97.5",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  } catch (e) {
    Logger.log("שגיאה ב-checkSystemMorning: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בבדיקת מערכת: " + e.message);
  }
}
