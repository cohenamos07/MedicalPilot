/**
 * MedicalPilot — Menu_PROD.gs
 * תפריט ייצור (PR)
 * @version 10.4 | @updated 10/05/2026 15:30 | @service MENU_PROD
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_PROD.gs
 * שינוי: הוספת S09 — חילוץ מידע לגליונות תחת עיבוד AI
 */

function buildProdMenu() {
  buildProdMenu_v10_4();
}

function buildProdMenu_v10_4() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v10.4');

  var subMenuSetup = ui.createMenu('⚙️ הכנת מערכת')
    .addItem('בדיקת תקינות מערכת', 'checkSystemMorning')
    .addItem('בדיקת הרשאות', 'checkUserAccess');
  menu.addSubMenu(subMenuSetup);

  menu.addSeparator();

  var subMenuIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail', 'runEmailIngestion')
    .addItem('סריקת Drive', 'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה ומיון', 'extractMetaData')
    .addItem('סנכרון סטטוסים', 'syncStatusBeforeOCR')
    .addItem('המרת קבצים ל-OCR', 'runBatchOCR_Test');
  menu.addSubMenu(subMenuIngestion);

  menu.addSeparator();

  var subMenuAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('סיווג מסמכים', 'msgBlocked')
    .addItem('אימות ידני ולמידה', 'showMainSidebar')
    .addItem('חילוץ שדות מלא', 'msgBlocked')
    .addItem('חילוץ מידע לגליונות', 'runS09');
  menu.addSubMenu(subMenuAI);

  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('תיעוד אירוע מערכת', 'logSystemEvent');
  menu.addSubMenu(subMenuAdmin);

  menu.addToUi();
}

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}