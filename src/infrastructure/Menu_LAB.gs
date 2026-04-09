/**
 * MedicalPilot — Menu_LAB.gs v97.5
 * תפריט מעבדה (LA)
 */

function buildLabMenu_v97_5() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v97.5');

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

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('משימות פיתוח', 'refreshDevDashboard')
    .addItem('אבחון AI', 'testAiResponse')
    .addItem('בדיקות QA', 'runAllTests');
  menu.addSubMenu(subMenuDev);

  menu.addToUi();
}

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
