/**
 * @file        S15_EnrichCatalog.gs
 * @version     1.8.0 | @updated 03/11/2026 12:41 | @service S15
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S15_EnrichCatalog.gs
 * @description שירות העשרת קטלוגים — מנוע כללי שמוגדר לפי תחום (S15_DOMAINS).
 *              לכל גליון יעד: סורק שורות שעמודת הסטטוס שלהן ריקה, מחפש כל
 *              שם בבלוק הקטלוג שלו במיפוי_קודים (לפי Normalized_Value או
 *              Raw_Value), ושולח את כל השורות הממתינות בקריאת Gemini אחת
 *              לאצווה — לקבלת קוד קטלוג מוצע ולפירוק השדות המובנים. כותב
 *              הצעות בלבד (סטטוס "הוצע"); הקטלוג עצמו לא נכתב — הצעות לקודים
 *              חדשים נשמרות ב-Script Properties (S15_PENDING_CATALOG) עד אישור
 *              אנושי (שלב האימות, Task #256 שלב 4). בשלב זה מוגדר תחום אחד:
 *              תרופות_קבועות (בלוק Medications, BA-BF, מפתח = קוד ATC).
 *              [v1.1.0] אימות אנושי בחלון S16_Sidebar.html במצב "medication":
 *              s15_showValidation שומר את נתוני השורה תחת S16_PROP_KEY ופותח את
 *              החלון; ניווט (s15_loadRowByNumber) ואישור (s15_approve). באישור:
 *              קוד חדש נכתב כשורה בבלוק הקטלוג, קוד קיים — נתוני הקטלוג גוברים
 *              ורק השם המסחרי נוסף ל-Raw_Value; ההצעה הממתינה נמחקת, השורה
 *              מסומנת "מאומת" וסוג הטיפול (כרוני / זמני / לפי הצורך) נכתב.
 *              [v1.2.0] תחום שני: הנחיות_רפואיות_ומשימות (בלוק סוגי_הנחיות, BX-CB,
 *              מפתח = INS00-INS09). תחום עם handler ב-S15_DOMAINS מקבל מטפל ייעודי
 *              (פרומפט ופענוח משלו) דרך _s15_getHandler; תחום בלי handler
 *              (התרופות) ממשיך בנתיב הקיים ללא שינוי. בהנחיות — רשימה סגורה:
 *              לא מוצעים קודים חדשים לקטלוג.
 *              [v1.3.0] אימות הנחיות בחלון S16_Sidebar.html במצב "instruction":
 *              s15_showValidation מעביר את גליון ההנחיות ל-_s15_instrShowValidation;
 *              ניווט (s15_instrLoadRowByNumber) ואישור (s15_instrApprove). רשימה
 *              סגורה — סוג, אופי, קוד יעד (התמחות/ATC מהקטלוג), מערכת גוף, סטטוס
 *              (פתוח / בוצע / בוטל) ותאריך יעד; הקטלוג לא נכתב.
 *              [v1.4.0] תחום שלישי: בדיקות_דם (מעבדה ומדדים; בלוק מאפייני_מעבדה,
 *              BG-BL, מפתח = קוד LOINC). מטפל ייעודי (_s15_labHandler): קטלוג
 *              פתוח — קוד LOINC תקין שאינו בקטלוג נשמר כהצעה ב-S15_PENDING_CATALOG;
 *              פאנל מרשימה סגורה (בלוק פאנלים, BS-BW), ברירת מחדל PNL-L00;
 *              מערכת גוף SYSnn מהרשימה. התאמה בקטלוג גוברת על הצעת Gemini.
 *              [v1.5.0] אימות מעבדה בחלון S16_Sidebar.html במצב "lab":
 *              s15_showValidation מעביר את גליון בדיקות_דם ל-_s15_labShowValidation;
 *              ניווט (s15_labLoadRowByNumber) ואישור (s15_labApprove). קוד LOINC,
 *              פאנל (חובה, רשימה סגורה), מערכת גוף, ערך מספרי, יחידה וגבולות
 *              טווח; קוד חדש נכתב כשורה בבלוק BG-BL. קודי LOINC נכתבים בעיצוב
 *              טקסט, כדי שגוגל שיטס לא יפרש אותם כתאריך.
 *              [v1.6.0] תחום רביעי: בדיקות_גנטיות (בלוק תכונות_גנטיות, BM-BR,
 *              מפתח = קוד פנימי GTR-nnn — לתכונות אין קידוד בינלאומי). מטפל
 *              ייעודי (_s15_genHandler): קטלוג פתוח — תכונה מוכרת (בקטלוג המאומת
 *              או בהצעה ממתינה) מקבלת את הקוד הקיים, תכונה חדשה את הקוד הפנוי
 *              הבא, ותכונות עם אותו שם מנורמל באותה ריצה — קוד אחד. פאנל מרשימה
 *              סגורה (קודי PNL-G בבלוק פאנלים, BS-BW), ברירת מחדל PNL-G00; מערכת
 *              גוף SYSnn מהרשימה. גן תקין (עמודה M) שאינו בקטלוג הגנים (CC-CH)
 *              נשמר כהצעה ממתינה. הצעות מסומנות block="traits" / block="genes".
 *              [v1.7.0] אימות גנטיקה בחלון S16_Sidebar.html במצב "gen":
 *              s15_showValidation מעביר את גליון בדיקות_גנטיות ל-_s15_genShowValidation;
 *              ניווט (s15_genLoadRowByNumber) ואישור (s15_genApprove). קוד תכונה
 *              נבחר רק מהקודים המוכרים (מאומתים או ממתינים); קוד ממתין נכתב
 *              כשורה בבלוק BM-BR, קוד מאומת — נתוני הקטלוג גוברים ורק השם
 *              נוסף. Raw_Value מחושב בשרת ואינו נשלח מהחלון (לקח #266). גן
 *              תקין שאינו בקטלוג — שורה חדשה בבלוק CC-CH. הצעה שהוחלפה ואינה
 *              בשימוש נמחקת. הנטייה (L) לתצוגה בלבד.
 *              [v1.8.0] בקוד חדש בתרופות ובמעבדה — Raw_Value בקטלוג מתחיל רק מהשם
 *              בשורה שמאושרת (לא מהחלון ולא מהצעת Gemini). כותרות חלונות האימות
 *              ללא מספר שורה (המספר מוצג בתוך החלון ומתעדכן במעבר).
 * @impacts     תרופות_קבועות: קורא A-E (שם, חומר פעיל, מינון, תדירות, סיבה),
 *              כותב M-R בלבד (ATC_Code | Dose_Amount | Dose_Unit |
 *              Times_Per_Day | Days_Per_Week | Enrich_Status="הוצע").
 *              לא נוגע בעמודות A-L. שורה עם R לא ריק — לא מעובדת שוב.
 *              מיפוי_קודים: קורא בלבד, בלוק BA-BF (עמודות 53-58).
 *              Script Properties: S15_PENDING_CATALOG (הצעות קטלוג, JSON).
 *              תלויות: SHEET_CONFIG (COLUMN_MAP.gs), CODE_MAP_SHEET_NAME
 *              (ViewEngine.gs), S13_BODY_SYSTEMS (S13_ExtractMedical.gs —
 *              לשמות המערכות בפרומפט, עם בדיקת typeof), GEMINI_API_KEY.
 *              [v1.1.0] אימות (s15_approve): תרופות_קבועות — כותב B (חומר
 *              פעיל, אם לא ריק), E (סיבה), L (מערכת גוף — רק כשיש קוד ומערכת)
 *              ו-M-S (S = Treatment_Type, R = "מאומת"); A, C, D, F-K לא נכתבים.
 *              מיפוי_קודים — כותב שורה חדשה בבלוק BA-BF (קוד חדש) או מעדכן
 *              Raw_Value (BD) בקוד קיים. Script Properties: S16_CURRENT_PAYLOAD
 *              (S16_PROP_KEY) ומחיקת הצעה מ-S15_PENDING_CATALOG. תלויות נוספות:
 *              S16_PROP_KEY (S16_ValidateMedicalStatus.gs, עם בדיקת typeof),
 *              S16_Sidebar.html (תבנית החלון), LockService.
 *              [v1.2.0] הנחיות_רפואיות_ומשימות: קורא B-E ו-I (גורם מנחה, תיאור,
 *              סוג גולמי, תאריך יעד, מערכת גוף), כותב J-M בלבד (Instruction_Code |
 *              Instruction_Kind | Target_Code | Enrich_Status="הוצע"). לא נוגע
 *              ב-A-I. מיפוי_קודים: קורא בלבד — BX-CB (סוגי הנחיות), J-N (התמחויות)
 *              ו-BA-BF (תרופות, לקוד יעד). Script Properties: לא נכתב בתחום זה.
 *              [v1.3.0] אימות הנחיות (s15_instrApprove): הנחיות_רפואיות_ומשימות —
 *              כותב E-F (Due_Date לפי אזור הזמן של הגליון, Status), I (מערכת גוף)
 *              ו-J-M (M = "מאומת"); A-D ו-G-H לא נכתבים. מיפוי_קודים: קורא בלבד
 *              (BX-CB, J-N, BA-BF). Script Properties: S16_CURRENT_PAYLOAD.
 *              [v1.4.0] בדיקות_דם: קורא B-D, N ו-P (שם הבדיקה, קטגוריה, ערך,
 *              סוג דגימה, יחידה), כותב K-M (Medical_System | LOINC_Code |
 *              Panel_Code) ו-S (Lab_Status="הוצע") בלבד; A-J ו-N-R לא נכתבים.
 *              מיפוי_קודים: קורא בלבד — BG-BL (מאפייני מעבדה) ו-BS-BW (פאנלים).
 *              Script Properties: S15_PENDING_CATALOG (הצעות LOINC חדשות).
 *              [v1.5.0] אימות מעבדה (s15_labApprove): בדיקות_דם — כותב K-M
 *              (מערכת, LOINC, פאנל) ו-O-S (ערך מספרי, יחידה, גבול תחתון, גבול
 *              עליון, S = "מאומת"); A-J ו-N לא נכתבים. K-M נכתבים בעיצוב טקסט
 *              (גם בהעשרה, _s15_labHandler). מיפוי_קודים — שורה חדשה בבלוק
 *              BG-BL בעיצוב טקסט (קוד חדש) או עדכון Raw_Value (BJ) בקוד קיים;
 *              קורא BS-BW (פאנלים). Script Properties: S16_CURRENT_PAYLOAD
 *              ומחיקת הצעה מ-S15_PENDING_CATALOG. LockService באישור.
 *              [v1.6.0] בדיקות_גנטיות: קורא B-E ו-M (שם הפאנל במסמך, גן או
 *              וריאנט, שם התכונה, משמעות, סמל גן), כותב I-K (Medical_System |
 *              Trait_Code | Panel_Code, בעיצוב טקסט) ו-Q (Enrich_Status="הוצע")
 *              בלבד; A-H ו-L-P לא נכתבים. מיפוי_קודים: קורא בלבד — BM-BR
 *              (תכונות), BS-BW (פאנלים) ו-CC-CH (גנים). Script Properties:
 *              S15_PENDING_CATALOG (הצעות תכונות וגנים, קריאה וכתיבה).
 *              [v1.7.0] אימות גנטיקה (s15_genApprove): בדיקות_גנטיות — כותב I-K
 *              (מערכת, קוד תכונה, פאנל; בעיצוב טקסט) ו-Q ("מאומת"); M (סמל גן)
 *              רק אם שונה בחלון; A-H, L ו-N-P לא נכתבים. מיפוי_קודים — שורה
 *              חדשה ב-BM-BR (קוד ממתין) או הוספת שם ל-Raw_Value (קוד מאומת),
 *              ושורה חדשה ב-CC-CH (גן חדש), בעיצוב טקסט; קורא BS-BW. Script
 *              Properties: S16_CURRENT_PAYLOAD ומחיקת הצעות מ-S15_PENDING_CATALOG.
 *              LockService באישור.
 *              [v1.8.0] s15_approve ו-_s15_labWriteCatalog: שורה חדשה בבלוק BA-BF /
 *              BG-BL נכתבת עם Raw_Value = שם התרופה / שם הבדיקה בשורה בלבד; השדות
 *              tradeNames / rawNames שנשלחים מהחלון לא נקראים יותר.
 * @callers     runS15EnrichIcon (ViewEngine.gs, אייקון "[ S15 העשרה ]")
 *              runS15ValidateIcon (ViewEngine.gs, אייקון "[ S16 אימות ]") →
 *              s15_showValidation; S16_Sidebar.html → s15_loadRowByNumber,
 *              s15_approve
 *              [v1.2.0] runS15EnrichIcon גם מאייקון בגליון הנחיות_רפואיות_ומשימות
 *              (A2, הוצב ידנית)
 *              [v1.3.0] runS15ValidateIcon גם מאייקון בגליון הנחיות_רפואיות_ומשימות
 *              (B2, הוצב ידנית) → s15_showValidation; S16_Sidebar.html →
 *              s15_instrLoadRowByNumber, s15_instrApprove
 *              [v1.4.0] runS15EnrichIcon גם מאייקון בגליון בדיקות_דם (A2, הוצב
 *              ידנית)
 *              [v1.5.0] runS15ValidateIcon גם מאייקון בגליון בדיקות_דם (B2, הוצב
 *              ידנית) → s15_showValidation; S16_Sidebar.html →
 *              s15_labLoadRowByNumber, s15_labApprove
 *              [v1.6.0] runS15EnrichIcon גם מאייקון בגליון בדיקות_גנטיות (A2,
 *              הוצב ידנית)
 *              [v1.7.0] runS15ValidateIcon גם מאייקון בגליון בדיקות_גנטיות (B2,
 *              הוצב ידנית) → s15_showValidation; S16_Sidebar.html →
 *              s15_genLoadRowByNumber, s15_genApprove
 * @functions   runS15Enrich | _s15_getDomain | _s15_readCatalog | _s15_normalizeName |
 *              _s15_findInCatalog | _s15_collectPendingRows | _s15_buildPrompt |
 *              _s15_callGemini | _s15_cleanCode | _s15_cleanNumber |
 *              _s15_savePendingCatalog | _s15_getPendingCatalog |
 *              s15_showValidation | _s15_buildValidationPayload |
 *              _s15_suggestTreatmentType | s15_loadRowByNumber | s15_approve |
 *              _s15_lastCatalogRow | _s15_formatDate | _s15_getHandler |
 *              _s15_instrHandler | _s15_instrBuildPrompt | _s15_instrBuildRow |
 *              _s15_instrShowValidation | _s15_instrReadOptions |
 *              _s15_instrBuildValidationPayload | s15_instrLoadRowByNumber |
 *              _s15_parseDueDate | s15_instrApprove | _s15_labHandler |
 *              _s15_labBuildPrompt | _s15_labBuildRow |
 *              _s15_labCodeText | _s15_labShowValidation |
 *              _s15_labBuildValidationPayload | s15_labLoadRowByNumber |
 *              _s15_labParseNumber | _s15_labReadOptions | _s15_labWriteCatalog |
 *              s15_labApprove |
 *              _s15_genHandler | _s15_genBuildPrompt | _s15_genBuildRow |
 *              _s15_genGeneDomain | _s15_genShowValidation | _s15_genReadOptions |
 *              _s15_genBuildValidationPayload | s15_genLoadRowByNumber |
 *              _s15_genWriteTraitCatalog | _s15_genWriteGene | _s15_genCleanupPending |
 *              s15_genApprove
 * @changes     [v1.8.0] Task #266 + Task #229 — (1) #266: באישור קוד חדש בתרופות
 *              (s15_approve) ובמעבדה (_s15_labWriteCatalog), Raw_Value בשורת הקטלוג
 *              החדשה מתחיל משם השורה המאושרת בלבד, במקום מתוכן השדה בחלון. השדה
 *              נשאר עם שמות ההצעה של הקוד הקודם אחרי החלפת קוד, ונכתב לקטלוג
 *              (BJ20/BJ25, 31/10/2026). גם הצעת Gemini לא נלקחת — היא יכולה לכלול
 *              שמות של שורות אחרות. שורות נוספות עם אותו קוד מוסיפות את שמן במסלול
 *              הקוד המאומת (ללא שינוי). בגנטיקה השמות כבר חושבו בשרת — ללא שינוי.
 *              (2) #229: הוסר מספר השורה מכותרת ארבעת חלונות האימות
 *              (s15_showValidation, _s15_instrShowValidation, _s15_labShowValidation,
 *              _s15_genShowValidation) — הכותרת נקבעת בפתיחה ולא מתעדכנת במעבר.
 *              במקביל: S16_Sidebar.html v2.11.0 (שדות השמות לתצוגה בלבד, סימון
 *              קודי הגנטיקה, ניקוי הודעה), S16_ValidateMedicalStatus.gs v2.5.1.
 *              אומת מול הקוד החי (diff מדויק לכל בלוק, node --check) ובבדיקה
 *              פונקציונלית של חמשת החלונות (ללא אישור — הכתיבה לקטלוג תיבדק באישור
 *              הקוד החדש הראשון).
 * @changes     [v1.7.0] Task #264 שלב 4 — אימות גנטיקה בחלון S16 הקיים (חלופה ב,
 *              תוספת בלבד; מסלולי התרופות, ההנחיות והמעבדה ללא שינוי). ענף
 *              ב-s15_showValidation לגליון בדיקות_גנטיות; בסוף הקובץ: S15_GEN_SHEET,
 *              S15_GEN_COLS (A-Q) ותשע פונקציות. אישור תחת נעילה, עם בדיקת קוד
 *              מהרשימה (חובה), פאנל PNL-G (חובה), מערכת SYSnn וסמל גן. אומת מול
 *              הקוד החי (diff מדויק, node --check), בהרצה מדומה ובבדיקת שטח:
 *              שורות 5-6 אושרו (GTR-001, GTR-002 נכתבו ל-BM-BR בשורות 5-6, Q="מאומת"),
 *              פאנל ריק נחסם, קוד מאומת ננעל עם התראת שם אחר, מעבר אוטומטי
 *              לשורה הבאה; נסיגה — חלונות המעבדה, ההנחיות והמצב הרפואי ללא שינוי.
 * @changes     [v1.6.0] Task #264 שלב 3 — הרחבת המנוע לתחום הגנטיקה (תוספת
 *              בלבד; מסלולי התרופות, ההנחיות והמעבדה ללא שינוי). רשומה חדשה
 *              ב-S15_DOMAINS (בדיקות_גנטיות, handler "genetics"), שורה ב-
 *              _s15_getHandler, ובסוף הקובץ: שבעה קבועים (S15_GEN_*) ושלוש
 *              פונקציות. אומת מול הקוד החי (diff מדויק, node --check), בהרצה
 *              מדומה ובבדיקת שטח: 46 שורות הועשרו (שורות 5-50, I-K ו-Q בלבד),
 *              46 קודי תכונה GTR-001 עד GTR-046 (אין תכונה חוזרת בין שני הדוחות),
 *              כל הפאנלים מ-PNL-G (13 הפאנלים החסרים שויכו), עמודות A-H ו-L-P
 *              ללא שינוי, בלוקי התכונות והגנים במיפוי_קודים ריקים כמקודם;
 *              נסיגה בתרופות ובמעבדה — "אין שורות ממתינות".
 * @changes     [v1.5.0] Task #263 שלב 5 — אימות מעבדה בחלון S16 הקיים (תוספת
 *              בלבד; מסלולי התרופות וההנחיות ללא שינוי). ענף ב-s15_showValidation
 *              לגליון בדיקות_דם; בסוף הקובץ: S15_LAB_SHEET, S15_LAB_COLS (A-S)
 *              ושבע פונקציות. אישור תחת נעילה, עם בדיקת תבנית LOINC, קוד מערכת
 *              SYSnn, פאנל מהרשימה (חובה), מספרים או ריק וגבול תחתון ≤ עליון.
 *              קוד קיים בקטלוג — נתוני הקטלוג גוברים ושם הבדיקה נוסף ל-Raw_Value
 *              (עם אזהרה בהודעה); קוד חדש — שורה חדשה ב-BG-BL וההצעה הממתינה
 *              נמחקת; קוד ריק מותר. התראת קוד כפול — בחלון בלבד (S16_Sidebar).
 *              תיקון בבדיקה: גוגל שיטס פירש קוד LOINC כמו 3016-3 כתאריך (הבאג
 *              היה גם בהעשרה, שלב 4) — setNumberFormat("@") לפני כתיבה
 *              ב-s15_labApprove (K-M), ב-_s15_labWriteCatalog (שורה חדשה BG-BL)
 *              וב-_s15_labHandler (K-M); _s15_labCodeText (חדשה) משחזרת קוד מתא
 *              שכבר נשמר כתאריך, בשימוש ב-_s15_labBuildValidationPayload.
 *              אומת מול הקוד החי (diff מדויק, node --check) ובבדיקת שטח: ניווט
 *              שורות 5↔6; ערך לא מספרי וגבולות הפוכים נדחו; פאנל ריק נחסם (שורה
 *              7 ללא שינוי); שורה 6 (HB, 718-7) ושורה 5 (TSH, תוקן ל-3016-3)
 *              אושרו ונכתבו לקטלוג, L5 נשמר כטקסט; נסיגה — חלונות התרופות
 *              וההנחיות ללא שינוי (שורות 5-6, תאריך היעד מוצג).
 * @changes     [v1.4.0] Task #263 שלב 4 — הרחבת המנוע לתחום המעבדה (תוספת
 *              בלבד). רשומה חדשה ב-S15_DOMAINS (בדיקות_דם, handler "lab");
 *              ב-runS15Enrich — buildRow יכול להחזיר {values, isNew}, ו-handler
 *              עם writeRow כותב בעצמו (K-M ו-S, לא רצף); _s15_getHandler מחזיר
 *              את מטפל המעבדה. בסוף הקובץ: S15_LAB_PANEL_FIRST_COL /
 *              S15_LAB_PANEL_WIDTH / S15_LAB_DEFAULT_PANEL ושלוש פונקציות.
 *              אומת מול הקוד החי (diff מדויק, node --check), בהרצה מדומה
 *              ובבדיקת שטח: 23 שורות הועשרו (שורות 5-27, K-M ו-S בלבד, N-R
 *              ללא שינוי), 23 הצעות LOINC חדשות, קטלוג מיפוי_קודים ללא
 *              שינוי; נסיגה בתרופות ובהנחיות — "אין שורות ממתינות".
 * @changes     [v1.3.0] Task #261 שלב 4 — אימות הנחיות בחלון S16 הקיים (חלופה א,
 *              תוספת בלבד). ענף בתחילת s15_showValidation לגליון ההנחיות; בסוף
 *              הקובץ: S15_INSTR_SHEET, S15_INSTR_STATUSES, S15_INSTR_COLS ושש
 *              פונקציות. אישור תחת נעילה, עם בדיקת סוג מהרשימה הסגורה, אופי, קוד
 *              יעד קיים בקטלוג, מערכת, סטטוס ותאריך. תיקון בבדיקה: תאריך היעד
 *              זז יום אחורה (חצות לפי אזור הזמן של הסקריפט) — נוצר כעת ב-
 *              Utilities.parseDate לפי אזור הזמן של הגליון. אומת מול הקוד החי
 *              (diff מדויק, node --check), בהרצה מדומה ובבדיקת שטח: שורה 6 —
 *              SPEC17, E6 נשמר 02/09/2026; שורה 8 — SPEC05, F8="בוצע"; 31/02
 *              נדחה; חלונות התרופות והמצב הרפואי ללא שינוי.
 * @changes     [v1.2.0] Task #261 שלב 3 — הכללת המנוע לתחום ההנחיות (חלופה ב,
 *              תוספת בלבד). רשומה חדשה ב-S15_DOMAINS עם handler; ב-runS15Enrich
 *              שתי נקודות הסתעפות (פרומפט וכתיבת שורה); בסוף הקובץ: קבועים
 *              S15_INSTR_KINDS / S15_INSTR_DEFAULT_CODE / S15_SPECIALTY_FIRST_COL /
 *              S15_SPECIALTY_WIDTH וארבע פונקציות. כללים: סוג מחוץ לרשימה → INS00,
 *              אופי לא תקין → ברירת המחדל מתיאור הקוד, קוד יעד שאינו בקטלוג → ריק.
 *              אומת מול הקוד החי (diff מדויק, node --check), בהרצה מדומה ובבדיקת
 *              שטח: 6 שורות הועשרו (J-M בשורות 5-10 בלבד, כל הקודים מהרשימה
 *              הסגורה), שאר הגליונות ללא שינוי; נסיגה בתרופות — "אין שורות
 *              ממתינות", אף תא לא השתנה.
 * @changes     [v1.1.0] Task #256 שלב 4 — אימות תרופות בחלון S16 הקיים (בלי
 *              חלון חדש). קבועים: S15_VALIDATION_SHEET, S15_TREATMENT_TYPES,
 *              S15_MED_COLS (19 עמודות, A-S). הצעת סוג טיפול בכללים קבועים
 *              (בלי Gemini): "לפי הצורך"/PRN → לפי הצורך, יש תאריך סיום →
 *              זמני, אחרת → כרוני. אישור תחת נעילה, עם בדיקת קוד ATC, קוד
 *              מערכת, סוג טיפול ומספרים. _s15_lastCatalogRow מחשב את השורה
 *              האחרונה בבלוק הקטלוג בלבד. אומת מול הקוד החי (diff מדויק,
 *              node --check), בהרצה מדומה, ובבדיקת שטח: שורה 5 (ELOCOM) —
 *              D07AC13 נכתב לקטלוג בשורה 5, R="מאומת", S="לפי הצורך",
 *              L=SYS03; מסך המצב הרפואי (יומן_מצב_רפואי, שורה 7) ללא שינוי.
 * @changes     [v1.0.0] Task #256 שלב 2 — יצירת השירות: מנוע העשרה כללי,
 *              הגדרת תחום התרופות, חיפוש בקטלוג, קריאת Gemini לאצווה,
 *              כתיבת הצעות ל-M-R ושמירת הצעות קטלוג ב-Script Properties.
 *              תיקון במהלך הבדיקה: בפרומפט נקבע שכמות ויחידה נלקחות משדה
 *              המינון בלבד — ריכוז בשם התרופה (0.1% במשחה) אינו מנה. אומת מול
 *              הקוד החי (diff מדויק, node --check) ובבדיקה פונקציונלית בגליון:
 *              12 שורות הועשרו, 9 מ-11 קודי ATC נכונים, פלמינל ללא קוד (לא
 *              תרופה), A-L ומיפוי_קודים ללא שינוי.
 */

// ══════════════════════════════════════════════════════════════════
// הגדרות Gemini — קבוע נפרד, ערכים זהים ל-S13 (החלטת עמוס 26/10/2026)
// ══════════════════════════════════════════════════════════════════

const S15_GEMINI_MODEL       = "gemini-2.5-flash";
const S15_GEMINI_TEMPERATURE = 0.1;
const S15_GEMINI_MAX_TOKENS  = 32768;

const S15_PROP_PENDING_CATALOG = "S15_PENDING_CATALOG";
const S15_STATUS_SUGGESTED     = "הוצע";
const S15_STATUS_VERIFIED      = "מאומת";

// ══════════════════════════════════════════════════════════════════
// הגדרות לפי תחום — מפתח = שם גליון היעד. הוספת תחום (בדיקות דם,
// בדיקות גנטיות, הנחיות) = הוספת רשומה כאן, בלי שינוי במנוע.
// מספרי עמודות: 1 = A.
// ══════════════════════════════════════════════════════════════════

const S15_DOMAINS = {
  "תרופות_קבועות": {
    label:            "תרופות",
    nameCol:          1,   // A = Drug_Name
    contextCols:      { activeIngredient: 2, dosage: 3, frequency: 4, reason: 5 }, // B-E
    firstTargetCol:   13,  // M = ATC_Code
    statusCol:        18,  // R = Enrich_Status
    catalogFirstCol:  53,  // BA = ATC_Code בבלוק Medications במיפוי_קודים
    catalogWidth:     6,   // BA-BF: Code | Normalized_Value | Description | Raw_Value | Icon_Link | Medical_System
    codePattern:      /^[A-Z]\d{2}[A-Z]{2}\d{2}$/ // קוד ATC ברמת חומר פעיל (למשל A10BA02)
  },
  // [Task #261 שלב 3] תחום ההנחיות — מטפל ייעודי (handler), רשימה סגורה:
  // לא מוצעים קודים חדשים לקטלוג. כותב J-M בלבד.
  "הנחיות_רפואיות_ומשימות": {
    label:            "הנחיות",
    nameCol:          3,   // C = Task_Description
    contextCols:      { issuer: 2, taskType: 4, dueDate: 5, medicalSystem: 9 }, // B, D, E, I
    firstTargetCol:   10,  // J = Instruction_Code
    statusCol:        13,  // M = Enrich_Status
    catalogFirstCol:  76,  // BX = Instruction_Code בבלוק סוגי_הנחיות במיפוי_קודים
    catalogWidth:     5,   // BX-CB: Code | Normalized_Value | Description | Raw_Value | Icon_Link
    codePattern:      /^INS\d{2}$/,
    handler:          "instructions"
   },
  // [Task #263 שלב 4] תחום מעבדה ומדדים — מטפל ייעודי, קטלוג פתוח (כמו
  // התרופות): מאפיין חדש מקבל הצעת LOINC שנשמרת עד האימות. כותב K-M ו-S
  // בלבד (N-R נכתבו ע"י S13 ולא נוגעים בהם).
  "בדיקות_דם": {
    label:            "מעבדה ומדדים",
    nameCol:          2,   // B = Test_Name
    contextCols:      { category: 3, value: 4, specimen: 14, unit: 16 }, // C, D, N, P
    firstTargetCol:   11,  // K = Medical_System (K-M: Medical_System | LOINC_Code | Panel_Code)
    statusCol:        19,  // S = Enrich_Status
    catalogFirstCol:  59,  // BG = LOINC_Code בבלוק מאפייני_מעבדה במיפוי_קודים
    catalogWidth:     6,   // BG-BL: Code | Normalized_Value | Description | Raw_Value | Icon_Link | Medical_System
    codePattern:      /^\d{1,7}-\d$/, // קוד LOINC (למשל 718-7)
    handler:          "lab"
  },
  // [Task #264 שלב 3] תחום הגנטיקה — מטפל ייעודי, קטלוג תכונות פתוח (קוד
  // פנימי GTR-nnn, אין קידוד בינלאומי לתכונות); פאנל מרשימה סגורה (PNL-G);
  // גן תקין שאינו בקטלוג נשמר כהצעה בלבד. כותב I-K ו-Q בלבד (שאר העמודות
  // נכתבו ע"י S13 ולא נוגעים בהן).
  "בדיקות_גנטיות": {
    label:            "גנטיקה",
    nameCol:          4,   // D = Finding (שם התכונה)
    contextCols:      { panelName: 2, geneVariant: 3, significance: 5, geneSymbol: 13 }, // B, C, E, M
    firstTargetCol:   9,   // I = Medical_System (I-K: Medical_System | Trait_Code | Panel_Code)
    statusCol:        17,  // Q = Enrich_Status
    catalogFirstCol:  65,  // BM = Trait_Code בבלוק תכונות_גנטיות במיפוי_קודים
    catalogWidth:     6,   // BM-BR: Code | Normalized_Value | Description | Raw_Value | Icon_Link | Medical_System
    codePattern:      /^GTR-\d{3}$/, // קוד תכונה פנימי (למשל GTR-001)
    handler:          "genetics"
  }
};

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — מופעלת מהאייקון בגליון היעד (הגליון הפעיל קובע את התחום)
// ══════════════════════════════════════════════════════════════════

function runS15Enrich() {
  const ui   = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(3000)) {
    ui.alert("⏳ S15 כבר רץ כרגע (הרצה מקבילה). נסה שוב בעוד רגע.");
    return;
  }

  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getActiveSheet();
    const domain = _s15_getDomain(sheet.getName());

    if (!domain) {
      ui.alert("⛔ תחום זה טרם הוגדר", "לגליון '" + sheet.getName() + "' אין עדיין הגדרת העשרה ב-S15.", ui.ButtonSet.OK);
      return;
    }

    const pending = _s15_collectPendingRows(sheet, domain);
    if (pending.length === 0) {
      ui.alert("✅ אין שורות ממתינות להעשרה בגליון '" + sheet.getName() + "'.");
      return;
    }

    const catalog = _s15_readCatalog(ss, domain);

    // [Task #261] נקודת הסתעפות 1 — תחום עם מטפל ייעודי בונה פרומפט משלו.
    // תחום בלי מטפל (התרופות) — הנתיב הקיים כפי שהוא.
    const handler = _s15_getHandler(domain);
    let prompt;
    if (handler) {
      prompt = handler.buildPrompt(ss, domain, pending, catalog);
    } else {
      pending.forEach(function(item) {
        item.catalogMatch = _s15_findInCatalog(catalog, item.name);
      });
      prompt = _s15_buildPrompt(domain, pending);
    }

    const response = _s15_callGemini(prompt);
    const results  = response && response.results;

    if (!results || results.length === 0) {
      ui.alert("❌ ההעשרה נכשלה — לא התקבלה תשובה תקינה מ-Gemini. בדוק Logger לפירוט.");
      return;
    }

    let written       = 0;
    let fromCatalog   = 0;
    let newSuggested  = 0;
    let failed        = 0;
    const suggestions = {};

    results.forEach(function(result) {
      const item = pending[result.rowIndex];
      if (!item) {
        Logger.log("[S15] rowIndex " + result.rowIndex + " בתשובת Gemini לא תואם לשום שורה ממתינה");
        failed++;
        return;
      }

            // [Task #261] נקודת הסתעפות 2 — המטפל מחזיר את ערכי השורה (רשימה סגורה,
      // בלי הצעות קטלוג). null = התשובה לשורה לא תקינה, השורה נשארת ממתינה.
      // [Task #263] המטפל מקבל גם את רשימת ההצעות (קטלוג פתוח), יכול להחזיר
      // {values, isNew} במקום מערך, ויכול לכתוב את השורה בעצמו (writeRow) —
      // למשל כתיבה לשני טווחים לא רציפים. מטפל ההנחיות — ללא שינוי בהתנהגות.
      if (handler) {
        const handlerOut    = handler.buildRow(item, result, suggestions);
        const handlerValues = Array.isArray(handlerOut) ? handlerOut : (handlerOut && handlerOut.values);
        if (!handlerValues) {
          failed++;
          return;
        }
        if (handler.writeRow) {
          handler.writeRow(sheet, item, handlerValues);
        } else {
          sheet.getRange(item.row, domain.firstTargetCol, 1, handlerValues.length).setValues([handlerValues]);
        }
        if (handlerOut.isNew) newSuggested++;
        else if (handlerValues[0]) fromCatalog++;
        written++;
        return;
      }
      let code = _s15_cleanCode(result.atcCode, domain.codePattern);
      if (item.catalogMatch) {
        code = item.catalogMatch.code; // הקטלוג המאומת גובר על הצעת Gemini
        fromCatalog++;
      } else if (code) {
        const prev = suggestions[code];
        suggestions[code] = {
          name:   String(result.activeIngredient || (prev && prev.name) || "").trim(),
          desc:   String(result.therapeuticGroup || (prev && prev.desc) || "").trim(),
          raw:    prev ? prev.raw.concat([item.name]) : [item.name],
          system: _s15_cleanCode(result.medicalSystem, /^SYS\d{2}$/) || (prev && prev.system) || ""
        };
        newSuggested++;
      } else {
        Logger.log("[S15] שורה " + item.row + " (" + item.name + ") — Gemini לא החזיר קוד תקין: " + result.atcCode);
      }

      const rowValues = [
        code,
        String(result.doseAmount || "").trim(),
        String(result.doseUnit || "").trim(),
        _s15_cleanNumber(result.timesPerDay),
        _s15_cleanNumber(result.daysPerWeek),
        S15_STATUS_SUGGESTED
      ];
      sheet.getRange(item.row, domain.firstTargetCol, 1, rowValues.length).setValues([rowValues]);
      written++;
    });

    _s15_savePendingCatalog(domain, suggestions);

    Logger.log("[S15] " + sheet.getName() + " — נכתבו: " + written + " | מהקטלוג: " + fromCatalog +
      " | הצעות חדשות: " + newSuggested + " | נכשלו: " + failed);

    ui.alert(
      "✅ העשרה הושלמה — " + domain.label + "\n\n" +
      "שורות שעודכנו: " + written + " (סטטוס \"" + S15_STATUS_SUGGESTED + "\")\n" +
      "זוהו בקטלוג המאומת: " + fromCatalog + "\n" +
      "הצעות לקוד חדש (ממתינות לאימות): " + newSuggested + "\n" +
      (failed ? "נכשלו: " + failed + "\n" : "") +
      (pending.length > written ? "לא טופלו (נשארו ממתינות): " + (pending.length - written) + "\n" : "") +
      "\nהקטלוג במיפוי_קודים לא שונה — הוא מתעדכן רק באישור בחלון האימות."
    );

  } catch (e) {
    Logger.log("[S15] שגיאה ב-runS15Enrich: " + e.toString());
    ui.alert("שגיאה: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════
// עזר — הגדרת התחום לפי שם הגליון (null = תחום לא מוגדר)
// ══════════════════════════════════════════════════════════════════

function _s15_getDomain(sheetName) {
  const cfg = S15_DOMAINS[sheetName];
  if (!cfg) return null;
  const copy = {};
  Object.keys(cfg).forEach(function(k) { copy[k] = cfg[k]; });
  copy.sheetName = sheetName;
  return copy;
}

// ══════════════════════════════════════════════════════════════════
// קריאת בלוק הקטלוג של התחום במיפוי_קודים (קריאה בלבד).
// מחזיר [{code, name, desc, raw:[...], system, row}] — רק שורות עם קוד.
// ══════════════════════════════════════════════════════════════════

function _s15_readCatalog(ss, domain) {
  const catalog = [];
  const sheet   = ss.getSheetByName(CODE_MAP_SHEET_NAME);
  if (!sheet) return catalog;
  if (sheet.getMaxColumns() < domain.catalogFirstCol + domain.catalogWidth - 1) return catalog;

  const firstDataRow = (SHEET_CONFIG[CODE_MAP_SHEET_NAME] && SHEET_CONFIG[CODE_MAP_SHEET_NAME].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (lastRow < firstDataRow) return catalog;

  const data = sheet.getRange(firstDataRow, domain.catalogFirstCol, lastRow - firstDataRow + 1, domain.catalogWidth).getValues();
  data.forEach(function(r, i) {
    const code = String(r[0] || "").trim();
    if (!code) return;
    catalog.push({
      code:   code,
      name:   String(r[1] || "").trim(),
      desc:   String(r[2] || "").trim(),
      raw:    String(r[3] || "").split(",").map(function(s) { return s.trim(); }).filter(function(s) { return s; }),
      system: String(r[5] || "").trim(),
      row:    firstDataRow + i
    });
  });
  return catalog;
}

// ══════════════════════════════════════════════════════════════════
// נרמול שם להשוואה — אותיות גדולות, ללא רווחים/נקודות/סימנים
// ══════════════════════════════════════════════════════════════════

function _s15_normalizeName(text) {
  return String(text || "").toUpperCase().replace(/[^A-Z0-9\u0590-\u05FF]/g, "");
}

// ══════════════════════════════════════════════════════════════════
// חיפוש שם בקטלוג — התאמה מלאה לשם המנורמל או לאחד השמות ב-Raw_Value
// ══════════════════════════════════════════════════════════════════

function _s15_findInCatalog(catalog, name) {
  const key = _s15_normalizeName(name);
  if (!key) return null;
  for (let i = 0; i < catalog.length; i++) {
    const entry = catalog[i];
    if (_s15_normalizeName(entry.name) === key) return entry;
    for (let j = 0; j < entry.raw.length; j++) {
      if (_s15_normalizeName(entry.raw[j]) === key) return entry;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// איסוף שורות ממתינות — שם לא ריק ועמודת הסטטוס ריקה
// ══════════════════════════════════════════════════════════════════

function _s15_collectPendingRows(sheet, domain) {
  const firstDataRow = (SHEET_CONFIG[domain.sheetName] && SHEET_CONFIG[domain.sheetName].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (lastRow < firstDataRow) return [];
  if (sheet.getMaxColumns() < domain.statusCol) {
    throw new Error("בגליון '" + domain.sheetName + "' חסרות עמודות ההעשרה (עד עמודה " + domain.statusCol + ").");
  }

  const data    = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, domain.statusCol).getValues();
  const pending = [];
  data.forEach(function(r, i) {
    const name   = String(r[domain.nameCol - 1] || "").trim();
    const status = String(r[domain.statusCol - 1] || "").trim();
    if (!name || status) return;
    const ctx = {};
    Object.keys(domain.contextCols).forEach(function(k) {
      ctx[k] = String(r[domain.contextCols[k] - 1] || "").trim();
    });
    pending.push({ row: firstDataRow + i, name: name, ctx: ctx });
  });
  return pending;
}

// ══════════════════════════════════════════════════════════════════
// בניית הפרומפט — כל השורות הממתינות בקריאה אחת
// ══════════════════════════════════════════════════════════════════

function _s15_buildPrompt(domain, pending) {
  let systemsList = "";
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    systemsList = Object.keys(S13_BODY_SYSTEMS).map(function(code) {
      return code + "=" + S13_BODY_SYSTEMS[code].nameHe;
    }).join(", ");
  } else {
    systemsList = "SYS00-SYS14";
  }

  let rowsBlock = "";
  pending.forEach(function(item, idx) {
    rowsBlock += "\n--- שורה " + (idx + 1) + " (rowIndex=" + idx + ") ---\n";
    rowsBlock += "שם התרופה: " + item.name + "\n";
    rowsBlock += "חומר פעיל (אם צוין במסמך): " + (item.ctx.activeIngredient || "—") + "\n";
    rowsBlock += "מינון (טקסט חופשי): " + (item.ctx.dosage || "—") + "\n";
    rowsBlock += "תדירות (טקסט חופשי): " + (item.ctx.frequency || "—") + "\n";
    rowsBlock += "סיבת טיפול (אם צוינה): " + (item.ctx.reason || "—") + "\n";
    if (item.catalogMatch) {
      rowsBlock += "קוד ATC ידוע מהקטלוג המאומת: " + item.catalogMatch.code + " (אין לשנות)\n";
    }
  });

  return "אתה רוקח קליני ומומחה לסיווג תרופות. קיבלת " + pending.length + " שורות תרופה " +
    "שחולצו ממסמכים רפואיים בישראל (שמות מסחריים, לעתים עם קידומות כמו T./S/C/I.V). לכל שורה:\n" +
    "1. atcCode — קוד ATC של ארגון הבריאות העולמי ברמת החומר הפעיל (7 תווים, למשל A10BA02). " +
    "לתרופה משולבת — קוד השילוב (למשל C09DB01). אם אינך בטוח בזיהוי התרופה — החזר מחרוזת ריקה, אל תנחש.\n" +
    "2. activeIngredient — שם החומר הפעיל באנגלית (בשילוב: שני החומרים מופרדים ב-\" + \").\n" +
    "3. therapeuticGroup — הקבוצה הטיפולית בעברית (למשל: תרופה לסוכרת, תרופה ליתר לחץ דם).\n" +
    "4. medicalSystem — קוד מערכת הגוף שהתרופה מטפלת בה, לפי ייעוד הטיפול (לא לפי צורת המתן), " +
    "מתוך הרשימה בלבד: " + systemsList + ". אם הייעוד אינו ברור — SYS00.\n" +
    "5. doseAmount — כמות המנה כמספר, כפי שמופיעה בשדה \"מינון\" בלבד (בשילוב: למשל 5/160). " +
    "ריכוז או חוזק שמופיעים בשם התרופה (למשל 0.1% במשחה) אינם מנה — אל תיקח אותם. ריק אם שדה המינון ריק.\n" +
    "6. doseUnit — יחידת המנה מתוך שדה \"מינון\" בלבד (MG / MCG / IU / ML / UNIT / APPLICATION וכו'). " +
    "ריק אם לא צוינה.\n" +
    "7. timesPerDay — מספר הפעמים ביום כמספר. בכתיב הישראלי \"X1\" או \"1X1 ביום\" = פעם ביום, " +
    "\"X2\" = פעמיים ביום, \"1X3 בשבוע\" = פעם ביום. ריק אם לא צוין.\n" +
    "8. daysPerWeek — מספר ימים בשבוע כמספר, רק אם צוין במפורש (למשל \"1X3 בשבוע\" = 3). " +
    "ריק אם התרופה יומית או אם לא צוין.\n" +
    "כלל ברזל: אל תמציא מינון או תדירות שלא כתובים בשורה — שדה חסר נשאר ריק.\n" +
    rowsBlock +
    "\nהחזר JSON בלבד, ללא טקסט נוסף, בפורמט: " +
    '{"results":[{"rowIndex":0,"atcCode":"","activeIngredient":"","therapeuticGroup":"","medicalSystem":"",' +
    '"doseAmount":"","doseUnit":"","timesPerDay":"","daysPerWeek":""},...]}' +
    " — מערך אחד עם " + pending.length + " איברים, לפי סדר השורות לעיל.";
}

// ══════════════════════════════════════════════════════════════════
// קריאת Gemini — טיפול שגיאות זהה ל-_s13_callGemini (HTTP/finishReason/JSON)
// ══════════════════════════════════════════════════════════════════

function _s15_callGemini(prompt) {
  let raw = null;
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S15_GEMINI_MODEL + ":generateContent?key=" + apiKey;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     S15_GEMINI_TEMPERATURE,
        maxOutputTokens: S15_GEMINI_MAX_TOKENS,
        thinkingConfig:  { thinkingBudget: 0 }
      }
    };

    const response = UrlFetchApp.fetch(url, {
      method:             "post",
      contentType:        "application/json",
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const bodyText     = response.getContentText();

    if (responseCode !== 200) {
      Logger.log("[S15] שגיאת HTTP מ-Gemini — קוד: " + responseCode +
        " | גוף תשובה (1000 תווים ראשונים): " + bodyText.substring(0, 1000));
      return null;
    }

    const json      = JSON.parse(bodyText);
    const candidate = json.candidates && json.candidates[0];

    if (!candidate) {
      Logger.log("[S15] Gemini לא החזיר candidates — promptFeedback: " + JSON.stringify(json.promptFeedback || {}));
      return null;
    }
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      Logger.log("[S15] Gemini הסתיים עם finishReason לא תקין: " + candidate.finishReason);
      return null;
    }

    const textPart = candidate.content && candidate.content.parts &&
                     candidate.content.parts[0] && candidate.content.parts[0].text;
    if (!textPart) {
      Logger.log("[S15] Gemini החזיר candidate בלי טקסט");
      return null;
    }

    raw = textPart.trim().replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      const firstBrace = raw.indexOf("{");
      const lastBrace  = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
      }
      throw parseErr;
    }

  } catch (e) {
    Logger.log("[S15] שגיאת Gemini: " + e.message +
      (raw ? " | raw (1000 תווים ראשונים): " + raw.substring(0, 1000) : ""));
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// עזר — ניקוי קוד: אותיות גדולות, ללא רווחים; לא תואם לתבנית → ריק
// ══════════════════════════════════════════════════════════════════

function _s15_cleanCode(value, pattern) {
  const code = String(value || "").toUpperCase().replace(/\s/g, "");
  return pattern.test(code) ? code : "";
}

// ══════════════════════════════════════════════════════════════════
// עזר — ניקוי מספר: מספר חיובי בלבד, אחרת ריק (לא ממציאים ערך)
// ══════════════════════════════════════════════════════════════════

function _s15_cleanNumber(value) {
  const text = String(value === null || value === undefined ? "" : value).trim();
  if (!text) return "";
  const num = Number(text);
  return (isFinite(num) && num > 0) ? num : "";
}

// ══════════════════════════════════════════════════════════════════
// שמירת הצעות קטלוג ב-Script Properties — מיזוג עם הצעות קודמות.
// מבנה: { "<שם גליון>": { "<קוד>": {name, desc, raw:[...], system} } }
// ══════════════════════════════════════════════════════════════════

function _s15_savePendingCatalog(domain, suggestions) {
  const codes = Object.keys(suggestions);
  if (codes.length === 0) return;

  const all     = _s15_getPendingCatalog();
  const current = all[domain.sheetName] || {};

  codes.forEach(function(code) {
    const incoming = suggestions[code];
    const existing = current[code];
    if (existing) {
      incoming.raw.forEach(function(name) {
        if (existing.raw.indexOf(name) === -1) existing.raw.push(name);
      });
    } else {
      current[code] = incoming;
    }
  });

  all[domain.sheetName] = current;
  PropertiesService.getScriptProperties().setProperty(S15_PROP_PENDING_CATALOG, JSON.stringify(all));
}

// ══════════════════════════════════════════════════════════════════
// קריאת הצעות הקטלוג השמורות (משמש גם את שלב האימות בהמשך)
// ══════════════════════════════════════════════════════════════════

function _s15_getPendingCatalog() {
  const text = PropertiesService.getScriptProperties().getProperty(S15_PROP_PENDING_CATALOG);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    Logger.log("[S15] S15_PENDING_CATALOG פגום — מתחיל מחדש: " + e.message);
    return {};
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #256 שלב 4] אימות תרופות — חלון S16 במצב "medication".
// S15 שומר את נתוני השורה תחת אותו מפתח של S16 (S16_PROP_KEY) ופותח
// את S16_Sidebar.html; הפונקציה s16_loadRowData מחזירה אותם כמו שהם,
// והחלון מזהה payload.mode="medication" ומציג את מסך התרופות. הניווט
// והאישור במצב הזה קוראים ל-s15_loadRowByNumber / s15_approve.
// S16_ValidateMedicalStatus.gs לא משתנה.
// ══════════════════════════════════════════════════════════════════

const S15_VALIDATION_SHEET = "תרופות_קבועות";
const S15_TREATMENT_TYPES  = ["כרוני", "זמני", "לפי הצורך"];

// מספרי עמודות בגליון תרופות_קבועות (1 = A)
const S15_MED_COLS = {
  name: 1, active: 2, dosage: 3, frequency: 4, reason: 5, start: 6, end: 7,
  status: 8, issuer: 9, sourceUrl: 10, fileId: 11, system: 12,
  code: 13, doseAmount: 14, doseUnit: 15, timesPerDay: 16, daysPerWeek: 17,
  enrich: 18, treatmentType: 19
};

// ══════════════════════════════════════════════════════════════════
// פתיחת חלון האימות — מופעל מהאייקון (runS15ValidateIcon, ViewEngine.gs)
// ══════════════════════════════════════════════════════════════════

function s15_showValidation() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui    = SpreadsheetApp.getUi();

  // [Task #261 שלב 4] גליון ההנחיות — חלון האימות במצב "instruction".
  // [Task #263 שלב 5] גליון בדיקות_דם — חלון האימות במצב "lab".
  // [Task #264 שלב 4] גליון בדיקות_גנטיות — חלון האימות במצב "gen".
  // כל גליון אחר — המסלול הקיים של התרופות, ללא שינוי.
  if (sheet.getName() === S15_INSTR_SHEET) {
    _s15_instrShowValidation(ss, sheet, ui);
    return;
  }
  if (sheet.getName() === S15_LAB_SHEET) {
    _s15_labShowValidation(ss, sheet, ui);
    return;
  }
  if (sheet.getName() === S15_GEN_SHEET) {
    _s15_genShowValidation(ss, sheet, ui);
    return;
  }

  if (sheet.getName() !== S15_VALIDATION_SHEET) {
    ui.alert("⛔ גליון לא נתמך", "יש להפעיל את האייקון מתוך גליון '" + S15_VALIDATION_SHEET + "'.", ui.ButtonSet.OK);
    return;
  }
  if (typeof S16_PROP_KEY === "undefined") {
    ui.alert("❌ שירות S16 לא נמצא (S16_ValidateMedicalStatus.gs) — חלון האימות אינו זמין.");
    return;
  }

  const row          = sheet.getActiveCell().getRow();
  const firstDataRow = (SHEET_CONFIG[S15_VALIDATION_SHEET] && SHEET_CONFIG[S15_VALIDATION_SHEET].FIRST_DATA_ROW) || 5;
  if (row < firstDataRow) {
    ui.alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const payload = _s15_buildValidationPayload(ss, sheet, row);
  if (!payload) {
    ui.alert("❌ לא ניתן לטעון נתוני שורה " + row);
    return;
  }

  PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));

  const html = HtmlService
    .createTemplateFromFile("S16_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S15 — אימות תרופות");

  ui.showModalDialog(html, "💊 S15 — " + S15_VALIDATION_SHEET);
}

// ══════════════════════════════════════════════════════════════════
// בניית נתוני שורה לחלון — מהשורה, מהקטלוג המאומת ומההצעות השמורות
// ══════════════════════════════════════════════════════════════════

function _s15_buildValidationPayload(ss, sheet, row) {
  const C            = S15_MED_COLS;
  const firstDataRow = (SHEET_CONFIG[S15_VALIDATION_SHEET] && SHEET_CONFIG[S15_VALIDATION_SHEET].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (row < firstDataRow || row > lastRow) return null;

  const width = Math.min(C.treatmentType, sheet.getMaxColumns());
  const vals  = sheet.getRange(row, 1, 1, width).getValues()[0];
  function get(col) { return col <= width ? vals[col - 1] : ""; }
  function str(v)   { return String(v === null || v === undefined ? "" : v).trim(); }

  const drugName = str(get(C.name));
  if (!drugName) return null;

  const domain  = _s15_getDomain(S15_VALIDATION_SHEET);
  const catalog = _s15_readCatalog(ss, domain);
  const code    = str(get(C.code)).toUpperCase();

  let verified = code ? catalog.filter(function(e) { return e.code === code; })[0] : null;
  if (!verified && !code) verified = _s15_findInCatalog(catalog, drugName);

  const pending = _s15_getPendingCatalog()[S15_VALIDATION_SHEET] || {};
  const sugg    = (!verified && code) ? pending[code] : null;

  let catalogSource = "none";
  let catalogInfo   = { name: str(get(C.active)), desc: "", raw: drugName, system: "" };
  if (verified) {
    catalogSource = "verified";
    catalogInfo   = { name: verified.name, desc: verified.desc, raw: verified.raw.join(", "), system: verified.system };
  } else if (sugg) {
    catalogSource = "suggested";
    catalogInfo   = { name: sugg.name || "", desc: sugg.desc || "", raw: (sugg.raw || []).join(", "), system: sugg.system || "" };
  }

  const endDate   = _s15_formatDate(get(C.end));
  const frequency = str(get(C.frequency));
  const dosage    = str(get(C.dosage));

  const bodySystemOptions = [];
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(k) {
      bodySystemOptions.push({ code: k, nameHe: S13_BODY_SYSTEMS[k].nameHe });
    });
  }

  return {
    mode:                    "medication",
    sheetName:               S15_VALIDATION_SHEET,
    row:                     row,
    firstDataRow:            firstDataRow,
    lastRow:                 lastRow,
    enrichStatus:            str(get(C.enrich)),
    drugName:                drugName,
    dosageText:              dosage,
    frequencyText:           frequency,
    startDate:               _s15_formatDate(get(C.start)),
    endDate:                 endDate,
    docIssuer:               str(get(C.issuer)),
    sourceUrl:               str(get(C.sourceUrl)),
    code:                    verified ? verified.code : code,
    catalogSource:           catalogSource,
    catalog:                 catalogInfo,
    doseAmount:              str(get(C.doseAmount)),
    doseUnit:                str(get(C.doseUnit)),
    timesPerDay:             str(get(C.timesPerDay)),
    daysPerWeek:             str(get(C.daysPerWeek)),
    reason:                  str(get(C.reason)),
    treatmentType:           str(get(C.treatmentType)),
    treatmentTypeSuggestion: _s15_suggestTreatmentType(endDate, frequency, dosage),
    treatmentTypes:          S15_TREATMENT_TYPES,
    bodySystemOptions:       bodySystemOptions
  };
}

// ══════════════════════════════════════════════════════════════════
// הצעת סוג טיפול — כללים קבועים, ללא Gemini:
// "לפי הצורך" בטקסט → לפי הצורך | יש תאריך סיום → זמני | אחרת → כרוני
// ══════════════════════════════════════════════════════════════════

function _s15_suggestTreatmentType(endDate, frequency, dosage) {
  const text = (frequency || "") + " " + (dosage || "");
  if (/לפי הצורך|לפי צורך|בעת הצורך|PRN/i.test(text)) return "לפי הצורך";
  if (endDate) return "זמני";
  return "כרוני";
}

// ══════════════════════════════════════════════════════════════════
// ניווט הקודם/הבא בחלון — מחזיר payload חדש ושומר אותו
// ══════════════════════════════════════════════════════════════════

function s15_loadRowByNumber(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(S15_VALIDATION_SHEET);
    if (!sheet) return { error: true, msg: "❌ גליון לא נמצא: " + S15_VALIDATION_SHEET };

    const payload = _s15_buildValidationPayload(ss, sheet, row);
    if (!payload) return { error: true, msg: "❌ לא ניתן לטעון שורה " + row };

    if (typeof S16_PROP_KEY !== "undefined") {
      PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));
    }
    return payload;
  } catch (e) {
    Logger.log("[S15] s15_loadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// אישור שורה — כתיבה לקטלוג (קוד חדש) ולשורה, וסימון "מאומת".
// v = { code, activeIngredient, therapeuticGroup, medicalSystem, tradeNames,
//       doseAmount, doseUnit, timesPerDay, daysPerWeek, reason, treatmentType }
// קוד ריק מותר — נכתבים שדות המטופל בלבד, הקטלוג ועמודה L לא משתנים.
// ══════════════════════════════════════════════════════════════════

function s15_approve(row, v) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success: false, msg: "⏳ פעולה אחרת רצה כרגע — נסה שוב" };

  try {
    const C      = S15_MED_COLS;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName(S15_VALIDATION_SHEET);
    const domain = _s15_getDomain(S15_VALIDATION_SHEET);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + S15_VALIDATION_SHEET };
    if (sheet.getMaxColumns() < C.treatmentType) {
      return { success: false, msg: "❌ חסרה עמודת Treatment_Type (S) בגליון" };
    }

    const code = String(v.code || "").toUpperCase().replace(/\s/g, "");
    if (code && !domain.codePattern.test(code)) {
      return { success: false, msg: "❌ קוד ATC לא תקין: " + code + " (נדרשים 7 תווים, למשל A10BA02)" };
    }
    let system = String(v.medicalSystem || "").trim();
    if (system && !/^SYS\d{2}$/.test(system)) return { success: false, msg: "❌ קוד מערכת גוף לא תקין: " + system };
    if (S15_TREATMENT_TYPES.indexOf(v.treatmentType) === -1) {
      return { success: false, msg: "❌ יש לבחור סוג טיפול (כרוני / זמני / לפי הצורך)" };
    }

    const timesPerDay = _s15_cleanNumber(v.timesPerDay);
    const daysPerWeek = _s15_cleanNumber(v.daysPerWeek);
    if (String(v.timesPerDay || "").trim() && timesPerDay === "") return { success: false, msg: "❌ \"פעמים ביום\" חייב להיות מספר חיובי" };
    if (String(v.daysPerWeek || "").trim() && daysPerWeek === "") return { success: false, msg: "❌ \"ימים בשבוע\" חייב להיות מספר חיובי" };

    const drugName = String(sheet.getRange(row, C.name).getValue() || "").trim();
    if (!drugName) return { success: false, msg: "❌ שורה " + row + " ריקה" };

    // ── קטלוג ──
    let active     = String(v.activeIngredient || "").trim();
    let catalogMsg = "";
    if (code) {
      const catalog = _s15_readCatalog(ss, domain);
      const entry   = catalog.filter(function(e) { return e.code === code; })[0];
      const mapSheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);

      if (entry) {
        // קוד מאומת קיים — נתוני הקטלוג גוברים; מוסיפים רק את השם המסחרי אם חסר
        active = entry.name || active;
        system = entry.system || system;
        const known = entry.raw.some(function(n) { return _s15_normalizeName(n) === _s15_normalizeName(drugName); }) ||
                      _s15_normalizeName(entry.name) === _s15_normalizeName(drugName);
        if (!known) {
          mapSheet.getRange(entry.row, domain.catalogFirstCol + 3).setValue(entry.raw.concat([drugName]).join(", "));
          catalogMsg = " — השם המסחרי נוסף לקוד " + code + " בקטלוג";
        }
      } else {
        // [Task #266] קוד חדש — Raw_Value מתחיל מהשם המסחרי בשורה בלבד: לא מהחלון (נשאר מקוד
        // קודם אחרי החלפת קוד) ולא מהצעת Gemini (יכולה לכלול שמות של שורות אחרות). שורות
        // נוספות שיאושרו עם אותו קוד יוסיפו את שמן במסלול הקוד הקיים למעלה.
        const raw = [drugName];
        const newRow = _s15_lastCatalogRow(ss, domain) + 1;
        mapSheet.getRange(newRow, domain.catalogFirstCol, 1, domain.catalogWidth).setValues([[
          code, active, String(v.therapeuticGroup || "").trim(), raw.join(", "), "", system
        ]]);
        catalogMsg = " — קוד חדש " + code + " נוסף לקטלוג (שורה " + newRow + ")";
      }

      const all = _s15_getPendingCatalog();
      if (all[S15_VALIDATION_SHEET] && all[S15_VALIDATION_SHEET][code]) {
        delete all[S15_VALIDATION_SHEET][code];
        PropertiesService.getScriptProperties().setProperty(S15_PROP_PENDING_CATALOG, JSON.stringify(all));
      }
    }

    // ── שורת התרופה ──
    if (active) sheet.getRange(row, C.active).setValue(active);
    sheet.getRange(row, C.reason).setValue(String(v.reason || "").trim());
    if (code && system) sheet.getRange(row, C.system).setValue(system);
    sheet.getRange(row, C.code, 1, 7).setValues([[
      code,
      String(v.doseAmount || "").trim(),
      String(v.doseUnit || "").trim(),
      timesPerDay,
      daysPerWeek,
      S15_STATUS_VERIFIED,
      v.treatmentType
    ]]);

    Logger.log("[S15] שורה " + row + " (" + drugName + ") אושרה — קוד: " + (code || "ללא") + catalogMsg);
    return { success: true, msg: "✅ שורה " + row + " אושרה" + catalogMsg };

  } catch (e) {
    Logger.log("[S15] s15_approve שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════
// עזר — השורה האחרונה עם תוכן בבלוק הקטלוג של התחום בלבד
// (לא getLastRow הכללי — בלוקים אחרים במיפוי_קודים ארוכים יותר)
// ══════════════════════════════════════════════════════════════════

function _s15_lastCatalogRow(ss, domain) {
  const sheet        = ss.getSheetByName(CODE_MAP_SHEET_NAME);
  const firstDataRow = (SHEET_CONFIG[CODE_MAP_SHEET_NAME] && SHEET_CONFIG[CODE_MAP_SHEET_NAME].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (lastRow < firstDataRow) return firstDataRow - 1;

  const data = sheet.getRange(firstDataRow, domain.catalogFirstCol, lastRow - firstDataRow + 1, domain.catalogWidth).getValues();
  let last = firstDataRow - 1;
  data.forEach(function(r, i) {
    if (r.some(function(c) { return String(c).trim() !== ""; })) last = firstDataRow + i;
  });
  return last;
}

// ══════════════════════════════════════════════════════════════════
// עזר — תאריך לתצוגה DD/MM/YYYY (תא תאריך או טקסט)
// ══════════════════════════════════════════════════════════════════

function _s15_formatDate(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  return String(value === null || value === undefined ? "" : value).trim();
}

// ══════════════════════════════════════════════════════════════════
// [Task #261 שלב 3] מטפלים ייעודיים לתחומים — תוספת בלבד.
// תחום שמוגדר עם handler ב-S15_DOMAINS מקבל כאן פרומפט ופענוח משלו;
// תחום בלי handler (התרופות) ממשיך בנתיב הקיים ב-runS15Enrich.
// ══════════════════════════════════════════════════════════════════

const S15_INSTR_KINDS          = ["מתמשכת", "משימה"];
const S15_INSTR_DEFAULT_CODE   = "INS00";
const S15_SPECIALTY_FIRST_COL  = 10; // J = Specialty_Code בבלוק מקצוע_רפואי במיפוי_קודים
const S15_SPECIALTY_WIDTH      = 5;  // J-N: Code | Normalized_Value | Description | Raw_Value | Icon_Link

// ══════════════════════════════════════════════════════════════════
// בחירת המטפל לפי התחום (null = אין מטפל — הנתיב הקיים)
// ══════════════════════════════════════════════════════════════════

function _s15_getHandler(domain) {
  if (domain && domain.handler === "instructions") return _s15_instrHandler();
  if (domain && domain.handler === "lab")          return _s15_labHandler(); // [Task #263]
  if (domain && domain.handler === "genetics")     return _s15_genHandler(); // [Task #264]
  return null;
}
// ══════════════════════════════════════════════════════════════════
// מטפל ההנחיות — מחזיק את הרשימות הסגורות שנקראו לבניית הפרומפט,
// כדי שהפענוח יבדוק מולן בדיוק את אותם קודים.
// ══════════════════════════════════════════════════════════════════

function _s15_instrHandler() {
  const state = { codes: {}, targets: {} };
  return {
    buildPrompt: function(ss, domain, pending, catalog) {
      return _s15_instrBuildPrompt(ss, domain, pending, catalog, state);
    },
    buildRow: function(item, result) {
      return _s15_instrBuildRow(item, result, state);
    }
  };
}

// ══════════════════════════════════════════════════════════════════
// פרומפט ההנחיות — סוג (רשימה סגורה), אופי וקוד יעד (רק קוד קיים
// בקטלוג: התמחות או תרופה). קריאה בלבד מהקטלוג.
// ══════════════════════════════════════════════════════════════════

function _s15_instrBuildPrompt(ss, domain, pending, catalog, state) {
  const specialties = _s15_readCatalog(ss, { catalogFirstCol: S15_SPECIALTY_FIRST_COL, catalogWidth: S15_SPECIALTY_WIDTH });
  const medDomain   = _s15_getDomain("תרופות_קבועות");
  const medications = medDomain ? _s15_readCatalog(ss, medDomain) : [];

  let typesList = "";
  catalog.forEach(function(entry) {
    const m = entry.desc.match(/ברירת מחדל:\s*(מתמשכת|משימה)/);
    state.codes[entry.code] = { name: entry.name, defaultKind: m ? m[1] : "" };
    typesList += "\n  " + entry.code + " = " + entry.name + " — " + entry.desc +
      (entry.raw.length ? " (ניסוחים: " + entry.raw.join(", ") + ")" : "");
  });

  let specList = "";
  specialties.forEach(function(entry) {
    state.targets[entry.code] = true;
    specList += "\n  " + entry.code + " = " + entry.name +
      (entry.raw.length ? " (" + entry.raw.join(", ") + ")" : "");
  });

  let medList = "";
  medications.forEach(function(entry) {
    state.targets[entry.code] = true;
    medList += "\n  " + entry.code + " = " + entry.name +
      (entry.raw.length ? " (" + entry.raw.join(", ") + ")" : "");
  });

  let rowsBlock = "";
  pending.forEach(function(item, idx) {
    rowsBlock += "\n--- שורה " + (idx + 1) + " (rowIndex=" + idx + ") ---\n";
    rowsBlock += "תיאור ההנחיה: " + item.name + "\n";
    rowsBlock += "גורם מנחה: " + (item.ctx.issuer || "—") + "\n";
    rowsBlock += "סוג כפי שנכתב בחילוץ (טקסט חופשי): " + (item.ctx.taskType || "—") + "\n";
    rowsBlock += "תאריך יעד: " + (item.ctx.dueDate ? "צוין במסמך" : "לא צוין") + "\n";
    rowsBlock += "קוד מערכת גוף מהחילוץ: " + (item.ctx.medicalSystem || "—") + "\n";
  });

  return "אתה מתאם רפואי שמסווג הנחיות ומשימות רפואיות. קיבלת " + pending.length + " הנחיות " +
    "שחולצו ממסמכים רפואיים בישראל. לכל שורה:\n" +
    "1. instructionCode — סוג ההנחיה, מתוך הרשימה הסגורה הבאה בלבד:" + typesList + "\n" +
    "אסור להמציא קוד שאינו ברשימה. אם אין התאמה ברורה — " + S15_INSTR_DEFAULT_CODE + ".\n" +
    "2. instructionKind — \"משימה\" (פעולה שיש לבצע ולסיים, למשל ביקורת, בדיקה, הפניה) או " +
    "\"מתמשכת\" (הנחיה שחלה לאורך זמן, למשל הגבלה, דיאטה, תרופה קבועה). " +
    "ברירת המחדל של כל סוג כתובה בתיאורו; סטה ממנה רק אם תיאור ההנחיה מחייב זאת.\n" +
    "3. targetCode — קוד היעד של ההנחיה, רק מתוך הרשימות הבאות:\n" +
    "   א. למעקב, ביקורת או הפניה למומחה — קוד התמחות:" + (specList || " (אין)") + "\n" +
    "   ב. לטיפול תרופתי בתרופה שבקטלוג — קוד ATC:" + (medList || " (אין)") + "\n" +
    "   אם אין התאמה בטוחה — מחרוזת ריקה. אל תנחש ואל תמציא קוד.\n" +
    rowsBlock +
    "\nהחזר JSON בלבד, ללא טקסט נוסף, בפורמט: " +
    '{"results":[{"rowIndex":0,"instructionCode":"","instructionKind":"","targetCode":""},...]}' +
    " — מערך אחד עם " + pending.length + " איברים, לפי סדר השורות לעיל.";
}

// ══════════════════════════════════════════════════════════════════
// פענוח תשובה לשורת הנחיה — מחזיר [J, K, L, M] או null (שורה ממתינה).
// סוג מחוץ לרשימה הסגורה → INS00; אופי לא תקין → ברירת המחדל של הסוג;
// קוד יעד שאינו בקטלוג → ריק. מערכת הגוף (I) לא נכתבת.
// ══════════════════════════════════════════════════════════════════

function _s15_instrBuildRow(item, result, state) {
  if (!state.codes[S15_INSTR_DEFAULT_CODE]) {
    Logger.log("[S15] קטלוג סוגי ההנחיות ריק או חסר " + S15_INSTR_DEFAULT_CODE + " — שורה " + item.row + " לא נכתבה");
    return null;
  }

  let code = _s15_cleanCode(result.instructionCode, /^INS\d{2}$/);
  if (!state.codes[code]) {
    Logger.log("[S15] שורה " + item.row + " — סוג מחוץ לרשימה הסגורה (" + result.instructionCode + ") → " + S15_INSTR_DEFAULT_CODE);
    code = S15_INSTR_DEFAULT_CODE;
  }

  let kind = String(result.instructionKind || "").trim();
  if (S15_INSTR_KINDS.indexOf(kind) === -1) {
    kind = state.codes[code].defaultKind;
  }

  let target = String(result.targetCode || "").toUpperCase().replace(/\s/g, "");
  if (target && !state.targets[target]) {
    Logger.log("[S15] שורה " + item.row + " — קוד יעד לא קיים בקטלוג (" + result.targetCode + ") → ריק");
    target = "";
  }

  return [code, kind, target, S15_STATUS_SUGGESTED];
}

// ══════════════════════════════════════════════════════════════════
// [Task #261 שלב 4] אימות הנחיות — חלון S16 במצב "instruction".
// אותה תבנית כמו אימות התרופות: S15 שומר את נתוני השורה תחת S16_PROP_KEY
// ופותח את S16_Sidebar.html; החלון מזהה payload.mode="instruction".
// ניווט ואישור: s15_instrLoadRowByNumber / s15_instrApprove.
// רשימה סגורה — מיפוי_קודים לא נכתב. מסלול התרופות לא משתנה.
// ══════════════════════════════════════════════════════════════════

const S15_INSTR_SHEET    = "הנחיות_רפואיות_ומשימות";
const S15_INSTR_STATUSES = ["פתוח", "בוצע", "בוטל"];

// מספרי עמודות בגליון הנחיות_רפואיות_ומשימות (1 = A)
const S15_INSTR_COLS = {
  date: 1, issuer: 2, text: 3, rawType: 4, due: 5, status: 6, sourceUrl: 7,
  fileId: 8, system: 9, code: 10, kind: 11, target: 12, enrich: 13
};

// ══════════════════════════════════════════════════════════════════
// פתיחת חלון האימות לגליון ההנחיות (נקרא מ-s15_showValidation)
// ══════════════════════════════════════════════════════════════════

function _s15_instrShowValidation(ss, sheet, ui) {
  if (typeof S16_PROP_KEY === "undefined") {
    ui.alert("❌ שירות S16 לא נמצא (S16_ValidateMedicalStatus.gs) — חלון האימות אינו זמין.");
    return;
  }

  const row          = sheet.getActiveCell().getRow();
  const firstDataRow = (SHEET_CONFIG[S15_INSTR_SHEET] && SHEET_CONFIG[S15_INSTR_SHEET].FIRST_DATA_ROW) || 5;
  if (row < firstDataRow) {
    ui.alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const payload = _s15_instrBuildValidationPayload(ss, sheet, row);
  if (!payload) {
    ui.alert("❌ לא ניתן לטעון נתוני שורה " + row);
    return;
  }

  PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));

  const html = HtmlService
    .createTemplateFromFile("S16_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S15 — אימות הנחיות");

  ui.showModalDialog(html, "📋 S15 — " + S15_INSTR_SHEET);
}

// ══════════════════════════════════════════════════════════════════
// רשימות הבחירה בחלון — סוגי הנחיות (רשימה סגורה) וקודי יעד מהקטלוג
// (התמחויות ותרופות). קריאה בלבד ממיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function _s15_instrReadOptions(ss) {
  const typeOptions = _s15_readCatalog(ss, _s15_getDomain(S15_INSTR_SHEET)).map(function(e) {
    const m = e.desc.match(/ברירת מחדל:\s*(מתמשכת|משימה)/);
    return { code: e.code, name: e.name, desc: e.desc, defaultKind: m ? m[1] : "" };
  });

  const specialties = _s15_readCatalog(ss, { catalogFirstCol: S15_SPECIALTY_FIRST_COL, catalogWidth: S15_SPECIALTY_WIDTH });
  const medDomain   = _s15_getDomain(S15_VALIDATION_SHEET);
  const medications = medDomain ? _s15_readCatalog(ss, medDomain) : [];

  const targetGroups = [
    { label: "התמחויות", options: specialties.map(function(e) { return { code: e.code, name: e.name }; }) },
    { label: "תרופות (ATC)", options: medications.map(function(e) { return { code: e.code, name: e.name }; }) }
  ];

  return { typeOptions: typeOptions, targetGroups: targetGroups };
}

// ══════════════════════════════════════════════════════════════════
// בניית נתוני שורת הנחיה לחלון
// ══════════════════════════════════════════════════════════════════

function _s15_instrBuildValidationPayload(ss, sheet, row) {
  const C            = S15_INSTR_COLS;
  const firstDataRow = (SHEET_CONFIG[S15_INSTR_SHEET] && SHEET_CONFIG[S15_INSTR_SHEET].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (row < firstDataRow || row > lastRow) return null;

  const width = Math.min(C.enrich, sheet.getMaxColumns());
  const vals  = sheet.getRange(row, 1, 1, width).getValues()[0];
  function get(col) { return col <= width ? vals[col - 1] : ""; }
  function str(v)   { return String(v === null || v === undefined ? "" : v).trim(); }

  const text = str(get(C.text));
  if (!text) return null;

  const options = _s15_instrReadOptions(ss);

  const bodySystemOptions = [];
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(k) {
      bodySystemOptions.push({ code: k, nameHe: S13_BODY_SYSTEMS[k].nameHe });
    });
  }

  return {
    mode:              "instruction",
    sheetName:         S15_INSTR_SHEET,
    row:               row,
    firstDataRow:      firstDataRow,
    lastRow:           lastRow,
    enrichStatus:      str(get(C.enrich)),
    text:              text,
    rawType:           str(get(C.rawType)),
    instructionDate:   _s15_formatDate(get(C.date)),
    docIssuer:         str(get(C.issuer)),
    dueDate:           _s15_formatDate(get(C.due)),
    status:            str(get(C.status)),
    sourceUrl:         str(get(C.sourceUrl)),
    medicalSystem:     str(get(C.system)),
    code:              str(get(C.code)).toUpperCase(),
    kind:              str(get(C.kind)),
    target:            str(get(C.target)).toUpperCase(),
    typeOptions:       options.typeOptions,
    targetGroups:      options.targetGroups,
    kinds:             S15_INSTR_KINDS,
    statuses:          S15_INSTR_STATUSES,
    bodySystemOptions: bodySystemOptions
  };
}

// ══════════════════════════════════════════════════════════════════
// ניווט הקודם/הבא בחלון במצב הנחיות — מחזיר payload חדש ושומר אותו
// ══════════════════════════════════════════════════════════════════

function s15_instrLoadRowByNumber(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(S15_INSTR_SHEET);
    if (!sheet) return { error: true, msg: "❌ גליון לא נמצא: " + S15_INSTR_SHEET };

    const payload = _s15_instrBuildValidationPayload(ss, sheet, row);
    if (!payload) return { error: true, msg: "❌ לא ניתן לטעון שורה " + row };

    if (typeof S16_PROP_KEY !== "undefined") {
      PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));
    }
    return payload;
  } catch (e) {
    Logger.log("[S15] s15_instrLoadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// עזר — תאריך יעד מהחלון: DD/MM/YYYY → Date; ריק → ""; לא תקין → null
// ══════════════════════════════════════════════════════════════════

function _s15_parseDueDate(text, timeZone) {
  const t = String(text || "").trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getFullYear() !== Number(m[3]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return null;
  // [Task #261 שלב 4 — תיקון] חצות לפי אזור הזמן של הגליון, כדי שהתא יציג
  // בדיוק את היום שהוקלד (new Date יוצר חצות לפי אזור הזמן של הסקריפט).
  const dd = ("0" + m[1]).slice(-2);
  const mm = ("0" + m[2]).slice(-2);
  return Utilities.parseDate(dd + "/" + mm + "/" + m[3], timeZone || Session.getScriptTimeZone(), "dd/MM/yyyy");
}

// ══════════════════════════════════════════════════════════════════
// אישור שורת הנחיה — כותב E-F (תאריך יעד, סטטוס), I (מערכת גוף) ו-J-M
// (סוג, אופי, יעד, "מאומת"). A-D ו-G-H לא נכתבים; מיפוי_קודים לא נכתב.
// v = { code, kind, target, medicalSystem, status, dueDate }
// ══════════════════════════════════════════════════════════════════

function s15_instrApprove(row, v) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success: false, msg: "⏳ פעולה אחרת רצה כרגע — נסה שוב" };

  try {
    const C     = S15_INSTR_COLS;
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(S15_INSTR_SHEET);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + S15_INSTR_SHEET };
    if (sheet.getMaxColumns() < C.enrich) {
      return { success: false, msg: "❌ חסרות עמודות ההעשרה (J-M) בגליון" };
    }

    const text = String(sheet.getRange(row, C.text).getValue() || "").trim();
    if (!text) return { success: false, msg: "❌ שורה " + row + " ריקה" };

    const options = _s15_instrReadOptions(ss);

    const code = String(v.code || "").toUpperCase().replace(/\s/g, "");
    if (!options.typeOptions.some(function(o) { return o.code === code; })) {
      return { success: false, msg: "❌ יש לבחור סוג הנחיה מהרשימה" };
    }
    const kind = String(v.kind || "").trim();
    if (S15_INSTR_KINDS.indexOf(kind) === -1) {
      return { success: false, msg: "❌ יש לבחור אופי (מתמשכת / משימה)" };
    }
    const target = String(v.target || "").toUpperCase().replace(/\s/g, "");
    if (target && !options.targetGroups.some(function(g) {
      return g.options.some(function(o) { return o.code === target; });
    })) {
      return { success: false, msg: "❌ קוד יעד לא קיים בקטלוג: " + target };
    }
    const system = String(v.medicalSystem || "").trim();
    if (system && !/^SYS\d{2}$/.test(system)) return { success: false, msg: "❌ קוד מערכת גוף לא תקין: " + system };
    const status = String(v.status || "").trim();
    if (S15_INSTR_STATUSES.indexOf(status) === -1) {
      return { success: false, msg: "❌ יש לבחור סטטוס (פתוח / בוצע / בוטל)" };
    }
    const due = _s15_parseDueDate(v.dueDate, ss.getSpreadsheetTimeZone());
    if (due === null) return { success: false, msg: "❌ תאריך יעד לא תקין — נדרש DD/MM/YYYY או ריק" };

    sheet.getRange(row, C.due, 1, 2).setValues([[due, status]]);
    sheet.getRange(row, C.system, 1, 5).setValues([[system, code, kind, target, S15_STATUS_VERIFIED]]);

    Logger.log("[S15] הנחיה בשורה " + row + " אושרה — " + code + " | " + kind + " | יעד: " + (target || "ללא") + " | " + status);
    return { success: true, msg: "✅ שורה " + row + " אושרה" };

  } catch (e) {
    Logger.log("[S15] s15_instrApprove שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #263 שלב 4] מטפל מעבדה ומדדים — קטלוג פתוח של מאפיינים (LOINC,
// בלוק BG-BL), פאנל מרשימה סגורה (בלוק BS-BW), מערכת גוף לפי האיבר הנבדק.
// מאפיין שנמצא בקטלוג המאומת — הקוד והמערכת מהקטלוג. מאפיין חדש — הצעת
// LOINC נשמרת ב-S15_PENDING_CATALOG עד האימות (מיפוי_קודים לא נכתב כאן).
// ══════════════════════════════════════════════════════════════════

const S15_LAB_PANEL_FIRST_COL = 71;        // BS = Panel_Code בבלוק פאנלים במיפוי_קודים
const S15_LAB_PANEL_WIDTH     = 5;         // BS-BW: Code | Normalized_Value | Description | Raw_Value | Icon_Link
const S15_LAB_DEFAULT_PANEL   = "PNL-L00";

// ══════════════════════════════════════════════════════════════════
// עזר — קוד LOINC מתא: תא שגוגל שיטס פירש כתאריך (למשל 3016-3 → מרץ 3016)
// משוחזר לפורמט "שנה-חודש"; אחרת — המחרוזת כמו שהיא.
// ══════════════════════════════════════════════════════════════════

function _s15_labCodeText(value, timeZone) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone || Session.getScriptTimeZone(), "yyyy-M");
  }
  return String(value === null || value === undefined ? "" : value).trim();
}

function _s15_labHandler() {
  const state = { panels: {}, systems: {} };
  return {
    buildPrompt: function(ss, domain, pending, catalog) {
      return _s15_labBuildPrompt(ss, domain, pending, catalog, state);
    },
    buildRow: function(item, result, suggestions) {
      return _s15_labBuildRow(item, result, state, suggestions);
    },
    writeRow: function(sheet, item, values) {
      // K-M (מערכת, LOINC, פאנל) ו-S (סטטוס) — שני טווחים, N-R לא נוגעים.
      // K-M בעיצוב טקסט — קוד כמו 3016-3 לא יפורש כתאריך
      const target = sheet.getRange(item.row, 11, 1, 3);
      target.setNumberFormat("@");
      target.setValues([values.slice(0, 3)]);
      sheet.getRange(item.row, 19).setValue(values[3]);
    }
  };
}

// ══════════════════════════════════════════════════════════════════
// פרומפט המעבדה — מאפיין בקטלוג המאומת מסומן "ידוע" (אין לשנות);
// פאנל ומערכת גוף רק מהרשימות. קריאה בלבד מהקטלוג.
// ══════════════════════════════════════════════════════════════════

function _s15_labBuildPrompt(ss, domain, pending, catalog, state) {
  const panels = _s15_readCatalog(ss, { catalogFirstCol: S15_LAB_PANEL_FIRST_COL, catalogWidth: S15_LAB_PANEL_WIDTH });

  let panelList = "";
  panels.forEach(function(entry) {
    state.panels[entry.code] = true;
    panelList += "\n  " + entry.code + " = " + entry.name + " — " + entry.desc;
  });

  let systemsList = "";
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(code) {
      state.systems[code] = true;
      systemsList += (systemsList ? ", " : "") + code + "=" + S13_BODY_SYSTEMS[code].nameHe;
    });
  }

  let rowsBlock = "";
  pending.forEach(function(item, idx) {
    item.catalogMatch = _s15_findInCatalog(catalog, item.name);
    rowsBlock += "\n--- שורה " + (idx + 1) + " (rowIndex=" + idx + ") ---\n";
    rowsBlock += "שם המאפיין: " + item.name + "\n";
    rowsBlock += "קבוצה במסמך: " + (item.ctx.category || "—") + "\n";
    rowsBlock += "ערך ויחידה: " + (item.ctx.value || "—") + (item.ctx.unit ? " (" + item.ctx.unit + ")" : "") + "\n";
    rowsBlock += "סוג דגימה: " + (item.ctx.specimen || "—") + "\n";
    if (item.catalogMatch) {
      rowsBlock += "מאפיין ידוע מהקטלוג המאומת: " + item.catalogMatch.code + " = " + item.catalogMatch.name + " (אין לשנות)\n";
    }
  });

  return "אתה מומחה למעבדה קלינית ולקידוד LOINC. קיבלת " + pending.length + " תוצאות בדיקה " +
    "(מעבדה ומדדים חיוניים) שחולצו ממסמכים רפואיים בישראל. לכל שורה:\n" +
    "1. loincCode — קוד LOINC של המאפיין שנמדד (למשל 718-7 להמוגלובין בדם, 8480-6 ללחץ דם סיסטולי). " +
    "בחר את הקוד הנפוץ למאפיין ולסוג הדגימה. אם אינך בטוח — מחרוזת ריקה, אל תנחש.\n" +
    "2. componentName — שם המאפיין באנגלית, קצר ומקובל (למשל Hemoglobin, Creatinine).\n" +
    "3. descriptionHe — תיאור קצר בעברית של מה שהמאפיין בודק.\n" +
    "4. medicalSystem — קוד מערכת הגוף שהמאפיין מעיד עליה (לפי האיבר הנבדק, לא לפי סוג הדגימה; " +
    "למשל TSH → מערכת אנדוקרינית, קריאטינין → מערכת השתן, אנזימי כבד → מערכת העיכול), מתוך הרשימה " +
    "בלבד: " + (systemsList || "SYS00-SYS14") + ". אם לא ברור — SYS00.\n" +
    "5. panelCode — הפאנל שאליו המאפיין שייך, מתוך הרשימה הסגורה הבאה בלבד:" + panelList + "\n" +
    "אסור להמציא פאנל שאינו ברשימה. אם אין התאמה ברורה — " + S15_LAB_DEFAULT_PANEL + ".\n" +
    "לשורה שמסומנת \"מאפיין ידוע מהקטלוג\" — החזר את אותו loincCode, וקבע רק את panelCode.\n" +
    rowsBlock +
    "\nהחזר JSON בלבד, ללא טקסט נוסף, בפורמט: " +
    '{"results":[{"rowIndex":0,"loincCode":"","componentName":"","descriptionHe":"","medicalSystem":"","panelCode":""},...]}' +
    " — מערך אחד עם " + pending.length + " איברים, לפי סדר השורות לעיל.";
}

// ══════════════════════════════════════════════════════════════════
// פענוח תשובה לשורת מעבדה — מחזיר {values:[K, L, M, S], isNew} או null.
// קטלוג מאומת גובר על Gemini. קוד חדש תקין → הצעה (suggestions) לפי
// מבנה התרופות: {name, desc, raw:[...], system}. פאנל מחוץ לרשימה → PNL-L00.
// ══════════════════════════════════════════════════════════════════

function _s15_labBuildRow(item, result, state, suggestions) {
  if (!state.panels[S15_LAB_DEFAULT_PANEL]) {
    Logger.log("[S15] בלוק הפאנלים ריק או חסר " + S15_LAB_DEFAULT_PANEL + " — שורה " + item.row + " לא נכתבה");
    return null;
  }

  let panel = String(result.panelCode || "").toUpperCase().replace(/\s/g, "");
  if (!state.panels[panel]) {
    Logger.log("[S15] שורה " + item.row + " — פאנל מחוץ לרשימה (" + result.panelCode + ") → " + S15_LAB_DEFAULT_PANEL);
    panel = S15_LAB_DEFAULT_PANEL;
  }

  let system = _s15_cleanCode(result.medicalSystem, /^SYS\d{2}$/);
  if (system && !state.systems[system] && Object.keys(state.systems).length) system = "";

  let code  = "";
  let isNew = false;
  if (item.catalogMatch) {
    code   = item.catalogMatch.code;              // הקטלוג המאומת גובר על הצעת Gemini
    system = item.catalogMatch.system || system;
  } else {
    code = _s15_cleanCode(result.loincCode, /^\d{1,7}-\d$/);
    if (code) {
      const prev = suggestions[code];
      suggestions[code] = {
        name:   String(result.componentName || (prev && prev.name) || "").trim(),
        desc:   String(result.descriptionHe || (prev && prev.desc) || "").trim(),
        raw:    prev ? (prev.raw.indexOf(item.name) === -1 ? prev.raw.concat([item.name]) : prev.raw) : [item.name],
        system: system || (prev && prev.system) || ""
      };
      isNew = true;
    } else {
      Logger.log("[S15] שורה " + item.row + " (" + item.name + ") — Gemini לא החזיר קוד LOINC תקין: " + result.loincCode);
    }
  }

  return { values: [system, code, panel, S15_STATUS_SUGGESTED], isNew: isNew };
}

// ══════════════════════════════════════════════════════════════════
// [Task #263 שלב 5] אימות מעבדה ומדדים — חלון S16 במצב "lab".
// אותה תבנית כמו אימות התרופות וההנחיות: S15 שומר את נתוני השורה תחת
// S16_PROP_KEY ופותח את S16_Sidebar.html; החלון מזהה payload.mode="lab".
// ניווט ואישור: s15_labLoadRowByNumber / s15_labApprove.
// קטלוג פתוח (BG-BL): קוד מאומת — נתוני הקטלוג גוברים; קוד חדש — נכתב
// לקטלוג באישור וההצעה הממתינה נמחקת. מסלולי התרופות וההנחיות לא משתנים.
// ══════════════════════════════════════════════════════════════════

const S15_LAB_SHEET = "בדיקות_דם";

// מספרי עמודות בגליון בדיקות_דם (1 = A)
const S15_LAB_COLS = {
  date: 1, name: 2, category: 3, value: 4, range: 5, status: 6, note: 7,
  sourceUrl: 8, fileId: 9, issuer: 10, system: 11, code: 12, panel: 13,
  specimen: 14, valueNum: 15, unit: 16, refLow: 17, refHigh: 18, enrich: 19
};

// ══════════════════════════════════════════════════════════════════
// פתיחת חלון האימות לגליון המעבדה (נקרא מ-s15_showValidation)
// ══════════════════════════════════════════════════════════════════

function _s15_labShowValidation(ss, sheet, ui) {
  if (typeof S16_PROP_KEY === "undefined") {
    ui.alert("❌ שירות S16 לא נמצא (S16_ValidateMedicalStatus.gs) — חלון האימות אינו זמין.");
    return;
  }

  const row          = sheet.getActiveCell().getRow();
  const firstDataRow = (SHEET_CONFIG[S15_LAB_SHEET] && SHEET_CONFIG[S15_LAB_SHEET].FIRST_DATA_ROW) || 5;
  if (row < firstDataRow) {
    ui.alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const payload = _s15_labBuildValidationPayload(ss, sheet, row);
  if (!payload) {
    ui.alert("❌ לא ניתן לטעון נתוני שורה " + row);
    return;
  }

  PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));

  const html = HtmlService
    .createTemplateFromFile("S16_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S15 — אימות מעבדה ומדדים");

  ui.showModalDialog(html, "🧪 S15 — " + S15_LAB_SHEET);
}

// ══════════════════════════════════════════════════════════════════
// בניית נתוני שורת מעבדה לחלון — מהשורה, מהקטלוג המאומת (BG-BL), מההצעות
// השמורות; רשימות הבחירה מ-_s15_labReadOptions.
// ══════════════════════════════════════════════════════════════════

function _s15_labBuildValidationPayload(ss, sheet, row) {
  const C            = S15_LAB_COLS;
  const firstDataRow = (SHEET_CONFIG[S15_LAB_SHEET] && SHEET_CONFIG[S15_LAB_SHEET].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (row < firstDataRow || row > lastRow) return null;

  const width = Math.min(C.enrich, sheet.getMaxColumns());
  const vals  = sheet.getRange(row, 1, 1, width).getValues()[0];
  function get(col) { return col <= width ? vals[col - 1] : ""; }
  function str(v)   { return String(v === null || v === undefined ? "" : v).trim(); }

  const testName = str(get(C.name));
  if (!testName) return null;

  const catalog = _s15_readCatalog(ss, _s15_getDomain(S15_LAB_SHEET));
  const code    = _s15_labCodeText(get(C.code), ss.getSpreadsheetTimeZone()).toUpperCase();

  let verified = code ? catalog.filter(function(e) { return e.code === code; })[0] : null;
  if (!verified && !code) verified = _s15_findInCatalog(catalog, testName);

  const pending = _s15_getPendingCatalog()[S15_LAB_SHEET] || {};
  const sugg    = (!verified && code) ? pending[code] : null;

  let catalogSource = "none";
  let catalogInfo   = { name: "", desc: "", raw: testName, system: str(get(C.system)) };
  if (verified) {
    catalogSource = "verified";
    catalogInfo   = { name: verified.name, desc: verified.desc, raw: verified.raw.join(", "), system: verified.system };
  } else if (sugg) {
    catalogSource = "suggested";
    catalogInfo   = { name: sugg.name || "", desc: sugg.desc || "", raw: (sugg.raw || []).join(", "), system: sugg.system || str(get(C.system)) };
  }

  const options = _s15_labReadOptions(ss, catalog, pending);

  return {
    mode:              "lab",
    sheetName:         S15_LAB_SHEET,
    row:               row,
    firstDataRow:      firstDataRow,
    lastRow:           lastRow,
    enrichStatus:      str(get(C.enrich)),
    testName:          testName,
    category:          str(get(C.category)),
    testDate:          _s15_formatDate(get(C.date)),
    valueText:         str(get(C.value)),
    normalRange:       str(get(C.range)),
    labStatus:         str(get(C.status)),
    doctorNote:        str(get(C.note)),
    sourceUrl:         str(get(C.sourceUrl)),
    docIssuer:         str(get(C.issuer)),
    specimen:          str(get(C.specimen)),
    code:              verified ? verified.code : code,
    catalogSource:     catalogSource,
    catalog:           catalogInfo,
    panel:             str(get(C.panel)).toUpperCase(),
    valueNum:          str(get(C.valueNum)),
    unit:              str(get(C.unit)),
    refLow:            str(get(C.refLow)),
    refHigh:           str(get(C.refHigh)),
    knownCodes:        options.knownCodes,
    panelOptions:      options.panelOptions,
    bodySystemOptions: options.bodySystemOptions
  };
}

// ══════════════════════════════════════════════════════════════════
// ניווט הקודם/הבא בחלון במצב מעבדה — מחזיר payload חדש ושומר אותו
// ══════════════════════════════════════════════════════════════════

function s15_labLoadRowByNumber(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(S15_LAB_SHEET);
    if (!sheet) return { error: true, msg: "❌ גליון לא נמצא: " + S15_LAB_SHEET };

    const payload = _s15_labBuildValidationPayload(ss, sheet, row);
    if (!payload) return { error: true, msg: "❌ לא ניתן לטעון שורה " + row };

    if (typeof S16_PROP_KEY !== "undefined") {
      PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));
    }
    return payload;
  } catch (e) {
    Logger.log("[S15] s15_labLoadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// עזר — מספר מהחלון: ריק → ""; מספר (כולל שלילי ועשרוני) → Number;
// לא תקין → null. פסיק עשרוני מתקבל כנקודה.
// ══════════════════════════════════════════════════════════════════

function _s15_labParseNumber(text) {
  const t = String(text === null || text === undefined ? "" : text).trim().replace(",", ".");
  if (!t) return "";
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

// ══════════════════════════════════════════════════════════════════
// רשימות הבחירה בחלון המעבדה — פאנלים (BS-BW), מערכות גוף, ו-knownCodes:
// כל הקודים המוכרים (מאומתים וממתינים) עם השמות המשויכים להם, להתראת
// קוד כפול בחלון (לא חוסמת). קריאה בלבד ממיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function _s15_labReadOptions(ss, catalog, pending) {
  const knownCodes = {};
  Object.keys(pending).forEach(function(k) {
    knownCodes[k] = { name: pending[k].name || "", raw: pending[k].raw || [], source: "suggested" };
  });
  catalog.forEach(function(e) { knownCodes[e.code] = { name: e.name, raw: e.raw, source: "verified" }; });

  const panelOptions = _s15_readCatalog(ss, { catalogFirstCol: S15_LAB_PANEL_FIRST_COL, catalogWidth: S15_LAB_PANEL_WIDTH })
    .map(function(e) { return { code: e.code, name: e.name }; });

  const bodySystemOptions = [];
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(k) {
      bodySystemOptions.push({ code: k, nameHe: S13_BODY_SYSTEMS[k].nameHe });
    });
  }

  return { knownCodes: knownCodes, panelOptions: panelOptions, bodySystemOptions: bodySystemOptions };
}

// ══════════════════════════════════════════════════════════════════
// עזר לאישור — כתיבה לקטלוג המעבדה (BG-BL) ומחיקת ההצעה הממתינה.
// קוד קיים — נתוני הקטלוג גוברים ורק שם הבדיקה נוסף ל-Raw_Value; קוד חדש —
// שורה חדשה בבלוק. מחזיר { system, msg }.
// ══════════════════════════════════════════════════════════════════

function _s15_labWriteCatalog(ss, domain, code, testName, system, v) {
  let msg = "";
  const catalog  = _s15_readCatalog(ss, domain);
  const entry    = catalog.filter(function(e) { return e.code === code; })[0];
  const mapSheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);

  if (entry) {
    // קוד מאומת קיים — נתוני הקטלוג גוברים; מוסיפים רק את שם הבדיקה אם חסר
    system = entry.system || system;
    const known = entry.raw.some(function(n) { return _s15_normalizeName(n) === _s15_normalizeName(testName); });
    if (!known) {
      mapSheet.getRange(entry.row, domain.catalogFirstCol + 3).setValue(entry.raw.concat([testName]).join(", "));
      msg = " — ⚠️ השם \"" + testName + "\" נוסף לקוד " + code + " (" + entry.name + ")";
    }
  } else {
    // [Task #266] קוד חדש — Raw_Value מתחיל משם הבדיקה בשורה בלבד: לא מהחלון (נשאר מקוד
    // קודם אחרי החלפת קוד) ולא מהצעת Gemini (יכולה לכלול שמות של שורות אחרות). שורות
    // נוספות שיאושרו עם אותו קוד יוסיפו את שמן במסלול הקוד הקיים למעלה.
    const raw = [testName];
    const newRow = _s15_lastCatalogRow(ss, domain) + 1;
    // שורה חדשה בעיצוב טקסט — קוד כמו 3016-3 לא יפורש כתאריך
    const newRange = mapSheet.getRange(newRow, domain.catalogFirstCol, 1, domain.catalogWidth);
    newRange.setNumberFormat("@");
    newRange.setValues([[
      code, String(v.componentName || "").trim(), String(v.description || "").trim(), raw.join(", "), "", system
    ]]);
    msg = " — קוד חדש " + code + " נוסף לקטלוג (שורה " + newRow + ")";
  }

  const all = _s15_getPendingCatalog();
  if (all[S15_LAB_SHEET] && all[S15_LAB_SHEET][code]) {
    delete all[S15_LAB_SHEET][code];
    PropertiesService.getScriptProperties().setProperty(S15_PROP_PENDING_CATALOG, JSON.stringify(all));
  }

  return { system: system, msg: msg };
}

// ══════════════════════════════════════════════════════════════════
// אישור שורת מעבדה — כותב K-M (מערכת, LOINC, פאנל) ו-O-S (ערך מספרי,
// יחידה, גבול תחתון, גבול עליון, "מאומת"). A-J ו-N לא נכתבים.
// מיפוי_קודים: קוד חדש — שורה חדשה בבלוק BG-BL; קוד קיים — נתוני הקטלוג
// גוברים ורק שם הבדיקה נוסף ל-Raw_Value. קוד ריק מותר — הקטלוג לא משתנה.
// v = { code, componentName, description, rawNames, medicalSystem, panel,
//       valueNum, unit, refLow, refHigh }
// ══════════════════════════════════════════════════════════════════

function s15_labApprove(row, v) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success: false, msg: "⏳ פעולה אחרת רצה כרגע — נסה שוב" };

  try {
    const C      = S15_LAB_COLS;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName(S15_LAB_SHEET);
    const domain = _s15_getDomain(S15_LAB_SHEET);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + S15_LAB_SHEET };
    if (sheet.getMaxColumns() < C.enrich) return { success: false, msg: "❌ חסרות עמודות ההעשרה (K-S) בגליון" };

    const testName = String(sheet.getRange(row, C.name).getValue() || "").trim();
    if (!testName) return { success: false, msg: "❌ שורה " + row + " ריקה" };

    const code = String(v.code || "").toUpperCase().replace(/\s/g, "");
    if (code && !domain.codePattern.test(code)) {
      return { success: false, msg: "❌ קוד LOINC לא תקין: " + code + " (למשל 718-7)" };
    }
    let system = String(v.medicalSystem || "").trim();
    if (system && !/^SYS\d{2}$/.test(system)) return { success: false, msg: "❌ קוד מערכת גוף לא תקין: " + system };

    const panel  = String(v.panel || "").toUpperCase().replace(/\s/g, "");
    const panels = _s15_readCatalog(ss, { catalogFirstCol: S15_LAB_PANEL_FIRST_COL, catalogWidth: S15_LAB_PANEL_WIDTH });
    if (!panels.some(function(p) { return p.code === panel; })) return { success: false, msg: "❌ יש לבחור פאנל מהרשימה" };

    const valueNum = _s15_labParseNumber(v.valueNum);
    const refLow   = _s15_labParseNumber(v.refLow);
    const refHigh  = _s15_labParseNumber(v.refHigh);
    if (valueNum === null) return { success: false, msg: "❌ \"ערך מספרי\" חייב להיות מספר או ריק" };
    if (refLow === null)   return { success: false, msg: "❌ \"גבול תחתון\" חייב להיות מספר או ריק" };
    if (refHigh === null)  return { success: false, msg: "❌ \"גבול עליון\" חייב להיות מספר או ריק" };
    if (refLow !== "" && refHigh !== "" && refLow > refHigh) {
      return { success: false, msg: "❌ הגבול התחתון גדול מהגבול העליון" };
    }

    // ── קטלוג ──
    const cat = code ? _s15_labWriteCatalog(ss, domain, code, testName, system, v) : { system: system, msg: "" };
    system = cat.system;

    // ── שורת הבדיקה ── (K-M בעיצוב טקסט: קוד כמו 3016-3 לא יפורש כתאריך)
    const target = sheet.getRange(row, C.system, 1, 3);
    target.setNumberFormat("@");
    target.setValues([[system, code, panel]]);
    sheet.getRange(row, C.valueNum, 1, 5).setValues([[
      valueNum, String(v.unit || "").trim(), refLow, refHigh, S15_STATUS_VERIFIED
    ]]);

    Logger.log("[S15] בדיקה בשורה " + row + " (" + testName + ") אושרה — קוד: " + (code || "ללא") + " | " + panel + cat.msg);
    return { success: true, msg: "✅ שורה " + row + " אושרה" + cat.msg };

  } catch (e) {
    Logger.log("[S15] s15_labApprove שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #264 שלב 3] מטפל הגנטיקה — קטלוג תכונות פתוח (בלוק BM-BR, קוד
// פנימי GTR-nnn — אין קידוד בינלאומי לתכונות), פאנל מרשימה סגורה (בלוק
// BS-BW, קודי PNL-G בלבד), מערכת גוף לפי התכונה. תכונה מוכרת — מהקטלוג
// המאומת או מהצעה ממתינה — מקבלת את הקוד הקיים; תכונה חדשה מקבלת את
// הקוד הפנוי הבא, ותכונות עם אותו שם מנורמל באותה ריצה מקבלות קוד אחד.
// גן תקין (עמודה M) שאינו בקטלוג הגנים (CC-CH) נשמר כהצעה ממתינה עם
// סימון block="genes"; הצעת תכונה מסומנת block="traits". מיפוי_קודים
// לא נכתב כאן — רק באישור בחלון האימות (שלב 4).
// ══════════════════════════════════════════════════════════════════

const S15_GEN_PANEL_PREFIX   = "PNL-G";
const S15_GEN_DEFAULT_PANEL  = "PNL-G00";
const S15_GEN_TRAIT_PREFIX   = "GTR-";
const S15_GEN_TRAIT_MAX      = 999;
const S15_GEN_GENE_FIRST_COL = 81;   // CC = Gene_Symbol בבלוק גנים במיפוי_קודים
const S15_GEN_GENE_WIDTH     = 6;    // CC-CH: Gene_Symbol | Normalized_Value | Description | Raw_Value | Icon_Link | Medical_System
const S15_GEN_GENE_PATTERN   = /^[A-Z][A-Z0-9-]{1,14}$/; // סמל גן בינלאומי (למשל MTHFR, BRCA1)

function _s15_genHandler() {
  const state = { panels: {}, systems: {}, known: [], knownCodes: {}, genes: {}, assigned: {}, nextNum: 1 };
  return {
    buildPrompt: function(ss, domain, pending, catalog) {
      return _s15_genBuildPrompt(ss, domain, pending, catalog, state);
    },
    buildRow: function(item, result, suggestions) {
      return _s15_genBuildRow(item, result, state, suggestions);
    },
    writeRow: function(sheet, item, values) {
      // I-K (מערכת, תכונה, פאנל) ו-Q (סטטוס) — שני טווחים, L-P לא נוגעים.
      // I-K בעיצוב טקסט — כמו במעבדה, קוד לא יפורש כמספר או כתאריך
      const target = sheet.getRange(item.row, 9, 1, 3);
      target.setNumberFormat("@");
      target.setValues([values.slice(0, 3)]);
      sheet.getRange(item.row, 17).setValue(values[3]);
    }
  };
}

// ══════════════════════════════════════════════════════════════════
// פרומפט הגנטיקה — תכונות מוכרות (קטלוג מאומת + הצעות ממתינות), פאנלים
// גנטיים ומערכות גוף מהרשימות בלבד. קובע גם את מספר הקוד הפנוי הבא.
// קריאה בלבד מהקטלוג ומההצעות.
// ══════════════════════════════════════════════════════════════════

function _s15_genBuildPrompt(ss, domain, pending, catalog, state) {
  const panels = _s15_readCatalog(ss, { catalogFirstCol: S15_LAB_PANEL_FIRST_COL, catalogWidth: S15_LAB_PANEL_WIDTH });

  let panelList = "";
  panels.forEach(function(entry) {
    if (entry.code.indexOf(S15_GEN_PANEL_PREFIX) !== 0) return; // רק פאנלים גנטיים
    state.panels[entry.code] = true;
    panelList += "\n  " + entry.code + " = " + entry.name + " — " + entry.desc;
  });

  let systemsList = "";
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(code) {
      state.systems[code] = true;
      systemsList += (systemsList ? ", " : "") + code + "=" + S13_BODY_SYSTEMS[code].nameHe;
    });
  }

  // תכונות מוכרות — הקטלוג המאומת, ואחריו ההצעות הממתינות של הגליון
  catalog.forEach(function(entry) {
    if (!domain.codePattern.test(entry.code)) return;
    state.known.push(entry);
    state.knownCodes[entry.code] = entry;
  });
  const pendingCatalog = _s15_getPendingCatalog()[domain.sheetName] || {};
  Object.keys(pendingCatalog).forEach(function(code) {
    const p = pendingCatalog[code] || {};
    if (!domain.codePattern.test(code) || state.knownCodes[code]) return;
    const entry = {
      code:    code,
      name:    String(p.name || "").trim(),
      desc:    String(p.desc || "").trim(),
      raw:     Array.isArray(p.raw) ? p.raw : [],
      system:  String(p.system || "").trim(),
      pending: true
    };
    state.known.push(entry);
    state.knownCodes[code] = entry;
  });

  // הקוד הפנוי הבא — אחרי הגבוה מבין הקטלוג וההצעות
  state.known.forEach(function(entry) {
    const num = parseInt(entry.code.substring(S15_GEN_TRAIT_PREFIX.length), 10);
    if (isFinite(num) && num >= state.nextNum) state.nextNum = num + 1;
  });

  // גנים בקטלוג המאומת — גן שכבר קיים לא מוצע שוב
  _s15_readCatalog(ss, { catalogFirstCol: S15_GEN_GENE_FIRST_COL, catalogWidth: S15_GEN_GENE_WIDTH }).forEach(function(entry) {
    state.genes[entry.code.toUpperCase()] = entry;
  });

  let knownList = "";
  state.known.forEach(function(entry) {
    knownList += "\n  " + entry.code + " = " + entry.name + (entry.desc ? " — " + entry.desc : "");
  });

  let rowsBlock = "";
  pending.forEach(function(item, idx) {
    item.catalogMatch = _s15_findInCatalog(state.known, item.name);
    rowsBlock += "\n--- שורה " + (idx + 1) + " (rowIndex=" + idx + ") ---\n";
    rowsBlock += "שם התכונה במסמך: " + item.name + "\n";
    rowsBlock += "כותרת הקטע במסמך: " + (item.ctx.panelName || "—") + "\n";
    rowsBlock += "משמעות ונטייה: " + (item.ctx.significance || "—") + "\n";
    if (item.ctx.geneSymbol || item.ctx.geneVariant) {
      rowsBlock += "גן או וריאנט: " + [item.ctx.geneSymbol, item.ctx.geneVariant].filter(function(s) { return s; }).join(" | ") + "\n";
    }
    if (item.catalogMatch) {
      rowsBlock += "תכונה ידועה: " + item.catalogMatch.code + " = " + item.catalogMatch.name + " (אין לשנות)\n";
    }
  });

  return "אתה מומחה לגנטיקה קלינית ולדוחות בדיקה גנטית (כולל דוחות נוטריגנטיים). קיבלת " + pending.length +
    " תכונות גנטיות שחולצו מדוחות בדיקה של מטופל בישראל. לכל שורה:\n" +
    "1. traitCode — אם התכונה זהה לאחת התכונות המוכרות ברשימה להלן (אותה תכונה, גם בניסוח אחר) — " +
    "החזר את הקוד שלה. אחרת — מחרוזת ריקה. אסור להמציא קוד.\n" +
    "2. traitNameHe — שם קצר ואחיד בעברית לתכונה עצמה, בלי רמת הנטייה (למשל \"רגישות לטעם מלוח\" " +
    "ולא \"רגישות בינונית לטעם מלוח\"). לאותה תכונה בשורות שונות — אותו שם בדיוק.\n" +
    "3. descriptionHe — תיאור קצר בעברית של מה שהתכונה מתארת.\n" +
    "4. medicalSystem — קוד מערכת הגוף שהתכונה נוגעת בה לפי השפעתה (למשל טעם ותזונה → מערכת העיכול, " +
    "פציעות ספורט → מערכת השלד והשרירים), מתוך הרשימה בלבד: " + (systemsList || "SYS00-SYS14") +
    ". אם לא ברור — SYS00.\n" +
    "5. panelCode — הפאנל לפי משמעות התכונה, מתוך הרשימה הסגורה הבאה בלבד:" + panelList + "\n" +
    "כותרת הקטע במסמך היא רמז בלבד — \"סיכום ממצאים\" אינה פאנל. אסור להמציא פאנל שאינו ברשימה. " +
    "אם אין התאמה ברורה — " + S15_GEN_DEFAULT_PANEL + ".\n" +
    "6. geneDescriptionHe — רק אם צוין גן בשורה: תיאור קצר בעברית של תפקיד הגן. אחרת — מחרוזת ריקה.\n" +
    "לשורה שמסומנת \"תכונה ידועה\" — החזר את אותו traitCode, וקבע את panelCode.\n" +
    "תכונות מוכרות (קוד = שם — תיאור):" + (knownList || "\n  (אין עדיין)") + "\n" +
    rowsBlock +
    "\nהחזר JSON בלבד, ללא טקסט נוסף, בפורמט: " +
    '{"results":[{"rowIndex":0,"traitCode":"","traitNameHe":"","descriptionHe":"","medicalSystem":"","panelCode":"","geneDescriptionHe":""},...]}' +
    " — מערך אחד עם " + pending.length + " איברים, לפי סדר השורות לעיל.";
}

// ══════════════════════════════════════════════════════════════════
// פענוח תשובה לשורת גנטיקה — מחזיר {values:[I, J, K, Q], isNew} או null.
// סדר ההכרעה בקוד התכונה: התאמה בשם המסמך → קוד מוכר מ-Gemini → התאמה
// בשם המנורמל → קוד חדש (אחד לכל שם מנורמל בריצה). קטלוג מאומת גובר
// גם על המערכת. פאנל מחוץ לרשימה → PNL-G00. גן חדש → הצעה ממתינה.
// ══════════════════════════════════════════════════════════════════

function _s15_genBuildRow(item, result, state, suggestions) {
  if (!state.panels[S15_GEN_DEFAULT_PANEL]) {
    Logger.log("[S15] בלוק הפאנלים חסר " + S15_GEN_DEFAULT_PANEL + " — שורה " + item.row + " לא נכתבה");
    return null;
  }

  let panel = String(result.panelCode || "").toUpperCase().replace(/\s/g, "");
  if (!state.panels[panel]) {
    Logger.log("[S15] שורה " + item.row + " — פאנל מחוץ לרשימה (" + result.panelCode + ") → " + S15_GEN_DEFAULT_PANEL);
    panel = S15_GEN_DEFAULT_PANEL;
  }

  let system = _s15_cleanCode(result.medicalSystem, /^SYS\d{2}$/);
  if (system && !state.systems[system] && Object.keys(state.systems).length) system = "";

  const nameHe = String(result.traitNameHe || "").trim() || item.name;

  let entry = item.catalogMatch;
  if (!entry) {
    const geminiCode = _s15_cleanCode(result.traitCode, /^GTR-\d{3}$/);
    if (geminiCode && state.knownCodes[geminiCode]) entry = state.knownCodes[geminiCode];
  }
  if (!entry) entry = _s15_findInCatalog(state.known, nameHe);

  let code  = "";
  let isNew = false;
  if (entry && !entry.pending) {
    code   = entry.code;                         // הקטלוג המאומת גובר על הצעת Gemini
    system = entry.system || system;
  } else {
    if (entry) {
      code = entry.code;                         // הצעה ממתינה מריצה קודמת — אותו קוד
    } else {
      const key = _s15_normalizeName(nameHe);
      code = state.assigned[key] || "";
      if (!code) {
        if (state.nextNum > S15_GEN_TRAIT_MAX) {
          Logger.log("[S15] שורה " + item.row + " — נגמרו קודי התכונה (" + S15_GEN_TRAIT_PREFIX + S15_GEN_TRAIT_MAX + ")");
          return null;
        }
        code = S15_GEN_TRAIT_PREFIX + ("00" + state.nextNum).slice(-3);
        state.nextNum++;
        state.assigned[key] = code;
      }
    }
    const prev = suggestions[code];
    suggestions[code] = {
      name:   (prev && prev.name) || (entry && entry.name) || nameHe,
      desc:   (prev && prev.desc) || (entry && entry.desc) || String(result.descriptionHe || "").trim(),
      raw:    prev ? (prev.raw.indexOf(item.name) === -1 ? prev.raw.concat([item.name]) : prev.raw) : [item.name],
      system: (prev && prev.system) || (entry && entry.system) || system,
      block:  "traits"
    };
    system = suggestions[code].system || system; // אותה מערכת לכל שורות התכונה
    isNew  = true;
  }

  // גן (עמודה M) — רק סמל תקין שאינו בקטלוג הגנים; העמודה עצמה לא נכתבת
  const geneRaw = String(item.ctx.geneSymbol || "").trim();
  if (geneRaw) {
    const gene = _s15_cleanCode(geneRaw, S15_GEN_GENE_PATTERN);
    if (!gene) {
      Logger.log("[S15] שורה " + item.row + " — סמל גן לא תקין, לא הוצע: " + geneRaw);
    } else if (!state.genes[gene]) {
      const prevGene = suggestions[gene];
      suggestions[gene] = {
        name:   gene,
        desc:   (prevGene && prevGene.desc) || String(result.geneDescriptionHe || "").trim(),
        raw:    prevGene ? (prevGene.raw.indexOf(geneRaw) === -1 ? prevGene.raw.concat([geneRaw]) : prevGene.raw) : [geneRaw],
        system: (prevGene && prevGene.system) || system,
        block:  "genes"
      };
    }
  }

  return { values: [system, code, panel, S15_STATUS_SUGGESTED], isNew: isNew };
}

// ══════════════════════════════════════════════════════════════════
// [Task #264 שלב 4] אימות גנטיקה — חלון S16 במצב "gen". אותה תבנית כמו
// אימות המעבדה: S15 שומר את נתוני השורה תחת S16_PROP_KEY ופותח את
// S16_Sidebar.html; החלון מזהה payload.mode="gen". ניווט ואישור:
// s15_genLoadRowByNumber / s15_genApprove. קוד התכונה נבחר רק מהקודים
// המוכרים (מאומתים או ממתינים); שמות המסמכים (Raw_Value) מחושבים בשרת
// ואינם נשלחים מהחלון (לקח #266). קוד ממתין — נכתב לקטלוג באישור; קוד
// מאומת — נתוני הקטלוג גוברים. מסלולי התרופות, ההנחיות והמעבדה לא משתנים.
// ══════════════════════════════════════════════════════════════════

const S15_GEN_SHEET = "בדיקות_גנטיות";

// מספרי עמודות בגליון בדיקות_גנטיות (1 = A)
const S15_GEN_COLS = {
  date: 1, panelName: 2, geneVariant: 3, name: 4, significance: 5, recommendation: 6,
  sourceUrl: 7, fileId: 8, system: 9, code: 10, panel: 11, tendency: 12,
  gene: 13, variant: 14, genotype: 15, acmg: 16, enrich: 17
};

// ══════════════════════════════════════════════════════════════════
// עזר — הגדרת בלוק הגנים במיפוי_קודים (CC-CH) לפונקציות הקטלוג הכלליות
// ══════════════════════════════════════════════════════════════════

function _s15_genGeneDomain() {
  return { sheetName: S15_GEN_SHEET, catalogFirstCol: S15_GEN_GENE_FIRST_COL, catalogWidth: S15_GEN_GENE_WIDTH };
}

// ══════════════════════════════════════════════════════════════════
// פתיחת חלון האימות לגליון הגנטיקה (נקרא מ-s15_showValidation)
// ══════════════════════════════════════════════════════════════════

function _s15_genShowValidation(ss, sheet, ui) {
  if (typeof S16_PROP_KEY === "undefined") {
    ui.alert("❌ שירות S16 לא נמצא (S16_ValidateMedicalStatus.gs) — חלון האימות אינו זמין.");
    return;
  }

  const row          = sheet.getActiveCell().getRow();
  const firstDataRow = (SHEET_CONFIG[S15_GEN_SHEET] && SHEET_CONFIG[S15_GEN_SHEET].FIRST_DATA_ROW) || 5;
  if (row < firstDataRow) {
    ui.alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const payload = _s15_genBuildValidationPayload(ss, sheet, row);
  if (!payload) {
    ui.alert("❌ לא ניתן לטעון נתוני שורה " + row);
    return;
  }

  PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));

  const html = HtmlService
    .createTemplateFromFile("S16_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S15 — אימות גנטיקה");

  ui.showModalDialog(html, "🧬 S15 — " + S15_GEN_SHEET);
}

// ══════════════════════════════════════════════════════════════════
// רשימות הבחירה בחלון הגנטיקה — knownCodes: כל קודי התכונה המוכרים
// (מאומתים וממתינים; לא גנים) עם שם, תיאור, מערכת ושמות במסמכים —
// לעדכון מיידי בחלון ולהתראת קוד כפול. פאנלים — קודי PNL-G בלבד.
// קריאה בלבד ממיפוי_קודים.
// ══════════════════════════════════════════════════════════════════

function _s15_genReadOptions(ss, domain, catalog, pending) {
  const knownCodes = {};
  Object.keys(pending).forEach(function(k) {
    if (!domain.codePattern.test(k)) return; // רק הצעות תכונה, לא גנים
    const p = pending[k] || {};
    knownCodes[k] = {
      name: p.name || "", desc: p.desc || "", system: p.system || "",
      raw: Array.isArray(p.raw) ? p.raw : [], source: "suggested"
    };
  });
  catalog.forEach(function(e) {
    if (!domain.codePattern.test(e.code)) return;
    knownCodes[e.code] = { name: e.name, desc: e.desc, system: e.system, raw: e.raw, source: "verified" };
  });

  const panelOptions = _s15_readCatalog(ss, { catalogFirstCol: S15_LAB_PANEL_FIRST_COL, catalogWidth: S15_LAB_PANEL_WIDTH })
    .filter(function(e) { return e.code.indexOf(S15_GEN_PANEL_PREFIX) === 0; })
    .map(function(e) { return { code: e.code, name: e.name }; });

  const bodySystemOptions = [];
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(k) {
      bodySystemOptions.push({ code: k, nameHe: S13_BODY_SYSTEMS[k].nameHe });
    });
  }

  return { knownCodes: knownCodes, panelOptions: panelOptions, bodySystemOptions: bodySystemOptions };
}

// ══════════════════════════════════════════════════════════════════
// בניית נתוני שורת גנטיקה לחלון — מהשורה, מקטלוג התכונות (BM-BR) ומקטלוג
// הגנים (CC-CH), ומההצעות השמורות. הנטייה (L) — לתצוגה בלבד.
// ══════════════════════════════════════════════════════════════════

function _s15_genBuildValidationPayload(ss, sheet, row) {
  const C            = S15_GEN_COLS;
  const firstDataRow = (SHEET_CONFIG[S15_GEN_SHEET] && SHEET_CONFIG[S15_GEN_SHEET].FIRST_DATA_ROW) || 5;
  const lastRow      = sheet.getLastRow();
  if (row < firstDataRow || row > lastRow) return null;

  const width = Math.min(C.enrich, sheet.getMaxColumns());
  const vals  = sheet.getRange(row, 1, 1, width).getValues()[0];
  function get(col) { return col <= width ? vals[col - 1] : ""; }
  function str(v)   { return String(v === null || v === undefined ? "" : v).trim(); }

  const traitName = str(get(C.name));
  if (!traitName) return null;

  const domain  = _s15_getDomain(S15_GEN_SHEET);
  const catalog = _s15_readCatalog(ss, domain);
  const pending = _s15_getPendingCatalog()[S15_GEN_SHEET] || {};
  const options = _s15_genReadOptions(ss, domain, catalog, pending);

  const rowSystem = str(get(C.system));
  const code      = str(get(C.code)).toUpperCase();
  const known     = code ? options.knownCodes[code] : null;

  let catalogSource = "none";
  let catalogInfo   = { name: "", desc: "", system: rowSystem };
  if (known) {
    catalogSource = known.source;
    catalogInfo   = { name: known.name, desc: known.desc, system: known.system || rowSystem };
  }

  // גן — מהקטלוג המאומת, מהצעה ממתינה (block="genes"), או ללא
  const geneText   = str(get(C.gene));
  const geneSymbol = geneText.toUpperCase().replace(/\s/g, "");
  let geneSource   = "none";
  let geneInfo     = { name: "", desc: "" };
  if (geneSymbol) {
    const geneEntry = _s15_readCatalog(ss, _s15_genGeneDomain()).filter(function(e) {
      return e.code.toUpperCase() === geneSymbol;
    })[0];
    const geneSugg = pending[geneSymbol] && pending[geneSymbol].block === "genes" ? pending[geneSymbol] : null;
    if (geneEntry) {
      geneSource = "verified";
      geneInfo   = { name: geneEntry.name, desc: geneEntry.desc };
    } else if (geneSugg) {
      geneSource = "suggested";
      geneInfo   = { name: geneSugg.name || "", desc: geneSugg.desc || "" };
    }
  }

  return {
    mode:              "gen",
    sheetName:         S15_GEN_SHEET,
    row:               row,
    firstDataRow:      firstDataRow,
    lastRow:           lastRow,
    enrichStatus:      str(get(C.enrich)),
    traitName:         traitName,
    panelName:         str(get(C.panelName)),
    significance:      str(get(C.significance)),
    recommendation:    str(get(C.recommendation)),
    tendency:          str(get(C.tendency)),
    testDate:          _s15_formatDate(get(C.date)),
    sourceUrl:         str(get(C.sourceUrl)),
    docIssuer:         "",
    doctorNote:        "",
    code:              code,
    catalogSource:     catalogSource,
    catalog:           catalogInfo,
    panel:             str(get(C.panel)).toUpperCase(),
    geneSymbol:        geneText,
    geneVariant:       str(get(C.geneVariant)),
    variantId:         str(get(C.variant)),
    genotype:          str(get(C.genotype)),
    acmg:              str(get(C.acmg)),
    geneSource:        geneSource,
    gene:              geneInfo,
    knownCodes:        options.knownCodes,
    panelOptions:      options.panelOptions,
    bodySystemOptions: options.bodySystemOptions
  };
}

// ══════════════════════════════════════════════════════════════════
// ניווט הקודם/הבא בחלון במצב גנטיקה — מחזיר payload חדש ושומר אותו
// ══════════════════════════════════════════════════════════════════

function s15_genLoadRowByNumber(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(S15_GEN_SHEET);
    if (!sheet) return { error: true, msg: "❌ גליון לא נמצא: " + S15_GEN_SHEET };

    const payload = _s15_genBuildValidationPayload(ss, sheet, row);
    if (!payload) return { error: true, msg: "❌ לא ניתן לטעון שורה " + row };

    if (typeof S16_PROP_KEY !== "undefined") {
      PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));
    }
    return payload;
  } catch (e) {
    Logger.log("[S15] s15_genLoadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// עזר לאישור — כתיבה לקטלוג התכונות (BM-BR). קוד מאומת — נתוני הקטלוג
// גוברים ורק שם התכונה נוסף ל-Raw_Value; קוד ממתין — שורה חדשה בבלוק,
// בעיצוב טקסט. Raw_Value מחושב מההצעה ומשם התכונה — לא מהחלון.
// מחזיר { system, msg } או { error }.
// ══════════════════════════════════════════════════════════════════

function _s15_genWriteTraitCatalog(ss, domain, code, traitName, system, v, pending) {
  let msg = "";
  const catalog  = _s15_readCatalog(ss, domain);
  const entry    = catalog.filter(function(e) { return e.code === code; })[0];
  const mapSheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);
  const key      = _s15_normalizeName(traitName);

  if (entry) {
    system = entry.system || system;
    const known = _s15_normalizeName(entry.name) === key ||
      entry.raw.some(function(n) { return _s15_normalizeName(n) === key; });
    if (!known) {
      mapSheet.getRange(entry.row, domain.catalogFirstCol + 3).setValue(entry.raw.concat([traitName]).join(", "));
      msg = " — ⚠️ השם \"" + traitName + "\" נוסף לקוד " + code + " (" + entry.name + ")";
    }
    return { system: system, msg: msg };
  }

  const sugg = pending[code];
  if (!sugg) return { error: "❌ הקוד " + code + " אינו בקטלוג ואינו בהצעות הממתינות" };

  const raw = (Array.isArray(sugg.raw) ? sugg.raw : [])
    .map(function(s) { return String(s || "").trim(); })
    .filter(function(s) { return s; });
  if (!raw.some(function(n) { return _s15_normalizeName(n) === key; })) raw.push(traitName);

  const name   = String(v.traitName || "").trim() || String(sugg.name || "").trim() || traitName;
  const desc   = String(v.description || "").trim() || String(sugg.desc || "").trim();
  const newRow = _s15_lastCatalogRow(ss, domain) + 1;
  const newRange = mapSheet.getRange(newRow, domain.catalogFirstCol, 1, domain.catalogWidth);
  newRange.setNumberFormat("@");
  newRange.setValues([[code, name, desc, raw.join(", "), "", system]]);

  return { system: system, msg: " — קוד חדש " + code + " נוסף לקטלוג התכונות (שורה " + newRow + ")" };
}

// ══════════════════════════════════════════════════════════════════
// עזר לאישור — כתיבה לקטלוג הגנים (CC-CH): גן שאינו בקטלוג מקבל שורה
// חדשה (בעיצוב טקסט); גן קיים — ללא שינוי. מחזיר הודעה (או "").
// ══════════════════════════════════════════════════════════════════

function _s15_genWriteGene(ss, symbol, rawText, system, v, pending) {
  const domain = _s15_genGeneDomain();
  const exists = _s15_readCatalog(ss, domain).some(function(e) { return e.code.toUpperCase() === symbol; });
  if (exists) return "";

  const sugg = pending[symbol] && pending[symbol].block === "genes" ? pending[symbol] : null;
  const raw  = (sugg && Array.isArray(sugg.raw) ? sugg.raw : [])
    .map(function(s) { return String(s || "").trim(); })
    .filter(function(s) { return s; });
  if (rawText && raw.indexOf(rawText) === -1) raw.push(rawText);

  const name   = String(v.geneName || "").trim() || (sugg && String(sugg.name || "").trim()) || symbol;
  const desc   = String(v.geneDescription || "").trim() || (sugg && String(sugg.desc || "").trim()) || "";
  const geneSystem = (sugg && String(sugg.system || "").trim()) || system;

  const mapSheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);
  const newRow   = _s15_lastCatalogRow(ss, domain) + 1;
  const newRange = mapSheet.getRange(newRow, domain.catalogFirstCol, 1, domain.catalogWidth);
  newRange.setNumberFormat("@");
  newRange.setValues([[symbol, name, desc, raw.join(", "), "", geneSystem]]);

  return " — גן חדש " + symbol + " נוסף לקטלוג הגנים (שורה " + newRow + ")";
}

// ══════════════════════════════════════════════════════════════════
// עזר לאישור — ניקוי הצעות ממתינות: הקוד שאושר והגן שאושר נמחקים;
// הקוד המקורי של השורה, אם הוחלף, נמחק רק כשאף שורה אחרת שלא אומתה
// לא משתמשת בו (מניעת הצעות יתומות). מחזיר הודעה (או "").
// ══════════════════════════════════════════════════════════════════

function _s15_genCleanupPending(sheet, row, approvedCode, originalCode, geneSymbol) {
  const all = _s15_getPendingCatalog();
  const cur = all[S15_GEN_SHEET];
  if (!cur) return "";

  let changed = false;
  let msg     = "";
  if (cur[approvedCode]) {
    delete cur[approvedCode];
    changed = true;
  }
  if (geneSymbol && cur[geneSymbol] && cur[geneSymbol].block === "genes") {
    delete cur[geneSymbol];
    changed = true;
  }
  if (originalCode && originalCode !== approvedCode && cur[originalCode]) {
    const C            = S15_GEN_COLS;
    const firstDataRow = (SHEET_CONFIG[S15_GEN_SHEET] && SHEET_CONFIG[S15_GEN_SHEET].FIRST_DATA_ROW) || 5;
    const lastRow      = sheet.getLastRow();
    let inUse = false;
    if (lastRow >= firstDataRow) {
      const data = sheet.getRange(firstDataRow, C.code, lastRow - firstDataRow + 1, C.enrich - C.code + 1).getValues();
      inUse = data.some(function(r, i) {
        if (firstDataRow + i === row) return false;
        const c = String(r[0] || "").trim().toUpperCase();
        const s = String(r[C.enrich - C.code] || "").trim();
        return c === originalCode && s !== S15_STATUS_VERIFIED;
      });
    }
    if (!inUse) {
      delete cur[originalCode];
      changed = true;
      msg = " — ההצעה " + originalCode + " נמחקה (לא בשימוש)";
    }
  }

  if (changed) {
    all[S15_GEN_SHEET] = cur;
    PropertiesService.getScriptProperties().setProperty(S15_PROP_PENDING_CATALOG, JSON.stringify(all));
  }
  return msg;
}

// ══════════════════════════════════════════════════════════════════
// אישור שורת גנטיקה — כותב I-K (מערכת, קוד תכונה, פאנל; בעיצוב טקסט)
// ו-Q ("מאומת"); M (סמל גן) נכתב רק אם שונה בחלון. הנטייה (L) ושאר
// העמודות לא נכתבות. קטלוג התכונות — קוד ממתין → שורה חדשה, קוד מאומת →
// הוספת שם; קטלוג הגנים — גן חדש → שורה חדשה. כל הבדיקות לפני כתיבה.
// v = { code, traitName, description, medicalSystem, panel, geneSymbol,
//       geneName, geneDescription } — geneSymbol null = מקטע הגן לא הוצג.
// ══════════════════════════════════════════════════════════════════

function s15_genApprove(row, v) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success: false, msg: "⏳ פעולה אחרת רצה כרגע — נסה שוב" };

  try {
    const C      = S15_GEN_COLS;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName(S15_GEN_SHEET);
    const domain = _s15_getDomain(S15_GEN_SHEET);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + S15_GEN_SHEET };
    if (sheet.getMaxColumns() < C.enrich) return { success: false, msg: "❌ חסרות עמודות ההעשרה (I-Q) בגליון" };

    const rowVals   = sheet.getRange(row, 1, 1, C.enrich).getValues()[0];
    const traitName = String(rowVals[C.name - 1] || "").trim();
    if (!traitName) return { success: false, msg: "❌ שורה " + row + " ריקה" };
    const originalCode = String(rowVals[C.code - 1] || "").trim().toUpperCase();

    // ── קוד התכונה — חובה, רק מהקודים המוכרים ──
    const code = String(v.code || "").toUpperCase().replace(/\s/g, "");
    if (!code) return { success: false, msg: "❌ יש לבחור קוד תכונה מהרשימה" };
    if (!domain.codePattern.test(code)) return { success: false, msg: "❌ קוד תכונה לא תקין: " + code };
    const pending   = _s15_getPendingCatalog()[S15_GEN_SHEET] || {};
    const inCatalog = _s15_readCatalog(ss, domain).some(function(e) { return e.code === code; });
    if (!inCatalog && !pending[code]) {
      return { success: false, msg: "❌ הקוד " + code + " אינו ברשימת הקודים המוכרים — יש לבחור מהרשימה" };
    }

    let system = String(v.medicalSystem || "").trim();
    if (system && !/^SYS\d{2}$/.test(system)) return { success: false, msg: "❌ קוד מערכת גוף לא תקין: " + system };

    const panel  = String(v.panel || "").toUpperCase().replace(/\s/g, "");
    const panels = _s15_readCatalog(ss, { catalogFirstCol: S15_LAB_PANEL_FIRST_COL, catalogWidth: S15_LAB_PANEL_WIDTH });
    const panelOk = panel.indexOf(S15_GEN_PANEL_PREFIX) === 0 && panels.some(function(p) { return p.code === panel; });
    if (!panelOk) return { success: false, msg: "❌ יש לבחור פאנל גנטי מהרשימה" };

    // ── גן — סמל מהחלון (אם המקטע הוצג), אחרת מהשורה ──
    const geneText    = String(rowVals[C.gene - 1] || "").trim();
    const geneFromWin = (v.geneSymbol !== null && v.geneSymbol !== undefined);
    const geneInput   = geneFromWin ? String(v.geneSymbol || "").trim() : geneText;
    const geneSymbol  = geneInput.toUpperCase().replace(/\s/g, "");
    if (geneSymbol && !S15_GEN_GENE_PATTERN.test(geneSymbol)) {
      return { success: false, msg: "❌ סמל גן לא תקין: " + geneInput + " (סמל אחד, למשל MTHFR)" };
    }
    const geneChanged = geneFromWin && geneSymbol !== geneText.toUpperCase().replace(/\s/g, "");

    // ── קטלוגים ──
    const cat = _s15_genWriteTraitCatalog(ss, domain, code, traitName, system, v, pending);
    if (cat.error) return { success: false, msg: cat.error };
    system = cat.system;
    const geneMsg = geneSymbol ? _s15_genWriteGene(ss, geneSymbol, geneText || geneInput, system, v, pending) : "";

    // ── שורת התכונה ── (I-K בעיצוב טקסט)
    const target = sheet.getRange(row, C.system, 1, 3);
    target.setNumberFormat("@");
    target.setValues([[system, code, panel]]);
    if (geneChanged) sheet.getRange(row, C.gene).setValue(geneSymbol);
    sheet.getRange(row, C.enrich).setValue(S15_STATUS_VERIFIED);

    const cleanMsg = _s15_genCleanupPending(sheet, row, code, originalCode, geneSymbol);

    Logger.log("[S15] תכונה בשורה " + row + " (" + traitName + ") אושרה — " + code + " | " + panel + cat.msg + geneMsg + cleanMsg);
    return { success: true, msg: "✅ שורה " + row + " אושרה" + cat.msg + geneMsg + cleanMsg };

  } catch (e) {
    Logger.log("[S15] s15_genApprove שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  } finally {
    lock.releaseLock();
  }
}