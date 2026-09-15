
  function forceAuthNow() {
    var info   = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    var status = info.getAuthorizationStatus();

    if (status === ScriptApp.AuthorizationStatus.NOT_REQUIRED) {
      SpreadsheetApp.getUi().alert("✅ Already authorized — all scopes granted.");
      return;
    }

    var url = info.getAuthorizationUrl();
    SpreadsheetApp.getUi().alert(
      "🔐 Copy this URL and open it in your browser:\n\n" + url
    );
  }
  /**
 * QA_ONETIME_forceAuthUrlToLog
 * חד-פעמית — קריאה בלבד, לא כותבת לשום גליון, לא נוגעת ב-forceAuthNow הקיימת.
 * מטרה: מפיקה כתובת אישור OAuth מלאה (ScriptApp.getAuthorizationInfo) ומדפיסה
 * אותה ל-Logger בלבד (לא ל-getUi) — כדי שאפשר להריץ אותה ישירות מהעורך
 * (▶️ Run) גם בלי הקשר UI פתוח של גיליון, בלי לזרוק שגיאת "Cannot call
 * SpreadsheetApp.getUi() from this context".
 * שימוש: הרץ מהעורך → פתח יומן ביצוע (Ctrl+Enter) → העתק את כתובת ה-URL
 * → פתח בדפדפן להשלמת אישור הרשאות מלא.
 */
function QA_ONETIME_forceAuthUrlToLog() {
  var info   = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  var status = info.getAuthorizationStatus();

  if (status === ScriptApp.AuthorizationStatus.NOT_REQUIRED) {
    Logger.log("✅ Already authorized — all scopes granted.");
    return;
  }

  var url = info.getAuthorizationUrl();
  Logger.log("🔐 AUTH URL: " + url);
}
  /**
 * QA_ONETIME_scanMedicalTxtIntegrity_Task177
 * חד-פעמית — קריאה בלבד, אינה כותבת לשום גליון.
 * מטרה: סריקת קבצי TXT של שורות עם Doc_Category="רפואי" בלבד (המסמכים
 * שממשיכים בפועל ל-S09/יומן_אירועים_רפואי). מזהה שתי בעיות:
 * (1) תבנית לולאת-חזרה (Task 177) — יחס מילים-ייחודיות נמוך.
 * (2) פער גדול בין "מספר_מילים" שרשום בכותרת הקובץ לספירה בפועל —
 *     עשוי להצביע גם על קובץ ריק/לוגו-בלבד.
 * תוצאות ל-Logger.log בלבד — לא נכתב דבר לגליון.
 */
function QA_ONETIME_scanMedicalTxtIntegrity_Task177() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  const lastRow = sheet.getLastRow();
  if (lastRow < 5) { Logger.log("אין נתונים."); return; }

  const TXT_URL_COL = 24; // X
  const CATEGORY_COL = 12; // L — Doc_Category
  const ISSUER_COL   = 10; // J — Doc_Issuer

  const n = lastRow - 4;
  const urls      = sheet.getRange(5, TXT_URL_COL, n, 1).getValues();
  const categories = sheet.getRange(5, CATEGORY_COL, n, 1).getValues();
  const issuers    = sheet.getRange(5, ISSUER_COL, n, 1).getValues();

  const UNIQUE_RATIO_THRESHOLD = 0.20;
  const MIN_WORDS_FOR_CHECK    = 15;
  const HEADER_MISMATCH_FACTOR = 2.0; // פער של פי 2 ומעלה = חשוד

  let suspects = [];
  let errors   = [];
  let checked  = 0;
  let skipped  = 0;

  for (let i = 0; i < urls.length; i++) {
    const row = i + 5;
    const category = (categories[i][0] || "").toString().trim();
    if (category !== "רפואי") { skipped++; continue; }

    const url = (urls[i][0] || "").toString().trim();
    if (!url) { errors.push(row + ": TXT_URL ריק"); continue; }

    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) { errors.push(row + ": TXT_URL לא תקין"); continue; }
    const fileId = m[1];

    try {
      const file = DriveApp.getFileById(fileId);
      const text = file.getBlob().getDataAsString("UTF-8");
      checked++;

      // חילוץ מספר_מילים מהכותרת (נכתב ע"י S06 בזמן ההמרה)
      const headerMatch = text.match(/מספר_מילים:\s*(\d+)/);
      const headerWc = headerMatch ? parseInt(headerMatch[1], 10) : null;

      // התוכן בפועל — אחרי קו ה-====
      const parts = text.split(/={10,}/);
      const body = parts.length > 1 ? parts.slice(1).join("") : text;
      const words = body.split(/\s+/).filter(function(w) { return w.length > 0; });
      const wc = words.length;

      if (wc === 0) {
        suspects.push(row + " | " + (issuers[i][0]||"") + " | 0 מילים בפועל (header=" + headerWc + ")");
        continue;
      }

      const uniqueRatio = new Set(words).size / wc;
      const flags = [];

      if (wc > MIN_WORDS_FOR_CHECK && uniqueRatio < UNIQUE_RATIO_THRESHOLD) {
        flags.push("לולאת-חזרה חשודה (יחס ייחודי=" + uniqueRatio.toFixed(3) + ")");
      }
      if (headerWc && headerWc > 0) {
        const ratio = Math.max(wc, headerWc) / Math.min(wc, headerWc);
        if (ratio >= HEADER_MISMATCH_FACTOR) {
          flags.push("פער כותרת/בפועל (header=" + headerWc + ", actual=" + wc + ")");
        }
      }

      if (flags.length > 0) {
        suspects.push(row + " | " + (issuers[i][0]||"") + " | " + flags.join(" ; "));
      }

    } catch (e) {
      errors.push(row + ": שגיאה - " + e.message);
    }
  }

  Logger.log("=== סיכום סריקה (Task 177/178) ===");
  Logger.log("שורות רפואיות שנבדקו: " + checked + " | דולגו (לא-רפואי): " + skipped);
  Logger.log("");
  Logger.log("=== חשודות (" + suspects.length + ") ===");
  suspects.forEach(function(s) { Logger.log(s); });
  Logger.log("");
  Logger.log("=== שגיאות (" + errors.length + ") ===");
  errors.forEach(function(e) { Logger.log(e); });
}
/**
 * [Task 184] פונקציה חד-פעמית — כותרות באנגלית, שורה 4, בלי getUi().
 * שמות עצמאיים (לא מ-SHEETS_MAP) — עד לעדכון נפרד של SHEETS_MAP.
 * הרצה חד-פעמית בלבד. תוצאה ב"יומן ביצוע" (Logger.log).
 */
function task184_moveHeadersEnglishNoUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const targets = {
    "תרופות_קבועות": [
      "Drug_Name", "Active_Ingredient", "Dosage", "Frequency",
      "Treatment_Reason", "Start_Date", "End_Date", "Status",
      "Doc_Issuer", "Source_URL", "File_ID"
    ],
    "יומן_מצב_רפואי": [
      "Event_Date", "Event_Type", "Medical_System", "Issuer",
      "Primary_Diagnosis", "Severity_Status", "Recommendations",
      "Source_URL", "File_ID", "Doc_Issuer", "Record_Status"
    ],
    "בדיקות_דם": [
      "Test_Date", "Test_Name", "Category", "Value",
      "Normal_Range", "Status", "Doctor_Note", "Source_URL",
      "File_ID", "Doc_Issuer"
    ],
    "בדיקות_גנטיות": [
      "Test_Date", "Panel_Name", "Gene_Variant", "Finding",
      "Clinical_Significance", "Recommendation", "Source_URL", "File_ID"
    ],
    "הנחיות_רפואיות_ומשימות": [
      "Instruction_Date", "Doc_Issuer", "Task_Description", "Task_Type",
      "Due_Date", "Status", "Source_URL", "File_ID"
    ]
  };

  Object.keys(targets).forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) { Logger.log("❌ גליון לא נמצא: " + sheetName); return; }

    const headers   = targets[sheetName];
    const headerRow = (SHEET_CONFIG[sheetName] && SHEET_CONFIG[sheetName].HEADER_ROW) || 1;
    const totalCols = headers.length;

    // כתיבת הכותרת החדשה (אנגלית) לשורה 4
    sheet.getRange(headerRow, 1, 1, totalCols).setValues([headers]);
    sheet.getRange(headerRow, 1, 1, totalCols).setFontWeight("bold");

    // ניקוי הכותרת הישנה (עברית) שנשארה בשורה 1
    if (headerRow !== 1) {
      sheet.getRange(1, 1, 1, totalCols).clearContent();
      sheet.getRange(1, 1, 1, totalCols).setFontWeight("normal");
    }

    // הקפאת 4 שורות
    sheet.setFrozenRows(4);

    Logger.log("✅ " + sheetName + " — " + totalCols + " כותרות אנגליות בשורה " + headerRow + ", 4 שורות הוקפאו");
  });

  Logger.log("--- סיום Task 184 (אנגלית) ---");
}
/**
 * [Task 184] פונקציה חד-פעמית — עיצוב 4 השורות הראשונות ב-5 גליונות היעד
 * של S09, בהתאם למודל העיצוב הקיים ב-יומן_אירועים_רפואי / דוגמאות_למידה
 * (רקע #1A3A5C בשורת הכותרת, טקסט לבן מודגש, שורות 1-3 לבנות).
 * אינה תלויה ב-SpreadsheetApp.getUi(). הרצה חד-פעמית בלבד.
 */
function task184_formatHeaderRowsNoUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const targets = [
    "תרופות_קבועות",
    "יומן_מצב_רפואי",
    "בדיקות_דם",
    "בדיקות_גנטיות",
    "הנחיות_רפואיות_ומשימות"
  ];

  targets.forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) { Logger.log("❌ גליון לא נמצא: " + sheetName); return; }

    const lastCol = sheet.getLastColumn() || sheet.getMaxColumns();

    // שורות 1-3 — רקע לבן, בלי עיצוב מיוחד
    sheet.getRange(1, 1, 3, lastCol)
      .setBackground("#FFFFFF")
      .setFontWeight("normal");

    // שורה 4 — כותרת: רקע נייבי כהה, טקסט לבן מודגש
    sheet.getRange(4, 1, 1, lastCol)
      .setBackground("#1A3A5C")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    // גבהי שורות תואמים למודל
    sheet.setRowHeight(1, 15);
    sheet.setRowHeight(2, 40);
    sheet.setRowHeight(3, 15);
    sheet.setRowHeight(4, 26);

    Logger.log("✅ " + sheetName + " — עיצוב 4 שורות הושלם");
  });

  Logger.log("--- סיום עיצוב Task 184 ---");
}
/**
 * [Task 185] פונקציה חד-פעמית — יוצרת את הגליון "דוגמאות_למידה_S10"
 * (אם עדיין לא קיים), כותבת כותרות מ-SHEETS_MAP לשורה 4, מעצבת לפי
 * התקן (רקע #1A3A5C, טקסט לבן מודגש, שורות 1-3 לבנות), מקפיאה 4 שורות.
 * אינה תלויה ב-SpreadsheetApp.getUi(). הרצה חד-פעמית בלבד.
 */
function task185_createLearningSheetS10NoUI() {
  const SHEET_NAME = "דוגמאות_למידה_S10";
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    Logger.log("⚠️ גליון '" + SHEET_NAME + "' כבר קיים — לא נוצר מחדש, רק מעדכן כותרת/עיצוב.");
  } else {
    sheet = ss.insertSheet(SHEET_NAME);
    Logger.log("✅ גליון '" + SHEET_NAME + "' נוצר.");
  }

  const cols = SHEETS_MAP[SHEET_NAME];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: " + SHEET_NAME); return; }

  const headerRow = (SHEET_CONFIG[SHEET_NAME] && SHEET_CONFIG[SHEET_NAME].HEADER_ROW) || 4;
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  // כתיבת הכותרת לשורה 4
  sheet.getRange(headerRow, 1, 1, totalCols).setValues([headers]);
  sheet.getRange(headerRow, 1, 1, totalCols)
    .setBackground("#1A3A5C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

  // שורות 1-3 — רקע לבן
  sheet.getRange(1, 1, 3, totalCols)
    .setBackground("#FFFFFF")
    .setFontWeight("normal");

  // גבהי שורות תואמים לתקן
  sheet.setRowHeight(1, 15);
  sheet.setRowHeight(2, 40);
  sheet.setRowHeight(3, 15);
  sheet.setRowHeight(4, 26);

  // הקפאת 4 שורות
  sheet.setFrozenRows(4);

  // עמודה G (Summary) רחבה יותר — טקסט חופשי ארוך
  sheet.setColumnWidth(7, 400);

  Logger.log("✅ " + SHEET_NAME + " — " + totalCols + " עמודות, כותרת בשורה " + headerRow + ", 4 שורות הוקפאו");
}
/**
 * [Task 185] פונקציה חד-פעמית — מוסיפה 2 עמודות סטטוס (H, I) לכותרת
 * (שורה 4) של יומן_אירועים_רפואי: Validation_Status, Extraction_Status.
 * אינה תלויה ב-SpreadsheetApp.getUi(). הרצה חד-פעמית בלבד.
 */
function task185_addStatusColumnsEventsNoUI() {
  const SHEET_NAME = "יומן_אירועים_רפואי";
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { Logger.log("❌ גליון לא נמצא: " + SHEET_NAME); return; }

  const cols = SHEETS_MAP[SHEET_NAME];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: " + SHEET_NAME); return; }

  const headerRow = (SHEET_CONFIG[SHEET_NAME] && SHEET_CONFIG[SHEET_NAME].HEADER_ROW) || 4;
  const totalCols = cols.length; // 9 כעת

  const headers = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  // כתיבת כל שורת הכותרת (9 עמודות) — כולל 7 הקיימות (ללא שינוי בפועל) + 2 חדשות
  sheet.getRange(headerRow, 1, 1, totalCols).setValues([headers]);
  sheet.getRange(headerRow, 1, 1, totalCols)
    .setBackground("#1A3A5C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

  Logger.log("✅ " + SHEET_NAME + " — עודכן ל-" + totalCols + " עמודות (נוספו Validation_Status, Extraction_Status)");
}
/**
 * [Task 198] פונקציה חד-פעמית — יוצרת את הגליון "ניהול_מיילים_ארכיון"
 * (אם עדיין לא קיים), כותבת כותרות מ-SHEETS_MAP לשורה 4, מעצבת זהה
 * בפועל ל-ניהול_מיילים (רקע #1565C0 בשורת הכותרת, טקסט לבן מודגש,
 * גבהי שורות 13.5/45/15/21, הקפאת 4 שורות + עמודה A). אומת מול הגליון
 * החי (לא מהמודל הכללי של Task 184/185 — שונה בפועל). אינה תלויה
 * ב-SpreadsheetApp.getUi(). הרצה חד-פעמית בלבד.
 */
function task198_createArchiveSheetNoUI() {
  const SHEET_NAME = "ניהול_מיילים_ארכיון";
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    Logger.log("⚠️ גליון '" + SHEET_NAME + "' כבר קיים — לא נוצר מחדש, רק מעדכן כותרת/עיצוב.");
  } else {
    sheet = ss.insertSheet(SHEET_NAME);
    Logger.log("✅ גליון '" + SHEET_NAME + "' נוצר.");
  }

  const cols = SHEETS_MAP[SHEET_NAME];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: " + SHEET_NAME); return; }

  const headerRow = (SHEET_CONFIG[SHEET_NAME] && SHEET_CONFIG[SHEET_NAME].HEADER_ROW) || 4;
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  // כתיבת הכותרת לשורה 4 — צבע זהה בפועל לניהול_מיילים (#1565C0)
  sheet.getRange(headerRow, 1, 1, totalCols).setValues([headers]);
  sheet.getRange(headerRow, 1, 1, totalCols)
    .setBackground("#1565C0")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

  // שורות 1-3 — רקע לבן
  sheet.getRange(1, 1, 3, totalCols)
    .setBackground("#FFFFFF")
    .setFontWeight("normal");

  // גבהי שורות זהים בפועל לניהול_מיילים
  sheet.setRowHeight(1, 18);
  sheet.setRowHeight(2, 60);
  sheet.setRowHeight(3, 20);
  sheet.setRowHeight(4, 28);

  // הקפאת 4 שורות + עמודה A — זהה לניהול_מיילים
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);

  Logger.log("✅ " + SHEET_NAME + " — " + totalCols + " עמודות, כותרת בשורה " + headerRow + ", 4 שורות + עמודה A הוקפאו");
}
/**
 * qa_testS13IconPlacement_Task188prep
 * חד-פעמית — בודקת שאפשר להצמיד את אייקון S13 (עמודה F) לגליון
 * יומן_אירועים_רפואי בלי לפגוע בשני האייקונים הקיימים (A ו-C).
 * לא קוראת ל-setupMedicalEventsIcons() המלאה (שמוחקת ובונה הכל מחדש) —
 * רק שולפת את רשומת col:6 מ-MEDICAL_EVENTS_ICON_MAP ומכניסה אותה לבד,
 * כדי לבודד את הבדיקה. אינה מוחקת אייקונים קיימים.
 */
function qa_testS13IconPlacement_Task188prep() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MEDICAL_EVENTS_SHEET_NAME);
  if (!sheet) { Logger.log("❌ גליון לא נמצא: " + MEDICAL_EVENTS_SHEET_NAME); return; }

  const mapping = MEDICAL_EVENTS_ICON_MAP.filter(function(m) { return m.col === 6; })[0];
  if (!mapping) { Logger.log("❌ לא נמצאה רשומת col:6 ב-MEDICAL_EVENTS_ICON_MAP"); return; }

  try {
    const file     = DriveApp.getFileById(mapping.fileId);
    const blob     = file.getBlob();
    const rowHeight = sheet.getRowHeight(2);
    const iconSize  = Math.max(30, rowHeight - 4);
    const colWidth  = sheet.getColumnWidth(mapping.col);
    const offsetX   = Math.max(0, Math.floor((colWidth - iconSize) / 2));

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
    labelCell.setBackground(mapping.bg);
    labelCell.setFontColor(mapping.fg);
    labelCell.setFontWeight("bold");
    labelCell.setFontSize(9);
    labelCell.setHorizontalAlignment("center");
    labelCell.setVerticalAlignment("middle");

    SpreadsheetApp.flush();
    Logger.log("✅ אייקון S13 הוצמד לעמודה F בהצלחה — נדרש אימות ויזואלי ידני (חפיפה/חיתוך/שדה מוסתר).");

  } catch (e) {
    Logger.log("❌ qa_testS13IconPlacement_Task188prep נכשלה: " + e.toString());
  }
}
/**
 * task188prep_setupMedicalEventsIconsNoUI
 * חד-פעמית — עותק של setupMedicalEventsIcons (ViewEngine.gs) בלי קריאות
 * ל-SpreadsheetApp.getUi(), כדי שאפשר יהיה להריץ ישירות מהעורך (בלי הקשר
 * UI פעיל). אותה לוגיקה בדיוק — מוחקת אייקונים קיימים ובונה מחדש את כל
 * 3 האייקונים לפי MEDICAL_EVENTS_ICON_MAP. הודעות הצלחה/שגיאה ל-Logger.log
 * בלבד במקום ui.alert.
 */
function task188prep_setupMedicalEventsIconsNoUI() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MEDICAL_EVENTS_SHEET_NAME);

    if (!sheet) {
      Logger.log("❌ גליון '" + MEDICAL_EVENTS_SHEET_NAME + "' לא נמצא.");
      return;
    }

    const existingImages = sheet.getImages();
    existingImages.forEach(function(img) { img.remove(); });
    SpreadsheetApp.flush();
    Logger.log("[task188prep] נמחקו: " + existingImages.length + " איקונים");

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

        const labelCell = sheet.getRange(3, mapping.col);
        labelCell.setValue(mapping.label);
        labelCell.setBackground(mapping.bg);
        labelCell.setFontColor(mapping.fg);
        labelCell.setFontWeight("bold");
        labelCell.setFontSize(9);
        labelCell.setHorizontalAlignment("center");
        labelCell.setVerticalAlignment("middle");

        Logger.log("[task188prep] נוסף: " + mapping.script + " עמודה " + mapping.col);

      } catch (imgErr) {
        Logger.log("[task188prep] שגיאה: " + mapping.script + " | " + imgErr.toString());
      }
    });

    SpreadsheetApp.flush();
    Logger.log("✅ [task188prep] הושלם — 3 איקונים (A/הרחב, C/S10 אימות, F/S13 חילוץ)");

  } catch (e) {
    Logger.log("❌ [task188prep] שגיאה כללית: " + e.toString());
  }
}
/**
 * task188_addMedicalSystemColumnNoUI
 * חד-פעמית — מוסיפה בפועל את עמודת Medical_System (שנוספה ל-COLUMN_MAP.gs)
 * לסוף 4 מתוך 5 גליונות היעד (תרופות_קבועות/בדיקות_דם/בדיקות_גנטיות/
 * הנחיות_רפואיות_ומשימות). יומן_מצב_רפואי לא נכלל — כבר יש לו Medical_System
 * בעמודה 3 מההתחלה. קוראת את מספר העמודה ישירות מ-SHEETS_MAP, לא קשיח.
 * עיצוב תואם לשורת כותרת קיימת (רקע #1A3A5C, טקסט לבן מודגש).
 */
function task188_addMedicalSystemColumnNoUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const targets = [
    "תרופות_קבועות",
    "בדיקות_דם",
    "בדיקות_גנטיות",
    "הנחיות_רפואיות_ומשימות"
  ];

  targets.forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) { Logger.log("❌ גליון לא נמצא: " + sheetName); return; }

    const cols = SHEETS_MAP[sheetName];
    if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: " + sheetName); return; }

    const colDef = cols.filter(function(c) { return c.name === "Medical_System"; })[0];
    if (!colDef) { Logger.log("❌ Medical_System לא נמצא ב-SHEETS_MAP עבור: " + sheetName); return; }

    const headerRow = (SHEET_CONFIG[sheetName] && SHEET_CONFIG[sheetName].HEADER_ROW) || 4;

    sheet.getRange(headerRow, colDef.col)
      .setValue("Medical_System")
      .setBackground("#1A3A5C")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");

    Logger.log("✅ " + sheetName + " — Medical_System נוסף לעמודה " + colDef.col);
  });

  Logger.log("--- סיום הוספת Medical_System (Task #188) ---");
}
/**
 * בדיקת E00 עצמאית (Task #203) — קריאה בלבד, ללא כתיבה לגיליון.
 * בודקת רקורסיבית: לכל שורה בניהול_מיילים שיש לה לפחות אירוע אחד
 * ביומן_אירועים_רפואי (לפי File_ID) — בודקת התאמת M, ריקנות S/T, תקינות N.
 * מדפיסה כל ממצא ל-Logger וסיכום מספרי בסוף.
 */
function QA_ONETIME_testE00_EventLogBackcheck_Task203() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mailSheet   = ss.getSheetByName("ניהול_מיילים");
  const eventsSheet = ss.getSheetByName("יומן_אירועים_רפואי");

  if (!mailSheet || !eventsSheet) {
    Logger.log("❌ שגיאה: לא נמצא אחד הגליונות הנדרשים");
    return;
  }

  const FIRST_DATA_ROW = 5;
  const M_EXPECTED      = "חולץ ליומן אירועים";
  const N_VALID_VALUES  = ["חולץ מלא", "חולץ חלקי"];

  // --- בניית מפת File_ID -> מספר אירועים מתוך יומן_אירועים_רפואי (עמודה G) ---
  const eventsLastRow = eventsSheet.getLastRow();
  const eventFileIdCounts = {};
  if (eventsLastRow >= FIRST_DATA_ROW) {
    const eventFileIds = eventsSheet
      .getRange(FIRST_DATA_ROW, 7, eventsLastRow - FIRST_DATA_ROW + 1, 1)
      .getValues();
    eventFileIds.forEach(function (row) {
      const fid = String(row[0] || "").trim();
      if (!fid) return;
      eventFileIdCounts[fid] = (eventFileIdCounts[fid] || 0) + 1;
    });
  }

  // --- מעבר על ניהול_מיילים ---
  const mailLastRow = mailSheet.getLastRow();
  if (mailLastRow < FIRST_DATA_ROW) {
    Logger.log("אין שורות נתונים בניהול_מיילים");
    return;
  }

  const numRows = mailLastRow - FIRST_DATA_ROW + 1;
  const fileIds = mailSheet.getRange(FIRST_DATA_ROW, 1, numRows, 1).getValues();   // A
  const mVals   = mailSheet.getRange(FIRST_DATA_ROW, 13, numRows, 1).getValues();  // M
  const nVals   = mailSheet.getRange(FIRST_DATA_ROW, 14, numRows, 1).getValues();  // N
  const sVals   = mailSheet.getRange(FIRST_DATA_ROW, 19, numRows, 1).getValues();  // S
  const tVals   = mailSheet.getRange(FIRST_DATA_ROW, 20, numRows, 1).getValues();  // T

  let checkedRows = 0;
  let findingsM = 0;
  let findingsST = 0;
  let findingsN = 0;
  let totalFindings = 0;

  for (let i = 0; i < numRows; i++) {
    const fid = String(fileIds[i][0] || "").trim();
    if (!fid) continue;

    const eventCount = eventFileIdCounts[fid] || 0;
    if (eventCount === 0) continue; // אין אירועים ביומן — לא רלוונטי ל-E00

    checkedRows++;
    const rowNum = FIRST_DATA_ROW + i;
    const mVal = String(mVals[i][0] || "").trim();
    const nVal = String(nVals[i][0] || "").trim();
    const sVal = String(sVals[i][0] || "").trim();
    const tVal = String(tVals[i][0] || "").trim();

    if (mVal !== M_EXPECTED) {
      findingsM++;
      totalFindings++;
      Logger.log(
        "⚠️ שורה " + rowNum + " | File_ID=" + fid +
        " | אירועים ביומן=" + eventCount +
        " | M שגוי: '" + mVal + "' (צפוי: '" + M_EXPECTED + "')"
      );
    }

    if (sVal !== "" || tVal !== "") {
      findingsST++;
      totalFindings++;
      Logger.log(
        "⚠️ שורה " + rowNum + " | File_ID=" + fid +
        " | S/T לא ריקים למרות חילוץ קיים | S='" + sVal + "' T='" + tVal + "'"
      );
    }

    if (N_VALID_VALUES.indexOf(nVal) === -1) {
      findingsN++;
      totalFindings++;
      Logger.log(
        "⚠️ שורה " + rowNum + " | File_ID=" + fid +
        " | N לא תקין: '" + nVal + "' (צפוי אחד מ: " + N_VALID_VALUES.join(" / ") + ")"
      );
    }
  }

  Logger.log("──────────────────────────────");
  Logger.log("סיכום בדיקת E00 (Task #203):");
  Logger.log("שורות עם אירועים ביומן שנבדקו: " + checkedRows);
  Logger.log("ממצאי M שגוי: " + findingsM);
  Logger.log("ממצאי S/T לא ריקים: " + findingsST);
  Logger.log("ממצאי N לא תקין: " + findingsN);
  Logger.log("סה\"כ ממצאים: " + totalFindings);
}

/**
 * QA_ONETIME_restoreOverwrittenDismissNotes_Task203
 * חד-פעמית — מתקנת 24 שורות בגליון ניהול_מיילים שבהן case "e0b_lock"
 * (S11_QArun.gs, לפני שנוסף guard על qaDismissNote) דרס בטעות הערות QA
 * ידניות קיימות בעמודה V (QA_Dismiss_Note) וכתב עליהן את סמן הנעילה
 * החלקית של E0B. משחזרת את הטקסט המקורי בלבד בעמודה V, ורק אחרי אימות
 * כפול לכל שורה: File_ID תואם (עמודה A) + הערך הנוכחי ב-V הוא באמת סמן
 * ה-E0B (אחרת מדלגת — כדי לא לדרוס משהו ששונה ידנית בינתיים).
 * שימוש: הרץ פעם אחת מהעורך (▶️ Run) → פתח יומן ביצוע (Ctrl+Enter) לבדיקה.
 */
function QA_ONETIME_restoreOverwrittenDismissNotes_Task203() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  if (!sheet) { Logger.log("❌ גליון 'ניהול_מיילים' לא נמצא."); return; }

  const V_COL = 22; // QA_Dismiss_Note
  const E0B_MARKER = "🔒 אומת E0B — מאושר + TXT + נתונים מלאים";

  const RESTORE_DATA = [
    { row: 5,  fileId: "1Gcc666NGtgxsXYfj3vHUGruQ0Y7S0BJt", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 23, fileId: "1swdJZuuGrb0Slc-9fZZqrmT_wfUrIFQZ", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 24, fileId: "1SIsWTv4DvDCVNX1yRLZys5NR1FeI3kVV", original: "נבדק ידנית — לא רלוונטי (לוגו/ריק)" },
    { row: 29, fileId: "1VJ9IMTzXoNiGE_v1AHj5lMyTKLThvVyQ", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 32, fileId: "1Wt2EqK9iFQv36nRWf4iy0BCTunZIwM1D", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 33, fileId: "1ey9nuQ1Au4FNgRnFHVZh1qSIHHT4CFam", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 34, fileId: "1hjdPa_4j4ZvIvE6tlO2ePuKO3tkWGXkK", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 36, fileId: "1hgOMp0iPbhqTC9y6gFJbkdACNIAIDEz0", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 37, fileId: "1SMxR2hLch-qqmQ2nPSQnYmMkpRrp415h", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 38, fileId: "1HtaF5FM2m1wzCS7Irc5K1UD85ORSSnaz", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 39, fileId: "1AF7xmVZu5Wa8OVdgxh0B6iPnFKvQ2AlN", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 40, fileId: "1WpTjWZlMbf6dG1_zSaC-8QaKH-7FrktG", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 41, fileId: "1EymXIsYeEJGvsrz8vm1oVyjM9cGUOwis", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 42, fileId: "1VjdQPTUXJVW-e9MqdO1Pho7-HxTgWZA3", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 43, fileId: "1sulnp4NfBg8I_BmqDFCN1ROxlijH_Wku", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 46, fileId: "1cTZGJaAm56Cqu5ldtOmaHWLfOz9hbyKW", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 56, fileId: "1LCC-nr4cmo6vyuuHzXMro0ats-lBIOkL", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 57, fileId: "1yLQr5I1PGntbWBqAbcffj1xRcpq_GBcA", original: "נבדק ידנית — לא רלוונטי (לוגו/ריק)" },
    { row: 59, fileId: "1JRvdb6bha6aYA3YQNX6sj-G9lf5u9fnN", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 61, fileId: "1JM4ipAyZiah5NPdnE5zlEeOPTN0tfcTn", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 62, fileId: "1OBQepZ8QeuMV-M53b8-YVZs7QV3XPoGV", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 64, fileId: "1iiQoE75a8LW1VSJ1sTcuN4DEDGVAYfes", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 65, fileId: "1e6x51y7Uy2Ehd-wKReU04_VKznKE7-o7", original: "נבדק ידנית — לא רלוונטי (כפול)" },
    { row: 67, fileId: "1sVLnUC4J5X6k-8dE-otkPRA6z1nGWkfJ", original: "נבדק ידנית — לא רלוונטי (כפול)" }
  ];

  let restored = 0;
  let skipped  = 0;

  RESTORE_DATA.forEach(function(item) {
    const actualFileId = (sheet.getRange(item.row, 1).getValue() || "").toString().trim();
    if (actualFileId !== item.fileId) {
      Logger.log("⛔ דולג — שורה " + item.row + " | File_ID לא תואם (צפוי: " + item.fileId + " | בפועל: " + actualFileId + ")");
      skipped++;
      return;
    }

    const currentV = (sheet.getRange(item.row, V_COL).getValue() || "").toString().trim();
    if (currentV !== E0B_MARKER) {
      Logger.log("⛔ דולג — שורה " + item.row + " | V כבר אינו סמן E0B (בפועל: '" + currentV + "') — לא נוגעים, כנראה כבר טופל");
      skipped++;
      return;
    }

    sheet.getRange(item.row, V_COL).setValue(item.original);
    Logger.log("✅ שוחזר — שורה " + item.row + " | V='" + item.original + "'");
    restored++;
  });

  SpreadsheetApp.flush();
  Logger.log("──────────────────────────────");
  Logger.log("סיכום שחזור: " + restored + " שוחזרו | " + skipped + " דולגו מתוך " + RESTORE_DATA.length);
}
/**
 * [חדש] QA_ONETIME_migrateFileIdToL_Task_SRow — מיגרציה חד-פעמית:
 * יומן_אירועים_רפואי — העתקת File_ID מעמודה G (הישנה) לעמודה L (החדשה),
 * וניקוי G כדי שתשמש מעתה S_Row. הרץ פעם אחת בלבד, לפני הלחיצה
 * הראשונה על "רענן שורות". שימוש: הרץ מהעורך (▶️ Run) → בדוק Logger.
 */
function QA_ONETIME_migrateFileIdToL_Task_SRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("יומן_אירועים_רפואי");
  if (!sheet) { Logger.log("❌ גליון 'יומן_אירועים_רפואי' לא נמצא."); return; }

  const firstDataRow = 5;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) { Logger.log("אין נתונים — כלום לא הועתק."); return; }

  const numRows = lastRow - firstDataRow + 1;
  const gValues = sheet.getRange(firstDataRow, 7, numRows, 1).getValues(); // G = File_ID הישן

  let migrated = 0;
  let empty    = 0;

  const lValues = gValues.map(function(row) {
    const val = (row[0] || "").toString().trim();
    if (val) { migrated++; return [val]; }
    empty++;
    return [""];
  });

  sheet.getRange(firstDataRow, 12, numRows, 1).setValues(lValues); // כתיבה ל-L
  sheet.getRange(firstDataRow, 7, numRows, 1).clearContent();       // ניקוי G

  SpreadsheetApp.flush();
  Logger.log("──────────────────────────────");
  Logger.log("מיגרציה הושלמה: " + migrated + " הועתקו ל-L | " + empty + " היו ריקים | סה\"כ שורות: " + numRows);
}
/**
 * AAA_FORCE_OAUTH_PROMPT_ALL — פונקציה חד-פעמית לאילוץ בקשת הרשאות
 * מלאה (Drive, Gmail, UrlFetchApp, Sheets) בבת אחת. יש להריץ אותה
 * מתוך התפריט הזמני בגליון (AAA_ADD_TEMP_MENU) — לא ישירות מהעורך.
 * דפוס מוכח מ-13/07 ו-04/08/2026: הרשאות Gmail/UrlFetch דורשות
 * הקשר UI אמיתי של גליון פעיל כדי להציג את חלון ההסכמה.
 */
function AAA_FORCE_OAUTH_PROMPT_ALL() {
  var ui = SpreadsheetApp.getUi();
  var results = [];

  try {
    DriveApp.getRootFolder().getName();
    results.push("✅ Drive — תקין");
  } catch (e) {
    results.push("❌ Drive — " + e.message);
  }

  try {
    GmailApp.getInboxUnreadCount();
    results.push("✅ Gmail — תקין");
  } catch (e) {
    results.push("❌ Gmail — " + e.message);
  }

  try {
    UrlFetchApp.fetch("https://www.google.com");
    results.push("✅ UrlFetch (רשת חיצונית/AI) — תקין");
  } catch (e) {
    results.push("❌ UrlFetch — " + e.message);
  }

  try {
    SpreadsheetApp.getActiveSpreadsheet().getName();
    results.push("✅ Sheets — תקין");
  } catch (e) {
    results.push("❌ Sheets — " + e.message);
  }

  ui.alert("בדיקת הרשאות מלאה — תוצאה", results.join("\n"), ui.ButtonSet.OK);
}

/**
 * AAA_TEST_CONTAINER_UI_REAL — [חדש] בדיקה אמיתית של הרשאת
 * script.container.ui. בניגוד ל-ui.alert (לא דורש הרשאה זו כלל),
 * הפונקציה הזו קוראת בפועל ל-showModalDialog — הקריאה היחידה שמפעילה
 * בקשת הסכמה אמיתית לסקופ הזה. יש להריץ אך ורק מהתפריט הזמני בגליון
 * (AAA_ADD_TEMP_MENU) כדי שחלון ההסכמה של גוגל יופיע.
 */
function AAA_TEST_CONTAINER_UI_REAL() {
  var ui   = SpreadsheetApp.getUi();
  var html = HtmlService
    .createHtmlOutput('<p style="direction:rtl;text-align:right;font-family:Arial;">בדיקת הרשאת חלון הצליחה ✅</p>')
    .setWidth(300)
    .setHeight(100);
  ui.showModalDialog(html, 'בדיקת הרשאת Container UI');
}

/**
 * AAA_ADD_TEMP_MENU — מוסיפה תפריט זמני לגליון החי עם קישור ל-
 * AAA_FORCE_OAUTH_PROMPT_ALL ול-AAA_TEST_CONTAINER_UI_REAL. יש להריץ
 * פעם אחת מהעורך (▶️ Run) — זו קריאה בטוחה (SpreadsheetApp.getUi
 * בלבד) שלא דורשת הרשאה חדשה ולא אמורה להיכשל. אחרי ההרצה, תפריט
 * "🔐 תיקון הרשאות" יופיע בסרגל התפריטים של הגליון עצמו — יש ללחוץ
 * על הפריטים משם (לא מהעורך).
 */
function AAA_ADD_TEMP_MENU() {
  SpreadsheetApp.getUi()
    .createMenu('🔐 תיקון הרשאות')
    .addItem('הרץ בדיקת הרשאות מלאה', 'AAA_FORCE_OAUTH_PROMPT_ALL')
    .addItem('בדיקת הרשאת חלון (Container UI)', 'AAA_TEST_CONTAINER_UI_REAL')
    .addToUi();
}

/**
 * task206_migrateMedicalStatusColumnsNoUI
 * חד-פעמית — מסדרת מחדש את הנתונים הקיימים ביומן_מצב_רפואי מהמבנה הישן
 * (11 עמודות: Event_Date, Event_Type, Medical_System, Issuer,
 * Primary_Diagnosis, Severity_Status, Recommendations, Source_URL,
 * File_ID, Doc_Issuer, Record_Status) למבנה החדש (12 עמודות, Task #206
 * — ראה SHEETS_MAP["יומן_מצב_רפואי"], COLUMN_MAP.gs). עמודת Issuer
 * (הישנה, D) מוסרת — לפי החלטת עמוס (מוחלפת ב-Medical_System_Name).
 * Medical_System_Name (C החדשה) ו-S_Row (I החדשה) נכתבות ריקות כאן —
 * מחושבות בפועל ע"י refreshMedicalStatusRows (כפתור "רענן שורות").
 * כותבת גם את שורת הכותרת החדשה (12 שמות, מ-SHEETS_MAP, לא קשיח).
 * להריץ פעם אחת מהעורך (▶️ Run), לפני שימוש ראשון באיקוני Task #206.
 */
function task206_migrateMedicalStatusColumnsNoUI() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("יומן_מצב_רפואי");
  if (!sheet) { Logger.log("❌ גליון לא נמצא: יומן_מצב_רפואי"); return; }

  const headerRow    = (SHEET_CONFIG["יומן_מצב_רפואי"] && SHEET_CONFIG["יומן_מצב_רפואי"].HEADER_ROW) || 4;
  const firstDataRow = (SHEET_CONFIG["יומן_מצב_רפואי"] && SHEET_CONFIG["יומן_מצב_רפואי"].FIRST_DATA_ROW) || 5;
  const lastRow       = sheet.getLastRow();

  // כתיבת שורת כותרת חדשה (12 עמודות), לפי הסדר ב-SHEETS_MAP — לא קשיח
  const cols = SHEETS_MAP["יומן_מצב_רפואי"];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: יומן_מצב_רפואי"); return; }
  const sortedCols    = cols.slice().sort(function(a, b) { return a.col - b.col; });
  const headerValues  = [sortedCols.map(function(c) { return c.name; })];
  sheet.getRange(headerRow, 1, 1, sortedCols.length)
    .setValues(headerValues)
    .setBackground("#1A3A5C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  Logger.log("✅ שורת כותרת עודכנה ל-12 עמודות");

  if (lastRow < firstDataRow) {
    Logger.log("--- אין שורות נתונים למיגרציה ---");
    return;
  }

  const numRows = lastRow - firstDataRow + 1;
  const oldData = sheet.getRange(firstDataRow, 1, numRows, 11).getValues();

  const newData = oldData.map(function(old) {
    return [
      old[0],   // Event_Date
      old[1],   // Event_Type
      "",       // Medical_System_Name — יחושב ע"י refreshMedicalStatusRows
      old[4],   // Primary_Diagnosis
      old[5],   // Severity_Status
      old[6],   // Recommendations
      old[10],  // Record_Status
      old[9],   // Doc_Issuer
      "",       // S_Row — יחושב ע"י refreshMedicalStatusRows
      old[2],   // Medical_System (קוד גולמי)
      old[8],   // File_ID
      old[7]    // Source_URL
    ];
  });

  // ניקוי הטווח הישן (11 עמודות) לפני כתיבת 12 החדשות
  sheet.getRange(firstDataRow, 1, numRows, 11).clearContent();
  sheet.getRange(firstDataRow, 1, numRows, 12).setValues(newData);

  Logger.log("✅ הועברו " + numRows + " שורות למבנה החדש (12 עמודות)");
  Logger.log("--- סיום מיגרציית יומן_מצב_רפואי (Task #206) ---");
}

/**
 * task206b_migrateMedicalStatusETCodeNoUI
 * חד-פעמית — מרחיבה את יומן_מצב_רפואי מהמבנה בן 12 העמודות (Task #206,
 * שלב 1) למבנה בן 13 העמודות (הרחבת Task #206, ET_CODE) — ראה
 * SHEETS_MAP["יומן_מצב_רפואי"], COLUMN_MAP.gs. ET_CODE (K החדשה) נכתבת
 * ריקה כאן — מחושבת בפועל ע"י refreshMedicalStatusRows (כפתור "רענן
 * שורות"). File_ID ו-Source_URL זזות עמודה אחת ימינה (K→L, L→M).
 * כותבת גם את שורת הכותרת החדשה (13 שמות, מ-SHEETS_MAP, לא קשיח).
 * להריץ פעם אחת מהעורך (▶️ Run), לפני שימוש ראשון ב-ET_CODE.
 */
function task206b_migrateMedicalStatusETCodeNoUI() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("יומן_מצב_רפואי");
  if (!sheet) { Logger.log("❌ גליון לא נמצא: יומן_מצב_רפואי"); return; }

  const headerRow    = (SHEET_CONFIG["יומן_מצב_רפואי"] && SHEET_CONFIG["יומן_מצב_רפואי"].HEADER_ROW) || 4;
  const firstDataRow = (SHEET_CONFIG["יומן_מצב_רפואי"] && SHEET_CONFIG["יומן_מצב_רפואי"].FIRST_DATA_ROW) || 5;
  const lastRow       = sheet.getLastRow();

  // כתיבת שורת כותרת חדשה (13 עמודות), לפי הסדר ב-SHEETS_MAP — לא קשיח
  const cols = SHEETS_MAP["יומן_מצב_רפואי"];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: יומן_מצב_רפואי"); return; }
  const sortedCols    = cols.slice().sort(function(a, b) { return a.col - b.col; });
  const headerValues  = [sortedCols.map(function(c) { return c.name; })];
  sheet.getRange(headerRow, 1, 1, sortedCols.length)
    .setValues(headerValues)
    .setBackground("#1A3A5C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  Logger.log("✅ שורת כותרת עודכנה ל-13 עמודות");

  if (lastRow < firstDataRow) {
    Logger.log("--- אין שורות נתונים למיגרציה ---");
    return;
  }

  const numRows = lastRow - firstDataRow + 1;
  const oldData = sheet.getRange(firstDataRow, 1, numRows, 12).getValues();

  const newData = oldData.map(function(old) {
    return [
      old[0],   // Event_Date
      old[1],   // Event_Type
      old[2],   // Medical_System_Name
      old[3],   // Primary_Diagnosis
      old[4],   // Severity_Status
      old[5],   // Recommendations
      old[6],   // Record_Status
      old[7],   // Doc_Issuer
      old[8],   // S_Row
      old[9],   // Medical_System (קוד גולמי)
      "",       // ET_CODE — יחושב ע"י refreshMedicalStatusRows
      old[10],  // File_ID (הוזז מ-K ל-L)
      old[11]   // Source_URL (הוזז מ-L ל-M)
    ];
  });

  // ניקוי הטווח הישן (12 עמודות) לפני כתיבת 13 החדשות
  sheet.getRange(firstDataRow, 1, numRows, 12).clearContent();
  sheet.getRange(firstDataRow, 1, numRows, 13).setValues(newData);

  Logger.log("✅ הועברו " + numRows + " שורות למבנה החדש (13 עמודות)");
  Logger.log("--- סיום מיגרציית ET_CODE ביומן_מצב_רפואי (הרחבת Task #206) ---");
}

/**
 * task206c_buildCodeMapSheetNoUI
 * חד-פעמית — יוצרת את גליון מיפוי_קודים (הרחבת Task #206): טבלה אחודה
 * למערכות גוף (SYS00-SYS14) וקודי אירוע (ET_CODE) — ראה
 * SHEETS_MAP["מיפוי_קודים"], COLUMN_MAP.gs. כותבת כותרת מוגנת (3 עמודות,
 * מ-SHEETS_MAP, לא קשיח), זורעת 15 שורות מערכת_גוף התחלתיות (SYS00-SYS14,
 * זהה למיפוי הישן MEDICAL_STATUS_BODY_SYSTEMS שהוסר), ומכניסה את אייקון
 * "[ רענן ]" (CODE_MAP_ICON_MAP, ViewEngine.gs). שורות קוד_אירוע לא נזרעות
 * כאן — נוצרות בהדרגה ע"י האייקון (runRefreshIconCodeMap / refreshCodeMapLearning).
 * להריץ פעם אחת מהעורך (▶️ Run), לפני שימוש ראשון בגליון.
 */
function task206c_buildCodeMapSheetNoUI() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();
  let sheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);

  if (sheet) {
    Logger.log("⚠️ גליון '" + CODE_MAP_SHEET_NAME + "' כבר קיים — לא נוצר מחדש.");
  } else {
    sheet = ss.insertSheet(CODE_MAP_SHEET_NAME);
    Logger.log("✅ גליון '" + CODE_MAP_SHEET_NAME + "' נוצר.");
  }

  const headerRow    = SHEET_CONFIG[CODE_MAP_SHEET_NAME].HEADER_ROW;
  const firstDataRow = SHEET_CONFIG[CODE_MAP_SHEET_NAME].FIRST_DATA_ROW;

  // כתיבת שורת כותרת (3 עמודות), לפי הסדר ב-SHEETS_MAP — לא קשיח
  const cols = SHEETS_MAP[CODE_MAP_SHEET_NAME];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: " + CODE_MAP_SHEET_NAME); return; }
  const sortedCols   = cols.slice().sort(function(a, b) { return a.col - b.col; });
  const headerValues = [sortedCols.map(function(c) { return c.name; })];
  sheet.getRange(headerRow, 1, 1, sortedCols.length)
    .setValues(headerValues)
    .setBackground("#1A3A5C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  try { sheet.getRange(headerRow, 1, 1, sortedCols.length).protect().setWarningOnly(true); } catch (e) {}
  sheet.setFrozenRows(headerRow);
  Logger.log("✅ שורת כותרת נכתבה (" + sortedCols.length + " עמודות)");

  // זריעת 15 שורות מערכת_גוף — רק אם עדיין אין נתונים בגליון
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) {
    const bodySystems = [
      ["SYS00", "מערכת כללית"], ["SYS01", "מערכת השלד"], ["SYS02", "מערכת השרירים"],
      ["SYS03", "מערכת הכסות"], ["SYS04", "מערכת העצבים"], ["SYS05", "המערכת האנדוקרינית"],
      ["SYS06", "מערכת הדם וכלי הדם"], ["SYS07", "מערכת הלימפה"], ["SYS08", "מערכת החיסון"],
      ["SYS09", "מערכת הנשימה"], ["SYS10", "מערכת העיכול"], ["SYS11", "מערכת השתן"],
      ["SYS12", "מערכת הרבייה"], ["SYS13", "מערכות החישה"], ["SYS14", "מערכת הגנים"]
    ];
    const seedRows = bodySystems.map(function(pair) {
      return [CODE_MAP_TYPE_BODY_SYSTEM, pair[0], pair[1]];
    });
    sheet.getRange(firstDataRow, 1, seedRows.length, 3).setValues(seedRows);
    Logger.log("✅ נזרעו " + seedRows.length + " שורות מערכת_גוף");
  } else {
    Logger.log("⚠️ יש כבר נתונים בגליון — זריעת מערכות הגוף דולגה.");
  }

  // הכנסת אייקון "[ רענן ]" (מחיקת קיים + הכנסה מחדש, כמו setupMedicalStatusIcons)
  const existingImages = sheet.getImages();
  existingImages.forEach(function(img) { img.remove(); });
  SpreadsheetApp.flush();

  const rowHeight = sheet.getRowHeight(2) || 21;
  const iconSize  = Math.max(30, rowHeight - 4);

  CODE_MAP_ICON_MAP.forEach(function(mapping) {
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
      labelCell.setBackground(mapping.bg);
      labelCell.setFontColor(mapping.fg);
      labelCell.setFontWeight("bold");
      labelCell.setFontSize(9);
      labelCell.setHorizontalAlignment("center");
      labelCell.setVerticalAlignment("middle");

      Logger.log("✅ אייקון נוסף: " + mapping.script + " עמודה " + mapping.col);
    } catch (imgErr) {
      Logger.log("❌ שגיאת אייקון: " + mapping.script + " | " + imgErr.toString());
    }
  });

  SpreadsheetApp.flush();
  ui.alert("✅ גליון '" + CODE_MAP_SHEET_NAME + "' מוכן — כותרת, מערכות גוף, ואייקון '[ רענן ]'.");
  Logger.log("--- סיום הקמת גליון מיפוי_קודים (הרחבת Task #206) ---");
}

/**
 * task206d_extendMedicalStatusNormalizedColsNoUI
 * חד-פעמית — מרחיבה את יומן_מצב_רפואי מהמבנה בן 13 העמודות (הרחבת
 * Task #206, ET_CODE) למבנה בן 15 העמודות (הרחבת Task #206, סבב 3) —
 * ראה SHEETS_MAP["יומן_מצב_רפואי"], COLUMN_MAP.gs. מוסיפה 2 עמודות
 * חדשות בסוף בלבד (Body_System_Normalized=14, Event_Type_Normalized=15)
 * — אין הזזת נתונים קיימים בעמודות 1-13, רק כתיבת כותרת מורחבת (15
 * שמות, מ-SHEETS_MAP, לא קשיח). שתי העמודות החדשות נשארות ריקות —
 * מחושבות בפועל ע"י refreshMedicalStatusRows (כפתור "רענן שורות").
 * להריץ פעם אחת מהעורך (▶️ Run), לפני שימוש ראשון בעמודות המנורמלות.
 */
function task206d_extendMedicalStatusNormalizedColsNoUI() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("יומן_מצב_רפואי");
  if (!sheet) { Logger.log("❌ גליון לא נמצא: יומן_מצב_רפואי"); return; }

  const headerRow = (SHEET_CONFIG["יומן_מצב_רפואי"] && SHEET_CONFIG["יומן_מצב_רפואי"].HEADER_ROW) || 4;

  // כתיבת שורת כותרת חדשה (15 עמודות), לפי הסדר ב-SHEETS_MAP — לא קשיח
  const cols = SHEETS_MAP["יומן_מצב_רפואי"];
  if (!cols) { Logger.log("❌ אין הגדרה ב-SHEETS_MAP עבור: יומן_מצב_רפואי"); return; }
  const sortedCols   = cols.slice().sort(function(a, b) { return a.col - b.col; });
  const headerValues = [sortedCols.map(function(c) { return c.name; })];
  sheet.getRange(headerRow, 1, 1, sortedCols.length)
    .setValues(headerValues)
    .setBackground("#1A3A5C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  Logger.log("✅ שורת כותרת עודכנה ל-" + sortedCols.length + " עמודות");

  Logger.log("--- סיום הרחבת יומן_מצב_רפואי לעמודות מנורמלות (הרחבת Task #206, סבב 3) ---");
}
/**
 * task212a_populateOrganCodesTestSheet
 * חד-פעמית — Task #212 (פיילוט אינפוגרפיקה רב-שכבתית, ניסוי_מיפוי_קודים).
 * בונה את הרשימה המלאה — כל אחת מ-15 מערכות הגוף (שורת האב, SYS00-SYS14)
 * ומיד אחריה שורות האיברים/הרקמות שלה (SYS00A, SYS00B...) — לגיליון
 * הניסוי ניסוי_מיפוי_קודים, מתא A31 ומטה (עמודות A=Key, B=Normalized_Val
 * בלבד — Raw_Value ו-Icon_Link נשארים ריקים). מנקה קודם את הטווח A31:B200
 * (כדי לא להשאיר שאריות מריצה קודמת), ואז כותב מחדש. כן משנה את כותרת
 * תא A4 ל-"Organ_Code" ותא E4 ל-"Event_Code". לא נוגעת בשום נתון קיים
 * מעל שורה 31. להריץ פעם אחת מהעורך (▶️ Run).
 */
function task212a_populateOrganCodesTestSheet() {
  const SHEET_NAME  = "ניסוי_מיפוי_קודים";
  const START_ROW   = 31;
  const CLEAR_ROWS  = 170; // טווח ניקוי בטוח מעל 103 השורות בפועל

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { Logger.log("❌ גליון לא נמצא: " + SHEET_NAME); return; }

  // כותרות עמודות
  sheet.getRange("A4").setValue("Organ_Code");
  sheet.getRange("E4").setValue("Event_Code");

  // מקור: 15 מערכות הגוף (שורת אב) + רשימת האיברים/הרקמות שלכל אחת (שורות בת)
  const systemsOrgans = [
    { sys: "SYS00", name: "מערכת כללית", organs: ["גוף שלם", "מדדים כלליים", "חום", "משקל", "חיוניות כללית"] },
    { sys: "SYS01", name: "מערכת השלד", organs: ["עצמות הגולגולת", "עמוד שדרה", "צלעות", "אגן", "גפיים", "מפרקים", "סחוסים", "רצועות"] },
    { sys: "SYS02", name: "מערכת השרירים", organs: ["שרירי שלד", "גידים", "רצועות שריר", "שרירים חלקים"] },
    { sys: "SYS03", name: "מערכת הכסות", organs: ["עור", "רקמת שומן תת-עורית", "שיער", "ציפורניים", "בלוטות זיעה וחלב"] },
    { sys: "SYS04", name: "מערכת העצבים", organs: ["מוח גדול", "מוח קטן", "גזע המוח", "חוט השדרה", "עצבים פריפריים"] },
    { sys: "SYS05", name: "המערכת האנדוקרינית", organs: ["בלוטת יותרת המוח (היפופיזה)", "תריס", "יותרת התריס", "יותרת הכליה (אדרנל)", "לבלב אנדוקריני"] },
    { sys: "SYS06", name: "מערכת הדם וכלי הדם", organs: ["לב", "עורקים", "ורידים", "נימים", "כדוריות דם", "פלזמה"] },
    { sys: "SYS07", name: "מערכת הלימפה", organs: ["קשריות לימפה (צוואר, בית שחי, מפשעה)", "צינורות לימפה", "טחול", "נוזל הלימפה"] },
    { sys: "SYS08", name: "מערכת החיסון", organs: ["מוח עצם", "תימוס", "שקדים", "נוגדנים", "תאי דם לבנים"] },
    { sys: "SYS09", name: "מערכת הנשימה", organs: ["אף", "לוע", "גרון", "קנה הנשימה", "סמפונות", "ריאות", "סרעפת"] },
    { sys: "SYS10", name: "מערכת העיכול", organs: ["פה", "ושט", "קיבה", "תריסריון", "מעי דק", "מעי גס", "תוספתן", "חלחולת (רקטום)", "כבד", "כיס מרה", "לבלב"] },
    { sys: "SYS11", name: "מערכת השתן", organs: ["כליות", "שופכנים", "שלפוחית השתן", "שופכה"] },
    { sys: "SYS12", name: "מערכת הרבייה", organs: ["ערמונית", "אשכים", "צינור הזרע", "פין", "שחלות", "חצוצרות", "רחם", "צוואר הרחם", "נרתיק"] },
    { sys: "SYS13", name: "מערכות החישה", organs: ["עיניים (ראייה)", "אוזניים (שמיעה ושיווי משקל)", "אף (ריח)", "לשון (טעם)", "עור (מישוש)"] },
    { sys: "SYS14", name: "מערכת הגנים", organs: ["DNA", "כרומוזומים", "גנים", "גרעין התא", "מבנים מולקולריים"] }
  ];

  // בניית שורות הפלט: שורת אב (SYSxx) ואז שורות הבת שלה (SYSxxA, SYSxxB...)
  const outputRows = [];
  systemsOrgans.forEach(function(entry) {
    outputRows.push([entry.sys, entry.name]);
    entry.organs.forEach(function(organName, idx) {
      const letter = String.fromCharCode(65 + idx); // A, B, C...
      outputRows.push([entry.sys + letter, organName]);
    });
  });

  // ניקוי טווח קודם (שאריות מריצה קודמת), ואז כתיבה מחדש
  sheet.getRange(START_ROW, 1, CLEAR_ROWS, 2).clearContent();
  sheet.getRange(START_ROW, 1, outputRows.length, 2).setValues(outputRows);

  SpreadsheetApp.flush();
  Logger.log("✅ נכתבו " + outputRows.length + " שורות (15 מערכות אב + האיברים שלהן), מתא A" + START_ROW +
    " עד A" + (START_ROW + outputRows.length - 1) + ", בגיליון " + SHEET_NAME);
  Logger.log("--- סיום task212a_populateOrganCodesTestSheet ---");
}
/**
 * task212b_populateEventCodesTestSheet
 * חד-פעמית — Task #212 (פיילוט אינפוגרפיקה רב-שכבתית, ניסוי_מיפוי_קודים).
 * בונה מחדש את בלוק קוד_אירוע (עמודות E-I) במבנה מלא — 5 שורות "קטגוריה"
 * (A0-A4, כל אחת עם שם הקטגוריה המלא) ומיד אחרי כל אחת כל קודי האירוע
 * שלה (36 קודים סה"כ), בדיוק כמו מבנה האב-ילדים שנבנה למערכות/איברים.
 * כותבת מתא E5 ומטה (Event_Code, Normalized_Val, Description; עמודת
 * Raw_Value משוחזרת בדיוק לפי מה שהיה קיים בשבעת הקודים המקוריים —
 * A00, A0A, A1A, A1B, A1C — והשאר נשארים ריקים). מניחה שהטווח מתחת
 * לכותרת (E5 ומטה) כבר נוקה ידנית לפני ההרצה. גם כותבת את כותרת תא
 * G4 = "Description". להריץ פעם אחת מהעורך (▶️ Run).
 */
function task212b_populateEventCodesTestSheet() {
  const SHEET_NAME = "ניסוי_מיפוי_קודים";
  const START_ROW  = 5;
  const KEY_COL     = 5; // E = Event_Code
  const DESC_COL    = 7; // G = Description

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { Logger.log("❌ גליון לא נמצא: " + SHEET_NAME); return; }

  sheet.getRange(4, DESC_COL).setValue("Description");

  // מקור: 5 קטגוריות, כל אחת עם שם מלא + קודי האירוע שלה
  // כל קוד: [Event_Code, Normalized_Val, Description, Raw_Value]
  const categories = [
    {
      key: "A0", name: "בדיקות דימות (המשך סדרת A0)",
      codes: [
        ["A00", "בדיקה כללית", "בדיקה גופנית / הערכה רפואית שגרתית", "בדיקת כושר עבודה"],
        ["A0A", "בדיקת MRI", "תהודה מגנטית (רקמות רכות, מוח, מפרקים, ערמונית)", "בדיקת MRI של בלוטת הערמונית"],
        ["A0B", "בדיקת CT", "טומוגרפיה ממוחשבת (ראש, חזה, בטן, אגן, אנגיו-CT)", ""],
        ["A0C", "בדיקת אולטרסאונד", "סונר / על-שמע (בטן, דרכי שתן, בלוטת התריס, כלי דם - דופלר)", ""],
        ["A0D", "צילום רנטגן (X-Ray)", "צילומי חזה, עצמות, שלד, שיניים", ""],
        ["A0E", "בדיקת PET-CT", "דימות משולב ברפואה גרעינית (אונקולוגיה, דלקות עמוקות)", ""],
        ["A0F", "מיפוי רדיואיזוטופי", "מיפוי עצמות, מיפוי בלוטת התריס, מיפוי כליות/לב", ""],
        ["A0G", "ממוגרפיה", "דימות ייעודי לרקמת השד", ""],
        ["A0H", "צפיפות עצם (DEXA)", "הערכת אוסטאופורוזיס ומסת עצם", ""]
      ]
    },
    {
      key: "A1", name: "בדיקות דם ומעבדה נוזלית (המשך סדרת A1)",
      codes: [
        ["A1A", "בדיקת דם גנטית", "ריצוף גנומי, סקר גנטי, בדיקות קריוטיפ", "דוח ממצאים גנטיים"],
        ["A1B", "בדיקת דם אנדוקרינית", "פרופיל הורמונלי (תריס, טסטוסטרון, קורטיזול ועוד)", "בדיקת מעבדה"],
        ["A1C", "בדיקת דם ביוכימיה", "תפקודי כבד, תפקודי כליות, אלקטרוליטים, שומנים, גלוקוז", "בדיקת דם"],
        ["A1D", "ספירת דם מלאה (CBC)", "כדוריות אדומות, כדוריות לבנות, טסיות, המוגלובין", ""],
        ["A1E", "בדיקת קרישת דם", "תפקודי קרישה (PT, INR, PTT, פיברינוגן)", ""],
        ["A1F", "בדיקת סמני דלקת", "שקיעת דם (ESR), חלבון מגיב C (CRP)", ""],
        ["A1G", "בדיקת סרולוגיה ואימונולוגיה", "נוגדנים, מחלות אוטואימוניות, סרולוגיה למזהמים", ""],
        ["A1H", "בדיקת סמני גידול (Tumor Markers)", "PSA (ערמונית), CEA, CA-125, AFP", ""],
        ["A1I", "בדיקת שתן כללית ותרבית", "בדיקת סטיק, מיקרוסקופיה, תרבית חיידקים, איסוף שתן", ""],
        ["A1J", "בדיקות צואה ונוזלי גוף", "דם סמוי, בדיקות פרזיטים, נוזל מפרק, נוזל שדרה (CSF)", ""]
      ]
    },
    {
      key: "A2", name: "בדיקות פיזיולוגיות, תפקודיות וחשמליות (סדרת A2 מוצעת)",
      codes: [
        ["A2A", "בדיקת אק\"ג (ECG)", "רישום הפעילות החשמלית של הלב", ""],
        ["A2B", "אקו לב (Echocardiogram)", "הערכת מבנה ותפקוד הלב ושסתומיו במאמץ/מנוחה", ""],
        ["A2C", "הולטר", "ניטור רציף של קצב לב או לחץ דם למשך 24-48 שעות", ""],
        ["A2D", "בדיקת ארגומטריה", "בדיקת מאמץ ללב על גבי מסילה או אופניים", ""],
        ["A2E", "בדיקת תפקודי ריאות (ספירומטריה)", "נפחי ריאה, קצב זרימת אוויר (אסתמה, COPD)", ""],
        ["A2F", "בדיקת EEG", "רישום גלי מוח ופעילות חשמלית מוחית", ""],
        ["A2G", "בדיקת EMG / הולכה עצבית", "הולכה עצבית ופעילות שרירית פריפרית", ""],
        ["A2H", "בדיקת שינה (פוליסומנוגרפיה)", "ניטור שינה, דום נשימה בשינה", ""],
        ["A2I", "בדיקת אורודינמיקה", "הערכת לחצים וזרימה במערכת השתן התחתונה", ""]
      ]
    },
    {
      key: "A3", name: "בדיקות אנדוסקופיות ופולשניות (סדרת A3 מוצעת)",
      codes: [
        ["A3A", "קולונוסקופיה", "הסתכלות ישירה במעי הגס והרקטום", ""],
        ["A3B", "גסטרוסקופיה", "הסתכלות בוושט, בקיבה ובתריסריון", ""],
        ["A3C", "ציסטוסקופיה", "בדיקה אנדוסקופית של שלפוחית השתן והשופכה", ""],
        ["A3D", "ברונכוסקופיה", "הסתכלות בדרכי הנשימה והריאות", ""],
        ["A3E", "צנתור אבחנתי", "הדגמת עורקים כליליים או היקפיים", ""]
      ]
    },
    {
      key: "A4", name: "בדיקות פתולוגיה וציטולוגיה (סדרת A4 מוצעת)",
      codes: [
        ["A4A", "ביופסיה מחטית (FNA / Core)", "דגימת רקמה מאיבר או גוש (ערמונית, שד, בלוטת תריס)", ""],
        ["A4B", "בדיקה היסטופתולוגית", "ניתוח רקמה שהוצאה בניתוח", ""],
        ["A4C", "בדיקה ציטולוגית", "משטחי תאים (כגון בדיקת פאפ, שטיפות שתן)", ""]
      ]
    }
  ];

  // בניית שורות הפלט: שורת קטגוריה (Key+שם מלא), ואז שורות הקודים שלה (Key+שם+תיאור+Raw_Value)
  const outputRows = [];
  categories.forEach(function(cat) {
    outputRows.push([cat.key, cat.name, "", ""]);
    cat.codes.forEach(function(codeRow) {
      outputRows.push(codeRow);
    });
  });

  sheet.getRange(START_ROW, KEY_COL, outputRows.length, 4).setValues(outputRows);

  SpreadsheetApp.flush();
  Logger.log("✅ נכתבו " + outputRows.length + " שורות (5 קטגוריות + 36 קודי אירוע), מתא E" + START_ROW +
    " עד E" + (START_ROW + outputRows.length - 1) + ", בגיליון " + SHEET_NAME);
  Logger.log("--- סיום task212b_populateEventCodesTestSheet ---");
}

/**
 * task212c_addEventCodeColumnsToTestJournal
 * חד-פעמית — Task #212 (פיילוט אינפוגרפיקה רב-שכבתית).
 * בגליון ניסוי_יומן_מצב_רפואי: מוסיפה 2 עמודות חדשות במיקום 11 (K) —
 * Event_Code (K) ו-Event_Description (L); File_ID ו-Source_URL הקיימות
 * זזות אוטומטית ל-M,N. בנוסף: מגדירה/מחליפה Data Validation בעמודה C
 * (Medical_System_Name, מקור: ניסוי_מיפוי_קודים עמודה B, משורה 31 —
 * מערכות+איברים) ובעמודה K (Event_Code, מקור: ניסוי_מיפוי_קודים עמודה F,
 * משורה 5 — קטגוריות+קודי אירוע). שני הטווחים מזוהים דינמית בזמן ריצה
 * (השורה האחרונה עם תוכן בפועל, לא קבועה בקוד). בעמודה L כותבת נוסחת
 * VLOOKUP לכל שורה (5 עד 204) שמביאה את התיאור הרפואי המלא לפי השם שנבחר
 * בעמודה K. בטוחה להרצה חוזרת — אם K4 כבר "Event_Code" עוצרת בלי לשכפל
 * עמודות. להריץ פעם אחת מהעורך (▶️ Run).
 */
function task212c_addEventCodeColumnsToTestJournal() {
  const SHEET_NAME        = "ניסוי_ יומן_מצב_רפואי";
  const CODES_SHEET_NAME  = "ניסוי_מיפוי_קודים";
  const INSERT_BEFORE_COL = 11; // K
  const FIRST_DATA_ROW    = 5;
  const PREP_ROWS         = 200; // טווח הכנה עתידי ל-Data Validation/נוסחה

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const journalSheet = ss.getSheetByName(SHEET_NAME);
  const codesSheet   = ss.getSheetByName(CODES_SHEET_NAME);
  if (!journalSheet) { Logger.log("❌ גליון לא נמצא: " + SHEET_NAME); return; }
  if (!codesSheet)   { Logger.log("❌ גליון לא נמצא: " + CODES_SHEET_NAME); return; }

  // הגנה מפני הרצה כפולה — אם העמודה כבר קיימת, לא משכפלים
  const existingK4 = journalSheet.getRange(4, INSERT_BEFORE_COL).getValue();
  if (existingK4 === "Event_Code") {
    Logger.log("⚠️ העמודה Event_Code כבר קיימת בעמודה K — לא בוצע שינוי כדי למנוע שכפול.");
    return;
  }

  // שלב 1: הוספת 2 עמודות חדשות במיקום 11 (K) — File_ID/Source_URL זזות אוטומטית ל-M,N
  journalSheet.insertColumnsBefore(INSERT_BEFORE_COL, 2);
  journalSheet.getRange(4, INSERT_BEFORE_COL).setValue("Event_Code");
  journalSheet.getRange(4, INSERT_BEFORE_COL + 1).setValue("Event_Description");

  // שלב 2: איתור דינמי של טווח קודי איברים (ניסוי_מיפוי_קודים, עמודה A, משורה 31)
  const ORGAN_START_ROW = 31;
  const organCol = codesSheet.getRange(ORGAN_START_ROW, 1, 500, 1).getValues();
  let organLastRow = ORGAN_START_ROW - 1;
  for (let i = 0; i < organCol.length; i++) {
    if (String(organCol[i][0] || "").trim() !== "") organLastRow = ORGAN_START_ROW + i;
  }
  const organNameRange = codesSheet.getRange(ORGAN_START_ROW, 2, organLastRow - ORGAN_START_ROW + 1, 1);

  // שלב 3: איתור דינמי של טווח קודי אירוע (ניסוי_מיפוי_קודים, עמודה E, משורה 5)
  const EVENT_START_ROW = 5;
  const eventCol = codesSheet.getRange(EVENT_START_ROW, 5, 500, 1).getValues();
  let eventLastRow = EVENT_START_ROW - 1;
  for (let i = 0; i < eventCol.length; i++) {
    if (String(eventCol[i][0] || "").trim() !== "") eventLastRow = EVENT_START_ROW + i;
  }
  const eventNameRange = codesSheet.getRange(EVENT_START_ROW, 6, eventLastRow - EVENT_START_ROW + 1, 1);

  // שלב 4: Data Validation בעמודה C (קוד איבר, מציג שם)
  const organRule = SpreadsheetApp.newDataValidation().requireValueInRange(organNameRange, true).setAllowInvalid(false).build();
  journalSheet.getRange(FIRST_DATA_ROW, 3, PREP_ROWS, 1).setDataValidation(organRule);

  // שלב 5: Data Validation בעמודה K (קוד אירוע, מציג שם)
  const eventRule = SpreadsheetApp.newDataValidation().requireValueInRange(eventNameRange, true).setAllowInvalid(false).build();
  journalSheet.getRange(FIRST_DATA_ROW, INSERT_BEFORE_COL, PREP_ROWS, 1).setDataValidation(eventRule);

  // שלב 6: נוסחת VLOOKUP בעמודה L — תיאור אוטומטי לפי הקוד שנבחר בעמודה K
  const formulas = [];
  for (let r = 0; r < PREP_ROWS; r++) {
    const rowNum = FIRST_DATA_ROW + r;
    formulas.push(["=IFERROR(VLOOKUP(K" + rowNum + ",'" + CODES_SHEET_NAME + "'!F:G,2,FALSE),\"\")"]);
  }
  journalSheet.getRange(FIRST_DATA_ROW, INSERT_BEFORE_COL + 1, PREP_ROWS, 1).setFormulas(formulas);

  SpreadsheetApp.flush();
  Logger.log("✅ הושלם: 2 עמודות חדשות (K=Event_Code, L=Event_Description) נוספו ב-" + SHEET_NAME + ".");
  Logger.log("✅ Data Validation עמודה C ← " + CODES_SHEET_NAME + "!B" + ORGAN_START_ROW + ":B" + organLastRow + " (" + (organLastRow - ORGAN_START_ROW + 1) + " ערכים).");
  Logger.log("✅ Data Validation עמודה K ← " + CODES_SHEET_NAME + "!F" + EVENT_START_ROW + ":F" + eventLastRow + " (" + (eventLastRow - EVENT_START_ROW + 1) + " ערכים).");
  Logger.log("✅ נוסחת VLOOKUP נכתבה בעמודה L, שורות " + FIRST_DATA_ROW + "-" + (FIRST_DATA_ROW + PREP_ROWS - 1) + ".");
  Logger.log("--- סיום task212c_addEventCodeColumnsToTestJournal ---");
}
function TEMP_listInfographicIcons() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניסוי_ יומן_מצב_רפואי");
  var images = sheet.getImages();
  var lines = [];
  images.forEach(function(img) {
    var cell = img.getAnchorCell();
    lines.push("עמודה " + cell.getColumn() + " שורה " + cell.getRow() + " | script: " + (img.getScript() || "(אין)"));
  });
  Logger.log(lines.join("\n"));
  SpreadsheetApp.getUi().alert("אייקונים בגליון:\n\n" + lines.join("\n"));
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213a_restructureTestJournalColumns —
// שינוי מבני חד-פעמי לגליון ניסוי_ יומן_מצב_רפואי בלבד: מרחיב מ-14 ל-21
// עמודות (7 חדשות: Specialty/Severity/Diagnosis Code+Name, Diagnosis_
// Certainty), מסדר מחדש את 14 העמודות הקיימות (תוכן קשיח בחזית, פענוחים
// אחריו, קודים גולמיים בסוף, Source_URL בעמודה נפרדת), צובע את כותרות
// שורה 4 לפי 4 קבוצות, ומנתק את 4 אייקוני הפעולה מהתוכן — מזיז אותם
// (setAnchorCell, בלי מחיקה/יצירה מחדש) לעמודות 1-4 כשורת פעולה עצמאית.
// קורא את כל הנתונים הקיימים (כותרות + שורות) למערך לפני כל שינוי וממפה
// אותם לפי שם שדה — לא לפי מיקום קבוע — כך ששום ערך לא הולך לאיבוד.
// [v2] תוקן: img.getBlob() לא קיימת ב-API — מזיזים את אובייקטי התמונה
// הקיימים עצמם (setAnchorCell), בלי לגעת ב-blob/script שלהם.
// [v3] תוקן: כללי Data Validation ישנים (task212c, על העמודות שהיו C/K)
// נשארו צמודים לתא הפיזי וחסמו כתיבת ערכים חדשים (שגיאה בתא C5) — מנקים
// clearDataValidations() בכל טווח שנמחק, לפני כתיבת המבנה החדש.
// אין נגיעה בגליון הייצור (יומן_מצב_רפואי) או בגליון מיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function task213a_restructureTestJournalColumns() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "ניסוי_ יומן_מצב_רפואי";
    const sheet     = ss.getSheetByName(sheetName);
    const ui        = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const HEADER_ROW     = 4;
    const LABEL_ROW      = 3;
    const ICON_ROW       = 2;
    const FIRST_DATA_ROW = 5;
    const OLD_LAST_COL   = 14;

    // ── שלב 1: קריאת המצב הקיים לזיכרון (לפני כל שינוי) ──

    const oldHeaders = sheet.getRange(HEADER_ROW, 1, 1, OLD_LAST_COL).getValues()[0];

    const lastRow     = sheet.getLastRow();
    const numDataRows = Math.max(0, lastRow - FIRST_DATA_ROW + 1);
    const oldData = numDataRows > 0
      ? sheet.getRange(FIRST_DATA_ROW, 1, numDataRows, OLD_LAST_COL).getValues()
      : [];

    const oldColIndexByName = {};
    oldHeaders.forEach(function(name, idx) { oldColIndexByName[name] = idx; });

    // איקונים קיימים — לא נמחקים, רק יוזזו בהמשך (setAnchorCell). שומרים
    // כרגע רק את אובייקט התמונה + תווית/רקע שורה 3, ממוינים לפי העמודה
    // הנוכחית שלהם (שמאל→ימין) כדי לשמר את הסדר היחסי.
    const existingImages = sheet.getImages();
    const iconRecords = existingImages.map(function(img) {
      const col = img.getAnchorCell().getColumn();
      return {
        img:   img,
        label: sheet.getRange(LABEL_ROW, col).getValue(),
        bg:    sheet.getRange(LABEL_ROW, col).getBackground()
      };
    }).sort(function(a, b) {
      return a.img.getAnchorCell().getColumn() - b.img.getAnchorCell().getColumn();
    });

    if (iconRecords.length !== 4) {
      ui.alert("⚠️ נמצאו " + iconRecords.length + " אייקונים בגליון (צפוי 4). עוצר בלי לשנות כלום — בדוק ידנית.");
      return;
    }

    // ── שלב 2: הגדרת הסדר החדש (21 שדות) וקבוצות הצבע ──

    const NEW_FIELDS = [
      "Event_Date", "Event_Type", "Primary_Diagnosis", "Severity_Status",
      "Recommendations", "Doc_Issuer", "Record_Status", "S_Row",
      "Medical_System_Name", "Event_Description",
      "Specialty_Name", "Severity_Name", "Diagnosis_Name", "Diagnosis_Certainty",
      "Source_URL",
      "Medical_System", "Event_Code", "File_ID",
      "Specialty_Code", "Severity_Code", "Diagnosis_Code"
    ];
    const NEW_LAST_COL = NEW_FIELDS.length; // 21

    const GROUP_COLORS = {
      hard:   "#1565C0", // מידע קשיח קיים
      tech:   "#757575", // תוספות טכניות
      decode: "#2E7D32", // פענוחי קודים
      code:   "#EF6C00"  // קודים עצמם
    };
    const FIELD_GROUP = {
      Event_Date: "hard", Event_Type: "hard", Primary_Diagnosis: "hard",
      Severity_Status: "hard", Recommendations: "hard", Medical_System_Name: "hard",
      Doc_Issuer: "tech", Record_Status: "tech", S_Row: "tech", Source_URL: "tech",
      Event_Description: "decode", Specialty_Name: "decode", Severity_Name: "decode",
      Diagnosis_Name: "decode", Diagnosis_Certainty: "decode",
      Medical_System: "code", Event_Code: "code", File_ID: "code",
      Specialty_Code: "code", Severity_Code: "code", Diagnosis_Code: "code"
    };

    // ── שלב 3: מיפוי הנתונים הישנים למיקומים החדשים (לפי שם שדה) ──

    const newData = oldData.map(function(oldRow) {
      return NEW_FIELDS.map(function(fieldName) {
        const oldIdx = oldColIndexByName[fieldName];
        return (oldIdx !== undefined) ? oldRow[oldIdx] : "";
      });
    });

    // ── שלב 4: ניקוי הטווח הישן וכתיבת המבנה החדש ──
    // (לא נוגע בשורה 2 — שם יושבות התמונות, ואין בה ערכי תא ממילא)

    const CLEAR_COLS = 30;
    sheet.getRange(LABEL_ROW, 1, 1, CLEAR_COLS).clearContent().clearDataValidations().setBackground(null);
    sheet.getRange(HEADER_ROW, 1, 1, CLEAR_COLS).clearContent().clearDataValidations().setBackground(null).setFontColor(null);
    if (lastRow >= FIRST_DATA_ROW) {
      sheet.getRange(FIRST_DATA_ROW, 1, lastRow - FIRST_DATA_ROW + 1, CLEAR_COLS).clearContent().clearDataValidations();
    }

    sheet.getRange(HEADER_ROW, 1, 1, NEW_LAST_COL).setValues([NEW_FIELDS]);
    NEW_FIELDS.forEach(function(fieldName, idx) {
      const group = FIELD_GROUP[fieldName];
      const cell  = sheet.getRange(HEADER_ROW, idx + 1);
      cell.setBackground(GROUP_COLORS[group]);
      cell.setFontColor("#ffffff");
      cell.setFontWeight("bold");
    });

    if (newData.length > 0) {
      sheet.getRange(FIRST_DATA_ROW, 1, newData.length, NEW_LAST_COL).setValues(newData);
    }

    // ── שלב 5: הזזת 4 האייקונים הקיימים לעמודות 1-4 (מנותק מתוכן) ──

    iconRecords.forEach(function(rec, idx) {
      const col      = idx + 1; // 1,2,3,4
      const img      = rec.img;
      const colWidth = sheet.getColumnWidth(col);
      const iconSize = img.getWidth();
      const offsetX  = Math.max(0, Math.floor((colWidth - iconSize) / 2));

      img.setAnchorCell(sheet.getRange(ICON_ROW, col));
      img.setAnchorCellXOffset(offsetX);
      img.setAnchorCellYOffset(2);

      const labelCell = sheet.getRange(LABEL_ROW, col);
      labelCell.setValue(rec.label);
      labelCell.setBackground(rec.bg);
      labelCell.setFontColor("#ffffff");
      labelCell.setFontWeight("bold");
      labelCell.setFontSize(9);
      labelCell.setHorizontalAlignment("center");
      labelCell.setVerticalAlignment("middle");
    });

    SpreadsheetApp.flush();

    ui.alert(
      "✅ שינוי המבנה הושלם.\n\n" +
      "21 עמודות בסדר החדש, " + newData.length + " שורות נתונים נשמרו.\n" +
      "4 אייקונים הוזזו לעמודות 1-4 (מנותקים מהתוכן)."
    );

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213a_restructureTestJournalColumns: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213b_restoreDataAndFreezeColumns —
// תיקון נזק מריצה קודמת (task213a v2) שנכשלה על Data Validation אחרי
// שכבר מחקה את תוכן שורות הנתונים: משחזרת את 2 שורות הנתונים המקוריות
// (מגיבוי מדויק שנשמר לפני כל שינוי מבני) לתוך המבנה החדש בן 21 העמודות,
// ומקבעת (setFrozenColumns) את 4 העמודות הראשונות — שהושמט בטעות מ-
// task213a. בודקת קודם שכותרות שורה 4 תואמות בדיוק למצופה; אם לא — עוצרת
// בלי לגעת בכלום. אין נגיעה בגליון הייצור או במיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function task213b_restoreDataAndFreezeColumns() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "ניסוי_ יומן_מצב_רפואי";
    const sheet     = ss.getSheetByName(sheetName);
    const ui        = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const HEADER_ROW     = 4;
    const FIRST_DATA_ROW = 5;

    const EXPECTED_HEADERS = [
      "Event_Date", "Event_Type", "Primary_Diagnosis", "Severity_Status",
      "Recommendations", "Doc_Issuer", "Record_Status", "S_Row",
      "Medical_System_Name", "Event_Description",
      "Specialty_Name", "Severity_Name", "Diagnosis_Name", "Diagnosis_Certainty",
      "Source_URL",
      "Medical_System", "Event_Code", "File_ID",
      "Specialty_Code", "Severity_Code", "Diagnosis_Code"
    ];

    // הגנה: לא ממשיכים אם הכותרות בפועל לא תואמות בדיוק למצופה
    const actualHeaders = sheet.getRange(HEADER_ROW, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
    const headersMatch = EXPECTED_HEADERS.every(function(h, i) { return actualHeaders[i] === h; });
    if (!headersMatch) {
      ui.alert("⚠️ כותרות שורה 4 לא תואמות למצופה. עוצר בלי לגעת בנתונים.\n\nבפועל: " + actualHeaders.join(" | "));
      return;
    }

    // שחזור מדויק מגיבוי — כפי שהיה בגיליון לפני כל שינוי מבני
    const RESTORE_ROWS = [
      { // S_Row 6 — בדיקת כושר עבודה
        Event_Date: new Date(2026, 2, 2),
        Event_Type: "בדיקת כושר עבודה",
        Primary_Diagnosis: "כשיר לעבודתו הרגילה",
        Severity_Status: "קל",
        Recommendations: "מתכונת של 80% (עד ארבעה ימים בשבוע)",
        Doc_Issuer: "ד\"ר אמיר חגי וולף, מרפאה תעסוקתית ב\"ש",
        Record_Status: "חדש",
        S_Row: 6,
        Medical_System_Name: "מערכת כללית",
        Event_Description: "בדיקה גופנית / הערכה רפואית שגרתית",
        Source_URL: "https://drive.google.com/file/d/1edqk-8VWJCZ3C4jynlOHTVomzVSoYNjE/view",
        Medical_System: "SYS00",
        Event_Code: "בדיקה כללית",
        File_ID: "1edqk-8VWJCZ3C4jynlOHTVomzVSoYNjE"
      },
      { // S_Row 68 — בדיקת MRI של בלוטת הערמונית
        Event_Date: new Date(2026, 6, 31),
        Event_Type: "בדיקת MRI של בלוטת הערמונית",
        Primary_Diagnosis: "מוקד של אות ירוד ב-ADC בקוטר 5 מ\"מ, PIRADS 4 בשל האדרה החזקה",
        Severity_Status: "PIRADS 4",
        Recommendations: "",
        Doc_Issuer: "אסותא, ד\"ר בלקום יונתן",
        Record_Status: "חדש",
        S_Row: 68,
        Medical_System_Name: "מערכת הרבייה",
        Event_Description: "תהודה מגנטית (רקמות רכות, מוח, מפרקים, ערמונית)",
        Source_URL: "https://drive.google.com/file/d/1IYah6ua9iZoTJ1WKIKbMczJAszbSL_1S/view",
        Medical_System: "SYS11",
        Event_Code: "בדיקת MRI",
        File_ID: "1IYah6ua9iZoTJ1WKIKbMczJAszbSL_1S"
      }
    ];

    const rowsToWrite = RESTORE_ROWS.map(function(rec) {
      return EXPECTED_HEADERS.map(function(fieldName) {
        return (fieldName in rec) ? rec[fieldName] : "";
      });
    });

    const writeRange = sheet.getRange(FIRST_DATA_ROW, 1, rowsToWrite.length, EXPECTED_HEADERS.length);
    writeRange.clearDataValidations(); // מנקה שרידי ולידציה ישנה מהעמודות הישנות
    writeRange.setValues(rowsToWrite);

    // קיבוע 4 העמודות הראשונות — הושמט בטעות מ-task213a
    sheet.setFrozenColumns(4);

    SpreadsheetApp.flush();

    ui.alert(
      "✅ שוחזרו 2 שורות הנתונים המקוריות לתוך המבנה החדש (21 עמודות),\n" +
      "ו-4 העמודות הראשונות קובעו."
    );

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213b_restoreDataAndFreezeColumns: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213c_reorderClassificationColumnsAndFreeze —
// שינוי נקודתי לגליון ניסוי_ יומן_מצב_רפואי בלבד: מסדר מחדש רק את 13
// העמודות I-U (מיקום 9-21) — משבץ Specialty_Name לפני Medical_System_Name,
// מזיז את Event_Code לצמוד אחרי Medical_System_Name ומסווג אותו מחדש
// כ"פענוח" (ירוק) כי בפועל מכיל טקסט קריא ולא קוד גולמי, ומזיז את File_ID
// לצמוד ל-Source_URL ומסווג אותו מחדש כ"טכני" (אפור) — קישור וקוד זיהוי
// יחד. עמודות A-H (8 הראשונות) ו-S-U אינן זזות. מרחיב את הקיבוע מ-4 ל-5
// עמודות (A-E). קורא את הכותרות והנתונים למערך לפני כל שינוי וממפה לפי שם
// שדה — לא לפי מיקום קבוע. בודקת קודם שהכותרות בעמודות I-U תואמות בדיוק
// למצב הידוע; אם לא — עוצרת בלי לגעת בכלום. אין נגיעה בגליון הייצור או
// במיפוי_קודים, ואין נגיעה באייקונים (נשארים על A-D כפי שהם).
// ══════════════════════════════════════════════════════════════════

function task213c_reorderClassificationColumnsAndFreeze() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "ניסוי_ יומן_מצב_רפואי";
    const sheet     = ss.getSheetByName(sheetName);
    const ui        = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const HEADER_ROW     = 4;
    const FIRST_DATA_ROW = 5;
    const BLOCK_START_COL = 9;  // עמודה I
    const BLOCK_NUM_COLS  = 13; // I עד U

    // ── שלב 1: אימות שהכותרות בעמודות I-U תואמות בדיוק למצב הידוע ──

    const OLD_FIELDS = [
      "Medical_System_Name", "Event_Description", "Specialty_Name",
      "Severity_Name", "Diagnosis_Name", "Diagnosis_Certainty",
      "Source_URL", "Medical_System", "Event_Code", "File_ID",
      "Specialty_Code", "Severity_Code", "Diagnosis_Code"
    ];

    const actualHeaders = sheet.getRange(HEADER_ROW, BLOCK_START_COL, 1, BLOCK_NUM_COLS).getValues()[0];
    const headersMatch = OLD_FIELDS.every(function(h, i) { return actualHeaders[i] === h; });
    if (!headersMatch) {
      ui.alert("⚠️ כותרות עמודות I-U לא תואמות למצופה. עוצר בלי לגעת בנתונים.\n\nבפועל: " + actualHeaders.join(" | "));
      return;
    }

    // ── שלב 2: קריאת הנתונים הקיימים בבלוק I-U לזיכרון ──

    const lastRow     = sheet.getLastRow();
    const numDataRows = Math.max(0, lastRow - FIRST_DATA_ROW + 1);
    const oldData = numDataRows > 0
      ? sheet.getRange(FIRST_DATA_ROW, BLOCK_START_COL, numDataRows, BLOCK_NUM_COLS).getValues()
      : [];

    const oldIndexByName = {};
    OLD_FIELDS.forEach(function(name, idx) { oldIndexByName[name] = idx; });

    // ── שלב 3: הגדרת הסדר החדש וקבוצות הצבע המעודכנות ──

    const NEW_FIELDS = [
      "Specialty_Name", "Medical_System_Name", "Event_Code", "Event_Description",
      "Severity_Name", "Diagnosis_Name", "Diagnosis_Certainty",
      "Source_URL", "File_ID", "Medical_System",
      "Specialty_Code", "Severity_Code", "Diagnosis_Code"
    ];

    const GROUP_COLORS = {
      hard:   "#1565C0", // מידע קשיח קיים
      tech:   "#757575", // תוספות טכניות
      decode: "#2E7D32", // פענוחי קודים
      code:   "#EF6C00"  // קודים עצמם
    };
    const FIELD_GROUP = {
      Medical_System_Name: "hard",
      Event_Description:   "decode",
      Specialty_Name:       "decode",
      Severity_Name:        "decode",
      Diagnosis_Name:       "decode",
      Diagnosis_Certainty:  "decode",
      Source_URL:           "tech",
      Medical_System:       "code",
      Event_Code:           "decode", // [שינוי סיווג] מכיל טקסט קריא, לא קוד גולמי
      File_ID:              "tech",   // [שינוי סיווג] צמוד ללינק — יחידת "קישור + זיהוי"
      Specialty_Code:       "code",
      Severity_Code:        "code",
      Diagnosis_Code:       "code"
    };

    // ── שלב 4: מיפוי הנתונים הישנים למיקומים החדשים (לפי שם שדה) ──

    const newData = oldData.map(function(oldRow) {
      return NEW_FIELDS.map(function(fieldName) {
        const oldIdx = oldIndexByName[fieldName];
        return (oldIdx !== undefined) ? oldRow[oldIdx] : "";
      });
    });

    // ── שלב 5: ניקוי בלוק I-U וכתיבת הסדר החדש ──

    const headerBlock = sheet.getRange(HEADER_ROW, BLOCK_START_COL, 1, BLOCK_NUM_COLS);
    headerBlock.clearContent().clearDataValidations().setBackground(null).setFontColor(null);

    if (lastRow >= FIRST_DATA_ROW) {
      sheet.getRange(FIRST_DATA_ROW, BLOCK_START_COL, lastRow - FIRST_DATA_ROW + 1, BLOCK_NUM_COLS)
        .clearContent().clearDataValidations();
    }

    sheet.getRange(HEADER_ROW, BLOCK_START_COL, 1, NEW_FIELDS.length).setValues([NEW_FIELDS]);
    NEW_FIELDS.forEach(function(fieldName, idx) {
      const group = FIELD_GROUP[fieldName];
      const cell  = sheet.getRange(HEADER_ROW, BLOCK_START_COL + idx);
      cell.setBackground(GROUP_COLORS[group]);
      cell.setFontColor("#ffffff");
      cell.setFontWeight("bold");
    });

    if (newData.length > 0) {
      sheet.getRange(FIRST_DATA_ROW, BLOCK_START_COL, newData.length, NEW_FIELDS.length).setValues(newData);
    }

    // ── שלב 6: הרחבת הקיבוע מ-4 ל-5 עמודות (A-E) ──

    sheet.setFrozenColumns(5);

    SpreadsheetApp.flush();

    ui.alert(
      "✅ סדר עמודות I-U עודכן (" + newData.length + " שורות נתונים נשמרו),\n" +
      "Event_Code ו-File_ID סווגו מחדש בצבע, ו-5 העמודות הראשונות קובעו."
    );

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213c_reorderClassificationColumnsAndFreeze: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213d_recolorMedicalSystemNameAsDecode —
// שינוי סיווג צבע נקודתי בגליון ניסוי_ יומן_מצב_רפואי בלבד: עמודת
// Medical_System_Name הייתה מסווגת "קשיח" (כחול); לפי אישור עמוס היא
// מסווגת מעכשיו גם היא כ"פענוח" (ירוק), כמו Specialty_Name ו-Event_Code.
// מאתרת את העמודה לפי שם הכותרת בפועל (לא לפי מיקום קבוע) כדי לא להסתמך
// על אינדקס עמודה שעלול היה להשתנות. אין נגיעה בעמודות אחרות, בנתונים,
// בקיבוע או בגליון הייצור/מיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function task213d_recolorMedicalSystemNameAsDecode() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "ניסוי_ יומן_מצב_רפואי";
    const sheet     = ss.getSheetByName(sheetName);
    const ui        = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const HEADER_ROW = 4;
    const TARGET_FIELD = "Medical_System_Name";
    const DECODE_COLOR = "#2E7D32";

    const lastCol  = sheet.getLastColumn();
    const headers  = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
    const matches  = [];
    headers.forEach(function(name, idx) {
      if (name === TARGET_FIELD) matches.push(idx + 1);
    });

    if (matches.length !== 1) {
      ui.alert("⚠️ נמצאו " + matches.length + " עמודות בשם '" + TARGET_FIELD + "' (צפוי 1). עוצר בלי לגעת בכלום.");
      return;
    }

    const col  = matches[0];
    const cell = sheet.getRange(HEADER_ROW, col);
    cell.setBackground(DECODE_COLOR);
    cell.setFontColor("#ffffff");
    cell.setFontWeight("bold");

    SpreadsheetApp.flush();

    ui.alert("✅ עמודת " + TARGET_FIELD + " (עמודה " + col + ") סווגה מחדש לצבע פענוח (ירוק).");

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213d_recolorMedicalSystemNameAsDecode: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213e_populateClassificationCodesTestSheet —
// מוסיפה לגליון ניסוי_מיפוי_קודים 4 בלוקי מיפוי חדשים בעמודות J עד AC,
// באותו דפוס בדיוק כמו בלוק קוד_אירוע הקיים (Code, Normalized_Value,
// Description, Raw_Value, Icon_Link): Specialty (מקצוע רפואי), Severity
// (חומרה), Diagnosis (קבוצת אבחנה — לא אבחנה בודדת, יש אלפי אפשרויות),
// Diagnosis_Certainty (וודאות אבחנה). Raw_Value מכיל רשימת ניסוחים גולמיים
// מופרדת בפסיקים לכל קוד — לשימוש כדוגמאות למידה לסיווג אוטומטי. Icon_Link
// נשאר ריק בשלב זה (יתמלא ידנית בהמשך). בודקת קודם שעמודות J-AC בשורות 3-4
// ריקות; אם לא — עוצרת בלי לגעת בכלום. אין נגיעה בבלוקי הארגון/האירוע
// הקיימים (A-I) ואין נגיעה בגליון הייצור.
// ══════════════════════════════════════════════════════════════════

function task213e_populateClassificationCodesTestSheet() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "ניסוי_מיפוי_קודים";
    const sheet     = ss.getSheetByName(sheetName);
    const ui        = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const LABEL_ROW       = 3;
    const HEADER_ROW      = 4;
    const FIRST_DATA_ROW  = 5;
    const CHECK_START_COL = 10; // J
    const CHECK_NUM_COLS  = 20; // J עד AC

    // הגנה: לא ממשיכים אם כבר יש תוכן בעמודות J-AC (שורות 3-4)
    const existing   = sheet.getRange(LABEL_ROW, CHECK_START_COL, 2, CHECK_NUM_COLS).getValues();
    const hasContent = existing.some(function(row) {
      return row.some(function(v) { return v !== "" && v !== null; });
    });
    if (hasContent) {
      ui.alert("⚠️ נמצא תוכן קיים בעמודות J-AC (שורות 3-4). עוצר בלי לגעת בכלום — בדוק ידנית.");
      return;
    }

    const COL_HEADERS = ["Normalized_Value", "Description", "Raw_Value", "Icon_Link"];

    const BLOCKS = [
      {
        startCol: 10, label: "מקצוע_רפואי", codeHeader: "Specialty_Code",
        rows: [
          ["SPEC00", "כללית/משפחה",       "רפואה כללית ובדיקות שגרתיות",                    "רופא משפחה, מרפאה כללית, בדיקה שגרתית"],
          ["SPEC01", "פנימית",             "אבחון וטיפול במחלות פנימיות כלליות",             "רופא פנימי, מחלקה פנימית"],
          ["SPEC02", "קרדיולוגיה",         "מחלות לב וכלי דם",                               "קרדיולוג, מכון לב, בדיקת לב"],
          ["SPEC03", "נוירולוגיה",         "מחלות מערכת העצבים",                             "נוירולוג, מכון נוירולוגי"],
          ["SPEC04", "אורתופדיה",          "מערכת השלד והשרירים",                            "אורתופד, מכון אורתופדי, פציעת ספורט"],
          ["SPEC05", "אורולוגיה",          "דרכי השתן ומערכת הרבייה הגברית",                 "אורולוג, דרכי שתן, בלוטת הערמונית"],
          ["SPEC06", "גינקולוגיה",         "בריאות האישה ומערכת הרבייה הנשית",               "גינקולוג, נשים ויולדות"],
          ["SPEC07", "עיניים",             "ראייה ומחלות עיניים",                            "רופא עיניים, אופטומטריסט"],
          ["SPEC08", "אף אוזן גרון",       "מחלות אא\"ג",                                     "רופא אא\"ג"],
          ["SPEC09", "עור",                "מחלות עור",                                       "דרמטולוג, רופא עור"],
          ["SPEC10", "פסיכיאטריה",         "בריאות הנפש",                                     "פסיכיאטר, בריאות הנפש"],
          ["SPEC11", "כירורגיה כללית",     "ניתוחים כלליים",                                  "מנתח, כירורג, ניתוח"],
          ["SPEC12", "אונקולוגיה",         "אבחון וטיפול בגידולים סרטניים",                   "אונקולוג, מכון אונקולוגי, כימותרפיה"],
          ["SPEC13", "ראומטולוגיה",        "מחלות פרקים ומחלות דלקתיות אוטואימוניות",          "ראומטולוג"],
          ["SPEC14", "אנדוקרינולוגיה",     "בלוטות ומחלות מטבוליות",                          "אנדוקרינולוג, סוכרת, בלוטת התריס"],
          ["SPEC15", "גסטרואנטרולוגיה",    "מערכת העיכול",                                    "גסטרואנטרולוג, מערכת עיכול"],
          ["SPEC16", "ריאות",              "מחלות נשימה וריאות",                              "רופא ריאות, פולמונולוג"],
          ["SPEC17", "רפואה תעסוקתית",     "התאמת כושר עבודה ובריאות תעסוקתית",               "מרפאה תעסוקתית, כושר עבודה"],
          ["SPEC18", "רדיולוגיה/דימות",    "בדיקות דימות ופענוח",                             "מכון דימות, מכון רדיולוגי"]
        ]
      },
      {
        startCol: 15, label: "חומרה", codeHeader: "Severity_Code",
        rows: [
          ["SEV0", "קל",      "ממצא קל שאינו דורש התערבות דחופה", "קל, מינורי, PIRADS 1, PIRADS 2, שלב 1, Grade 1"],
          ["SEV1", "בינוני",  "ממצא בדרגת ביניים הדורש מעקב",     "בינוני, מתון, PIRADS 3, שלב 2, Grade 2"],
          ["SEV2", "חמור",    "ממצא משמעותי הדורש טיפול",         "חמור, קשה, PIRADS 4, PIRADS 5, שלב 3, שלב 4, Grade 3, Grade 4"],
          ["SEV3", "קריטי",   "מצב דחוף המצריך התערבות מיידית",   "קריטי, דחוף, מצב חירום, Grade 5"],
          ["SEV4", "לא צוין", "רמת חומרה לא דווחה במסמך",         "לא צוין, לא ידוע"]
        ]
      },
      {
        startCol: 20, label: "אבחנה", codeHeader: "Diagnosis_Code",
        rows: [
          ["DX00", "זיהומיות",             "מחלות זיהומיות",                          "זיהום, דלקת חיידקית, וירוס"],
          ["DX01", "אונקולוגי/גידולים",    "גידולים שפירים וממאירים",                 "גידול, סרטן, ממאירות, שאת"],
          ["DX02", "קרדיווסקולרי",         "מחלות לב וכלי דם",                        "מחלת לב, אוטם, יתר לחץ דם"],
          ["DX03", "נוירולוגי",            "מחלות מערכת העצבים",                      "שבץ, אפילפסיה"],
          ["DX04", "שרירי-שלד",            "פציעות ומחלות שלד ושרירים",               "שבר, קרע ברצועה, דלקת מפרקים"],
          ["DX05", "עיכול",                "מחלות מערכת העיכול",                      "כיב קיבה, מחלת מעי"],
          ["DX06", "שתן/כליות",            "מחלות דרכי שתן וכליות",                   "אבן בכליה, זיהום בדרכי השתן"],
          ["DX07", "רבייה",                "מחלות מערכת הרבייה",                      "PIRADS, ציסטה בשחלה"],
          ["DX08", "נשימתי",               "מחלות נשימה וריאות",                      "אסתמה, דלקת ריאות"],
          ["DX09", "אנדוקריני/מטבולי",     "מחלות בלוטות וחילוף חומרים",              "סוכרת, תפקוד תריס לקוי"],
          ["DX10", "פסיכיאטרי",            "מחלות נפש",                                "דיכאון, חרדה"],
          ["DX11", "עור",                  "מחלות עור",                                "פריחה, פסוריאזיס"],
          ["DX12", "טראומה/פציעה",         "פציעות מתאונה או טראומה",                 "פגיעה, תאונה, שבר"],
          ["DX13", "לא סווג",              "לא ניתן לסווג לקבוצה קיימת",              "לא סווג"]
        ]
      },
      {
        startCol: 25, label: "וודאות_אבחנה", codeHeader: "Certainty_Code",
        rows: [
          ["CRT0", "חשד",     "ממצא ראשוני שטרם אושר",              "חשד, ייתכן, סביר"],
          ["CRT1", "בבדיקה",  "בתהליך בירור/המתנה לתוצאות",          "בבירור, בבדיקה, ממתין לתוצאות"],
          ["CRT2", "סופי",    "אבחנה מאושרת וסופית",                 "אושר, מאובחן, סופי, מוגדר"],
          ["CRT3", "נשלל",    "האבחנה נשללה",                        "נשלל, לא נמצא"]
        ]
      }
    ];

    BLOCKS.forEach(function(block) {
      sheet.getRange(LABEL_ROW, block.startCol).setValue(block.label);
      sheet.getRange(HEADER_ROW, block.startCol, 1, 5).setValues([[block.codeHeader].concat(COL_HEADERS)]);

      const dataRows = block.rows.map(function(r) {
        return [r[0], r[1], r[2], r[3], ""]; // Icon_Link ריק בשלב זה
      });
      sheet.getRange(FIRST_DATA_ROW, block.startCol, dataRows.length, 5).setValues(dataRows);
    });

    SpreadsheetApp.flush();

    ui.alert("✅ נוספו 4 בלוקי מיפוי חדשים (Specialty, Severity, Diagnosis, Diagnosis_Certainty) בעמודות J-AC.");

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213e_populateClassificationCodesTestSheet: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213f_colorClassificationHeaders —
// תיקון עיצוב: כותרות העמודות (שורה 4) של 4 בלוקי המיפוי החדשים
// (Specialty, Severity, Diagnosis, Diagnosis_Certainty — עמודות J עד AC)
// נכתבו ב-task213e בלי צביעה. מיישרת אותן לעיצוב הקיים של בלוקי
// Organ_Code/Event_Code באותו גליון: רקע #1A3A5C, טקסט לבן מודגש. אין
// נגיעה בשורה 3 (כותרות-העל) — אלה אינן צבועות גם בבלוקים הקיימים. אין
// נגיעה בנתונים, בבלוקים הקיימים (A-I) או בגליון הייצור.
// ══════════════════════════════════════════════════════════════════

function task213f_colorClassificationHeaders() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "ניסוי_מיפוי_קודים";
    const sheet     = ss.getSheetByName(sheetName);
    const ui        = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const HEADER_ROW    = 4;
    const HEADER_COLOR  = "#1A3A5C";
    const BLOCK_STARTS  = [10, 15, 20, 25]; // J, O, T, Y
    const BLOCK_WIDTH   = 5;

    BLOCK_STARTS.forEach(function(startCol) {
      const range = sheet.getRange(HEADER_ROW, startCol, 1, BLOCK_WIDTH);
      range.setBackground(HEADER_COLOR);
      range.setFontColor("#ffffff");
      range.setFontWeight("bold");
    });

    SpreadsheetApp.flush();

    ui.alert("✅ כותרות 4 בלוקי המיפוי החדשים (J-AC) עוצבו כמו הבלוקים הקיימים.");

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213f_colorClassificationHeaders: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — task213g_setupClassificationDropdowns —
// קובעת רשימות בחירה (Data Validation, setAllowInvalid(true) — לא חוסם)
// בגליון ניסוי_ יומן_מצב_רפואי, שורות 5-200, על 4 עמודות: Specialty_Name
// (מקור K5:K23 במיפוי), Severity_Name (P5:P9), Diagnosis_Name (U5:U18),
// Diagnosis_Certainty (Y5:Y8 — רשימת הקודים עצמם, לפי החלטת עמוס שהשדה
// הזה נשאר קוד בלבד ללא שם מפוענח). בודקת קודם שכותרות העמודות תואמות
// למצופה; אם לא — עוצרת בלי לגעת בכלום. חד-פעמית — מריצים פעם אחת כדי
// להגדיר את הרשימות; לא צריך להריץ שוב בכל עריכה.
// ══════════════════════════════════════════════════════════════════

function task213g_setupClassificationDropdowns() {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName    = "ניסוי_ יומן_מצב_רפואי";
    const mapSheetName = "ניסוי_מיפוי_קודים";
    const sheet    = ss.getSheetByName(sheetName);
    const mapSheet = ss.getSheetByName(mapSheetName);
    const ui       = SpreadsheetApp.getUi();

    if (!sheet)    { ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");    return; }
    if (!mapSheet) { ui.alert("❌ גליון '" + mapSheetName + "' לא נמצא."); return; }

    const HEADER_ROW         = 4;
    const FIRST_DATA_ROW     = 5;
    const LAST_VALIDATION_ROW = 200;

    // הגנה: ודא שכותרות העמודות הרלוונטיות ביומן תואמות בדיוק למצופה
    const EXPECTED  = { 9: "Specialty_Name", 13: "Severity_Name", 14: "Diagnosis_Name", 15: "Diagnosis_Certainty" };
    const mismatch  = Object.keys(EXPECTED).filter(function(col) {
      return sheet.getRange(HEADER_ROW, Number(col)).getValue() !== EXPECTED[col];
    });
    if (mismatch.length > 0) {
      ui.alert("⚠️ כותרות עמודות " + mismatch.join(",") + " לא תואמות למצופה. עוצר בלי לגעת בכלום.");
      return;
    }

    const numRows = LAST_VALIDATION_ROW - FIRST_DATA_ROW + 1;

    const RULES = [
      { col: 9,  mapRange: mapSheet.getRange("K5:K23") }, // Specialty_Name
      { col: 13, mapRange: mapSheet.getRange("P5:P9")  }, // Severity_Name
      { col: 14, mapRange: mapSheet.getRange("U5:U18") }, // Diagnosis_Name
      { col: 15, mapRange: mapSheet.getRange("Y5:Y8")  }  // Diagnosis_Certainty (קוד ישיר)
    ];

    RULES.forEach(function(r) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(r.mapRange, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(FIRST_DATA_ROW, r.col, numRows, 1).setDataValidation(rule);
    });

    SpreadsheetApp.flush();

    ui.alert("✅ נקבעו רשימות בחירה (שורות 5-200) לעמודות Specialty_Name, Severity_Name, Diagnosis_Name, Diagnosis_Certainty.");

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task213g_setupClassificationDropdowns: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [חדש] Task #213 — onEdit / _labJournal_autoFillClassificationCode —
// טריגר פשוט (פועל אוטומטית בכל עריכה בכל הקובץ — נבדק ואומת שאין onEdit
// קיים בפרויקט לפני ההוספה). יוצא מיד אם העריכה אינה בגליון ניסוי_ יומן_
// מצב_רפואי, כדי לא להשפיע על הייצור או טאבים אחרים. כשנבחר ערך באחת
// מעמודות Specialty_Name/Severity_Name/Diagnosis_Name — מחפש התאמה בבלוק
// המיפוי המתאים בגליון ניסוי_מיפוי_קודים ומעתיק את הקוד הצמוד לעמודת
// הקוד המקבילה באותה שורה. אם הערך נמחק — מנקה גם את הקוד. Diagnosis_
// Certainty אינו חלק ממנגנון זה (הוא כבר קוד ישיר, ללא עמודת קוד נפרדת).
// שגיאות נרשמות ל-Logger בלבד (בלי alert) כדי לא להפריע לעריכה רגילה
// בכל שאר הגליון.
// ══════════════════════════════════════════════════════════════════

function onEdit(e) {
  try {
    _labJournal_autoFillClassificationCode(e);
  } catch (err) {
    Logger.log("[QA_Tests] שגיאה ב-onEdit: " + err.toString());
  }
}

function _labJournal_autoFillClassificationCode(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== "ניסוי_ יומן_מצב_רפואי") return;
  if (e.range.getNumRows() > 1 || e.range.getNumColumns() > 1) return; // התעלמות מהדבקה מרובת-תאים

  const editedRow      = e.range.getRow();
  const editedCol      = e.range.getColumn();
  const FIRST_DATA_ROW = 5;
  if (editedRow < FIRST_DATA_ROW) return;

  const mapSheet = e.source.getSheetByName("ניסוי_מיפוי_קודים");
  if (!mapSheet) return;

  const PAIRS = [
    { nameCol: 9,  codeCol: 19, mapNameCol: 11, mapCodeCol: 10, mapFirstRow: 5, mapLastRow: 23 }, // Specialty
    { nameCol: 13, codeCol: 20, mapNameCol: 16, mapCodeCol: 15, mapFirstRow: 5, mapLastRow: 9  }, // Severity
    { nameCol: 14, codeCol: 21, mapNameCol: 21, mapCodeCol: 20, mapFirstRow: 5, mapLastRow: 18 }  // Diagnosis
  ];

  const pair = PAIRS.filter(function(p) { return p.nameCol === editedCol; })[0];
  if (!pair) return;

  const selectedValue = e.range.getValue().toString().trim();
  const codeCell       = sheet.getRange(editedRow, pair.codeCol);

  if (!selectedValue) {
    codeCell.setValue("");
    return;
  }

  const numRows       = pair.mapLastRow - pair.mapFirstRow + 1;
  const lookupValues  = mapSheet.getRange(pair.mapFirstRow, pair.mapNameCol, numRows, 1).getValues();
  const lookupCodes   = mapSheet.getRange(pair.mapFirstRow, pair.mapCodeCol, numRows, 1).getValues();

  let matchedCode = "";
  for (let i = 0; i < lookupValues.length; i++) {
    if ((lookupValues[i][0] || "").toString().trim() === selectedValue) {
      matchedCode = lookupCodes[i][0];
      break;
    }
  }

  codeCell.setValue(matchedCode);
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #214 — task214a_migrateMedicalStatusJournalToProduction —
// מיגרציה חד-פעמית: מרחיבה את גליון הייצור יומן_מצב_רפואי מהמבנה הישן
// (15 עמודות, COLUMN_MAP.gs) למבנה החדש בן 21 העמודות שנבנה ואומת בגליון
// הניסוי (ניסוי_ יומן_מצב_רפואי, Task #213). מעבירה נתונים קיימים לפי שם
// שדה (לא מיקום קבוע) — עמודות מחושבות ישנות (ET_CODE, Body_System_
// Normalized, Event_Type_Normalized) מוותרות, כי אין להן מקבילה במבנה
// החדש. 9 השדות החדשים (Specialty/Severity/Diagnosis/Certainty ושדות
// הקוד הצמודים) נשארים ריקים — יתמלאו מעכשיו והלאה ע"י S13 בלבד.
// בטיחות: יוצרת גיבוי מלא (copyTo) של הגליון לפני כל שינוי — לקח נלמד
// מתקלת task213a (אובדן נתונים באמצע כתיבה) — לא מסתמכת רק על זיכרון.
// בודקת קודם שכותרות שורה 4 בפועל תואמות בדיוק למבנה הישן הידוע; אם לא
// (למשל אם המיגרציה כבר רצה) — עוצרת בלי לגעת בכלום. אין נגיעה בגליון
// הניסוי או במיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function task214a_migrateMedicalStatusJournalToProduction() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName  = "יומן_מצב_רפואי";
    const sheet      = ss.getSheetByName(sheetName);
    const ui         = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    const HEADER_ROW     = 4;
    const FIRST_DATA_ROW = 5;
    const OLD_LAST_COL   = 15;

    // ── שלב 1: אימות שהכותרות בפועל תואמות בדיוק למבנה הישן הידוע ──

    const OLD_FIELDS = [
      "Event_Date", "Event_Type", "Medical_System_Name", "Primary_Diagnosis",
      "Severity_Status", "Recommendations", "Record_Status", "Doc_Issuer",
      "S_Row", "Medical_System", "ET_CODE", "File_ID", "Source_URL",
      "Body_System_Normalized", "Event_Type_Normalized"
    ];

    const actualHeaders = sheet.getRange(HEADER_ROW, 1, 1, OLD_LAST_COL).getValues()[0];
    const headersMatch  = OLD_FIELDS.every(function(h, i) { return actualHeaders[i] === h; });
    if (!headersMatch) {
      ui.alert("⚠️ כותרות שורה 4 לא תואמות למבנה הישן הידוע (ייתכן שהמיגרציה כבר רצה). עוצר בלי לגעת בכלום.\n\nבפועל: " + actualHeaders.join(" | "));
      return;
    }

    // ── שלב 2: גיבוי מלא של הגליון לפני כל שינוי (copyTo) ──

    const today      = new Date();
    const dateStr    = Utilities.formatDate(today, ss.getSpreadsheetTimeZone(), "dd_MM_yyyy_HHmm");
    let backupName    = "יומן_מצב_רפואי_גיבוי_" + dateStr;
    let suffix = 1;
    while (ss.getSheetByName(backupName)) {
      suffix++;
      backupName = "יומן_מצב_רפואי_גיבוי_" + dateStr + "_v" + suffix;
    }

    const backupSheet = sheet.copyTo(ss);
    backupSheet.setName(backupName);

    // ולידציה שהגיבוי אכן הצליח (מספר שורות זהה) לפני שממשיכים
    if (backupSheet.getLastRow() !== sheet.getLastRow()) {
      ui.alert("❌ הגיבוי לא תקין (מספר שורות לא תואם). עוצר בלי לגעת בגליון המקורי. הגיבוי החלקי '" + backupName + "' נשאר לבדיקה ידנית.");
      return;
    }

    // ── שלב 3: קריאת הנתונים הקיימים לזיכרון (מהגליון המקורי, לפני ניקוי) ──

    const lastRow     = sheet.getLastRow();
    const numDataRows = Math.max(0, lastRow - FIRST_DATA_ROW + 1);
    const oldData = numDataRows > 0
      ? sheet.getRange(FIRST_DATA_ROW, 1, numDataRows, OLD_LAST_COL).getValues()
      : [];

    const oldColIndexByName = {};
    OLD_FIELDS.forEach(function(name, idx) { oldColIndexByName[name] = idx; });

    // ── שלב 4: הגדרת המבנה החדש (21 שדות, זהה לניסוי_ יומן_מצב_רפואי) ──

    const NEW_FIELDS = [
      "Event_Date", "Event_Type", "Primary_Diagnosis", "Severity_Status",
      "Recommendations", "Doc_Issuer", "Record_Status", "S_Row",
      "Specialty_Name", "Medical_System_Name", "Event_Code", "Event_Description",
      "Severity_Name", "Diagnosis_Name", "Diagnosis_Certainty",
      "Source_URL", "File_ID", "Medical_System",
      "Specialty_Code", "Severity_Code", "Diagnosis_Code"
    ];
    const NEW_LAST_COL = NEW_FIELDS.length; // 21

    const GROUP_COLORS = {
      hard:   "#1565C0",
      tech:   "#757575",
      decode: "#2E7D32",
      code:   "#EF6C00"
    };
    const FIELD_GROUP = {
      Event_Date: "hard", Event_Type: "hard", Primary_Diagnosis: "hard",
      Severity_Status: "hard", Recommendations: "hard",
      Doc_Issuer: "tech", Record_Status: "tech", S_Row: "tech", Source_URL: "tech",
      Specialty_Name: "decode", Medical_System_Name: "decode", Event_Code: "decode",
      Event_Description: "decode", Severity_Name: "decode", Diagnosis_Name: "decode",
      Diagnosis_Certainty: "decode",
      File_ID: "tech",
      Medical_System: "code", Specialty_Code: "code", Severity_Code: "code",
      Diagnosis_Code: "code"
    };

    // ── שלב 5: מיפוי הנתונים הישנים למבנה החדש (לפי שם שדה) ──
    // שדות ישנים בלי מקבילה חדשה (ET_CODE, Body_System_Normalized,
    // Event_Type_Normalized) נשמטים — היו מחושבים, אין להם עוד תפקיד.
    // שדות חדשים בלי מקור ישן (Specialty_Name, Event_Code, Event_Description,
    // Severity_Name, Diagnosis_Name, Diagnosis_Certainty, Specialty_Code,
    // Severity_Code, Diagnosis_Code) נשארים ריקים.

    const newData = oldData.map(function(oldRow) {
      return NEW_FIELDS.map(function(fieldName) {
        const oldIdx = oldColIndexByName[fieldName];
        return (oldIdx !== undefined) ? oldRow[oldIdx] : "";
      });
    });

    // ── שלב 6: ניקוי הטווח הישן וכתיבת המבנה החדש ──
    // (לא נוגע בשורה 2/3 — שם יושבים האייקונים/תוויות; אלה מטופלים בנפרד)

    const CLEAR_COLS = 25;
    sheet.getRange(HEADER_ROW, 1, 1, CLEAR_COLS).clearContent().clearDataValidations().setBackground(null).setFontColor(null);
    if (lastRow >= FIRST_DATA_ROW) {
      sheet.getRange(FIRST_DATA_ROW, 1, lastRow - FIRST_DATA_ROW + 1, CLEAR_COLS).clearContent().clearDataValidations();
    }

    sheet.getRange(HEADER_ROW, 1, 1, NEW_LAST_COL).setValues([NEW_FIELDS]);
    NEW_FIELDS.forEach(function(fieldName, idx) {
      const group = FIELD_GROUP[fieldName];
      const cell  = sheet.getRange(HEADER_ROW, idx + 1);
      cell.setBackground(GROUP_COLORS[group]);
      cell.setFontColor("#ffffff");
      cell.setFontWeight("bold");
    });

    if (newData.length > 0) {
      sheet.getRange(FIRST_DATA_ROW, 1, newData.length, NEW_LAST_COL).setValues(newData);
    }

    // ── שלב 7: קיבוע 5 עמודות (A-E), זהה לניסוי ──

    sheet.setFrozenColumns(5);

    SpreadsheetApp.flush();

    ui.alert(
      "✅ מיגרציית מבנה הושלמה.\n\n" +
      "גיבוי מלא נשמר בגליון: '" + backupName + "'\n" +
      "21 עמודות בסדר החדש, " + newData.length + " שורות נתונים הועברו.\n" +
      "5 עמודות ראשונות קובעו.\n\n" +
      "האייקונים טרם הוזזו — זהו שלב נפרד (task214c)."
    );

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task214a_migrateMedicalStatusJournalToProduction: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #214 — task215a_migrateCodeMapSheetToProduction —
// מיגרציה חד-פעמית: הופכת את גליון הייצור מיפוי_קודים מהמבנה השטוח הישן
// (Type|Key|Normalized_Value|Raw_Value, ללא שורת כותרת) למבנה 6 הבלוקים
// שנבנה ואומת בגליון ניסוי_מיפוי_קודים (Task #212/#213): איברים (A-D),
// אירועים (E-I), התמחות (J-N), חומרה (O-S), אבחנה (T-X), וודאות (Y-AC).
// כל הנתונים נקראו ישירות מהגליון החי (לא רק מהקוד ההיסטורי). בלוק
// האירועים כולל 5 קטגוריות (A0-A4) עם תתי-הקודים שלהן, ובנוסף קוד עצמאי
// A5 (בדיקה כללית) בסוף הרשימה, בדיוק כפי שהוא בפועל בגליון ניסוי היום.
// קודי האירוע הישנים בייצור (A00, A0A-C, A1A-C) מוחלפים לגמרי — אין להם
// מקבילה ישירה בסכימה החדשה, בדיוק כמו שדות מחושבים ישנים שנשמטו ביומן.
// בטיחות: גיבוי מלא (copyTo) לפני כל שינוי. בודקת קודם ש-A5:D5 ו-A26:D26
// בפועל תואמים למבנה הישן הידוע (הנתונים בייצור מתחילים בשורה 5, אחרי 2
// שורות ריקות ושורת כותרת); אם לא (למשל אם המיגרציה כבר רצה) — עוצרת בלי
// לגעת בכלום. אין נגיעה בגליון הניסוי או ביומן_מצב_רפואי.
// ══════════════════════════════════════════════════════════════════

function task215a_migrateCodeMapSheetToProduction() {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName  = "מיפוי_קודים";
    const sheet      = ss.getSheetByName(sheetName);
    const ui         = SpreadsheetApp.getUi();

    if (!sheet) {
      ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");
      return;
    }

    // ── שלב 1: אימות שהמבנה הישן (שטוח, ללא כותרת) עדיין קיים בפועל ──

    const firstRow = sheet.getRange(5, 1, 1, 4).getValues()[0];
    const lastRow  = sheet.getRange(26, 1, 1, 4).getValues()[0];
    const oldStructureIntact =
      firstRow[0] === "מערכת_גוף" && firstRow[1] === "SYS00" &&
      lastRow[0]  === "קוד_אירוע" && lastRow[1]  === "A1C";

    if (!oldStructureIntact) {
      ui.alert(
        "⚠️ המבנה הישן של מיפוי_קודים לא תואם לצפוי (ייתכן שהמיגרציה כבר רצה). עוצר בלי לגעת בכלום.\n\n" +
        "A5:D5 בפועל: " + firstRow.join(" | ") + "\nA26:D26 בפועל: " + lastRow.join(" | ")
      );
      return;
    }

    // ── שלב 2: גיבוי מלא של הגליון לפני כל שינוי (copyTo) ──

    const today   = new Date();
    const dateStr = Utilities.formatDate(today, ss.getSpreadsheetTimeZone(), "dd_MM_yyyy_HHmm");
    let backupName = "מיפוי_קודים_גיבוי_" + dateStr;
    let suffix = 1;
    while (ss.getSheetByName(backupName)) {
      suffix++;
      backupName = "מיפוי_קודים_גיבוי_" + dateStr + "_v" + suffix;
    }

    const backupSheet = sheet.copyTo(ss);
    backupSheet.setName(backupName);

    if (backupSheet.getLastRow() !== sheet.getLastRow()) {
      ui.alert("❌ הגיבוי לא תקין (מספר שורות לא תואם). עוצר בלי לגעת בגליון המקורי. הגיבוי החלקי '" + backupName + "' נשאר לבדיקה ידנית.");
      return;
    }

    // ── שלב 3: ניקוי כל הטווח הישן (שטוח, A-D בלבד) ──

    const CLEAR_ROWS = 200;
    const CLEAR_COLS = 29; // A עד AC
    sheet.getRange(1, 1, CLEAR_ROWS, CLEAR_COLS)
      .clearContent().clearDataValidations()
      .setBackground(null).setFontColor(null).setFontWeight("normal");

    const LABEL_ROW      = 3;
    const HEADER_ROW     = 4;
    const FIRST_DATA_ROW = 5;
    const HEADER_COLOR   = "#1A3A5C";
    const ICON_LINK       = "https://drive.google.com/drive/u/0/folders/1LMQWPaoXisYz8OoeeUee5lW1qNJqrP-K";

    // ── בלוק איברים (A-D) ──

    sheet.getRange(LABEL_ROW, 1).setValue("קוד איבר");
    sheet.getRange(HEADER_ROW, 1, 1, 4).setValues([["Organ_Code", "Normalized_Value", "Raw_Value", "Icon_Link"]]);
    sheet.getRange(HEADER_ROW, 1, 1, 4).setBackground(HEADER_COLOR).setFontColor("#ffffff").setFontWeight("bold");

    const ORGAN_SYSTEMS = [
      { sys: "SYS00", name: "מערכת כללית", organs: ["גוף שלם", "מדדים כלליים", "חום", "משקל", "חיוניות כללית"] },
      { sys: "SYS01", name: "מערכת השלד", organs: ["עצמות הגולגולת", "עמוד שדרה", "צלעות", "אגן", "גפיים", "מפרקים", "סחוסים", "רצועות"] },
      { sys: "SYS02", name: "מערכת השרירים", organs: ["שרירי שלד", "גידים", "רצועות שריר", "שרירים חלקים"] },
      { sys: "SYS03", name: "מערכת הכסות", organs: ["עור", "רקמת שומן תת-עורית", "שיער", "ציפורניים", "בלוטות זיעה וחלב"] },
      { sys: "SYS04", name: "מערכת העצבים", organs: ["מוח גדול", "מוח קטן", "גזע המוח", "חוט השדרה", "עצבים פריפריים"] },
      { sys: "SYS05", name: "המערכת האנדוקרינית", organs: ["בלוטת יותרת המוח (היפופיזה)", "תריס", "יותרת התריס", "יותרת הכליה (אדרנל)", "לבלב אנדוקריני"] },
      { sys: "SYS06", name: "מערכת הדם וכלי הדם", organs: ["לב", "עורקים", "ורידים", "נימים", "כדוריות דם", "פלזמה"] },
      { sys: "SYS07", name: "מערכת הלימפה", organs: ["קשריות לימפה (צוואר, בית שחי, מפשעה)", "צינורות לימפה", "טחול", "נוזל הלימפה"] },
      { sys: "SYS08", name: "מערכת החיסון", organs: ["מוח עצם", "תימוס", "שקדים", "נוגדנים", "תאי דם לבנים"] },
      { sys: "SYS09", name: "מערכת הנשימה", organs: ["אף", "לוע", "גרון", "קנה הנשימה", "סמפונות", "ריאות", "סרעפת"] },
      { sys: "SYS10", name: "מערכת העיכול", organs: ["פה", "ושט", "קיבה", "תריסריון", "מעי דק", "מעי גס", "תוספתן", "חלחולת (רקטום)", "כבד", "כיס מרה", "לבלב"] },
      { sys: "SYS11", name: "מערכת השתן", organs: ["כליות", "שופכנים", "שלפוחית השתן", "שופכה"] },
      { sys: "SYS12", name: "מערכת הרבייה", organs: ["ערמונית", "אשכים", "צינור הזרע", "פין", "שחלות", "חצוצרות", "רחם", "צוואר הרחם", "נרתיק"] },
      { sys: "SYS13", name: "מערכות החישה", organs: ["עיניים (ראייה)", "אוזניים (שמיעה ושיווי משקל)", "אף (ריח)", "לשון (טעם)", "עור (מישוש)"] },
      { sys: "SYS14", name: "מערכת הגנים", organs: ["DNA", "כרומוזומים", "גנים", "גרעין התא", "מבנים מולקולריים"] }
    ];

    const organRows = [];
    ORGAN_SYSTEMS.forEach(function(entry) {
      organRows.push([entry.sys, entry.name, "", (entry.sys === "SYS00") ? ICON_LINK : ""]);
      entry.organs.forEach(function(organName, idx) {
        const code = entry.sys + String.fromCharCode(65 + idx);
        const icon = (code === "SYS00A" || code === "SYS12A") ? ICON_LINK : "";
        organRows.push([code, organName, "", icon]);
      });
    });
    sheet.getRange(FIRST_DATA_ROW, 1, organRows.length, 4).setValues(organRows);

    // ── בלוק אירועים (E-I) ──

    sheet.getRange(LABEL_ROW, 5).setValue("קוד_אירוע");
    sheet.getRange(HEADER_ROW, 5, 1, 5).setValues([["Event_Code", "Normalized_Value", "Description", "Raw_Value", "Icon_Link"]]);
    sheet.getRange(HEADER_ROW, 5, 1, 5).setBackground(HEADER_COLOR).setFontColor("#ffffff").setFontWeight("bold");

    const EVENT_CATEGORIES = [
      { key: "A0", shortName: "בדיקות דימות ", desc: "בדיקות דימות (המשך סדרת A0)", codes: [
        ["A0A", "בדיקת MRI", "תהודה מגנטית (רקמות רכות, מוח, מפרקים, ערמונית)", "בדיקת MRI של בלוטת הערמונית", ICON_LINK],
        ["A0B", "בדיקת CT", "טומוגרפיה ממוחשבת (ראש, חזה, בטן, אגן, אנגיו-CT)", "", ""],
        ["A0C", "בדיקת אולטרסאונד", "סונר / על-שמע (בטן, דרכי שתן, בלוטת התריס, כלי דם - דופלר)", "", ""],
        ["A0D", "צילום רנטגן (X-Ray)", "צילומי חזה, עצמות, שלד, שיניים", "", ""],
        ["A0E", "בדיקת PET-CT", "דימות משולב ברפואה גרעינית (אונקולוגיה, דלקות עמוקות)", "", ""],
        ["A0F", "מיפוי רדיואיזוטופי", "מיפוי עצמות, מיפוי בלוטת התריס, מיפוי כליות/לב", "", ""],
        ["A0G", "ממוגרפיה", "דימות ייעודי לרקמת השד", "", ""],
        ["A0H", "צפיפות עצם (DEXA)", "הערכת אוסטאופורוזיס ומסת עצם", "", ""]
      ]},
      { key: "A1", shortName: "בדיקות דם ומעבדה נוזלית ", desc: "בדיקות דם ומעבדה נוזלית (המשך סדרת A1)", codes: [
        ["A1A", "בדיקת דם גנטית", "ריצוף גנומי, סקר גנטי, בדיקות קריוטיפ", "דוח ממצאים גנטיים", ""],
        ["A1B", "בדיקת דם אנדוקרינית", "פרופיל הורמונלי (תריס, טסטוסטרון, קורטיזול ועוד)", "בדיקת מעבדה", ""],
        ["A1C", "בדיקת דם ביוכימיה", "תפקודי כבד, תפקודי כליות, אלקטרוליטים, שומנים, גלוקוז", "בדיקת דם", ""],
        ["A1D", "ספירת דם מלאה (CBC)", "כדוריות אדומות, כדוריות לבנות, טסיות, המוגלובין", "", ""],
        ["A1E", "בדיקת קרישת דם", "תפקודי קרישה (PT, INR, PTT, פיברינוגן)", "", ""],
        ["A1F", "בדיקת סמני דלקת", "שקיעת דם (ESR), חלבון מגיב C (CRP)", "", ""],
        ["A1G", "בדיקת סרולוגיה ואימונולוגיה", "נוגדנים, מחלות אוטואימוניות, סרולוגיה למזהמים", "", ""],
        ["A1H", "בדיקת סמני גידול (Tumor Markers)", "PSA (ערמונית), CEA, CA-125, AFP", "", ""],
        ["A1I", "בדיקת שתן כללית ותרבית", "בדיקת סטיק, מיקרוסקופיה, תרבית חיידקים, איסוף שתן", "", ""],
        ["A1J", "בדיקות צואה ונוזלי גוף", "דם סמוי, בדיקות פרזיטים, נוזל מפרק, נוזל שדרה (CSF)", "", ""]
      ]},
      { key: "A2", shortName: "בדיקות פיזיולוגיות, תפקודיות וחשמליות ", desc: "בדיקות פיזיולוגיות, תפקודיות וחשמליות (סדרת A2 מוצעת)", codes: [
        ["A2A", "בדיקת אק\"ג (ECG)", "רישום הפעילות החשמלית של הלב", "", ""],
        ["A2B", "אקו לב (Echocardiogram)", "הערכת מבנה ותפקוד הלב ושסתומיו במאמץ/מנוחה", "", ""],
        ["A2C", "הולטר", "ניטור רציף של קצב לב או לחץ דם למשך 24-48 שעות", "", ""],
        ["A2D", "בדיקת ארגומטריה", "בדיקת מאמץ ללב על גבי מסילה או אופניים", "", ""],
        ["A2E", "בדיקת תפקודי ריאות (ספירומטריה)", "נפחי ריאה, קצב זרימת אוויר (אסתמה, COPD)", "", ""],
        ["A2F", "בדיקת EEG", "רישום גלי מוח ופעילות חשמלית מוחית", "", ""],
        ["A2G", "בדיקת EMG / הולכה עצבית", "הולכה עצבית ופעילות שרירית פריפרית", "", ""],
        ["A2H", "בדיקת שינה (פוליסומנוגרפיה)", "ניטור שינה, דום נשימה בשינה", "", ""],
        ["A2I", "בדיקת אורודינמיקה", "הערכת לחצים וזרימה במערכת השתן התחתונה", "", ""]
      ]},
      { key: "A3", shortName: "בדיקות אנדוסקופיות ופולשניות ", desc: "בדיקות אנדוסקופיות ופולשניות (סדרת A3 מוצעת)", codes: [
        ["A3A", "קולונוסקופיה", "הסתכלות ישירה במעי הגס והרקטום", "", ""],
        ["A3B", "גסטרוסקופיה", "הסתכלות בוושט, בקיבה ובתריסריון", "", ""],
        ["A3C", "ציסטוסקופיה", "בדיקה אנדוסקופית של שלפוחית השתן והשופכה", "", ""],
        ["A3D", "ברונכוסקופיה", "הסתכלות בדרכי הנשימה והריאות", "", ""],
        ["A3E", "צנתור אבחנתי", "הדגמת עורקים כליליים או היקפיים", "", ""]
      ]},
      { key: "A4", shortName: "בדיקות פתולוגיה וציטולוגיה ", desc: "בדיקות פתולוגיה וציטולוגיה (סדרת A4 מוצעת)", codes: [
        ["A4A", "ביופסיה מחטית (FNA / Core)", "דגימת רקמה מאיבר או גוש (ערמונית, שד, בלוטת תריס)", "", ""],
        ["A4B", "בדיקה היסטופתולוגית", "ניתוח רקמה שהוצאה בניתוח", "", ""],
        ["A4C", "בדיקה ציטולוגית", "משטחי תאים (כגון בדיקת פאפ, שטיפות שתן)", "", ""]
      ]}
    ];

    const eventRows = [];
    EVENT_CATEGORIES.forEach(function(cat) {
      eventRows.push([cat.key, cat.shortName, cat.desc, "", ""]);
      cat.codes.forEach(function(c) { eventRows.push(c); });
    });
    eventRows.push(["A5", "בדיקה כללית", "בדיקה גופנית / הערכה רפואית שגרתית", "בדיקת כושר עבודה", ""]);
    sheet.getRange(FIRST_DATA_ROW, 5, eventRows.length, 5).setValues(eventRows);

    // ── בלוק התמחות (J-N) ──

    sheet.getRange(LABEL_ROW, 10).setValue("מקצוע_רפואי");
    sheet.getRange(HEADER_ROW, 10, 1, 5).setValues([["Specialty_Code", "Normalized_Value", "Description", "Raw_Value", "Icon_Link"]]);
    sheet.getRange(HEADER_ROW, 10, 1, 5).setBackground(HEADER_COLOR).setFontColor("#ffffff").setFontWeight("bold");

    const specialtyRows = [
      ["SPEC00", "כללית/משפחה", "רפואה כללית ובדיקות שגרתיות", "רופא משפחה, מרפאה כללית, בדיקה שגרתית", ""],
      ["SPEC01", "פנימית", "אבחון וטיפול במחלות פנימיות כלליות", "רופא פנימי, מחלקה פנימית", ""],
      ["SPEC02", "קרדיולוגיה", "מחלות לב וכלי דם", "קרדיולוג, מכון לב, בדיקת לב", ""],
      ["SPEC03", "נוירולוגיה", "מחלות מערכת העצבים", "נוירולוג, מכון נוירולוגי", ""],
      ["SPEC04", "אורתופדיה", "מערכת השלד והשרירים", "אורתופד, מכון אורתופדי, פציעת ספורט", ""],
      ["SPEC05", "אורולוגיה", "דרכי השתן ומערכת הרבייה הגברית", "אורולוג, דרכי שתן, בלוטת הערמונית", ""],
      ["SPEC06", "גינקולוגיה", "בריאות האישה ומערכת הרבייה הנשית", "גינקולוג, נשים ויולדות", ""],
      ["SPEC07", "עיניים", "ראייה ומחלות עיניים", "רופא עיניים, אופטומטריסט", ""],
      ["SPEC08", "אף אוזן גרון", "מחלות אא\"ג", "רופא אא\"ג", ""],
      ["SPEC09", "עור", "מחלות עור", "דרמטולוג, רופא עור", ""],
      ["SPEC10", "פסיכיאטריה", "בריאות הנפש", "פסיכיאטר, בריאות הנפש", ""],
      ["SPEC11", "כירורגיה כללית", "ניתוחים כלליים", "מנתח, כירורג, ניתוח", ""],
      ["SPEC12", "אונקולוגיה", "אבחון וטיפול בגידולים סרטניים", "אונקולוג, מכון אונקולוגי, כימותרפיה", ""],
      ["SPEC13", "ראומטולוגיה", "מחלות פרקים ומחלות דלקתיות אוטואימוניות", "ראומטולוג", ""],
      ["SPEC14", "אנדוקרינולוגיה", "בלוטות ומחלות מטבוליות", "אנדוקרינולוג, סוכרת, בלוטת התריס", ""],
      ["SPEC15", "גסטרואנטרולוגיה", "מערכת העיכול", "גסטרואנטרולוג, מערכת עיכול", ""],
      ["SPEC16", "ריאות", "מחלות נשימה וריאות", "רופא ריאות, פולמונולוג", ""],
      ["SPEC17", "רפואה תעסוקתית", "התאמת כושר עבודה ובריאות תעסוקתית", "מרפאה תעסוקתית, כושר עבודה", ""],
      ["SPEC18", "רדיולוגיה/דימות", "בדיקות דימות ופענוח", "מכון דימות, מכון רדיולוגי", ""]
    ];
    sheet.getRange(FIRST_DATA_ROW, 10, specialtyRows.length, 5).setValues(specialtyRows);

    // ── בלוק חומרה (O-S) ──

    sheet.getRange(LABEL_ROW, 15).setValue("חומרה");
    sheet.getRange(HEADER_ROW, 15, 1, 5).setValues([["Severity_Code", "Normalized_Value", "Description", "Raw_Value", "Icon_Link"]]);
    sheet.getRange(HEADER_ROW, 15, 1, 5).setBackground(HEADER_COLOR).setFontColor("#ffffff").setFontWeight("bold");

    const severityRows = [
      ["SEV0", "קל", "ממצא קל שאינו דורש התערבות דחופה", "קל, מינורי, PIRADS 1, PIRADS 2, שלב 1, Grade 1", ""],
      ["SEV1", "בינוני", "ממצא בדרגת ביניים הדורש מעקב", "בינוני, מתון, PIRADS 3, שלב 2, Grade 2", ""],
      ["SEV2", "חמור", "ממצא משמעותי הדורש טיפול", "חמור, קשה, PIRADS 4, PIRADS 5, שלב 3, שלב 4, Grade 3, Grade 4", ""],
      ["SEV3", "קריטי", "מצב דחוף המצריך התערבות מיידית", "קריטי, דחוף, מצב חירום, Grade 5", ""],
      ["SEV4", "לא צוין", "רמת חומרה לא דווחה במסמך", "לא צוין, לא ידוע", ""]
    ];
    sheet.getRange(FIRST_DATA_ROW, 15, severityRows.length, 5).setValues(severityRows);

    // ── בלוק אבחנה (T-X) ──

    sheet.getRange(LABEL_ROW, 20).setValue("אבחנה");
    sheet.getRange(HEADER_ROW, 20, 1, 5).setValues([["Diagnosis_Code", "Normalized_Value", "Description", "Raw_Value", "Icon_Link"]]);
    sheet.getRange(HEADER_ROW, 20, 1, 5).setBackground(HEADER_COLOR).setFontColor("#ffffff").setFontWeight("bold");

    const diagnosisRows = [
      ["DX00", "זיהומיות", "מחלות זיהומיות", "זיהום, דלקת חיידקית, וירוס", ""],
      ["DX01", "אונקולוגי/גידולים", "גידולים שפירים וממאירים", "גידול, סרטן, ממאירות, שאת", ""],
      ["DX02", "קרדיווסקולרי", "מחלות לב וכלי דם", "מחלת לב, אוטם, יתר לחץ דם", ""],
      ["DX03", "נוירולוגי", "מחלות מערכת העצבים", "שבץ, אפילפסיה", ""],
      ["DX04", "שרירי-שלד", "פציעות ומחלות שלד ושרירים", "שבר, קרע ברצועה, דלקת מפרקים", ""],
      ["DX05", "עיכול", "מחלות מערכת העיכול", "כיב קיבה, מחלת מעי", ""],
      ["DX06", "שתן/כליות", "מחלות דרכי שתן וכליות", "אבן בכליה, זיהום בדרכי השתן", ""],
      ["DX07", "רבייה", "מחלות מערכת הרבייה", "PIRADS, ציסטה בשחלה", ""],
      ["DX08", "נשימתי", "מחלות נשימה וריאות", "אסתמה, דלקת ריאות", ""],
      ["DX09", "אנדוקריני/מטבולי", "מחלות בלוטות וחילוף חומרים", "סוכרת, תפקוד תריס לקוי", ""],
      ["DX10", "פסיכיאטרי", "מחלות נפש", "דיכאון, חרדה", ""],
      ["DX11", "עור", "מחלות עור", "פריחה, פסוריאזיס", ""],
      ["DX12", "טראומה/פציעה", "פציעות מתאונה או טראומה", "פגיעה, תאונה, שבר", ""],
      ["DX13", "לא סווג", "לא ניתן לסווג לקבוצה קיימת", "לא סווג", ""]
    ];
    sheet.getRange(FIRST_DATA_ROW, 20, diagnosisRows.length, 5).setValues(diagnosisRows);

    // ── בלוק וודאות אבחנה (Y-AC) ──

    sheet.getRange(LABEL_ROW, 25).setValue("וודאות_אבחנה");
    sheet.getRange(HEADER_ROW, 25, 1, 5).setValues([["Certainty_Code", "Normalized_Value", "Description", "Raw_Value", "Icon_Link"]]);
    sheet.getRange(HEADER_ROW, 25, 1, 5).setBackground(HEADER_COLOR).setFontColor("#ffffff").setFontWeight("bold");

    const certaintyRows = [
      ["CRT0", "חשד", "ממצא ראשוני שטרם אושר", "חשד, ייתכן, סביר", ""],
      ["CRT1", "בבדיקה", "בתהליך בירור/המתנה לתוצאות", "בבירור, בבדיקה, ממתין לתוצאות", ""],
      ["CRT2", "סופי", "אבחנה מאושרת וסופית", "אושר, מאובחן, סופי, מוגדר", ""],
      ["CRT3", "נשלל", "האבחנה נשללה", "נשלל, לא נמצא", ""]
    ];
    sheet.getRange(FIRST_DATA_ROW, 25, certaintyRows.length, 5).setValues(certaintyRows);

    SpreadsheetApp.flush();

    ui.alert(
      "✅ מיגרציית מיפוי_קודים הושלמה.\n\n" +
      "גיבוי מלא נשמר בגליון: '" + backupName + "'\n" +
      "6 בלוקים נבנו: איברים (" + organRows.length + "), אירועים (" + eventRows.length + "), " +
      "התמחות (" + specialtyRows.length + "), חומרה (" + severityRows.length + "), " +
      "אבחנה (" + diagnosisRows.length + "), וודאות (" + certaintyRows.length + ")."
    );

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task215a_migrateCodeMapSheetToProduction: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// [חדש] Task #214 — task216a_setupClassificationDropdownsProduction —
// קובעת רשימות בחירה (Data Validation, setAllowInvalid(true) — לא חוסם)
// בגליון הייצור יומן_מצב_רפואי, שורות 5-200, על 4 עמודות: Specialty_Name
// (מקור K5:K23 במיפוי_קודים), Severity_Name (P5:P9), Diagnosis_Name
// (U5:U18), Diagnosis_Certainty (Y5:Y8 — רשימת הקודים עצמם, בדיוק כמו
// בגליון הניסוי — השדה הזה נשאר קוד בלבד ללא שם מפוענח). בודקת קודם
// שכותרות העמודות תואמות למצופה; אם לא — עוצרת בלי לגעת בכלום. זהה
// במהותה ל-task213g (שהוגדרה לגליון הניסוי), כעת מול גליוני הייצור
// יומן_מצב_רפואי / מיפוי_קודים. חד-פעמית — מריצים פעם אחת כדי להגדיר
// את הרשימות; לא צריך להריץ שוב בכל עריכה.
// ══════════════════════════════════════════════════════════════════

function task216a_setupClassificationDropdownsProduction() {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName    = "יומן_מצב_רפואי";
    const mapSheetName = "מיפוי_קודים";
    const sheet    = ss.getSheetByName(sheetName);
    const mapSheet = ss.getSheetByName(mapSheetName);
    const ui       = SpreadsheetApp.getUi();

    if (!sheet)    { ui.alert("❌ גליון '" + sheetName + "' לא נמצא.");    return; }
    if (!mapSheet) { ui.alert("❌ גליון '" + mapSheetName + "' לא נמצא."); return; }

    const HEADER_ROW         = 4;
    const FIRST_DATA_ROW     = 5;
    const LAST_VALIDATION_ROW = 200;

    // הגנה: ודא שכותרות העמודות הרלוונטיות ביומן תואמות בדיוק למצופה
    const EXPECTED  = { 9: "Specialty_Name", 13: "Severity_Name", 14: "Diagnosis_Name", 15: "Diagnosis_Certainty" };
    const mismatch  = Object.keys(EXPECTED).filter(function(col) {
      return sheet.getRange(HEADER_ROW, Number(col)).getValue() !== EXPECTED[col];
    });
    if (mismatch.length > 0) {
      ui.alert("⚠️ כותרות עמודות " + mismatch.join(",") + " לא תואמות למצופה. עוצר בלי לגעת בכלום.");
      return;
    }

    const numRows = LAST_VALIDATION_ROW - FIRST_DATA_ROW + 1;

    const RULES = [
      { col: 9,  mapRange: mapSheet.getRange("K5:K23") }, // Specialty_Name
      { col: 13, mapRange: mapSheet.getRange("P5:P9")  }, // Severity_Name
      { col: 14, mapRange: mapSheet.getRange("U5:U18") }, // Diagnosis_Name
      { col: 15, mapRange: mapSheet.getRange("Y5:Y8")  }  // Diagnosis_Certainty (קוד ישיר)
    ];

    RULES.forEach(function(r) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(r.mapRange, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(FIRST_DATA_ROW, r.col, numRows, 1).setDataValidation(rule);
    });

    SpreadsheetApp.flush();

    ui.alert("✅ נקבעו רשימות בחירה (שורות 5-200) בגליון הייצור לעמודות Specialty_Name, Severity_Name, Diagnosis_Name, Diagnosis_Certainty.");

  } catch (e) {
    Logger.log("[QA_Tests] שגיאה ב-task216a_setupClassificationDropdownsProduction: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}