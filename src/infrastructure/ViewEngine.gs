/**
 * MedicalPilot — ViewEngine.gs
 * @version    2.0.1
 * @updated    04/06/2026 21:10
 * @service    VIEW_ENGINE
 * @git        https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/ViewEngine.gs
 * @impacts    מנוע מבטים — פילטר שורות וגלילה לפי הקשר עבודה בגליון ניהול_מיילים.
 *             14 מבטים: expand (x2), systemCheck, accessCheck, gmail, drive,
 *             metadata, convert, classify, s08, s09, s10, qa, archive.
 *             כל איקון קבוע בעמודה קבועה לפי ICON_MAP — לעולם לא נמחק או מוזז.
 *             עמודות תמיד גלויות — אין הסתרת עמודות (חוץ מ-A בברירת מחדל).
 *             כל מבט = פילטר שורות + גלילה לעמודה רלוונטית.
 *             הרחב/צמצם = ביטול פילטר שורות + גלילה לתחילת גיליון.
 *             נקרא מאייקוני הגליון בלבד — אינו חלק מזרימת עיבוד אוטומטי.
 *             איקוני בדיקת מערכת והרשאות — דיאלוג אישור לפני הפעלה.
 *             איקוני pipeline — סינון + דיאלוג + קריאה לשירות הייעודי.
 * @changes    [v2.0.0] שדרוג מלא — 14 איקונים במקום 9
 *                      ICON_MAP — עמודות A,B,C,D,E,J,K,L,M,N,O,P,U,V
 *                      VIEW_CONFIG — הוספת systemCheck, accessCheck, s08, s09, s10
 *                      שורה 3 — צבע #37474F אחיד + כותרות צבעוניות לפי אזור
 *                      _doExpand() — פונקציה משותפת ל-runExpandView + runExpandView2
 *                      runExpandView2() — איקון הרחב שני בעמודה L
 *                      פונקציות עטיפה — checkSystemMorning, checkUserAccess,
 *                      runS08ViewIcon, runS09ViewIcon, runS10ViewIcon
 *             [v1.9.3] תיקון cleanAndResetIcons + setupIcons
 *             [v1.9.2] תיקון setupIcons — flush() לפני hideColumns(1)
 *             [v1.9.1] תיקון setupIcons — כל 9 איקונים כולל A
 *             [v1.9.0] ארכיטקטורה חדשה — ביטול הסתרת עמודות לחלוטין
 *             [v1.8.0] החלפת syncIconsToVisibleColumns ב-refreshIcons
 *             [v1.4.0] setupIcons מבוסס File ID ישיר + תוויות שורה 3
 */

const VIEW_SHEET_NAME = "ניהול_מיילים";
const VIEW_TOTAL_COLS = 26;

// ══════════════════════════════════════════════════════════════════
// מיפוי איקונים — 14 איקונים
// עמודות: A=1 B=2 C=3 D=4 E=5 J=10 K=11 L=12 M=13 N=14 O=15 P=16 U=21 V=22
// עמודה A (1) — הרחב/כווץ — נסתרת כברירת מחדל
// עמודה V (22) — ארכיון — סוף התהליך
// ══════════════════════════════════════════════════════════════════

const ICON_MAP = [
  { col: 1,  script: "runExpandView",      fileId: "1UAfAw8B3zGxTM8YoiSNpMTK8qP9FXHS2", label: "[ ↔ הרחב ]"           },
  { col: 2,  script: "runSystemCheckIcon",  fileId: "1MXtKBh20PUFc3oJiWPSl-3fKHDsctpnU", label: "[ S01 בדיקת מערכת ]"  },
  { col: 3,  script: "runAccessCheckIcon",  fileId: "15eArM62_0wmbMFoZth9w-U37XFlsVZY6",  label: "[ S02 הרשאות ]"        },
  { col: 4,  script: "runGmailIcon",  fileId: "18nmNMbOSqJRr3eDHOvrhFJ_owXYcwKlV",  label: "[ S03 Gmail ]"         },
  { col: 5,  script: "runDriveIcon",    fileId: "1Dka9DOf2ssie28L0oJzkB2YIa95gZRR-",  label: "[ S04 Drive ]"         },
  { col: 10, script: "extractMetaData",    fileId: "1mBLGCOhUDCFyswBKu26OGNuf3KPnMUOm",  label: "[ S05 מטא-דאטה ]"     },
  { col: 11, script: "run_MedicalPilot_V2_6_2", fileId: "17COhz4MPHfgLtND3Yrug-Ke987JdhB4-", label: "[ S06 המרת TXT ]"  },
  { col: 12, script: "runExpandView2",     fileId: "1UAfAw8B3zGxTM8YoiSNpMTK8qP9FXHS2", label: "[ ↔ הרחב ]"           },
  { col: 13, script: "classifyDocument",   fileId: "1eyjIU2H13ZnTL5H9UJntV0egdbh3WyUY",  label: "[ S07 סיווג AI ]"      },
  { col: 14, script: "runS08ViewIcon",     fileId: "1Xckh4J0FVgr2gIY6os92qlLLyMk-EyQp",  label: "[ S08 אימות ידני ]"   },
  { col: 15, script: "runS09ViewIcon",     fileId: "1mX_Wi6MLfLvcmRqCe8WPvWD9hP4gpAgN",  label: "[ S09 חילוץ ]"        },
  { col: 16, script: "runS10ViewIcon",     fileId: "1YZcEifvHAsBtstAFdtVtqNTODpxuXCkM",  label: "[ S10 אימות ]"        },
  { col: 21, script: "runQAView",          fileId: "1hw2sA4t4H5-OR0k8crG7wuI5Pkh0-_3G",  label: "[ QA / בדיקה ]"       },
  { col: 22, script: "runArchiveView",     fileId: "1sHIxX5ZUy-u1MRUxqOnvM9ngVd7ew5EU",  label: "[ ארכיון ]"           }
];

// ══════════════════════════════════════════════════════════════════
// צבעי שורה 3 לפי עמודה — אזורי עבודה
// רקע אחיד #37474F לכל השורה — כותרות בצבע ייעודי לפי אזור
// ══════════════════════════════════════════════════════════════════

const ROW3_COLORS = {
  1:  { bg: "#78909C", fg: "#ffffff" }, // הרחב
  2:  { bg: "#90A4AE", fg: "#ffffff" }, // בדיקת מערכת
  3:  { bg: "#90A4AE", fg: "#ffffff" }, // הרשאות
  4:  { bg: "#4CAF50", fg: "#ffffff" }, // Gmail
  5:  { bg: "#4CAF50", fg: "#ffffff" }, // Drive
  10: { bg: "#FF9800", fg: "#ffffff" }, // מטא-דאטה
  11: { bg: "#FF9800", fg: "#ffffff" }, // המרת TXT
  12: { bg: "#78909C", fg: "#ffffff" }, // הרחב 2
  13: { bg: "#7E57C2", fg: "#ffffff" }, // סיווג AI
  14: { bg: "#7E57C2", fg: "#ffffff" }, // S08
  15: { bg: "#7E57C2", fg: "#ffffff" }, // S09
  16: { bg: "#7E57C2", fg: "#ffffff" }, // S10
  21: { bg: "#29B6F6", fg: "#ffffff" }, // QA
  22: { bg: "#F44336", fg: "#ffffff" }  // ארכיון
};

// ══════════════════════════════════════════════════════════════════
// הגדרת מבטים — VIEW_CONFIG
// עמודות: A=1  B=2  C=3  D=4  E=5  F=6  G=7  H=8  I=9  J=10
//          K=11 L=12 M=13 N=14 O=15 P=16 Q=17 R=18 S=19 T=20
//          U=21 V=22 W=23 X=24 Y=25 Z=26
// scrollToCol — העמודה שאליה גוללים אחרי הפעלת המבט
// filter      — פילטר שורות בלבד (אין הסתרת עמודות)
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

  drive: {
    label:       "Drive",
    scrollToCol: 5,
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
    label:       "הפצה / QA",
    scrollToCol: 21,
    filter:      {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="QA",$M1="מוכן")'
    }
  },

  archive: {
    label:       "ארכיון",
    scrollToCol: 1,
    filter:      {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="הופץ",$M1="הושלם")'
    }
  }
};

// ══════════════════════════════════════════════════════════════════
// מנוע המבטים המרכזי — switchView
// פילטר שורות בלבד + גלילה לעמודה
// אין הסתרת עמודות — אין נגיעה באיקונים
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

    // שלב א — הקפאת 4 שורות ראשונות תמיד
    sheet.setFrozenRows(4);

    // שלב ב — הסרת פילטר קיים
    const existingFilter = sheet.getFilter();
    if (existingFilter) existingFilter.remove();

    // שלב ג — החלת פילטר שורות אם מוגדר
    if (config.filter) {
      const lastRow     = Math.max(sheet.getLastRow(), 5);
      const filterRange = sheet.getRange(4, 1, lastRow - 3, VIEW_TOTAL_COLS);
      const filter      = filterRange.createFilter();
      const criteria    = viewEngine_buildCriteria(config.filter);
      if (criteria) {
        filter.setColumnFilterCriteria(config.filter.col, criteria);
      }
    }

    // שלב ד — גלילה לעמודה הרלוונטית
    if (config.scrollToCol) {
      sheet.getRange(4, config.scrollToCol).activate();
    }

    Logger.log("[ViewEngine] מבט פעיל: " + config.label + " | גלילה לעמודה: " + config.scrollToCol);

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-switchView: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה בהחלפת מבט: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית קריטריון פילטר — viewEngine_buildCriteria
// ══════════════════════════════════════════════════════════════════

function viewEngine_buildCriteria(filterDef) {
  try {
    if (filterDef.type === "eq") {
      return SpreadsheetApp.newFilterCriteria()
        .whenTextEqualTo(filterDef.value)
        .build();
    }
    if (filterDef.type === "contains") {
      return SpreadsheetApp.newFilterCriteria()
        .whenTextContains(filterDef.value)
        .build();
    }
    if (filterDef.type === "notContains") {
      return SpreadsheetApp.newFilterCriteria()
        .whenTextDoesNotContain(filterDef.value)
        .build();
    }
    if (filterDef.type === "formula") {
      return SpreadsheetApp.newFilterCriteria()
        .whenFormulaSatisfied(filterDef.formula)
        .build();
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה בבניית קריטריון: " + e.toString());
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// _doExpand — לוגיקה משותפת לשני איקוני הרחב (A ו-L)
// ביטול פילטר שורות + גלילה לתחילת גיליון
// ══════════════════════════════════════════════════════════════════

function _doExpand() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    // ביטול כל פילטרי השורות הקיימים בלבד — אין נגיעה בעמודות
    const existingFilter = sheet.getFilter();
    if (existingFilter) existingFilter.remove();

    // גלילה לתחילת גיליון
    sheet.getRange(1, 1).activate();

    Logger.log("[ViewEngine] _doExpand — פילטר שורות בוטל");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-_doExpand: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// runExpandView — עמודה A — איקון הרחב ראשון
// ══════════════════════════════════════════════════════════════════

function runExpandView() {
  _doExpand();
}

// ══════════════════════════════════════════════════════════════════
// runExpandView2 — עמודה L — איקון הרחב שני (זהה ללוגיקה)
// ══════════════════════════════════════════════════════════════════

function runExpandView2() {
  _doExpand();
}

// ══════════════════════════════════════════════════════════════════
// runArchiveView — מבט ארכיון עם אישור + חשיפת עמודה A
// ══════════════════════════════════════════════════════════════════

function runArchiveView() {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sheet   = ss.getSheetByName(VIEW_SHEET_NAME);
    const ui      = SpreadsheetApp.getUi();
    const confirm = ui.alert(
      "אישור מבט ארכיון",
      "האם לעבור למבט ארכיון?",
      ui.ButtonSet.YES_NO
    );
    if (confirm === ui.Button.YES) {
      switchView("archive");
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runArchiveView: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// checkSystemMorning — עמודה B — בדיקת תקינות מערכת
// דיאלוג אישור לפני הפעלה
// ══════════════════════════════════════════════════════════════════

      function runSystemCheckIcon() {
      switchView("systemCheck");
      checkSystemMorning();
      }
// ══════════════════════════════════════════════════════════════════
// checkUserAccess — עמודה C — בדיקת הרשאות
// דיאלוג אישור לפני הפעלה
// ══════════════════════════════════════════════════════════════════
      function runAccessCheckIcon() {
        switchView("accessCheck");
        checkUserAccess();
      }


// ══════════════════════════════════════════════════════════════════
// runS08ViewIcon — עמודה N — אימות ידני S08
// סינון + דיאלוג + פתיחת sidebar
// ══════════════════════════════════════════════════════════════════

function runS08ViewIcon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("s08");
    const confirm = ui.alert(
      "מנוע מבטים — MedicalPilot",
      "עברת למבט אימות ידני (S08).\nהאם ברצונך לפתוח את מסך הבקרה והאימות הידני?",
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
  }
}

// ══════════════════════════════════════════════════════════════════
// runS09ViewIcon — עמודה O — חילוץ אירועים רפואיים S09
// סינון + דיאלוג + הפעלת S09
// ══════════════════════════════════════════════════════════════════

function runS09ViewIcon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("s09");
    const confirm = ui.alert(
      "מנוע מבטים — MedicalPilot",
      "עברת למבט חילוץ אירועים רפואיים (S09).\nהאם ברצונך להריץ חילוץ אירועים?",
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
  }
}

// ══════════════════════════════════════════════════════════════════
// runS10ViewIcon — עמודה P — אימות אירועים S10
// סינון + דיאלוג + פתיחת sidebar S10
// ══════════════════════════════════════════════════════════════════

function runS10ViewIcon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("s10");
    const confirm = ui.alert(
      "מנוע מבטים — MedicalPilot",
      "עברת למבט אימות אירועים רפואיים (S10).\nהאם ברצונך לפתוח את מסך האימות?",
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
// פונקציות עטיפה — pipeline מבטים
// ══════════════════════════════════════════════════════════════════

function extractMetaData()         { switchView("metadata"); }
function run_MedicalPilot_V2_6_2() { switchView("convert");  }
function classifyDocument()        { switchView("classify"); }
function runQAView()               { switchView("qa");       }

// ══════════════════════════════════════════════════════════════════
// setupIcons — הכנה חד פעמית
// מוחק כל האיקונים + flush() + מכניס את כל 14 האיקונים
// צובע שורה 3: רקע #37474F אחיד + כותרות צבעוניות לפי אזור
// בסוף — מסתיר עמודה A (ארכיון נסתר כברירת מחדל)
// להרצה ידנית בלבד — פעם אחת בלבד בהגדרת הגיליון
// ══════════════════════════════════════════════════════════════════

function runGmailIcon() {
  const ui      = SpreadsheetApp.getUi();
  switchView("gmail");
  const confirm = ui.alert(
    "סריקת Gmail",
    "האם להריץ סריקת Gmail ומשיכת מיילים חדשים?",
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    runEmailIngestion();
  }
}


function runDriveIcon() {
  const ui      = SpreadsheetApp.getUi();
  switchView("drive");
  const confirm = ui.alert(
    "סריקת Drive",
    "האם להריץ סריקת Drive וסנכרון קבצים חדשים?",
    ui.ButtonSet.YES_NO
  );
  if (confirm === ui.Button.YES) {
    syncDriveFiles();
  }
}


function setupIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("גיליון '" + VIEW_SHEET_NAME + "' לא נמצא.");
      return;
    }

    // שלב א — איפוס מלא: חשיפת כל העמודות + ביטול פילטרים
    sheet.showColumns(1, VIEW_TOTAL_COLS);
    const existingFilter0 = sheet.getFilter();
    if (existingFilter0) existingFilter0.remove();
    Logger.log("[ViewEngine] setupIcons — כל העמודות נחשפו + פילטרים בוטלו");

    // שלב ב — מחיקת כל האיקונים הקיימים
    const existingImages = sheet.getImages();
    existingImages.forEach(function(img) { img.remove(); });
    Logger.log("[ViewEngine] setupIcons — נמחקו: " + existingImages.length + " איקונים");

    // שלב ג — flush() חובה לפני הכנסה — מונע כפילויות
    SpreadsheetApp.flush();

    // שלב ד — צביעת שורה 3 — רקע אחיד #37474F לכל רוחב
    const row3Full = sheet.getRange(3, 1, 1, VIEW_TOTAL_COLS);
    row3Full.clearContent();
    row3Full.setBackground("#37474F");
    row3Full.setFontColor("#ffffff");
    row3Full.setFontSize(9);
    row3Full.setFontWeight("bold");
    row3Full.setHorizontalAlignment("center");
    row3Full.setVerticalAlignment("middle");

    // שלב ה — שחזור כותרת File_ID בעמודה A שורה 4 אם ריקה
    const headerCell = sheet.getRange(4, 1);
    if (!headerCell.getValue()) {
      headerCell.setValue("File_ID");
      headerCell.setFontWeight("bold");
      Logger.log("[ViewEngine] כותרת File_ID שוחזרה בעמודה A שורה 4");
    }

    // שלב ו — הקפאת 4 שורות ראשונות
    sheet.setFrozenRows(4);

    // שלב ז — קריאת גובה שורה 2 לחישוב גודל איקון
    const rowHeight = sheet.getRowHeight(2);
    const iconSize  = rowHeight - 4;

    // שלב ח — הכנסת כל 14 האיקונים + כותרות צבעוניות בשורה 3
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

        // כותרת בשורה 3 עם צבע ייעודי לעמודה
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

    // שלב ט — flush() סיום
    SpreadsheetApp.flush();
    Logger.log("[ViewEngine] setupIcons הושלם. 14 איקונים. גודל: " + iconSize + "px");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-setupIcons: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// cleanAndResetIcons — מחיקה מוחלטת + setupIcons מחדש
// להרצה ידנית בלבד כשיש בעיה בתצוגת האיקונים
// ══════════════════════════════════════════════════════════════════

function cleanAndResetIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    // מחיקת כל התמונות — כולל אלה ללא altText (תמונות ידניות)
    const images = sheet.getImages();
    images.forEach(function(img) { img.remove(); });
    Logger.log("[ViewEngine] cleanAndResetIcons — נמחקו: " + images.length + " תמונות");

    // flush() חובה לפני setupIcons
    SpreadsheetApp.flush();

    // הכנסה מחדש
    setupIcons();

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-cleanAndResetIcons: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// debugIcons — לאבחון בלבד
// מדפיס בלוג את מיקום כל איקון: שורה, עמודה, offsetX
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