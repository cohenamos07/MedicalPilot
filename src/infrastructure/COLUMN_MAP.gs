/*
# MedicalPilot — COLUMN_MAP
@version 1.0 | @updated 26/04/2026

## כלל ברזל
כל שירות כותב רק לעמודות המוגדרות לו בטבלה זו.
לפני כתיבת שירות חדש או תיקון קיים — לקרוא קובץ זה תחילה.

---

## מבנה העמודות — A עד Z

### אזור א — Source Metadata (A–H)
נתונים שנאספים בקליטה. מתארים איך ומאיפה הגיע הקובץ.
משמשים לזיהוי כפולים לפני עיבוד AI.

| עמודה | מספר | שם | ממלא | תוכן |
|-------|------|----|------|------|
| A | 1 | File_ID | S03, S04 | מזהה קובץ ב-Drive |
| B | 2 | Capture_Date | S03, S04 | תאריך כניסה למערכת |
| C | 3 | Source | S03, S04 | Gmail / Drive_Manual |
| D | 4 | Source_Reference | S03, S04 | מזהה מייל (Gmail) / מזהה תיקייה (Drive) |
| E | 5 | Source_Title | S03, S04 | נושא מייל / שם קובץ |
| F | 6 | Source_Author | S03, S04 | כתובת שולח / "עמוס ידני" |
| G | 7 | Source_Date | S03, S04 | תאריך מייל / תאריך עדכון קובץ |
| H | 8 | Attachment_Name | S03, S04 | שם הקובץ הפיזי |

### אזור ב — Content Metadata (I–L)
נתונים שנחלצים מתוך המסמך עצמו על ידי שירותי AI.

| עמודה | מספר | שם | ממלא | תוכן |
|-------|------|----|------|------|
| I | 9 | Doc_Title | S07 | כותרת המסמך האמיתית |
| J | 10 | Doc_Issuer | S07 | מנפיק המסמך |
| K | 11 | Doc_Date | S07 | תאריך המסמך עצמו |
| L | 12 | Doc_Category | S07 | רפואי / חשבונאי / משפטי / ביטוחי / אחר |

### אזור ג — סטטוסים (M–N)
מנהלים את מצב הרשומה לאורך ה-pipeline.

| עמודה | מספר | שם | ממלא | ערכים אפשריים |
|-------|------|----|------|--------------|
| M | 13 | Pipeline_Status | S05, S06, S07, ידני | ממתין להמרה ל-TXT / הומר ל-TXT / מחולץ / ממתין לאימות / מאושר |
| N | 14 | Extraction_Status | S07 | ממתין / חולץ חלקי / חולץ מלא |

### אזור ד — טכני (O–R)
נתונים טכניים על הקובץ.

| עמודה | מספר | שם | ממלא | תוכן |
|-------|------|----|------|------|
| O | 15 | File_Type | S05 ← S06 | SYSTEM_PDF / SYSTEM_IMG / SYSTEM_GDOC / SYSTEM_DOCX / SYSTEM_TXT / SYSTEM_SHEET |
| P | 16 | File_Size | S05 ← S06 | גודל בKB או MB |
| Q | 17 | Complexity | S06, S07 | פשוט / בינוני / מורכב |
| R | 18 | Duplicate_Flag | S05 | ריק = ייחודי / "חשוד ככפול — שורה X" |

### אזור ה — שגיאות (S–T)
אחיד בכל השירותים. בהצלחה — שניהם מתנקים.

| עמודה | מספר | שם | ממלא | תוכן |
|-------|------|----|------|------|
| S | 19 | Error_Code | כל השירותים | 429 / 503 / NO_ID / ACCESS / EMPTY / UNSUPPORTED / PARSE / UNKNOWN |
| T | 20 | Error_Detail | כל השירותים | פירוט מלא + פעולה מומלצת |

קודי שגיאה:
429 — מכסה יומית מוצתה — נסה מחר
503 — שרת Gemini עמוס — דולג לעכשיו
NO_ID — בדוק שעמודה A מלאה
ACCESS — בדוק שיתוף הקובץ ב-Drive
EMPTY — הקובץ ריק — בדוק תוכן
UNSUPPORTED — סוג MIME לא מטופל — בדוק הרחבה
PARSE — התשובה לא JSON תקין — נסה שוב
UNKNOWN — שגיאה כללית — ראה פירוט ב-T

### אזור ו — בדיקות (U)

| עמודה | מספר | שם | ממלא | תוכן |
|-------|------|----|------|------|
| U | 21 | QA_Status | runAllTests | ✅ תקין / ⚠️ + פירוט בעיה |

### אזור ז — מרווח (V)

| עמודה | מספר | שם | הערה |
|-------|------|----|------|
| V | 22 | — | שמור לשימוש עתידי |

### אזור ח — לינקים (W–Y)

| עמודה | מספר | שם | ממלא | תוכן |
|-------|------|----|------|------|
| W | 23 | Source_URL | S03, S04 | קישור לקובץ המקורי ב-Drive |
| X | 24 | TXT_URL | S06 | קישור לקובץ TXT שנוצר |
| Y | 25 | Temp_URL | S06 | קישור זמני במהלך המרה |

### אזור ט — טקסט גולמי (Z)

| עמודה | מספר | שם | ממלא | הערה |
|-------|------|----|------|------|
| Z | 26 | Raw_Text | S06, S07 | הטקסט המלא — עמודה אחרונה, רחבה מאוד |

---

## מיפוי שינוי — ישן חדש

A: File ID → File_ID (שינוי שם)
B: Capture Date → Capture_Date (שינוי שם)
C: Source → Source (ללא שינוי)
D: Internal ID → Source_Reference (שינוי שם + לוגיקה)
E: Subject → Source_Title (שינוי שם)
F: Sender → Source_Author (שינוי שם)
G: Document Date → Source_Date (שינוי שם)
H: File Name → Attachment_Name (שינוי שם)
I: Subject כפול → Doc_Title (שינוי שם + תוכן עתידי)
J: Issuer → Doc_Issuer (שינוי שם)
K: System Admin → Doc_Date (שינוי שם + תוכן עתידי)
L: Classification → Doc_Category (שינוי שם)
M: Extraction Status → Pipeline_Status (שינוי שם + לוגיקה)
N: Status → Extraction_Status (שינוי שם)
O: Stored URL → W / Source_URL (הזזת נתונים)
P: Source_Type → O / File_Type (הזזת נתונים)
Q: Link_TXT → X / TXT_URL (הזזת נתונים)
R: File_Size → P / File_Size (הזזת נתונים)
S: Technical_Temp_Name → U / QA_Status (הזזה + תוכן חדש)
T: Scan_Complexity → Q / Complexity (הזזת נתונים)
U: Duplicate_Suspect → R / Duplicate_Flag (הזזת נתונים)
S: Error_Code — חדש
T: Error_Detail — חדש
V: שמור — חדש
Y: Temp_URL — חדש
Z: Raw_Text — חדש

---

## כללי כתיבה לכל שירות

S03, S04 — כותבים רק לעמודות A-H ו-W
S05 — כותב רק לעמודות M, O, P, R, S, T
S06 — כותב רק לעמודות M, O, P, Q, S, T, X, Y, Z
S07 — כותב רק לעמודות I, J, K, L, M, N, Q, S, T, Z
runAllTests — כותב רק לעמודה U
כל שירות — בהצלחה מנקה S ו-T. בכישלון כותב קוד ב-S ופירוט ב-T
*/ 