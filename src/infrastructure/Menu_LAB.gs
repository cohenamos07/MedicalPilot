/**
 * MedicalPilot — Menu_LAB.gs
 * @version 10.6 | @updated 01/05/2026 16:00 | @service MENU_LAB
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_LAB.gs
 * שינוי: הוספת פריט Smart Sync לתפריט סנכרון קבצים וקוד
 */

function buildLabMenu() {
  buildLabMenu_v10_6();
}

function buildLabMenu_v10_6() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v10.6');

  // 🔄 קליטת נתונים
  var subIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail',      'runEmailIngestion')
    .addItem('סריקת Drive',      'syncDriveFiles_LAB')
    .addItem('חילוץ מטא-דאטה',   'extractMetaData');
  menu.addSubMenu(subIngestion);

  menu.addSeparator();

  // 🧠 עיבוד AI
  var subAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('המרה ל-TXT',          'run_MedicalPilot_V2_6_2')
    .addItem('סיווג מסמכים',        'classifyDocument')
    .addItem('אימות ידני ולמידה',   'showMainSidebar')
    .addItem('חילוץ שדות מלא',      'extractMedicalHeaders');
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
    .addItem('הצג מאזן מחלצים',      'showExtractorBalance')
    .addItem('בדוק כל המחלצים',      'checkAllExtractors')
    .addItem('אפס שימוש יומי',       'resetDailyUsage')
    .addItem('הגדר טריגר לילי',      'createDailyResetTrigger');

  var subScheduler = ui.createMenu('⏰ גובים מתוזמנים')
    .addItem('הפעל גוב',          'startJob')
    .addItem('עצור גוב',          'stopJob')
    .addItem('הצג גובים פעילים', 'showActiveJobs');

  var subAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addSubMenu(subInfraTests)
    .addSubMenu(subDataTests)
    .addSubMenu(subResources)
    .addSubMenu(subScheduler)
    .addSeparator()
    .addItem('🏗️ הקמת גליון חדש מהמפה', 'buildSheetFromMap')
    .addItem('שחזור כותרות',               'restoreHeaders')
    .addItem('בדיקת הרשאות כתיבה',         'checkWritePermissions')
    .addSeparator()
    .addItem('ניהול לוגים', 'logSystemEvent');
  menu.addSubMenu(subAdmin);

  menu.addSeparator();

  // 🔬 כלי פיתוח
  var subGitSync = ui.createMenu('🔄 סנכרון גיט')
    .addItem('גיט → עורך (קובץ בודד)', 'syncFromGitByChoice')
    .addItem('גיט → עורך (הכל)',         'syncAllFromGit')
    .addItem('עורך → גיט (קובץ בודד)', 'syncToGitByChoice')
    .addItem('גיבוי מלא',                'syncAllFilesToGitHub');

  var subDocs = ui.createMenu('📝 תיעוד')
    .addItem('עדכון CONTEXT.md',    'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה',   'syncSessionDocs')
    .addItem('סנכרון Logger',         'testSyncLogger')
    .addSeparator()
    .addItem('הדפסת מבנה גליון',    'printSheetMap')
    .addItem('פרטי עמודה בודדת',    'printColumnDetail');

  // 🔄 סנכרון קבצים וקוד
  var subDevSync = ui.createMenu('🔄 סנכרון קבצים וקוד')
    .addItem('הקם גליון מסנכרן_קבצים',      'buildDevSyncSheet')
    .addItem('הפק דוח סנכרון',               'devSync_ScanAndFillSheet')
    .addItem('בצע פעולה על שורה',            'devSync_RunActionOnSelectedRow')
    .addItem('בצע לפי המלצה (Smart Sync)',   'devSync_RunActionSmart');

  var subDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('משימות פיתוח',       'refreshDevDashboard')
    .addItem('בדיקת כתיבה לגיט',   'testGitHubWrite')
    .addSeparator()
    .addSubMenu(subGitSync)
    .addSubMenu(subDocs)
    .addSubMenu(subDevSync);
  menu.addSubMenu(subDev);

  menu.addToUi();
}

function buildLabMenu_v10_5() { buildLabMenu_v10_6(); }
function buildLabMenu_v10_4() { buildLabMenu_v10_6(); }
function buildLabMenu_v10_3() { buildLabMenu_v10_6(); }
function buildLabMenu_v10_2() { buildLabMenu_v10_6(); }
function buildLabMenu_v10_1() { buildLabMenu_v10_6(); }
function buildLabMenu_v10_0() { buildLabMenu_v10_6(); }
function buildLabMenu_v99_0() { buildLabMenu_v10_6(); }
function buildLabMenu_v97_8() { buildLabMenu_v10_6(); }
function buildLabMenu_v97_7() { buildLabMenu_v10_6(); }
function buildLabMenu_v97_5() { buildLabMenu_v10_6(); }