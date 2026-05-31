/**
 * MedicalPilot — System_Logger.gs
 * @version 97.10 | @updated 31/05/2026 21:06 | @service S11
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/System_Logger.gs
 * @impacts ניהול לוגים ורישום אירועי מערכת לגליון.
 *          כולל: logSystemEvent, Logger_writeStatusRow, runEndOfDayBackup.
 *          ⚠️ שורה 6 קריטית — אסור לגעת בשום מצב.
 *          נקרא מכל שירותי המערכת — חלק מתשתית הליבה.
 * שינוי: [v97.10] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *         [v97.9] [FIX-1] כותרת תקנית לסטנדרט המערכת
 */
// ══════════════════════════════════════════════════════════════════
// פונקציה 1 — בניית אובייקט נתונים לתיעוד
// ══════════════════════════════════════════════════════════════════

/**
 * @param {string} version     - מספר גרסה
 * @param {string} description - תיאור האירוע
 * @return {Object} אובייקט עם נתוני הסטטוס
 */
function Logger_buildStatusEntry(version, description) {
  try {
    const now = Utilities.formatDate(new Date(), "GMT+2", "dd.MM.yyyy, HH:mm");
    return {
      timestamp:   now,
      version:     version,
      description: description,
      statusLabel: "סטטוס (" + version + " " + now + ")"
    };
  } catch (e) {
    Logger.log("Error in Logger_buildStatusEntry: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 2 — הוספת שורה מבנית בגיליון
// ⚠️ לא לשנות — תמיד דוחף אחרי שורה 6
// ══════════════════════════════════════════════════════════════════

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - אובייקט הגיליון
 */
function Logger_pushRowDown(sheet) {
  try {
    if (!sheet) return;
    sheet.insertRowAfter(6);
  } catch (e) {
    Logger.log("Error in Logger_pushRowDown: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 3 — כתיבת הנתונים לתאים הייעודיים
// ⚠️ לא לשנות — תמיד כותב לשורה 6
// ══════════════════════════════════════════════════════════════════

/**
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

// ══════════════════════════════════════════════════════════════════
// פונקציה 4 — עיצוב שורת הסטטוס החדשה וניקוי הקודמת
// ══════════════════════════════════════════════════════════════════

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - אובייקט הגיליון
 */
function Logger_formatStatusRow(sheet) {
  try {
    if (!sheet) return;
    // עיצוב שורה 6 (החדשה)
    sheet.getRange("A6:B6").setBackground("#d9ead3").setFontWeight("bold");
    // ניקוי עיצוב שורה 7 (הישנה שנדחפה למטה)
    sheet.getRange("A7:B7").setBackground(null).setFontWeight("normal");
  } catch (e) {
    Logger.log("Error in Logger_formatStatusRow: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 5 — פונקציה ראשית לתיעוד אירוע מערכת
// מיועדת לקריאה מתפריטי המערכת
// ══════════════════════════════════════════════════════════════════

function logSystemEvent(version, description) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("תיעוד מערכת");

    if (!sheet) {
      SpreadsheetApp.getUi().alert("שגיאה: גיליון 'תיעוד מערכת' לא נמצא.");
      return;
    }

    const entry = Logger_buildStatusEntry(version, description);
    Logger_pushRowDown(sheet);
    Logger_writeStatusRow(sheet, entry);
    Logger_formatStatusRow(sheet);

    SpreadsheetApp.getUi().alert("התיעוד בוצע ונדחף להיסטוריה.");
  } catch (e) {
    Logger.log("Error in logSystemEvent: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בביצוע התיעוד: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה מקורית — נשמרת ללא שינוי לפי כללי הברזל
// ══════════════════════════════════════════════════════════════════

function runEndOfDayBackup() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("תיעוד מערכת");
  if (!sheet) return;
  const now     = Utilities.formatDate(new Date(), "GMT+2", "dd.MM.yyyy, HH:mm");
  const version = "v1.0";
  const desc    = "סיום יום: מעבר למבנה מודולרי PR/LA. קיצור שמות תפריטים. הוספת יומן מערכת אוטומטי.";
  sheet.insertRowAfter(6);
  sheet.getRange("A6").setValue("סטטוס (" + version + " " + now + ")");
  sheet.getRange("B6").setValue(desc);
  sheet.getRange("A6:B6").setBackground("#d9ead3").setFontWeight("bold");
  sheet.getRange("A7:B7").setBackground(null).setFontWeight("normal");
  SpreadsheetApp.getUi().alert("התיעוד בוצע ונדחף להיסטוריה.");
}