/**
 * MedicalPilot — S11_QArun.gs
 * @version 1.20.0 | @updated 11/07/2026 22:00 | @service S11
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QArun.gs
 * @description בדיקת תקינות Pipeline — סריקת גליון ניהול_מיילים לפי 27 חוקי QA (E09-E28, ללא E23/E24; E17 עצמו כעת דו-שלבי).
 * @impacts בודק עקביות עמודות L, M, N, Q, R, S, T, U, וכעת גם עמודה 27 (AA)
 *          לפי ציר התקדמות S03→S09.
 *          [v1.18.0] qa_deleteE17Findings מוחקת שורה בעצמה — עצמאית
 *          לגמרי, ללא שום תלות ב-S08_Validate.gs.
 * @changes [v1.20.0] Task 132 [שלב 4/8, שרשרת עמודה 27] — שכתוב מקיף של
 *                   בלוק זיהוי/אימות כפילויות בתוך _qa_checkRow, ושל
 *                   runQAViewMain ו-_qa_applyFixes. הרקע: אחרי Task 131,
 *                   S07 כבר לא כותב "שורה X" לטקסט R ולא כותב Note —
 *                   התנאי הישן (r.includes("שורה")) הפך למת קוד עבור כל
 *                   כפילות חדשה. השינוי המרכזי: המקור היחיד לאמת מעתה
 *                   הוא עמודה 27 (Duplicate_Target_FileID, File_ID קבוע
 *                   שלא מתיישן גם אחרי מחיקת שורות). E18/E19/E20/E21
 *                   הוסרו כליל — כל ארבעתן טיפלו בבעיות של רפרנס מבוסס
 *                   מספר-שורה, שלא קיימות יותר. E12 הוגדר מחדש: בודק רק
 *                   אם ה-File_ID בעמודה 27 עדיין קיים בגליון (fileIdRowMap)
 *                   — אם לא, מנקה R+עמודה27 יחד. E11 (סימטריה) נשאר, אך
 *                   קורא כעת File_ID מעמודה 27 במקום regex על טקסט R.
 *                   שינויים נלווים: runQAViewMain — totalCols 26→27,
 *                   כדי ש-allData יכלול את עמודה 27. _qa_applyFixes case
 *                   "write" על עמודה 18 — הוסרה לגמרי לוגיקת ה-regex/Note
 *                   הישנה (חילוץ "שורה X" + setNote); case "clear" על
 *                   עמודה 18 מנקה כעת גם עמודה 27 (setValue("")) במקום
 *                   Note. QA_ALLOWED_COLS — נוספה רשומה 27.
 * @changes [v1.19.0] Task 130 [שלב 2/8, שרשרת עמודה 27] — פונקציה חדשה
 *                   להריץ פעם אחת מהתפריט (חיבור לתפריט עצמו הוא Task 136,
 *                   טרם בוצע). המיגרציה קוראת את כל עמודה R הקיימת, ולכל
 *                   שורה עם חשד כפילות פעיל (טקסט "כפול מאושר — שורה X"
 *                   או "חשוד ככפול — שורה X") שולפת את ה-File_ID של שורת
 *                   התאום — קודם מה-Note הקיים על R אם יש (הושלם כבר
 *                   ב-Task 93), אחרת מפענוח מספר השורה מהטקסט וחיפוש
 *                   בעמודה A — וכותבת אותו כערך רגיל בעמודה 27 החדשה
 *                   (Duplicate_Target_FileID, ראה COLUMN_MAP.gs v2.9.1
 *                   Task 129). קריאה בלבד למקורות — R, Note, ועמודה A
 *                   אינם משתנים בשום מקרה. תנאי כניסה קריטי: יש להריץ
 *                   ולוודא הצלחה מלאה לפני כל שינוי בקוד S07/S11/S08
 *                   (Tasks 131-133), אחרת שורות היסטוריות "יתייתמו".
 * @changes [v1.18.0] בקשת עמוס — לאחר שv1.17.0 (למטה) הופעל בפועל, עמוס
 *                   ביקש לנתק לגמרי את qa_deleteE17Findings מ-S08: זו לא
 *                   אותה מחיקה כמו S08 בכלל (שם — כפילות/לוגו — הקובץ
 *                   קיים ב-Drive וצריך למחוק גם אותו; כאן — E17 — המקור
 *                   ממילא חסר מ-Drive, אין קובץ למחוק). qa_deleteE17Findings
 *                   שוכתבה כפונקציה עצמאית לגמרי בתוך קובץ זה — מוחקת
 *                   sheet.deleteRow ישירות, ללא שום קריאה ל-S08_Validate.gs
 *                   (הקריאה ל-s08_deleteSpecificRows שתוארה ב-v1.17.0
 *                   הוסרה כליל). התלות ב-S08_Validate.gs (למטה, שורת
 *                   "תלויות") הוסרה בהתאם. הפניות "שורה X" שעלולות
 *                   להתיישן עקב המחיקה מזוהות ומתוקנות באופן טבעי בסריקת
 *                   S11 הבאה (E20/E21 קיימים כבר בדיוק לשם כך).
 * @changes [v1.17.0] בקשת עמוס — מחיקת שורות E17 אפשרית כעת גם ישירות מתוך
 *                   חלון S11 QA, לא רק דרך סיידבר S08. חשוב: S11 עדיין לא
 *                   מוחק כלום בעצמו — הכלל הבסיסי לא השתנה. הזרימה: (1)
 *                   "תקן נבחרים" כותב R כרגיל; (2) _qa_applyFixes אוספת
 *                   כעת גם אילו שורות היו E17+fix="write" (הסלמה אמיתית,
 *                   לא "flag" ראשוני) שנכתבו בהצלחה — מוחזר כ-e17Rows
 *                   מתוך qa_applySelectedFixes; (3) S11_QADialog.html
 *                   v1.5.0 מציג מודל אישור שני ונפרד, ספציפית לשורות אלה;
 *                   (4) רק אישור מפורש קורא ל-qa_deleteE17Findings(rowsJson)
 *                   [הוחלף במלואו ב-v1.18.0 למעלה — ראה שם]. מוגבל בכוונה
 *                   ל-E17 בלבד — לא לקודים אחרים שגם כותבים "מאושר
 *                   למחיקה" (E16/E22/E25), לפי אישור מפורש של עמוס.
 *          שורה בודדת: סריקת השורה הנבחרת בלבד.
 *          כל הגליון: סריקה מלאה + Dialog HTML + תיקון נבחר באישור.
 *          כותב לעמודות: M (תיקון סטטוס), N (תיקון Extraction), Q (ניקוי),
 *          R (השלמת סימטריה כפולים / אימות מול עמודה 27 / ניקוי הפניות יתומות /
 *          סימון "מאושר למחיקה" לארכיון OCR, מקור אבד לצמיתות, ולוגו/ריק),
 *          S+T (ניקוי שגיאות ישנות), U (דגל/ניקוי).
 *          [v1.9.0] S11 אינו מוחק אף שורה יותר בעצמו — רק מסמן בעמודה R.
 *          המחיקה בפועל (שורה + קבצי Drive) מבוצעת ע"י S08 (Task 114).
 *          [v1.18.0] יוצא מן הכלל מוגדר במפורש: qa_deleteE17Findings —
 *          מוחקת שורה בלבד (E17 בלבד), עצמאית לגמרי מ-S08, ללא Drive.
 *          [v1.10.0] E11-E21 מזהים כעת גם טקסט "כפול מאושר — שורה" (S07),
 *          לא רק "חשוד ככפול — שורה" (S05, שהוסר). E25 מזהה גם R הישן.
 *          [v1.20.0] E18-E21 הוסרו — ראה @changes למעלה.
 *          תלויות: COLUMN_MAP.gs (SHEET_CONFIG), S11_QADialog.html, גליון ניהול_מיילים.
 *          שורות 1-4 מוגנות — הלולאה מתחילה תמיד מ-SHEET_CONFIG.FIRST_DATA_ROW (5).
 * @callers ViewEngine.gs (runQAView), Menu_PROD.gs, Menu_LAB.gs
 *          (qa_migrateNotesFromR_Task93, qa_findOrphanDuplicateRef_Task93,
 *          qa_migrateNoteColToColumn27_Task130 — עדיין לא מחוברת לתפריט,
 *          Task 136 עתידי)
 * @functions runQAViewMain, qa_getFindings, qa_applySelectedFixes,
 *            qa_deleteE17Findings,
 *            _qa_scanRow, _qa_scanAll, _qa_checkRow, _qa_dedupeE11Findings,
 *            _qa_fetchTxtWordCount_E25,
 *            _qa_buildSummary, _qa_applyFixes, _qa_validateCol,
 *            _qa_loadEventsFileIds, findAnchorRowAndAuditVerified,
 *            qa_migrateNotesFromR_Task93, qa_findOrphanDuplicateRef_Task93,
 *            qa_migrateNoteColToColumn27_Task130
 * @changes [v1.15.0] Task 118 (החלטת מוצר, עמוס) — E17 (מקור חסר/לא נגיש
 *                   מ-Drive) חזר בעקביות בכל סריקה כדגל U קבוע ("⚠️ מקור
 *                   חסר (Drive)"), ללא הבחנה בין תקלת Drive חד-פעמית/זמנית
 *                   לבין אובדן אמיתי לצמיתות. הוחלט: להסלים ל"מאושר
 *                   למחיקה" (כמו E22) רק אם E17 חוזר על אותה שורה בסריקה
 *                   *נוספת* — לא בפעם הראשונה. מימוש: U (שכבר נקראת
 *                   בתחילת _qa_checkRow) משמשת כזיכרון בין סריקות — אם U
 *                   כבר מכיל "מקור חסר (Drive)" מסריקה קודמת, ההופעה
 *                   הנוכחית נחשבת אישור-חזרה ומסלימה ל-fix="write" על R
 *                   ("מאושר למחיקה — מקור אבד לצמיתות (E17 חוזר)"). הופעה
 *                   ראשונה — ללא שינוי, ממשיכה כ-fix="flag" על U כרגיל.
 *                   אין צורך במנגנון אחסון נפרד — U עצמה מספיקה.

 *                   בעקבות שינוי סמנטי בכל השירותים ("מחולץ"→"עבר סיווג" ב-
 *                   S07/S08/S11/COLUMN_MAP), שורות היסטוריות שעדיין מכילות
 *                   את הערך הישן "מחולץ" ב-M מזוהות ומתוקנות אוטומטית
 *                   ל-"עבר סיווג" (fix="write"). "מחולץ" הוחזר זמנית ל-
 *                   QA_VALID_M (עם הערה) כדי ש-E03 לא ידווח כפול על אותן
 *                   שורות — E28 לבדו אחראי על ההמרה בפועל. יש להסיר את
 *                   "מחולץ" מ-QA_VALID_M בעתיד לאחר שכל השורות תוקנו.
 * @changes [v1.13.0] E27 (כלל חדש, בקשת עמוס) — Pipeline_Status (M) תקוע
 *                   על "הומר ל-TXT" למרות שהסיווג בפועל הושלם: מזהה שורות
 *                   עם Doc_Title (I) מלא וגם Extraction_Status (N)="חולץ
 *                   מלא"/"חולץ חלקי" (הוכחה שS07 רץ בהצלחה), אך M עדיין
 *                   על הערך שS06 כותב (לא S07). fix="write" על עמודה 13,
 *                   value="עבר סיווג". שלב א' (איתור) — שלב ב' (הרצה על שורות
 *                   נבחרות דרך ה-Sidebar) כבר קיים במנגנון "תקן נבחרים"
 *                   הרגיל, לא נדרש קוד נוסף.
 * @changes [v1.12.0] Tasks 115+116+117 — תיקון בלוק E25 (_qa_checkRow):
 *                   פוצל לשני מסלולים בלתי-תלויים במקום תנאי-סף משותף אחד.
 *                   (1) מסלול "שורה חדשה" (R ריק) — נשאר מותנה ב-n+P כפי
 *                       שהיה, בתוספת הגנת Task 117 (ראה סעיף 3).
 *                   (2) מסלול "פתרון דגל ישן" (isLegacyLogoFlag) — רץ תמיד
 *                       ללא תלות ב-n (Task 116) או P תקין (Task 115), כי
 *                       שורות ישנות עם R="חשוד כלוגו/ריק" עלולות לעולם לא
 *                       לקבל n/P ולהישאר תקועות עם הדגל השגוי לצמיתות.
 *                   (3) Task 117 — כשל שליפת TXT (_qa_fetchTxtWordCount_E25
 *                       מחזירה null) כבר לא נחשב "אין תוכן אמיתי" ולא גורם
 *                       יותר לאישור מחיקה אוטומטי — רק fix="flag" לבדיקה
 *                       ידנית (⚠️), בשני המסלולים כאחד.
 * @changes [v1.11.0] Task 121 — E26 (כלל חדש): נוסף קבוע QA_COMPLEXITY_EN_TO_HE
 *                   (מיפוי SIMPLE→פשוט, MEDIUM→בינוני, COMPLEX→מורכב) ליד
 *                   QA_VALID_Q. ב-_qa_checkRow, מיד אחרי E09, נוסף בלוק E26:
 *                   אם Q קיים ונמצא במיפוי — fix="write" עם הערך העברי המקביל.
 *                   QA_VALID_Q עצמה לא שונתה (הערכים האנגליים נשארים בה) —
 *                   כדי ש-E09 לא יתפוס את אותה שורה גם כ"ערך לא חוקי" באותה
 *                   סריקה; E26 לבדו אחראי על הניקוי/תרגום בפועל.
 *          [v1.10.0] תיקון פער שהתגלה בהרצה בפועל אחרי הסרת S05 (v2.5.0):

 *          [v1.10.0] תיקון פער שהתגלה בהרצה בפועל אחרי הסרת S05 (v2.5.0):
 *                   (1) E11/E12/E18/E19/E20/E21 בדקו רק טקסט המתחיל
 *                       "חשוד ככפול — שורה" (הפורמט שכתב S05 הישן). S07 כותב
 *                       פורמט שונה — "כפול מאושר — שורה X | ניקוד Y/5" — שלא
 *                       זוהה בכלל. מרגע שS05 הוסר, כל כפילות חדשה שS07 מזהה
 *                       לא הייתה נבדקת יותר ע"י מנגנון הסימטריה/אימות ה-Note.
 *                       התנאי הורחב לזהות את שני הפורמטים (הישן והנוכחי).
 *                   (2) E25 בדק רק R ריק לגמרי (!r), אך S05 (לפני ההסרה) כבר
 *                       הספיק לכתוב "חשוד כלוגו/ריק" לשורות ישנות רבות —
 *                       כך שהתנאי מעולם לא התקיים עבורן. הורחב לזהות גם R
 *                       עם הערך הישן הזה, כדי לטפל בשורות שכבר תויגו לפני
 *                       ההסרה מ-S05.
 *          [v1.9.0] Tasks 102+112+113 (פעימת קוד משולבת — אותו קובץ, פעם אחת):
 *                   (1) Task 102 — קונפליקט קבוצתי בעמודה R (חלופה A שאושרה):
 *                       נוספה _qa_dedupeE11Findings, נקראת ב-runQAViewMain אחרי
 *                       בניית findings. כשכמה שורות מקור שונות (למשל 20/34/52)
 *                       יוצרות ממצא E11 עבור אותה שורת-יעד — נשמר רק הראשון
 *                       שנסרק (מספר שורה נמוך ביותר), השאר מוסרים. מונע דריסה
 *                       שקטה בין ממצאי E11 מתחרים ב-_qa_applyFixes.
 *                   (2) Task 112 — E16 ו-E22 שונו מ-fix="delete_row" ל-
 *                       fix="write" על עמודה R, עם ערך "מאושר למחיקה — ...".
 *                       הוסר לגמרי מנגנון האיסוף-והמחיקה-בסוף (deleteRows)
 *                       מ-_qa_applyFixes — S11 לא מבצע יותר sheet.deleteRow
 *                       בשום מקרה, כדי לא להשאיר קבצי Drive יתומים ללא רישום
 *                       בגליון. המחיקה בפועל (שורה + קבצים) עברה ל-S08
 *                       (s08_deleteApproved, Task 114 — קובץ נפרד).
 *                   (3) Task 113 — כלל חדש E25: מחליף את הבדיקה שהוסרה מ-S05
 *                       (sizeKB<10 בלבד). רץ רק אחרי שS07 כבר עיבד את השורה
 *                       (n קיים), ומשתמש בגודל קובץ (P) + מספר מילים אמיתי
 *                       מתוך תוכן קובץ ה-TXT (דרך _qa_fetchTxtWordCount_E25,
 *                       אותה שיטת שליפה כמו s08_fetchTxtContent) + I/J.
 *                       סף: P<10KB וגם (מספר מילים<20 או I/J="לא זוהה") →
 *                       fix="write", value="מאושר למחיקה — לוגו/ריק". אחרת
 *                       (תוכן אמיתי) — אין ממצא, R נשאר ריק.
 *          [v1.8.0] Task 100 — הרחבת בלוק E17 (Task 99) הקיים ב-_qa_checkRow:
 *                   כאשר DriveApp.getFileById נכשל (המקור לא נגיש), נבדק כעת
 *                   תנאי כפול נוסף: Pipeline_Status === "ממתין להמרה ל-TXT"
 *                   וגם TXT_URL ריק — כלומר אין שום עותק שמור של הנתונים באף
 *                   שלב בצנרת (לא הקובץ המקורי, לא TXT). רק כששלושת התנאים
 *                   מתקיימים יחד נוצר ממצא חדש E22 (SOURCE_GONE_UNRECOVERABLE)
 *                   עם fix="delete_row" (הרסני, מוצג לאישור ידני בדיאלוג, לא
 *                   מסומן כברירת מחדל — כמו E16). בכל שאר המקרים (כולל שורות
 *                   שכבר הומרו ל-TXT כמו 107-112) ממשיך להיווצר E17 הרגיל
 *                   (fix="flag") כפי שהיה. אומת ידנית מול 10 שורות אמיתיות
 *                   (113-122) שנבדקו ידנית ואושרו כאבודות לצמיתות מ-Drive.
 *          [v1.7.0] Tasks 94+98 (פעימת קוד משולבת — אותם 2 קבצים, פעם אחת):
 *                   (1) Task 94 — הוספת כלל E16 ב-_qa_checkRow: File_ID המתחיל
 *                       ב-"OCR_" (שורות ארכיון ישנות ממקור Mod_Brain_OCR).
 *                       DriveApp.getFileById נבדק לתצוגה בלבד (לא כתנאי לזיהוי
 *                       הממצא) — רק כדי להציג לעמוס אם הקובץ עדיין קיים ב-Drive.
 *                       fix חדש "delete_row" — הרסני, מוצג לאישור ידני בדיאלוג,
 *                       לא מופעל אוטומטית.
 *                   (2) Task 98 — אימות אמיתי (לא מיגרציה עיוורת) של עמודה R
 *                       מול המציאות בפועל: ב-runQAViewMain נבנתה מפת
 *                       File_ID→שורה נוכחית (fileIdRowMap) מתוך allData, ונטענו
 *                       כל ה-Notes של עמודה R בבאץ' אחד (rNotesAll). שתי אלו
 *                       מוזרמות כעת דרך _qa_scanRow/_qa_scanAll אל _qa_checkRow.
 *                       הבלוק המשולב של E11/E12 הוחלף בבלוק מורחב שממשיך
 *                       להריץ את E11 (סימטריה) ללא שינוי, ומוסיף לוגיקת החלטה
 *                       חדשה על סמך ה-Note בפועל של השורה הנוכחית:
 *                       • E12 (ללא שינוי בתנאי) — אין Note, והשורה שהטקסט מצביע
 *                         עליה לא קיימת בטווח הנתונים כלל → "clear".
 *                       • E18 (חדש) — אין Note, אך השורה שהטקסט מצביע עליה כן
 *                         קיימת וניתן לשלוף ממנה File_ID → "set_note" (כתיבת
 *                         Note בלבד, לא נוגע בטקסט התא).
 *                       • E19 (חדש) — אין Note, השורה קיימת אך עמודה A ריקה בה
 *                         → אי אפשר לשחזר בביטחון → "clear".
 *                       • E20 (חדש) — יש Note, אך ה-File_ID השמור בו לא נמצא
 *                         יותר בשום שורה בגליון (נמחק/הועבר) → "clear".
 *                       • E21 (חדש) — יש Note תקין, אבל מספר השורה הכתוב בטקסט
 *                         התיישן (עקב מחיקת שורה שהזיזה הכול) — ה-File_ID באמת
 *                         נמצא היום בשורה אחרת → "write" מתקן את הטקסט לשורה
 *                         הנוכחית האמיתית (ה-Note עצמו כבר תקין ולא משתנה).
 *                   (3) תוקן באג קיים ב-_qa_applyFixes case "write" על עמודה 18:
 *                       הקוד הקודם קבע את ה-Note תמיד לפי File_ID של השורה
 *                       הנכתבת עצמה (f.row) — שגוי במקרים כמו E11/E21 שבהם
 *                       הטקסט הנכתב מפנה לשורה אחרת (הצד השני של הכפילות).
 *                       כעת נפרש הטקסט (value) בעזרת regex "שורה X" ונשלף
 *                       ה-File_ID של אותה שורה ממש לצורך ה-Note.
 *                   (4) case "clear" על עמודה 18 מנקה כעת גם את ה-Note עצמו
 *                       (setNote("")) — מונע השארת רפרנס יתום אחרי ניקוי טקסט.
 *                   (5) case חדש "set_note" — כתיבת Note בלבד ללא נגיעה בערך התא.
 *                   (6) _qa_applyFixes: ממצאי "delete_row" נאספים בנפרד לאורך
 *                       הלולאה, ומבוצעים רק בסוף, ממוינים יורד לפי מספר שורה —
 *                       כדי שמחיקת שורה לא תשבש את מספרי השורות של שאר התיקונים
 *                       שמבוצעים באותה אצווה.
 *          [v1.6.2] Task 93 — הרחבת כלל E12 הקיים בתוך _qa_checkRow: כעת מזהה גם R
 *                   המצביע לשורה מתחת ל-QA_DATA_START (שורה מוגנת/לא קיימת), לא רק
 *                   הפניות מעבר לטווח הנתונים. שונה ה-fix של E12 מ-"flag" (סימון U
 *                   בלבד) ל-"clear" על עמודה 18 — מנקה את R עצמו דרך כפתור "תקן נבחרים"
 *                   בדיאלוג הרגיל (S11 QA), ללא צורך בכלי חד-פעמי נפרד. מייתר את הצורך
 *                   בהרצת qa_clearOrphanDuplicateFlags_Task93 שהוצע ולא הוחל.
 *          [v1.6.3] Task 99 — הוספת כלל E17: SOURCE_GONE ב-_qa_checkRow — דגל U לא הרסני
 *                   כאשר DriveApp.getFileById(File_ID) נכשל (קובץ לא נגיש/נמחק). אין מחיקה,
 *                   תצוגה בלבד, שמרני.
 *          [v1.6.1] Task 93 — הוספת qa_findOrphanDuplicateRef_Task93: פונקציית אבחון
 *                   קריאה-בלבד. מאתרת שורות שבהן R מכיל תבנית "שורה X" אך אין להן
 *                   Note (כלומר qa_migrateNotesFromR_Task93 לא הצליחה למלא אותן),
 *                   ומציגה לכל שורה כזו את מספרה, כותרתה, שורת היעד ומצבה
 *                   (יעד לא קיים / File_ID ריק בשורת היעד).
 *          [v1.6.0] Task 93 — הוספת qa_migrateNotesFromR_Task93: מיגרציה חד-פעמית.
 *                   סורקת את כל עמודה R הקיימת, מחלצת מספר שורת-יעד מתוך התבנית
 *                   "שורה X", שולפת את File_ID של שורת היעד מעמודה A, וכותבת אותו
 *                   כ-Note בתא R של השורה הנוכחית — רק אם לא קיים כבר Note.
 *                   מיועדת להרצה חד-פעמית מהתפריט (Menu_LAB) ואז ניתנת להסרה.
 *          [v1.5.0] תיקון Task 89: (1) E11 — החלפת return findings ב-if (targetRow >= QA_DATA_START)
 *                   למניעת קטיעת הבדיקות E12-E15 באותה שורה. (2) הוספת trim() לעמודות
 *                   category/status ב-findAnchorRowAndAuditVerified למניעת פספוס שורות עוגן.
 *                   (3) הוספת setNote(File_ID) ב-_qa_applyFixes case write כשcol===18
 *                   לשמירת File_ID יציב ב-Note של תא R (תשתית לTask 91).
 *                   [v1.4.0] הוספת findAnchorRowAndAuditVerified — Task 77 (איתור שורת עוגן)
 *                   + Task 82 (חקר מקור "אומת ידנית") — קריאה בלבד, אינו כותב לגליון
 *          [v1.3.2] תיקון באג קריטי — E15: חסרה סוגרת findings.push + return findings
 *                   היה מחוץ ל-if — גרם ל-_qa_checkRow לא להחזיר ערך
 *                   תיקון סוגרת כפולה בסוף הקובץ }} שגרמה לשגיאת forEach
 *          [v1.3.1] הוספת עמודה 12 (Doc_Category) ל-QA_ALLOWED_COLS
 *          [v1.3.0] תיקון פונקציה כפולה + E14 + E15
 *          [v1.2.0] Dialog HTML + qa_getFindings + qa_applySelectedFixes
 *          [v1.1.0] תיקון באג 63 — QA_DATA_START = FIRST_DATA_ROW (5)
 *          [v1.0.0] גרסה ראשונה — 13 חוקי QA
 */
// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const QA_SHEET_NAME   = "ניהול_מיילים";
const QA_EVENTS_SHEET = "יומן_אירועים_רפואי";
const QA_DATA_START   = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW; // 5 — שורות 1-4 מוגנות

// ערכי L חוקיים — [v1.3.0] E14
const QA_VALID_L = [
  "רפואי",
  "חשבונאי",
  "משפטי",
  "ביטוחי",
  "אחר",
  "מסמך רפואי",
  "מסמך חשבונאי",
  "מסמך משפטי",
  "מסמך ביטוחי"
];

// ערכי M חוקיים
const QA_VALID_M = [
  "ממתין להמרה ל-TXT",
  "הומר ל-TXT",
  "עבר סיווג",
  "מחולץ", // [v1.14.0] E28 — ערך legacy זמני; E03 לא דורש דיווח כפול, E28 לבדו אחראי על ההמרה בפועל. להסיר מהרשימה בעתיד אחרי שכל השורות ההיסטוריות יתוקנו.
  "ממתין לאימות",
  "מאושר",
  "אומת ידנית",
  "חולץ לגליונות",
  "חולץ ליומן אירועים",
  "חולץ לתרופות",
  "חולץ למצב רפואי",
  "חולץ לבדיקות דם",
  "חולץ לבדיקות גנטיות",
  "חולץ להנחיות",
  "לא נתמך"
];

// ערכי N חוקיים
const QA_VALID_N = ["ממתין", "חולץ חלקי", "חולץ מלא"];

// ערכי Q חוקיים

const QA_VALID_Q = ["פשוט", "בינוני", "מורכב", "SIMPLE", "MEDIUM", "COMPLEX"];

// [v1.11.0] Task 121 — מיפוי תרגום Complexity אנגלית (שאריות מגרסת S07 לפני
// Task 33 / v2.4.0) לעברית הנוכחית. משמש את E26 בלבד.
const QA_COMPLEXITY_EN_TO_HE = {
  "SIMPLE":  "פשוט",
  "MEDIUM":  "בינוני",
  "COMPLEX": "מורכב"
};

// מיפוי עמודות מאושרות לכתיבה — שם + מספר
const QA_ALLOWED_COLS = {
  12: "Doc_Category",
  13: "Pipeline_Status",
  14: "Extraction_Status",
  17: "Complexity",
  18: "Duplicate_Flag",
  19: "Error_Code",
  20: "Error_Detail",
  21: "QA_Status",
  27: "Duplicate_Target_FileID"
};

var QA_STORED_FINDINGS = [];

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה ראשית — נקראת מ-ViewEngine.runQAView
// ══════════════════════════════════════════════════════════════════

function runQAViewMain() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים לבדיקה", "S11 QA", 3);
    return;
  }

  // [v1.20.0] Task 132 — totalCols 26→27, כדי ש-allData יכלול את עמודה 27
  // (Duplicate_Target_FileID). ללא זה, _qa_checkRow לא יכולה לקרוא אותה.
  const totalCols = 27;
  const allData   = sheet.getRange(QA_DATA_START, 1, lastRow - QA_DATA_START + 1, totalCols).getValues();

  // [v1.3.0] טעינת File_IDs מגליון יומן_אירועים_רפואי — לשימוש ב-E15
  const eventsFileIds = _qa_loadEventsFileIds(ss);

  // [v1.7.0] Task 98 — מפת File_ID → שורה נוכחית, לאימות עמודה R מול המציאות
  const fileIdRowMap = {};
  allData.forEach(function(rd, idx) {
    const fid = (rd[0] || "").toString().trim();
    if (fid) fileIdRowMap[fid] = idx + QA_DATA_START;
  });

  // [v1.7.0] Task 98 — Notes של עמודה R לכל טווח הנתונים, קריאה אחת (batch)
  // [v1.20.0] Task 132 — נשאר לתאימות עם חתימת הפונקציות; אינו נדרש עוד
  // ע"י הבלוק E11/E12 (עבר לקרוא מעמודה 27 ב-allData במקום Note).
  const rNotesAll = sheet.getRange(QA_DATA_START, 18, lastRow - QA_DATA_START + 1, 1).getNotes();

  const activeRow   = sheet.getActiveCell().getRow();
  const activeRange = sheet.getActiveRange();
  const isSingleRow = activeRange.getNumColumns() >= sheet.getMaxColumns();

  const rawFindings = isSingleRow && activeRow >= QA_DATA_START
    ? _qa_scanRow(allData, activeRow, lastRow, eventsFileIds, fileIdRowMap, rNotesAll)
    : _qa_scanAll(allData, lastRow, eventsFileIds, fileIdRowMap, rNotesAll);

  // [v1.9.0] Task 102 — דה-דופ קונפליקט קבוצתי בE11 (חלופה A)
  const findings = _qa_dedupeE11Findings(rawFindings);

  if (findings.length === 0) {
    ss.toast("✅ הכול תקין — אין ממצאים", "S11 QA", 4);
    return;
  }

  // הוסף origIdx לכל ממצא
  findings.forEach(function(f, i) { f.origIdx = i; });

  // שמור לשימוש qa_applySelectedFixes
  QA_STORED_FINDINGS = findings;

  // פתח Dialog HTML
  const template = HtmlService.createTemplateFromFile('S11_QADialog');
  template.findingsJson = JSON.stringify(findings);

  const html = template.evaluate()
    .setWidth(680)
    .setHeight(520);

  SpreadsheetApp.getUi().showModalDialog(html, 'S11 QA — דוח ממצאים') ;}

// ══════════════════════════════════════════════════════════════════
// [v1.3.0] טעינת File_IDs מגליון יומן_אירועים_רפואי
// ══════════════════════════════════════════════════════════════════

function _qa_loadEventsFileIds(ss) {
  try {
    const eventsSheet = ss.getSheetByName(QA_EVENTS_SHEET);
    if (!eventsSheet) return {};

    const lastRow = eventsSheet.getLastRow();
    if (lastRow <= 4) return {}; // שורות 1-4 מוגנות — אין נתונים

    // עמודה G = File_ID בגליון יומן_אירועים_רפואי
    const data    = eventsSheet.getRange(5, 7, lastRow - 4, 1).getValues();
    const fileIds = {};

    if (!data || !data.length) return fileIds;

    data.forEach(function(row) {
      const id = (row[0] || "").toString().trim();
      if (id) fileIds[id] = true;
    });

    Logger.log("[S11 QA] נטענו " + Object.keys(fileIds).length + " File_IDs מ-" + QA_EVENTS_SHEET);
    return fileIds;

  } catch (e) {
    Logger.log("[S11 QA] שגיאה בטעינת יומן אירועים: " + e.message);
    return {};
  }
}

// נקרא מה-HTML בטעינה
function qa_getFindings() {
  return QA_STORED_FINDINGS;
}

// ══════════════════════════════════════════════════════════════════
// [v1.3.0] תיקון באג קריטי — פונקציה אחת בלבד
// הגרסה הקודמת כללה שתי פונקציות qa_applySelectedFixes
// ══════════════════════════════════════════════════════════════════

function qa_applySelectedFixes(findingsJson) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet)       return { success: false, appliedCount: 0, totalRequested: 0, msg: "❌ גליון לא נמצא" };
  if (!findingsJson) return { success: false, appliedCount: 0, totalRequested: 0, msg: "❌ לא התקבלו ממצאים לתיקון (findingsJson ריק)" };

  let selectedFindings;
  try {
    selectedFindings = JSON.parse(findingsJson);
  } catch (e) {
    Logger.log("[S11 QA] שגיאת JSON.parse ב-qa_applySelectedFixes: " + e.message);
    return { success: false, appliedCount: 0, totalRequested: 0, msg: "❌ שגיאת פענוח JSON: " + e.message };
  }

  if (!selectedFindings || !selectedFindings.length) {
    Logger.log("[S11 QA] qa_applySelectedFixes קיבלה מערך ריק — 0 ממצאים לתיקון");
    return { success: false, appliedCount: 0, totalRequested: 0, msg: "⚠️ לא נשלח אף ממצא לתיקון (בדוק בחירה)" };
  }

  Logger.log("[S11 QA] קיבלתי " + selectedFindings.length + " ממצאים לתיקון");
  const fixResult     = _qa_applyFixes(sheet, selectedFindings);
  const appliedCount  = fixResult.appliedCount;
  return {
    success: appliedCount === selectedFindings.length,
    appliedCount: appliedCount,
    totalRequested: selectedFindings.length,
    e17Rows: fixResult.e17Rows, // [v1.17.0] בקשת עמוס — מועמדי מחיקה, E17 בלבד
    msg: appliedCount === selectedFindings.length
      ? "✅ תוקנו " + appliedCount + " ממצאים"
      : "⚠️ תוקנו " + appliedCount + " מתוך " + selectedFindings.length + " — בדוק Executions ללוגים"
  };
}

// ══════════════════════════════════════════════════════════════════
// [v1.18.0] בקשת עמוס — פונקציית מחיקה עצמאית לגמרי, מנותקת מ-S08
// חשוב: זו **לא** אותה מחיקה כמו S08 (s08_deleteApproved/s08_delete).
// שם — כפילות/לוגו — הקובץ קיים בפועל ב-Drive וצריך למחוק גם אותו.
// כאן — E17 — המקור ממילא חסר/לא נגיש מ-Drive מלכתחילה (זו ההגדרה של
// E17 עצמו), כך שאין שום קובץ קיים למחוק. הפעולה כאן היא אך ורק מחיקת
// שורת הגליון — ללא שום קריאה ל-DriveApp וללא שום תלות ב-S08_Validate.gs.
// עצמאית לחלוטין — לא קוראת ולא נקראת ע"י שום פונקציה בקובץ אחר.
// בטיחות: לפני מחיקת כל שורה מוודאים מחדש שR שלה עדיין מתחיל ב"מאושר
// למחיקה" (מגן מפני race condition בין האישור לביצוע בפועל).
// הפניות "שורה X" בשורות אחרות שעלולות להתיישן עקב המחיקה (אם קיימות
// כאלה) מזוהות ומתוקנות באופן טבעי בסריקת S11 הבאה (E20/E21 קיימים
// כבר בדיוק לשם כך) — אין צורך בתיקון מיידי כאן.
// ══════════════════════════════════════════════════════════════════

function qa_deleteE17Findings(rowsJson) {
  try {
    if (!rowsJson) return { success: false, msg: "❌ לא התקבלו שורות למחיקה" };
    const rows = JSON.parse(rowsJson);
    if (!rows || !rows.length) return { success: true, msg: "אין שורות למחיקה", deleted: 0 };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(QA_SHEET_NAME);
    if (!sheet) return { success: false, msg: "❌ גליון '" + QA_SHEET_NAME + "' לא נמצא" };

    // מיון יורד — מחיקה מלמטה למעלה כדי לא לשבש מספרי שורה באמצע הריצה
    const sortedRows = rows.slice().sort(function(a, b) { return b - a; });

    // אותה הגנה כמו בכל מחיקת שורה מרובה בפרויקט — הסרת פילטר פעיל לפני
    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
      SpreadsheetApp.flush();
    }

    let deletedCount = 0;
    let skippedCount = 0;
    sortedRows.forEach(function(row) {
      try {
        const rVal = (sheet.getRange(row, 18).getValue() || "").toString().trim();
        if (rVal.indexOf("מאושר למחיקה") !== 0) {
          skippedCount++;
          Logger.log("[S11 QA] qa_deleteE17Findings — דילוג שורה " + row + ": R אינו 'מאושר למחיקה' יותר (\"" + rVal + "\")");
          return;
        }
        sheet.deleteRow(row); // שורה בלבד — אין קריאה ל-DriveApp כאן בכלל
        deletedCount++;
        Logger.log("[S11 QA] qa_deleteE17Findings — נמחקה שורה " + row + " (שורה בלבד, ללא Drive, עצמאי לגמרי מ-S08)");
      } catch (rowErr) {
        Logger.log("[S11 QA] qa_deleteE17Findings — שגיאה בשורה " + row + ": " + rowErr.message);
      }
    });

    SpreadsheetApp.flush();

    const skippedNote = skippedCount > 0 ? (" (" + skippedCount + " דולגו — כבר לא מסומנות)") : "";
    return { success: true, msg: "🗑️ נמחקו " + deletedCount + " שורות (ללא Drive)" + skippedNote, deleted: deletedCount, skipped: skippedCount };
  } catch (e) {
    Logger.log("[S11 QA] שגיאת qa_deleteE17Findings: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// סריקת שורה בודדת
// ══════════════════════════════════════════════════════════════════

function _qa_scanRow(allData, activeRow, lastRow, eventsFileIds, fileIdRowMap, rNotesAll) {
  const i       = activeRow - QA_DATA_START;
  const rowData = allData[i];
  if (!rowData) return [];
  const myNote = (rNotesAll[i] && rNotesAll[i][0]) || "";
  return _qa_checkRow(rowData, activeRow, allData, lastRow, eventsFileIds, fileIdRowMap, myNote);
}

// ══════════════════════════════════════════════════════════════════
// סריקת כל הגליון
// ══════════════════════════════════════════════════════════════════

function _qa_scanAll(allData, lastRow, eventsFileIds, fileIdRowMap, rNotesAll) {
  const findings = [];
  for (let i = 0; i < allData.length; i++) {
    const row     = i + QA_DATA_START;
    const rowData = allData[i];
    if (!rowData[0]) continue; // דלג שורות ריקות (אין File_ID)
    const myNote = (rNotesAll[i] && rNotesAll[i][0]) || "";
    const rowFindings = _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds, fileIdRowMap, myNote);
    rowFindings.forEach(function(f) { findings.push(f); });
  }
  return findings;
}

// ══════════════════════════════════════════════════════════════════
// [v1.9.0] Task 102 — דה-דופ ממצאי E11 (חלופה A: מנצח יחיד לכל יעד)
// ══════════════════════════════════════════════════════════════════

function _qa_dedupeE11Findings(findings) {
  // כשכמה שורות מקור שונות (למשל 20/34/52) יוצרות ממצא E11 עבור אותה
  // שורת-יעד (למשל 11) — נשמר רק הראשון שנסרק (מספר השורה הנמוך ביותר,
  // בזכות סדר הסריקה העולה ב-_qa_scanAll). שאר הממצאים לאותו יעד מוסרים,
  // כדי למנוע דריסה שקטה של אחד ע"י השני ב-_qa_applyFixes.
  var seenTargets = {};
  return findings.filter(function(f) {
    if (f.code !== "E11") return true;
    if (seenTargets[f.row]) return false;
    seenTargets[f.row] = true;
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════
// בדיקת שורה אחת — מחזיר מערך ממצאים
// ══════════════════════════════════════════════════════════════════

function _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds, fileIdRowMap, myNote) {
  const findings = [];

  // קריאת עמודות (0-based)
  const fileId = (rowData[0]  || "").toString().trim();  // A=1
  const l      = (rowData[11] || "").toString().trim();  // L=12
  const m      = (rowData[12] || "").toString().trim();  // M=13
  const n      = (rowData[13] || "").toString().trim();  // N=14
  const o      = (rowData[14] || "").toString().trim();  // O=15
  const q      = (rowData[16] || "").toString().trim();  // Q=17
  const r      = (rowData[17] || "").toString().trim();  // R=18
  const s      = (rowData[18] || "").toString().trim();  // S=19
  const t      = (rowData[19] || "").toString().trim();  // T=20
  const u      = (rowData[20] || "").toString().trim();  // U=21
  const txtUrl = (rowData[23] || "").toString().trim();  // X=24

  if (!fileId) return findings;

  // ── E01: M ריק + O קיים → S05 רץ אך לא עדכן M ──────────────
  if (!m && o) {
    findings.push({
      row:   row,
      code:  "E01",
      col:   13,
      desc:  "M ריק למרות שO=" + o,
      fix:   "write",
      value: "ממתין להמרה ל-TXT"
    });
  }

  // ── E02: M=ממתין + TXT_URL קיים → לא עודכן אחרי S06 ─────────
  if (m === "ממתין להמרה ל-TXT" && txtUrl) {
    findings.push({
      row:   row,
      code:  "E02",
      col:   13,
      desc:  "M=ממתין אך X קיים",
      fix:   "write",
      value: "הומר ל-TXT"
    });
  }

  // ── E03: M = ערך לא חוקי ────────────────────────────────────
  if (m && QA_VALID_M.indexOf(m) === -1) {
    findings.push({
      row:   row,
      code:  "E03",
      col:   13,
      desc:  "M='" + m + "' — ערך לא חוקי",
      fix:   "flag",
      value: "⚠️ ערך M לא חוקי: " + m
    });
  }

  // ── E04: M=הומר ל-TXT + S קיים → שגיאה S06 לא נוקתה ─────────
  if (m === "הומר ל-TXT" && s) {
    findings.push({
      row:   row,
      code:  "E04",
      col:   19,
      desc:  "M=הומר + S='" + s + "' — שגיאה ישנה",
      fix:   "clear_st"
    });
  }

  // ── E05: M=עבר סיווג + S קיים → שגיאה S07 לא נוקתה ──────────────
  if (m === "עבר סיווג" && s) {
    findings.push({
      row:   row,
      code:  "E05",
      col:   19,
      desc:  "M=עבר סיווג + S='" + s + "' — שגיאה ישנה",
      fix:   "clear_st"
    });
  }

  // ── E06: M=מאושר + S קיים → שגיאה לא נוקתה ──────────────────
  if (m === "מאושר" && s) {
    findings.push({
      row:   row,
      code:  "E06",
      col:   19,
      desc:  "M=מאושר + S='" + s + "' — שגיאה ישנה",
      fix:   "clear_st"
    });
  }

  // ── E07: M=עבר סיווג + N ריק → S07 לא כתב Extraction_Status ─────
  if (m === "עבר סיווג" && !n) {
    findings.push({
      row:   row,
      code:  "E07",
      col:   14,
      desc:  "M=עבר סיווג + N ריק",
      fix:   "write",
      value: "חולץ מלא"
    });
  }

  // ── E08: N קיים + ערך לא חוקי ────────────────────────────────
  if (n && QA_VALID_N.indexOf(n) === -1) {
    findings.push({
      row:   row,
      code:  "E08",
      col:   14,
      desc:  "N='" + n + "' — ערך לא חוקי",
      fix:   "flag",
      value: "⚠️ ערך N לא חוקי: " + n
    });
  }

  // ── E09: Q קיים + ערך לא חוקי ────────────────────────────────
  if (q && QA_VALID_Q.indexOf(q) === -1) {
    findings.push({
      row:   row,
      code:  "E09",
      col:   17,
      desc:  "Q='" + q + "' — ערך לא חוקי",
      fix:   "flag",
      value: "⚠️ ערך Q לא חוקי: " + q
    });
  }

  // ── [v1.11.0] Task 121 — E26: Q כתוב באנגלית (שאריות מלפני Task 33/v2.4.0)
  // מתרגם אוטומטית לעברית המקבילה. לא נוגע ב-QA_VALID_Q — E09 ממשיך לראות
  // את הערכים האנגליים כ"תקינים טכנית" כדי לא ליצור התנגשות כפולה עם E26
  // על אותה שורה באותה סריקה.
  if (q && QA_COMPLEXITY_EN_TO_HE.hasOwnProperty(q)) {
    findings.push({
      row:   row,
      code:  "E26",
      col:   17,
      desc:  "Q='" + q + "' (אנגלית) — מתורגם ל-'" + QA_COMPLEXITY_EN_TO_HE[q] + "'",
      fix:   "write",
      value: QA_COMPLEXITY_EN_TO_HE[q]
    });
  }

  // ── E10: Q קיים + M=ממתין להמרה → Q לפני S06 ────────────────
  if (q && m === "ממתין להמרה ל-TXT") {
    findings.push({
      row:   row,
      code:  "E10",
      col:   17,
      desc:  "Q קיים לפני S06 (M=ממתין)",
      fix:   "clear",
      value: ""
    });
  }

  // ── E11 / E12 — עמודה R + עמודה 27: סימטריה + אימות רפרנס מול המציאות ──
  // [v1.20.0] Task 132 — שכתוב מלא (ראה @changes בכותרת). המקור היחיד
  // לאמת הוא עמודה 27 (File_ID קבוע, לא תלוי במספר שורה). E18/E19/E20/E21
  // הוסרו — כולן טיפלו בבעיות רפרנס מבוסס-מספר-שורה שלא קיימות יותר.
  const col27 = (rowData[26] || "").toString().trim(); // עמודה 27 = AA
  if (r && (r.indexOf("כפול מאושר") === 0 || r.indexOf("חשוד ככפול") === 0)) {
    if (!col27) {
      // רשת ביטחון — לא אמור לקרות אחרי Task 130+131 (מיגרציה + S07 חדש).
      findings.push({
        row:   row,
        code:  "E12",
        col:   18,
        desc:  "R מסומן ככפול אך עמודה 27 ריקה — אין רפרנס לשחזר ממנו",
        fix:   "clear",
        value: ""
      });
    } else {
      const actualRow = fileIdRowMap[col27];

      if (!actualRow) {
        // E12 — עמודה 27 מצביעה על File_ID שלא קיים יותר בגליון (נמחק)
        findings.push({
          row:   row,
          code:  "E12",
          col:   18,
          desc:  "עמודה 27 מצביעה על File_ID שלא קיים יותר בגליון — יש לנקות R ועמודה 27",
          fix:   "clear",
          value: ""
        });
      } else {
        // E11 — סימטריה: לשורת היעד חסרה הפניה חזרה (R ו/או עמודה 27)
        const targetIdx   = actualRow - QA_DATA_START;
        const targetR     = (allData[targetIdx][17] || "").toString().trim();
        const targetCol27 = (allData[targetIdx][26] || "").toString().trim();

        if (!targetR || targetCol27 !== fileId) {
          findings.push({
            row:        actualRow,
            code:       "E11",
            col:        18,
            desc:       "שורה " + actualRow + " חסרה הפניה חזרה (R ו/או עמודה 27) לשורה " + row,
            fix:        "write_symmetry",
            value:      r,
            col27Value: fileId
          });
        }
        // targetR קיים וtargetCol27 === fileId → תקין לחלוטין, אין ממצא.
      }
    }
  }
  // ── E13: U=אושר ידנית + M≠מאושר ─────────────────────────────
  if (u === "✅ אושר ידנית" && m !== "מאושר" && m !== "אומת ידנית") {
    findings.push({
      row:   row,
      code:  "E13",
      col:   21,
      desc:  "U=אושר ידנית + M='" + m + "' — אי-עקביות",
      fix:   "flag",
      value: "⚠️ U=אושר אך M≠מאושר"
    });
  }

  // ── [v1.3.0] E14: L לא חוקי — אי-אחידות קטגוריה ─────────────
  if (l && QA_VALID_L.indexOf(l) === -1) {
    findings.push({
      row:   row,
      code:  "E14",
      col:   12,
      desc:  "L='" + l + "' — ערך לא חוקי (צפוי: רפואי/חשבונאי/משפטי/ביטוחי/אחר)",
      fix:   "write",
      value: l.replace("מסמך ", "")
    });
  }

  // ── [v1.3.2] E15: M=חולץ לגליונות אך אין שורות ביומן_אירועים_רפואי ─
  // [v1.3.2] תיקון — סוגרת findings.push + return findings מחוץ ל-if
  if ((m === "חולץ לגליונות" || m === "חולץ ליומן אירועים") && fileId && eventsFileIds && !eventsFileIds[fileId]) {
    findings.push({
      row:   row,
      code:  "E15",
      col:   21,
      desc:  "M=חולץ לגליונות אך File_ID לא נמצא ב-" + QA_EVENTS_SHEET,
      fix:   "clear_u",
      value: ""
    });
  }

  // ── [v1.7.0] Task 94 — E16: OCR_ — שורת ארכיון ישנה ממקור Mod_Brain_OCR ───
  // תנאי צר בכוונה (גישה שמרנית שאושרה): רק File_ID המתחיל ב-"OCR_".
  // DriveApp.getFileById נבדק לתצוגה בלבד — לא כתנאי לזיהוי הממצא.
  // [v1.9.0] Task 112 — שונה מ-"delete_row" ל-"write": S11 לא מוחק שורות/קבצים
  // בעצמו יותר. רק מסמן בעמודה R "מאושר למחיקה" — המחיקה בפועל (שורה + קבצי
  // Drive) מבוצעת ע"י S08 (s08_deleteApproved, Task 114).
  if (fileId.indexOf("OCR_") === 0) {
    let driveState = "";
    try {
      DriveApp.getFileById(fileId);
      driveState = "(הקובץ עדיין קיים ב-Drive)";
    } catch (e) {
      driveState = "(הקובץ לא נגיש/נמחק ב-Drive)";
    }
    findings.push({
      row:   row,
      code:  "E16",
      col:   18,
      desc:  "File_ID מתחיל ב-'OCR_' — שורת ארכיון ישנה " + driveState,
      fix:   "write",
      value: "מאושר למחיקה — ארכיון OCR ישן"
    });
  }

  // ── [Task 99] E17 / [v1.8.0] Task 100 E22 — SOURCE_GONE ─────────────────
  // שמרני: בדיקת קיום/גישה ל-File_ID בלבד.
  // [v1.8.0] Task 100 — כאשר בנוסף לכך אין שום עותק שמור של הנתונים באף שלב
  // (M=ממתין להמרה + X ריק) — נוצר ממצא E22. בכל שאר המקרים (למשל שורות שכבר
  // הומרו ל-TXT) ממשיך להיווצר E17 הרגיל, ללא שינוי בהתנהגות הקיימת.
  // [v1.9.0] Task 112 — E22 שונה מ-"delete_row" ל-"write": S11 לא מוחק בעצמו,
  // רק מסמן "מאושר למחיקה" בעמודה R (ראה הערה ב-E16 לעיל).
  if (fileId) {
    try {
      // תצוגה בלבד — אימות זמינות המקור. אין שימוש באובייקט המוחזר.
      DriveApp.getFileById(fileId);
    } catch (e) {
      var shortId = fileId.length > 10 ? (fileId.substring(0, 6) + "..." + fileId.substring(fileId.length - 4)) : fileId;

      // [v1.8.0] Task 100 — תנאי כפול: אין המרה ל-TXT וגם אין TXT_URL בכלל
      var isUnrecoverable = (m === "ממתין להמרה ל-TXT") && !txtUrl;

      if (isUnrecoverable) {
        findings.push({
          row:   row,
          code:  "E22",
          col:   18,
          desc:  "מקור חסר לצמיתות מ-Drive (" + shortId + ") + אין TXT — אין עותק נתונים באף שלב, אומת ידנית ב-Task 101",
          fix:   "write",
          value: "מאושר למחיקה — מקור אבד לצמיתות"
        });
      } else {
        // [v1.15.0] Task 118 — אם U כבר מכיל את דגל E17 מסריקה קודמת, זו
        // הופעה שנייה רצופה על אותה שורה — לא תקלת Drive חד-פעמית/זמנית
        // (הוחלט: להסלים למחיקה רק אחרי אימות חזרה, לא בפעם הראשונה).
        // U עצמה משמשת כזיכרון — אין צורך במנגנון אחסון נפרד.
        var isRecurringE17 = u.indexOf("מקור חסר (Drive)") !== -1;

        if (isRecurringE17) {
          findings.push({
            row:   row,
            code:  "E17",
            col:   18, // R — הסלמה, לא U
            desc:  "מקור חסר/לא נגיש — File_ID אינו זמין ב-Drive (" + shortId + ") — חוזר בסריקה נוספת, אינה תקלה חד-פעמית",
            fix:   "write",
            value: "מאושר למחיקה — מקור אבד לצמיתות (E17 חוזר)"
          });
        } else {
          findings.push({
            row:   row,
            code:  "E17",
            col:   21, // QA_Status (U)
            desc:  "מקור חסר/לא נגיש — File_ID אינו זמין ב-Drive (" + shortId + ")",
            fix:   "flag",
            value: "⚠️ מקור חסר (Drive)"
          });
        }
      }
    }
  }

  // ── [v1.9.0] Task 113 — E25: לוגו/ריק — מחליף בדיקה שהוסרה מ-S05 ────────
  // רץ רק אחרי שS07 כבר עיבד את השורה (n קיים) — כדי לנצל תוכן אמיתי (I/J +
  // מספר מילים בפועל מכותרת קובץ ה-TXT) במקום גודל קובץ בלבד כפי שהיה ב-S05.
  // S11 רק מסמן — לא מוחק (ראה הערה ב-E16 לעיל).
  // [v1.10.0] התנאי הורחב לזהות גם R="חשוד כלוגו/ריק" — הערך הישן שS05
  // (לפני ההסרה) כבר הספיק לכתוב לשורות רבות. בלי ההרחבה, שורות כאלה
  // לעולם לא נבדקות כי R אצלן לא ריק (r) והתנאי הישן (!r) נכשל תמיד.
  // [v1.12.0] Tasks 115+116+117 — תיקון פער: התנאי המקורי דרש n (Extraction_
  // Status) קיים וגם P (FileSize) תקין כדי להיכנס לבדיקה בכלל — לכל המקרים,
  // כולל שורות עם דגל ישן. שורה עם R="חשוד כלוגו/ריק" שחסר לה n (115) ו/או
  // P תקין (116) — לעולם לא נכנסה לבדיקה, כך שהדגל הישן נשאר תקוע לצמיתות.
  // בנוסף, כשל בשליפת TXT (wordCount=null) טופל כ"אין תוכן אמיתי" וגרם
  // לאישור מחיקה אוטומטי גם כשהסיבה הייתה טכנית בלבד (117 — False-Positive).
  // הפתרון: פיצול לשני מסלולים בלתי-תלויים — מסלול שורה חדשה (כפי שהיה,
  // מותנה ב-n+P) ומסלול פתרון-דגל-ישן (רץ תמיד, בלי תלות ב-n/P).
  var isLegacyLogoFlag = (r === "חשוד כלוגו/ריק");

  // מסלול א' — שורה חדשה (R ריק בלבד): ללא שינוי בהתנהגות מ-v1.10.0,
  // מלבד הגנת Task 117 מפני False-Positive בכשל שליפת TXT.
  if (fileId && !r && n) {
    var sizeStrNew   = (rowData[15] || "").toString(); // P = FileSize
    var sizeMatchNew = sizeStrNew.match(/(\d+(\.\d+)?)/);
    var sizeKBNew    = sizeMatchNew ? parseFloat(sizeMatchNew[1]) : null;

    if (sizeKBNew !== null && sizeKBNew < 10) {
      var docTitleNew  = (rowData[8] || "").toString().trim();  // I
      var docIssuerNew = (rowData[9] || "").toString().trim();  // J
      var wordCountNew = _qa_fetchTxtWordCount_E25(txtUrl);

      if (wordCountNew === null) {
        // [v1.12.0] Task 117 — כשל שליפת TXT: לא מאשרים מחיקה על בסיס
        // כשל טכני — רק דגל לבדיקה ידנית.
        findings.push({
          row:   row,
          code:  "E25",
          col:   18,
          desc:  "גודל " + sizeStrNew + " (<10KB) — לא נמצא TXT לבדיקה (כשל שליפה), נדרשת בדיקה ידנית",
          fix:   "flag",
          value: "⚠️ E25 — לא ניתן לאמת (TXT לא נשלף)"
        });
      } else if (wordCountNew < 20 || docTitleNew === "לא זוהה" || docIssuerNew === "לא זוהה") {
        findings.push({
          row:   row,
          code:  "E25",
          col:   18,
          desc:  "גודל " + sizeStrNew + " (<10KB) + " + wordCountNew + " מילים בפועל (<20) — חשד לוגו/ריק אושר",
          fix:   "write",
          value: "מאושר למחיקה — לוגו/ריק"
        });
      }
      // אחרת (תוכן אמיתי) → אין ממצא, R נשאר ריק כרגיל.
    }
  }

  // מסלול ב' — [v1.12.0] פתרון דגל ישן (isLegacyLogoFlag): רץ תמיד, בלי
  // תלות ב-n או P — המטרה לפתור שורות שכבר תויגו בעבר, ולא "לחכות" לנתונים
  // (n/P) שעבור שורות ישנות עלולים לעולם לא להגיע (115+116).
  if (fileId && isLegacyLogoFlag) {
    var docTitleLeg  = (rowData[8] || "").toString().trim();  // I
    var docIssuerLeg = (rowData[9] || "").toString().trim();  // J
    var wordCountLeg = _qa_fetchTxtWordCount_E25(txtUrl);

    if (wordCountLeg === null) {
      // Task 117 — כשל שליפת TXT: משאירים דגל ישן כפי שהוא, לא מנקים
      // ולא מאשרים מחיקה אוטומטית — רק דגל U לבדיקה ידנית.
      findings.push({
        row:   row,
        code:  "E25",
        col:   18,
        desc:  "דגל ישן 'חשוד כלוגו/ריק' — לא נמצא TXT לבדיקה (כשל שליפה), לא ניתן לאמת/לנקות אוטומטית",
        fix:   "flag",
        value: "⚠️ E25 — דגל ישן, לא ניתן לאמת (TXT לא נשלף)"
      });
    } else if (wordCountLeg >= 20 && docTitleLeg !== "לא זוהה" && docIssuerLeg !== "לא זוהה") {
      // [v1.10.0] תוכן התברר אמיתי, אך R עדיין מכיל את הדגל הישן והשגוי
      // מS05 — יש לנקות אותו, אחרת "חשוד כלוגו/ריק" יישאר שם לצמיתות.
      findings.push({
        row:   row,
        code:  "E25",
        col:   18,
        desc:  wordCountLeg + " מילים בפועל (≥20) + I/J תקינים — חשד נשלל, מנקה דגל ישן",
        fix:   "clear",
        value: ""
      });
    } else {
      findings.push({
        row:   row,
        code:  "E25",
        col:   18,
        desc:  wordCountLeg + " מילים בפועל (<20) או I/J לא תקינים — דגל ישן מאושר",
        fix:   "write",
        value: "מאושר למחיקה — לוגו/ריק"
      });
    }
  }

  // ── [v1.13.0] E27: Pipeline_Status (M) תקוע על "הומר ל-TXT" למרות
  // שהסיווג בפועל הושלם — N="חולץ מלא"/"חולץ חלקי" וגם I (Doc_Title) מלא
  // מוכיחים שS07 רץ בהצלחה, אך M נשאר על הערך שS06 כותב (לפני S07),
  // ולא התקדם ל"עבר סיווג". ככל הנראה סווגו בגרסת S07 ישנה שטרם כתבה M
  // בסוף הריצה. חוסם שגוי כניסה ל-S08 (showMainSidebar, Task 106).
  {
    const docTitleE27 = (rowData[8] || "").toString().trim();  // I=9
    if (fileId && m === "הומר ל-TXT" && docTitleE27 &&
        (n === "חולץ מלא" || n === "חולץ חלקי")) {
      findings.push({
        row:   row,
        code:  "E27",
        col:   13,
        desc:  "Doc_Title מלא + Extraction_Status='" + n + "' (S07 הושלם) אך Pipeline_Status עדיין 'הומר ל-TXT'",
        fix:   "write",
        value: "עבר סיווג"
      });
    }
  }

  // ── [v1.14.0] E28 (בקשת עמוס) — מיגרציית שם: M עדיין מכיל את הערך
  // הישן "מחולץ" (לפני שינוי סמנטי ב-S07/S08/S11/COLUMN_MAP ל-"עבר
  // סיווג"). E03 (ערך M לא חוקי) כבר תופס את זה, אך רק עם fix="flag"
  // (מסמן בלבד, לא מתקן) — כי E03 הוא בדיקת-תקינות כללית ולא יודע מה
  // הערך ה"נכון" המיועד. E28 ממוקד ספציפית להמרה הזו, עם fix="write"
  // אוטומטי לערך החדש, כדי לפתור בבת אחת את כל השורות ההיסטוריות.
  if (fileId && m === "מחולץ") {
    findings.push({
      row:   row,
      code:  "E28",
      col:   13,
      desc:  "M='מחולץ' — ערך ישן, הוחלף ל'עבר סיווג' (שינוי סמנטי בכל השירותים)",
      fix:   "write",
      value: "עבר סיווג"
    });
  }

  return findings;
}

// ══════════════════════════════════════════════════════════════════
// [v1.9.0] Task 113 — שליפת מספר מילים מתוך תוכן קובץ ה-TXT
// אותה שיטת שליפה כמו s08_fetchTxtContent (S08_Validate.gs), לעקביות
// ══════════════════════════════════════════════════════════════════

function _qa_fetchTxtWordCount_E25(txtUrl) {
  try {
    if (!txtUrl) return null;

    var fileId = null;
    var m1 = txtUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];
    var m2 = txtUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
    if (!fileId) return null;

    var content = DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
    var match   = content.match(/מספר_מילים:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;

  } catch (e) {
    Logger.log("[S11 QA] E25 — שגיאה בשליפת מספר מילים: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית טקסט ה-dialog
// ══════════════════════════════════════════════════════════════════

function _qa_buildSummary(findings) {
  const MAX_DISPLAY = 10;
  let lines = [];

  const displayed = findings.slice(0, MAX_DISPLAY);
  displayed.forEach(function(f) {
    const fixLabel =
      f.fix === "write"      ? "→ תיקון אוטומטי" :
      f.fix === "clear"      ? "→ ניקוי עמודה"   :
      f.fix === "clear_st"   ? "→ ניקוי S+T"      :
      f.fix === "flag"       ? "→ דגל U"          :
      f.fix === "clear_u"    ? "→ ניקוי U"        :
      f.fix === "set_note"   ? "→ עדכון Note"     :
      f.fix === "delete_row" ? "→ מחיקת שורה"     : "";
    lines.push("שורה " + f.row + " | " + f.code + " | " + f.desc + " " + fixLabel);
  });

  if (findings.length > MAX_DISPLAY) {
    lines.push("... ועוד " + (findings.length - MAX_DISPLAY) + " ממצאים נוספים");
  }

  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════
// בדיקת עמודה לפני כתיבה
// ══════════════════════════════════════════════════════════════════

function _qa_validateCol(sheet, col, expectedName) {try {
    const actual = sheet.getRange(4, col).getValue().toString().trim();
    if (actual !== expectedName) {
      Logger.log("[S11 QA] ⛔ עמודה " + col + " — צפוי: " + expectedName + " | בפועל: " + actual);
      return false;
    }
    return true;
  } catch(e) {
    Logger.log("[S11 QA] שגיאה בבדיקת עמודה: " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// ביצוע תיקונים — כתיבה לגליון
// ══════════════════════════════════════════════════════════════════
function _qa_applyFixes(sheet, findings) {
  // [v1.9.0] Task 112 — הוסר מנגנון האיסוף-והמחיקה-בסוף (deleteRows): S11
  // אינו מבצע sheet.deleteRow יותר בשום מקרה. כל fix הוא כעת אחד מתוך
  // write/write_symmetry/clear/clear_st/flag/clear_u. המחיקה בפועל (שורה +
  // קבצי Drive) מבוצעת ע"י S08 (s08_deleteApproved, Task 114).
  // [v1.16.0] Task (עמוס, "תקן נבחרים" לא כתב בפועל) — הפונקציה לא החזירה
  // דיווח אמיתי על מה שבאמת נכתב; ה-UI הציג "הצלחה" תמיד. כעת סופרת
  // ומחזירה כמה תיקונים באמת עברו (לא נבלעו ב-catch/עמודה לא תואמת).
  // [v1.17.0] בקשת עמוס — S11 עדיין לא מוחק שורות בעצמו (הכלל לא השתנה),
  // אבל כעת אוספת בנפרד אילו שורות E17 קיבלו בפועל fix="write" ל-R
  // (הסלמה אמיתית, לא רק "flag" ראשוני ל-U) — כדי שה-Dialog יוכל להציע
  // מחיקה מיד אחרי, מאחורי אישור נפרד. שורה E17 נכנסת לרשימה רק אם
  // הכתיבה עצמה הצליחה בפועל (בתוך ה-try, לא נבלעה ב-catch).
  // [v1.20.0] Task 132 — case "write" על עמודה 18 איבד את לוגיקת ה-regex/
  // Note הישנה (S07 כבר לא כותב Note מ-Task 131). case "clear" על עמודה 18
  // מנקה כעת גם עמודה 27 במקום Note. case חדש "write_symmetry" — לתיקון
  // E11: כותב גם ל-R (טקסט הכפילות) וגם לעמודה 27 (File_ID) יחד, לתיקון
  // סימטריה חסרה בשורת התאום.

  let appliedCount = 0;
  const e17DeletionCandidates = [];

  findings.forEach(function(f) {

    try {

      // בדיקת עמודה לפני כל כתיבה
      if (f.col && QA_ALLOWED_COLS[f.col]) {
        if (!_qa_validateCol(sheet, f.col, QA_ALLOWED_COLS[f.col])) {
          Logger.log("[S11 QA] ⛔ כתיבה בוטלה — עמודה " + f.col + " לא תואמת");
          return;
        }
      }

      switch (f.fix) {

        case "write":
          sheet.getRange(f.row, f.col).setValue(f.value);
          break;

        case "write_symmetry":
          // [v1.20.0] Task 132 — תיקון E11: R + עמודה 27 יחד, לתיקון סימטריה
          sheet.getRange(f.row, 18).setValue(f.value);
          sheet.getRange(f.row, 27).setValue(f.col27Value);
          break;

        case "set_note":
          // [v1.7.0] Task 98 — כתיבת Note בלבד, ללא שינוי ערך התא עצמו
          sheet.getRange(f.row, f.col).setNote(f.value);
          break;

        case "clear":
          sheet.getRange(f.row, f.col).clearContent();
          // [v1.20.0] Task 132 — ניקוי R מנקה כעת גם עמודה 27 (במקום Note),
          // אחרת נשאר רפרנס יתום שאינו נראה בתא אך עדיין קיים.
          if (f.col === 18) { sheet.getRange(f.row, 27).setValue(""); }
          break;

        case "clear_st":
          sheet.getRange(f.row, 19).clearContent();
          sheet.getRange(f.row, 20).clearContent();
          break;

        case "flag":
          sheet.getRange(f.row, 21).setValue(f.value);
          break;

        case "clear_u":
          sheet.getRange(f.row, 21).clearContent();
          break;
      }
      appliedCount++;
      Logger.log("[S11 QA] תוקן: שורה " + f.row + " | " + f.code + " | " + f.fix);

      // [v1.17.0] בקשת עמוס — E17 בלבד, ורק אם זו הייתה כתיבת הסלמה
      // אמיתית (fix="write" לעמודה R, לא "flag" ראשוני לעמודה U).
      if (f.code === "E17" && f.fix === "write" && f.col === 18) {
        e17DeletionCandidates.push({ row: f.row, reason: f.value });
      }

    } catch (e) {
      Logger.log("[S11 QA] שגיאה בתיקון שורה " + f.row + ": " + e.message);
    }
  });

  SpreadsheetApp.flush();
  return { appliedCount: appliedCount, e17Rows: e17DeletionCandidates };
}
// ══════════════════════════════════════════════════════════════════
// findAnchorRowAndAuditVerified — Task 77 + Task 82
// סריקה אחת לשתי הבדיקות: איתור שורת-עוגן (L=רפואי, M=עבר סיווג)
// וריכוז שורות עם M=אומת ידנית לחקירת מקור
// ══════════════════════════════════════════════════════════════════

function findAnchorRowAndAuditVerified() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    Logger.log("❌ גליון '" + QA_SHEET_NAME + "' לא נמצא.");
    return;
  }

  const COL_FILE_ID         = 1;  // A
  const COL_SOURCE          = 3;  // C
  const COL_SOURCE_TITLE    = 5;  // E
  const COL_DOC_CATEGORY    = 12; // L
  const COL_PIPELINE_STATUS = 13; // M

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    Logger.log("⚠️ אין שורות נתונים בגליון.");
    return;
  }

  const numRows = lastRow - QA_DATA_START + 1;
  const data = sheet.getRange(QA_DATA_START, 1, numRows, COL_PIPELINE_STATUS).getValues();

  const anchorCandidates = [];
  const verifiedRows = [];

  data.forEach(function(row, idx) {
    const sheetRow = QA_DATA_START + idx;
    const fileId   = row[COL_FILE_ID - 1];
    const source   = row[COL_SOURCE - 1];
    const title    = row[COL_SOURCE_TITLE - 1];
    const category = (row[COL_DOC_CATEGORY - 1]    || "").toString().trim(); // [v1.5.0] trim
    const status   = (row[COL_PIPELINE_STATUS - 1] || "").toString().trim(); // [v1.5.0] trim

    // Task 77 — מועמד לשורת עוגן
    if (category === "רפואי" && status === "עבר סיווג") {
      anchorCandidates.push({ row: sheetRow, fileId: fileId, title: title });
    }

    // Task 82 — חקר מקור "אומת ידנית"
    if (status === "אומת ידנית") {
      verifiedRows.push({ row: sheetRow, fileId: fileId, source: source, title: title });
    }
  });

  let report77 = "Task 77 — מועמדים לשורת עוגן (L=רפואי, M=עבר סיווג)\n";
  report77 += "═".repeat(50) + "\n";
  if (anchorCandidates.length === 0) {
    report77 += "❌ לא נמצאה אף שורה תואמת.\n";
  } else {
    report77 += "✅ נמצאו " + anchorCandidates.length + " מועמדים:\n\n";
    anchorCandidates.forEach(function(c) {
      report77 += "שורה " + c.row + " | File_ID: " + c.fileId + " | כותרת: " + c.title + "\n";
    });
  }

  let report82 = "\n\nTask 82 — שורות עם M=אומת ידנית (חקר מקור)\n";
  report82 += "═".repeat(50) + "\n";
  if (verifiedRows.length === 0) {
    report82 += "❌ לא נמצאה אף שורה עם הערך הזה.\n";
  } else {
    report82 += "⚠️ נמצאו " + verifiedRows.length + " שורות:\n\n";
    verifiedRows.forEach(function(v) {
      report82 += "שורה " + v.row + " | File_ID: " + v.fileId + " | מקור: " + v.source + " | כותרת: " + v.title + "\n";
    });
  }

  const fullReport = report77 + report82;
  Logger.log(fullReport);

  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "תוצאות סריקה — Task 77 + 82",
    fullReport.length > 4000 ? fullReport.substring(0, 4000) + "\n\n... (ראה Logger.log לתוכן מלא)" : fullReport,
    ui.ButtonSet.OK
  );
}

// ══════════════════════════════════════════════════════════════════
// [v1.6.0] Task 93 — מיגרציה חד-פעמית: File_ID מעמודה A → Note בעמודה R
// ══════════════════════════════════════════════════════════════════

function qa_migrateNotesFromR_Task93() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים למיגרציה", "S11 QA — Task 93", 3);
    return;
  }

  const numRows      = lastRow - QA_DATA_START + 1;
  const fileIdRange  = sheet.getRange(QA_DATA_START, 1, numRows, 1);
  const rRange       = sheet.getRange(QA_DATA_START, 18, numRows, 1);

  const fileIdVals = fileIdRange.getValues();
  const rVals       = rRange.getValues();
  const rNotes       = rRange.getNotes();

  let migrated   = 0;
  let alreadySet = 0;
  let notFound   = 0;
  let skipped    = 0;

  for (let i = 0; i < numRows; i++) {
    const rVal = (rVals[i][0] || "").toString().trim();
    if (!rVal) { skipped++; continue; }

    const existingNote = (rNotes[i][0] || "").toString().trim();
    if (existingNote) { alreadySet++; continue; }

    const match = rVal.match(/שורה\s+(\d+)/);
    if (!match) { skipped++; continue; }

    const targetRow = parseInt(match[1], 10);
    if (targetRow < QA_DATA_START) { skipped++; continue; }

    const targetIdx = targetRow - QA_DATA_START;
    if (targetIdx < 0 || targetIdx >= numRows) { notFound++; continue; }

    const targetFileId = (fileIdVals[targetIdx][0] || "").toString().trim();
    if (!targetFileId) { notFound++; continue; }

    sheet.getRange(QA_DATA_START + i, 18).setNote(targetFileId);
    migrated++;
  }

  const msg =
    "מיגרציית Notes הושלמה:\n\n" +
    "✅ הושלמה כתיבת Note: " + migrated + "\n" +
    "⏭️ כבר היה Note קיים: " + alreadySet + "\n" +
    "⚠️ לא נמצא File_ID יעד: " + notFound + "\n" +
    "➖ דולגו (R ריק / לא בתבנית 'שורה X'): " + skipped;

  Logger.log("[S11 QA Task93] " + msg.replace(/\n/g, " | "));
  SpreadsheetApp.getUi().alert("מיגרציה חד-פעמית — Task 93", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
// ══════════════════════════════════════════════════════════════════
// [v1.19.0] Task 130 — מיגרציה חד-פעמית: File_ID → עמודה 27 (Duplicate_Target_FileID)
// ══════════════════════════════════════════════════════════════════

function qa_migrateNoteColToColumn27_Task130() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים למיגרציה", "S11 QA — Task 130", 3);
    return;
  }

  const numRows      = lastRow - QA_DATA_START + 1;
  const fileIdRange  = sheet.getRange(QA_DATA_START, 1, numRows, 1);
  const rRange       = sheet.getRange(QA_DATA_START, 18, numRows, 1);
  const col27Range   = sheet.getRange(QA_DATA_START, 27, numRows, 1);

  const fileIdVals = fileIdRange.getValues();
  const rVals      = rRange.getValues();
  const rNotes     = rRange.getNotes();
  const col27Vals  = col27Range.getValues();

  let migrated     = 0;
  let alreadySet   = 0;
  let fromNote     = 0;
  let fromRegex    = 0;
  let notFound     = 0;
  let skipped      = 0;

  for (let i = 0; i < numRows; i++) {
    const rVal = (rVals[i][0] || "").toString().trim();
    if (!rVal) { skipped++; continue; }

    const existingCol27 = (col27Vals[i][0] || "").toString().trim();
    if (existingCol27) { alreadySet++; continue; }

    const existingNote = (rNotes[i][0] || "").toString().trim();
    if (existingNote) {
      sheet.getRange(QA_DATA_START + i, 27).setValue(existingNote);
      migrated++;
      fromNote++;
      continue;
    }

    const match = rVal.match(/שורה\s+(\d+)/);
    if (!match) { skipped++; continue; }

    const targetRow = parseInt(match[1], 10);
    if (targetRow < QA_DATA_START) { skipped++; continue; }

    const targetIdx = targetRow - QA_DATA_START;
    if (targetIdx < 0 || targetIdx >= numRows) { notFound++; continue; }

    const targetFileId = (fileIdVals[targetIdx][0] || "").toString().trim();
    if (!targetFileId) { notFound++; continue; }

    sheet.getRange(QA_DATA_START + i, 27).setValue(targetFileId);
    migrated++;
    fromRegex++;
  }

  const msg =
    "מיגרציית עמודה 27 הושלמה:\n\n" +
    "✅ סה\"כ נכתב לעמודה 27: " + migrated + "\n" +
    "   מתוכם — מ-Note קיים: " + fromNote + "\n" +
    "   מתוכם — מפענוח טקסט R: " + fromRegex + "\n" +
    "⏭️ כבר היה ערך קיים בעמודה 27: " + alreadySet + "\n" +
    "⚠️ לא נמצא File_ID יעד: " + notFound + "\n" +
    "➖ דולגו (R ריק / לא בתבנית 'שורה X'): " + skipped;

  Logger.log("[S11 QA Task130] " + msg.replace(/\n/g, " | "));
  SpreadsheetApp.getUi().alert("מיגרציה חד-פעמית — Task 130", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
// ══════════════════════════════════════════════════════════════════
// [v1.6.1] Task 93 — אבחון: איתור שורה יתומה שהמיגרציה לא הצליחה למלא
// ══════════════════════════════════════════════════════════════════

function qa_findOrphanDuplicateRef_Task93() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים לאבחון", "S11 QA — אבחון Task 93", 3);
    return;
  }

  const numRows      = lastRow - QA_DATA_START + 1;
  const fileIdRange  = sheet.getRange(QA_DATA_START, 1, numRows, 1);
  const rRange       = sheet.getRange(QA_DATA_START, 18, numRows, 1);
  const titleRange   = sheet.getRange(QA_DATA_START, 9, numRows, 1);

  const fileIdVals = fileIdRange.getValues();
  const rVals       = rRange.getValues();
  const rNotes       = rRange.getNotes();
  const titleVals   = titleRange.getValues();

  const orphans = [];

  for (let i = 0; i < numRows; i++) {
    const rVal = (rVals[i][0] || "").toString().trim();
    if (!rVal) continue;

    const existingNote = (rNotes[i][0] || "").toString().trim();
    if (existingNote) continue; // כבר תוקן במיגרציה — לא רלוונטי לאבחון

    const match = rVal.match(/שורה\s+(\d+)/);
    if (!match) continue; // אין תבנית "שורה X" — לא רלוונטי (לוגו/ריק וכו')

    const currentRow = QA_DATA_START + i;
    const targetRow   = parseInt(match[1], 10);
    const currentFileId = (fileIdVals[i][0] || "").toString().trim();
    const currentTitle  = (titleVals[i][0]  || "").toString().trim();

    let targetStatus;
    let targetFileId = "";
    let targetTitle  = "";

    if (targetRow < QA_DATA_START || (targetRow - QA_DATA_START) >= numRows) {
      targetStatus = "שורה " + targetRow + " מחוץ לטווח הנתונים (מחוקה / לא קיימת)";
    } else {
      const targetIdx = targetRow - QA_DATA_START;
      targetFileId = (fileIdVals[targetIdx][0] || "").toString().trim();
      targetTitle  = (titleVals[targetIdx][0]  || "").toString().trim();
      targetStatus = targetFileId
        ? "שורה קיימת אך File_ID לא זוהה כתקין (בדוק תוכן תא A" + targetRow + ")"
        : "שורה קיימת אך עמודה A (File_ID) ריקה בה";
    }

    orphans.push({
      row:         currentRow,
      fileId:      currentFileId,
      title:       currentTitle,
      rText:       rVal,
      targetRow:   targetRow,
      targetFileId: targetFileId,
      targetTitle: targetTitle,
      status:      targetStatus
    });
  }

  if (orphans.length === 0) {
    SpreadsheetApp.getUi().alert(
      "אבחון Task 93",
      "✅ לא נמצאו שורות יתומות — כל ההפניות תקינות.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  let msg = "נמצאו " + orphans.length + " שורות יתומות:\n\n";
  orphans.forEach(function(o) {
    msg += "── שורה " + o.row + " ──\n";
    msg += "File_ID: " + (o.fileId || "—") + "\n";
    msg += "כותרת: " + (o.title || "—") + "\n";
    msg += "R (Duplicate_Flag): " + o.rText + "\n";
    msg += "מצביע לשורה: " + o.targetRow + "\n";
    msg += "מצב שורת היעד: " + o.status + "\n";
    if (o.targetTitle) msg += "כותרת שורת היעד: " + o.targetTitle + "\n";
    msg += "\n";
  });

  Logger.log("[S11 QA Task93 אבחון] " + msg.replace(/\n/g, " | "));
  SpreadsheetApp.getUi().alert("אבחון שורות יתומות — Task 93", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}