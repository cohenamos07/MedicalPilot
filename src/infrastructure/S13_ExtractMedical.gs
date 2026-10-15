/**
 * @file        S13_ExtractMedical.gs
 * @version     1.4.0 | @updated 15/10/2026 21:40 | @service S13
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S13_ExtractMedical.gs
 * @description שירות חילוץ עמוק — קורא שורות מאומתות (Validation_Status="מאומת",
 *              Extraction_Status ריק) מיומן_אירועים_רפואי, מקבץ לפי File_ID
 *              (כל השורות המאומתות של אותו מסמך בקריאת Gemini אחת), ומפצל
 *              ל-5 גליונות היעד לפי Routing_Category. חלופה א' — מבוסס קודם
 *              על תוכן שורות היומן בלבד; נופל חזרה לטקסט TXT מלא (S06) רק
 *              אם Gemini מחזיר תשובה חלקית/ריקה. כולל מיפוי מערכות גוף
 *              (Enum SYS00-SYS14, היררכי) לתמיכה עתידית באווטאר/אינפוגרפיקה:
 *              בדיקת דם/בדיקה גנטית/מרשם תרופה מקבלים קוד מערכת קבוע
 *              (SYS06/SYS14/SYS00 בהתאמה, ללא שאילתת Gemini); מצב רפואי
 *              והנחיה מקבלים קוד דינמי שנקבע ע"י Gemini לכל שורה.
 *              [v1.4.0] מצב רפואי/ניתוח/כללי — Gemini מחזיר גם קודי קטלוג
 *              (מיפוי_קודים) לאיבר/אירוע/התמחות/חומרה/אבחנה/ודאות; כל קוד
 *              מאומת מול הקטלוג לפני כתיבה (Record_Status="חדש" — הצעה בלבד).
 * @impacts     יומן_אירועים_רפואי: קורא בלבד (A-L, [v1.3.1] עודכן מ-A-I, Task
 *              #205 — File_ID עבר לעמודה L), כותב Extraction_Status (I).
 *              בדיקות_דם/בדיקות_גנטיות/תרופות_קבועות/הנחיות_רפואיות_ומשימות/
 *              יומן_מצב_רפואי: כותב שורות חדשות (appendRow) בלבד, לא דורס.
 *              ניהול_מיילים: קורא בלבד (TXT_URL, fallback).
 *              [v1.4.0] יומן_מצב_רפואי: 22 עמודות (נוסף Organ_Code) + 10 שדות
 *              הקידוד. מיפוי_קודים: קורא בלבד, דרך _s16_readCatalogBlock
 *              (S16_ValidateMedicalStatus.gs — תלות, עם בדיקת typeof).
 * @callers     runS13ViewIconEvents (ViewEngine.gs, עמודה F ביומן_אירועים_רפואי)
 * @functions   runS13 | _s13_checkRow | _s13_getEligibleGroups | _s13_processSingleRow |
 *              _s13_processBatch | _s13_getSchemaBlock | _s13_fetchTxtUrlByFileId |
 *              _s13_fetchTxtContent | _s13_buildPrompt | _s13_normalizeDate |
 *              _s13_callGemini | _s13_buildRowValues | _s13_writeExtractedRow |
 *              _s13_processGroup | _s13_loadCatalog | _s13_validateCode
 * @changes     [v1.4.0] Task #220 שלב ב — קודי קטלוג מ-Gemini ליומן_מצב_רפואי:
 *              _s13_loadCatalog (חדשה) — טוען 6 בלוקי מיפוי_קודים דרך
 *              _s16_readCatalogBlock הקיימת (כמו ViewEngine.gs), עם בדיקת typeof
 *              ו-try/catch; לא זמינה → null והחילוץ ממשיך בלי קודים.
 *              _s13_validateCode (חדשה) — קוד נכתב רק אם קיים בקטלוג; איבר
 *              חייב להתחיל בקוד המערכת. _s13_getSchemaBlock — 6 שדות *_Code
 *              בענף ברירת המחדל. _s13_buildPrompt — פרמטר catalog; בלוק קטלוג
 *              + כללים (3) קוד מהרשימה בלבד, (4) המלצה אישית בלבד בלי מקרא
 *              כללי ("אין המלצה מפורשת בדוח"); נשלח רק כשיש שורה ליומן_מצב_
 *              רפואי; Medical_System של S09 מסומן "ייתכן שגוי". _s13_build-
 *              RowValues — 22 עמודות: קוד + שם מנורמל מהקטלוג, Medical_System_
 *              Name נגזר מקוד המערכת (לא מטקסט S09), קוד מערכת לא תקין → SYS00.
 *              _s13_processGroup — טוען קטלוג פעם אחת לכל File_ID ומעביר
 *              לפרומפט (כולל fallback) ול-ctx. אומת מול הקוד החי (diff מדויק,
 *              node --check), הדמיה, ובדיקת שטח על שורות 130 ו-137 ביומן
 *              האירועים (SYS11/SYS11A ו-SYS05/SYS05B למרות "אורולוגיה"/
 *              "אנדוקרינולוגיה" מ-S09).
 * @changes     [v1.3.3] Task #214b — _s13_buildRowValues, ענף ברירת המחדל
 *              (מצב רפואי / ניתוח/פעולה רפואית / כללי): מערך ההחזרה עודכן
 *              מ-15 ל-21 עמודות בפועל של יומן_מצב_רפואי, בעקבות מיגרציית
 *              המבנה (COLUMN_MAP.gs, task214a, 10/09/2026). S_Row (עמודה ח,
 *              8) נשאר ריק בכוונה — מחושב ע"י ViewEngine.gs/refreshMedical-
 *              StatusRows. 9 שדות הקידוד החדשים (Specialty_Name, Event_Code,
 *              Event_Description, Severity_Name, Diagnosis_Name, Diagnosis_
 *              Certainty ו-3 עמודות הקוד: Specialty_Code/Severity_Code/
 *              Diagnosis_Code) נשארים ריקים בכוונה — אינם נשאלים עדיין
 *              מ-Gemini בסכימה הנוכחית (_s13_getSchemaBlock); אכלוסם דורש
 *              הרחבת פרומפט נפרדת, מחוץ לתחום התיקון הזה. אומת מול הקוד
 *              החי (diff מדויק, node --check) ונבדק בשטח.
 * @changes     [v1.3.2] Task #210 — _s13_processGroup: נוסף medicalSystem
 *              ל-ctx (מ-eventRow.medicalSystem, S09) — היה קיים בפרומפט
 *              Gemini אך לא הועבר בפועל לבניית השורה. _s13_buildRowValues,
 *              ענף ברירת המחדל (מצב רפואי/ניתוח/כללי): תוקן סדר המערך
 *              המוחזר ל-15 העמודות בפועל של יומן_מצב_רפואי (COLUMN_MAP.gs,
 *              לאחר Task #206) — היה לא מיושר. עמודה 3 (Medical_System_Name)
 *              נכתבת כעת מ-ctx.medicalSystem בפועל. אומת מול הקוד החי (diff
 *              מדויק, node --check).
 * @changes     [v1.3.1] Task #205 — _s13_getEligibleGroups: sheet.getRange
 *              (firstDataRow, 1, numRows, 12) — הורחב ל-12 עמודות (A:L, היה
 *              A:I), בעקבות הוספת S_Row (7) ל-COLUMN_MAP.gs (v2.10.0). fileId
 *              נקרא כעת מ-rowData[11] (L, הועבר מ-G). _s13_processSingleRow:
 *              fileId = sheet.getRange(row, 12) (היה עמודה 7/G). Validation_
 *              Status (H/8) ו-Extraction_Status (I/9) — ללא שינוי, לא הוזזו.
 *              אומת מול הגליון החי (Step 5 של Task #205): 0 אי-התאמות.
 * @changes     [v1.3.0] המשך #189 — שיפור בהירות הודעות חסימה ב-_s13_checkRow:
 *          הפרדה מלאה בין שני מצבי חסימה שהיו משותפים לעטיפת הודעה גנרית אחת.
 *          🟡 "עדיין לא אומתה" (Validation_Status ריק) — מנוסח כמגבלת מדיניות
 *          נוכחית, לא איסור מהותי. 🔴 "חסומה — כבר חולצה" (Extraction_Status=
 *          "חולץ") — מנוסח כחסימה מלאה, כדי למנוע כפילות נתונים בגליונות
 *          המשניים. _s13_processSingleRow עודכנה להציג את check.reason ישירות
 *          במקום לעטוף אותו בהודעה גנרית. נבדק ואומת בשטח: שני התרחישים
 *          מציגים הודעה נכונה, ואין כתיבה לגליון בשני המקרים (הקוד חוזר לפני
 *          שלב הכתיבה).
 *          [v1.2.0] Task #189 — הוספת הגנה מפני הרצה כפולה: LockService.getScriptLock()
 *          עם tryLock(3000ms) בתחילת runS13() (עוטף את כל גוף הפונקציה בבלוק
 *          try/finally). אם הנעילה לא מתקבלת תוך 3 שניות — הרצה מקבילה כבר
 *          פעילה — מוצגת התראה והפונקציה יוצאת מיידית בלי לגעת בנתונים.
 *          סוגר את פער המרוץ: Extraction_Status="חולץ" נכתב רק בסוף
 *          _s13_processGroup (אחרי קריאת Gemini), כך שהרצה שנייה שמתחילה
 *          תוך כדי עיבוד לא הספיקה לתפוס את אותה קבוצה כ"זכאית" שוב.
 *          [v1.1.0] Task #188 הושלם במלואו — חיבור נקודת הכניסה בפועל
 *          (runS13 קורא ל-_s13_processGroup), הוספת מיפוי מערכות גוף
 *          (S13_BODY_SYSTEMS, SYS00-SYS14) עם קוד קבוע לבדיקת דם/גנטית/תרופה
 *          וקוד דינמי (Gemini) למצב רפואי/הנחיה. עמודת Medical_System נוספה
 *          בפועל ל-4 גליונות יעד (COLUMN_MAP.gs + הגליונות עצמם, סוף כל
 *          גליון) — יומן_מצב_רפואי לא נגע, כבר קיים לו Medical_System מקורי.
 */
const S13_SOURCE_SHEET = "יומן_אירועים_רפואי";

// מיפוי Routing_Category (מהאנום הסגור בן 7 הערכים) → גליון יעד
const S13_TARGET_SHEETS = {
  "בדיקת דם":              "בדיקות_דם",
  "בדיקה גנטית":           "בדיקות_גנטיות",
  "מרשם תרופה":            "תרופות_קבועות",
  "מצב רפואי":             "יומן_מצב_רפואי",
  "ניתוח/פעולה רפואית":    "יומן_מצב_רפואי",
  "הנחיה":                 "הנחיות_רפואיות_ומשימות",
  "כללי":                  "יומן_מצב_רפואי"
};

// [Task #188] מיפוי מערכות גוף — Enum סגור, קוד היררכי (SYS00-SYS14),
// מסודר לפי שכבות (מבנה→תנועה→כיסוי→בקרה→הובלה/הגנה→מערכות איבר→מולקולרי).
// הקוד הוא הערך שנכתב בפועל לתא Medical_System (לא הטקסט) — אמין יותר
// למיפוי ויזואלי עתידי (אווטאר/אינפוגרפיקה). nameHe/nameEn לתצוגה בלבד.
const S13_BODY_SYSTEMS = {
  "SYS00": { nameHe: "מערכת כללית",         nameEn: "General System"        },
  "SYS01": { nameHe: "מערכת השלד",          nameEn: "Skeletal System"       },
  "SYS02": { nameHe: "מערכת השרירים",       nameEn: "Muscular System"       },
  "SYS03": { nameHe: "מערכת הכסות",         nameEn: "Integumentary System"  },
  "SYS04": { nameHe: "מערכת העצבים",        nameEn: "Nervous System"        },
  "SYS05": { nameHe: "המערכת האנדוקרינית",  nameEn: "Endocrine System"      },
  "SYS06": { nameHe: "מערכת הדם וכלי הדם",  nameEn: "Cardiovascular System" },
  "SYS07": { nameHe: "מערכת הלימפה",        nameEn: "Lymphatic System"      },
  "SYS08": { nameHe: "מערכת החיסון",        nameEn: "Immune System"         },
  "SYS09": { nameHe: "מערכת הנשימה",        nameEn: "Respiratory System"    },
  "SYS10": { nameHe: "מערכת העיכול",        nameEn: "Digestive System"      },
  "SYS11": { nameHe: "מערכת השתן",          nameEn: "Urinary System"        },
  "SYS12": { nameHe: "מערכת הרבייה",        nameEn: "Reproductive System"   },
  "SYS13": { nameHe: "מערכות החישה",        nameEn: "Sensory Systems"       },
  "SYS14": { nameHe: "מערכת הגנים",         nameEn: "Genetic System"        }
};

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — מנגנון דואלי (שורה בודדת / אצווה), בדומה ל-runS09
// ══════════════════════════════════════════════════════════════════

function runS13() {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(3000);

  if (!hasLock) {
    SpreadsheetApp.getUi().alert("⏳ S13 כבר רץ כרגע (הרצה מקבילה). נסה שוב בעוד רגע.");
    return;
  }

  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(S13_SOURCE_SHEET);

    if (!sheet) {
      SpreadsheetApp.getUi().alert("❌ גליון '" + S13_SOURCE_SHEET + "' לא נמצא.");
      return;
    }

    const activeRow = sheet.getActiveCell().getRow();
    const firstDataRow = (SHEET_CONFIG[S13_SOURCE_SHEET] && SHEET_CONFIG[S13_SOURCE_SHEET].FIRST_DATA_ROW) || 5;

    if (activeRow >= firstDataRow) {
      _s13_processSingleRow(ss, sheet, activeRow);
    } else {
      _s13_processBatch(ss, sheet);
    }
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת תנאי סף לשורה בודדת ביומן_אירועים_רפואי
// ══════════════════════════════════════════════════════════════════

function _s13_checkRow(sheet, row) {
  const validationStatus  = sheet.getRange(row, 8).getValue(); // H = Validation_Status
  const extractionStatus  = sheet.getRange(row, 9).getValue(); // I = Extraction_Status

  if (validationStatus !== "מאומת") {
    return {
      valid: false,
      reason: "🟡 שורה " + row + " עדיין לא אומתה\n\n" +
        "עמודה H (Validation_Status) ריקה. כרגע לא ניתן לחלץ שורה שלא אומתה — " +
        "יש לאשר קודם (כפתור [S10 אימות])."
    };
  }
  if (extractionStatus) {
    return {
      valid: false,
      reason: "🔴 שורה " + row + " חסומה — כבר חולצה!\n\n" +
        "עמודה I (Extraction_Status) = '" + extractionStatus + "'. לא ניתן לחלץ שורה שכבר חולצה — " +
        "פעולה כזו הייתה יוצרת כפילות נתונים בגליונות המשניים. לחילוץ מחדש יש לאפס ידנית את התא בעמודה I."
    };
  }
  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════
// סריקת כל הגליון, בחירת שורות זכאיות, קיבוץ לפי File_ID
// מחזיר: [{ fileId: "...", rows: [{ row: 6, routingCategory: "...", ... }, ...] }, ...]
// ══════════════════════════════════════════════════════════════════

function _s13_getEligibleGroups(sheet) {
  const firstDataRow = (SHEET_CONFIG[S13_SOURCE_SHEET] && SHEET_CONFIG[S13_SOURCE_SHEET].FIRST_DATA_ROW) || 5;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) return [];

  const numRows = lastRow - firstDataRow + 1;
  const data = sheet.getRange(firstDataRow, 1, numRows, 12).getValues(); // A:L

  const groupsByFileId = {};

  data.forEach(function(rowData, idx) {
    const rowNum            = firstDataRow + idx;
    const eventDate          = rowData[0];
    const eventType          = rowData[1];
    const medicalSystem      = rowData[2];
    const issuer             = rowData[3];
    const summary            = rowData[4];
    const routingCategory    = rowData[5];
    const validationStatus   = rowData[7];
    const extractionStatus   = rowData[8];
    const fileId              = rowData[11]; // L = File_ID (הועבר מ-G)

    if (validationStatus !== "מאומת" || extractionStatus) return;
    if (!fileId) return;

    if (!groupsByFileId[fileId]) {
      groupsByFileId[fileId] = { fileId: fileId, rows: [] };
    }

    groupsByFileId[fileId].rows.push({
      row:             rowNum,
      eventDate:       eventDate,
      eventType:       eventType,
      medicalSystem:   medicalSystem,
      issuer:          issuer,
      summary:         summary,
      routingCategory: routingCategory
    });
  });

  return Object.keys(groupsByFileId).map(function(key) { return groupsByFileId[key]; });
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה בודדת — מאתר את כל הקבוצה (אותו File_ID) ומעבד אותה כולה
// ══════════════════════════════════════════════════════════════════

function _s13_processSingleRow(ss, sheet, row) {
  const check = _s13_checkRow(sheet, row);
  if (!check.valid) {
    SpreadsheetApp.getUi().alert(check.reason);
    return;
  }

  const fileId = sheet.getRange(row, 12).getValue(); // L = File_ID (הועבר מ-G)
  const groups = _s13_getEligibleGroups(sheet);
  const group  = groups.filter(function(g) { return g.fileId === fileId; })[0];

  if (!group) {
    SpreadsheetApp.getUi().alert("⚠️ לא נמצאה קבוצת שורות זכאיות עבור File_ID: " + fileId);
    return;
  }
Logger.log("[S13] עיבוד שורה בודדת — File_ID: " + fileId + " | " + group.rows.length + " שורות בקבוצה");
  const result = _s13_processGroup(ss, sheet, group);
  SpreadsheetApp.getUi().alert(
    result.success
      ? ("✅ הושלם — נכתבו " + result.written + " שורות לגליונות היעד" + (result.failed ? (" | נכשלו: " + result.failed) : ""))
      : ("❌ החילוץ נכשל — 0 שורות נכתבו. בדוק Logger לפירוט.")
  );
}

// ══════════════════════════════════════════════════════════════════
// עיבוד אצווה — כל הקבוצות הזכאיות בגליון
// ══════════════════════════════════════════════════════════════════

function _s13_processBatch(ss, sheet) {
  const groups = _s13_getEligibleGroups(sheet);
  Logger.log("[S13] אצווה — נמצאו " + groups.length + " קבוצות (File_ID) זכאיות לחילוץ");

  let totalWritten = 0;
  let totalFailed  = 0;

  groups.forEach(function(group) {
    Logger.log("[S13] File_ID: " + group.fileId + " | " + group.rows.length + " שורות");
    const result = _s13_processGroup(ss, sheet, group);
    totalWritten += result.written;
    totalFailed  += result.failed;
  });

  SpreadsheetApp.getUi().alert(
    "✅ אצווה הושלמה — " + groups.length + " קבוצות (File_ID) | " +
    "נכתבו: " + totalWritten + " שורות | נכשלו: " + totalFailed
  );
}
// ══════════════════════════════════════════════════════════════════
// [Task #188] קונפיגורציית Gemini — זהה ל-S09 (תיקוני #180)
// ══════════════════════════════════════════════════════════════════

const S13_GEMINI_MODEL = "gemini-2.5-flash";

// ══════════════════════════════════════════════════════════════════
// בלוק סכימה — השדות המדויקים שנדרשים מ-Gemini לכל Routing_Category,
// לפי COLUMN_MAP.gs (5 גליונות היעד). מוחזר כטקסט להטמעה בפרומפט.
// ══════════════════════════════════════════════════════════════════

function _s13_getSchemaBlock(routingCategory) {
  switch (routingCategory) {

    case "בדיקת דם":
      return '{"Test_Name":"","Category":"","Value":"","Normal_Range":"","Status":"תקין|גבוה|נמוך|לא תקין","Doctor_Note":""}';

    case "בדיקה גנטית":
      return '{"Panel_Name":"","Gene_Variant":"","Finding":"","Clinical_Significance":"","Recommendation":""}';

    case "מרשם תרופה":
      return '{"Drug_Name":"","Active_Ingredient":"","Dosage":"","Frequency":"","Treatment_Reason":"","Start_Date":"DD/MM/YYYY","End_Date":"DD/MM/YYYY","Status":"פעיל|הופסק"}';

    case "הנחיה":
         return '{"Task_Description":"","Task_Type":"","Due_Date":"DD/MM/YYYY","Status":"פתוח|בוצע","Medical_System":"קוד SYS00-SYS14 בלבד"}';

    case "מצב רפואי":
    case "ניתוח/פעולה רפואית":
    case "כללי":
    default:
      // [Task #220 שלב ב] נוספו 6 שדות קוד מתוך קטלוג מיפוי_קודים
      return '{"Medical_System":"קוד SYS00-SYS14 בלבד","Organ_Code":"קוד איבר מהקטלוג או ריק",' +
        '"Event_Code":"קוד מהקטלוג או ריק","Specialty_Code":"קוד מהקטלוג או ריק",' +
        '"Severity_Code":"קוד מהקטלוג או ריק","Diagnosis_Code":"קוד מהקטלוג או ריק",' +
        '"Certainty_Code":"קוד מהקטלוג או ריק","Primary_Diagnosis":"","Severity_Status":"","Recommendations":""}';
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #220 שלב ב] טעינת קטלוג מיפוי_קודים — דרך הפונקציה הקיימת
// _s16_readCatalogBlock (S16_ValidateMedicalStatus.gs, אותו פרויקט),
// באותה שיטה שבה ViewEngine.gs (כרטיס אינפוגרפי) כבר משתמש בה.
// אם אינה זמינה — מחזיר null והחילוץ ממשיך בלי קודי קטלוג (כמו בעבר).
// מחזיר: { eventCode, specialty, severity, diagnosis, certainty, organ }
// — כל אחד מערך options [{code, name, raw, desc, row}].
// ══════════════════════════════════════════════════════════════════

function _s13_loadCatalog() {
  if (typeof _s16_readCatalogBlock !== "function" || typeof S16_CODE_FIELDS === "undefined" ||
      typeof S16_CERTAINTY_MAP_FIRST_COL === "undefined" || typeof S16_ORGAN_MAP_FIRST_COL === "undefined") {
    Logger.log("[S13] קטלוג מיפוי_קודים לא זמין (S16) — חילוץ ללא קודי קטלוג");
    return null;
  }
  try {
    const catalog = {};
    S16_CODE_FIELDS.forEach(function(f) {
      catalog[f.key] = _s16_readCatalogBlock(f.mapFirstCol).options;
    });
    catalog.certainty = _s16_readCatalogBlock(S16_CERTAINTY_MAP_FIRST_COL).options;
    // בבלוק האיברים נשארים רק קודי איבר (SYS12A וכו') — קודי המערכת עצמם (5 תווים) מוחרגים
    catalog.organ = _s16_readCatalogBlock(S16_ORGAN_MAP_FIRST_COL).options.filter(function(o) {
      return o.code.length > 5;
    });
    return catalog;
  } catch (e) {
    Logger.log("[S13] שגיאת קריאת קטלוג מיפוי_קודים: " + e.message + " — חילוץ ללא קודי קטלוג");
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #220 שלב ב] אימות קוד שהחזיר Gemini מול הקטלוג — מחזיר את
// האפשרות {code, name, ...} רק אם הקוד קיים בקטלוג; אחרת null.
// systemCode (לאיבר בלבד) — הקוד חייב להתחיל בקוד המערכת שנבחרה.
// ══════════════════════════════════════════════════════════════════

function _s13_validateCode(options, code, systemCode) {
  const c = (code || "").toString().trim();
  if (!c || !options) return null;
  const match = options.filter(function(o) { return o.code === c; })[0];
  if (!match) return null;
  if (systemCode && c.indexOf(systemCode) !== 0) return null;
  return match;
}
// ══════════════════════════════════════════════════════════════════
// שליפת TXT_URL מניהול_מיילים לפי File_ID — לשימוש כ-fallback בלבד
// ══════════════════════════════════════════════════════════════════

function _s13_fetchTxtUrlByFileId(fileId) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return null;

  const firstDataRow = (SHEET_CONFIG["ניהול_מיילים"] && SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW) || 5;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) return null;

  const data = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 24).getValues(); // A:X

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === fileId) {
      return data[i][23] || null; // X = TXT_URL
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// שליפת תוכן TXT בפועל — זהה ללוגיקה ב-S09 (_s09_fetchTxtContent)
// ══════════════════════════════════════════════════════════════════

function _s13_fetchTxtContent(txtUrl) {
  let fileId = null;
  try {
    if (!txtUrl) return null;
    if (txtUrl.includes("/d/")) fileId = txtUrl.split("/d/")[1].split("/")[0];
    if (txtUrl.includes("id=")) fileId = txtUrl.split("id=")[1].split("&")[0];
    if (!fileId) {
      Logger.log("[S13] לא ניתן לחלץ fileId מ-txtUrl: " + txtUrl);
      return null;
    }
    const file = DriveApp.getFileById(fileId);
    return file.getBlob().getDataAsString("UTF-8");
  } catch (e) {
    Logger.log("[S13] שגיאת קריאת TXT — fileId: " + fileId + " | txtUrl: " + txtUrl + " | שגיאה: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית הפרומפט המלא לקבוצת שורות (אותו File_ID) — חלופה א':
// תוכן שורות היומן בלבד. fallbackTxt מוזרק רק אם קיים (מוחלט בשלב הקריאה).
// ══════════════════════════════════════════════════════════════════

function _s13_buildPrompt(group, fallbackTxt, catalog) {
  const bodySystemsListStr = Object.keys(S13_BODY_SYSTEMS)
    .map(function(code) { return code + "=" + S13_BODY_SYSTEMS[code].nameHe; })
    .join(", ");

  let rowsBlock = "";
  group.rows.forEach(function(r, idx) {
    rowsBlock += "\n--- שורה " + (idx + 1) + " (rowIndex=" + idx + ") ---\n";
    rowsBlock += "Routing_Category: " + r.routingCategory + "\n";
    rowsBlock += "Event_Date: " + r.eventDate + "\n";
    rowsBlock += "Event_Type: " + r.eventType + "\n";
    rowsBlock += "Medical_System (חופשי, מ-S09 — ייתכן שגוי, קבע לפי תוכן הממצא): " + r.medicalSystem + "\n";
    rowsBlock += "Issuer: " + r.issuer + "\n";
    rowsBlock += "Summary: " + r.summary + "\n";
    rowsBlock += "סכימת JSON נדרשת לשורה זו: " + _s13_getSchemaBlock(r.routingCategory) + "\n";
  });

  let prompt =
    "אתה מומחה לחילוץ מידע רפואי מובנה. קיבלת " + group.rows.length + " שורות אירוע " +
    "שכבר סווגו וסוכמו (מסמך אחד, File_ID: " + group.fileId + "). לכל שורה — החזר אובייקט JSON " +
    "יחיד לפי הסכימה המצוינת עבורה. בסיס החילוץ הוא תוכן השורה עצמה (Summary ושאר השדות). " +
    "אם שדה נדרש חסר/לא ברור מתוך השורה בלבד — ואם סופק טקסט מסמך מלא בהמשך, חפש בו את הפרט החסר.\n" +
    "כללים: (1) תאריכים תמיד בפורמט DD/MM/YYYY בלבד, לעולם לא נקודות. " +
    "(2) עבור שורות עם סכימת Medical_System — Medical_System חייב להיות אחד מהקודים הבאים בלבד: " +
    bodySystemsListStr + ". אם לא ברור — קוד SYS00.\n";

  // [Task #220 שלב ב] קטלוג קודים — רק אם יש בקבוצה שורה שמנותבת ליומן_מצב_רפואי
  const needsCatalog = catalog && group.rows.some(function(r) {
    return (S13_TARGET_SHEETS[r.routingCategory] || S13_TARGET_SHEETS["כללי"]) === "יומן_מצב_רפואי";
  });

  if (needsCatalog) {
    const listOf = function(options, extraOf) {
      return (options || []).map(function(o) {
        const extra = (extraOf(o) || "").toString().substring(0, 100);
        return o.code + "=" + o.name + (extra ? " (" + extra + ")" : "");
      }).join("\n");
    };
    prompt +=
      "(3) שדות *_Code — בחר קוד אך ורק מהרשימות שלהלן (מתוך הקטלוג). אם אין קוד מתאים בבירור — השאר ריק. " +
      "לעולם אל תמציא קוד שאינו ברשימה. Organ_Code חייב להתחיל בקוד ה-Medical_System שנבחר " +
      "(למשל SYS12A תחת SYS12) — אם האיבר שייך למערכת אחרת, בחר את המערכת של האיבר. " +
      "Specialty_Code = ההתמחות של הרופא/המכון שהפיק את המסמך (לפי Issuer ו-Event_Type).\n" +
      "(4) Recommendations — רק המלצה אישית למטופל במסמך הזה. אל תעתיק טבלאות מקרא, הסברי סיווג " +
      "כלליים (למשל טבלת הסבר PIRADS) או נוסח סטנדרטי של הדוח. אם אין המלצה אישית מפורשת — " +
      "\"אין המלצה מפורשת בדוח\".\n" +
      "\n--- קטלוג Organ_Code (קוד=איבר) ---\n" + listOf(catalog.organ, function(o) { return o.desc; }) +
      "\n--- קטלוג Event_Code (קוד=סוג אירוע) ---\n" + listOf(catalog.eventCode, function(o) { return o.desc; }) +
      "\n--- קטלוג Specialty_Code ---\n" + listOf(catalog.specialty, function(o) { return o.raw; }) +
      "\n--- קטלוג Severity_Code ---\n" + listOf(catalog.severity, function(o) { return o.raw; }) +
      "\n--- קטלוג Diagnosis_Code ---\n" + listOf(catalog.diagnosis, function(o) { return o.raw; }) +
      "\n--- קטלוג Certainty_Code ---\n" + listOf(catalog.certainty, function(o) { return o.raw; }) +
      "\n";
  }

  prompt += rowsBlock;

  if (fallbackTxt) {
    prompt += "\n--- טקסט מסמך מלא (הקשר נוסף, רק אם שדה חסר מהשורות לעיל) ---\n" +
      fallbackTxt.substring(0, 15000) + "\n";
  }

  prompt +=
    "\nהחזר אך ורק JSON תקין (ללא טקסט נוסף) במבנה: " +
    '{"results":[{"rowIndex":0,"fields":{...לפי הסכימה...}},...]}' +
    " — מערך אחד עם " + group.rows.length + " איברים, לפי סדר השורות לעיל.";

  return prompt;
}
// ══════════════════════════════════════════════════════════════════
// נורמליזציית תאריכים — זהה ל-_s09_normalizeDate (רשת ביטחון)
// ══════════════════════════════════════════════════════════════════

function _s13_normalizeDate(dateStr) {
  if (!dateStr) return dateStr;
  const m = String(dateStr).trim().match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (!m) return dateStr;
  return m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + m[3];
}

// ══════════════════════════════════════════════════════════════════
// קריאת Gemini בפועל — מקבלת פרומפט מוכן (מ-_s13_buildPrompt), מחזירה
// אובייקט מפוענח {results:[{rowIndex,fields},...]} או null בכשל.
// טיפול שגיאות זהה ל-_s09_callGemini (HTTP/finishReason/JSON parse).
// ══════════════════════════════════════════════════════════════════

let _s13_lastFailReason = "";

function _s13_callGemini(prompt) {
  let raw = null;
  _s13_lastFailReason = "";
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S13_GEMINI_MODEL + ":generateContent?key=" + apiKey;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 32768, thinkingConfig: { thinkingBudget: 0 } }
    };

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const bodyText      = response.getContentText();

    if (responseCode !== 200) {
      _s13_lastFailReason = "HTTP_" + responseCode;
      Logger.log("[S13] שגיאת HTTP מ-Gemini — קוד: " + responseCode +
        " | גוף תשובה (1000 תווים ראשונים): " + bodyText.substring(0, 1000));
      return null;
    }

    const json      = JSON.parse(bodyText);
    const candidate = json.candidates && json.candidates[0];

    if (!candidate) {
      _s13_lastFailReason = "NO_CANDIDATE";
      Logger.log("[S13] Gemini לא החזיר candidates — promptFeedback: " +
        JSON.stringify(json.promptFeedback || {}));
      return null;
    }

    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      _s13_lastFailReason = candidate.finishReason;
      Logger.log("[S13] Gemini הסתיים עם finishReason לא תקין: " + candidate.finishReason +
        " | candidate (1000 תווים ראשונים): " + JSON.stringify(candidate).substring(0, 1000));
      return null;
    }

    const textPart = candidate.content && candidate.content.parts &&
                     candidate.content.parts[0] && candidate.content.parts[0].text;

    if (!textPart) {
      _s13_lastFailReason = "NO_TEXT_PART";
      Logger.log("[S13] Gemini החזיר candidate בלי content.parts[0].text — candidate " +
        "(1000 תווים ראשונים): " + JSON.stringify(candidate).substring(0, 1000));
      return null;
    }

    raw = textPart.trim();
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      const firstBrace = raw.indexOf("{");
      const lastBrace   = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
        } catch (innerErr) {
          _s13_lastFailReason = "JSON_PARSE";
          Logger.log("[S13] חילוץ תת-מחרוזת JSON נכשל גם הוא — raw (1000 תווים ראשונים): " +
            raw.substring(0, 1000));
          return null;
        }
      }
      _s13_lastFailReason = "JSON_PARSE";
      Logger.log("[S13] JSON.parse נכשל ולא נמצאו סוגריים מסולסלים תואמים — raw " +
        "(1000 תווים ראשונים): " + raw.substring(0, 1000));
      return null;
    }

  } catch (e) {
    _s13_lastFailReason = "EXCEPTION";
    Logger.log("[S13] שגיאת Gemini: " + e.message +
      (raw ? " | raw (1000 תווים ראשונים): " + raw.substring(0, 1000) : ""));
    return null;
  }
}
// ══════════════════════════════════════════════════════════════════
// בניית מערך הערכים לשורה בגליון היעד, לפי סדר העמודות המדויק
// ב-COLUMN_MAP.gs (SHEETS_MAP) לכל אחד מ-5 הגליונות.
// ctx = { fileId, issuer, eventDate } — נתונים משותפים מהאירוע המקורי.
// ══════════════════════════════════════════════════════════════════

function _s13_buildRowValues(routingCategory, fields, ctx) {
  const sourceUrl = "https://drive.google.com/file/d/" + ctx.fileId + "/view";

  switch (routingCategory) {

    case "בדיקת דם":
      // Test_Date | Test_Name | Category | Value | Normal_Range | Status | Doctor_Note | Source_URL | File_ID | Doc_Issuer
      return [
        _s13_normalizeDate(ctx.eventDate),
        fields.Test_Name || "",
        fields.Category || "",
        fields.Value || "",
        fields.Normal_Range || "",
        fields.Status || "",
        fields.Doctor_Note || "",
        sourceUrl,
        ctx.fileId,
        ctx.issuer || "",
        "SYS06"
      ];

    case "בדיקה גנטית":
      // Test_Date | Panel_Name | Gene_Variant | Finding | Clinical_Significance | Recommendation | Source_URL | File_ID
      return [
        _s13_normalizeDate(ctx.eventDate),
        fields.Panel_Name || "",
        fields.Gene_Variant || "",
        fields.Finding || "",
        fields.Clinical_Significance || "",
        fields.Recommendation || "",
        sourceUrl,
        ctx.fileId,
        "SYS14"
      ];

    case "מרשם תרופה":

      // Drug_Name | Active_Ingredient | Dosage | Frequency | Treatment_Reason | Start_Date | End_Date | Status | Doc_Issuer | Source_URL | File_ID
      return [
        fields.Drug_Name || "",
        fields.Active_Ingredient || "",
        fields.Dosage || "",
        fields.Frequency || "",
        fields.Treatment_Reason || "",
        _s13_normalizeDate(fields.Start_Date) || "",
        _s13_normalizeDate(fields.End_Date) || "",
        fields.Status || "פעיל",
        ctx.issuer || "",
        sourceUrl,
        ctx.fileId,
        "SYS00"
      ];

    case "הנחיה":

      // Instruction_Date | Doc_Issuer | Task_Description | Task_Type | Due_Date | Status | Source_URL | File_ID
      return [
        _s13_normalizeDate(ctx.eventDate),
        ctx.issuer || "",
        fields.Task_Description || "",
        fields.Task_Type || "",
        _s13_normalizeDate(fields.Due_Date) || "",
        fields.Status || "פתוח",
        sourceUrl,
        ctx.fileId,
        fields.Medical_System || "SYS00"
      ];

    
    case "מצב רפואי":
    case "ניתוח/פעולה רפואית":
    case "כללי":
    default: {
      // [Task #214] תוקן ל-21 העמודות בפועל של יומן_מצב_רפואי אחרי מיגרציית
      // המבנה (COLUMN_MAP.gs, task214a, 10/09/2026).
      // [Task #220 שלב ב] הורחב ל-22 עמודות (Organ_Code) ו-10 שדות הקידוד
      // מתמלאים מקודי Gemini — רק קוד שקיים בקטלוג (_s13_validateCode),
      // יחד עם השם המנורמל שלו. קוד לא תקין/חסר → ריק. Record_Status="חדש"
      // — הקודים הם הצעה בלבד עד אימות ב-S16.
      // Event_Date | Event_Type | Primary_Diagnosis | Severity_Status |
      // Recommendations | Doc_Issuer | Record_Status | S_Row |
      // Specialty_Name | Medical_System_Name | Event_Code | Event_Description |
      // Severity_Name | Diagnosis_Name | Diagnosis_Certainty | Source_URL |
      // File_ID | Medical_System | Specialty_Code | Severity_Code | Diagnosis_Code | Organ_Code.
      // S_Row מחושב ע"י VIEWENGINE (refreshMedicalStatusRows) — נשאר ריק כאן.
      // Medical_System_Name נגזר מקוד המערכת הסופי (לא מהטקסט החופשי של S09).
      const cat       = ctx.catalog || {};
      const rawSys    = (fields.Medical_System || "").toString().trim();
      const sysCode   = S13_BODY_SYSTEMS[rawSys] ? rawSys : "SYS00";
      const organ     = _s13_validateCode(cat.organ,     fields.Organ_Code, sysCode);
      const eventCode = _s13_validateCode(cat.eventCode, fields.Event_Code);
      const specialty = _s13_validateCode(cat.specialty, fields.Specialty_Code);
      const severity  = _s13_validateCode(cat.severity,  fields.Severity_Code);
      const diagnosis = _s13_validateCode(cat.diagnosis, fields.Diagnosis_Code);
      const certainty = _s13_validateCode(cat.certainty, fields.Certainty_Code);
      return [
        _s13_normalizeDate(ctx.eventDate),
        ctx.eventType || "",
        fields.Primary_Diagnosis || "",
        fields.Severity_Status || "",
        fields.Recommendations || "",
        ctx.issuer || "",
        "חדש",
        "",
        specialty ? specialty.name : "",
        S13_BODY_SYSTEMS[sysCode].nameHe,
        eventCode ? eventCode.code : "",
        eventCode ? eventCode.name : "",
        severity  ? severity.name  : "",
        diagnosis ? diagnosis.name : "",
        certainty ? certainty.code : "",
        sourceUrl,
        ctx.fileId,
        sysCode,
        specialty ? specialty.code : "",
        severity  ? severity.code  : "",
        diagnosis ? diagnosis.code : "",
        organ     ? organ.code     : ""
      ];
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// כתיבת שורה בודדת לגליון היעד המתאים, לפי S13_TARGET_SHEETS
// ══════════════════════════════════════════════════════════════════

function _s13_writeExtractedRow(ss, routingCategory, fields, ctx) {
  const targetSheetName = S13_TARGET_SHEETS[routingCategory] || S13_TARGET_SHEETS["כללי"];
  const sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) {
    Logger.log("[S13] גליון יעד לא נמצא: " + targetSheetName + " (routingCategory: " + routingCategory + ")");
    return false;
  }

  const rowValues = _s13_buildRowValues(routingCategory, fields, ctx);
  sheet.appendRow(rowValues);
  Logger.log("[S13] נכתבה שורה ל-" + targetSheetName + " | File_ID: " + ctx.fileId);
  return true;
}
// ══════════════════════════════════════════════════════════════════
// עיבוד קבוצה מלאה: פרומפט → Gemini → (fallback ל-TXT אם חלקי) →
// כתיבה לגליונות היעד → סימון Extraction_Status="חולץ" על כל שורה
// שטופלה בהצלחה. מחזירה {success, written, failed}.
// ══════════════════════════════════════════════════════════════════

function _s13_processGroup(ss, sourceSheet, group) {
  // [Task #220 שלב ב] קטלוג מיפוי_קודים — נטען פעם אחת לכל מסמך (File_ID)
  const catalog = _s13_loadCatalog();

  let prompt = _s13_buildPrompt(group, null, catalog);
  let response = _s13_callGemini(prompt);

  let results = response && response.results;
  const incomplete = !results || results.length < group.rows.length;

  // חלופה א' — נופל לטקסט TXT מלא רק אם התשובה חלקית/ריקה
  if (incomplete) {
    Logger.log("[S13] File_ID " + group.fileId + " — תשובה חלקית/ריקה (סיבה: " +
      (_s13_lastFailReason || "תוצאות חסרות") + "), מנסה שוב עם fallback ל-TXT");

    const txtUrl     = _s13_fetchTxtUrlByFileId(group.fileId);
    const fallbackTxt = txtUrl ? _s13_fetchTxtContent(txtUrl) : null;

    if (fallbackTxt) {
      prompt   = _s13_buildPrompt(group, fallbackTxt, catalog);
      response = _s13_callGemini(prompt);
      results  = response && response.results;
    }
  }

  if (!results || results.length === 0) {
    Logger.log("[S13] File_ID " + group.fileId + " — כשל מלא, אין תוצאות לכתיבה (סיבה: " +
      (_s13_lastFailReason || "לא ידועה") + ")");
    return { success: false, written: 0, failed: group.rows.length };
  }

  let written = 0;
  let failed  = 0;

  results.forEach(function(result) {
    const idx = result.rowIndex;
    const eventRow = group.rows[idx];
    if (!eventRow) {
      Logger.log("[S13] File_ID " + group.fileId + " — rowIndex " + idx + " בתשובת Gemini לא תואם לשום שורה בקבוצה");
      failed++;
      return;
    }

    const ctx = {
      fileId:        group.fileId,
      issuer:        eventRow.issuer,
      eventDate:     eventRow.eventDate,
      eventType:     eventRow.eventType,
      medicalSystem: eventRow.medicalSystem,
      catalog:       catalog
    };

    const ok = _s13_writeExtractedRow(ss, eventRow.routingCategory, result.fields || {}, ctx);

    if (ok) {
      sourceSheet.getRange(eventRow.row, 9).setValue("חולץ"); // I = Extraction_Status
      written++;
    } else {
      failed++;
    }
  });

  Logger.log("[S13] File_ID " + group.fileId + " הושלם — נכתבו: " + written + " | נכשלו: " + failed);
  return { success: written > 0, written: written, failed: failed };
}