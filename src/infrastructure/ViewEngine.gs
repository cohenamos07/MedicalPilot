/**
 * MedicalPilot — ViewEngine.gs
 * @version 1.3.1 | @updated 18/05/2026 19:55 | @service VIEW_ENGINE
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/ViewEngine.gs
 * תיאור: מנוע מבטים — מסנן עמודות ושורות לפי הקשר עבודה
 * שימוש: כל כפתור איקון בגיליון קורא לפונקציית עטיפה המפעילה את switchView
 */

const VIEW_SHEET_NAME = "ניהול_מיילים";
const VIEW_TOTAL_COLS = 26;

// ══════════════════════════════════════════════════════════════════
// מיפוי איקונים — עמודה ← שם סקריפט
// ══════════════════════════════════════════════════════════════════

const ICON_MAP = [
  { col: 1,  script: "runArchiveView"  },
  { col: 2,  script: "runExpandView"   },
  { col: 3,  script: "runGmailView"    },
  { col: 4,  script: "runDriveView"    },
  { col: 5,  script: "runMetadataView" },
  { col: 10, script: "runConvertView"  },
  { col: 12, script: "runClassifyView" },
  { col: 13, script: "runExtractView"  },
  { col: 21, script: "runQAView"       }
];

// ══════════════════════════════════════════════════════════════════
// הגדרת מבטים — VIEW_CONFIG
// עמודות: A=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8 I=9 J=10 K=11 L=12
//          M=13 N=14 O=15 P=16 Q=17 R=18 S=19 T=20 U=21 V=22
//          W=23 X=24 Y=25 Z=26
// ══════════════════════════════════════════════════════════════════

const VIEW_CONFIG = {

  expand: {
    label:   "Expand — כל העמודות",
    columns: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],
    filter:  null
  },

  gmail: {
    label:   "Gmail",
    columns: [2,3,5,6,8,13,19,20],
    filter:  { col: 3, type: "eq", value: "Gmail" }
  },

  drive: {
    label:   "Drive",
    columns: [2,4,5,6,8,13,19,20],
    filter:  { col: 3, type: "eq", value: "Drive_Manual" }
  },

  metadata: {
    label:   "מטא-דאטה",
    columns: [2,8,13,14,15,16,18,19,20],
    filter:  {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="",$M1="ממתין להמרה ל-TXT")'
    }
  },

  convert: {
    label:   "המרה ל-TXT",
    columns: [2,8,10,13,14,15,25],
    filter:  { col: 13, type: "eq", value: "ממתין להמרה ל-TXT" }
  },

  classify: {
    label:   "סיווג AI",
    columns: [2,8,9,12,13,25],
    filter:  { col: 13, type: "eq", value: "הומר ל-TXT" }
  },

  extract: {
    label:   "חילוץ שדות",
    columns: [2,9,10,11,12,13,14],
    filter:  { col: 13, type: "eq", value: "מחולץ" }
  },

  qa: {
    label:   "הפצה / QA",
    columns: [2,9,12,13,21,22,23],
    filter:  {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="QA",$M1="מוכן")'
    }
  },

  archive: {
    label:   "ארכיון",
    columns: [1,2,13,21,22],
    filter:  {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="הופץ",$M1="הושלם")'
    }
  }
};

// ══════════════════════════════════════════════════════════════════
// מנוע המבטים המרכזי
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

    // שלב א — הסרת פילטר קיים
    const existingFilter = sheet.getFilter();
    if (existingFilter) existingFilter.remove();

    // שלב ב — הצגת כל העמודות תחילה
    sheet.showColumns(1, VIEW_TOTAL_COLS);

    // שלב ג — הסתרת עמודות שאינן בתצוגה
    for (let col = 1; col <= VIEW_TOTAL_COLS; col++) {
      if (config.columns.indexOf(col) === -1) {
        sheet.hideColumns(col);
      }
    }

    // שלב ד — החלת פילטר
    if (config.filter) {
      const lastRow     = Math.max(sheet.getLastRow(), 2);
      const filterRange = sheet.getRange(1, 1, lastRow, VIEW_TOTAL_COLS);
      const filter      = filterRange.createFilter();
      const criteria    = viewEngine_buildCriteria(config.filter);
      if (criteria) {
        filter.setColumnFilterCriteria(config.filter.col, criteria);
      }
    }

    // שלב ה — מיקום מחדש של האיקונים
    repositionIcons(sheet);

    Logger.log("[ViewEngine] מבט פעיל: " + config.label);

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-switchView: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה בהחלפת מבט: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// מיקום מחדש של האיקונים לאחר שינוי מבט
// ══════════════════════════════════════════════════════════════════

function repositionIcons(sheet) {
  try {
    if (!sheet) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getSheetByName(VIEW_SHEET_NAME);
    }

    const images = sheet.getImages();
    if (!images || images.length === 0) {
      Logger.log("[ViewEngine] repositionIcons: אין איקונים בגיליון");
      return;
    }

    images.forEach(function(img) {
      const altText = img.getAltTextTitle();
      if (!altText) return;

      const mapping = ICON_MAP.find(function(m) { return m.script === altText; });
      if (!mapping) return;

      img.setAnchorCell(sheet.getRange(2, mapping.col));
      img.setAnchorCellXOffset(2);
      img.setAnchorCellYOffset(2);

      Logger.log("[ViewEngine] איקון " + altText + " הוחזר לעמודה " + mapping.col);
    });

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-repositionIcons: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// הכנה חד פעמית — setupIcons
// מוחק איקונים קיימים ומכניס מחדש מתיקיית Drive עם גודל דינמי
// ══════════════════════════════════════════════════════════════════

function setupIcons() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("גיליון '" + VIEW_SHEET_NAME + "' לא נמצא.");
      return;
    }

    const ICONS_FOLDER_ID = "1LMQWPaoXisYz8OoeeUee5lW1qNJqrP-K";

    // קריאת גובה שורה 2 דינמית
    const rowHeight = sheet.getRowHeight(2);
    const iconSize  = rowHeight - 4;

    // שלב א — מחיקת כל האיקונים הקיימים בשורה 2
    const images = sheet.getImages();
    images.forEach(function(img) {
      const anchor = img.getAnchorCell();
      if (anchor && anchor.getRow() === 2) {
        img.remove();
      }
    });

    // שלב ב — שליפת קבצים מתיקיית Drive
    const folder = DriveApp.getFolderById(ICONS_FOLDER_ID);
    const files  = folder.getFiles();

    // מיפוי שם קובץ ← עמודה
    const fileMap = {
      "runArchiveView.png":  { col: 1  },
      "runExpandView.png":   { col: 2  },
      "runGmailView.png":    { col: 3  },
      "runDriveView.png":    { col: 4  },
      "runMetadataView.png": { col: 5  },
      "runConvertView.png":  { col: 10 },
      "runClassifyView.png": { col: 12 },
      "runExtractView.png":  { col: 13 },
      "runQAView.png":       { col: 21 }
    };

    // שלב ג — הכנסת כל איקון למיקום הנכון בגודל דינמי
    while (files.hasNext()) {
      const file     = files.next();
      const fileName = file.getName();
      const def      = fileMap[fileName];
      if (!def) continue;

      const scriptName = fileName.replace(".png", "");
      const blob       = file.getBlob();

      const img = sheet.insertImage(blob, def.col, 2);
      img.setAltTextTitle(scriptName);
      img.assignScript(scriptName);
      img.setWidth(iconSize);
      img.setHeight(iconSize);
      img.setAnchorCellXOffset(2);
      img.setAnchorCellYOffset(2);

      Logger.log("[ViewEngine] איקון הוכנס: " + scriptName + " ← עמודה " + def.col + " | גודל: " + iconSize + "px");
    }

    SpreadsheetApp.getUi().alert("✅ האיקונים הוגדרו בהצלחה. גודל: " + iconSize + "px");
    Logger.log("[ViewEngine] setupIcons הושלם.");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-setupIcons: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה ב-setupIcons: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית קריטריון פילטר
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
// 9 פונקציות עטיפה — לשיוך לאיקונים בגיליון
// ══════════════════════════════════════════════════════════════════

function runExpandView()   { switchView("expand");   }
function runGmailView()    { switchView("gmail");    }
function runDriveView()    { switchView("drive");    }
function runMetadataView() { switchView("metadata"); }
function runConvertView()  { switchView("convert");  }
function runClassifyView() { switchView("classify"); }
function runExtractView()  { switchView("extract");  }
function runQAView()       { switchView("qa");       }
function runArchiveView()  { switchView("archive");  }