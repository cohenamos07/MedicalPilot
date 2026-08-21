/**
 * MedicalPilot — S14_QArun.gs
 * @version 1.0.0 | @updated 21/08/2026 13:06 | @service S14
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S14_QArun.gs
 * @description שירות QA/כפילויות על יומן_אירועים_רפואי — Union-Find מותאם מ-S11
 *              (_qa_computeDuplicateGroups, Task 165), עם ניקוד השוואת שדות
 *              ייעודי. לא מוחק שורות — רק מסמן (Duplicate_Flag/Duplicate_Target_Ref,
 *              עמודות J/K). מופעל ע"י runS14ViewIconEvents (ViewEngine.gs),
 *              אייקון "[ S14 QA ]" עמודה D.
 * @impacts     כותב לעמודות J (10, Duplicate_Flag) ו-K (11, Duplicate_Target_Ref)
 *              ביומן_אירועים_רפואי בלבד. כתיבה מרוכזת (setValues על טור שלם) —
 *              לא כתיבת-תא בודדת. לא קורא/כותב ל-Drive/TXT — כל הנתונים כבר
 *              בעמודות הגליון (A-I).
 * @callers     runS14ViewIconEvents (ViewEngine.gs) — אייקון "[ S14 QA ]"
 * @functions   runS14, _s14_computeDuplicateGroups, _s14_isDuplicatePair
 * @changes     [v1.0.0] Task #187 — גרסה ראשונה. נכתב, נבדק ותוקן פעמיים אחרי
 *              QA בנתונים חיים: (1) ניקוד שטוח מקורי (5 שדות, סף 3/5) גרם
 *              ל-false-positive מסיבי (45/52 שורות אמיתיות) — Event_Date/
 *              Medical_System/Issuer הם בפועל "זהות הביקור", חוזרים על עצמם
 *              בין כל אירועי אותו מסמך. הוחלף ב-_s14_isDuplicatePair: התאמת
 *              Summary היא תנאי חובה, בשילוב 2+ משדות מטא נוספים. (2) כתיבה
 *              שורה-שורה (עד ~90 קריאות setValue) גרמה לריצה ארוכה — הוחלפה
 *              בכתיבה מרוכזת (2 קריאות setValues). אומת מלא בנתונים חיים:
 *              0 false-positive על 52 שורות אמיתיות, זיהוי+ניקוי נכונים על
 *              זוג כפול מלאכותי.
 */

// ══════════════════════════════════════════════════════════════════
// [Task #187] קבועים — S14 QA/כפילויות על יומן_אירועים_רפואי
// ══════════════════════════════════════════════════════════════════
const S14_DATA_START     = SHEET_CONFIG["יומן_אירועים_רפואי"].FIRST_DATA_ROW; // 5
const S14_SCORE_THRESHOLD = 2; // [תיקון אחרי QA] מס' שדות מטא (מתוך 4) הנדרשים כתמיכה, בנוסף להתאמת Summary החובה
const S14_SUMMARY_LENGTH_RATIO_MIN = 0.5; // יחס אורך מינימלי בין שני Summary להכלה — מונע התאמת-שווא על ביטוי קצר גנרי

// ══════════════════════════════════════════════════════════════════
// [Task #187 — תיקון ביצועים] runS14 — נקודת כניסה: סורק את כל שורות
// יומן_אירועים_רפואי, מחשב ניקוד+Union-Find, כותב/מנקה דגלי כפילות
// בעמודות J (10) ו-K (11). כתיבה מרוכזת (2 קריאות setValues על טור
// שלם) במקום כתיבה שורה-שורה — כתיבת תא בודד ב-Apps Script איטית
// יחסית, וכתיבה שורה-שורה על 40+ שורות היא שגרמה לריצה הארוכה
// שדווחה בבדיקה החיה. לא מוחק שורות — עקרון זהה ל-S11 (ניהול_מיילים).
// ══════════════════════════════════════════════════════════════════
function runS14() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MEDICAL_EVENTS_SHEET_NAME);
  if (!sheet) {
    return { error: "גליון '" + MEDICAL_EVENTS_SHEET_NAME + "' לא נמצא." };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < S14_DATA_START) {
    return { scanned: 0, flagged: 0, cleared: 0, groups: 0 };
  }

  const numRows = lastRow - S14_DATA_START + 1;
  const allData = sheet.getRange(S14_DATA_START, 1, numRows, 11).getValues();

  const groupsResult = _s14_computeDuplicateGroups(allData);

  const newJCol = [];
  const newKCol = [];
  let flagged = 0;
  let cleared = 0;

  for (let i = 0; i < allData.length; i++) {
    const row       = i + S14_DATA_START;
    const currentJ  = (allData[i][9]  || "").toString().trim(); // J=10
    const currentK  = allData[i][10];                            // K=11
    const anchorRow = groupsResult.anchorByRow[row];

    if (anchorRow && anchorRow !== row) {
      // חבר בקבוצת כפילות — לא העוגן עצמו
      const newJ = "כפול מאושר — שורה " + anchorRow;
      newJCol.push([newJ]);
      newKCol.push([anchorRow]);
      if (currentJ !== newJ || currentK !== anchorRow) flagged++;
    } else {
      // אין כפילות (או שזו שורת העוגן עצמה) — ניקוי דגל ישן אם קיים
      newJCol.push([""]);
      newKCol.push([""]);
      if (currentJ || currentK) cleared++;
    }
  }

  sheet.getRange(S14_DATA_START, 10, numRows, 1).setValues(newJCol);
  sheet.getRange(S14_DATA_START, 11, numRows, 1).setValues(newKCol);

  return { scanned: allData.length, flagged: flagged, cleared: cleared, groups: groupsResult.groups.length };
}

// ══════════════════════════════════════════════════════════════════
// [Task #187] _s14_computeDuplicateGroups — קיבוץ טרנזיטיבי (Union-Find),
// מותאם מ-_qa_computeDuplicateGroups (S11_QArun.gs, Task 165). הבדל
// מרכזי: המפתח כאן הוא מספר השורה, לא File_ID — מסמך אחד יכול לייצר
// כמה שורות-אירוע ביומן הזה, כך ש-File_ID אינו מפתח ייחודי לשורה כמו
// בניהול_מיילים. השוואה מלאה בין כל זוג שורות (O(n²), ללא Drive/TXT —
// כל הנתונים כבר בעמודות הגליון), כי אין שירות עליון (כמו S07) שכבר
// סימן חשד מראש.
// ══════════════════════════════════════════════════════════════════
function _s14_computeDuplicateGroups(allData) {
  const parent = {}; // row -> row (מבנה Union-Find)

  function find(x) {
    if (!(x in parent)) parent[x] = x;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // דחיסת נתיב
      x = parent[x];
    }
    return x;
  }

  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const n = allData.length;

  for (let i = 0; i < n; i++) {
    find(i + S14_DATA_START); // רישום כל שורה כרכיב עצמאי
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (_s14_isDuplicatePair(allData[i], allData[j])) {
        union(i + S14_DATA_START, j + S14_DATA_START);
      }
    }
  }

  // קיבוץ שורות לפי שורש משותף
  const groupsByRoot = {};
  for (let i = 0; i < n; i++) {
    const row  = i + S14_DATA_START;
    const root = find(row);
    if (!groupsByRoot[root]) groupsByRoot[root] = [];
    groupsByRoot[root].push(row);
  }

  // לכל רכיב בגודל 2+: עוגן = מספר השורה הנמוך ביותר בקבוצה (proxy
  // סביר לסדר כרונולוגי — אין עמודת תאריך-קליטה בגליון הזה, בשונה
  // מ-Capture_Date בניהול_מיילים). רכיבים בגודל 1 מדולגים.
  const anchorByRow = {};
  const groups = [];

  Object.keys(groupsByRoot).forEach(function(root) {
    const members = groupsByRoot[root];
    if (members.length < 2) return;
    const anchorRow = Math.min.apply(null, members);
    members.forEach(function(row) { anchorByRow[row] = anchorRow; });
    groups.push({ anchorRow: anchorRow, memberRows: members.slice() });
  });

  return { anchorByRow: anchorByRow, groups: groups };
}

// ══════════════════════════════════════════════════════════════════
// [Task #187 — תיקון אחרי בדיקה בנתונים חיים] _s14_isDuplicatePair —
// מחליף את _s14_scoreRowPair (ניקוד שטוח מתוך 5). שורש התיקון: נמצא
// בבדיקה חיה (QA) שEvent_Date/Medical_System/Issuer הם בפועל "זהות
// הביקור" — מובטחים להיות זהים בין כל האירועים שחולצו מאותו מסמך,
// כך שניקוד שטוח סימן false-positive מסיבי (45 מתוך 52 שורות אמיתיות
// בבדיקה) על אירועים שונים לגמרי מאותו ביקור. כעת: התאמת Summary
// היא תנאי חובה (השדה היחיד שבאמת מבדיל בין אירועים שונים), בשילוב
// עם לפחות S14_SCORE_THRESHOLD מתוך 4 שדות מטא-דאטה נוספים תואמים.
// ══════════════════════════════════════════════════════════════════
function _s14_isDuplicatePair(rowA, rowB) {
  const sumA = (rowA[4] || "").toString().trim().toLowerCase(); // E=Summary
  const sumB = (rowB[4] || "").toString().trim().toLowerCase();
  if (!sumA || !sumB) return false;

  const shorter = Math.min(sumA.length, sumB.length);
  const longer  = Math.max(sumA.length, sumB.length);
  const lengthRatioOk = (shorter / longer) >= S14_SUMMARY_LENGTH_RATIO_MIN;
  const summaryMatch  = lengthRatioOk && (sumA === sumB || sumA.indexOf(sumB) !== -1 || sumB.indexOf(sumA) !== -1);
  if (!summaryMatch) return false;

  let metaScore = 0;

  const dateA = _medDate_normalizeDate((rowA[0] || "").toString().trim()); // A=Event_Date
  const dateB = _medDate_normalizeDate((rowB[0] || "").toString().trim());
  if (dateA && dateB && dateA === dateB) metaScore++;

  const sysA = (rowA[2] || "").toString().trim().toLowerCase(); // C=Medical_System
  const sysB = (rowB[2] || "").toString().trim().toLowerCase();
  if (sysA && sysB && sysA === sysB) metaScore++;

  const issuerA = (rowA[3] || "").toString().trim().toLowerCase(); // D=Issuer
  const issuerB = (rowB[3] || "").toString().trim().toLowerCase();
  if (issuerA && issuerB && issuerA === issuerB) metaScore++;

  const routeA = (rowA[5] || "").toString().trim().toLowerCase(); // F=Routing_Category
  const routeB = (rowB[5] || "").toString().trim().toLowerCase();
  if (routeA && routeB && routeA === routeB) metaScore++;

  return metaScore >= S14_SCORE_THRESHOLD;
}