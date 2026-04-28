/**
 * MedicalPilot — Menu_PROD.gs
 * @version 10.1 | @updated 28/04/2026 19:01 | @service MENU_PROD
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_PROD.gs
 * שינוי: הוספת הצג מאזן מחלצים תחת ניהול מערכת
 */

function buildProdMenu() {
  buildProdMenu_v10_1();
}

function buildProdMenu_v10_1() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v10.1');

  // ⚙️ הכנת מערכת
  var subSetup = ui.createMenu('⚙️ הכנת מערכת')
    .addItem('בדיקת תקינות מערכת', 'checkSystemMorning')
    .addItem('בדיקת הרשאות',       'checkUserAccess');
  menu.addSubMenu(subSetup);

  menu.addSeparator();

  // 🔄 קליטת נתונים
  var subIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail',           'runEmailIngestion')
    .addItem('סריקת Drive',           'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה ומיון', 'extractMetaData')
    .addItem('סנכרון סטטוסים',        'syncStatusBeforeOCR')
    .addItem('המרת קבצים ל-OCR',      'runBatchOCR_Test');
  menu.addSubMenu(subIngestion);

  menu.addSeparator();

  // 🧠 עיבוד AI
  var subAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('סיווג מסמכים',      'msgBlocked')
    .addItem('אימות ידני ולמידה', 'showMainSidebar')
    .addItem('חילוץ שדות מלא',    'msgBlocked');
  menu.addSubMenu(subAI);

  menu.addSeparator();

  // 🗂️ ניהול מערכת
  var subAdmin = ui.createMenu('🗂️ ניהול מערכת')
    .addItem('📊 הצג מאזן מחלצים', 'showExtractorBalance')
    .addSeparator()
    .addItem('גיבוי GitHub',        'uploadToGitHub')
    .addItem('ניהול לוגים',         'msgBlocked')
    .addItem('הגדרות תשתית',        'getConfig');
  menu.addSubMenu(subAdmin);

  menu.addToUi();
}

function buildProdMenu_v97_9() { buildProdMenu_v10_1(); }
function buildProdMenu_v97_8() { buildProdMenu_v10_1(); }
function buildProdMenu_v97_7() { buildProdMenu_v10_1(); }
function buildProdMenu_v97_6() { buildProdMenu_v10_1(); }
function buildProdMenu_v97_5() { buildProdMenu_v10_1(); }

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}
