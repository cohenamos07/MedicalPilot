/**
 * MedicalPilot — Menu_LAB.gs
 * תפריט מעבדה (LA)
* @version 10.8 | @updated 09/06/2026 20:15 | @service MENU_LAB
  * @git        https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/Menu_LAB.gs
 * @impacts    תפריט מעבדה ראשי של המערכת — מציג כלי פיתוח ותיעוד בלבד.
 *             מבנה: ⚙️ ניהול מערכת | 🔬 כלי פיתוח | 📝 תיעוד מערכת.
 *             קורא ל: logSystemEvent (System_Logger), printSheetMap / printColumnDetail (COLUMN_MAP),
 *             pushContextToGitHub / syncSessionDocs (GitHubSync).
 *             סנכרון עורך↔גיט מנוהל בלעדית דרך אייקוני גליון מסנכרן_קבצים.
 *             ניהול משימות מנוהל בלעדית דרך אייקוני גליון ניהול_משימות.
 * @changes    [v10.8] הסרת 'משימות פיתוח' (refreshDevDashboard — לא קיימת)
 *                     הסרת סעיף 'סנכרון עורך וגיט' — מנוהל דרך אייקוני הגליון
 *             [v10.7] ארגון מחדש — הסרת קליטת נתונים ועיבוד AI
 *             [v10.6] גרסה קודמת
 */

function buildLabMenu() {
  buildLabMenu_v10_8();
}

function buildLabMenu_v10_8() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v10.8');

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('תיעוד אירוע מערכת', 'logSystemEvent');
  menu.addSubMenu(subMenuAdmin);

  menu.addSeparator();

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('הדפסת מבנה גיליון', 'printSheetMap')
    .addItem('פרטי עמודה בודדת', 'printColumnDetail');
  menu.addSubMenu(subMenuDev);

  menu.addSeparator();

  var subMenuDocs = ui.createMenu('📝 תיעוד מערכת')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה', 'syncSessionDocs');
  menu.addSubMenu(subMenuDocs);

  menu.addToUi();
}