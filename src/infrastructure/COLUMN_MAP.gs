/**
 * MedicalPilot — COLUMN_MAP.gs
 * @version 2.11.1 | @updated 30/08/2026 21:05 | @service COLUMN_MAP
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/COLUMN_MAP.gs
 * @description מאגר עמודות מרכזי — Single Source of Truth לכל גיליוני המערכת.
 * @impacts גיליונות: ניהול_מיילים (27 עמודות), דוגמאות_למידה, מנהל_משאבים, S10, מסנכרן_קבצים,
 *          מיפוי_קודים (4 עמודות — גליון למידה לניהול קודי מערכת_גוף/קוד_אירוע, בסיס
 *          הנתונים הדינמי ל-יומן_מצב_רפואי ולאינפוגרפיקה שלו, בדומה בתפקידו ל-
 *          דוגמאות_למידה_S10; כותרות אנגליות בפועל בגליון מ-[v2.11.1], Task #208:
 *          Type|Key|Normalized_Value|Raw_Value),
 *          יומן_אירועים_רפואי (12 עמודות — [v2.10.0] עודכן מ-11, Task #205:
 *          נוספה S_Row בעמודה 7 [writers: VIEWENGINE], File_ID הוזז לעמודה 12).
 *          [v2.9.4] תרופות_קבועות (11), יומן_מצב_רפואי (15 עמודות — [v2.11.0]
 *          עודכן מ-11, Task #206: ראה @changes), בדיקות_דם (10),
 *          בדיקות_גנטיות (8), הנחיות_רפואיות_ומשימות (8) — 5 גליונות יעד של S09,
 *          נוספו ל-SHEET_CONFIG/SHEETS_MAP עם כותרות באנגלית, יושרו בפועל
 *          לתקן 4-השורות המוגן (Task 183/184).
 *          [v2.9.5] 5 גליונות היעד לעיל: writers תוקן מ-["S09"] ל-["S13"]
 *          (הכותב האמיתי כיום, Task 188) — 48 שדות. תרופות_קבועות (12),
 *          בדיקות_דם (11), בדיקות_גנטיות (9), הנחיות_רפואיות_ומשימות (9):
 *          נוספה עמודת Medical_System (Enum SYS00-SYS14, קבוע/דינמי לפי גליון).
 *          יומן_מצב_רפואי לא השתנה במספר עמודות — כבר היה לו Medical_System.
 *          תלויים ישירים: S03 (A-H), S05 (M,O,P,R,S,T), S06 (M,O,P,Q,S,T,X,Y,Z),
 *          S07 (I,J,K,L,M,N,Q,R,S,T), S08 (I,J,K,L,M,U), S09 (גיליון S10),
 *          S09 (יומן_אירועים_רפואי A-G, ו-5 גליונות היעד לעיל).
 *          שינוי מספר עמודה = שבירת כל שירות שכותב אליה — לא לשנות ללא בדיקת כל התלויים.
 *          פונקציות printSheetMap, restoreHeaders, checkWritePermissions — כלי אבחון ידני בלבד.
 *          restoreHeaders() אינה ניתנת להרצה ישירה מהעורך (getUi()) — לגליונות היעד
 *          החדשים בוצע עדכון ידני חד-פעמי דרך QA_Tests.gs (ראה שם).
 *          [v2.9.6] נוספה פונקציית נורמליזציה משותפת _medDate_normalizeDate —
 *          נקראת מ-S07, S08 ו-S11 (E34). Task #178 — נבדק ואומת בגליון החי
 *          (S11 תפס ותיקן שורות עם פורמט תאריך שגוי בפועל).
 * @callers System_Doc_Builder (buildSheetFromMap, buildMedicalEventsSheet), ViewEngine (restoreHeaders),
 *          כל שירותי ה-Pipeline
 * @functions SHEET_CONFIG, SHEETS_MAP, SHEETS_DEFAULT_DATA,
 *            insertEditorGitLinesColumns, printSheetMap, printColumnDetail,
 *            restoreHeaders, checkWritePermissions, buildSheetFromMap,
 *            buildS10LearningSheet, buildDevSyncSheet,
 *            _promptSheetName, _colToLetter, _letterToCol, _medDate_normalizeDate
 * @changes [v2.11.1] Task #208 — עדכון שורת כותרת (row 4) בגליון מיפוי_קודים בפועל
 *          מעברית לאנגלית (הייתה נשארת עברית מאז יצירת הגליון ב-Task #206, למרות
 *          ש-SHEETS_MAP כבר הוגדר באנגלית מסבב 3) — פונקציה חד-פעמית
 *          task208_renameCodeMapHeadersToEnglishNoUI (QA_Tests.gs), הרצה ואימות
 *          מול הגליון החי הצליחו. עיצוב (#1A3A5C/טקסט לבן), הקפאת 4 שורות
 *          והאייקון "[ רענן ]" לא נדרשו שינוי — נמצאו תקינים מראש. תיעוד: מיפוי_קודים
 *          מוגדר כעת רשמית כ"גליון למידה" (ראה @impacts) — בסיס נתונים דינמי
 *          (במקום קבועים קשיחים בקוד) הנקרא ע"י refreshMedicalStatusRows/
 *          _codeMap_buildLookup (ViewEngine.gs) עבור יומן_מצב_רפואי ואינפוגרפיקתו.
 * @changes [v2.11.0] Task #206 (סבבים 1-3) — תשתית מיפוי קודים למצב רפואי:
 *          הוספת SHEET_CONFIG/SHEETS_MAP["מיפוי_קודים"] (4 עמודות: Type|Key|
 *          Normalized_Value|Raw_Value) — טבלה אחודה למערכות גוף (SYS00-SYS14)
 *          וקודי אירוע, נטענת דינמית ב-ViewEngine.gs (_codeMap_buildLookup),
 *          מחליפה קבועים קשיחים שהוסרו (MEDICAL_STATUS_BODY_SYSTEMS/
 *          MEDICAL_STATUS_EVENT_TYPE_CODES). SHEETS_MAP["יומן_מצב_רפואי"]
 *          הורחב מ-11 ל-15 עמודות: S_Row (9, הוזז), ET_CODE (11), File_ID/
 *          Source_URL הוזזו (12-13), Body_System_Normalized/Event_Type_
 *          Normalized נוספו בסוף (14-15). Medical_System_Name (עמודה 3)
 *          חזרה להיות גולמית (writer S13) — לא נדרסת יותר ע"י VIEWENGINE.
 * @changes [v2.10.0] Task #205 — SHEETS_MAP["יומן_אירועים_רפואי"]: נוספה עמודה
 *          7 = S_Row (zone: טכני, writers:["VIEWENGINE"], readers:[]) — מספר
 *          שורת המקור בניהול_מיילים, מחושב ומתעדכן ע"י כפתור "רענן שורות"
 *          (refreshMedicalEventsRows, ViewEngine.gs) בכל הרצה. File_ID הוזז
 *          מעמודה 7 לעמודה 12, כדי לפנות מקום ל-S_Row (readers: S11, S13 —
 *          ללא שינוי). 4 העמודות שביניהן (Validation_Status H8/Extraction_
 *          Status I9/Duplicate_Flag J10/Duplicate_Target_Ref K11) לא הוזזו —
 *          נשארו באותן עמודות כבעבר. תוקן גם פער תיעוד: @impacts מעלה תיעד
 *          "11 עמודות" — עודכן ל-12 (ראה שם).
 * @changes [v2.9.9] Task #198 — הוספת SHEET_CONFIG["ניהול_מיילים_ארכיון"] +
 *          SHEETS_MAP["ניהול_מיילים_ארכיון"] (מיפוי זהה ל-ניהול_מיילים, 27
 *          עמודות, writers:["S12"]) — יעד לארכוב אמיתי (moveTo) של שורות
 *          דרך runArchiveView (ViewEngine.gs), במקום פילטר תצוגה בלבד כבעבר.
 *          אומת מול הגליון החי: מבנה 4 השורות/עיצוב/freeze זהים ל-ניהול_מיילים
 *          (13.5/45/15/21pt, רקע FF1565C0, freeze B5).
 * @changes [v2.9.8] Task #187 — הוספת 2 עמודות ל-SHEETS_MAP["יומן_אירועים_רפואי"]:
 *          J(10)=Duplicate_Flag, K(11)=Duplicate_Target_Ref — עבור שירות QA/כפילויות
 *          החדש S14_QArun.gs (Union-Find לפי מספר שורה, לא File_ID — מסמך אחד
 *          יכול לייצר כמה שורות-אירוע, ראה @changes ב-S14_QArun.gs לפירוט מלא
 *          כולל תיקון אחרי בדיקה חיה). כותרות J4/K4 בגליון החי נוספו ידנית
 *          ע"י עמוס (עיצוב תואם לשאר הכותרות — רקע כחול, פונט תכלת/לבן) —
 *          כמו התקדים הקיים בשאר הגליונות המעודכנים ידנית (ראה @impacts).
 *          תוקן גם פער תיעוד קיים: @impacts מעלה תיעד "יומן_אירועים_רפואי
 *          (7 עמודות)" — לא עודכן כשעמודות H/I (Validation_Status/
 *          Extraction_Status) נוספו בפועל ב-Task #185. כעת מתועד נכון: 11.
 * @changes [v2.9.7] Task #194 — עדכון תיעוד: ערכי Pipeline_Status (עמודה 13)
 *          כללו את הערך הישן "חולץ לגליונות" (הוסר מקוד S09 ב-Task #185,
 *          שם עבר ל-"חולץ ליומן אירועים"). התיעוד לא עודכן בזמנו וגרם
 *          עקיפין ל-false-positive ב-S11 E13. הוחלף לערך הנוכחי בפועל.
 * @changes [v2.9.6] Task #178 — פונקציית נורמליזציה משותפת חדשה
 *          _medDate_normalizeDate(dateStr) לאיחוד פורמט Doc_Date (K בניהול_מיילים)
 *          ל-DD/MM/YYYY. מזהה: כבר-תקין, Date object, מפריד נקודה/מקף/לוכסן,
 *          שנה דו-ספרתית (חלון גולש מול השנה הנוכחית), שם חודש עברי. תבנית
 *          לא-מזוהה → מוחזר כמו שהוא. נבדק ואומת בגליון החי — S11 (E34) תפס
 *          ותיקן בהצלחה שורות עם פורמט שגוי.
 * @changes [v2.9.5] Task #188 — writers של 5 גליונות היעד תוקן מ-["S09"] ל-["S13"]
 *          (48 שדות, תיעוד בלבד). נוספה עמודת Medical_System (SYS00-SYS14) ל-4
 *          מתוך 5 גליונות (לא ליומן_מצב_רפואי — כבר קיים). ראה @impacts מעלה לפירוט.
 * @changes [v2.9.4] Task 183/184 (בקשת עמוס) — רול-בק מלא: איפוס 20 שורות
 *                   ב-ניהול_מיילים (לא 6 כפי שהוערך תחילה — אומת מול הנתונים
 *                   החיים) לסטטוס "מאושר", וניקוי מלא של 6 הגליונות הנלווים
 *                   (כולל יומן_אירועים_רפואי). בהמשך: רישום 5 גליונות היעד של S09
 *                   (תרופות_קבועות, יומן_מצב_רפואי, בדיקות_דם, בדיקות_גנטיות,
 *                   הנחיות_רפואיות_ומשימות) ב-SHEET_CONFIG וב-SHEETS_MAP —
 *                   FROZEN_ROWS:4/HEADER_ROW:4/FIRST_DATA_ROW:5, עם שמות עמודה
 *                   באנגלית (החלטה חדשה — כל הגליונות מתוקננים לאנגלית, לא רק
 *                   ניהול_מיילים/יומן_אירועים_רפואי). תוקן גם פער תיעוד קיים:
 *                   עמודה J בבדיקות_דם ("Doc_Issuer") נכתבה בפועל ע"י S09 אך
 *                   הייתה חסרת כותרת בגליון החי. היישום בפועל בגליונות בוצע דרך
 *                   שתי פונקציות חד-פעמיות
 *                   יצאה משימוש "שמור לעתיד" — משמשת כעת כ-QA_Dismiss_Note:
 *                   סימון ידני של דחיית חשד QA (כפול/לוגו-ריק/טקסט-פגום),
 *                   נכתבת ע"י S08 (s08_cancelDuplicateFlag ודומיו), נקראת
 *                   ע"י S07 (_calculateDuplicates_S07) ו-S11 (E25/E31/E32) —
 *                   מונעת לולאת-דגל-חוזר אחרי ביטול ידני.
 * @changes [v2.9.2] Task 154 — 3 תיקונים לגיליון "דוגמאות_למידה": (1) SHEETS_MAP
 *                   היה מתועד בסדר עמודות שגוי לגמרי מול מה שבאמת נכתב/נקרא בקוד
 *                   (S08 _s08_saveToLearning / S07 _getLearningExamples_S07) — תוקן
 *                   ל-Subject/Issuer/Classification/TXT_Document_Link/Original_File_ID/
 *                   Complexity/Doc_Date/Notes. S07↔S08 עצמם היו עקביים זה עם זה —
 *                   רק התיעוד היה שגוי. (2) הוספת SHEET_CONFIG["דוגמאות_למידה"]:
 *                   FROZEN_ROWS:4, HEADER_ROW:4, FIRST_DATA_ROW:5 — מיישר את הגיליון
 *                   לתקן 4-השורות הנהוג בשאר המערכת (היום כותרת בשורה 1, נתונים
 *                   משורה 2). (3) תוקן באג ידוע ומתועד (ראה @changes [v2.9.1] למטה) —
 *                   restoreHeaders() כתבה תמיד לשורה 1 בקשיחות; כעת קוראת את
 *                   HEADER_ROW בפועל מ-SHEET_CONFIG לפי הגיליון שנבחר. הזזת הנתונים
 *                   הקיימים בגיליון (1→4) והצבת אייקון "אתחול" — פעולה ידנית של עמוס,
 *                   לא בקוד.
 * @changes [v2.9.1] Task 129 [שלב 1/8] — הוספת עמודה 27 (AA) "Duplicate_Target_FileID"
 *                   ל-SHEETS_MAP["ניהול_מיילים"] — רפרנס פיזי וגלוי לשורת-התאום בזיהוי
 *                   כפילויות, שיחליף בהדרגה (שלבים 130-133) את מנגנון ה-Note הבלתי-נראה
 *                   על עמודה R. עדכון @impacts מ-"26 עמודות" ל-"27 עמודות".
 *                   ⚠️ שינוי תיעוד בלבד בקובץ זה — אין עדיין שינוי לוגי בשום שירות.
 *                   הכותרת בפועל בתא AA4 בגליון טרם נכתבה (תתווסף ידנית — אומת מול
 *                   הגליון החי ש-restoreHeaders() כותבת בטעות לשורה 1 במקום שורה 4,
 *                   ולכן לא בשימוש כאן). מילוי הנתונים בפועל בעמודה 27 הוא Task 130.
 * @changes [v2.9.0] הוספת "יומן_אירועים_רפואי" ל-SHEET_CONFIG ו-SHEETS_MAP —
 *                   7 עמודות: Event_Date, Event_Type, Medical_System, Issuer,
 *                   Summary, Routing_Category, File_ID
 *          [v2.8.0] הוספת SHEET_CONFIG — FROZEN_ROWS:4, HEADER_ROW:4, FIRST_DATA_ROW:5 לגליון ניהול_מיילים
 *          [v2.7.0] הוספת Editor_Lines (5) ו-Git_Lines (6) למסנכרן_קבצים —
 *                   הזזת Version_Editor→7, Version_Git→8, Status→9, Action→10, Notes→11.
 *                   נוספה פונקציה חד-פעמית insertEditorGitLinesColumns.
 *          [v2.6.1] גרסת עורך קודמת
 *          [v2.6.0] [FIX-5] buildS10LearningSheet
 */
// ══════════════════════════════════════════════════════════════════
// תיעוד — מבנה עמודות גליון ניהול_מיילים
// ══════════════════════════════════════════════════════════════════

/*
## כללי כתיבה לכל שירות

S03, S04 — כותבים רק לעמודות A-H ו-W
S05      — כותב רק לעמודות M, O, P, R, S, T
S06      — כותב רק לעמודות M, O, P, Q, S, T, X, Y, Z
S07      — כותב רק לעמודות I, J, K, L, M, N, Q, R, S, T
S08      — כותב רק לעמודות I, J, K, L, M, U
S09      — כותב רק לגליונות היעד (יומן_אירועים_רפואי וכו')
S10      — כותב רק לגליון S10_למידה_רפואי
QA       — כותב רק לעמודה U
כל שירות — בהצלחה מנקה S ו-T. בכישלון כותב קוד ב-S ופירוט ב-T
*/


// ══════════════════════════════════════════════════════════════════
// תצורת גליונות — שורות מוגנות ונתונים
// ══════════════════════════════════════════════════════════════════

const SHEET_CONFIG = {
  "ניהול_מיילים": {
    FROZEN_ROWS:    4,  // שורות 1-4 מוקפאות — לא לגעת בקוד
    HEADER_ROW:     4,  // שורת כותרות
    FIRST_DATA_ROW: 5   // שורת נתונים ראשונה — כל לולאה מתחילה כאן
  },
  "יומן_אירועים_רפואי": {
    FROZEN_ROWS:    4,  // שורות 1-4 מוקפאות — לא לגעת בקוד
    HEADER_ROW:     4,  // שורת כותרות
    FIRST_DATA_ROW: 5   // שורת נתונים ראשונה — כל לולאה מתחילה כאן
  },
  "דוגמאות_למידה": {
    FROZEN_ROWS:    4,  // שורות 1-4 מוקפאות — לא לגעת בקוד
    HEADER_ROW:     4,  // שורת כותרות
    FIRST_DATA_ROW: 5   // שורת נתונים ראשונה — כל לולאה מתחילה כאן
  },
  // [Task 184] 5 גליונות יעד של S09 — יושרו לתקן 4-השורות המוגן
  "תרופות_קבועות": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
  },
  "יומן_מצב_רפואי": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
  },
  "בדיקות_דם": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
  },
  "בדיקות_גנטיות": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
  },
  "הנחיות_רפואיות_ומשימות": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
  },
  // [Task 185] גליון למידה חדש ל-S10 — שורה אחת לכל אירוע (לא לכל מסמך),
  // מחליף בפועל את S10_למידה_רפואי הישן (נשאר יתום, לא נמחק אוטומטית)
  "דוגמאות_למידה_S10": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
    },
  // [Task 198] טאב ארכיון — מבנה זהה ל-ניהול_מיילים (27 עמודות), לתמיכה
  // בארכוב אמיתי (Move שורות+קבצים, לא רק פילטר תצוגה)
  "ניהול_מיילים_ארכיון": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
    },
  // [הרחבה, Task #206] גליון מיפוי_קודים — מערכות גוף + קודי אירוע
  "מיפוי_קודים": {
    FROZEN_ROWS:    4,
    HEADER_ROW:     4,
    FIRST_DATA_ROW: 5
  }
};
const SHEETS_MAP = {

  "ניהול_מיילים": [
    { col: 1,  name: "File_ID",           zone: "Source Metadata",  writers: ["S03","S04"],                            readers: ["S05","S06"],               values: "מזהה Drive",                                                                           notes: "מזהה ייחודי של הקובץ ב-Drive" },
    { col: 2,  name: "Capture_Date",      zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "תאריך",                                                                                notes: "תאריך כניסה למערכת" },
    { col: 3,  name: "Source",            zone: "Source Metadata",  writers: ["S03","S04"],                            readers: ["S05"],                     values: "Gmail|Drive_Manual",                                                                   notes: "מקור הרשומה" },
    { col: 4,  name: "Source_Reference",  zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "מזהה חופשי",                                                                           notes: "מזהה מייל (Gmail) / מזהה תיקייה (Drive)" },
    { col: 5,  name: "Source_Title",      zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "נושא מייל / שם קובץ" },
    { col: 6,  name: "Source_Author",     zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "שולח מייל / עמוס ידני" },
    { col: 7,  name: "Source_Date",       zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "תאריך",                                                                                notes: "תאריך מייל / תאריך עדכון קובץ" },
    { col: 8,  name: "Attachment_Name",   zone: "Source Metadata",  writers: ["S03","S04"],                            readers: ["QA"],                      values: "שם קובץ",                                                                              notes: "שם הקובץ הפיזי כולל סיומת" },
    { col: 9,  name: "Doc_Title",         zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "כותרת המסמך האמיתית" },
    { col: 10, name: "Doc_Issuer",        zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "מנפיק המסמך" },
    { col: 11, name: "Doc_Date",          zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "תאריך",                                                                                notes: "תאריך המסמך עצמו" },
    { col: 12, name: "Doc_Category",      zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר",                                                       notes: "קטגוריה" },
    { col: 13, name: "Pipeline_Status",   zone: "סטטוסים",          writers: ["S05","S06","S07","S08","S09"],          readers: ["S06","QA"],                values: "ממתין להמרה ל-TXT|הומר ל-TXT|עבר סיווג|ממתין לאימות|מאושר|חולץ ליומן אירועים",         notes: "סטטוס הרשומה ב-pipeline" },
    { col: 14, name: "Extraction_Status", zone: "סטטוסים",          writers: ["S07"],                                  readers: [],                          values: "ממתין|חולץ חלקי|חולץ מלא",                                                             notes: "סטטוס חילוץ תוכן" },
    { col: 15, name: "File_Type",         zone: "טכני",             writers: ["S05","S06"],                            readers: ["QA"],                      values: "SYSTEM_PDF|SYSTEM_IMG|SYSTEM_GDOC|SYSTEM_DOCX|SYSTEM_TXT|SYSTEM_SHEET",          notes: "סוג קובץ לפי MIME" },
    { col: 16, name: "File_Size",         zone: "טכני",             writers: ["S05","S06"],                            readers: ["QA"],                      values: "XX KB|XX MB",                                                                          notes: "גודל קובץ" },
    { col: 17, name: "Complexity",        zone: "טכני",             writers: ["S06","S07"],                            readers: ["S07"],                     values: "פשוט|בינוני|מורכב",                                                                    notes: "מורכבות המסמך" },
    { col: 18, name: "Duplicate_Flag",    zone: "טכני",             writers: ["S05","S07"],                            readers: ["QA","S07","S08"],          values: "חשוד ככפול — שורה X|כפול מאושר — שורה X|חשוד כלוגו|לוגו מאושר",              notes: "זיהוי ואימות כפולים" },
    { col: 19, name: "Error_Code",        zone: "שגיאות",           writers: ["S03","S04","S05","S06","S07","S09"],    readers: ["QA"],                      values: "429|503|NO_ID|ACCESS|EMPTY|UNSUPPORTED|PARSE|UNKNOWN|SKIP",                       notes: "קוד שגיאה קצר — מנוקה בהצלחה" },
    { col: 20, name: "Error_Detail",      zone: "שגיאות",           writers: ["S03","S04","S05","S06","S07","S09"],    readers: ["QA"],                      values: "טקסט חופשי",                                                                           notes: "פירוט שגיאה — מנוקה בהצלחה" },
    { col: 21, name: "QA_Status",         zone: "בדיקות",           writers: ["QA","S08"],                             readers: [],                          values: "✅ תקין|⚠️ + פירוט|✅ אושר ידנית|נשלח ללמידה",                                   notes: "תוצאת בדיקת QA / אימות ידני S08" },
   { col: 22, name: "QA_Dismiss_Note",   zone: "בדיקות",           writers: ["S08"],                                  readers: ["S07","S11"],               values: "נבדק ידנית — לא רלוונטי (כפול)|(לוגו/ריק)|(טקסט פגום)",                              notes: "דחיית חשד QA ידנית (Task 155) — מונעת זיהוי חוזר של S07/S11" },
    { col: 23, name: "Source_URL",        zone: "לינקים",           writers: ["S03","S04"],                            readers: ["S06","QA","S08","S09"],    values: "https://drive.google.com/...",                                                          notes: "קישור לקובץ המקורי ב-Drive" },
    { col: 24, name: "TXT_URL",           zone: "לינקים",           writers: ["S06"],                                  readers: ["S05","S07","QA","S08","S09"], values: "https://drive.google.com/...",                                                       notes: "קישור לקובץ TXT שנוצר" },
    { col: 25, name: "Temp_URL",          zone: "לינקים",           writers: ["S06"],                                  readers: [],                          values: "https://drive.google.com/...",                                                          notes: "קישור זמני במהלך המרה" },
    { col: 26, name: "Raw_Text",          zone: "טקסט גולמי",       writers: ["S06","S07"],                            readers: [],                          values: "טקסט מלא",                                                                             notes: "הטקסט המלא — עמודה אחרונה, רחבה מאוד" },
    { col: 27, name: "Duplicate_Target_FileID", zone: "טכני",       writers: ["S07"],                                  readers: ["S07","S08","S11"],         values: "Drive ID",                                                                             notes: "רפרנס פיזי לשורת-התאום בזיהוי כפילות (Task 129/130) — מחליף getNote() על עמודה R. ריק = אין חשד כפילות פעיל." }
  ],

  // [Task 198] טאב ארכיון — מבנה עמודות זהה ל-ניהול_מיילים (27 עמודות),
  // נכתב ע"י תהליך הארכוב האמיתי (שדרוג runArchiveView, ViewEngine.gs) —
  // לא ע"י שירותי ה-pipeline המקוריים (S03-S09), ולכן writers כאן הוא S12 בלבד.
  "ניהול_מיילים_ארכיון": [
    { col: 1,  name: "File_ID",           zone: "Source Metadata",  writers: ["S12"], readers: [], values: "מזהה Drive",                                                                           notes: "זהה ל-ניהול_מיילים — מזהה ייחודי של הקובץ ב-Drive (נשמר, moveTo לא משנה ID)" },
    { col: 2,  name: "Capture_Date",      zone: "Source Metadata",  writers: ["S12"], readers: [], values: "תאריך",                                                                                notes: "זהה ל-ניהול_מיילים — תאריך כניסה מקורי למערכת" },
    { col: 3,  name: "Source",            zone: "Source Metadata",  writers: ["S12"], readers: [], values: "Gmail|Drive_Manual",                                                                   notes: "זהה ל-ניהול_מיילים — מקור הרשומה המקורי" },
    { col: 4,  name: "Source_Reference",  zone: "Source Metadata",  writers: ["S12"], readers: [], values: "מזהה חופשי",                                                                           notes: "זהה ל-ניהול_מיילים" },
    { col: 5,  name: "Source_Title",      zone: "Source Metadata",  writers: ["S12"], readers: [], values: "טקסט חופשי",                                                                           notes: "זהה ל-ניהול_מיילים" },
    { col: 6,  name: "Source_Author",     zone: "Source Metadata",  writers: ["S12"], readers: [], values: "טקסט חופשי",                                                                           notes: "זהה ל-ניהול_מיילים" },
    { col: 7,  name: "Source_Date",       zone: "Source Metadata",  writers: ["S12"], readers: [], values: "תאריך",                                                                                notes: "זהה ל-ניהול_מיילים" },
    { col: 8,  name: "Attachment_Name",   zone: "Source Metadata",  writers: ["S12"], readers: [], values: "שם קובץ",                                                                              notes: "זהה ל-ניהול_מיילים" },
    { col: 9,  name: "Doc_Title",         zone: "Content Metadata", writers: ["S12"], readers: [], values: "טקסט חופשי",                                                                           notes: "זהה ל-ניהול_מיילים" },
    { col: 10, name: "Doc_Issuer",        zone: "Content Metadata", writers: ["S12"], readers: [], values: "טקסט חופשי",                                                                           notes: "זהה ל-ניהול_מיילים" },
    { col: 11, name: "Doc_Date",          zone: "Content Metadata", writers: ["S12"], readers: [], values: "תאריך",                                                                                notes: "זהה ל-ניהול_מיילים" },
    { col: 12, name: "Doc_Category",      zone: "Content Metadata", writers: ["S12"], readers: [], values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר",                                                       notes: "זהה ל-ניהול_מיילים" },
    { col: 13, name: "Pipeline_Status",   zone: "סטטוסים",          writers: ["S12"], readers: [], values: "חולץ ליומן אירועים",                                                                    notes: "בפועל תמיד ערך זה בעת הארכוב — זה תנאי הזכאות לארכוב (Task #198)" },
    { col: 14, name: "Extraction_Status", zone: "סטטוסים",          writers: ["S12"], readers: [], values: "ממתין|חולץ חלקי|חולץ מלא",                                                             notes: "זהה ל-ניהול_מיילים" },
    { col: 15, name: "File_Type",         zone: "טכני",             writers: ["S12"], readers: [], values: "SYSTEM_PDF|SYSTEM_IMG|SYSTEM_GDOC|SYSTEM_DOCX|SYSTEM_TXT|SYSTEM_SHEET",          notes: "זהה ל-ניהול_מיילים" },
    { col: 16, name: "File_Size",         zone: "טכני",             writers: ["S12"], readers: [], values: "XX KB|XX MB",                                                                          notes: "זהה ל-ניהול_מיילים" },
    { col: 17, name: "Complexity",        zone: "טכני",             writers: ["S12"], readers: [], values: "פשוט|בינוני|מורכב",                                                                    notes: "זהה ל-ניהול_מיילים" },
    { col: 18, name: "Duplicate_Flag",    zone: "טכני",             writers: ["S12"], readers: [], values: "חשוד ככפול — שורה X|כפול מאושר — שורה X|חשוד כלוגו|לוגו מאושר",              notes: "זהה ל-ניהול_מיילים — ערך היסטורי בעת הארכוב, לא מתעדכן יותר" },
    { col: 19, name: "Error_Code",        zone: "שגיאות",           writers: ["S12"], readers: [], values: "429|503|NO_ID|ACCESS|EMPTY|UNSUPPORTED|PARSE|UNKNOWN|SKIP",                       notes: "זהה ל-ניהול_מיילים" },
    { col: 20, name: "Error_Detail",      zone: "שגיאות",           writers: ["S12"], readers: [], values: "טקסט חופשי",                                                                           notes: "זהה ל-ניהול_מיילים" },
    { col: 21, name: "QA_Status",         zone: "בדיקות",           writers: ["S12"], readers: [], values: "✅ תקין|⚠️ + פירוט|✅ אושר ידנית|נשלח ללמידה",                                   notes: "זהה ל-ניהול_מיילים" },
    { col: 22, name: "QA_Dismiss_Note",   zone: "בדיקות",           writers: ["S12"], readers: [], values: "נבדק ידנית — לא רלוונטי (כפול)|(לוגו/ריק)|(טקסט פגום)",                              notes: "זהה ל-ניהול_מיילים" },
    { col: 23, name: "Source_URL",        zone: "לינקים",           writers: ["S12"], readers: [], values: "https://drive.google.com/...",                                                          notes: "מתעדכן ע\"י הארכוב אם הקובץ עבר moveTo — ה-ID זהה, ה-URL עצמו לא משתנה" },
    { col: 24, name: "TXT_URL",           zone: "לינקים",           writers: ["S12"], readers: [], values: "https://drive.google.com/...",                                                          notes: "מתעדכן ע\"י הארכוב אם הקובץ עבר moveTo — ה-ID זהה, ה-URL עצמו לא משתנה" },
    { col: 25, name: "Temp_URL",          zone: "לינקים",           writers: ["S12"], readers: [], values: "https://drive.google.com/...",                                                          notes: "זהה ל-ניהול_מיילים" },
    { col: 26, name: "Raw_Text",          zone: "טקסט גולמי",       writers: ["S12"], readers: [], values: "טקסט מלא",                                                                             notes: "זהה ל-ניהול_מיילים — עמודה אחרונה, רחבה מאוד" },
    { col: 27, name: "Duplicate_Target_FileID", zone: "טכני",       writers: ["S12"], readers: [], values: "Drive ID",                                                                             notes: "[Task #198] רפרנס לשורת-תאום — עלול להצביע על שורה ב-ניהול_מיילים (חיה) או כאן (ארכיון); s08_fixReferencesAfterDelete מורחב סורק את שני הטאבים" }
  ],
  // [v2.9.0] גליון יעד של S09 — אירועים רפואיים מחולצים
  "יומן_אירועים_רפואי": [
    { col: 1, name: "Event_Date",        zone: "אירוע",  writers: ["S09"], readers: ["S10"], values: "תאריך DD/MM/YYYY",    notes: "תאריך האירוע הרפואי — מהמסמך או תאריך המסמך כברירת מחדל" },
    { col: 2, name: "Event_Type",        zone: "אירוע",  writers: ["S09"], readers: ["S10"], values: "טקסט חופשי",          notes: "סוג האירוע — לדוגמה: ביקור רופא, בדיקת דם, ניתוח" },
    { col: 3, name: "Medical_System",    zone: "אירוע",  writers: ["S09"], readers: ["S10"], values: "טקסט חופשי",          notes: "מערכת / איבר רפואי — לדוגמה: לב, אורתופדיה" },
    { col: 4, name: "Issuer",            zone: "אירוע",  writers: ["S09"], readers: ["S10"], values: "טקסט חופשי",          notes: "מוסד / רופא מנפיק — זהה ל-Doc_Issuer בניהול_מיילים" },
    { col: 5, name: "Summary",           zone: "תוכן",   writers: ["S09"], readers: ["S10"], values: "טקסט חופשי — ארוך",  notes: "סיכום ממצא — טקסט דינמי וארוך — עמודה E במכוון בסוף הגלויות" },
    { col: 6, name: "Routing_Category",  zone: "טכני",   writers: ["S09"], readers: ["S10"], values: "טקסט חופשי",          notes: "קטגוריית ניתוב — לאיזה גליון יעד נוסף המידע" },
    { col: 7, name: "S_Row",             zone: "טכני",   writers: ["VIEWENGINE"], readers: [], values: "מספר שורה",           notes: "מספר שורת המקור בניהול_מיילים (עמודה A שם) — מחושב ומתעדכן ע\"י כפתור \"רענן שורות\" (refreshMedicalEventsRows, ViewEngine.gs) בכל הרצה. עמודה צרה במכוון — ריבוי מותר (כמה שורות יכולות להצביע לאותה שורת מקור)" },
    // [Task 185] 2 עמודות סטטוס חדשות — ברמת תת-האירוע (שורה בודדת), לא
    // ברמת המסמך כולו. Validation_Status נכתב ע"י S10 (אישור/עדכון/למידה
    // יזומה — שלושתם). Extraction_Status ייכתב ע"י S13 (עתידי) אחרי כתיבה
    // מוצלחת של השורה הזו לגליון היעד שלה.
    { col: 8, name: "Validation_Status",  zone: "טכני",   writers: ["S10"], readers: ["S12","S13"], values: "מאומת",           notes: "ריק=ממתין לאימות S10 | \"מאומת\"=עבר אישור/עדכון/למידה" },
     { col: 9, name: "Extraction_Status",  zone: "טכני",   writers: ["S13"], readers: [],            values: "חולץ",             notes: "ריק=ממתין לחילוץ S13 | \"חולץ\"=נכתב בהצלחה לגליון היעד שלו" },
    // [Task 187] 2 עמודות כפילות חדשות — מבוססות ניקוד השוואת שדות (Event_Date/
    // Medical_System/Issuer/Routing_Category/Summary) + Union-Find מותאם (מפתח:
    // מספר שורה, לא File_ID — כי מסמך אחד יכול לייצר כמה שורות-אירוע). S14 לא
    // מוחק שורות, רק מסמן — עקרון זהה ל-S11 (ניהול_מיילים).
    { col: 10, name: "Duplicate_Flag",       zone: "טכני",   writers: ["S14"], readers: ["S14"], values: "כפול מאושר — שורה X",  notes: "[Task #187] סימון כפילות שזוהתה ע\"י S14 — נגזר מחדש בכל סריקה, לא נמחקת שורה" },
    { col: 11, name: "Duplicate_Target_Ref", zone: "טכני",   writers: ["S14"], readers: ["S14"], values: "מספר שורה",            notes: "[Task #187] שורת העוגן בקבוצת הכפילות — Union-Find לפי מספר שורה, נגזר מחדש בכל סריקת S14" },
    { col: 12, name: "File_ID",              zone: "טכני",   writers: ["S09"], readers: ["S11","S13"], values: "Drive ID",       notes: "מזהה קובץ מקורי בדרייב — הועבר לכאן מעמודה G כדי לפנות מקום ל-S_Row. נקרא ע\"י S11 (בדיקת כפילות מול ניהול_מיילים) ו-S13 (חילוץ מהמסמך המקורי)" }
  ],
  // [Task 184] גליון יעד — תרופות קבועות שחולצו ע"י S09 (כותרות אנגלית)

  // [Task 184] גליון יעד — תרופות קבועות שחולצו ע"י S09 (כותרות אנגלית)
  "תרופות_קבועות": [
    { col: 1,  name: "Drug_Name",         zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "שם מסחרי של התרופה" },
    { col: 2,  name: "Active_Ingredient", zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "החומר הפעיל, אם צוין במסמך" },
    { col: 3,  name: "Dosage",            zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "לדוגמה: 25 mg" },
    { col: 4,  name: "Frequency",         zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "לדוגמה: 1 ביום" },
    { col: 5,  name: "Treatment_Reason",  zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "האבחנה/הסיבה למרשם" },
    { col: 6,  name: "Start_Date",        zone: "אירוע", writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY",  notes: "אם צוין במסמך" },
    { col: 7,  name: "End_Date",          zone: "אירוע", writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY",  notes: "אם צוין במסמך" },
    { col: 8,  name: "Status",            zone: "אירוע", writers: ["S13"], readers: [], values: "פעיל|הופסק",        notes: "ברירת מחדל: פעיל" },
    { col: 9,  name: "Doc_Issuer",        zone: "טכני",  writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "מנפיק המסמך — docIssuer" },
    { col: 10, name: "Source_URL",        zone: "טכני",  writers: ["S13"], readers: [], values: "https://drive.google.com/...", notes: "קישור לקובץ המקור" },
    { col: 11, name: "File_ID",           zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "מזהה קובץ מקורי — מפתח מקשר חזרה לניהול_מיילים" },
    { col: 12, name: "Medical_System",    zone: "טכני",  writers: ["S13"], readers: [], values: "SYS00-SYS14",       notes: "[Task #188] קבוע: תמיד SYS00 (כללי) — תרופה לא ממופה למערכת ספציפית לאווטאר" }
  ],

    // [Task 184] גליון יעד — מצב רפואי (medical_status) שחולץ ע"י S09 (כותרות אנגלית)
      "יומן_מצב_רפואי": [
    { col: 1,  name: "Event_Date",             zone: "אירוע", writers: ["S13"],        readers: [], values: "תאריך DD/MM/YYYY", notes: "מהמסמך או תאריך המסמך כברירת מחדל" },
    { col: 2,  name: "Event_Type",             zone: "אירוע", writers: ["S13"],        readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 3,  name: "Medical_System_Name",    zone: "אירוע", writers: ["S13"],        readers: [], values: "טקסט חופשי",       notes: "[Task #206, סבב 3] גולמי — מחליף את Issuer שהיה כאן. הקוד מפסיק לדרוס אותה (בדומה ל-Event_Type); הגרסה המנורמלת עברה לעמודה 14 (Body_System_Normalized)" },
    { col: 4,  name: "Primary_Diagnosis",      zone: "תוכן",  writers: ["S13"],        readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 5,  name: "Severity_Status",        zone: "תוכן",  writers: ["S13"],        readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 6,  name: "Recommendations",        zone: "תוכן",  writers: ["S13"],        readers: [], values: "טקסט חופשי — ארוך", notes: "מקור MAX_TOKENS ב-Task 180" },
    { col: 7,  name: "Record_Status",          zone: "טכני",  writers: ["S13"],        readers: [], values: "חדש",               notes: "" },
    { col: 8,  name: "Doc_Issuer",             zone: "טכני",  writers: ["S13"],        readers: [], values: "טקסט חופשי",        notes: "docIssuer" },
    { col: 9,  name: "S_Row",                  zone: "טכני",  writers: ["VIEWENGINE"], readers: [], values: "מספר שורה",        notes: "[Task #206] שורת מקור ב-ניהול_מיילים לפי File_ID (עמ' 12) — אותו מנגנון בדיוק כמו S_Row ביומן_אירועים_רפואי (Task #205)" },
    { col: 10, name: "Medical_System",         zone: "טכני",  writers: ["S13"],        readers: [], values: "SYS00-SYS14",      notes: "[Task #206] הועבר לכאן מעמודה 3. [Task #188] דינמי — Gemini קובע לפי תוכן השורה" },
    { col: 11, name: "ET_CODE",                zone: "טכני",  writers: ["VIEWENGINE"], readers: [], values: "קוד אירוע (למשל A00)", notes: "[הרחבה, Task #206] קוד אירוע מפוענח מ-Event_Type (עמ' 2) דרך מיפוי דינמי מגליון מיפוי_קודים (CODE_MAP_TYPE_EVENT, ViewEngine.gs); ברירת מחדל A00 (בדיקה) לערך לא ממופה. מחושב בכפתור 'רענן שורות' (refreshMedicalStatusRows)" },
    { col: 12, name: "File_ID",                zone: "טכני",  writers: ["S13"],        readers: [], values: "Drive ID",          notes: "[הרחבה, Task #206] הוזז לעמודה 12 (היה 11) עם הוספת ET_CODE" },
    { col: 13, name: "Source_URL",             zone: "טכני",  writers: ["S13"],        readers: [], values: "https://drive.google.com/...", notes: "[הרחבה, Task #206] הוזז לעמודה 13 (היה 12) עם הוספת ET_CODE" },
    { col: 14, name: "Body_System_Normalized", zone: "טכני",  writers: ["VIEWENGINE"], readers: [], values: "טקסט חופשי — פענוח SYS", notes: "[הרחבה, Task #206, סבב 3] שם מערכת גוף מנורמל להצגה — מחושב בכפתור 'רענן שורות' מתוך Medical_System (עמ' 10) דרך מיפוי דינמי מגליון מיפוי_קודים (CODE_MAP_TYPE_BODY_SYSTEM)" },
    { col: 15, name: "Event_Type_Normalized",  zone: "טכני",  writers: ["VIEWENGINE"], readers: [], values: "טקסט חופשי",       notes: "[הרחבה, Task #206, סבב 3] שם מנורמל של האירוע להצגה — מחושב בכפתור 'רענן שורות' מתוך Event_Type (עמ' 2) דרך מיפוי דינמי מגליון מיפוי_קודים (CODE_MAP_TYPE_EVENT); ריק אם אין התאמה" }
  ],
  // [Task 184] גליון יעד — בדיקות דם שחולצו ע"י S09 (כותרות אנגלית)
  "בדיקות_דם": [
    { col: 1,  name: "Test_Date",     zone: "אירוע", writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY", notes: "" },
    { col: 2,  name: "Test_Name",     zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "לדוגמה: WBC, HB" },
    { col: 3,  name: "Category",      zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "לדוגמה: המטולוגיה" },
    { col: 4,  name: "Value",         zone: "תוכן",  writers: ["S13"], readers: [], values: "מספר/טקסט",        notes: "" },
    { col: 5,  name: "Normal_Range",  zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 6,  name: "Status",        zone: "תוכן",  writers: ["S13"], readers: [], values: "תקין|גבוה|נמוך|לא תקין", notes: "" },
    { col: 7,  name: "Doctor_Note",   zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 8,  name: "Source_URL",    zone: "טכני",  writers: ["S13"], readers: [], values: "https://drive.google.com/...", notes: "" },
    { col: 9,  name: "File_ID",       zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "" },
    { col: 10, name: "Doc_Issuer",    zone: "טכני",  writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "docIssuer — [Task 184] תוקן: הייתה חסרת כותרת בגליון החי" },
    { col: 11, name: "Medical_System", zone: "טכני", writers: ["S13"], readers: [], values: "SYS00-SYS14",       notes: "[Task #188] קבוע: תמיד SYS06 (דם וכלי דם) — כל בדיקת דם מקוטלגת אוטומטית" }
  ],

  // [Task 184] גליון יעד — בדיקות גנטיות שחולצו ע"י S09 (כותרות אנגלית)
  "בדיקות_גנטיות": [
    { col: 1, name: "Test_Date",              zone: "אירוע", writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY", notes: "" },
    { col: 2, name: "Panel_Name",             zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "לדוגמה: נוטריגנטי" },
    { col: 3, name: "Gene_Variant",           zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 4, name: "Finding",                zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 5, name: "Clinical_Significance",  zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 6, name: "Recommendation",         zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 7, name: "Source_URL",             zone: "טכני",  writers: ["S13"], readers: [], values: "https://drive.google.com/...", notes: "" },
    { col: 8, name: "File_ID",                zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "" },
    { col: 9, name: "Medical_System",         zone: "טכני",  writers: ["S13"], readers: [], values: "SYS00-SYS14",       notes: "[Task #188] קבוע: תמיד SYS14 (גנים) — כל בדיקה גנטית מקוטלגת אוטומטית" }
  ],

  // [Task 184] גליון יעד — הנחיות ומשימות שחולצו ע"י S09 (כותרות אנגלית)
  "הנחיות_רפואיות_ומשימות": [
    { col: 1, name: "Instruction_Date",  zone: "אירוע", writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY", notes: "" },
    { col: 2, name: "Doc_Issuer",        zone: "אירוע", writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "מנפיק — docIssuer" },
    { col: 3, name: "Task_Description",  zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 4, name: "Task_Type",         zone: "תוכן",  writers: ["S13"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 5, name: "Due_Date",          zone: "תוכן",  writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY", notes: "" },
    { col: 6, name: "Status",            zone: "תוכן",  writers: ["S13"], readers: [], values: "פתוח|בוצע",        notes: "" },
    { col: 7, name: "Source_URL",        zone: "טכני",  writers: ["S13"], readers: [], values: "https://drive.google.com/...", notes: "" },
    { col: 8, name: "File_ID",           zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "" },
    { col: 9, name: "Medical_System",    zone: "טכני",  writers: ["S13"], readers: [], values: "SYS00-SYS14",       notes: "[Task #188] דינמי — Gemini קובע לפי תוכן ההנחיה (יכולה לגעת בכל מערכת)" }
  ],

  "דוגמאות_למידה": [
    { col: 1, name: "Subject",           zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "כותרת/סוג המסמך לדוגמה" },
    { col: 2, name: "Issuer",            zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "מנפיק המסמך לדוגמה" },
    { col: 3, name: "Classification",    zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר", notes: "קטגוריה מאושרת ידנית" },
    { col: 4, name: "TXT_Document_Link", zone: "טכני",  writers: ["S08"], readers: ["S07"], values: "https://drive.google.com/...",     notes: "קישור לקובץ TXT לדוגמה" },
    { col: 5, name: "Original_File_ID",  zone: "טכני",  writers: ["S08"], readers: ["S07"], values: "Drive ID",                        notes: "מזהה קובץ מקורי ב-Drive" },
    { col: 6, name: "Complexity",        zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "פשוט|בינוני|מורכב",               notes: "מורכבות המסמך" },
    { col: 7, name: "Doc_Date",          zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "תאריך",                           notes: "תאריך המסמך" },
    { col: 8, name: "Notes",             zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "הערת למידה — סיבת התיקון" },  
    
  ],

  // [FIX-4] גליון למידה חדש — S10 אימות אירועים רפואיים
  "S10_למידה_רפואי": [
    { col: 1, name: "Source_File_ID",       zone: "מפתח",   writers: ["S10"], readers: ["S09"], values: "Drive ID",          notes: "מזהה קובץ המקור — מפתח מקשר לשורה בניהול_מיילים" },
    { col: 2, name: "Split_Index",          zone: "מפתח",   writers: ["S10"], readers: ["S09"], values: "X/Y",               notes: "מספור האירוע מתוך המסמך — לדוגמה 2/3" },
    { col: 3, name: "Target_Sheet",         zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "יומן_אירועים_רפואי|תרופות_קבועות|יומן_מצב_רפואי|בדיקות_דם|בדיקות_גנטיות|הנחיות_רפואיות_ומשימות", notes: "גליון היעד שאליו נכתב האירוע" },
    { col: 4, name: "Extracted_Data_JSON",  zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "JSON",               notes: "אובייקט השדות המלא של האירוע לאחר אימות" },
    { col: 5, name: "Complexity_Level",     zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "1|2|3|4|5",          notes: "רמת מורכבות האירוע 1=פשוט, 5=מורכב מאוד" },
    { col: 6, name: "User_Correction_Note", zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "הסבר המשתמש לתיקון — מה Gemini טעה ולמה" },
    { col: 7, name: "Timestamp",            zone: "טכני",   writers: ["S10"], readers: [],      values: "תאריך ושעה",         notes: "מועד אימות האירוע" }
  ],

  // [Task 185] גליון למידה חדש — שורה אחת לכל אירוע (לא לכל מסמך), מאפשר
  // סינון/קיבוץ לפי Source_File_ID (מסמך) או Routing_Category (קטגוריה).
  // מחליף בפועל את S10_למידה_רפואי לעיל.
  "דוגמאות_למידה_S10": [
    { col: 1,  name: "Source_File_ID",       zone: "מפתח",  writers: ["S10"], readers: ["S09"], values: "Drive ID",           notes: "מזהה קובץ המקור — מפתח קיבוץ: כל השורות עם אותו מזהה = פירוק אחד שלם של מסמך אחד" },
    { col: 2,  name: "Event_Index",          zone: "מפתח",  writers: ["S10"], readers: ["S09"], values: "מספר שלם",           notes: "סדר האירוע בתוך אותו מסמך (1, 2, 3...) — לשחזור סדר מקורי" },
    { col: 3,  name: "Event_Date",           zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "תאריך DD/MM/YYYY",   notes: "" },
    { col: 4,  name: "Event_Type",           zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "" },
    { col: 5,  name: "Medical_System",       zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "" },
    { col: 6,  name: "Issuer",               zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "" },
    { col: 7,  name: "Summary",              zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "כולל כל הפרטים המקובצים לאותו נושא — ראה כלל הקיבוץ בפרומפט S09" },
    { col: 8,  name: "Routing_Category",     zone: "מפתח",  writers: ["S10"], readers: ["S09"], values: "בדיקת דם|בדיקה גנטית|מרשם תרופה|מצב רפואי|ניתוח/פעולה רפואית|הנחיה|כללי", notes: "מפתח סינון/פיצול — עמודה רגילה, ניתנת ל-Filter/Pivot" },
    { col: 9,  name: "Complexity_Level",     zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "1|2|3|4|5",          notes: "רמת מורכבות המסמך כולו 1=פשוט, 5=מורכב מאוד" },
    { col: 10, name: "User_Correction_Note", zone: "תוכן",  writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "הסבר המשתמש לתיקון — מה Gemini טעה ולמה (למשל: פיצול/איחוד שגוי)" },
    { col: 11, name: "Timestamp",            zone: "טכני",  writers: ["S10"], readers: [],      values: "תאריך ושעה",         notes: "מועד אימות האירוע" }
  ],

  "מנהל_משאבים": [
    { col: 1,  name: "Extractor_ID",     zone: "זיהוי",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "GEMINI_FLASH_1.5|GEMINI_FLASH_2.0|GEMINI_PRO_1.5|GEMINI_PRO_2.5", notes: "מזהה ייחודי של המחלץ" },
    { col: 2,  name: "Endpoint_URL",     zone: "זיהוי",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "https://generativelanguage.googleapis.com/...",                    notes: "כתובת ה-API המלאה" },
    { col: 3,  name: "Daily_Quota",      zone: "מכסה",   writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "1500|50",                                                          notes: "מכסה יומית מקסימלית" },
    { col: 4,  name: "Used_Today",       zone: "מכסה",   writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "מספר שלם",                                                         notes: "כמה בקשות נשלחו היום — מתאפס כל לילה" },
    { col: 5,  name: "Remaining",        zone: "מכסה",   writers: [],                   readers: ["ExtractorManager","S06","S07"], values: "=C-D",                                                             notes: "נוסחה חיה — Daily_Quota פחות Used_Today" },
    { col: 6,  name: "RPM_Limit",        zone: "קצב",    writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "15|2",                                                             notes: "בקשות מקסימליות לדקה" },
    { col: 7,  name: "Status",           zone: "סטטוס",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "ACTIVE|EXHAUSTED|ERROR|DISABLED",                                  notes: "מצב המחלץ כרגע" },
    { col: 8,  name: "Complexity_Match", zone: "ניתוב",  writers: ["ExtractorManager"], readers: ["S07"],                         values: "SIMPLE|MEDIUM|COMPLEX|DIAGNOSTICS|TABLES|ULTIMATE|HANDWRITING|MEDICAL_DEEP", notes: "לאיזה מורכבות המחלץ מתאים" },
    { col: 9,  name: "Reset_Time",       zone: "תזמון",  writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "00:00 UTC",                                                        notes: "שעת איפוס יומי" },
    { col: 10, name: "Last_Used",        zone: "תזמון",  writers: ["ExtractorManager"], readers: [],                              values: "תאריך ושעה",                                                       notes: "מתי בוצעה הבקשה האחרונה" },
    { col: 11, name: "Notes",            zone: "מידע",   writers: ["ExtractorManager"], readers: [],                              values: "טקסט חופשי",                                                       notes: "הערות — למשל: מפתח הוחלף, שגיאה ידועה" }
  ],

  "מסנכרן_קבצים": [
    { col: 1,  name: "File_Name",      zone: "סנכרון", writers: [], readers: [], values: "שם קובץ",       notes: "שם הקובץ ללא סיומת" },
    { col: 2,  name: "Git_Path",       zone: "סנכרון", writers: [], readers: [], values: "נתיב",           notes: "נתיב מלא בקוד המקור" },
    { col: 3,  name: "Exists_Editor",  zone: "סנכרון", writers: [], readers: [], values: "כן|לא",          notes: "האם קיים בעורך" },
    { col: 4,  name: "Exists_Git",     zone: "סנכרון", writers: [], readers: [], values: "כן|לא",          notes: "האם קיים בגיטהאב" },
    { col: 5,  name: "Editor_Lines",   zone: "סנכרון", writers: [], readers: [], values: "מספר שורות",    notes: "מספר שורות קוד בעורך — לזיהוי שינויים" },
    { col: 6,  name: "Git_Lines",      zone: "סנכרון", writers: [], readers: [], values: "מספר שורות",    notes: "מספר שורות קוד ב-GitHub — להשוואה" },
    { col: 7,  name: "Version_Editor", zone: "סנכרון", writers: [], readers: [], values: "שורת גרסה",     notes: "שורת @version מהעורך" },
    { col: 8,  name: "Version_Git",    zone: "סנכרון", writers: [], readers: [], values: "שורת גרסה",     notes: "שורת @version מהגיט" },
    { col: 9,  name: "Status",         zone: "סנכרון", writers: [], readers: [], values: "תואם|שונה|חסר",  notes: "מצב השוואה" },
    { col: 10, name: "Action",         zone: "סנכרון", writers: [], readers: [], values: "שחזר|דחוף",      notes: "פעולה מוצעת" },
    { col: 11, name: "Notes",          zone: "סנכרון", writers: [], readers: [], values: "טקסט חופשי",    notes: "הערות" }
   ],

   // [הרחבה, Task #206, סבב 3] גליון מיפוי_קודים — טבלה אחודה: מערכות גוף
  // (SYS00-SYS14) + קודי אירוע (ET_CODE). נטען דינמית ע"י _codeMap_buildLookup
  // (ViewEngine.gs). מפתח החיפוש תלוי-סוג: Key עבור מערכת_גוף, Raw_Value
  // עבור קוד_אירוע.
  "מיפוי_קודים": [
    { col: 1, name: "Type",              zone: "מיפוי", writers: ["VIEWENGINE","עמוס"], readers: [], values: "מערכת_גוף|קוד_אירוע", notes: "[הרחבה, Task #206] קטגוריית השורה — קובעת לאיזה מיפוי היא שייכת" },
    { col: 2, name: "Key",               zone: "מיפוי", writers: ["VIEWENGINE","עמוס"], readers: [], values: "SYS00-SYS14 / קוד אירוע (למשל A00)", notes: "[הרחבה, Task #206] עבור מערכת_גוף — קוד SYS, זהו מפתח החיפוש. עבור קוד_אירוע — קוד האירוע עצמו (התוצאה, לא מפתח החיפוש — ראה Raw_Value)" },
    { col: 3, name: "Normalized_Value",  zone: "מיפוי", writers: ["עמוס"],              readers: [], values: "טקסט חופשי",       notes: "[הרחבה, Task #206] התוצאה הממופה להצגה — שם מערכת גוף (מערכת_גוף) או שם מנורמל של האירוע (קוד_אירוע). ריק = טרם מולא" },
    { col: 4, name: "Raw_Value",         zone: "מיפוי", writers: ["VIEWENGINE","עמוס"], readers: [], values: "טקסט חופשי",       notes: "[הרחבה, Task #206, סבב 3] בשימוש רק עבור קוד_אירוע — הטקסט הגולמי כפי שמופיע ב-Event_Type; זהו מפתח החיפוש בפועל לסוג זה. לא בשימוש עבור מערכת_גוף" }
  ]

};

// ══════════════════════════════════════════════════════════════════
// נתוני ברירת מחדל לגליונות חדשים
// ══════════════════════════════════════════════════════════════════

const SHEETS_DEFAULT_DATA = {

  "מנהל_משאבים": [
    [
      "GEMINI_FLASH_1.5",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      1500, 0, "=C2-D2", 15, "ACTIVE", "SIMPLE,MEDIUM", "00:00 UTC", "", "סוס עבודה יציב"
    ],
    [
      "GEMINI_FLASH_2.0",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      1500, 0, "=C3-D3", 15, "ACTIVE", "SIMPLE,DIAGNOSTICS", "00:00 UTC", "", "המהיר החדש"
    ],
    [
      "GEMINI_PRO_1.5",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      50, 0, "=C4-D4", 2, "ACTIVE", "COMPLEX,TABLES", "00:00 UTC", "", "החזק היציב"
    ],
    [
      "GEMINI_PRO_2.5",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
      50, 0, "=C5-D5", 2, "ACTIVE", "ULTIMATE,HANDWRITING,MEDICAL_DEEP", "00:00 UTC", "", "המוח המתקדם"
    ]
  ]

};

// ══════════════════════════════════════════════════════════════════
// פונקציה חד-פעמית — הכנסת עמודות Editor_Lines ו-Git_Lines
// להרצה פעם אחת בלבד אחרי עדכון הקוד
// ══════════════════════════════════════════════════════════════════

function insertEditorGitLinesColumns() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("מסנכרן_קבצים");
  if (!sheet) {
    Logger.log("❌ גליון מסנכרן_קבצים לא נמצא.");
    return;
  }

  // כתיבת כותרות לשורה 4 — שורת הכותרות בדוח המסנכרן
  sheet.getRange(4, 5).setValue("Editor_Lines");
  sheet.getRange(4, 6).setValue("Git_Lines");

  Logger.log("✅ כותרות Editor_Lines ו-Git_Lines נכתבו לשורה 4, עמודות E ו-F.");
}
// ══════════════════════════════════════════════════════════════════
// פונקציה 1 — הדפסת מבנה גליון
// ══════════════════════════════════════════════════════════════════

function printSheetMap() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }

  let report = "מבנה עמודות — " + sheetName + "\n";
  report += "═".repeat(50) + "\n\n";

  let currentZone = "";
  cols.forEach(function(c) {
    if (c.zone !== currentZone) {
      currentZone = c.zone;
      report += "\n── " + currentZone + " ──\n";
    }
    const letter = _colToLetter(c.col);
    report += letter + " | " + (c.name || "שמור") + "\n";
    if (c.notes)          report += "   → " + c.notes + "\n";
    if (c.writers.length) report += "   כותבים: " + c.writers.join(", ") + "\n";
    if (c.values)         report += "   ערכים: " + c.values + "\n";
  });

  ui.alert("מפת עמודות — " + sheetName, report, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 2 — פרטי עמודה בודדת
// ══════════════════════════════════════════════════════════════════

function printColumnDetail() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const colResult = ui.prompt("פרטי עמודה", "הכנס אות עמודה (A-Z):", ui.ButtonSet.OK_CANCEL);
  if (colResult.getSelectedButton() !== ui.Button.OK) return;

  const letter = colResult.getResponseText().trim().toUpperCase();
  const colNum = _letterToCol(letter);
  const cols   = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא: " + sheetName); return; }

  const col = cols.find(function(c) { return c.col === colNum; });
  if (!col) { ui.alert("עמודה " + letter + " לא מוגדרת במפה."); return; }

  let detail = "עמודה " + letter + " — " + sheetName + "\n";
  detail += "═".repeat(40) + "\n\n";
  detail += "שם: "     + (col.name || "שמור") + "\n";
  detail += "אזור: "   + col.zone  + "\n";
  detail += "הערה: "   + col.notes + "\n";
  detail += "ערכים: "  + col.values + "\n";
  detail += "כותבים: " + (col.writers.join(", ") || "—") + "\n";
  detail += "קוראים: " + (col.readers.join(", ") || "—") + "\n";

  ui.alert("פרטי עמודה " + letter, detail, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 3 — שחזור כותרות
// ══════════════════════════════════════════════════════════════════

function restoreHeaders() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { ui.alert("גליון לא נמצא בקובץ: " + sheetName); return; }

  // [v2.9.2] Task 154 — תיקון באג ידוע: הפונקציה כתבה תמיד לשורה 1
  // בקשיחות, בלי קשר להגדרת HEADER_ROW בפועל. כעת קוראת מ-SHEET_CONFIG
  // אם קיים (ניהול_מיילים/יומן_אירועים_רפואי/דוגמאות_למידה — כולן
  // HEADER_ROW=4), עם נפילה חזרה לשורה 1 לגליונות שאין להם עדיין
  // SHEET_CONFIG (התנהגות מקורית, לא נשברת).
  const headerRow = (SHEET_CONFIG[sheetName] && SHEET_CONFIG[sheetName].HEADER_ROW) || 1;

  const confirm = ui.alert(
    "שחזור כותרות",
    "האם לשחזר את כותרות שורה " + headerRow + " בגליון " + sheetName + "?\nפעולה זו תדרוס את הכותרות הנוכחיות.",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  sheet.getRange(headerRow, 1, 1, totalCols).setValues([headers]);
  sheet.getRange(headerRow, 1, 1, totalCols).setFontWeight("bold");
  sheet.getRange(headerRow, 1).activate();

  ui.alert("✅ כותרות שוחזרו בהצלחה לגליון " + sheetName);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 4 — בדיקת הרשאות כתיבה
// ══════════════════════════════════════════════════════════════════

function checkWritePermissions() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const serviceResult = ui.prompt(
    "בדיקת הרשאות כתיבה",
    "הכנס שם שירות (S03/S04/S05/S06/S07/S08/S09/S10/QA/ExtractorManager):",
    ui.ButtonSet.OK_CANCEL
  );
  if (serviceResult.getSelectedButton() !== ui.Button.OK) return;

  const service = serviceResult.getResponseText().trim().toUpperCase();
  const cols    = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא: " + sheetName); return; }

  let allowed   = [];
  let forbidden = [];

  cols.forEach(function(c) {
    const letter = _colToLetter(c.col);
    if (c.writers.indexOf(service) !== -1) {
      allowed.push(letter + " (" + (c.name || "שמור") + ")");
    } else if (c.name !== "") {
      forbidden.push(letter + " (" + c.name + ")");
    }
  });

  let report = "שירות: " + service + " | גליון: " + sheetName + "\n\n";
  report += "✅ מורשה לכתוב:\n" + (allowed.join(", ")   || "—") + "\n\n";
  report += "🚫 אסור לכתוב:\n"  + (forbidden.join(", ") || "—");

  ui.alert("הרשאות כתיבה — " + service, report, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 5 — הקמת גליון חדש מהמפה
// ══════════════════════════════════════════════════════════════════

function buildSheetFromMap() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const existingSheets    = ss.getSheets().map(function(s) { return s.getName(); });
  const availableToCreate = Object.keys(SHEETS_MAP).filter(function(name) {
    return existingSheets.indexOf(name) === -1;
  });

  if (availableToCreate.length === 0) {
    ui.alert("✅ כל הגליונות המוגדרים במפה כבר קיימים בקובץ.\nאין גליונות חדשים להקים.");
    return;
  }

  const result = ui.prompt(
    "הקמת גליון חדש",
    "גליונות זמינים להקמה:\n" + availableToCreate.join("\n") + "\n\nהכנס שם גליון:",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const sheetName = result.getResponseText().trim();
  if (!SHEETS_MAP[sheetName]) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }
  if (existingSheets.indexOf(sheetName) !== -1) {
    ui.alert("⚠️ גליון '" + sheetName + "' כבר קיים.\nלשחזור כותרות — השתמש ב'שחזור כותרות'.");
    return;
  }

  const cols      = SHEETS_MAP[sheetName];
  const sheet     = ss.insertSheet(sheetName);
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  const headerRange = sheet.getRange(1, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#d9e1f2");
  sheet.setFrozenRows(1);

  const defaultData = SHEETS_DEFAULT_DATA[sheetName];
  if (defaultData && defaultData.length > 0) {
    sheet.getRange(2, 1, defaultData.length, totalCols).setValues(defaultData);
  }

  sheet.autoResizeColumns(1, totalCols);
  sheet.getRange(1, 1).activate();

  const dataMsg = defaultData
    ? " עם " + defaultData.length + " שורות נתוני ברירת מחדל."
    : " ללא נתונים — מוכן לקלט ידני.";

  ui.alert("✅ גליון '" + sheetName + "' נוצר בהצלחה" + dataMsg);
}

// ══════════════════════════════════════════════════════════════════
// [FIX-5] פונקציה 6 — הקמת גליון S10_למידה_רפואי + הגנה
// ══════════════════════════════════════════════════════════════════

function buildS10LearningSheet() {
  const SHEET_NAME = "S10_למידה_רפואי";
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const ui         = SpreadsheetApp.getUi();
  const existing   = ss.getSheetByName(SHEET_NAME);

  if (existing) {
    ui.alert("⚠️ גליון '" + SHEET_NAME + "' כבר קיים.\nלשחזור כותרות — השתמש ב'שחזור כותרות'.");
    return;
  }

  const cols      = SHEETS_MAP[SHEET_NAME];
  const sheet     = ss.insertSheet(SHEET_NAME);
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  const headerRange = sheet.getRange(1, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#fce4ec");
  headerRange.setFontColor("#880e4f");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, totalCols);
  sheet.setColumnWidth(4, 400);

  const protection = sheet.getRange(1, 1, 1, totalCols).protect();
  protection.setDescription("כותרות S10_למידה_רפואי — מוגן על ידי COLUMN_MAP");
  protection.setWarningOnly(true);

  sheet.getRange(2, 1).activate();

  Logger.log("[COLUMN_MAP] גליון " + SHEET_NAME + " נוצר בהצלחה עם " + totalCols + " עמודות.");
  ui.alert("✅ גליון '" + SHEET_NAME + "' נוצר בהצלחה.\nשורת הכותרות מוגנת מפני שינויים.");
}

// ══════════════════════════════════════════════════════════════════
// פונקציית עזר — הקמת גליון מסנכרן_קבצים
// ══════════════════════════════════════════════════════════════════

function buildDevSyncSheet() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ss.getSheetByName("מסנכרן_קבצים");
  if (existing) return;

  const cols      = SHEETS_MAP["מסנכרן_קבצים"];
  const sheet     = ss.insertSheet("מסנכרן_קבצים");
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name; });

  sheet.getRange(1, 1, 1, totalCols).setValues([headers]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, totalCols);
}

// ══════════════════════════════════════════════════════════════════
// [FIX-3] פונקציות עזר — הגדרה אחת בלבד
// ══════════════════════════════════════════════════════════════════

function _promptSheetName(ui) {
  const sheets = Object.keys(SHEETS_MAP).join("\n");
  const result = ui.prompt(
    "בחר גליון",
    "גליונות זמינים:\n" + sheets + "\n\nהכנס שם גליון:",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return null;
  const name = result.getResponseText().trim();
  if (!SHEETS_MAP[name]) { ui.alert("גליון לא נמצא: " + name); return null; }
  return name;
}

function _colToLetter(num) {
  let letter = "";
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num    = Math.floor((num - 1) / 26);
  }
  return letter;
}

function _letterToCol(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + letter.charCodeAt(i) - 64;
  }
    return col;
}

  // ══════════════════════════════════════════════════════════════════
// נורמליזציית תאריכים משותפת — Task #178
// ══════════════════════════════════════════════════════════════════

// פונקציה משותפת לנורמליזציית Doc_Date (עמודה K בניהול_מיילים) לפורמט
// אחיד DD/MM/YYYY. נקראת מ-S07 (כתיבה ראשונית), S08 (תיקון ידני
// בסיידבר) ו-S11 (בדיקת QA E34, תיקון לאחור). מזהה: כבר-תקין (ללא
// שינוי), Date object (מ-getValues), מפריד נקודה/מקף/לוכסן, שנה
// דו-ספרתית (חלון גולש: YY ≤ שנה נוכחית דו-ספרתית → 20YY, אחרת 19YY —
// אישור עמוס), ושם חודש עברי (עם/בלי תחילית ב-/ל-). תבנית לא-מזוהה →
// מוחזר כמו שהוא, ללא המצאת תאריך.
function _medDate_normalizeDate(dateStr) {
  if (!dateStr) return dateStr;

  if (Object.prototype.toString.call(dateStr) === "[object Date]" && !isNaN(dateStr.getTime())) {
    return Utilities.formatDate(dateStr, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }

  const text = String(dateStr).trim();
  if (!text) return text;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;

  const HEBREW_MONTHS = {
    "ינואר": 1, "פברואר": 2, "מרץ": 3, "מרס": 3, "אפריל": 4,
    "מאי": 5, "יוני": 6, "יולי": 7, "אוגוסט": 8,
    "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12
  };

  function expandYear(yy) {
    const n = parseInt(yy, 10);
    if (yy.length === 4) return n;
    const currentYY = new Date().getFullYear() % 100;
    return (n <= currentYY ? 2000 : 1900) + n;
  }

  const numeric = text.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2}|\d{4})$/);
  if (numeric) {
    const day   = numeric[1].padStart(2, "0");
    const month = numeric[2].padStart(2, "0");
    const year  = expandYear(numeric[3]);
    return day + "/" + month + "/" + year;
  }

  const hebrew = text.match(/^(\d{1,2})\s+(?:ב|ל)?([א-ת]+)\s+(\d{2}|\d{4})$/);
  if (hebrew) {
    const monthNum = HEBREW_MONTHS[hebrew[2]];
    if (monthNum) {
      const day   = hebrew[1].padStart(2, "0");
      const month = String(monthNum).padStart(2, "0");
      const year  = expandYear(hebrew[3]);
      return day + "/" + month + "/" + year;
    }
  }

  return text;
}                                                             
