/**
 * MedicalPilot — Menu_PROD.gs
 * תפריט ייצור (PR)
 * גרסה: v97.9 | תאריך: 15/04/2026
 * שינוי: ארגון מחדש — הכנת מערכת, קליטה, עיבוד AI
 */

function buildProdMenu() {
  buildProdMenu_v97_9();
}

function buildProdMenu_v97_9() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v97.9');

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
    .addItem('חילוץ שדות מלא', 'msgBlocked');
  menu.addSubMenu(subMenuAI);

  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('🗂️ ניהול מערכת')
    .addItem('גיבוי GitHub', 'uploadToGitHub')
    .addItem('ניהול לוגים', 'msgBlocked')
    .addItem('הגדרות תשתית', 'getConfig');
  menu.addSubMenu(subMenuAdmin);

  menu.addToUi();
}

function buildProdMenu_v97_8() { buildProdMenu_v97_9(); }
function buildProdMenu_v97_7() { buildProdMenu_v97_9(); }
function buildProdMenu_v97_6() { buildProdMenu_v97_9(); }
function buildProdMenu_v97_5() { buildProdMenu_v97_9(); }

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}

function buildProdMenu_v96_9_1() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('PR v96.9.1')
    .addSubMenu(ui.createMenu('🖥️ מערכת הפעלה')
      .addItem('1. משיכת מיילים', 'runEmailIngestion')
      .addItem('2. רישום קבצים', 'runFileManager')
      .addItem('3. ביצוע OCR וסיווג', 'runOcrService')
      .addItem('4. חילוץ כותרת ומנפיק [בפיתוח]', 'msgBlocked_v96_9_1')
      .addItem('5. סינון כפולים', 'runDeduplication')
      .addItem('6. סיווג תוכן רפואי', 'runMedicalClassification')
      .addItem('7. השלמת נתונים בהנחיה', 'runDataCompletion')
      .addItem('8. חילוץ מלא ושמירה', 'runFullExtraction'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🛠️ פונקציות עזר')
      .addItem('בדיקת מערכת בוקר טוב', 'checkSystemMorning')
      .addItem('בדיקת הרשאות', 'checkPermissions')
      .addItem('בדיקת סטטוס פרויקט', 'checkProjectStatus')
      .addItem('אבחון סוג מסמך', 'runFullDiagnosticToColumnU')
      .addItem('בדיקת גישה לדרייב ו-API', 'checkDriveAccess_v96_8_1')
      .addSeparator()
      .addItem('💾 תיעוד סוף יום [בפיתוח]', 'msgBlocked_v96_9_1'))
    .addToUi();
}

function msgBlocked_v96_9_1() {
  SpreadsheetApp.getUi().alert("הודעה", "פונקציה זו בשיפוץ במעבדה.", SpreadsheetApp.getUi().ButtonSet.OK);
}