/**
 * MedicalPilot — Main.gs
 * @version 10.1 | @updated 31/05/2026 20:38 | @service MAIN
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Main.gs
 * @impacts נקודת כניסה ראשית של המערכת — מפעיל onOpen ובונה תפריטים.
 *          קורא ל: buildLabMenu (Menu_LAB) ו-buildProdMenu (Menu_PROD).
 *          נטען אוטומטית בכל פתיחת הגיליון.
 * שינוי: [v10.1] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *         [v10.0] גרסה קודמת
 */
function onOpen() {
  try {
    if (typeof buildProdMenu === 'function') { buildProdMenu(); }
  } catch (e) { Logger.log("Error loading PROD menu: " + e.message); }
  try {
    if (typeof buildLabMenu === 'function') { buildLabMenu(); }
  } catch (e) { Logger.log("Error loading LAB menu: " + e.message); }
}

function runEmailIngestion() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (typeof runMedicalProcess === 'function') {
      const count = runMedicalProcess();
      ui.alert("סיום פעולה", "עובדו " + (count || 0) + " מיילים חדשים.", ui.ButtonSet.OK);
    } else {
      ui.alert("שגיאה", "הפונקציה runMedicalProcess לא נמצאה.", ui.ButtonSet.OK);
    }
  } catch (e) { ui.alert("שגיאה בהרצה", e.message, ui.ButtonSet.OK); }
}

function runFileManager() { msgBlocked_v97_5(); }

function runOcrService() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (typeof runBatchOCR_Test === 'function') { runBatchOCR_Test(); }
    else { ui.alert("שגיאה", "הפונקציה runBatchOCR_Test לא נמצאה.", ui.ButtonSet.OK); }
  } catch (e) { ui.alert("שגיאה בהרצה", e.message, ui.ButtonSet.OK); }
}

function runOldLabTest() { msgBlocked_v97_5(); }

function runAiHeaderExtraction_v96_8_1() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (typeof real_runAiHeaderExtraction === 'function') { real_runAiHeaderExtraction(); }
    else { msgBlocked_v97_5(); }
  } catch (e) { ui.alert("שגיאה", e.message, ui.ButtonSet.OK); }
}

function checkPermissions() { msgBlocked_v97_5(); }
function checkProjectStatus() { msgBlocked_v97_5(); }
function runFullDiagnosticToColumnU() { msgBlocked_v97_5(); }

function msgBlocked_v97_5() {
  SpreadsheetApp.getUi().alert("הודעה זמנית", "פונקציה זו חסומה כרגע זמנית - לא בשימוש בגרסה זו.", SpreadsheetApp.getUi().ButtonSet.OK);
}

function msgBlocked() { msgBlocked_v97_5(); }
