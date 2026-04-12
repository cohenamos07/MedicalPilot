/**
 * MedicalPilot — System_HealthCheck.gs
 * Module: S02 — בדיקות בוקר וסטטוס מערכת
 * Version: v97.8 | Date: 12/04/2026
 * * שינויים בגרסה זו:
 * - הפרדת לוגיקת הנתונים לפונקציה פנימית _getMorningStats.
 * - הסרת Stub של runSystemHealthCheck למניעת כפילויות.
 * - הוספת המרת פורמט לתאריך סריקת Drive.
 */

/**
 * פונקציה ראשית להרצה בבוקר או ידנית.
 * מבצעת בדיקת רשת ומציגה נתוני מערכת מורחבים.
 */
function checkSystemMorning() {
  try {
    // קריאה לפונקציית הבדיקה (מוגדרת ב-NetworkDiagnostics.gs)
    runSystemHealthCheck();
    
    // קבלת הנתונים המעובדים מהפונקציה הפנימית
    const statsMessage = _getMorningStats();
    
    // הצגת ה-Toast למשך 8 שניות
    SpreadsheetApp.getActiveSpreadsheet().toast(statsMessage, "סטטוס בוקר MedicalPilot", 8);
    
  } catch (e) {
    const errorMsg = "שגיאה בהרצת בדיקת בוקר: " + e.message;
    Logger.log(errorMsg);
    SpreadsheetApp.getUi().alert(errorMsg);
  }
}

/**
 * פונקציה פנימית לאיסוף נתוני המערכת ועיבודם למחרוזת.
 * @return {string} מחרוזת מעוצבת להצגה.
 */
function _getMorningStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timeZone = "GMT+3";
  const dateFormat = "dd/MM/yyyy HH:mm";
  
  // 1. זמן נוכחי
  const nowFormatted = Utilities.formatDate(new Date(), timeZone, dateFormat);
  
  // 2. ספירת שורות בגיליון ניהול_מיילים (פחות כותרת)
  const sheet = ss.getSheetByName("ניהול_מיילים");
  let emailCount = 0;
  if (sheet) {
    const lastRow = sheet.getLastRow();
    emailCount = lastRow > 0 ? lastRow - 1 : 0;
  }
  
  // 3. תאריך סריקת Drive אחרונה (כולל המרה מפורמט ISO במידה וקיים)
  const driveSyncProp = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
  let driveSyncStatus = "טרם בוצעה";
  
  if (driveSyncProp) {
    try {
      const driveDate = new Date(driveSyncProp);
      driveSyncStatus = Utilities.formatDate(driveDate, timeZone, dateFormat);
    } catch (e) {
      driveSyncStatus = driveSyncProp; // גיבוי למקרה שהערך אינו ISO תקין
    }
  }
  
  // 4. בניית המחרוזת הסופית
  return "גרסה: v97.8\n" +
         "זמן נוכחי: " + nowFormatted + "\n" +
         "שורות בניהול מיילים: " + emailCount + "\n" +
         "סריקת Drive אחרונה: " + driveSyncStatus;
}