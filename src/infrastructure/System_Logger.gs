/**
 * MedicalPilot — System Logger Module
 * מתודולוגיה: פונקציות משנה מינימליות (Atomic Functions)
 */

/**
 * פונקציה 1: בונה אובייקט נתונים לתיעוד
 * @param {string} version - מספר גרסה
 * @param {string} description - תיאור האירוע
 * @return {Object} אובייקט עם נתוני הסטטוס
 */
function Logger_buildStatusEntry(version, description) {
  try {
    const now = Utilities.formatDate(new Date(), "GMT+2", "dd.MM.yyyy, HH:mm");
    return {
      timestamp: now,
      version: version,
      description: description,
      statusLabel: "סטטוס (" + version + " " + now + ")"
    };
  } catch (e) {
    Logger.log("Error in Logger_buildStatusEntry: " + e.message);
    return null;
  }
}

/**
 * פונקציה 2: הוספת שורה מבנית בגיליון
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - אובייקט הגיליון
 */
function Logger_pushRowDown(sheet) {
  try {
    if (!sheet) return;
    // הוספת שורה ריקה אחרי שורה 6 כדי לדחוף את ההיסטוריה למטה
    sheet.insertRowAfter(6);
  } catch (e) {
    Logger.log("Error in Logger_pushRowDown: " + e.message);
  }
}

/**
 * פונקציה 3: כתיבת הנתונים לתאים הייעודיים
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - אובייקט הגיליון
 * @param {Object} entry - אובייקט הנתונים מפונקציה 1
 */
function Logger_writeStatusRow(sheet, entry) {
  try {
    if (!sheet || !entry) return;
    sheet.getRange("A6").setValue(entry.statusLabel);
    sheet.getRange("B6").setValue(entry.description);
  } catch (e) {
    Logger.log("Error in Logger_writeStatusRow: " + e.message);
  }
}

/**
 * פונקציה 4: עיצוב שורת הסטטוס החדשה וניקוי הקודמת
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - אובייקט הגיליון
 */
function Logger_formatStatusRow(sheet) {
  try {
    if (!sheet) return;
    // עיצוב שורה 6 (החדשה)
    const newRow = sheet.getRange("A6:B6");
    newRow.setBackground("#d9ead3").setFontWeight("bold");
    
    // ניקוי עיצוב שורה 7 (הישנה שנדחפה למטה)
    const oldRow = sheet.getRange("A7:B7");
    oldRow.setBackground(null).setFontWeight("normal");
  } catch (e) {
    Logger.log("Error in Logger_formatStatusRow: " + e.message);
  }
}

/**
 * פונקציה 5: הפונקציה הראשית לתיעוד אירוע מערכת
 * מיועדת לקריאה מתפריטי המערכת
 */
function logSystemEvent(version, description) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("תיעוד מערכת");
    
    if (!sheet) {
      SpreadsheetApp.getUi().alert("שגיאה: גיליון 'תיעוד מערכת' לא נמצא.");
      return;
    }

    // 1. הכנת נתונים
    const entry = Logger_buildStatusEntry(version, description);
    
    // 2. הכנת מבנה הגיליון
    Logger_pushRowDown(sheet);
    
    // 3. כתיבת הנתונים
    Logger_writeStatusRow(sheet, entry);
    
    // 4. עיצוב ויזואלי
    Logger_formatStatusRow(sheet);
    
    SpreadsheetApp.getUi().alert("התיעוד בוצע ונדחף להיסטוריה.");
  } catch (e) {
    Logger.log("Error in logSystemEvent: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בביצוע התיעוד: " + e.message);
  }
}

/**
 * הפונקציה המקורית - נשמרת ללא שינוי לפי כללי הברזל
 */
function runEndOfDayBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("תיעוד מערכת");
  if (!sheet) return;
  const now = Utilities.formatDate(new Date(), "GMT+2", "dd.MM.yyyy, HH:mm");
  const version = "v1.0";
  const desc = "סיום יום: מעבר למבנה מודולרי PR/LA. קיצור שמות תפריטים. הוספת יומן מערכת אוטומטי.";
  sheet.insertRowAfter(6);
  sheet.getRange("A6").setValue("סטטוס (" + version + " " + now + ")");
  sheet.getRange("B6").setValue(desc);
  sheet.getRange("A6:B6").setBackground("#d9ead3").setFontWeight("bold");
  sheet.getRange("A7:B7").setBackground(null).setFontWeight("normal");
  SpreadsheetApp.getUi().alert("התיעוד בוצע ונדחף להיסטוריה.");
}
