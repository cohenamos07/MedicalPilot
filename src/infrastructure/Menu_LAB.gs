/**
 * MedicalPilot — Menu_LAB.gs
 * תפריט מעבדה (LA)
* @version 10.11 | @updated 03/07/2026 12:14 | @service MENU_LAB
  * @git        https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/Menu_LAB.gs
 * @impacts    תפריט מעבדה ראשי של המערכת — מציג כלי פיתוח ותיעוד בלבד.
 *             מבנה: ⚙️ ניהול מערכת | 🔬 כלי פיתוח | 📝 תיעוד מערכת.
 *             קורא ל: logSystemEvent (System_Logger), printSheetMap / printColumnDetail (COLUMN_MAP),
 *             checkTxtUrlIntegrity (S06_ConvertTXT), qa_migrateNotesFromR_Task93 /
 *             qa_findOrphanDuplicateRef_Task93 (S11_QArun), pushContextToGitHub /
 *             syncSessionDocs (GitHubSync).
 *             סנכרון עורך↔גיט מנוהל בלעדית דרך אייקוני גליון מסנכרן_קבצים.
 *             ניהול משימות מנוהל בלעדית דרך אייקוני גליון ניהול_משימות.
 * @changes    [v10.11] Task 93 — הוספת buildLabMenu_v10_11 עם פריט תפריט נוסף
 *             'אבחון שורות יתומות (Task 93)' → qa_findOrphanDuplicateRef_Task93.
 *             buildLabMenu() עודכן להצביע לגרסה החדשה. שני הפריטים (מיגרציה +
 *             אבחון) להסרה לאחר סגירת Task 93 סופית.
 *             [v10.10] Task 93 — הוספת buildLabMenu_v10_10 עם פריט תפריט זמני
 *             'מיגרציית Notes חד-פעמית (Task 93)' → qa_migrateNotesFromR_Task93.
 *             [v10.9] [Task 72] הוספת פריט תפריט checkTxtUrlIntegrity ב-🔬 כלי פיתוח
 *             [v10.8] הסרת 'משימות פיתוח' (refreshDevDashboard — לא קיימת)
 *                     הסרת סעיף 'סנכרון עורך וגיט' — מנוהל דרך אייקוני הגליון
 *             [v10.7] ארגון מחדש — הסרת קליטת נתונים ועיבוד AI
 *             [v10.6] גרסה קודמת
 */

function buildLabMenu() {
  buildLabMenu_v10_11();
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
    .addItem('פרטי עמודה בודדת', 'printColumnDetail')
    .addItem('בדיקת תקינות TXT_URL', 'checkTxtUrlIntegrity');
  menu.addSubMenu(subMenuDev);

  menu.addSeparator();

  var subMenuDocs = ui.createMenu('📝 תיעוד מערכת')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה', 'syncSessionDocs');
  menu.addSubMenu(subMenuDocs);

  menu.addToUi();
}
function buildLabMenu_v10_10() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v10.10');

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('תיעוד אירוע מערכת', 'logSystemEvent');
  menu.addSubMenu(subMenuAdmin);

  menu.addSeparator();

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('הדפסת מבנה גיליון', 'printSheetMap')
    .addItem('פרטי עמודה בודדת', 'printColumnDetail')
    .addItem('בדיקת תקינות TXT_URL', 'checkTxtUrlIntegrity')
    .addSeparator()
    .addItem('⚠️ מיגרציית Notes חד-פעמית (Task 93)', 'qa_migrateNotesFromR_Task93');
  menu.addSubMenu(subMenuDev);

  menu.addSeparator();

  var subMenuDocs = ui.createMenu('📝 תיעוד מערכת')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה', 'syncSessionDocs');
  menu.addSubMenu(subMenuDocs);

  menu.addToUi();
}
function buildLabMenu_v10_11() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('LA v10.11');

  var subMenuAdmin = ui.createMenu('⚙️ ניהול מערכת')
    .addItem('תיעוד אירוע מערכת', 'logSystemEvent');
  menu.addSubMenu(subMenuAdmin);

  menu.addSeparator();

  var subMenuDev = ui.createMenu('🔬 כלי פיתוח')
    .addItem('הדפסת מבנה גיליון', 'printSheetMap')
    .addItem('פרטי עמודה בודדת', 'printColumnDetail')
    .addItem('בדיקת תקינות TXT_URL', 'checkTxtUrlIntegrity')
    .addSeparator()
    .addItem('⚠️ מיגרציית Notes חד-פעמית (Task 93)', 'qa_migrateNotesFromR_Task93')
    .addItem('🔍 אבחון שורות יתומות (Task 93)', 'qa_findOrphanDuplicateRef_Task93');
  menu.addSubMenu(subMenuDev);

  menu.addSeparator();

  var subMenuDocs = ui.createMenu('📝 תיעוד מערכת')
    .addItem('עדכון CONTEXT.md', 'pushContextToGitHub')
    .addItem('סיכום ומסמך חפיפה', 'syncSessionDocs');
  menu.addSubMenu(subMenuDocs);

  menu.addToUi();
}