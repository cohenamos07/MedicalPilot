/**
 * MedicalPilot — Menu_PROD.gs
 * @version 10.2 | @updated 30/04/2026 18:00 | @service MENU_PROD
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_PROD.gs
 * שינוי: עדכון מבנה זהה ל-LAB + הוספת גובים מתוזמנים — ללא כלי פיתוח
 */

function buildProdMenu() {
  buildProdMenu_v10_2();
}

function buildProdMenu_v10_2() {
  var ui   = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v10.2');

  // 🔄 קליטת נתונים
  var subIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail',      'runEmailIngestion')
    .addItem('סריקת Drive',      'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה',  'extractMetaData');
  menu.addSubMenu(subIngestion);

  menu.addSeparator();

  // 🧠 עיבוד AI
  var subAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('המרה ל-TXT',         'run_MedicalPilot_V2_6_2')
    .addItem('סיווג מסמכים',       'msgBlocked')
    .addItem('אימות ידני ולמידה',  'showMainSidebar')
    .addItem('חילוץ שדות מלא',     'msgBlocked');
  menu.addSubMenu(subAI);

  menu.addSeparator();

  // ⚙️ ניהול מערכת
  var subInfraTests = ui.createMenu('🔌 בדיקות תשתית')
    .addItem('תקינות מערכת',  'checkSystemMorning')
    .addItem('הרשאות משתמש',  'checkUserAccess')
    .addItem('חיבור Gemini',  'testAiResponse')
    .addItem('חיבור GitHub',  'testGitHubConnection')
    .addItem('הגדרות מערכת',  'getConfig');

  var subDataTests = ui.createMenu('📊 בדיקות נתונים')
    .addItem('בדיקות QA כלליות',    'runAllTests')
    .addItem('בדיקת לינקי TXT',     'validateTxtLinks')
    .addItem('בדיקת לוגיקה שורות',  'checkRowLogic');

  var subResources = ui.createMenu('📦 מנהל משאבים')
    .addItem('הצג מאזן מחלצים',  'showExtractorBalance')
    .addItem('בדוק כל המחלצים',  'checkAllExtractors')
    .addItem('אפס שימוש יומי',   'resetDailyUsage');

  var subScheduler = ui.createMenu('⏰ גובים מתוזמנים')
    .addItem('הפעל גוב',         'startJob')
    .addItem('עצור גוב',         'stopJob')
    .addItem('הצג גובים פעילים', 'showActiveJobs');

  var subAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addSubMenu(subInfraTests)
    .addSubMenu(subDataTests)
    .addSubMenu(subResources)
    .addSubMenu(subScheduler)
    .addSeparator()
    .addItem('🏗️ הקמת גליון חדש מהמפה', 'buildSheetFromMap')
    .addItem('שחזור כותרות',              'restoreHeaders')
    .addItem('בדיקת הרשאות כתיבה',        'checkWritePermissions')
    .addSeparator()
    .addItem('ניהול לוגים', 'logSystemEvent');
  menu.addSubMenu(subAdmin);

  menu.addToUi();
}

function buildProdMenu_v10_1() { buildProdMenu_v10_2(); }
function buildProdMenu_v97_9() { buildProdMenu_v10_2(); }
function buildProdMenu_v97_8() { buildProdMenu_v10_2(); }
function buildProdMenu_v97_7() { buildProdMenu_v10_2(); }
function buildProdMenu_v97_6() { buildProdMenu_v10_2(); }
function buildProdMenu_v97_5() { buildProdMenu_v10_2(); }

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}
