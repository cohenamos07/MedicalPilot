/**
 * MedicalPilot — Menu_PROD.gs v97.5
 * תפריט ייצור (PR)
 */

function buildProdMenu_v97_5() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v97.5');

  var subMenuIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('בדיקת תקינות מערכת', 'checkSystemMorning')
    .addItem('בדיקת הרשאות', 'msgBlocked')
    .addItem('סריקת Gmail', 'runEmailIngestion')
    .addItem('סריקת Drive', 'syncDriveFiles')
    .addItem('חילוץ מטא-דאטה', 'msgBlocked');
  menu.addSubMenu(subMenuIngestion);
  menu.addSeparator();

  var subMenuAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('הכנה ל-OCR', 'msgBlocked')
    .addItem('סיווג מסמכים', 'msgBlocked')
    .addItem('אימות ידני ולמידה', 'showMainSidebar')
    .addItem('חילוץ שדות מלא', 'msgBlocked');
  menu.addSubMenu(subMenuAI);
  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('גיבוי GitHub', 'uploadToGitHub')
    .addItem('ניהול לוגים', 'msgBlocked')
    .addItem('הגדרות תשתית', 'getConfig');
  menu.addSubMenu(subMenuAdmin);

  menu.addToUi();
}

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
