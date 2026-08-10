/**
 * MedicalPilot — S08_Validate.gs
 * @file        S08_Validate.gs
 * @version 1.0.31 | @updated 10/08/2026 19:30 | @service S08
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S08_Validate.gs
 * @description אימות ידני ולמידה של מסמכים רפואיים — פותח Dialog לעריכה ואישור.
 *              תלויות: S08_Sidebar.html, COLUMN_MAP.gs (SHEET_CONFIG), Drive API.
 * @callers     runS08ViewIcon (ViewEngine עמודה N) | Menu_PROD
 * @functions   showMainSidebar, _s08_getRowData, s08_loadRowData,
 *              s08_loadRowByNumber, s08_highlightActiveRow,
 *              s08_findDuplicateInSheet, s08_findLearningDuplicate,
 *              s08_fetchTxtContent, s08_getDuplicateRowData,
 *              _s08_fetchTxtWordCount, s08_cancelDuplicateFlag,
 *              s08_approve, s08_updateAndLearn, s08_learnOnly,
 *              _s08_saveToLearning, s08_delete,
 *              _s08_trashDriveFile, _s08_getDuplicateRowNumber,
 *              s08_deleteApproved, s08_fixReferencesAfterDelete,
 *              s08_previewApprovedForDeletion, s08_cancelLogoEmptyFlag,
 *              s08_cancelCorruptedTextFlag, s08_confirmLogoEmptyFlag,
 *              s08_resetCorruptedTextForReconvert
 * @changes     [v1.0.31] Task 176 — s08_resetCorruptedTextForReconvert:
 *              מנקה גם Doc_Title/Doc_Issuer/Doc_Date/Doc_Category/
 *              Extraction_Status/Complexity (כל פלט S07) בעת איפוס —
 *              מונע שאריות ישנות/כוזבות שנשארות עד ש-S07 (ידני בלבד)
 *              ירוץ שוב. משלים תיקון S07_Classify.gs
 *              (_isAiUnknownSentinel_S07) — יחד פותרים "0 מילים → מסווג
 *              בהצלחה בטעות" (שורות 19+25, אומת בשטח פעמיים).
 */
// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — פתיחת חלון אימות
// ══════════════════════════════════════════════════════════════════

function showMainSidebar() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");

  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה: גליון 'ניהול_מיילים' לא נמצא.");
    return;
  }

  const row = sheet.getActiveCell().getRow();

  if (row < 2) {
    SpreadsheetApp.getUi().alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const txtUrl = sheet.getRange(row, 24).getValue();
  if (!txtUrl || txtUrl.toString().trim() === "") {
    SpreadsheetApp.getUi().alert(
      "⛔ לא נמצא קובץ טקסט לשורה זו (עמודה X ריקה).\n" +
      "יש להריץ קודם את שירות S06 — המרה ל-TXT."
    );
    return;
  }
  // [v1.0.11] Task 74 — בדיקת תנאי כניסה: Pipeline_Status חייב להיות "עבר סיווג"
  // [v1.0.14] Task 106 — הורחב לקבל גם "חולץ מלא": ערך שבפועל שייך לעמודה N
  // (Extraction_Status, לפי COLUMN_MAP.gs) אך נמצא בשורות ישנות גם ב-M —
  // תנאי הכניסה חסם אותן שגוי למרות שהן מוכנות לאימות ידני בפועל.
  const pipelineStatus = sheet.getRange(row, 13).getValue() || "";
  const isReadyForS08  = (pipelineStatus === "עבר סיווג" ||
                          pipelineStatus === "חולץ מלא" ||
                          pipelineStatus === "מאושר");
  if (!isReadyForS08) {
    SpreadsheetApp.getUi().alert(
      "⛔ שורה זו אינה מוכנה לאימות ידני.\n" +
      "סטטוס נדרש: עבר סיווג / חולץ מלא / מאושר | סטטוס נוכחי: " + (pipelineStatus || "ריק") + "\n" +
      "יש להריץ קודם את שירות S07 — סיווג מסמכים."
    );
    return;
  }

  const rowData = _s08_getRowData(sheet, row);

  PropertiesService.getScriptProperties().setProperty(
    "S08_CURRENT_ROW_DATA",
    JSON.stringify({ row: row, data: rowData })
  );

  s08_highlightActiveRow(row);

  // [v1.0.6-ד] Dialog מוגדל ל-1100×750
  const html = HtmlService
    .createTemplateFromFile("S08_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S08 — אימות ידני");

  // [v1.0.22] Task 147 — כותרת קבועה, ללא מספר שורה (ראו @changes בכותרת הקובץ)
  SpreadsheetApp.getUi().showModalDialog(html, "🔍 אימות ידני — S08");
}
// ══════════════════════════════════════════════════════════════════
// שליפת נתוני שורה
// ══════════════════════════════════════════════════════════════════

function _s08_getRowData(sheet, row) {
  const fileId    = (sheet.getRange(row, 1).getValue()  || "").toString().trim();
  const sourceUrl = (sheet.getRange(row, 23).getValue() || "").toString().trim() ||
                    (fileId ? "https://drive.google.com/file/d/" + fileId + "/view" : "");

  return {
    row:            row,
    fileId:         fileId,
    docTitle:       sheet.getRange(row, 9).getValue()  || "",
    docIssuer:      sheet.getRange(row, 10).getValue() || "",
    docDate:        _s08_formatDateForDisplay(sheet.getRange(row, 11).getValue()),
    docCategory:    sheet.getRange(row, 12).getValue() || "",
    pipelineStatus: sheet.getRange(row, 13).getValue() || "",
    fileSize:       sheet.getRange(row, 16).getValue() || "",
    complexity:     sheet.getRange(row, 17).getValue() || "",
   duplicateFlag:  sheet.getRange(row, 18).getValue() || "",
    // [v1.0.26] Task 155(ב) — qaStatus (U, 21) היה חסר לגמרי; ה-Sidebar
    // לא ידע שקיים חשד E25/E31 על השורה. נדרש להצגת qa-warning-card.
    qaStatus:       sheet.getRange(row, 21).getValue() || "",
    sourceUrl:      sourceUrl,
    txtUrl:         sheet.getRange(row, 24).getValue() || ""
  };
}

// ══════════════════════════════════════════════════════════════════
// קריאה מה-HTML — טעינת נתוני השורה הנוכחית
// ══════════════════════════════════════════════════════════════════

function s08_loadRowData() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("S08_CURRENT_ROW_DATA");
    if (!raw) return null;
    const parsed  = JSON.parse(raw);
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sheet   = ss.getSheetByName("ניהול_מיילים");
    const lastRow = sheet ? sheet.getLastRow() : 9999;
    const noTxt   = !parsed.data.txtUrl;
    return {
      row:     parsed.row,
      data:    parsed.data,
      lastRow: lastRow,
      noTxt:   noTxt
    };
  } catch (e) {
    Logger.log("s08_loadRowData: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// ניווט דינמי — טעינת שורה לפי מספר
// ══════════════════════════════════════════════════════════════════

function s08_loadRowByNumber(rowNum, skipDirection, includeDuplicates) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return { error: true, msg: "גליון 'ניהול_מיילים' לא נמצא" };

    const lastRow = sheet.getLastRow();

    if (rowNum < 2 || rowNum > lastRow) {
      return { error: true, msg: "שורה " + rowNum + " מחוץ לטווח (2–" + lastRow + ")" };
    }

    let targetRow = rowNum;

    // [v1.0.13] Task 111 — בניווט Prev/Next (skipDirection=1 או -1 בלבד)
    // מדלגים על שורות שR שלהן מתחיל ב"כפול מאושר" (זיהוי S07 מבוסס תוכן) —
    // אין טעם באימות ידני לזוג כפול. קפיצה ידנית (jumpToRow, ללא skipDirection)
    // תמיד טוענת את השורה המבוקשת במדויק, בלי דילוג.
    // [Task 166] includeDuplicates=true (checkbox "כלול כפולים" בסיידבר)
    // מבטל את הדילוג האוטומטי — כל שורה נטענת, כולל "כפול מאושר".
    // ברירת מחדל (undefined/false) שומרת על ההתנהגות המקורית (Task 111).
    if ((skipDirection === 1 || skipDirection === -1) && !includeDuplicates) {
      while (targetRow >= 2 && targetRow <= lastRow) {
        const rText = (sheet.getRange(targetRow, 18).getValue() || "").toString().trim();
        if (rText.indexOf("כפול מאושר") !== 0) break;
        targetRow += skipDirection;
      }
      if (targetRow < 2 || targetRow > lastRow) {
        return { error: true, msg: "אין עוד שורות זמינות לאימות בכיוון זה (כל השורות הנותרות מסומנות ככפול מאושר)" };
      }
    }

    const rowData = _s08_getRowData(sheet, targetRow);
    const noTxt   = !rowData.txtUrl;

    PropertiesService.getScriptProperties().setProperty(
      "S08_CURRENT_ROW_DATA",
      JSON.stringify({ row: targetRow, data: rowData })
    );

    s08_highlightActiveRow(targetRow);

    return {
      row:     targetRow,
      data:    rowData,
      lastRow: lastRow,
      noTxt:   noTxt
    };
  } catch (e) {
    Logger.log("s08_loadRowByNumber: " + e.message);
    return { error: true, msg: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// סימון שורה פעילה בגליון — עמודה A
// ══════════════════════════════════════════════════════════════════

function s08_highlightActiveRow(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, 1, lastRow - 1, 1).setBackground(null);
    }

    // [v1.0.14] Task 105 — setActiveRange נכשל (שגיאה גנרית/ריקה בצד
    // הלקוח) כשהשורה מוסתרת ע"י מסנן (filter) פעיל בגליון — מגבלה ידועה
    // של Sheets API. בודקים מראש ומדלגים על ההדגשה החזותית אם השורה
    // מוסתרת — אין אובדן מידע: המשתמש לא רואה אותה בגליון ממילא, וה-
    // Sidebar עצמו ממשיך להציג את הנתונים כרגיל (row/data כבר הוחזרו).
    if (sheet.isRowHiddenByFilter(row)) {
      Logger.log("[S08] s08_highlightActiveRow — שורה " + row + " מוסתרת ע\"י מסנן, מדלג על setActiveRange.");
      return;
    }

    sheet.getRange(row, 1).setBackground("#bbdefb");
    sheet.setActiveRange(sheet.getRange(row, 1));
  } catch (e) {
    Logger.log("s08_highlightActiveRow: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.9] חיפוש שורה כפולה ישירות בגיליון ניהול_מיילים
// ══════════════════════════════════════════════════════════════════

function s08_findDuplicateInSheet(issuer, category, currentRow) {
  try {
    if (!issuer || !category) return null;
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return null;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const issuerVals   = sheet.getRange(2, 10, lastRow - 1, 1).getValues();
    const categoryVals = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
    for (let i = 0; i < issuerVals.length; i++) {
      const rowNum = i + 2;
      if (rowNum === currentRow) continue;
      if (
        issuerVals[i][0].toString().trim()   === issuer.trim()   &&
        categoryVals[i][0].toString().trim() === category.trim()
      ) {
        return { dupRow: rowNum };
      }
    }
    return null;
  } catch (e) {
    Logger.log("s08_findDuplicateInSheet: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.9] חיפוש כפול אוטומטי בגיליון דוגמאות_למידה לפי מנפיק+קטגוריה
// ══════════════════════════════════════════════════════════════════

function s08_findLearningDuplicate(issuer, category) {
  try {
    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const learnSheet = ss.getSheetByName("דוגמאות_למידה");
    if (!learnSheet) return null;

    // [Task 154] תיקון באג שורש: FIRST_DATA_ROW (5) במקום "2" קשיח.
    // לאחר מיגרציית Task 154 (הזזת נתונים 1→4 ב-COLUMN_MAP.gs), שורה 2
    // היא שורת הקפאה — לא נתונים. זהה לתיקון ב-_getLearningExamples_S07
    // (S07_Classify.gs, Task 156).
    const firstDataRow = SHEET_CONFIG["דוגמאות_למידה"].FIRST_DATA_ROW;
    const lastRow = learnSheet.getLastRow();
    if (lastRow < firstDataRow) return null;

    const numRows  = lastRow - firstDataRow + 1;
    const existing = learnSheet.getRange(firstDataRow, 1, numRows, 3).getValues();
    for (let i = 0; i < existing.length; i++) {
      if (
        existing[i][1] && existing[i][2] &&
        existing[i][1].toString().trim() === (issuer   || "").trim() &&
        existing[i][2].toString().trim() === (category || "").trim()
      ) {
        return {
          dupRow:          i + firstDataRow,
          matchedIssuer:   existing[i][1].toString().trim(),
          matchedCategory: existing[i][2].toString().trim()
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log("s08_findLearningDuplicate: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.6-א] שליפת תוכן קובץ TXT דרך GAS — עוקף הרשאת iframe
// ══════════════════════════════════════════════════════════════════

function s08_fetchTxtContent(txtUrl) {
  try {
    if (!txtUrl) return { success: false, msg: "אין כתובת TXT" };

    // שליפת File ID מהכתובת
    let fileId = null;
    const m1 = txtUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];
    const m2 = txtUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];

    if (!fileId) {
      // ניסיון לקרוא ישירות כ-URL
      const resp = UrlFetchApp.fetch(txtUrl, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) {
        return { success: true, content: resp.getContentText("UTF-8") };
      }
      return { success: false, msg: "לא ניתן לשלוף את הקובץ" };
    }

    // קריאה דרך Drive API
    const file    = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString("UTF-8");
    return { success: true, content: content };

  } catch (e) {
    Logger.log("s08_fetchTxtContent: " + e.message);
    return { success: false, msg: "שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.15] Task — שליפת מספר מילים מתוך כותרת קובץ TXT (לחיזוק חשד כפילות)
// אותה שיטת שליפה כמו _qa_fetchTxtWordCount_E25 ב-S11_QArun.gs, לעקביות
// ══════════════════════════════════════════════════════════════════
function _s08_fetchTxtWordCount(txtUrl) {
  try {
    if (!txtUrl) return null;
    let fileId = null;
    const m1 = txtUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];
    const m2 = txtUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
    if (!fileId) return null;

    const content = DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
    const match   = content.match(/מספר_מילים:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch (e) {
    Logger.log("_s08_fetchTxtWordCount: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// שליפת נתוני שורת כפול להשוואה
// ══════════════════════════════════════════════════════════════════

function s08_getDuplicateRowData(duplicateFlag, currentRow) {
  try {
    if (!duplicateFlag || !currentRow) return null;
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    // [v1.0.21] Task 133 — קריאת File_ID מעמודה 27 (Duplicate_Target_FileID)
    // במקום Note על תא R
    const fileId = (sheet.getRange(currentRow, 27).getValue() || "").toString().trim();
    if (!fileId) return null;

    // חיפוש File_ID בעמודה A לקבלת מספר שורה עדכני
    const colA   = sheet.getRange(5, 1, sheet.getLastRow() - 4, 1).getValues();
    const idx    = colA.findIndex(function(r) { return r[0] === fileId; });
    if (idx === -1) return null;
    const actualRow = idx + 5;  // offset: FIRST_DATA_ROW=5 → index 0

    // [v1.0.15] מספר מילים — משורת ה"תאום" וגם משורה הנוכחית, להשוואה ישירה
    const dupTxtUrl     = sheet.getRange(actualRow, 24).getValue()  || "";
    const currentTxtUrl = sheet.getRange(currentRow, 24).getValue() || "";
    const wordCount        = _s08_fetchTxtWordCount(dupTxtUrl);
    const currentWordCount = _s08_fetchTxtWordCount(currentTxtUrl);

    // [v1.0.16] Task 124 — sourceUrl של שורת התאום, לתצוגת שני מסמכי מקור
    // (Task 125). אותה לוגיקת fallback בדיוק כמו ב-_s08_getRowData.
    const dupFileId    = (sheet.getRange(actualRow, 1).getValue() || "").toString().trim();
    const dupSourceUrl = (sheet.getRange(actualRow, 23).getValue() || "").toString().trim() ||
                         (dupFileId ? "https://drive.google.com/file/d/" + dupFileId + "/view" : "");

    return {
      row:               actualRow,
      title:             sheet.getRange(actualRow, 9).getValue()  || "—",
      issuer:            sheet.getRange(actualRow, 10).getValue() || "—",
      fileSize:          sheet.getRange(actualRow, 16).getValue() || "—",
      wordCount:         wordCount !== null ? wordCount : "—",
      currentWordCount:  currentWordCount !== null ? currentWordCount : "—",
      sourceUrl:         dupSourceUrl,
      txtUrl:            dupTxtUrl
    };
  } catch (e) {
    Logger.log("s08_getDuplicateRowData: " + e.message);
    return null;
  }
}
// ══════════════════════════════════════════════════════════════════
// [v1.0.16] Task 124 — ביטול חשד כפילות (סימטרי, בלי מחיקת נתונים)
// ══════════════════════════════════════════════════════════════════

function s08_cancelDuplicateFlag(currentRow, dupRow) {
  try {
    if (!currentRow || !dupRow) {
      return { success: false, msg: "❌ חסרים מספרי שורה" };
    }
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    // [v1.0.21] Task 133 — ניקוי R (Duplicate_Flag) + עמודה 27 — בשתי השורות,
    // סימטרית במלואה (במקום R+Note)
    sheet.getRange(currentRow, 18).clearContent();
    sheet.getRange(currentRow, 27).setValue("");
    sheet.getRange(dupRow, 18).clearContent();
    sheet.getRange(dupRow, 27).setValue("");

    // [v1.0.25] Task 155(א) (בקשת עמוס) — כתיבת V (22, QA_Dismiss_Note)
    // בשתי השורות: מונעת לולאת-דגל-חוזר. לפני התיקון, R הריק שנוצר כאן
    // הוא בדיוק התנאי לכניסה של E32 (S11_QArun.gs) ושל
    // _calculateDuplicates_S07 (S07_Classify.gs) — כך שאותה כפילות
    // שנדחתה כרגע הייתה יכולה להיות מזוהה שוב בסריקה/סיווג הבאים.
    const dismissText = "נבדק ידנית — לא רלוונטי (כפול)";
    sheet.getRange(currentRow, 22).setValue(dismissText);
    sheet.getRange(dupRow, 22).setValue(dismissText);

    Logger.log("[S08] Task 124/155 — בוטל חשד כפילות בין שורה " + currentRow + " לשורה " + dupRow + " (R+עמודה27 נוקו, V סומנה בשתיהן).");
    return { success: true, msg: "✅ חשד הכפילות בוטל — R נוקה, V סומנה 'לא רלוונטי' בשתי השורות (" + currentRow + " ו-" + dupRow + ")" };
  } catch (e) {
    Logger.log("[S08] שגיאה ב-s08_cancelDuplicateFlag: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.26] Task 155(ב) — ביטול חשד לוגו/ריק (E25) וטקסט פגום (E31)
// אותו עיקרון בדיוק כמו s08_cancelDuplicateFlag (Task 155(א)) —
// כתיבת V (22, QA_Dismiss_Note) מונעת לולאת-דגל-חוזר.
// ══════════════════════════════════════════════════════════════════

function s08_cancelLogoEmptyFlag(row) {
  try {
    if (!row) return { success: false, msg: "❌ חסר מספר שורה" };
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    // מנקה את דגל E25 מ-U (מסלול א', שורה חדשה) אם קיים
    const currentU = (sheet.getRange(row, 21).getValue() || "").toString();
    if (currentU.indexOf("E25") !== -1) {
      sheet.getRange(row, 21).clearContent();
    }
    // מנקה את הדגל הישן מ-R (מסלול ב', "חשוד כלוגו/ריק") אם קיים
    const currentR = (sheet.getRange(row, 18).getValue() || "").toString().trim();
    if (currentR === "חשוד כלוגו/ריק") {
      sheet.getRange(row, 18).clearContent();
    }

    // כתיבת V — מונעת מ-E25 לזהות מחדש את אותה שורה בסריקה הבאה
    sheet.getRange(row, 22).setValue("נבדק ידנית — לא רלוונטי (לוגו/ריק)");

    Logger.log("[S08] Task 155(ב) — בוטל חשד לוגו/ריק בשורה " + row + " (U/R נוקו, V סומנה).");
    return { success: true, msg: "✅ חשד לוגו/ריק בוטל בשורה " + row };
  } catch (e) {
    Logger.log("[S08] שגיאה ב-s08_cancelLogoEmptyFlag: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

function s08_cancelCorruptedTextFlag(row) {
  try {
    if (!row) return { success: false, msg: "❌ חסר מספר שורה" };
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    // מנקה את דגל E31 מ-U אם קיים (E31 נכתב רק ל-U, אין מסלול R)
    const currentU = (sheet.getRange(row, 21).getValue() || "").toString();
    if (currentU.indexOf("E31") !== -1) {
      sheet.getRange(row, 21).clearContent();
    }

    // כתיבת V — מונעת מ-E31 לזהות מחדש את אותה שורה בסריקה הבאה
    sheet.getRange(row, 22).setValue("נבדק ידנית — לא רלוונטי (טקסט פגום)");

    Logger.log("[S08] Task 155(ב) — בוטל חשד טקסט פגום בשורה " + row + " (U נוקה, V סומנה).");
    return { success: true, msg: "✅ חשד טקסט פגום בוטל בשורה " + row };
  } catch (e) {
    Logger.log("[S08] שגיאה ב-s08_cancelCorruptedTextFlag: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}
// ══════════════════════════════════════════════════════════════════
// [v1.0.29] Tasks 168+169 — "עזרה ראשונה" מ-S08 לחשדות E31/E25, כמקביל
// הפוך לשתי הפונקציות שמעליהן: שם במקום לבטל את החשד — מתקנים בפועל.
// s08_resetCorruptedTextForReconvert (E31): מוחקת את קובץ ה-TXT הפגום
// מ-Drive (משתמשת ב-_s08_trashDriveFile הקיימת, Task 114), מנקה TXT_URL
// ו-Error_Code/Detail, ומחזירה Pipeline_Status ל-"ממתין להמרה ל-TXT" —
// כל תנאי הכניסה של S06._processBatch (תנאים 2/3/4) מתקיימים, כך שהשורה
// תיכנס אוטומטית לתור ההמרה הבא. אינה קוראת ל-S06 ישירות — S06 עדיין
// היחיד שמריץ המרה בפועל, לפי אותה שיטת עבודה קיימת (batch/ידני).
// s08_confirmLogoEmptyFlag (E25): כותבת ישירות ל-R "מאושר למחיקה", כדי
// שהשורה תיכנס לתור s08_deleteApproved הקיים — לא מוחקת בעצמה.
// ══════════════════════════════════════════════════════════════════

function s08_confirmLogoEmptyFlag(row) {
  try {
    if (!row) return { success: false, msg: "❌ חסר מספר שורה" };
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    // מנקה את דגל E25 מ-U אם קיים — R לוקח מעתה עדיפות סמנטית
    const currentU = (sheet.getRange(row, 21).getValue() || "").toString();
    if (currentU.indexOf("E25") !== -1) {
      sheet.getRange(row, 21).clearContent();
    }

    // כתיבת R — מסמנת את השורה לתור המחיקה המרוכזת (s08_deleteApproved)
    sheet.getRange(row, 18).setValue("מאושר למחיקה — לוגו/ריק (אושר ידנית)");

    Logger.log("[S08] Task 169 — אושר חשד לוגו/ריק בשורה " + row + " (R סומנה למחיקה, U נוקה).");
    return { success: true, msg: "✅ שורה " + row + " סומנה למחיקה (לוגו/ריק)" };
  } catch (e) {
    Logger.log("[S08] שגיאה ב-s08_confirmLogoEmptyFlag: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

function s08_resetCorruptedTextForReconvert(row) {
  try {
    if (!row) return { success: false, msg: "❌ חסר מספר שורה" };
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    // מוחקת את קובץ ה-TXT הפגום מ-Drive (פונקציית עזר קיימת, Task 114)
    const txtUrl   = sheet.getRange(row, 24).getValue();
    const txtTrash = _s08_trashDriveFile(txtUrl);
    if (!txtTrash.success) {
      return { success: false, msg: "❌ מחיקת קובץ TXT מ-Drive נכשלה: " + txtTrash.msg };
    }

    // מנקה TXT_URL — תנאי 2 ב-S06._processBatch (חייב להיות ריק לעיבוד מחדש)
    sheet.getRange(row, 24).clearContent();

    // מחזירה Pipeline_Status לממתין — כדי שתנאי 3 ב-S06._processBatch לא ידלג
    sheet.getRange(row, 13).setValue("ממתין להמרה ל-TXT");

    // מנקה Error_Code/Error_Detail — תנאי 4 ב-S06._processBatch, מונע דילוג
    sheet.getRange(row, 19).clearContent();
    sheet.getRange(row, 20).clearContent();

    // [Task 176] מנקה גם Doc_Title/Doc_Issuer/Doc_Date/Doc_Category/
    // Extraction_Status/Complexity — כל הפלט של S07. שדות אלו עלולים
    // להישאר עם ערכים ישנים/כוזבים (למשל 'לא זוהה'/'חולץ מלא' משריד
    // סיווג קודם שנכשל) עד שS07 ירוץ שוב על ה-TXT החדש (S07 ידני
    // בלבד — לא רץ אוטומטית אחרי S06). בלי הניקוי, השורה נשארת
    // במצב לא-עקבי בין האיפוס לסיווג-מחדש: הטופס ב-S08 מציג נתונים
    // ישנים כאילו הם עדכניים, ו-E27 עלולה לדווח שווא בינתיים.
    sheet.getRange(row, 9).clearContent();  // Doc_Title
    sheet.getRange(row, 10).clearContent(); // Doc_Issuer
    sheet.getRange(row, 11).clearContent(); // Doc_Date
    sheet.getRange(row, 12).clearContent(); // Doc_Category
    sheet.getRange(row, 14).clearContent(); // Extraction_Status
    sheet.getRange(row, 17).clearContent(); // Complexity
    // מנקה את דגל E31 מ-U — כבר לא רלוונטי, S11 יבדוק מחדש אחרי ההמרה
    const currentU = (sheet.getRange(row, 21).getValue() || "").toString();
    if (currentU.indexOf("E31") !== -1) {
      sheet.getRange(row, 21).clearContent();
    }

    Logger.log("[S08] Task 168 — שורה " + row + ": TXT נמחק מ-Drive, Pipeline_Status אופס להמרה מחדש.");
    return { success: true, msg: "✅ TXT נמחק, שורה " + row + " הוחזרה לתור המרת S06" };
  } catch (e) {
    Logger.log("[S08] שגיאה ב-s08_resetCorruptedTextForReconvert: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 1 — אישור
// ══════════════════════════════════════════════════════════════════

function s08_approve(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet || row < 2 || row > sheet.getLastRow()) {
      return { success: false, msg: "❌ שורת האימות אינה זמינה" };
    }
    sheet.getRange(row, 13).setValue("מאושר");
    sheet.getRange(row, 21).setValue("✅ אושר ידנית");
    Logger.log("[S08] אישור שורה " + row);
    return { success: true, msg: "✅ השורה אושרה בהצלחה" };
  } catch (e) {
    Logger.log("[S08] שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 2 — עדכון ולמידה
// ══════════════════════════════════════════════════════════════════

function s08_updateAndLearn(row, title, issuer, date, category, note) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    const existingLearning = s08_findLearningDuplicate(issuer, category);
    if (existingLearning) {
      return {
        success: false,
        isDuplicate: true,
        msg: '⚠️ קיימת כבר דוגמת למידה תואמת בשורה ' + existingLearning.dupRow
      };
    }
    sheet.getRange(row, 9).setValue(title     || "");
    sheet.getRange(row, 10).setValue(issuer   || "");
    sheet.getRange(row, 11).setValue(date     || "");
    sheet.getRange(row, 12).setValue(category || "");
    sheet.getRange(row, 13).setValue("מאושר");
    sheet.getRange(row, 21).setValue("נשלח ללמידה");
    const learnResult = _s08_saveToLearning(sheet, row, title, issuer, category, date, note);
    if (!learnResult.success) return learnResult;
    Logger.log("[S08] עדכון ולמידה שורה " + row);
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate ? learnResult.msg : "💾 עדכון בוצע ונשלח לגיליון הלמידה"
    };
  } catch (e) {
    Logger.log("[S08] שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 3 — למידה יזומה
// ══════════════════════════════════════════════════════════════════

function s08_learnOnly(row, title, issuer, date, category, note) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    const existingLearning = s08_findLearningDuplicate(issuer, category);
    if (existingLearning) {
      return {
        success: false,
        isDuplicate: true,
        msg: '⚠️ קיימת כבר דוגמת למידה תואמת בשורה ' + existingLearning.dupRow
      };
    }
    sheet.getRange(row, 21).setValue("נשלח ללמידה");
    const learnResult = _s08_saveToLearning(sheet, row, title, issuer, category, date, note);
    if (!learnResult.success) return learnResult;
    Logger.log("[S08] למידה יזומה שורה " + row);
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate ? learnResult.msg : "🧠 דוגמת למידה נוצרה בהצלחה"
    };
  } catch (e) {
    Logger.log("[S08] שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// שמירה לגיליון דוגמאות_למידה — כולל בדיקת כפילות
// ══════════════════════════════════════════════════════════════════

function _s08_saveToLearning(sheet, row, title, issuer, category, date, note) {
  try {
    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const learnSheet = ss.getSheetByName("דוגמאות_למידה");
    if (!learnSheet) return { success: false, msg: "❌ גליון 'דוגמאות_למידה' לא נמצא" };

    // [Task 154] תיקון באג שורש: FIRST_DATA_ROW (5) במקום "2" קשיח —
    // זהה לתיקון ב-s08_findLearningDuplicate למעלה.
    const firstDataRow = SHEET_CONFIG["דוגמאות_למידה"].FIRST_DATA_ROW;
    const lastRow = learnSheet.getLastRow();
    if (lastRow >= firstDataRow) {
      const numRows  = lastRow - firstDataRow + 1;
      const existing = learnSheet.getRange(firstDataRow, 1, numRows, 3).getValues();
      for (let i = 0; i < existing.length; i++) {
        if (
          existing[i][1] && existing[i][2] &&
          existing[i][1].toString().trim() === (issuer   || "").trim() &&
          existing[i][2].toString().trim() === (category || "").trim()
        ) {
          const dupLearnRow     = i + firstDataRow;
          const matchedIssuer   = existing[i][1].toString().trim();
          const matchedCategory = existing[i][2].toString().trim();
          return {
            success:         true,
            isDuplicate:     true,
            dupRow:          dupLearnRow,
            matchedIssuer:   matchedIssuer,
            matchedCategory: matchedCategory,
            msg:             '⚠️ כפל חשוד — שורה ' + dupLearnRow + ' | מנפיק: "' + matchedIssuer + '" | קטגוריה: "' + matchedCategory + '"'
          };
        }
      }
    }

    const fileId     = sheet.getRange(row, 1).getValue()  || "";
    const complexity = sheet.getRange(row, 17).getValue() || "";
    const txtUrl     = sheet.getRange(row, 24).getValue() || "";

    learnSheet.appendRow([
      title      || "",
      issuer     || "",
      category   || "",
      txtUrl     || "",
      fileId     || "",
      complexity || "",
      date       || "",
      note       || ""
    ]);

    return { success: true, isDuplicate: false, msg: "✅ נשמר בגיליון הלמידה" };
  } catch (e) {
    Logger.log("[S08] שגיאת למידה: " + e.message);
    return { success: false, msg: "❌ שגיאה בשמירת למידה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 4 — מחיקה
// ══════════════════════════════════════════════════════════════════

function s08_delete(row, deleteWhich) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    const targetRow = (deleteWhich === "original") ?
      _s08_getDuplicateRowNumber(sheet, row) : row;

    if (!targetRow || targetRow < 2) {
      return { success: false, msg: "❌ לא ניתן לאתר את השורה למחיקה" };
    }

    const sourceUrl = sheet.getRange(targetRow, 23).getValue();
    const txtUrl    = sheet.getRange(targetRow, 24).getValue();

    const sourceTrash = _s08_trashDriveFile(sourceUrl);
    const txtTrash    = _s08_trashDriveFile(txtUrl);
    if (!sourceTrash.success || !txtTrash.success) {
      return {
        success: false,
        msg: "❌ המחיקה בוטלה: " + [sourceTrash.msg, txtTrash.msg].filter(Boolean).join("; ")
      };
    }

    // [v1.0.18] Task 123 — סיבת השורש האמיתית (זוהתה ע"י עמוס): פילטר
    // בסיסי (Range.createFilter, נוצר ב-switchView ב-ViewEngine.gs) קשור
    // לטווח שורות קבוע שנקבע פעם אחת בפתיחת המבט. מחיקת שורה בתוך הטווח
    // הזה בזמן שהפילטר עדיין פעיל היא תקלה מתועדת של Google Sheets —
    // הטווח הפנימי של הפילטר לא מתעדכן, ומשאיר את הגליון במצב לא עקבי
    // שגורם לקריאות getRange מוזרות/לא צפויות בהמשך (Task 123 — "לא נמצאו
    // נתוני שורה" אחרי מחיקה+ניווט). אותו דפוס הגנה בדיוק כמו ב-switchView
    // וב-_doExpand (ViewEngine.gs) — הסרת הפילטר לפני שינוי מבני בגליון.
    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
      SpreadsheetApp.flush();
    }

    sheet.deleteRow(targetRow);

    // [v1.0.12] Task 109 — תיקון רפרנסים מיידי אחרי מחיקה אמיתית
    s08_fixReferencesAfterDelete();

    // [v1.0.17] Task 123 — מבטיח שהמחיקה + תיקון הרפרנסים נכתבים במלואם
    // ל-Sheet לפני שהתשובה חוזרת ללקוח (שעלול לירות קריאה נוספת תוך כ-900ms)
    SpreadsheetApp.flush();

    // [v1.0.24] Task 127 סעיף (3) — תיקון שורש לניווט שגוי אחרי מחיקת
    // שורת תאום: כש-deleteWhich="original" נמחקה targetRow (שורת התאום),
    // לא row (השורה שהמשתמש עמד עליה) — יש לחזור ל-row, לא ל-targetRow.
    // אם targetRow הייתה מעל row, כל המספור מתחתיה זז מעלה ב-1.
    let returnRow;
    if (deleteWhich === "original") {
      returnRow = (targetRow < row) ? row - 1 : row;
    } else {
      returnRow = targetRow;
    }
    returnRow = Math.max(
      SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW,
      Math.min(returnRow, sheet.getLastRow())
    );

    Logger.log("[S08] מחיקת שורה " + targetRow);
    return {
      success: true,
      nextRow: returnRow,
      msg: "🗑️ השורה והקבצים נמחקו בהצלחה"
    };
  } catch (e) {
    Logger.log("[S08] שגיאת מחיקה: " + e.message);
    return { success: false, msg: "❌ שגיאה במחיקה: " + e.message };
  }
}
function _s08_trashDriveFile(url) {
  try {
    if (!url) return { success: true, msg: "" };
    let id = null;
    if (url.includes("/d/"))  id = url.split("/d/")[1].split("/")[0];
    if (url.includes("id=")) id = url.split("id=")[1].split("&")[0];
    if (!id) return { success: false, msg: "כתובת קובץ לא תקינה" };
    DriveApp.getFileById(id).setTrashed(true);
    return { success: true, msg: "" };
  } catch (e) {
    Logger.log("[S08] לא ניתן למחוק קובץ: " + e.message);
    return { success: false, msg: e.message };
  }
}

function _s08_getDuplicateRowNumber(sheet, currentRow) {
  // [v1.0.21] Task 133 — קריאת File_ID מעמודה 27 → חיפוש בעמודה A
  const fileId = (sheet.getRange(currentRow, 27).getValue() || "").toString().trim();
  if (!fileId) return null;
  const colA   = sheet.getRange(5, 1, sheet.getLastRow() - 4, 1).getValues();
  const idx    = colA.findIndex(function(r) { return r[0] === fileId; });
  return idx === -1 ? null : idx + 5;
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.20] Task 118-נגזרת — תצוגה מקדימה בלבד (ללא כתיבה/מחיקה)
// נקראת מה-Sidebar לפני אישור, כדי להציג לעמוס בדיוק אילו שורות יימחקו
// לפני שהוא מאשר סופית. אותה לוגיקת סריקה בדיוק כמו תחילת
// s08_deleteApproved — קריאה בלבד, ללא שום פעולת כתיבה.
// ══════════════════════════════════════════════════════════════════

function s08_previewApprovedForDeletion() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return { success: false, msg: "❌ גליון 'ניהול_מיילים' לא נמצא", rows: [] };

    const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
    const lastRow  = sheet.getLastRow();
    if (lastRow < firstRow) return { success: true, msg: "אין נתונים בגליון", rows: [] };

    const numRows = lastRow - firstRow + 1;
    const rValues = sheet.getRange(firstRow, 18, numRows, 1).getValues();

    const rows = [];
    for (let i = 0; i < numRows; i++) {
      const rText = (rValues[i][0] || "").toString().trim();
      if (rText.indexOf("מאושר למחיקה") === 0) {
        rows.push({ row: firstRow + i, reason: rText });
      }
    }

    return { success: true, msg: rows.length + " שורות מסומנות למחיקה", rows: rows };
  } catch (e) {
    Logger.log("[S08] שגיאת s08_previewApprovedForDeletion: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message, rows: [] };
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.12] Task 114 — מחיקה מרוכזת של שורות "מאושר למחיקה"
// נקודת המחיקה המרכזית היחידה יחד עם s08_delete — S11 עצמו לא מוחק בשום מקרה.
// [v1.0.20] מחוברת כעת לראשונה לממשק — כפתור "🗑️ מחק מאושרות" ב-Sidebar,
// מאחורי מודל אישור מפורש (S08_Sidebar.html: confirmDeleteApproved).
// הלוגיקה הפנימית של הפונקציה עצמה לא השתנתה כלל.
// ══════════════════════════════════════════════════════════════════

function s08_deleteApproved() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return { success: false, msg: "❌ גליון 'ניהול_מיילים' לא נמצא" };

    const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
    const lastRow  = sheet.getLastRow();
    if (lastRow < firstRow) return { success: true, msg: "אין נתונים בגליון", deleted: 0 };

    const numRows = lastRow - firstRow + 1;
    const rValues = sheet.getRange(firstRow, 18, numRows, 1).getValues();

    const rowsToDelete = [];
    for (let i = 0; i < numRows; i++) {
      const rText = (rValues[i][0] || "").toString().trim();
      if (rText.indexOf("מאושר למחיקה") === 0) {
        rowsToDelete.push(firstRow + i);
      }
    }

    if (rowsToDelete.length === 0) {
      return { success: true, msg: "✅ לא נמצאו שורות מאושרות למחיקה", deleted: 0 };
    }

    // מיון יורד — מחיקה מלמטה למעלה כדי לא לשבש מספרי שורה באמצע הריצה
    rowsToDelete.sort(function(a, b) { return b - a; });

    // [v1.0.18] Task 123 — אותה הגנה בדיוק כמו ב-s08_delete: הסרת פילטר
    // פעיל לפני מחיקות שורה מרובות (ראו הסבר מלא ב-s08_delete למעלה).
    const existingFilterBulk = sheet.getFilter();
    if (existingFilterBulk) {
      existingFilterBulk.remove();
      SpreadsheetApp.flush();
    }

    let deletedCount = 0;
    let failedRows = [];
    rowsToDelete.forEach(function(row) {
      try {
        const sourceUrl = sheet.getRange(row, 23).getValue();
        const txtUrl    = sheet.getRange(row, 24).getValue();
        const sourceTrash = _s08_trashDriveFile(sourceUrl);
        const txtTrash    = _s08_trashDriveFile(txtUrl);
        if (!sourceTrash.success || !txtTrash.success) {
          Logger.log("[S08] s08_deleteApproved — דולגה שורה " + row + " בגלל כשל Drive");
          failedRows.push(row);
          return;
        }
        sheet.deleteRow(row);
        deletedCount++;
        Logger.log("[S08] s08_deleteApproved — נמחקה שורה " + row);
      } catch (rowErr) {
        Logger.log("[S08] s08_deleteApproved — שגיאה בשורה " + row + ": " + rowErr.message);
      }
    });

    // [Task 109] תיקון רפרנסים מיידי אחרי כל מחיקה אמיתית
    s08_fixReferencesAfterDelete();
    SpreadsheetApp.flush();

    return {
      success: failedRows.length === 0,
      msg: failedRows.length === 0
        ? "🗑️ נמחקו " + deletedCount + " שורות מאושרות"
        : "⚠️ נמחקו " + deletedCount + " שורות. שורות שלא נמחקו בגלל כשל Drive: " + failedRows.join(", "),
      deleted: deletedCount,
      failed: failedRows,
      nextRow: Math.min(firstRow, sheet.getLastRow())
    };
  } catch (e) {
    Logger.log("[S08] שגיאת s08_deleteApproved: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.12] Task 109 — תיקון רפרנסים מיידי אחרי מחיקה אמיתית
// לוגיקה מקבילה ל-E21 ב-S11_QArun.gs, מקומית לקובץ זה בלבד.
// ══════════════════════════════════════════════════════════════════

function s08_fixReferencesAfterDelete() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return;

    const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
    const lastRow  = sheet.getLastRow();
    if (lastRow < firstRow) return;

    const numRows      = lastRow - firstRow + 1;
    const colAVals     = sheet.getRange(firstRow, 1, numRows, 1).getValues();
    const rVals        = sheet.getRange(firstRow, 18, numRows, 1).getValues();
    const col27Vals    = sheet.getRange(firstRow, 27, numRows, 1).getValues();
    const captureVals  = sheet.getRange(firstRow, 2, numRows, 1).getValues(); // B=2 — Capture_Date

    // מפת File_ID → שורה נוכחית, לפי המצב האמיתי אחרי המחיקה
    const fileIdRowMap = {};
    colAVals.forEach(function(r, i) {
      const fid = (r[0] || "").toString().trim();
      if (fid) fileIdRowMap[fid] = firstRow + i;
    });

    // [Task 165] קיבוץ שורות-יתומות לפי היעד המשותף שנמחק — שורות
    // ששיתפו אותו col27 (שהצביע על עוגן שנמחק פיזית) הן עדיין קבוצת
    // כפילות אחת, וזקוקות לעוגן חדש, לא רק לניקוי. יעד עם שורד יחיד =
    // באמת אין עוד כפילות לשמר, מנוקה כמו קודם.
    const orphansByDeadTarget = {};
    for (let i = 0; i < numRows; i++) {
      const row     = firstRow + i;
      const fileId  = (colAVals[i][0]  || "").toString().trim();
      const rText   = (rVals[i][0]     || "").toString().trim();
      const col27Id = (col27Vals[i][0] || "").toString().trim();
      if (!fileId || !rText || !col27Id) continue;
      if (fileIdRowMap[col27Id]) continue; // היעד עדיין קיים — לא יתום

      if (!orphansByDeadTarget[col27Id]) orphansByDeadTarget[col27Id] = [];
      orphansByDeadTarget[col27Id].push({ row: row, fileId: fileId, captureRaw: captureVals[i][0] });
    }

    let fixedCount = 0, promotedCount = 0;

    Object.keys(orphansByDeadTarget).forEach(function(deadTargetId) {
      const orphans = orphansByDeadTarget[deadTargetId];

      if (orphans.length === 1) {
        // יתום אמיתי — אין שורדים נוספים שהצביעו על אותו יעד. ניקוי כרגיל.
        const o = orphans[0];
        sheet.getRange(o.row, 18).clearContent();
        sheet.getRange(o.row, 27).setValue("");
        fixedCount++;
        Logger.log("[S08] s08_fixReferencesAfterDelete — שורה " + o.row + ": File_ID (" + deadTargetId + ") נמחק, ללא שורדים נוספים — R+עמודה27 נוקו");
        return;
      }

      // 2+ שורדים ששיתפו אותו יעד מת — קבוצת כפילות עדיין קיימת,
      // דורשת עוגן חדש: Capture_Date מוקדם ביותר, טיברייק File_ID
      // מינימלי (אותה גישה A שאושרה 07/08/2026).
      let anchor = null;
      orphans.forEach(function(o) {
        const captureDate = o.captureRaw ? new Date(o.captureRaw) : null;
        const captureTime = (captureDate && !isNaN(captureDate.getTime())) ? captureDate.getTime() : Infinity;
        if (!anchor || captureTime < anchor.captureTime ||
            (captureTime === anchor.captureTime && o.fileId < anchor.fileId)) {
          anchor = { row: o.row, fileId: o.fileId, captureTime: captureTime };
        }
      });

      orphans.forEach(function(o) {
        if (o.fileId === anchor.fileId) {
          // קידום לעוגן — הופך לרשומה קנונית, ללא סימון כפילות עצמי
          sheet.getRange(o.row, 18).clearContent();
          sheet.getRange(o.row, 27).setValue("");
        } else {
          // שורד רגיל — R נשאר, רק col27 מתעדכן להצביע על העוגן החדש
          sheet.getRange(o.row, 27).setValue(anchor.fileId);
        }
      });

      promotedCount++;
      fixedCount += orphans.length;
      Logger.log("[S08] s08_fixReferencesAfterDelete — קבוצה מול יעד מת (" + deadTargetId + "): קודם עוגן חדש בשורה " + anchor.row + " (" + anchor.fileId + "), " + (orphans.length - 1) + " שורדים עודכנו להצביע אליו");
    });

    Logger.log("[S08] s08_fixReferencesAfterDelete — נוקו/עודכנו " + fixedCount + " רפרנסים (" + promotedCount + " קידומי עוגן)");
  } catch (e) {
    Logger.log("[S08] שגיאת s08_fixReferencesAfterDelete: " + e.message);
  }
}
function _s08_formatDateForDisplay(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  const text = value.toString().trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[3] + "/" + iso[2] + "/" + iso[1] : text;
}
