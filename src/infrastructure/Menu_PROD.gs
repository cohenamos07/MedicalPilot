/**
 * MedicalPilot — Menu_PROD.gs
 * @version 10.0 | @updated 27/04/2026 11:00 | @service MENU_PROD
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_PROD.gs
 */

function buildProdMenu() {
  buildProdMenu_v10_0();
}

function buildProdMenu_v10_0() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v10.0');

  // 🔄 קליטת נתונים
  var subIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail', 'runEmailIngestion')
    .addItem('סריקת Drive', 'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה', 'extractMetaData');
  menu.addSubMenu(subIngestion);

  menu.addSeparator();

  // 🧠 עיבוד AI
  var subAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('המרה ל-TXT', 'run_MedicalPilot_V2_6_2')
    .addItem('סיווג מסמכים', 'classifyDocument')
    .addItem('אימות ידני ולמידה', 'showMainSidebar')
    .addItem('חילוץ שדות מלא', 'extractMedicalHeaders');
  menu.addSubMenu(subAI);

  menu.addSeparator();

  // ⚙️ ניהול מערכת
  var subInfraTests = ui.createMenu('🔌 בדיקות תשתית')
    .addItem('תקינות מערכת', 'checkSystemMorning')
    .addItem('הרשאות משתמש', 'checkUserAccess')
    .addItem('חיבור Gemini', 'testAiResponse')
    .addItem('חיבור GitHub', 'testGitHubConnection')
    .addItem('הגדרות מערכת', 'getConfig');

  var subDataTests = ui.createMenu('📊 בדיקות נתונים')
    .addItem('בדיקות QA כלליות', 'runAllTests')
    .addItem('בדיקת לינקי TXT', 'validateTxtLinks')
    .addItem('בדיקת לוגיקה שורות', 'checkRowLogic');

  var subAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addSubMenu(subInfraTests)
    .addSubMenu(subDataTests)
    .addSeparator()
    .addItem('ניהול לוגים', 'logSystemEvent');
  menu.addSubMenu(subAdmin);

  menu.addToUi();
}

function buildProdMenu_v99_0() { buildProdMenu_v10_0(); }
function buildProdMenu_v97_9() { buildProdMenu_v10_0(); }
function buildProdMenu_v97_8() { buildProdMenu_v10_0(); }
function buildProdMenu_v97_5() { buildProdMenu_v10_0(); }

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}