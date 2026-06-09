/**
 * MedicalPilot — Menu_PROD.gs
 * תפריט ייצור ראשי (PR)
 * @version 10.8 | @updated 09/06/2026 21:12 | @service MENU_PROD
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/Menu_PROD.gs
 * @impacts תפריט ייצור ראשי של המערכת — מציג שירותים פעילים בלבד.
 *          מבנה: ⚙️ הכנת מערכת | 🔄 קליטת נתונים | 🧠 עיבוד AI | 🗂️ ניהול מערכת.
 *          כל פריט תפריט זהה לפונקציית האייקון המקבילה בגליון ניהול_מיילים.
 *          קורא ל: runSystemCheckIcon, runAccessCheckIcon (S01/S02),
 *          runGmailIcon, runDriveIcon (S03/S04),
 *          runS05Icon, runS06Icon, runS07Icon (S05/S06/S07),
 *          runS08ViewIcon, runS09ViewIcon, runS10ViewIcon (S08/S09/S10),
 *          runQAView (S11), runArchiveView (S12), runExpandView (S00).
 *          תלויים: כל שירותי הייצור — שינוי שם פונקציה כאן שובר את הקריאה.
 * @changes [v10.8] זהות מלאה בין תפריט לאייקונים — כל פריט קורא לפונקציית האייקון
 *                  הוספת S03 WhatsApp (msgBlocked), S11 QA, S12 ארכוב מסמכים
 *                  הוספת קוד שירות (SXX) לכל הפריטים
 *                  מחיקת סנכרון סטטוסים (syncStatusBeforeOCR — ארכיבית)
 *          [v10.7] פתיחת S07 — classifyDocument במקום msgBlocked
 *          [v10.6] תיקון S06 — שם+פונקציה מ-OCR ל-TXT
 *          [v10.5] הטמעת שירות S10
 *          [v10.4] גרסה קודמת
 */
function buildProdMenu() {
  buildProdMenu_v10_8();
}

function buildProdMenu_v10_8() {
  var ui   = SpreadsheetApp.getUi();
  var menu = ui.createMenu('PR v10.8');

  var subMenuSetup = ui.createMenu('⚙️ הכנת מערכת')
    .addItem('בדיקת תקינות מערכת (S01)', 'runSystemCheckIcon')
    .addItem('בדיקת הרשאות (S02)',        'runAccessCheckIcon')
    .addItem('אפס תצוגה (S00)',           'runExpandView');
  menu.addSubMenu(subMenuSetup);

  menu.addSeparator();

  var subMenuIngestion = ui.createMenu('🔄 קליטת נתונים')
    .addItem('סריקת Gmail (S03)',         'runGmailIcon')
    .addItem('סריקת WhatsApp (S03)',      'msgBlocked')
    .addItem('סריקת Drive (S04)',         'runDriveIcon')
    .addItem('חילוץ מטא-דאטה (S05)',     'runS05Icon')
    .addItem('המרת קבצים ל-TXT (S06)',   'runS06Icon');
  menu.addSubMenu(subMenuIngestion);

  menu.addSeparator();

  var subMenuAI = ui.createMenu('🧠 עיבוד AI')
    .addItem('סיווג מסמכים (S07)',              'runS07Icon')
    .addItem('אימות ידני ולמידה (S08)',          'runS08ViewIcon')
    .addItem('חילוץ אירועים רפואיים (S09)',      'runS09ViewIcon')
    .addItem('אימות אירועים (S10)',              'runS10ViewIcon')
    .addItem('QA / בדיקה (S11)',                'runQAView')
    .addItem('ארכוב מסמכים (S12)',              'runArchiveView');
  menu.addSubMenu(subMenuAI);

  menu.addSeparator();

  var subMenuAdmin = ui.createMenu('🗂️ ניהול מערכת')
    .addItem('גיבוי GitHub',       'uploadToGitHub')
    .addItem('ניהול לוגים',        'msgBlocked')
    .addItem('הגדרות תשתית',       'getConfig');
  menu.addSubMenu(subMenuAdmin);

  menu.addToUi();
}

// ══════════════════════════════════════════════════════════════════
// גרסאות קודמות — מפנות לעדכנית
// ══════════════════════════════════════════════════════════════════

function buildProdMenu_v10_7()  { buildProdMenu_v10_8(); }
function buildProdMenu_v10_6()  { buildProdMenu_v10_8(); }
function buildProdMenu_v10_5()  { buildProdMenu_v10_8(); }
function buildProdMenu_v10_4()  { buildProdMenu_v10_8(); }
function buildProdMenu_v97_9()  { buildProdMenu_v10_8(); }
function buildProdMenu_v97_8()  { buildProdMenu_v10_8(); }
function buildProdMenu_v97_7()  { buildProdMenu_v10_8(); }
function buildProdMenu_v97_6()  { buildProdMenu_v10_8(); }
function buildProdMenu_v97_5()  { buildProdMenu_v10_8(); }

// ══════════════════════════════════════════════════════════════════
// הודעת חסימה — שירותים בפיתוח
// ══════════════════════════════════════════════════════════════════

function msgBlocked() {
  SpreadsheetApp.getUi().alert('⏳ שירות זה בבדיקה בסביבת LAB\nיפתח בייצור לאחר אישור.');
}

// ══════════════════════════════════════════════════════════════════
// גרסה ישנה — נשמרת לצורך תאימות
// ══════════════════════════════════════════════════════════════════

function buildProdMenu_v96_9_1() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('PR v96.9.1')
    .addSubMenu(ui.createMenu('🖥️ מערכת הפעלה')
      .addItem('1. משיכת מיילים',              'runEmailIngestion')
      .addItem('2. רישום קבצים',               'runFileManager')
      .addItem('3. ביצוע OCR וסיווג',           'runOcrService')
      .addItem('4. חילוץ כותרת ומנפיק [בפיתוח]', 'msgBlocked_v96_9_1')
      .addItem('5. סינון כפולים',               'runDeduplication')
      .addItem('6. סיווג תוכן רפואי',           'runMedicalClassification')
      .addItem('7. השלמת נתונים בהנחיה',        'runDataCompletion')
      .addItem('8. חילוץ מלא ושמירה',           'runFullExtraction'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🛠️ פונקציות עזר')
      .addItem('בדיקת מערכת בוקר טוב',         'checkSystemMorning')
      .addItem('בדיקת הרשאות',                  'checkPermissions')
      .addItem('בדיקת סטטוס פרויקט',            'checkProjectStatus')
      .addItem('אבחון סוג מסמך',                'runFullDiagnosticToColumnU')
      .addItem('בדיקת גישה לדרייב ו-API',       'checkDriveAccess_v96_8_1')
      .addSeparator()
      .addItem('💾 תיעוד סוף יום [בפיתוח]',    'msgBlocked_v96_9_1'))
    .addToUi();
}

function msgBlocked_v96_9_1() {
  SpreadsheetApp.getUi().alert("הודעה", "פונקציה זו בשיפוץ במעבדה.", SpreadsheetApp.getUi().ButtonSet.OK);
}