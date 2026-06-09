/**
 * MedicalPilot — ViewEngine.gs
 * @version 2.2.0 | @updated 07/06/2026 20:10 | @service VIEW_ENGINE
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/ViewEngine.gs
 * @impacts מנוע מבטים — פילטר שורות וגלילה לפי הקשר עבודה בגליון ניהול_מיילים.
 *          14 מבטים: expand, systemCheck, accessCheck, gmail, whatsapp, drive,
 *          metadata, convert, classify, s08, s09, s10, qa, archive.
 *          כל איקון קבוע בעמודה קבועה לפי ICON_MAP — לעולם לא נמחק או מוזז.
 *          עמודות תמיד גלויות — אין הסתרת עמודות (חוץ מ-A בברירת מחדל).
 *          כל מבט = פילטר שורות + גלילה לעמודה רלוונטית.
 *          הרחב/צמצם = ביטול פילטר שורות + גלילה לתחילת גיליון.
 *          נקרא מאייקוני הגליון בלבד — אינו חלק מזרימת עיבוד אוטומטי.
 * @changes [v2.2.0] תיקון _doExpand — flush() אחרי remove() לביטול פילטר מהימן
 *                   extractMetaData → runS05Icon — שם חדש + דיאלוג + קריאה ל-S05
 *                   run_MedicalPilot_V2_6_2 → runS06Icon — שם חדש + דיאלוג OL/אצווה
 *                   classifyDocument → runS07Icon — שם חדש + דיאלוג OL/אצווה
 *                   runQAView — דיאלוג "S11 לא פעיל — בפיתוח"
 *          [v2.1.0] שינוי מיפוי איקונים — WhatsApp עמודה E, Drive עמודה F
 *          [v2.0.0] שדרוג מלא — 14 איקונים
 *          [v1.9.0] ארכיטקטורה חדשה — ביטול הסתרת עמודות לחלוטין
 */

const VIEW_SHEET_NAME = "ניהול_מיילים";
const VIEW_TOTAL_COLS = 26;

// ══════════════════════════════════════════════════════════════════
// מיפוי איקונים — 14 איקונים
// [v2.2.0] עמודות 10,11,13 — script עודכן לשמות החדשים
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
  { col: 16, script: "runS10ViewIcon",     fileId: "1YZcEifvHAsBtstAFdtVtqNTODpxuXCkM", label: "[ S10 אימות ]"       },
  { col: 21, script: "runQAView",          fileId: "1hw2sA4t4H5-OR0k8crG7wuI5Pkh0-_3G", label: "[ S11 QA ]"          },
  { col: 22, script: "runArchiveView",     fileId: "1sHIxX5ZUy-u1MRUxqOnvM9ngVd7ew5EU", label: "[ S12 ארכיון ]"      }
];

// ══════════════════════════════════════════════════════════════════
// צבעי שורה 3 לפי עמודה
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
  21: { bg: "#29B6F6", fg: "#ffffff" },
  22: { bg: "#F44336", fg: "#ffffff" }
};

// ══════════════════════════════════════════════════════════════════
// VIEW_CONFIG — הגדרת מבטים
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
    scrollToCol: 21,
    filter:      {
      col:     13,
      type:    "formula",
      formula: '=OR($M1="QA",$M1="מוכן")'
    }
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

    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
      SpreadsheetApp.flush();
    }

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
// _doExpand — ביטול מוחלט של כל הפילטרים + גלילה ל-A1
// [v2.2.0] flush() אחרי remove() — reset מוחלט בכל מצב
// ══════════════════════════════════════════════════════════════════

function _doExpand() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(VIEW_SHEET_NAME);

    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
      SpreadsheetApp.flush();
    }

    sheet.getRange(1, 1).activate();
    Logger.log("[ViewEngine] _doExpand — reset מוחלט + גלילה A1");

  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-_doExpand: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// runExpandView — עמודה A — הרחב/כווץ
// ══════════════════════════════════════════════════════════════════

function runExpandView() {
  _doExpand();
}

// ══════════════════════════════════════════════════════════════════
// runSystemCheckIcon — עמודה B — S01
// ══════════════════════════════════════════════════════════════════

function runSystemCheckIcon() {
  switchView("systemCheck");
  checkSystemMorning();
}

// ══════════════════════════════════════════════════════════════════
// runAccessCheckIcon — עמודה C — S02
// ══════════════════════════════════════════════════════════════════

function runAccessCheckIcon() {
  switchView("accessCheck");
  checkUserAccess();
}

// ══════════════════════════════════════════════════════════════════
// runGmailIcon — עמודה D — S03 Gmail
// ══════════════════════════════════════════════════════════════════

function runGmailIcon() {
  const ui      = SpreadsheetApp.getUi();
  switchView("gmail");
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
// runWhatsAppIcon — עמודה E — S03 WhatsApp (לא פעיל — בפיתוח)
// ══════════════════════════════════════════════════════════════════

function runWhatsAppIcon() {
  const ui = SpreadsheetApp.getUi();
  switchView("whatsapp");
  ui.alert(
    "WhatsApp — בפיתוח",
    "חיבור WhatsApp טרם הוגדר.\nהפונקציה תחובר בהמשך.",
    ui.ButtonSet.OK
  );
}

// ══════════════════════════════════════════════════════════════════
// runDriveIcon — עמודה F — S04 Drive
// ══════════════════════════════════════════════════════════════════

function runDriveIcon() {
  const ui      = SpreadsheetApp.getUi();
  switchView("drive");
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
// runS05Icon — עמודה J — S05 חילוץ מטא-דאטה
// [v2.2.0] שם חדש (היה: extractMetaData) — מונע התנגשות עם S05_MetaExtract.gs
//          סינון → דיאלוג אישור → קריאה ל-extractMetaData() מ-S05_MetaExtract.gs
//          S05 פועל על כל הגיליון — אין מצב OL נפרד
// ══════════════════════════════════════════════════════════════════

function runS05Icon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("metadata");
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
// runS06Icon — עמודה K — S06 המרת TXT
// [v2.2.0] שם חדש (היה: run_MedicalPilot_V2_6_2) — מונע התנגשות עם S06_ConvertTXT.gs
//          סינון → בחירה YES/NO/CANCEL → OL או אצווה
//          YES    = run_MedicalPilot_V2_6_2() — שורה בודדת
//          NO     = nightlyConvertBatch()      — כל הגיליון
//          CANCEL = ביטול
// ══════════════════════════════════════════════════════════════════

function runS06Icon() {
  try {
    const ui     = SpreadsheetApp.getUi();
    switchView("convert");
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
// runS07Icon — עמודה M — S07 סיווג AI
// [v2.2.0] שם חדש (היה: classifyDocument) — מונע התנגשות עם S07_Classify.gs
//          סינון → בחירה YES/NO/CANCEL → OL או אצווה
//          YES    = run_S07_ActiveRow()        — שורה בודדת
//          NO     = executeS07Classification() — כל הגיליון
//          CANCEL = ביטול
// ══════════════════════════════════════════════════════════════════

function runS07Icon() {
  try {
    const ui     = SpreadsheetApp.getUi();
    switchView("classify");
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
      if (typeof executeS07Classification === "function") {
        SpreadsheetApp.getActiveSpreadsheet().toast("מריץ S07 — אצווה מלאה...", "MedicalPilot", 3);
        executeS07Classification();
      } else {
        ui.alert("שגיאה", "הפונקציה executeS07Classification לא נמצאה ב-S07_Classify.", ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log("[ViewEngine] שגיאה ב-runS07Icon: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// runS08ViewIcon — עמודה N — S08 אימות ידני
// ══════════════════════════════════════════════════════════════════

function runS08ViewIcon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("s08");
    const confirm = ui.alert(
      "S08 — אימות ידני",
      "עברת למבט אימות ידני.\nהאם לפתוח את מסך הבקרה?",
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
// runS09ViewIcon — עמודה O — S09 חילוץ אירועים
// ══════════════════════════════════════════════════════════════════

function runS09ViewIcon() {
  try {
    const ui      = SpreadsheetApp.getUi();
    switchView("s09");
    const confirm = ui.alert(
      "S09 — חילוץ אירועים רפואיים",
      "עברת למבט חילוץ אירועים.\nהאם להריץ חילוץ?",
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
// runS10ViewIcon — עמודה P — S10 אימות אירועים
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
// runQAView — עמודה U — S11 QA (לא פעיל — בפיתוח)
// [v2.2.0] דיאלוג "לא פעיל" במקום switchView בלבד
// ══════════════════════════════════════════════════════════════════

function runQAView() {
  const ui = SpreadsheetApp.getUi();
  switchView("qa");
  ui.alert(
    "S11 QA — בפיתוח",
    "שירות בדיקת תקינות Pipeline טרם הוגדר.\nהפונקציה תחובר בהמשך.",
    ui.ButtonSet.OK
  );
}

// ══════════════════════════════════════════════════════════════════
// runArchiveView — עמודה V — S12 ארכיון — עם אישור
// ══════════════════════════════════════════════════════════════════

function runArchiveView() {
  try {
    const ui      = SpreadsheetApp.getUi();
    const confirm = ui.alert(
      "S12 — ארכיון",
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
// setupIcons — הכנה חד פעמית של כל 14 האיקונים
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
    Logger.log("[ViewEngine] setupIcons הושלם — 14 איקונים — גודל: " + iconSize + "px");

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