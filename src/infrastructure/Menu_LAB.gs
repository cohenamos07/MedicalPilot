/**
 * MedicalPilot — Menu_LAB.gs
 * תפריט מעבדה (LA)
 * גרסה: v98.2 | תאריך: 15/04/2026
 * שינוי: ארגון מחדש — הכנת מערכת, קליטה, עיבוד AI
 */

function buildLabMenu() {
  buildLabMenu_v98_2();
}

function buildLabMenu_v98_2() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v98.2');

  var subMenuSetup = ui.createMenu('⚙️ הכנת מערכת')
    .addItem('בדיקת תקינות מערכת', 'checkSystemMorning')
    .addItem('בדיקת הרשאות', 'checkUserAccess');
  menu.addSubMenu(subMenuSetup);

  menu.addSeparator();

  var subMenuIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail', 'runEmailIngestion')
    .addItem('סריקת Drive', 'syncDriveFiles_LAB')
    .addItem('חילוץ מטא-דאטה ומיון', 'extractMetaData_LAB')
    .addItem('סנכרון סטטוסים', 'syncStatusBeforeOCR')
    .addItem('המרת קבצים ל-OCR', 'runBatchOCR_Test');
  menu.addSubMenu(subMenuIngestion);

  menu.addSeparator();

  var subMenuAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('סיווג מסמכים', 'classifyDocument')
    .addItem('אימות ידני ולמידה', 'showMainSidebar')
    .addItem('חילוץ שדות מלא', 'extractMedicalHeaders');
  menu.addSubMenu(subMenuAI);

  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('🗂️ ניהול מערכת')
    .addItem('גיבוי GitHub', 'uploadToGitHub')
    .addItem('ניהול לוגים', 'logSystemEvent')
    .addItem('הגדרות תשתית', 'getConfig');
  menu.addSubMenu(subMenuAdmin);

  menu.addSeparator();

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('משימות פיתוח', 'refreshDevDashboard')
    .addItem('אבחון AI', 'testAiResponse')
    .addItem('בדיקות QA', 'runAllTests')
    .addSeparator()
    .addItem('🧪 בדיקת כתיבה לגיטהאב', 'testGitHubWrite')
    .addItem('📤 עדכון CONTEXT.md בגיטהאב', 'pushContextToGitHub')
    .addItem('🔄 סנכרון סיום סשן', 'endSessionSync')
    .addSeparator()
    .addItem('⬇️ סנכרון Logger מגיטהאב לעורך', 'testSyncLogger');
  menu.addSubMenu(subMenuDev);

  menu.addToUi();
}

function buildLabMenu_v98_1() { buildLabMenu_v98_2(); }
function buildLabMenu_v98_0() { buildLabMenu_v98_2(); }
function buildLabMenu_v97_9() { buildLabMenu_v98_2(); }
function buildLabMenu_v97_8() { buildLabMenu_v98_2(); }
function buildLabMenu_v97_7() { buildLabMenu_v98_2(); }
function buildLabMenu_v97_5() { buildLabMenu_v98_2(); }

function buildLabMenu_v96_9_1() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('LA v96.9.1')
    .addItem('🔬 ניסוי חילוץ כותרת', 'runAiHeaderExtraction_v96_8_1')
    .addItem('🧪 בדיקת סריקת PDF', 'testPdfProcessing')
    .addSeparator()
    .addItem('🛠️ הרצת אבחון עמודה U', 'runFullDiagnosticToColumnU')
    .addSeparator()
    .addItem('💾 ניסוי: תיעוד סוף יום', 'runEndOfDayBackup')
    .addToUi();
}