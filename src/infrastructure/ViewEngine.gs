/**
 * MedicalPilot — ViewEngine.gs
 * @version    1.9.3
 * @updated    03/06/2026 22:10
 * @service    VIEW_ENGINE
 * @git        https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/ViewEngine.gs
 * @impacts    מנוע מבטים — פילטר שורות וגלילה לפי הקשר עבודה בגליון ניהול_מיילים.
 *             9 מבטים: expand, gmail, drive, metadata, convert, classify, extract, qa, archive.
 *             כל איקון קבוע בעמודה קבועה לפי ICON_MAP — לעולם לא נמחק או מוזז.
 *             עמודות תמיד גלויות — אין הסתרת עמודות (חוץ מ-A בברירת מחדל).
 *             כל מבט = פילטר שורות + גלילה לעמודה רלוונטית.
 *             הרחב/צמצם = ביטול פילטר שורות + גלילה לתחילת גיליון.
 *             נקרא מאייקוני הגליון בלבד — אינו חלק מזרימת עיבוד אוטומטי.
 * @changes    [v1.9.3] תיקון cleanAndResetIcons + setupIcons — מחיקת כל התמונות כולל ללא altText
 *                      תיקון runExpandView — שני מצבים: A נסתרת↔גלויה + ביטול פילטר שורות תמיד
 *             [v1.9.2] תיקון setupIcons — flush() לפני hideColumns(1) — מוודא שמר איקון A
 *             [v1.9.1] תיקון setupIcons — כל 9 איקונים מוכנסים כולל A + hideColumns(1) אחרי הלולאה
 *                      תיקון runExpandView — getRange(1,1).activate() לגלילה אמיתית לתחילת גיליון
 *             [v1.9.0] ארכיטקטורה חדשה — ביטול הסתרת עמודות לחלוטין
 *                      switchView — פילטר שורות בלבד + scrollToColumn
 *                      איקונים קבועים — אין מחיקה, הוספה או הזזה
 *                      runExpandView — ביטול פילטר שורות + גלילה ל-B1
 *                      VIEW_CONFIG — הוסף scrollToCol לכל מבט
 *                      הוסרו: refreshIcons, syncIconsToVisibleColumns
 *             [v1.8.0] החלפת syncIconsToVisibleColumns ב-refreshIcons
 *             [v1.7.0] ארכיטקטורה — איקון נמחק כשעמודה נסתרת, חוזר כשמתגלה
 *             [v1.6.0] תיקון כפילויות — flush() אחרי מחיקה לפני הכנסה
 *             [v1.5.0] לוגיקת expand חכמה + runArchiveView עם אישור + setFrozenRows(4)
 *             [v1.4.0] setupIcons מבוסס File ID ישיר + תוויות שורה 3 + שחזור כותרת A
 *             [v1.3.2] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *             [v1.3.1] גרסה קודמת
 */

const VIEW_SHEET_NAME = "ניהול_מיילים";
const VIEW_TOTAL_COLS = 26;

// ══════════════════════════════════════════════════════════════════
// מיפוי איקונים — עמודה קבועה ← שם סקריפט ← File ID ← תווית עברית
// עמודה A (1) — ארכיון — נסתרת כברירת מחדל — איקון מוכנס תמיד
// עמודה B (2) — Expand  — תמיד גלויה — איקון תמיד קיים
// האיקונים קבועים — לעולם לא נמחקים, מוזזים או מוסתרים
// ══════════════════════════════════════════════════════════════════

const ICON_MAP = [
  { col: 1,  script: "runArchiveView",  fileId: "1sHIxX5ZUy-u1MRUxqOnvM9ngVd7ew5EU", label: "[ ארכיון ]"      },
  { col: 2,  script: "runExpandView",   fileId: "1UAfAw8B3zGxTM8YoiSNpMTK8qP9FXHS2", label: "[ הצג הכל ]"     },
  { col: 3,  script: "runGmailView",    fileId: "18nmNMbOSqJRr3eDHOvrhFJ_owXYcwKlV", label: "[ מיילים ]"      },
  { col: 4,  script: "runDriveView",    fileId: "1Dka9DOf2ssie28L0oJzkB2YIa95gZRR-", label: "[ דרייב ]"       },
  { col: 5,  script: "runMetadataView", fileId: "1mBLGCOhUDCFyswBKu26OGNuf3KPnMUOm", label: "[ מטא-דאטה ]"   },
  { col: 10, script: "runConvertView",  fileId: "17COhz4MPHfgLtND3Yrug-Ke987JdhB4-", label: "[ המרה ל-TXT ]"  },
  { col: 12, script: "runClassifyView", fileId: "1eyjIU2H13ZnTL5H9UJntV0egdbh3WyUY", label: "[ סיווג AI ]"    },
  { col: 13, script: "runExtractView",  fileId: "1mX_Wi6MLfLvcmRqCe8WPvWD9hP4gpAgN", label: "[ חילוץ שדות ]" },
  { col: 21, script: "runQAView",       fileId: "1hw2sA4t4H5-OR0k8crG7wuI5Pkh0-_3G", label: "[ הפצה / QA ]"  }
];

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

  gmail: {
    label:       "Gmail",
    scrollToCol: 3,
    filter:      { col: 3, type: "eq", value: "Gmail" }
  },

  drive: {
    label:       "Drive",
    scrollToCol: 4,
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
    scrollToCol: 10,
    filter:      { col: 13, type: "eq", value: "ממתין להמרה ל-TXT" }
  },

  classify: {
    label:       "סיווג AI",
    scrollToCol: 12,
    filter:      { col: 13, type: "eq", value: "הומר ל-TXT" }
  },

  extract: {
    label:       "חילוץ שדות",
    scrollToCol: 13,
    filter:      { col: 13, type: "eq", value: "מחולץ" }
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
// runExpandView — עמודה B — תמיד גלויה
// ביטול פילטר שורות + גלילה לתחילת גיליון (A1)
// ══════════════════════════════════════════════════════════════════

function runExpandView() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    // שלב א — ביטול כל פילטרי השורות הקיימים
    const existingFilter = sheet.getFilter();
    if (existingFilter) existingFilter.remove();

    // שלב ב — בדיקת מצב עמודה A + החלפה
    const colA_hidden = sheet.isColumnHiddenByUser(1);
    if (colA_hidden) {
      // עמודה A נסתרת — חשוף אותה
      sheet.showColumns(1);
      Logger.log("[ViewEngine] runExpandView — עמודה A נחשפה");
    } else {
      // עמודה A גלויה — הסתר אותה
      sheet.hideColumns(1);
      Logger.log("[ViewEngine] runExpandView — עמודה A הוסתרה");
    }

    // שלב ג — גלילה לתחילת גיליון — A1
    sheet.getRange(1, 1).activate();

    Logger.log("[ViewEngine] runExpandView — פילטר בוטל | A נסתרת לפני: " + colA_hidden);

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runExpandView: " + e.toString());
  }
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
      // חשיפת עמודה A לצורך מבט ארכיון
      sheet.showColumns(1);
      switchView("archive");
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runArchiveView: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// 7 פונקציות עטיפה — לשיוך לאיקונים בגיליון
// ══════════════════════════════════════════════════════════════════

function runGmailView()    { switchView("gmail");    }
function runDriveView()    { switchView("drive");    }
function runMetadataView() { switchView("metadata"); }
function runConvertView()  { switchView("convert");  }
function runClassifyView() { switchView("classify"); }
function runExtractView()  { switchView("extract");  }
function runQAView()       { switchView("qa");       }

// ══════════════════════════════════════════════════════════════════
// setupIcons — הכנה חד פעמית
// מוחק כל האיקונים + flush() + מכניס את כל 9 האיקונים כולל A
// בסוף הלולאה — מסתיר עמודה A (ארכיון נסתר כברירת מחדל)
// להרצה ידנית בלבד — פעם אחת בלבד בהגדרת הגיליון
// ══════════════════════════════════════════════════════════════════

function setupIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("גיליון '" + VIEW_SHEET_NAME + "' לא נמצא.");
      return;
    }

    // שלב א — חשיפת כל העמודות לפני הכנסת איקונים
    sheet.showColumns(1, VIEW_TOTAL_COLS);
    Logger.log("[ViewEngine] setupIcons — כל העמודות נחשפו");

    // שלב ב — מחיקת כל האיקונים הקיימים
    const existingImages = sheet.getImages();
    existingImages.forEach(function(img) { img.remove(); });
    Logger.log("[ViewEngine] setupIcons — נמחקו: " + existingImages.length + " איקונים");

    // שלב ג — flush() חובה לפני הכנסה — מונע כפילויות
    SpreadsheetApp.flush();

    // שלב ד — ניקוי שורה 3 ועיצובה בתכלת
    sheet.getRange(3, 1, 1, VIEW_TOTAL_COLS).clearContent();
    const row3 = sheet.getRange(3, 1, 1, VIEW_TOTAL_COLS);
    row3.setBackground("#00BCD4");
    row3.setFontColor("#ffffff");
    row3.setFontSize(9);
    row3.setFontWeight("bold");
    row3.setHorizontalAlignment("center");
    row3.setVerticalAlignment("middle");

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

    // שלב ח — הכנסת כל 9 האיקונים כולל עמודה A
    // עמודה A גלויה כרגע — האיקון יוכנס למקום הנכון
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

        // כתיבת תווית בשורה 3
        sheet.getRange(3, mapping.col).setValue(mapping.label);

        Logger.log("[ViewEngine] setupIcons — נוסף: " + mapping.script + " עמודה " + mapping.col);

      } catch (imgErr) {
        Logger.log("[ViewEngine] setupIcons — שגיאה: " + mapping.script + " | " + imgErr.toString());
      }
    });

    // שלב ט — flush() + הסתרת עמודה A אחרי הכנסת כל האיקונים
    // flush() חובה — מוודא שכל האיקונים נשמרו לפני הסתרת עמודה A
    SpreadsheetApp.flush();
    sheet.hideColumns(1);
    Logger.log("[ViewEngine] עמודה A הוסתרה אחרי הכנסת כל האיקונים");

    Logger.log("[ViewEngine] setupIcons הושלם. 9 איקונים. גודל: " + iconSize + "px");

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