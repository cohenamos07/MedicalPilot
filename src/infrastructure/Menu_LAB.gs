/**
 * MedicalPilot — Menu_LAB.gs
 * תפריט מעבדה (LA)
 * @version 10.7 | @updated 10/05/2026 13:30 | @service MENU_LAB
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Menu_LAB.gs
 * שינוי: ארגון מחדש — הסרת קליטת נתונים ועיבוד AI, ניקוי פונקציות מתות, 3 סעיפי פיתוח
 */

function buildLabMenu() {
  buildLabMenu_v10_7();
}

function buildLabMenu_v10_7() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v10.7');

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('תיעוד אירוע מערכת', 'logSystemEvent');
  menu.addSubMenu(subMenuAdmin);

  menu.addSeparator();

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('משימות פיתוח', 'refreshDevDashboard')
    .addItem('הדפסת מבנה גיליון', 'printSheetMap')
    .addItem('פרטי עמודה בודדת', 'printColumnDetail');
  menu.addSubMenu(subMenuDev);

  menu.addSeparator();

  var subMenuDocs = ui.createMenu('📝 תיעוד מערכת')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה', 'syncSessionDocs');
  menu.addSubMenu(subMenuDocs);

  menu.addSeparator();

  var subMenuSync = ui.createMenu('🔄 סנכרון עורך וגיט')
    .addItem('פתח גליון מסנכרן', 'devSync_OpenSheet')
    .addItem('סרוק ועדכן גליון', 'devSync_RunScanButton');
  menu.addSubMenu(subMenuSync);

  menu.addToUi();
}