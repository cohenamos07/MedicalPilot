/**
 * MedicalPilot — Menu_LAB.gs
 * @version 10.0 | @updated 27/04/2026 11:00 | @service MENU_LAB
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_LAB.gs
 */

function buildLabMenu() {
  buildLabMenu_v10_0();
}

function buildLabMenu_v10_0() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v10.0');

  // 🔄 קליטת נתונים
  var subIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail', 'runEmailIngestion')
    .addItem('סריקת Drive', 'syncDriveFiles_LAB')
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

  menu.addSeparator();

  // 🔬 כלי פיתוח
  var subGitSync = ui.createMenu('🔄 סנכרון גיט')
    .addItem('גיט ← עורך (קובץ בודד)', 'syncFromGitByChoice')
    .addItem('גיט ← עורך (הכל)', 'syncAllFromGit')
    .addItem('עורך ← גיט (קובץ בודד)', 'syncToGitByChoice')
    .addItem('גיבוי מלא', 'syncAllFilesToGitHub');

  var subDocs = ui.createMenu('📝 תיעוד')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה', 'syncSessionDocs')
    .addItem('סנכרון Logger', 'testSyncLogger');

  var subDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('משימות פיתוח', 'refreshDevDashboard')
    .addItem('בדיקת כתיבה לגיט', 'testGitHubWrite')
    .addSeparator()
    .addSubMenu(subGitSync)
    .addSubMenu(subDocs);
  menu.addSubMenu(subDev);

  menu.addToUi();
}

function buildLabMenu_v99_0() { buildLabMenu_v10_0(); }
function buildLabMenu_v97_8() { buildLabMenu_v10_0(); }
function buildLabMenu_v97_7() { buildLabMenu_v10_0(); }
function buildLabMenu_v97_5() { buildLabMenu_v10_0(); }
