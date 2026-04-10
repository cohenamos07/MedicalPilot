/**
 * MedicalPilot — Menu_LAB.gs
 * תפריט מעבדה (LA)
 * @version 97.9 | @updated 10/04/2026
 */

function buildLabMenu() {
  buildLabMenu_v97_9();
}

function buildLabMenu_v97_9() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v97.9');

  var subMenuIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('בדיקת תקינות מערכת', 'checkSystemMorning')
    .addItem('בדיקת הרשאות', 'checkUserAccess')
    .addItem('סריקת Gmail', 'runEmailIngestion')
    .addItem('סריקת Drive', 'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה', 'getFormatDetails');
  menu.addSubMenu(subMenuIngestion);
  menu.addSeparator();

  var subMenuAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('הכנה ל-OCR', 'processDocumentOCR')
    .addItem('סיווג מסמכים', 'classifyDocument')
    .addItem('אימות ידני ולמידה', 'showMainSidebar')
    .addItem('חילוץ שדות מלא', 'extractMedicalHeaders');
  menu.addSubMenu(subMenuAI);
  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('גיבוי GitHub', 'uploadToGitHub')
    .addItem('ניהול לוגים', 'logSystemEvent')
    .addItem('הגדרות תשתית', 'getConfig');
  menu.addSubMenu(subMenuAdmin);
  menu.addSeparator();

  var subMenuPull = ui.createMenu('⬇️ משיכה מגיטהאב לעורך')
    .addItem('משוך Logger', 'testSyncLogger');
  menu.addSubMenu(subMenuPull);
  menu.addSeparator();

  var subMenuPush = ui.createMenu('⬆️ שמירה לגיטהאב')
    .addItem('סנכרון כולל', 'syncAllFilesToGitHub')
    .addSeparator()
    .addItem('שמור Ingestion', 'testSyncIngestion')
    .addItem('שמור MenuLab', 'testSyncMenuLab')
    .addItem('שמור MenuProd', 'testSyncMenuProd')
    .addItem('שמור Main', 'testSyncMain')
    .addItem('שמור GitHubSync', 'testSyncGitHubSync')
    .addItem('שמור EditorToGitHub', 'testSyncEditorToGitHub')
    .addItem('שמור ServiceFolders', 'testSyncServiceFolders')
    .addItem('שמור AuthCheck', 'testSyncAuthCheck');
  menu.addSubMenu(subMenuPush);
  menu.addSeparator();

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('משימות פיתוח', 'refreshDevDashboard')
    .addItem('אבחון AI', 'testAiResponse')
    .addItem('בדיקות QA', 'runAllTests')
    .addSeparator()
    .addItem('בדיקת כתיבה לגיטהאב', 'testGitHubWrite')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סנכרון סיום סשן', 'endSessionSync');
  menu.addSubMenu(subMenuDev);

  menu.addToUi();
}

function buildLabMenu_v97_8() { buildLabMenu_v97_9(); }
function buildLabMenu_v97_7() { buildLabMenu_v97_9(); }
function buildLabMenu_v97_5() { buildLabMenu_v97_9(); }

function buildLabMenu_v96_9_1() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('LA v96.9.1')
    .addItem('ניסוי חילוץ כותרת', 'runAiHeaderExtraction_v96_8_1')
    .addItem('בדיקת סריקת PDF', 'testPdfProcessing')
    .addSeparator()
    .addItem('הרצת אבחון עמודה U', 'runFullDiagnosticToColumnU')
    .addSeparator()
    .addItem('תיעוד סוף יום', 'runEndOfDayBackup')
    .addToUi();
}