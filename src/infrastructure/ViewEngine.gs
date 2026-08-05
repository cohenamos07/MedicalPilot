/**
 * @file        ViewEngine.gs
 * @version 2.8.5 | @updated 05/08/2026 21:37 | @service VIEWENGINE
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/ViewEngine.gs
 * @description מנוע מבטים — פילטר שורות וגלילה לפי הקשר עבודה בגליון ניהול_מיילים.
 *              13 איקונים בניהול_מיילים (S10 הוסר — עבר ליומן_אירועים_רפואי):
 *              expand, systemCheck, accessCheck, gmail, whatsapp, drive,
 *              metadata, convert, classify, s08, s09, qa, archive.
 *              כל איקון קבוע בעמודה קבועה לפי ICON_MAP — לעולם לא נמחק או מוזז.
 *              עמודות תמיד גלויות — אין הסתרת עמודות (חוץ מ-A בברירת מחדל).
 *              כל מבט = פילטר שורות + גלילה לעמודה רלוונטית.
 *              הרחב/צמצם = ביטול פילטר שורות + flush() + גלילה לתחילת גיליון.
 *              נקרא מאייקוני הגליון בלבד — אינו חלק מזרימת עיבוד אוטומטי.
 *              S11 QA — לא מפעיל פילטר שורות, עובד על כל הגליון.
 *              [v2.5.0] תמיכה בגליון יומן_אירועים_רפואי — 2 איקונים.
 *              [v2.8.0] Task 128 — "הרחב" הפך לדיספצ'ר רב-תכליתי: מיקום הסמן
 *              (עמודה) בזמן הלחיצה קובע אם מופעל מבט/פילטר ספציפי (8 עמודות
 *              ממופות ב-COLUMN_TO_VIEWKEY) או ביטול מלא (_doExpand — כל עמודה
 *              אחרת, כולל A). כל 12 אייקוני-הפעולה (כל ICON_MAP חוץ מ"הרחב")
 *              מבטלים כל פילטר פעיל בתחילת ריצתם באופן בלתי-תלוי, ללא קשר
 *              למיקום הסמן — כדי להבטיח שתהליכי S01-S09/QA/S12 תמיד רצים על
 *              הגליון ללא פילטר פעיל (חשד לשורש Task 123). שינוי זה חל אך
 *              ורק על ICON_MAP/VIEW_SHEET_NAME (ניהול_מיילים) — אין נגיעה
 *              ב-MEDICAL_EVENTS_ICON_MAP/runExpandViewEvents/runS10ViewIconEvents
 *              (יומן_אירועים_רפואי, ארכיטקטורה נפרדת).
 * @impacts     ניהול_מיילים: קורא פילטרים — לא כותב ערכים לתאים.
 *              runStatusCheck כותב צבע רקע לשורות שגויות בלבד.
 *              יומן_אירועים_רפואי: setupMedicalEventsIcons — מכניס 2 איקונים אוטומטית.
 *              תלויות: S01 (checkSystemMorning) | S02 (checkUserAccess)
 *                      S03 (runEmailIngestion) | S04 (syncDriveFiles)
 *                      S05 (extractMetaData) | S06 (run_MedicalPilot_V2_6_2, nightlyConvertBatch)
 *                      S07 (run_S07_ActiveRow, executeS07Classification)
 *                      S08 (showMainSidebar) | S09 (runS09) | S10 (showS10Sidebar)
 *                      S11 (runQAViewMain)
 * @callers     אייקוני גליון ניהול_מיילים בלבד — שורה 2
 *              אייקוני גליון יומן_אירועים_רפואי — שורה 2
 * @functions   switchView | viewEngine_buildCriteria | _doExpand | _removeActiveFilter
 *              runExpandView | runSystemCheckIcon | runAccessCheckIcon
 *              runGmailIcon | runWhatsAppIcon | runDriveIcon
 *              runS05Icon | runS06Icon | runS07Icon
 *              runS08ViewIcon | runS09ViewIcon | runS10ViewIcon
 *              runQAView | runArchiveView | runStatusCheck
 *              setupIcons | cleanAndResetIcons | debugIcons
 *              runExpandViewEvents | runS10ViewIconEvents | setupMedicalEventsIcons
 * @changes     [v2.8.5] Task 162 — runAccessCheckIcon: הוחלפה קריאה ישירה ל-
 *          checkUserAccess() בפתיחת דיאלוג מודלי S02_AccessDialog.html
 *          (HtmlService.createHtmlOutputFromFile, 480x420). checkUserAccess
 *          עצמה (Auth_Check.gs) שונתה במקביל להחזרת מבנה נתונים במקום alert —
 *          ראה Auth_Check.gs v97.12 לפירוט מלא.
 */
const VIEW_SHEET_NAME = "ניהול_מיילים";
const VIEW_TOTAL_COLS = 27;

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — מיפוי עמודת-סמן ← viewKey
// נקרא ע"י runExpandView (הדיספצ'ר) בלבד — קובע איזה מבט/פילטר
// יופעל כשלוחצים "הרחב" בהתאם למיקום הסמן בזמן הלחיצה.
// עמודה שלא מופיעה כאן ← ברירת מחדל (_doExpand — ביטול מלא).
// ══════════════════════════════════════════════════════════════════

const COLUMN_TO_VIEWKEY = {
  4:  "gmail",
  6:  "drive",
  10: "metadata",
  11: "convert",
  13: "classify",
  14: "s08",
  15: "s09",
  22: "archive"
};

// ══════════════════════════════════════════════════════════════════
// מיפוי איקונים — 13 איקונים
// [v2.7.0] S10 הוסר — עבר ליומן_אירועים_רפואי
// ══════════════════════════════════════════════════════════════════

const ICON_MAP = [
  { col: 1,  script: "runExpandView",      fileId: "1UAfAw8B3zGxTM8YoiSNpMTK8qP9FXHS2", label: "[ ↔ הרחב ]"          },
  { col: 2,  script: "runSystemCheckIcon", fileId: "1MXtKBh20PUFc3oJiWPSl-3fKHDsctpnU", label: "[ S01 בדיקת מערכת ]" },
  { col: 3,  script: "runAccessCheckIcon", fileId: "15eArM62_0wmbMFoZth9w-U37XFlsVZY6", label: "[ S02 הרשאות ]"       },
  { col: 4,  script: "runGmailIcon",       fileId: "18nmNMbOSqJRr3eDHOvrhFJ_owXYcwKlV", label: "[ S03 Gmail ]"        },
  { col: 5,  script: "runWhatsAppIcon",    fileId: "1F9_oDyMLHNbgB92NlSx_WTObxuUfYpsD", label: "[ S03 WhatsApp ]"    },
  { col: 6,  script: "runDriveIcon",       fileId: "1Dka9DOf2ssie28L0oJzkB2YIa95gZRR-", label: "[ S04 Drive ]"        },
  { col: 10, script: "runS05Icon",         fileId: "1mBLGCOhUDCFyswBKu26OGNuf3KPnMUOm", label: "[ S05 מטא-דאטה ]"    },
  { col: 11, script: "runS06Icon",         fileId: "17COhz4MPHfgLtND3Yrug-Ke987JdhB4-", label: "[ S06 המרת TXT ]"    },
  { col: 13, script: "runS07Icon",         fileId: "1eyjIU2H13ZnTL5H9UJntV0egdbh3WyUY", label: "[ S07 סיווג AI ]"     },
  { col: 14, script: "runS08ViewIcon",     fileId: "1Xckh4J0FVgr2gIY6os92qlLLyMk-EyQp", label: "[ S08 אימות ידני ]"  },
  { col: 15, script: "runS09ViewIcon",     fileId: "1mX_Wi6MLfLvcmRqCe8WPvWD9hP4gpAgN", label: "[ S09 חילוץ ]"       },
  { col: 17, script: "runQAView",          fileId: "1hw2sA4t4H5-OR0k8crG7wuI5Pkh0-_3G", label: "[ S11 QA ]"          },
  { col: 22, script: "runArchiveView",     fileId: "1sHIxX5ZUy-u1MRUxqOnvM9ngVd7ew5EU", label: "[ S12 ארכיון ]"      }
];

// ══════════════════════════════════════════════════════════════════
// [v2.5.0] מיפוי איקונים לגליון יומן_אירועים_רפואי
// אותם fileId כמו ניהול_מיילים — פונקציות גנריות לגליונות יעד
// ══════════════════════════════════════════════════════════════════

const MEDICAL_EVENTS_SHEET_NAME = "יומן_אירועים_רפואי";

const MEDICAL_EVENTS_ICON_MAP = [
  {
    col:    1,
    script: "runExpandViewEvents",
    fileId: "1UAfAw8B3zGxTM8YoiSNpMTK8qP9FXHS2",  // זהה ל-runExpandView
    label:  "[ ↔ הרחב ]",
    bg:     "#78909C",
    fg:     "#ffffff"
  },
  {
    col:    3,
    script: "runS10ViewIconEvents",
    fileId: "1YZcEifvHAsBtstAFdtVtqNTODpxuXCkM",  // זהה ל-runS10ViewIcon
    label:  "[ S10 אימות ]",
    bg:     "#7E57C2",
    fg:     "#ffffff"
  }
];

// ══════════════════════════════════════════════════════════════════
// צבעי שורה 3 לפי עמודה
// [v2.3.0] S11 QA הוזז מ-21 ל-17
// ══════════════════════════════════════════════════════════════════

const ROW3_COLORS = {
  1:  { bg: "#78909C", fg: "#ffffff" },
  2:  { bg: "#90A4AE", fg: "#ffffff" },
  3:  { bg: "#90A4AE", fg: "#ffffff" },
  4:  { bg: "#4CAF50", fg: "#ffffff" },
  5:  { bg: "#25D366", fg: "#ffffff" },
  6:  { bg: "#4CAF50", fg: "#ffffff" },
  10: { bg: "#FF9800", fg: "#ffffff" },
  11: { bg: "#FF9800", fg: "#ffffff" },
  13: { bg: "#7E57C2", fg: "#ffffff" },
  14: { bg: "#7E57C2", fg: "#ffffff" },
  15: { bg: "#7E57C2", fg: "#ffffff" },
  16: { bg: "#7E57C2", fg: "#ffffff" },
  17: { bg: "#29B6F6", fg: "#ffffff" },
  22: { bg: "#F44336", fg: "#ffffff" }
};

// ══════════════════════════════════════════════════════════════════
// VIEW_CONFIG — הגדרת מבטים
// [v2.3.0] qa.scrollToCol עודכן מ-21 ל-17
// ══════════════════════════════════════════════════════════════════

const VIEW_CONFIG = {

  expand: {
    label:       "הרחב — כל השורות",
    scrollToCol: 2,
    filter:      null
  },

  systemCheck: {
    label:       "בדיקת מערכת",
    scrollToCol: 2,
    filter:      null
  },

  accessCheck: {
    label:       "בדיקת הרשאות",
    scrollToCol: 2,
    filter:      null
  },

  gmail: {
    label:       "Gmail",
    scrollToCol: 4,
    filter:      { col: 3, type: "eq", value: "Gmail" }
  },

  whatsapp: {
    label:       "WhatsApp",
    scrollToCol: 5,
    filter:      null
  },

  drive: {
    label:       "Drive",
    scrollToCol: 6,
    filter:      { col: 3, type: "eq", value: "Drive_Manual" }
  },

  metadata: {
    label:       "מטא-דאטה",
    scrollToCol: 8,
    filter:      {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="",$M1="ממתין להמרה ל-TXT")'
    }
  },

  convert: {
    label:       "המרה ל-TXT",
    scrollToCol: 11,
    filter:      { col: 13, type: "eq", value: "ממתין להמרה ל-TXT" }
  },

  classify: {
    label:       "סיווג AI",
    scrollToCol: 13,
    filter:      { col: 13, type: "eq", value: "הומר ל-TXT" }
  },

  s08: {
    label:       "אימות ידני S08",
    scrollToCol: 14,
    filter:      {
      col:     13,
      type:    "formula",
      formula: '=OR(AND($M1="מחולץ",NOT(ISBLANK($X1))),NOT(ISBLANK($R1)))'
    }
  },

  s09: {
    label:       "חילוץ אירועים S09",
    scrollToCol: 15,
    filter:      { col: 13, type: "eq", value: "מאושר" }
  },

  s10: {
    label:       "אימות אירועים S10",
    scrollToCol: 16,
    filter:      { col: 13, type: "eq", value: "חולץ לגליונות" }
  },

  qa: {
    label:       "S11 QA",
    scrollToCol: 17,
    filter:      null  // [v2.4.0] QA עובד על כל הגליון — אין פילטר שורות
  },

  archive: {
    label:       "S12 ארכיון",
    scrollToCol: 1,
    filter:      {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="הופץ",$M1="הושלם")'
    }
  }
};

// ══════════════════════════════════════════════════════════════════
// switchView — מנוע המבטים המרכזי
// ══════════════════════════════════════════════════════════════════

function switchView(viewKey) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("גיליון '" + VIEW_SHEET_NAME + "' לא נמצא.");
      return;
    }

    const config = VIEW_CONFIG[viewKey];
    if (!config) {
      SpreadsheetApp.getUi().alert("מבט לא מוכר: " + viewKey);
      return;
    }

    sheet.setFrozenRows(4);

    _removeActiveFilter(sheet);

    if (config.filter) {
      const lastRow     = Math.max(sheet.getLastRow(), 5);
      const filterRange = sheet.getRange(4, 1, lastRow - 3, VIEW_TOTAL_COLS);
      const filter      = filterRange.createFilter();
      const criteria    = viewEngine_buildCriteria(config.filter);
      if (criteria) {
        filter.setColumnFilterCriteria(config.filter.col, criteria);
      }
    }

    if (config.scrollToCol) {
      sheet.getRange(4, config.scrollToCol).activate();
    }

    Logger.log("[ViewEngine] מבט פעיל: " + config.label + " | עמודה: " + config.scrollToCol);

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-switchView: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה בהחלפת מבט: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// viewEngine_buildCriteria — בניית קריטריון פילטר
// ══════════════════════════════════════════════════════════════════

function viewEngine_buildCriteria(filterDef) {
  try {
    if (filterDef.type === "eq") {
      return SpreadsheetApp.newFilterCriteria().whenTextEqualTo(filterDef.value).build();
    }
    if (filterDef.type === "contains") {
      return SpreadsheetApp.newFilterCriteria().whenTextContains(filterDef.value).build();
    }
    if (filterDef.type === "notContains") {
      return SpreadsheetApp.newFilterCriteria().whenTextDoesNotContain(filterDef.value).build();
    }
    if (filterDef.type === "formula") {
      return SpreadsheetApp.newFilterCriteria().whenFormulaSatisfied(filterDef.formula).build();
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה בבניית קריטריון: " + e.toString());
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — _removeActiveFilter — helper מרוכז
// מבטל כל פילטר בסיסי פעיל בגליון, אם קיים. נקרא מ-switchView,
// _doExpand, וכל אייקוני הפעולה (ביטחון מלא — לא תלוי מיקום סמן).
// ══════════════════════════════════════════════════════════════════

function _removeActiveFilter(sheet) {
  const existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
    SpreadsheetApp.flush();
  }
}

// ══════════════════════════════════════════════════════════════════
// _doExpand — ביטול מוחלט של כל הפילטרים + גלילה אמיתית לתחילת הגליון
// [v2.2.0] flush() אחרי remove() — reset מוחלט בכל מצב
// [v2.8.1] Task 128 — תוקן באג שהתגלה באימות חי: activate() על A1
// לבדו לא גורר גלילה חזותית, כי A1 יושב בשורות הקפואות (1-4) שתמיד
// גלויות — Sheets לא "מזיז" את חלון התצוגה לתא שכבר גלוי. הפתרון:
// מפעילים activate() קודם על שורת הנתונים הראשונה (5, לא קפואה) —
// זה כן מכריח גלילה של אזור הנתונים לראש הגליון — ורק אז חוזרים ל-A1,
// כדי שהתא הפעיל הסופי יישאר A1 (התנהגות "קונטרול הום" מלאה: גם
// גלילה אמיתית וגם מיקום סמן ב-A1).
// ══════════════════════════════════════════════════════════════════

function _doExpand() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    _removeActiveFilter(sheet);

    const firstDataRow = SHEET_CONFIG[VIEW_SHEET_NAME].FIRST_DATA_ROW;
    sheet.getRange(firstDataRow, 1).activate();
    SpreadsheetApp.flush();
    sheet.getRange(1, 1).activate();

    Logger.log("[ViewEngine] _doExpand — reset מוחלט + גלילה אמיתית לתחילת הגליון");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-_doExpand: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runExpandView — דיספצ'ר רב-תכליתי
// עמודת הסמן בזמן הלחיצה קובעת את הפעולה:
//   עמודה ∈ COLUMN_TO_VIEWKEY → switchView(viewKey) (הפעלת מבט/פילטר)
//   כל עמודה אחרת (כולל A)    → _doExpand() (ביטול מלא)
// ══════════════════════════════════════════════════════════════════

function runExpandView() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("גיליון '" + VIEW_SHEET_NAME + "' לא נמצא.");
      return;
    }

    const activeCol   = sheet.getActiveCell().getColumn();
    const originalRow = sheet.getActiveCell().getRow();
    const viewKey     = COLUMN_TO_VIEWKEY[activeCol];

    if (viewKey) {
      switchView(viewKey);
      _restoreActiveRowAfterSwitch(sheet, originalRow);
      Logger.log("[ViewEngine] runExpandView — עמודה " + activeCol + " → מבט: " + viewKey);
    } else {
      _doExpand();
      Logger.log("[ViewEngine] runExpandView — עמודה " + activeCol + " ללא מבט ממופה → הרחב רגיל");
    }

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runExpandView: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runSystemCheckIcon — עמודה B — S01
// switchView הוסרה — _removeActiveFilter תמיד, ללא תלות בסמן
// ══════════════════════════════════════════════════════════════════

function runSystemCheckIcon() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
  _removeActiveFilter(sheet);
  checkSystemMorning();
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runAccessCheckIcon — עמודה C — S02
// switchView הוסרה — _removeActiveFilter תמיד, ללא תלות בסמן
// ══════════════════════════════════════════════════════════════════

function runAccessCheckIcon() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
  _removeActiveFilter(sheet);

  const html = HtmlService.createHtmlOutputFromFile('S02_AccessDialog')
    .setWidth(480)
    .setHeight(420);

  SpreadsheetApp.getUi().showModalDialog(html, 'S02 — בדיקת הרשאות');
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runGmailIcon — עמודה D — S03 Gmail
// switchView הוסרה — _removeActiveFilter תמיד, ללא תלות בסמן.
// הפעלת פילטר gmail עצמו עברה ל"הרחב" (עמודה D + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runGmailIcon() {
  const ui      = SpreadsheetApp.getUi();
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
  _removeActiveFilter(sheet);
  const confirm = ui.alert(
    "S03 — סריקת Gmail",
    "האם להריץ סריקת Gmail ומשיכת מיילים חדשים?",
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    runEmailIngestion();
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runWhatsAppIcon — עמודה E — S03 WhatsApp (לא פעיל — בפיתוח)
// switchView הוסרה — _removeActiveFilter תמיד, ללא תלות בסמן
// ══════════════════════════════════════════════════════════════════

function runWhatsAppIcon() {
  const ui    = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
  _removeActiveFilter(sheet);
  ui.alert(
    "WhatsApp — בפיתוח",
    "חיבור WhatsApp טרם הוגדר.\nהפונקציה תחובר בהמשך.",
    ui.ButtonSet.OK
  );
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runDriveIcon — עמודה F — S04 Drive
// switchView הוסרה — _removeActiveFilter תמיד, ללא תלות בסמן.
// הפעלת פילטר drive עצמו עברה ל"הרחב" (עמודה F + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runDriveIcon() {
  const ui      = SpreadsheetApp.getUi();
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
  _removeActiveFilter(sheet);
  const confirm = ui.alert(
    "S04 — סריקת Drive",
    "האם להריץ סריקת Drive וסנכרון קבצים חדשים?",
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    syncDriveFiles();
  }
}


// ══════════════════════════════════════════════════════════════════
// [Task 83] שחזור השורה הפעילה המקורית אחרי switchView
// switchView מפעילה activate() על שורה 4 (לצורך גלילה לעמודה) —
// זה דורס את activeRow שהמשתמש עמד עליו. הפונקציה משחזרת אותו.
// [v2.8.0] נשארת רלוונטית אך ורק דרך runExpandView — המקום היחיד
// שעדיין קורא switchView (עבור 8 עמודות COLUMN_TO_VIEWKEY).
// ══════════════════════════════════════════════════════════════════

function _restoreActiveRowAfterSwitch(sheet, originalRow) {
  const firstRow = SHEET_CONFIG[VIEW_SHEET_NAME].FIRST_DATA_ROW;
  if (originalRow >= firstRow) {
    const col = sheet.getActiveCell().getColumn();
    sheet.getRange(originalRow, col).activate();
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runS05Icon — עמודה J — S05 חילוץ מטא-דאטה
// switchView הוסרה — _removeActiveFilter תמיד, ללא תלות בסמן.
// הפעלת פילטר metadata עצמו עברה ל"הרחב" (עמודה J + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runS05Icon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
    _removeActiveFilter(sheet);
    const confirm = ui.alert(
      "S05 — חילוץ מטא-דאטה",
      "הפעולה תסרוק את כל הגיליון\nותחלץ מטא-דאטה לשורות הממתינות.\n\nהאם להמשיך?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      if (typeof extractMetaData === "function") {
        SpreadsheetApp.getActiveSpreadsheet().toast("מריץ S05 — חילוץ מטא-דאטה...", "MedicalPilot", 3);
        extractMetaData();
      } else {
        ui.alert("שגיאה", "הפונקציה extractMetaData לא נמצאה ב-S05_MetaExtract.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS05Icon: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runS06Icon — עמודה K — S06 המרת TXT
// switchView + originalRow/_restoreActiveRowAfterSwitch (Task 83) הוסרו —
// אין יותר switchView כאן שדורס activeRow. _removeActiveFilter תמיד.
// הפעלת פילטר convert עצמו עברה ל"הרחב" (עמודה K + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runS06Icon() {
  try {
    const ui     = SpreadsheetApp.getUi();
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
    _removeActiveFilter(sheet);
    const choice = ui.alert(
      "S06 — המרת TXT",
      "בחר מצב הרצה:\n\n" +
      "כן  — הרץ על השורה הנוכחית בלבד\n" +
      "לא  — הרץ אצווה על כל הגיליון\n" +
      "ביטול — חזור",
      ui.ButtonSet.YES_NO_CANCEL
    );
    if (choice === ui.Button.YES) {
      if (typeof run_MedicalPilot_V2_6_2 === "function") {
        run_MedicalPilot_V2_6_2();
      } else {
        ui.alert("שגיאה", "הפונקציה run_MedicalPilot_V2_6_2 לא נמצאה ב-S06_ConvertTXT.", ui.ButtonSet.OK);
      }
    } else if (choice === ui.Button.NO) {
      if (typeof nightlyConvertBatch === "function") {
        SpreadsheetApp.getActiveSpreadsheet().toast("מריץ S06 — אצווה מלאה...", "MedicalPilot", 3);
        nightlyConvertBatch();
      } else {
        ui.alert("שגיאה", "הפונקציה nightlyConvertBatch לא נמצאה ב-S06_ConvertTXT.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS06Icon: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runS07Icon — עמודה M — S07 סיווג AI
// switchView + originalRow/_restoreActiveRowAfterSwitch (Task 83) הוסרו —
// אין יותר switchView כאן שדורס activeRow. _removeActiveFilter תמיד.
// הפעלת פילטר classify עצמו עברה ל"הרחב" (עמודה M + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runS07Icon() {
  try {
    const ui     = SpreadsheetApp.getUi();
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
    _removeActiveFilter(sheet);
    const choice = ui.alert(
      "S07 — סיווג AI",
      "בחר מצב הרצה:\n\n" +
      "כן  — הרץ על השורה הנוכחית בלבד\n" +
      "לא  — הרץ אצווה על כל הגיליון\n" +
      "ביטול — חזור",
      ui.ButtonSet.YES_NO_CANCEL
    );
    if (choice === ui.Button.YES) {
      if (typeof run_S07_ActiveRow === "function") {
        run_S07_ActiveRow();
      } else {
        ui.alert("שגיאה", "הפונקציה run_S07_ActiveRow לא נמצאה ב-S07_Classify.", ui.ButtonSet.OK);
      }
    } else if (choice === ui.Button.NO) {
      if (typeof _processS07Batch === "function") {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
        SpreadsheetApp.getActiveSpreadsheet().toast("מריץ S07 — אצווה מלאה...", "MedicalPilot", 3);
        _processS07Batch(sheet, 3);
      } else {
        ui.alert("שגיאה", "הפונקציה _processS07Batch לא נמצאה ב-S07_Classify.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS07Icon: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runS08ViewIcon — עמודה N — S08 אימות ידני
// switchView + originalRow/_restoreActiveRowAfterSwitch (Task 83) הוסרו —
// אין יותר switchView כאן שדורס activeRow. _removeActiveFilter תמיד —
// פתרון ישיר לחשד השורש של Task 123 ("לא נמצאו נתוני שורה" תחת פילטר ישן).
// הפעלת פילטר s08 עצמו עברה ל"הרחב" (עמודה N + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runS08ViewIcon() {
  try {
    const ui     = SpreadsheetApp.getUi();
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
    _removeActiveFilter(sheet);
    const confirm = ui.alert(
      "S08 — אימות ידני",
      "בוטל כל פילטר פעיל בגיליון.\nהאם לפתוח את מסך הבקרה?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      if (typeof showMainSidebar === "function") {
        showMainSidebar();
      } else {
        ui.alert("שגיאה", "הפונקציה showMainSidebar לא נמצאה.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS08ViewIcon: " + e.toString());
    // [v2.8.3] Task 147 — הצגת השגיאה בפועל למשתמש, במקום כישלון שקט.
    // עטוף ב-try/catch נפרד: אם השגיאה המקורית היא כשל הרשאה על ה-UI
    // עצמו, גם הקריאה הזו עלולה להיכשל — לא רוצים שגיאה לא-מטופלת.
    try {
      SpreadsheetApp.getUi().alert(
        "⚠️ שגיאה באייקון S08",
        "אירעה שגיאה: " + e.message + "\n\nאם זו שגיאת הרשאה — הרץ ריענון הרשאות (AAA_FORCE_OAUTH_PROMPT_ONCE) ונסה שוב.",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e2) {
      Logger.log("[ViewEngine] גם הצגת שגיאת runS08ViewIcon נכשלה: " + e2.toString());
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runS09ViewIcon — עמודה O — S09 חילוץ אירועים
// switchView + originalRow/_restoreActiveRowAfterSwitch (Task 84-fix) הוסרו —
// אין יותר switchView כאן שדורס activeRow. _removeActiveFilter תמיד.
// הפעלת פילטר s09 עצמו עברה ל"הרחב" (עמודה O + COLUMN_TO_VIEWKEY)
// ══════════════════════════════════════════════════════════════════

function runS09ViewIcon() {
  try {
    const ui    = SpreadsheetApp.getUi();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
    _removeActiveFilter(sheet);
    const confirm = ui.alert(
      "S09 — חילוץ אירועים רפואיים",
      "בוטל כל פילטר פעיל בגיליון.\nהאם להריץ חילוץ עכשיו?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      if (typeof runS09 === "function") {
        runS09();
      } else {
        ui.alert("שגיאה", "הפונקציה runS09 לא נמצאה.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS09ViewIcon: " + e.toString());
    // [v2.8.3] Task 147 — הצגת השגיאה בפועל למשתמש, במקום כישלון שקט.
    // עטוף ב-try/catch נפרד: אם השגיאה המקורית היא כשל הרשאה על ה-UI
    // עצמו, גם הקריאה הזו עלולה להיכשל — לא רוצים שגיאה לא-מטופלת.
    try {
      SpreadsheetApp.getUi().alert(
        "⚠️ שגיאה באייקון S09",
        "אירעה שגיאה: " + e.message + "\n\nאם זו שגיאת הרשאה — הרץ ריענון הרשאות (AAA_FORCE_OAUTH_PROMPT_ONCE) ונסה שוב.",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e2) {
      Logger.log("[ViewEngine] גם הצגת שגיאת runS09ViewIcon נכשלה: " + e2.toString());
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// runS10ViewIcon — עמודה P — S10 אימות אירועים (ניהול_מיילים)
// [v2.7.0] הוסר מ-ICON_MAP — לא מחובר יותר לאייקון בגליון. נשארה
// פונקציונלית כקוד מת ליתר ביטחון.
// ══════════════════════════════════════════════════════════════════

function runS10ViewIcon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("s10");
    const confirm = ui.alert(
      "S10 — אימות אירועים",
      "עברת למבט אימות אירועים.\nהאם לפתוח את מסך האימות?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      if (typeof showS10Sidebar === "function") {
        showS10Sidebar();
      } else {
        ui.alert("שגיאה", "הפונקציה showS10Sidebar לא נמצאה.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS10ViewIcon: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runQAView — עמודה Q(17) — S11 QA
// [v2.3.0] הוזז מעמודה U(21) לעמודה Q(17)
// [v2.4.0] QA לא מפעיל פילטר שורות — עובד על כל הגליון
// [v2.8.0] נוסף _removeActiveFilter — ליתר ביטחון, עקבי עם שאר 11
// אייקוני הפעולה, אף כי QA ממילא לא בנה פילטר בעצמו
// ══════════════════════════════════════════════════════════════════

function runQAView() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(VIEW_SHEET_NAME);
  _removeActiveFilter(sheet);
  if (sheet) sheet.getRange(4, 17).activate();
  if (typeof runQAViewMain === "function") {
    runQAViewMain();
  } else {
    SpreadsheetApp.getUi().alert("שגיאה", "הפונקציה runQAViewMain לא נמצאה ב-S11_QArun.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.8.0] Task 128 — runArchiveView — עמודה V — S12 ארכיון
// switchView("archive") הוסרה — הפעלת פילטר ארכיון עצמו עברה ל"הרחב"
// (עמודה V + COLUMN_TO_VIEWKEY). האייקון עצמו מבטל פילטר בלבד ומכוון
// את המשתמש לדרך החדשה. [החלטת עיצוב שלא נדונה במפורש — לסקירתך]
// ══════════════════════════════════════════════════════════════════

function runArchiveView() {
  try {
    const ui      = SpreadsheetApp.getUi();
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VIEW_SHEET_NAME);
    const confirm = ui.alert(
      "S12 — ארכיון",
      "האם לבטל פילטר פעיל ולעבור לעמודת הארכיון?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      _removeActiveFilter(sheet);
      ui.alert(
        "S12 — ארכיון",
        "הפילטר בוטל.\nלצפייה בשורות הארכיון: הצב את הסמן בעמודה V ולחץ על אייקון \"הרחב\".",
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runArchiveView: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// runStatusCheck — [v2.3.0] צביעת שורות שגויות באדום
// שורה שגויה = Error_Code (S=19) מלא
// שורה תקינה = Error_Code ריק
// ══════════════════════════════════════════════════════════════════

function runStatusCheck() {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sheet   = ss.getSheetByName(VIEW_SHEET_NAME);
    const lastRow = sheet.getLastRow();

    if (lastRow < 5) {
      SpreadsheetApp.getUi().alert("אין שורות נתונים לבדיקה.");
      return;
    }

    const ERROR_COL   = 19;        // S = Error_Code
    const COLOR_ERROR = "#FFCDD2"; // אדום בהיר
    const COLOR_OK    = "#E3F2FD"; // תכלת בהיר (ברירת מחדל גליון)
    const COLOR_EMPTY = "#ffffff"; // לבן — שורה ריקה

    let countError = 0;
    let countOk    = 0;

    for (var row = 5; row <= lastRow; row++) {
      const fileId    = sheet.getRange(row, 1).getValue();
      const errorCode = sheet.getRange(row, ERROR_COL).getValue();
      const rowRange  = sheet.getRange(row, 1, 1, VIEW_TOTAL_COLS);

      if (!fileId) {
        rowRange.setBackground(COLOR_EMPTY);
        continue;
      }

      if (errorCode && String(errorCode).trim() !== "") {
        rowRange.setBackground(COLOR_ERROR);
        countError++;
      } else {
        rowRange.setBackground(COLOR_OK);
        countOk++;
      }
    }

    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "✅ תקינות: " + countOk + " | ❌ שגויות: " + countError,
      "MedicalPilot — Status Check", 5
    );
    Logger.log("[ViewEngine] runStatusCheck — תקינות: " + countOk + " | שגויות: " + countError);

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runStatusCheck: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה ב-runStatusCheck: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// setupIcons — הכנה חד פעמית של כל 13 האיקונים
// להרצה ידנית בלבד
// ══════════════════════════════════════════════════════════════════

function setupIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("גיליון '" + VIEW_SHEET_NAME + "' לא נמצא.");
      return;
    }

    sheet.showColumns(1, VIEW_TOTAL_COLS);
    const existingFilter0 = sheet.getFilter();
    if (existingFilter0) {
      existingFilter0.remove();
      SpreadsheetApp.flush();
    }

    const existingImages = sheet.getImages();
    existingImages.forEach(function(img) { img.remove(); });
    Logger.log("[ViewEngine] setupIcons — נמחקו: " + existingImages.length + " איקונים");

    SpreadsheetApp.flush();

    const row3Full = sheet.getRange(3, 1, 1, VIEW_TOTAL_COLS);
    row3Full.clearContent();
    row3Full.setBackground("#37474F");
    row3Full.setFontColor("#ffffff");
    row3Full.setFontSize(9);
    row3Full.setFontWeight("bold");
    row3Full.setHorizontalAlignment("center");
    row3Full.setVerticalAlignment("middle");

    const headerCell = sheet.getRange(4, 1);
    if (!headerCell.getValue()) {
      headerCell.setValue("File_ID");
      headerCell.setFontWeight("bold");
    }

    sheet.setFrozenRows(4);

    const rowHeight = sheet.getRowHeight(2);
    const iconSize  = rowHeight - 4;

    ICON_MAP.forEach(function(mapping) {
      try {
        const file     = DriveApp.getFileById(mapping.fileId);
        const blob     = file.getBlob();
        const colWidth = sheet.getColumnWidth(mapping.col);
        const offsetX  = Math.max(0, Math.floor((colWidth - iconSize) / 2));

        const img = sheet.insertImage(blob, mapping.col, 2);
        img.setAltTextTitle(mapping.script);
        img.assignScript(mapping.script);
        img.setWidth(iconSize);
        img.setHeight(iconSize);
        img.setAnchorCell(sheet.getRange(2, mapping.col));
        img.setAnchorCellXOffset(offsetX);
        img.setAnchorCellYOffset(2);

        const labelCell = sheet.getRange(3, mapping.col);
        labelCell.setValue(mapping.label);
        const colors = ROW3_COLORS[mapping.col];
        if (colors) {
          labelCell.setBackground(colors.bg);
          labelCell.setFontColor(colors.fg);
        }

        Logger.log("[ViewEngine] setupIcons — נוסף: " + mapping.script + " עמודה " + mapping.col);

      } catch (imgErr) {
        Logger.log("[ViewEngine] setupIcons — שגיאה: " + mapping.script + " | " + imgErr.toString());
      }
    });

    SpreadsheetApp.flush();
    Logger.log("[ViewEngine] setupIcons הושלם — " + ICON_MAP.length + " איקונים — גודל: " + iconSize + "px");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-setupIcons: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// cleanAndResetIcons — מחיקה מוחלטת + setupIcons מחדש
// ══════════════════════════════════════════════════════════════════

function cleanAndResetIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    const images = sheet.getImages();
    images.forEach(function(img) { img.remove(); });
    Logger.log("[ViewEngine] cleanAndResetIcons — נמחקו: " + images.length + " תמונות");

    SpreadsheetApp.flush();
    setupIcons();

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-cleanAndResetIcons: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// debugIcons — אבחון מצב האיקונים
// ══════════════════════════════════════════════════════════════════

function debugIcons() {
  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName(VIEW_SHEET_NAME);
    const images = sheet.getImages();

    Logger.log("[ViewEngine] debugIcons — סה\"כ איקונים: " + images.length);

    images.forEach(function(img) {
      const cell = img.getAnchorCell();
      Logger.log(
        "[ViewEngine] " + img.getAltTextTitle() +
        " | שורה: "    + cell.getRow() +
        " | עמודה: "   + cell.getColumn() +
        " | offsetX: " + img.getAnchorCellXOffset()
      );
    });

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-debugIcons: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.5.0] runExpandViewEvents — עמודה A בגליונות יעד
// ביטול פילטר על הגליון הפעיל (לא ניהול_מיילים)
// ══════════════════════════════════════════════════════════════════

function runExpandViewEvents() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();

    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
      SpreadsheetApp.flush();
    }

    sheet.getRange(1, 1).activate();
    Logger.log("[ViewEngine] runExpandViewEvents — reset על: " + sheet.getName());

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runExpandViewEvents: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.5.0] runS10ViewIconEvents — עמודה C בגליונות יעד
// S10 אימות אירועים — ללא switchView (לא קשור לניהול_מיילים)
// ══════════════════════════════════════════════════════════════════

function runS10ViewIconEvents() {
  try {
    const ui      = SpreadsheetApp.getUi();
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const confirm = ui.alert(
      "S10 — אימות אירועים",
      "גליון: " + sheet.getName() + "\n" +
      "האם לפתוח את מסך האימות?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      if (typeof showS10Sidebar === "function") {
        showS10Sidebar();
      } else {
        ui.alert("שגיאה", "הפונקציה showS10Sidebar לא נמצאה.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS10ViewIconEvents: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v2.5.0] setupMedicalEventsIcons — הכנסת 2 איקונים אוטומטית
// לגליון יומן_אירועים_רפואי — שורה 2
// עמודה A = runExpandViewEvents | עמודה C = runS10ViewIconEvents
// ══════════════════════════════════════════════════════════════════

function setupMedicalEventsIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MEDICAL_EVENTS_SHEET_NAME);
    const ui    = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + MEDICAL_EVENTS_SHEET_NAME + "' לא נמצא.");
      return;
    }

    // מחק איקונים קיימים
    const existingImages = sheet.getImages();
    existingImages.forEach(function(img) { img.remove(); });
    SpreadsheetApp.flush();
    Logger.log("[ViewEngine] setupMedicalEventsIcons — נמחקו: " + existingImages.length + " איקונים");

    const rowHeight = sheet.getRowHeight(2);
    const iconSize  = Math.max(30, rowHeight - 4);

    MEDICAL_EVENTS_ICON_MAP.forEach(function(mapping) {
      try {
        const file     = DriveApp.getFileById(mapping.fileId);
        const blob     = file.getBlob();
        const colWidth = sheet.getColumnWidth(mapping.col);
        const offsetX  = Math.max(0, Math.floor((colWidth - iconSize) / 2));

        const img = sheet.insertImage(blob, mapping.col, 2);
        img.setAltTextTitle(mapping.script);
        img.assignScript(mapping.script);
        img.setWidth(iconSize);
        img.setHeight(iconSize);
        img.setAnchorCell(sheet.getRange(2, mapping.col));
        img.setAnchorCellXOffset(offsetX);
        img.setAnchorCellYOffset(2);

        // תווית שורה 3
        const labelCell = sheet.getRange(3, mapping.col);
        labelCell.setValue(mapping.label);
        labelCell.setBackground(mapping.bg);
        labelCell.setFontColor(mapping.fg);
        labelCell.setFontWeight("bold");
        labelCell.setFontSize(9);
        labelCell.setHorizontalAlignment("center");
        labelCell.setVerticalAlignment("middle");

        Logger.log("[ViewEngine] setupMedicalEventsIcons — נוסף: " + mapping.script + " עמודה " + mapping.col);

      } catch (imgErr) {
        Logger.log("[ViewEngine] setupMedicalEventsIcons — שגיאה: " + mapping.script + " | " + imgErr.toString());
      }
    });

    SpreadsheetApp.flush();

    ui.alert(
      "✅ איקונים הוכנסו בהצלחה לגליון '" + MEDICAL_EVENTS_SHEET_NAME + "'\n\n" +
      "עמודה A — רענון (runExpandViewEvents)\n" +
      "עמודה C — S10 אימות (runS10ViewIconEvents)"
    );

    Logger.log("[ViewEngine] setupMedicalEventsIcons הושלם — 2 איקונים");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-setupMedicalEventsIcons: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [v2.8.4] Task 154 — runSortLearningExamplesIcon — גיליון דוגמאות_למידה
// אייקון קבוע, לשימוש חוזר — ממיין את כל שורות הדוגמאות לפי מנפיק
// (עמודה B), כדי שיהיה קל לעמוס לראות אילו מנפיקים כבר מיוצגים.
// אינו משפיע על לוגיקת S07 (שסורקת את כל הגיליון בלי תלות בסדר,
// ראה Task 156) — זה כלי נוחות אנושי בלבד.
// ══════════════════════════════════════════════════════════════════

function runSortLearningExamplesIcon() {
  const sheetName = "דוגמאות_למידה";
  try {
    const ui    = SpreadsheetApp.getUi();
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      ui.alert("שגיאה", "גליון לא נמצא: " + sheetName, ui.ButtonSet.OK);
      return;
    }

    const firstDataRow = (SHEET_CONFIG[sheetName] && SHEET_CONFIG[sheetName].FIRST_DATA_ROW) || 2;
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < firstDataRow) {
      ui.alert("אין שורות נתונים למיין בגליון " + sheetName + ".");
      return;
    }

    const numRows = lastRow - firstDataRow + 1;
    const range   = sheet.getRange(firstDataRow, 1, numRows, lastCol);
    range.sort({ column: 2, ascending: true }); // עמודה 2 = Issuer

    ui.alert("✅ " + numRows + " דוגמאות מוינו לפי מנפיק בגליון " + sheetName);
    Logger.log("[ViewEngine] runSortLearningExamplesIcon — מוינו " + numRows + " שורות");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runSortLearningExamplesIcon: " + e.toString());
    try {
      SpreadsheetApp.getUi().alert("⚠️ שגיאה במיון", e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e2) {
      Logger.log("[ViewEngine] גם הצגת שגיאת runSortLearningExamplesIcon נכשלה: " + e2.toString());
    }
  }
}