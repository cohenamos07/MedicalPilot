/**
 * MedicalPilot — Menu_PROD.gs
 * @version 10.7 | @updated 29/05/2026 13:30 | @service MENU_PROD
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_PROD.gs
 * @impacts תפריט ייצור ראשי של המערכת — מציג שירותים פעילים בלבד.
 *          מבנה: ⚙️ הכנת מערכת | 🔄 קליטת נתונים | 🧠 עיבוד AI | 🗂️ ניהול מערכת.
 *          קורא ל: checkSystemMorning, checkUserAccess (S01/S02),
 *          runEmailIngestion, syncDriveFiles, extractMetaData (S03/S04/S05),
 *          run_MedicalPilot_V2_6_2 (S06), classifyDocument (S07),
 *          showMainSidebar (S08), runS09 (S09), showS10Sidebar (S10),
 *          uploadToGitHub, getConfig.
 *          תלויים: כל שירותי הייצור — שינוי שם פונקציה כאן שובר את הקריאה.
 * שינוי: [v10.7] פתיחת S07 — classifyDocument במקום msgBlocked
 *         [v10.6] תיקון S06 — שם+פונקציה מ-OCR ל-TXT (run_MedicalPilot_V2_6_2)
 *         [v10.5] הטמעת שירות S10 — בקרה וחילוץ מרובה אירועים ממסמך
 *         [v10.4] גרסה קודמת
 */

function buildProdMenu() {
  buildProdMenu_v10_7();
}

function buildProdMenu_v10_7() {
  var ui   = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v10.7');

  var subMenuSetup = ui.createMenu('⚙️ הכנת מערכת')
    .addItem('בדיקת תקינות מערכת', 'checkSystemMorning')
    .addItem('בדיקת הרשאות',        'checkUserAccess');
  menu.addSubMenu(subMenuSetup);

  menu.addSeparator();

  var subMenuIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail',              'runEmailIngestion')
    .addItem('סריקת Drive',              'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה ומיון',    'extractMetaData')
    .addItem('סנכרון סטטוסים',           'syncStatusBeforeOCR')
    .addItem('המרת קבצים ל-TXT',         'run_MedicalPilot_V2_6_2');
  menu.addSubMenu(subMenuIngestion);

  menu.addSeparator();

  var subMenuAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('סיווג מסמכים',              'classifyDocument')
    .addItem('אימות ידני ולמידה (S08)',   'showMainSidebar')
    .addItem('חילוץ אירועים רפואיים (S09)', 'runS09')
    .addItem('אימות אירועים (S10)',        'showS10Sidebar')
    .addItem('איפוס תצוגה',               'runExpandView');
  menu.addSubMenu(subMenuAI);

  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('🗂️ ניהול מערכת')
    .addItem('גיבוי GitHub',       'uploadToGitHub')
    .addItem('ניהול לוגים',        'msgBlocked')
    .addItem('הגדרות תשתית',       'getConfig');
  menu.addSubMenu(subMenuAdmin);

  menu.addToUi();
}

// ══════════════════════════════════════════════════════════════════
// גרסאות קודמות — מפנות לעדכנית
// ══════════════════════════════════════════════════════════════════

function buildProdMenu_v10_6()  { buildProdMenu_v10_7(); }
function buildProdMenu_v10_5()  { buildProdMenu_v10_7(); }
function buildProdMenu_v10_4()  { buildProdMenu_v10_7(); }
function buildProdMenu_v97_9()  { buildProdMenu_v10_7(); }
function buildProdMenu_v97_8()  { buildProdMenu_v10_7(); }
function buildProdMenu_v97_7()  { buildProdMenu_v10_7(); }
function buildProdMenu_v97_6()  { buildProdMenu_v10_7(); }
function buildProdMenu_v97_5()  { buildProdMenu_v10_7(); }

// ══════════════════════════════════════════════════════════════════
// הודעת חסימה — שירותים בפיתוח
// ══════════════════════════════════════════════════════════════════

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}

// ══════════════════════════════════════════════════════════════════
// גרסה ישנה — נשמרת לצורך תאימות
// ══════════════════════════════════════════════════════════════════

function buildProdMenu_v96_9_1() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('PR v96.9.1')
    .addSubMenu(ui.createMenu('🖥️ מערכת הפעלה')
      .addItem('1. משיכת מיילים',              'runEmailIngestion')
      .addItem('2. רישום קבצים',               'runFileManager')
      .addItem('3. ביצוע OCR וסיווג',           'runOcrService')
      .addItem('4. חילוץ כותרת ומנפיק [בפיתוח]', 'msgBlocked_v96_9_1')
      .addItem('5. סינון כפולים',               'runDeduplication')
      .addItem('6. סיווג תוכן רפואי',           'runMedicalClassification')
      .addItem('7. השלמת נתונים בהנחיה',        'runDataCompletion')
      .addItem('8. חילוץ מלא ושמירה',           'runFullExtraction'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🛠️ פונקציות עזר')
      .addItem('בדיקת מערכת בוקר טוב',         'checkSystemMorning')
      .addItem('בדיקת הרשאות',                  'checkPermissions')
      .addItem('בדיקת סטטוס פרויקט',            'checkProjectStatus')
      .addItem('אבחון סוג מסמך',                'runFullDiagnosticToColumnU')
      .addItem('בדיקת גישה לדרייב ו-API',       'checkDriveAccess_v96_8_1')
      .addSeparator()
      .addItem('💾 תיעוד סוף יום [בפיתוח]',    'msgBlocked_v96_9_1'))
    .addToUi();
}

function msgBlocked_v96_9_1() {
  SpreadsheetApp.getUi().alert("הודעה", "פונקציה זו בשיפוץ במעבדה.", SpreadsheetApp.getUi().ButtonSet.OK);
}