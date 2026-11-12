/**
 * @file        S13_ExtractMedical.gs
 * @version     1.13.0 | @updated 10/11/2026 14:10 | @service S13
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
 *              [v1.5.0] שורה עם Event_Type="מחלת רקע" (S09 v2.1.0) — חומרה ריקה
 *              וודאות CRT4 ("רקע ידוע") נאכפות בקוד, ללא תלות בתשובת Gemini.
 *              [v1.6.0] שורת ניתוח — Gemini מחזיר גם מצב וצד האיבר שנותח (קטלוג
 *              מצב_איבר/צד_איבר), ו-Primary_Diagnosis = שם הניתוח (לא ממצא).
 *              [v1.7.0] שורת רגישות/אלרגיה (קוד אירוע A7) — Gemini מחזיר גם את
 *              החומר הגורם (קוד ATC מבלוק התרופות) ואת התגובה.
 *              [v1.8.0] בדיקת דם (מעבדה ומדדים) — Gemini מחזיר רשימת תוצאות, ונכתבת
 *              שורה לכל תוצאה (ערך מספרי, יחידה, טווח, סוג דגימה); מערכת הגוף כבר
 *              לא SYS06 קבוע — נשארת ריקה להעשרה ב-S15.
 *              [v1.9.0] בניסיון החוזר (תשובה חלקית/ריקה) נשלח קודם המסמך המקורי
 *              (PDF/תמונה, עד 15MB) כקובץ מצורף; טקסט ה-TXT רק אם המקור לא זמין.
 *              [v1.10.0] בדיקה גנטית — Gemini מחזיר רשימת תכונות, ונכתבת שורה לכל
 *              תכונה (פאנל, ממצא, משמעות, נטייה, המלצה, גן/וריאנט/גנוטיפ/ACMG אם
 *              מופיעים); מערכת הגוף כבר לא SYS14 קבוע — נשארת ריקה להעשרה ב-S15.
 *              בבדיקה גנטית ובבדיקת דם המסמך המקורי מצורף כבר בקריאה הראשונה.
 *              [v1.12.0] מצב רפואי/כללי — Gemini מחזיר רשימת ממצאים (Findings), ונכתבת
 *              שורה לכל ממצא, עם איבר, צד ומצב איבר משלו (למשל פענוח הדמיה עם כמה
 *              ממצאים, או רשימת מחלות רקע). שורת ניתוח נשארת שורה אחת.
 *              [v1.13.0] לכל ממצא נוספים מונח בינלאומי קצר, גודל וסיבה (תרופה או
 *              מצב לאחר ניתוח) — בסיס לאינפוגרפיקה. הודעת הסיום מציגה בנפרד שורות
 *              מקור שחולצו ושורות יעד שנכתבו בפועל.
 * @impacts     יומן_אירועים_רפואי: קורא בלבד (A-L, [v1.3.1] עודכן מ-A-I, Task
 *              #205 — File_ID עבר לעמודה L), כותב Extraction_Status (I).
 *              בדיקות_דם/בדיקות_גנטיות/תרופות_קבועות/הנחיות_רפואיות_ומשימות/
 *              יומן_מצב_רפואי: כותב שורות חדשות (appendRow) בלבד, לא דורס.
 *              ניהול_מיילים: קורא בלבד (TXT_URL, fallback).
 *              [v1.4.0] יומן_מצב_רפואי: 22 עמודות (נוסף Organ_Code) + 10 שדות
 *              הקידוד. מיפוי_קודים: קורא בלבד, דרך _s16_readCatalogBlock
 *              (S16_ValidateMedicalStatus.gs — תלות, עם בדיקת typeof).
 *              [v1.5.0] מיפוי_קודים: תלות בערך CRT4 בבלוק הוודאות (Y-AC) — אם
 *              יוסר, הוודאות לשורות רקע נשארת ריקה (ללא שגיאה).
 *              [v1.6.0] יומן_מצב_רפואי: 24 עמודות — Organ_State_Code (23) ו-
 *              Organ_Side_Code (24), מתמלאות רק בשורת ניתוח (אחרת ריקות).
 *              מיפוי_קודים: בלוקים AD-AH/AI-AM, קריאה בלבד (תלות ב-S16 v2.4.0
 *              — S16_ORGAN_STATE/SIDE_MAP_FIRST_COL, עם בדיקת typeof).
 *              [v1.7.0] יומן_מצב_רפואי: 26 עמודות — Allergen_Code (25) ו-Reaction
 *              (26), מתמלאות רק בשורת רגישות A7 (אחרת ריקות). מיפוי_קודים: בלוק
 *              התרופות BA-BF (עמודה 53) נקרא כקטלוג החומרים הגורמים, קריאה בלבד.
 *              [v1.8.0] בדיקות_דם: 19 עמודות (A-S) — שורה לכל תוצאה, בכתיבה מרוכזת
 *              (setValues). Medical_System (K), LOINC_Code (L), Panel_Code (M) ו-
 *              Enrich_Status (S) נכתבים ריקים — S15 ימלא מהקטלוג.
 *              [v1.9.0] Drive: קריאת המסמך המקורי לפי File_ID — קריאה בלבד, רק
 *              בניסיון החוזר.
 *              [v1.10.0] בדיקות_גנטיות: 17 עמודות (A-Q) — שורה לכל תכונה, בכתיבה
 *              מרוכזת (setValues). Medical_System (I), Trait_Code (J), Panel_Code (K)
 *              ו-Enrich_Status (Q) נכתבים ריקים — S15 ימלא מהקטלוג. Drive: המסמך
 *              המקורי נקרא כבר בקריאה הראשונה כשבמסמך יש בדיקה גנטית או בדיקת דם.
 *              [v1.12.0] יומן_מצב_רפואי: שורה לכל ממצא, בכתיבה מרוכזת (setValues);
 *              Organ_State_Code (23) ו-Organ_Side_Code (24) מתמלאות בכל שורה, לא רק
 *              בשורת ניתוח (קוד שאינו בקטלוג → ריק). תשובה בלי Findings — שורה אחת.
 *              [v1.13.0] יומן_מצב_רפואי: 29 עמודות — Finding_Term (27), Finding_Size
 *              (28) ו-Finding_Cause (29), מתמלאות בכל שורת ממצא (ריק אם לא צוין).
 *              מיפוי_קודים: איבר חדש SYS01I "עצמות (כללי)" (שורה 108).
 * @callers     runS13ViewIconEvents (ViewEngine.gs, עמודה F ביומן_אירועים_רפואי)
 * @functions   runS13 | _s13_checkRow | _s13_getEligibleGroups | _s13_processSingleRow |
 *              _s13_processBatch | _s13_getSchemaBlock | _s13_fetchTxtUrlByFileId |
 *              _s13_fetchTxtContent | _s13_buildPrompt | _s13_normalizeDate |
 *              _s13_callGemini | _s13_buildRowValues | _s13_writeExtractedRow |
 *              _s13_processGroup | _s13_loadCatalog | _s13_validateCode | _s13_toNumber |
 *              _s13_fetchOriginalPart | _s13_genTendency
 * @changes     [v1.13.0] Task #281 — מונח, גודל וסיבה לכל ממצא: _s13_getSchemaBlock — לכל
 *              פריט ב-Findings נוספו Finding_Term, Finding_Size ו-Finding_Cause.
 *              _s13_buildPrompt — כלל (13) חדש: מונח בינלאומי קצר (עד 3 מילים, לא שם
 *              האיבר), גודל כמספר+יחידה בלי רווח, סיבה רק אם צוינה במפורש (post-op או
 *              שם החומר הפעיל של התרופה). _s13_buildRowValues — 29 ערכים ביומן_מצב_רפואי.
 *              תיקון ספירה בהודעת הסיום: _s13_writeExtractedRow מחזירה את מספר שורות
 *              היעד שנכתבו (0 = כישלון) במקום true/false; _s13_processGroup מחזירה גם
 *              targetRows; _s13_processSingleRow ו-_s13_processBatch מציגות "חולצו X
 *              שורות מקור | נכתבו Y שורות" (קודם הוצג 1 כשנכתבו 15). אומת מול הקוד החי
 *              (6 בלוקים, diff מדויק, node --check) ובבדיקה בפועל: סי-טי 12/01/2025 —
 *              15 ממצאים, מונח בכל שורה, גדלים 3.3cm/1.5cm/9.5cm, post-op באמפזימה,
 *              אוסטאופניה ← SYS01I; ההודעה: "חולצו 1 שורות מקור | נכתבו 15 שורות".
 * @changes     [v1.12.0] Task #279 — פיצול ממצאים: _s13_getSchemaBlock — הסכימה של מצב
 *              רפואי/כללי עטופה ברשימת Findings, ולכל פריט נוספו Organ_State_Code ו-
 *              Organ_Side_Code. _s13_buildPrompt — כלל (12) חדש: פריט נפרד לכל ממצא, עם
 *              איבר, מערכת, צד (סתירה → ריק) ומצב איבר (OST2 הוסר, OST1 הוסר חלקית),
 *              חומרה וודאות לכל ממצא, "שינויים צפויים לאחר ניתוח" ב-Severity_Status;
 *              כותרות קטלוג הצד ומצב האיבר — "לשורות ניתוח וממצאים". _s13_buildRowValues —
 *              מצב וצד איבר נקלטים בכל שורה ביומן_מצב_רפואי (הוסר התנאי isSurgery).
 *              _s13_writeExtractedRow — שורה לכל פריט ב-Findings, בכתיבה מרוכזת אחת
 *              (כמו בדיקת דם); תשובה בלי Findings נכתבת כשורה אחת (תאימות לאחור).
 *              אומת מול הקוד החי (4 בלוקים, diff מדויק, node --check) ובבדיקה בפועל:
 *              סי-טי 12/01/2025 (מסמך 3) — 15 שורות במקום שורה אחת, כולל "מצב לאחר
 *              כריתת כליה ימנית" OST2/LAT1, תריס דו-צדדי LAT3, כליה שמאל תקינה SEV5/DX15.
 * @changes     [v1.11.1] Task #276 — _s13_callGemini: נוסף responseMimeType="application/json"
 *              ל-generationConfig (כמו S06) — Gemini מחזיר JSON תקין גם כשיש גרשיים
 *              בראשי תיבות עבריים (מסמך 2023 נכשל ב-JSON_PARSE). נוספה פונקציית עזר
 *              פנימית logParseContext — ביומן כשל פענוח נרשמים הודעת השגיאה, אורך
 *              התשובה ו-300 תווים סביב מקום השבירה. אומת מול הקוד החי (diff מדויק,
 *              node --check) ובבדיקה בפועל: מסמך 2023 חולץ בהצלחה (8 שורות).
 * @changes     [v1.11.0] Task #236 — בדיקה תקינה: _s13_buildPrompt — כלל (11) חדש בקטע
 *              יומן_מצב_רפואי (המספרים 8-10 תפוסים בכללי המעבדה והגנטיקה): שורת בדיקה
 *              שכל הממצאים בה תקינים → Severity_Code=SEV5 ("תקין — ללא ממצא"),
 *              Diagnosis_Code=DX15 ("ללא ממצא"), Certainty_Code=CRT2; תקין חלקית → קידוד
 *              לפי הממצא החריג; מחלת רקע → לפי כלל (5). SEV5/DX15 נוספו ידנית למיפוי_קודים
 *              (O10:R10, T20:W20), ו"לא תקין" למילות המפתח של SEV1 (R6). אומת מול הקוד החי
 *              (diff מדויק, node --check) ובבדיקה על 2 שורות מדומות (MOCK-236): תקינה →
 *              SEV5/DX15/CRT2; תקינה חלקית → SEV1/DX02.
 * @changes     [v1.10.0] Task #264 (שלב 2) — גנטיקה: פיצול לשורה לכל תכונה, באותו
 *              דפוס כמו מעבדה (v1.8.0). חדש: S13_GEN_TENDENCIES (אין|נמוכה|בינונית|
 *              גבוהה), S13_GEN_TENDENCY_SYNONYMS (מוגברת→גבוהה וכו'), S13_GEN_ACMG
 *              (5 דרגות), _s13_genTendency (נרמול לסולם הסגור, ערך לא מוכר → ריק).
 *              _s13_getSchemaBlock — סכימת "בדיקה גנטית" היא רשימת Results
 *              (Panel_Name, Finding, Clinical_Significance, Tendency, Gene_Symbol,
 *              Variant_ID, Genotype, Gene_Variant, ACMG_Class, Recommendation).
 *              _s13_buildRowValues — ענף גנטי: 17 ערכים, מערכת/קוד תכונה/פאנל/
 *              העשרה ריקים, ACMG מחוץ לרשימה → ריק. _s13_writeExtractedRow — ענף
 *              משותף לבדיקת דם ולבדיקה גנטית: שורה לכל פריט (גנטי — לפי Finding
 *              או Gene_Symbol), setValues אחד. _s13_buildPrompt — כלל (9): כרטיס
 *              תכונה = פריט אחד, פאנל = כותרת הקטע ("סיכום ממצאים" אינו פאנל),
 *              משמעות ונטייה במילות המסמך, המלצה מתוך "סיכום" הכרטיס, גן/ACMG רק
 *              אם מופיעים; כלל (10): שורת "הנחיה" במסמך גנטי — פריט מאוחד אחד.
 *              _s13_processGroup — בבדיקה גנטית/בדיקת דם המסמך המקורי מצורף כבר
 *              בקריאה הראשונה (הסיכום ביומן לא כולל פאנל/המלצה/גן); בניסיון החוזר
 *              אותו קובץ משמש שוב; שאר הסוגים — ללא שינוי. נבדק בשטח: דוח ממצאים
 *              גנטיים (אירוע 247) — 22/22 תכונות, נטייה והמלצות נכונות, הנחיה
 *              מאוחדת אחת; דוח נוטריגנטי (אירוע 249) — 24/24. פאנל ריק או "סיכום
 *              ממצאים" ב-13 תכונות שבעמודים ללא כותרת קטע בקובץ הסרוק — לשיוך
 *              ב-S15. אומת מול הקוד החי (טביעת אצבע לכל בלוק, בדיקת תחביר).
 * @changes     [v1.9.0] Task #268 — בניסיון החוזר של _s13_processGroup (תשובה
 *              חלקית/ריקה מהקריאה הראשונה) נשלח המסמך המקורי במקום טקסט ה-TXT
 *              של S06, באותו דפוס כמו S09 v2.2.0. _s13_fetchOriginalPart (חדשה,
 *              תאומה ל-_s09_fetchOriginalPart) — PDF/JPEG/PNG/WEBP/HEIC/HEIF עד
 *              15MB כחלק inline_data; אחרת null → TXT כגיבוי, כמו קודם.
 *              _s13_callGemini — פרמטר שני אופציונלי originalPart, נשלח כחלק
 *              ראשון (קריאה בלי הפרמטר — ללא שינוי). _s13_buildPrompt ללא שינוי:
 *              במסלול המקורי מקבלת שורת הנחיה קצרה במקום טקסט ה-TXT. נוספו
 *              רישומי לוג למקור הניסיון החוזר. נבדק בשטח: תדפיס כללית און-ליין
 *              (אירוע 251) → בדיקות_דם שורות 6-25, טווחים נכונים ו-5 תוצאות
 *              "נמוך" (Task #265), אומתו ב-S16. אומת מול הקוד החי (השוואה
 *              שורה-שורה וטביעת אצבע לכל בלוק, בדיקת תחביר).
 * @changes     [v1.8.0] Task #263 (שלב 3) — מעבדה ומדדים: פיצול לשורה לכל תוצאה.
 *              _s13_getSchemaBlock — סכימת "בדיקת דם" היא רשימת Results (Test_Name,
 *              Category, Value, Value_Num, Unit, Ref_Low, Ref_High, Normal_Range,
 *              Status, Specimen, Doctor_Note). _s13_buildPrompt — כלל (8), רק כשבמסמך
 *              יש שורת מעבדה: פריט לכל מאפיין, ערך מספרי וגבולות טווח, סוג דגימה
 *              (דם|שתן|צואה|מדידה|אחר), לחץ דם כשני פריטים, בלי סיכום כללי בלי ערך.
 *              _s13_buildRowValues — ענף בדיקת דם: 19 ערכים, מערכת/LOINC/פאנל/העשרה
 *              ריקים, סוג דגימה מחוץ לרשימה → "אחר". חדש: S13_LAB_SPECIMENS,
 *              _s13_toNumber (פסיק עשרוני, ערך לא מספרי → ריק). _s13_writeExtractedRow
 *              — ענף בדיקת דם: שורה לכל פריט לא ריק, setValues אחד; אין תוצאות →
 *              false (האירוע לא מסומן "חולץ"). אומת מול הקוד החי (diff לכל בלוק,
 *              node --check, הדמיה) ובבדיקת שטח: אירוע 6 (TSH) → בדיקות_דם שורה 5;
 *              אירוע 10 (ספירת דם) → 22 שורות (6-27). ממצא: טווחים שגויים בסיכום
 *              האירוע (גבול תחתון = הערך) — מקורם בהמרה, לא ב-S13 (Task #265).
 * @changes     [v1.7.0] Task #262 — רגישויות ואלרגיות ביומן_מצב_רפואי.
 *              קבועים חדשים S13_ALLERGEN_MAP_FIRST_COL (53 = BA, בלוק התרופות)
 *              ו-S13_ALLERGY_EVENT_CODE_PREFIX ("A7"). _s13_getSchemaBlock — בסכימת
 *              מצב רפואי/כללי נוספו Allergen_Code ו-Reaction. _s13_loadCatalog —
 *              טוען גם allergen (בלוק התרופות דרך _s16_readCatalogBlock).
 *              _s13_buildPrompt — כלל (7): שורת רגישות מקבלת קוד מסדרת A7 (A7A
 *              אלרגיה / A7B רגישות / A7C תופעת לוואי), Primary_Diagnosis = "רגישות
 *              ל-" + שם החומר, Allergen_Code רק מהקטלוג, Reaction בעברית; נוספה
 *              רשימת קטלוג Allergen_Code. _s13_buildRowValues — 26 ערכים; חומר
 *              ותגובה נכתבים רק כשקוד האירוע המאומת מתחיל ב-A7, וקוד החומר רק אם
 *              קיים בקטלוג (אחרת ריק — שם החומר נשאר באבחנה). אומת מול הקוד החי
 *              (diff מדויק לכל בלוק, node --check) ובבדיקת שטח: אירוע 133
 *              (רגישות לסימבסטטין) → יומן_מצב_רפואי שורה 28: A7B, C10AA01, "כאבי
 *              שרירים" (קוד האירוע תוקן ל-A7C באימות ב-S16).
 * @changes     [v1.6.0] Task #224 (שלב 4) — מצב וצד איבר בשורות ניתוח.
 *              _s13_getSchemaBlock — ענף נפרד ל-"ניתוח/פעולה רפואית" עם
 *              Organ_State_Code + Organ_Side_Code (שאר הקטגוריות ללא שינוי).
 *              _s13_loadCatalog — טוען גם organState/organSide (בלוקים 30/35 דרך
 *              _s16_readCatalogBlock; S16 ישן → מערכים ריקים). _s13_buildPrompt —
 *              כלל (6): בשורת ניתוח Primary_Diagnosis = שם הניתוח בעברית + המונח
 *              המקורי; Organ_State_Code לפי מה שהוסר; Organ_Side_Code לפי הכותרת,
 *              האבחנה ושם הניתוח — סתירה בטקסט → ריק; LAT0 רק לאיבר ללא צדדים
 *              שנותח כולו, באיבר עם אונות — צד האונה, צד לא ידוע → ריק. נוספו
 *              רשימות קטלוג המצב והצד. _s13_buildRowValues — 24 ערכים; מצב וצד
 *              מאומתים מול הקטלוג (_s13_validateCode) ורק בשורת ניתוח. אומת מול
 *              הקוד החי (diff מדויק לכל בלוק, node --check, השוואת קוד מלאה מול
 *              התכנון), הדמיה, ובדיקת שטח על 3 ניתוחים ממסמך כללית (אירועים
 *              240-242 → יומן_מצב_רפואי 13-15): שם הניתוח באבחנה, איבר ומצב
 *              נכונים בשלושתם. צד — 13/14 העתיקו טעות של S09 (עמודת צד מוזזת
 *              בטבלת המקור, Task #231), 15 קיבל LAT0 — תוקן ניסוח הכלל בפרומפט
 *              (צד לאיבר עם אונות). שלושתם תוקנו ואושרו ידנית ב-S16.
 * @changes     [v1.5.0] Task #223 — טיפול במחלות רקע (שורות עם Event_Type="מחלת
 *              רקע" שמסמן S09 v2.1.0): _s13_buildPrompt — כלל (5) חדש: Severity_
 *              Code ו-Severity_Status ריקים, Certainty_Code=CRT4, בלי להסיק חומרה
 *              או ודאות כאילו זה ממצא חדש. _s13_buildRowValues, ענף ברירת המחדל
 *              (יומן_מצב_רפואי) — isBackground: קוד חומרה ותיאור חומרה נכתבים
 *              ריקים, ודאות נאכפת ל-CRT4 דרך _s13_validateCode (בלי קשר לתשובת
 *              Gemini). שאר סוגי האירועים — ללא שינוי. ערך הקטלוג CRT4 "רקע
 *              ידוע" נוסף ידנית במיפוי_קודים (Y9:AB9). אומת מול הקוד החי (diff,
 *              node --check), הדמיה, ובדיקת שטח 21/10/2026 על מסמך 52: סוכרת
 *              וסרטן כליה → חומרה ריקה + CRT4; סרטן תריס (עיקרי) → SEV1 + CRT2.
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
  // [Task #281] ההודעה מציגה בנפרד שורות מקור שחולצו ושורות יעד שנכתבו בפועל
  SpreadsheetApp.getUi().alert(
    result.success
      ? ("✅ הושלם — חולצו " + result.written + " שורות מקור | נכתבו " + result.targetRows + " שורות לגליונות היעד" + (result.failed ? (" | נכשלו: " + result.failed) : ""))
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
  let totalTarget  = 0; // [Task #281] שורות יעד שנכתבו בפועל
  let totalFailed  = 0;

  groups.forEach(function(group) {
    Logger.log("[S13] File_ID: " + group.fileId + " | " + group.rows.length + " שורות");
    const result = _s13_processGroup(ss, sheet, group);
    totalWritten += result.written;
    totalTarget  += result.targetRows;
    totalFailed  += result.failed;
  });

  SpreadsheetApp.getUi().alert(
    "✅ אצווה הושלמה — " + groups.length + " קבוצות (File_ID) | " +
    "חולצו: " + totalWritten + " שורות מקור | נכתבו: " + totalTarget + " שורות יעד | נכשלו: " + totalFailed
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

    // [Task #263] מעבדה ומדדים — רשימת תוצאות (פריט לכל מאפיין שנמדד)
    case "בדיקת דם":
      return '{"Results":[{"Test_Name":"","Category":"","Value":"","Value_Num":"מספר או ריק","Unit":"",' +
        '"Ref_Low":"מספר או ריק","Ref_High":"מספר או ריק","Normal_Range":"","Status":"תקין|גבוה|נמוך|לא תקין",' +
        '"Specimen":"דם|שתן|צואה|מדידה|אחר","Doctor_Note":""}]}';

    // [Task #264] גנטיקה — רשימת תכונות (פריט לכל תכונה או גן שנבדקו)
    case "בדיקה גנטית":
      return '{"Results":[{"Panel_Name":"","Finding":"","Clinical_Significance":"","Tendency":"אין|נמוכה|בינונית|גבוהה או ריק",' +
        '"Gene_Symbol":"","Variant_ID":"","Genotype":"","Gene_Variant":"",' +
        '"ACMG_Class":"פתוגני|כנראה פתוגני|משמעות לא ודאית|כנראה שפיר|שפיר או ריק","Recommendation":""}]}';

    case "מרשם תרופה":
      return '{"Drug_Name":"","Active_Ingredient":"","Dosage":"","Frequency":"","Treatment_Reason":"","Start_Date":"DD/MM/YYYY","End_Date":"DD/MM/YYYY","Status":"פעיל|הופסק"}';

    case "הנחיה":
         return '{"Task_Description":"","Task_Type":"","Due_Date":"DD/MM/YYYY","Status":"פתוח|בוצע","Medical_System":"קוד SYS00-SYS14 בלבד"}';

    // [Task #224] ניתוח — אותה סכימה + מצב וצד האיבר שנותח
    case "ניתוח/פעולה רפואית":
      return '{"Medical_System":"קוד SYS00-SYS14 בלבד","Organ_Code":"קוד איבר מהקטלוג או ריק",' +
        '"Event_Code":"קוד מהקטלוג או ריק","Specialty_Code":"קוד מהקטלוג או ריק",' +
        '"Severity_Code":"קוד מהקטלוג או ריק","Diagnosis_Code":"קוד מהקטלוג או ריק",' +
        '"Certainty_Code":"קוד מהקטלוג או ריק","Organ_State_Code":"קוד מהקטלוג או ריק",' +
        '"Organ_Side_Code":"קוד מהקטלוג או ריק","Primary_Diagnosis":"","Severity_Status":"","Recommendations":""}';

    case "מצב רפואי":
    case "כללי":
    default:
      // [Task #220 שלב ב] נוספו 6 שדות קוד מתוך קטלוג מיפוי_קודים
      // [Task #262] + Allergen_Code ו-Reaction — רק לשורת רגישות (קוד אירוע A7)
      // [Task #279] רשימת Findings — פריט לכל ממצא, + מצב וצד איבר לכל פריט (כלל 12)
      // [Task #281] + Finding_Term / Finding_Size / Finding_Cause לכל פריט (כלל 13)
      return '{"Findings":[{"Medical_System":"קוד SYS00-SYS14 בלבד","Organ_Code":"קוד איבר מהקטלוג או ריק",' +
        '"Event_Code":"קוד מהקטלוג או ריק","Specialty_Code":"קוד מהקטלוג או ריק",' +
        '"Severity_Code":"קוד מהקטלוג או ריק","Diagnosis_Code":"קוד מהקטלוג או ריק",' +
        '"Certainty_Code":"קוד מהקטלוג או ריק","Organ_State_Code":"קוד מהקטלוג או ריק",' +
        '"Organ_Side_Code":"קוד מהקטלוג או ריק","Allergen_Code":"קוד ATC מהקטלוג או ריק",' +
        '"Reaction":"","Primary_Diagnosis":"","Severity_Status":"","Recommendations":"",' +
        '"Finding_Term":"מונח בינלאומי קצר","Finding_Size":"מספר+יחידה או ריק","Finding_Cause":"post-op או חומר פעיל או ריק"}]}';
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #220 שלב ב] טעינת קטלוג מיפוי_קודים — דרך הפונקציה הקיימת
// _s16_readCatalogBlock (S16_ValidateMedicalStatus.gs, אותו פרויקט),
// באותה שיטה שבה ViewEngine.gs (כרטיס אינפוגרפי) כבר משתמש בה.
// אם אינה זמינה — מחזיר null והחילוץ ממשיך בלי קודי קטלוג (כמו בעבר).
// מחזיר: { eventCode, specialty, severity, diagnosis, certainty, organ }
// — כל אחד מערך options [{code, name, raw, desc, row}].
// [Task #224] + organState, organSide (בלוקים AD-AH / AI-AM; ריקים אם S16 ישן).
// [Task #262] + allergen — בלוק התרופות (BA-BF) כקטלוג החומרים הגורמים לרגישות.
// ══════════════════════════════════════════════════════════════════

// [Task #262] רגישויות ואלרגיות — בלוק התרופות במיפוי_קודים (BA, עמודה 53)
// משמש כקטלוג החומרים הגורמים; שורת רגישות מזוהה לפי קוד אירוע מסדרת A7.
const S13_ALLERGEN_MAP_FIRST_COL     = 53;
const S13_ALLERGY_EVENT_CODE_PREFIX  = "A7";

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
    // [Task #224] מצב וצד איבר אחרי ניתוח (בלוקים AD-AH / AI-AM) — רק אם S16 v2.4.0+
    catalog.organState = (typeof S16_ORGAN_STATE_MAP_FIRST_COL !== "undefined")
      ? _s16_readCatalogBlock(S16_ORGAN_STATE_MAP_FIRST_COL).options : [];
    catalog.organSide  = (typeof S16_ORGAN_SIDE_MAP_FIRST_COL !== "undefined")
      ? _s16_readCatalogBlock(S16_ORGAN_SIDE_MAP_FIRST_COL).options : [];
    // [Task #262] קטלוג החומרים הגורמים — קודי ATC מבלוק התרופות
    catalog.allergen   = _s16_readCatalogBlock(S13_ALLERGEN_MAP_FIRST_COL).options;
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
      "(5) שורה עם Event_Type \"מחלת רקע\" היא מחלה שאובחנה בעבר ומוזכרת במסמך כרקע בלבד: " +
      "Severity_Code ו-Severity_Status נשארים ריקים, ו-Certainty_Code = CRT4. " +
      "אל תסיק חומרה או ודאות כאילו זה ממצא חדש.\n" +
      // [Task #224] שורות ניתוח — מצב וצד האיבר, ושם הניתוח כאבחנה העיקרית
      "(6) שורה עם Routing_Category \"ניתוח/פעולה רפואית\": Primary_Diagnosis = שם הניתוח/הפעולה " +
      "שבוצעו בפועל, בעברית ובמונח המקורי בסוגריים (למשל \"כריתת אונה שמאל של בלוטת התריס " +
      "(Hemithyroidectomy)\") — לא ממצא, גוש או אבחנה אחרת מהמסמך. Organ_Code = האיבר שנותח. " +
      "Organ_State_Code = מצב האיבר אחרי הניתוח, מקטלוג מצב האיבר (כריתה חלקית/אונה → הוסר חלקית, " +
      "כריתה מלאה → הוסר, ניתוח שלא הסיר רקמה → קיים). Organ_Side_Code = הצד של האיבר שנותח, " +
      "מקטלוג הצד, לפי הכותרת, האבחנה ושם הניתוח. אם הטקסט סותר את עצמו לגבי הצד (למשל \"אונה " +
      "שמאל\" בכותרת ו\"האונה הימנית\" בגוף) — השאר Organ_Side_Code ריק. LAT0 רק לאיבר ללא צדדים שנותח " +
      "כולו (למשל קיבה, ערמונית). איבר עם אונות/צדדים (תריס, ריאה, כבד, כליה) — הצד של מה שנותח (למשל " +
      "כריתת אונה שמאל של התריס → LAT2). אם הצד לא מופיע בשום מקום — השאר ריק, לא LAT0.\n" +
      // [Task #262] שורות רגישות/אלרגיה — קוד אירוע A7, חומר גורם ותגובה
      "(7) שורה שמתארת רגישות, אלרגיה או תופעת לוואי לחומר או לתרופה: Event_Code מסדרת A7 בלבד " +
      "(A7A = אלרגיה — תגובה חיסונית כמו פריחה, נפיחות, קוצר נשימה; A7B = רגישות או אי-סבילות; " +
      "A7C = תופעת לוואי לתרופה במינון טיפולי). Primary_Diagnosis = \"רגישות ל-\" + שם החומר כפי שמופיע " +
      "במסמך. Allergen_Code = קוד ה-ATC של החומר מקטלוג Allergen_Code בלבד — אם החומר אינו ברשימה, השאר " +
      "ריק. Reaction = התגובה כפי שמתוארת במסמך, בעברית (למשל \"כאבי שרירים\"); אם לא מצוינת — ריק. " +
      "בכל שורה אחרת Allergen_Code ו-Reaction נשארים ריקים.\n" +
      // [Task #236] בדיקה תקינה — קוד חומרה SEV5 וקוד אבחנה DX15, רק כשכל הממצאים בשורה תקינים
      "(11) שורת בדיקה שכל הממצאים בה תקינים (למשל \"תפקוד סיסטולי תקין\", NORMAL, ללא ממצא): " +
      "Severity_Code = SEV5, Diagnosis_Code = DX15, Certainty_Code = CRT2. אם בשורה יש לפחות ממצא חריג אחד " +
      "(תקין חלקית, למשל \"NORMAL LV FUNCTION. DILATED ASCENDING AORTA\") — קודד לפי הממצא החריג, ולא SEV5 " +
      "או DX15. שורת \"מחלת רקע\" — לפי כלל (5) בלבד.\n" +
      // [Task #279] ממצאים — פריט נפרד לכל ממצא בשורת מצב רפואי, עם איבר, צד ומצב איבר משלו
      "(12) שורה עם Routing_Category \"מצב רפואי\" או \"כללי\": החזר ב-Findings פריט נפרד לכל ממצא, " +
      "אבחנה או מצב שמופיעים בשורה (למשל פענוח הדמיה עם כמה ממצאים, או רשימת מחלות רקע מופרדת בפסיקים — " +
      "כל אחד פריט). שורה עם ממצא אחד — פריט אחד. כל פריט מקבל את כל שדות הסכימה. Primary_Diagnosis = הממצא " +
      "הזה בלבד, בעברית ובמונח המקורי בסוגריים אם קיים, כולל גודל אם מופיע (למשל \"הימטומה תת-קופסית 3.3 ס\"מ " +
      "באונה הימנית של הכבד\"). Organ_Code ו-Medical_System = האיבר והמערכת של הממצא הזה. Organ_Side_Code = " +
      "הצד של הממצא מקטלוג הצד (LAT1 ימין, LAT2 שמאל, LAT3 דו-צדדי, LAT0 איבר ללא צדדים); אם הצד לא מופיע או " +
      "שהטקסט סותר את עצמו לגבי הצד — ריק. Organ_State_Code = OST2 לאיבר שהוסר במלואו (\"מצב לאחר כריתת...\"), " +
      "OST1 לאיבר שהוסר חלקית, אחרת ריק. Severity_Code ו-Certainty_Code — לכל ממצא בנפרד. ממצא שמתואר כ\"שינויים " +
      "צפויים לאחר ניתוח\" — ציין זאת ב-Severity_Status. אל תמציא ממצא שאינו בשורה, אל תאחד שני ממצאים לפריט " +
      "אחד, ואל תוסיף ממצאים תקינים שאינם מופיעים בשורה. כללים (5) ו-(11) חלים על כל פריט בנפרד.\n" +
      // [Task #281] מונח קצר, גודל וגורם לכל ממצא — לכרטיס האינפוגרפי
      "(13) בכל פריט ב-Findings מלא גם: Finding_Term = מונח רפואי בינלאומי קצר באנגלית או קיצור מקובל, עד 3 " +
      "מילים, שמזהה את סוג הממצא (למשל hematoma, nodules, HH, Ca++, osteopenia, degenerative, myelolipoma, " +
      "emphysema, s/p nephrectomy, s/p sleeve, normal) — לא שם האיבר ולא תרגום של כל המשפט. Finding_Size = הגודל " +
      "כפי שמופיע במסמך, כמספר ויחידה בלי רווח (למשל 3.3cm, 15mm, 2x3cm); אם לא צוין גודל — ריק. Finding_Cause = " +
      "הגורם לממצא רק אם המסמך מציין אותו במפורש: post-op לשינוי שמתואר כצפוי או כתוצאה מניתוח, או שם החומר הפעיל " +
      "הבינלאומי של תרופה שמתוארת כגורם (למשל pembrolizumab); אם הגורם לא מצוין במפורש — ריק, אל תסיק גורם.\n" +
       "\n--- קטלוג Organ_Code (קוד=איבר) ---\n" + listOf(catalog.organ, function(o) { return o.desc; }) +
      "\n--- קטלוג Event_Code (קוד=סוג אירוע) ---\n" + listOf(catalog.eventCode, function(o) { return o.desc; }) +
      "\n--- קטלוג Specialty_Code ---\n" + listOf(catalog.specialty, function(o) { return o.raw; }) +
      "\n--- קטלוג Severity_Code ---\n" + listOf(catalog.severity, function(o) { return o.raw; }) +
      "\n--- קטלוג Diagnosis_Code ---\n" + listOf(catalog.diagnosis, function(o) { return o.raw; }) +
      "\n--- קטלוג Certainty_Code ---\n" + listOf(catalog.certainty, function(o) { return o.raw; }) +
      "\n--- קטלוג Organ_State_Code (מצב איבר — לשורות ניתוח וממצאים) ---\n" + listOf(catalog.organState, function(o) { return o.desc; }) +
      "\n--- קטלוג Organ_Side_Code (צד איבר — לשורות ניתוח וממצאים) ---\n" + listOf(catalog.organSide, function(o) { return o.desc; }) +
      "\n--- קטלוג Allergen_Code (קוד ATC=חומר — לשורות רגישות בלבד) ---\n" + listOf(catalog.allergen, function(o) { return o.raw; }) +
      "\n";
  }

  // [Task #263] שורות מעבדה ומדדים — פיצול לפריט נפרד לכל מאפיין שנמדד
  const hasLab = group.rows.some(function(r) { return r.routingCategory === "בדיקת דם"; });
  if (hasLab) {
    prompt +=
      "(8) שורה עם Routing_Category \"בדיקת דם\" (מעבדה ומדדים): החזר ב-Results פריט נפרד לכל מאפיין " +
      "שנמדד (למשל WBC, HB, GLUCOSE — כל אחד פריט). Test_Name = שם המאפיין כפי שמופיע במסמך. Category = " +
      "שם הקבוצה כפי שמופיע (למשל ביוכימיה, ספירת דם) או ריק. Value = הערך כפי שמופיע, כולל ערך טקסטואלי " +
      "(למשל \"שלילי\"). Value_Num = הערך כמספר בלבד (נקודה עשרונית), או ריק אם אינו מספרי. Unit = יחידת " +
      "המידה או ריק. Ref_Low / Ref_High = גבולות הטווח התקין כמספרים (גבול שחסר — ריק); Normal_Range = הטווח " +
      "כפי שמופיע. Status = תקין|גבוה|נמוך|לא תקין לפי הערך מול הטווח או לפי המסמך; אם אין טווח ואין " +
      "הערכה — ריק. Specimen = דם|שתן|צואה|מדידה|אחר (מדידה = מדד חיוני שנמדד בבדיקה: לחץ דם, דופק, " +
      "משקל, גובה, BMI, חום, סטורציה). לחץ דם = שני פריטים: \"לחץ דם סיסטולי\" ו\"לחץ דם דיאסטולי\", " +
      "יחידה mmHg. אל תמציא מאפיין שאינו בטקסט, ואל תחזיר פריט לסיכום כללי בלי ערך (למשל \"ביוכימיה: " +
      "לא תקינה\").\n";
  }

  // [Task #264] שורות בדיקה גנטית — פיצול לפריט נפרד לכל תכונה (אותה תבנית כמו כלל (8))
  // [Task #264] חידוד אחרי בדיקת שטח: כרטיס תכונה = פריט אחד, פאנל = כותרת הקטע,
  // המלצה מתוך "סיכום" הכרטיס, ושורת "הנחיה" באותו מסמך — פריט מאוחד אחד.
  const hasGen = group.rows.some(function(r) { return r.routingCategory === "בדיקה גנטית"; });
  if (hasGen) {
    prompt +=
      "(9) שורה עם Routing_Category \"בדיקה גנטית\": החזר ב-Results פריט נפרד לכל תכונה או גן שנבדקו " +
      "(למשל \"אומגה 3 - נטייה למחסור\", \"צפיפות העצם\" — כל אחד פריט). כרטיס תכונה אחד במסמך (כותרת אחת " +
      "עם תוצאה וסיכום) = פריט אחד בדיוק — אל תפצל כרטיס לשני פריטים גם אם משפט התוצאה מנוסח אחרת מהכותרת. " +
      "Finding = כותרת הכרטיס כפי שמופיעה במסמך. Panel_Name = כותרת הקטע שהכרטיס שייך אליו (למשל " +
      "\"פעילות גופנית\", \"העדפה לטעמים\", \"אורחות חיים\"); \"סיכום ממצאים\" היא כותרת עמוד ואינה פאנל — " +
      "בעמוד ללא כותרת קטע, Panel_Name = כותרת הקטע האחרונה שהופיעה לפניו; אם אין כלל — ריק. Clinical_Significance = " +
      "התוצאה המילולית כפי שמופיעה במסמך, מילה במילה (למשל \"אין נטייה למחסור\"). Tendency = דרגת הנטייה לפי " +
      "מילת הדרגה במסמך (גם התווית שמתחת לסרגל הדרגה), אחת מ: אין|נמוכה|בינונית|גבוהה (\"מוגברת\" → גבוהה); אם אין דרגה — ריק. Gene_Symbol = " +
      "סימול הגן לפי HGNC (למשל MTHFR), Variant_ID = מזהה dbSNP (למשל rs1801133), Genotype = הגנוטיפ (למשל C/T), " +
      "Gene_Variant = הטקסט הגולמי של הגן או הווריאנט — כל אלה רק אם מופיעים במסמך, אחרת ריק. ACMG_Class = " +
      "פתוגני|כנראה פתוגני|משמעות לא ודאית|כנראה שפיר|שפיר, רק אם הסיווג מופיע במסמך, אחרת ריק. Recommendation = " +
      "ההמלצה המעשית מתוך ה\"סיכום\" של אותו כרטיס בלבד (המשפטים שמתחילים ב\"מומלץ\", \"מומלצת\" או \"ניתן\"), " +
      "מילה במילה; אם אין — ריק. אל תמציא תכונה, גן או דרגה שאינם בטקסט.\n" +
      "(10) שורה עם Routing_Category \"הנחיה\" באותו מסמך גנטי: החזר עבורה פריט אחד בלבד (rowIndex שלה, פעם אחת), " +
      "ו-Task_Description = טקסט ההנחיה המאוחד כפי שמופיע בשורה — אל תפצל אותה להנחיה נפרדת לכל המלצה.\n";
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
// [Task #268] קריאת המסמך המקורי מ-Drive — חלק קובץ (inline_data) ל-Gemini.
// זהה ללוגיקה ב-S09 (_s09_fetchOriginalPart) — אותו דפוס כמו זוג פונקציות ה-TXT.
// ══════════════════════════════════════════════════════════════════

function _s13_fetchOriginalPart(fileId) {
  // פורמטים נתמכים ומגבלת גודל — מוגדרים כאן ולא כקבועים גלובליים.
  // 15MB: קידוד base64 מגדיל בכ-33%, כלומר כ-20MB לבקשה אחת ל-Gemini.
  // כל פורמט אחר (מסמך גוגל, Word וכו') או קובץ גדול יותר → null → חזרה ל-TXT.
  const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const maxBytes       = 15 * 1024 * 1024;
  try {
    if (!fileId) return null;
    const file     = DriveApp.getFileById(fileId);
    const mimeType = file.getMimeType();
    if (supportedTypes.indexOf(mimeType) === -1) {
      Logger.log("[S13] המסמך המקורי בפורמט לא נתמך (" + mimeType + ") — fileId: " + fileId + " — חוזר ל-TXT");
      return null;
    }
    if (file.getSize() > maxBytes) {
      Logger.log("[S13] המסמך המקורי גדול מ-15MB (" + file.getSize() + " בייט) — fileId: " + fileId + " — חוזר ל-TXT");
      return null;
    }
    return { inline_data: { mime_type: mimeType, data: Utilities.base64Encode(file.getBlob().getBytes()) } };
  } catch (e) {
    Logger.log("[S13] שגיאת קריאת המסמך המקורי — fileId: " + fileId + " | שגיאה: " + e.message + " — חוזר ל-TXT");
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// קריאת Gemini בפועל — מקבלת פרומפט מוכן (מ-_s13_buildPrompt), מחזירה
// אובייקט מפוענח {results:[{rowIndex,fields},...]} או null בכשל.
// טיפול שגיאות זהה ל-_s09_callGemini (HTTP/finishReason/JSON parse).
// ══════════════════════════════════════════════════════════════════

let _s13_lastFailReason = "";

function _s13_callGemini(prompt, originalPart) {
  let raw = null;
  _s13_lastFailReason = "";
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S13_GEMINI_MODEL + ":generateContent?key=" + apiKey;

    // [Task #268] חלק הקובץ המקורי (אופציונלי) נשלח כחלק ראשון, לפני הטקסט — כמו ב-S09
    const parts = originalPart ? [originalPart, { text: prompt }] : [{ text: prompt }];

    const payload = {
      contents: [{ parts: parts }],
      // [Task #276] responseMimeType — Gemini מחזיר JSON תקין (כולל גרשיים מסומנים בראשי תיבות עבריים), כמו S06
      generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 32768, thinkingConfig: { thinkingBudget: 0 } }
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

    // [Task #276] יומן כשל פענוח — הודעת השגיאה ו-300 תווים סביב מקום השבירה
    const logParseContext = function(err, text) {
      const m   = String(err && err.message || "").match(/position (\d+)/);
      const pos = m ? parseInt(m[1], 10) : -1;
      Logger.log("[S13] שגיאת פענוח JSON: " + (err && err.message) + " | אורך תשובה: " + text.length +
        (pos >= 0 ? " | הקשר סביב מקום " + pos + ": " + text.substring(Math.max(0, pos - 150), pos + 150) : ""));
    };

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
          logParseContext(innerErr, raw.substring(firstBrace, lastBrace + 1));
          Logger.log("[S13] חילוץ תת-מחרוזת JSON נכשל גם הוא — raw (1000 תווים ראשונים): " +
            raw.substring(0, 1000));
          return null;
        }
      }
      _s13_lastFailReason = "JSON_PARSE";
      logParseContext(parseErr, raw);
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

    case "בדיקת דם": {
      // [Task #263] שורה אחת לכל תוצאה (fields = פריט בודד מ-Results), 19 עמודות:
      // Test_Date | Test_Name | Category | Value | Normal_Range | Status | Doctor_Note |
      // Source_URL | File_ID | Doc_Issuer | Medical_System | LOINC_Code | Panel_Code |
      // Specimen | Value_Num | Unit | Ref_Low | Ref_High | Enrich_Status.
      // Medical_System, LOINC_Code, Panel_Code ו-Enrich_Status נשארים ריקים — S15
      // ממלא אותם מהקטלוג (בוטל "דם תמיד SYS06"). Specimen מחוץ לרשימה → "אחר".
      const specimenRaw = (fields.Specimen || "").toString().trim();
      const specimen    = S13_LAB_SPECIMENS.indexOf(specimenRaw) !== -1 ? specimenRaw : "אחר";
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
        "",
        "",
        "",
        specimen,
        _s13_toNumber(fields.Value_Num),
        fields.Unit || "",
        _s13_toNumber(fields.Ref_Low),
        _s13_toNumber(fields.Ref_High),
        ""
      ];
    }

    case "בדיקה גנטית": {
      // [Task #264] שורה אחת לכל תכונה (fields = פריט בודד מ-Results), 17 עמודות:
      // Test_Date | Panel_Name | Gene_Variant | Finding | Clinical_Significance |
      // Recommendation | Source_URL | File_ID | Medical_System | Trait_Code |
      // Panel_Code | Tendency | Gene_Symbol | Variant_ID | Genotype | ACMG_Class |
      // Enrich_Status. Medical_System, Trait_Code, Panel_Code ו-Enrich_Status נשארים
      // ריקים — S15 ממלא מהקטלוג (בוטל "גנטיקה תמיד SYS14"). Finding = שם התכונה,
      // Clinical_Significance = התוצאה המילולית כפי שבמסמך; Tendency מנורמלת לסולם
      // הסגור (_s13_genTendency); ACMG_Class רק מתוך 5 הדרגות, אחרת ריק.
      const acmgRaw = (fields.ACMG_Class || "").toString().trim();
      return [
        _s13_normalizeDate(ctx.eventDate),
        fields.Panel_Name || "",
        fields.Gene_Variant || "",
        fields.Finding || "",
        fields.Clinical_Significance || "",
        fields.Recommendation || "",
        sourceUrl,
        ctx.fileId,
        "",
        "",
        "",
        _s13_genTendency(fields.Tendency),
        fields.Gene_Symbol || "",
        fields.Variant_ID || "",
        fields.Genotype || "",
        S13_GEN_ACMG.indexOf(acmgRaw) !== -1 ? acmgRaw : "",
        ""
      ];
    }

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
      // File_ID | Medical_System | Specialty_Code | Severity_Code | Diagnosis_Code | Organ_Code |
      // Organ_State_Code | Organ_Side_Code ([Task #224] ניתוח; [Task #279] גם ממצאים) |
      // Allergen_Code | Reaction ([Task #262] — רק בשורת רגישות A7, אחרת ריקים) |
      // Finding_Term | Finding_Size | Finding_Cause ([Task #281] — מונח קצר, גודל וגורם לכל ממצא, או ריק).
      // S_Row מחושב ע"י VIEWENGINE (refreshMedicalStatusRows) — נשאר ריק כאן.
      // Medical_System_Name נגזר מקוד המערכת הסופי (לא מהטקסט החופשי של S09).
      const cat       = ctx.catalog || {};
      const rawSys    = (fields.Medical_System || "").toString().trim();
      const sysCode   = S13_BODY_SYSTEMS[rawSys] ? rawSys : "SYS00";
      const organ     = _s13_validateCode(cat.organ,     fields.Organ_Code, sysCode);
      const eventCode = _s13_validateCode(cat.eventCode, fields.Event_Code);
      const specialty = _s13_validateCode(cat.specialty, fields.Specialty_Code);
           // [Task #223] מחלת רקע — חומרה ריקה, ודאות נאכפת ל-CRT4 ("רקע ידוע") בלי קשר לתשובת Gemini
      const isBackground = (ctx.eventType || "").toString().trim() === "מחלת רקע";
      const severity  = isBackground ? null : _s13_validateCode(cat.severity,  fields.Severity_Code);
      const diagnosis = _s13_validateCode(cat.diagnosis, fields.Diagnosis_Code);
      const certainty = _s13_validateCode(cat.certainty, isBackground ? "CRT4" : fields.Certainty_Code);
      // [Task #224] מצב וצד איבר — רק קוד שקיים בקטלוג (אחרת ריק)
      // [Task #279] לא רק בשורת ניתוח — גם בכל ממצא של מצב רפואי (מצב וצד לכל ממצא)
      const organState = _s13_validateCode(cat.organState, fields.Organ_State_Code);
      const organSide  = _s13_validateCode(cat.organSide,  fields.Organ_Side_Code);
      // [Task #262] חומר גורם ותגובה — רק בשורת רגישות (קוד אירוע A7 מאומת מול הקטלוג),
      // וקוד החומר רק אם קיים בקטלוג התרופות (אחרת ריק — שם החומר נשאר ב-Primary_Diagnosis)
      const isAllergy = !!eventCode && eventCode.code.indexOf(S13_ALLERGY_EVENT_CODE_PREFIX) === 0;
      const allergen  = isAllergy ? _s13_validateCode(cat.allergen, fields.Allergen_Code) : null;
      const reaction  = isAllergy ? (fields.Reaction || "").toString().trim() : "";
      return [
        _s13_normalizeDate(ctx.eventDate),
        ctx.eventType || "",
        fields.Primary_Diagnosis || "",
        isBackground ? "" : (fields.Severity_Status || ""),
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
        organ     ? organ.code     : "",
        organState ? organState.code : "",
        organSide  ? organSide.code  : "",
        allergen   ? allergen.code   : "",
        reaction,
        (fields.Finding_Term  || "").toString().trim(),
        (fields.Finding_Size  || "").toString().trim(),
        (fields.Finding_Cause || "").toString().trim()
      ];
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// [Task #263] מעבדה ומדדים — סוגי דגימה מותרים, והמרת ערך למספר
// (מחרוזת עם פסיק עשרוני או רווחים → מספר; ערך לא מספרי → ריק)
// ══════════════════════════════════════════════════════════════════

const S13_LAB_SPECIMENS = ["דם", "שתן", "צואה", "מדידה", "אחר"];

// [Task #264] גנטיקה — דרגות נטייה (סולם 4 דרגות) וסיווג ACMG (5 דרגות).
// ערך מחוץ לרשימה (אחרי נרמול מילים נרדפות) נכתב ריק.
const S13_GEN_TENDENCIES = ["אין", "נמוכה", "בינונית", "גבוהה"];
const S13_GEN_TENDENCY_SYNONYMS = { "מוגברת": "גבוהה", "גבוה": "גבוהה", "בינוני": "בינונית", "נמוך": "נמוכה" };
const S13_GEN_ACMG = ["פתוגני", "כנראה פתוגני", "משמעות לא ודאית", "כנראה שפיר", "שפיר"];

function _s13_toNumber(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return isFinite(value) ? value : "";
  const s = value.toString().trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return "";
  return parseFloat(s);
}

// [Task #264] נרמול דרגת נטייה לסולם הסגור — ערך לא מוכר → ריק
function _s13_genTendency(value) {
  const s = (value || "").toString().trim();
  if (S13_GEN_TENDENCIES.indexOf(s) !== -1) return s;
  return S13_GEN_TENDENCY_SYNONYMS[s] || "";
}

// ══════════════════════════════════════════════════════════════════
// כתיבת שורה בודדת לגליון היעד המתאים, לפי S13_TARGET_SHEETS
// [Task #263] בדיקת דם — שורה לכל פריט ב-Results, בכתיבה מרוכזת אחת
// [Task #264] בדיקה גנטית — אותו מסלול: שורה לכל תכונה ב-Results
// ══════════════════════════════════════════════════════════════════

// [Task #281] מחזירה את מספר שורות היעד שנכתבו בפועל (0 = כישלון)
function _s13_writeExtractedRow(ss, routingCategory, fields, ctx) {
  const targetSheetName = S13_TARGET_SHEETS[routingCategory] || S13_TARGET_SHEETS["כללי"];
  const sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) {
    Logger.log("[S13] גליון יעד לא נמצא: " + targetSheetName + " (routingCategory: " + routingCategory + ")");
    return 0;
  }

  if (routingCategory === "בדיקת דם" || routingCategory === "בדיקה גנטית") {
    const isGen = routingCategory === "בדיקה גנטית";
    const items = Array.isArray(fields.Results) ? fields.Results : [fields];
    const listRows = items.filter(function(it) {
      if (!it) return false;
      return isGen
        ? ((it.Finding || "").toString().trim() || (it.Gene_Symbol || "").toString().trim())
        : ((it.Test_Name || "").toString().trim() || (it.Value || "").toString().trim());
    }).map(function(it) {
      return _s13_buildRowValues(routingCategory, it, ctx);
    });
    if (listRows.length === 0) {
      Logger.log("[S13] אין " + (isGen ? "תכונות גנטיות" : "תוצאות מעבדה") + " לכתיבה | File_ID: " + ctx.fileId);
      return 0;
    }
    sheet.getRange(sheet.getLastRow() + 1, 1, listRows.length, listRows[0].length).setValues(listRows);
    Logger.log("[S13] נכתבו " + listRows.length + (isGen ? " תכונות" : " תוצאות") + " ל-" + targetSheetName + " | File_ID: " + ctx.fileId);
    return listRows.length;
  }

  // [Task #279] ממצאים — שורה לכל פריט ב-Findings ביומן_מצב_רפואי, בכתיבה מרוכזת אחת
  // (אותה תבנית כמו בדיקת דם). שורת ניתוח נשארת שורה אחת. תאימות לאחור: תשובה
  // בלי Findings (פריט בודד) נכתבת כשורה אחת כמו קודם.
  if (targetSheetName === "יומן_מצב_רפואי" && routingCategory !== "ניתוח/פעולה רפואית" &&
      Array.isArray(fields.Findings)) {
    const findingRows = fields.Findings.filter(function(it) {
      return it && (it.Primary_Diagnosis || "").toString().trim();
    }).map(function(it) {
      return _s13_buildRowValues(routingCategory, it, ctx);
    });
    if (findingRows.length === 0) {
      Logger.log("[S13] אין ממצאים לכתיבה ב-Findings | File_ID: " + ctx.fileId);
      return 0;
    }
    sheet.getRange(sheet.getLastRow() + 1, 1, findingRows.length, findingRows[0].length).setValues(findingRows);
    Logger.log("[S13] נכתבו " + findingRows.length + " ממצאים ל-" + targetSheetName + " | File_ID: " + ctx.fileId);
    return findingRows.length;
  }

  const rowValues = _s13_buildRowValues(routingCategory, fields, ctx);
  sheet.appendRow(rowValues);
  Logger.log("[S13] נכתבה שורה ל-" + targetSheetName + " | File_ID: " + ctx.fileId);
  return 1;
}
// ══════════════════════════════════════════════════════════════════
// עיבוד קבוצה מלאה: פרומפט → Gemini → (fallback ל-TXT אם חלקי) →
// כתיבה לגליונות היעד → סימון Extraction_Status="חולץ" על כל שורה
// שטופלה בהצלחה. מחזירה {success, written, failed, targetRows}.
// [Task #281] written = שורות מקור שחולצו | targetRows = שורות יעד שנכתבו בפועל
// ══════════════════════════════════════════════════════════════════

function _s13_processGroup(ss, sourceSheet, group) {
  // [Task #220 שלב ב] קטלוג מיפוי_קודים — נטען פעם אחת לכל מסמך (File_ID)
  const catalog = _s13_loadCatalog();

  // [Task #264] בדיקה גנטית ובדיקת דם (רשימת תוצאות) — המסמך עצמו הוא מקור
  // הנתונים (פאנל, המלצה לכל תכונה, גן, טווחים), ולא רק סיכום שורת היומן.
  // לכן המסמך המקורי מצורף כבר בקריאה הראשונה. שאר הסוגים — ללא שינוי.
  const needsDocument = group.rows.some(function(r) {
    return r.routingCategory === "בדיקה גנטית" || r.routingCategory === "בדיקת דם";
  });
  let originalPart = needsDocument ? _s13_fetchOriginalPart(group.fileId) : null;

  let prompt;
  let response;

  if (originalPart) {
    prompt   = _s13_buildPrompt(group, "המסמך המקורי מצורף לבקשה זו כקובץ — הוא המקור העיקרי: חלץ ממנו את כל השדות שבסכימה, גם אם אינם מופיעים בשורות לעיל.", catalog);
    response = _s13_callGemini(prompt, originalPart);
    Logger.log("[S13] File_ID " + group.fileId + " — קריאה ראשונה עם המסמך המקורי (רשימת תוצאות)");
  } else {
    prompt   = _s13_buildPrompt(group, null, catalog);
    response = _s13_callGemini(prompt);
  }

  let results = response && response.results;
  const incomplete = !results || results.length < group.rows.length;

  // חלופה א' — נופל להקשר המסמך המלא רק אם התשובה חלקית/ריקה.
  // [Task #268] קודם המסמך המקורי (PDF/תמונה) מצורף כקובץ; טקסט ה-TXT רק אם
  // המקור לא זמין (פורמט לא נתמך, קובץ מעל 15MB או כשל קריאה) — כמו ב-S09.
  // [Task #264] אם המקור כבר נקרא בקריאה הראשונה — אותו קובץ משמש שוב (ללא קריאה נוספת מ-Drive).
  if (incomplete) {
    Logger.log("[S13] File_ID " + group.fileId + " — תשובה חלקית/ריקה (סיבה: " +
      (_s13_lastFailReason || "תוצאות חסרות") + "), מנסה שוב עם המסמך המקורי (או TXT כגיבוי)");

    originalPart = originalPart || _s13_fetchOriginalPart(group.fileId);

    if (originalPart) {
      prompt   = _s13_buildPrompt(group, "המסמך המקורי מצורף לבקשה זו כקובץ — חפש בו את הפרט החסר.", catalog);
      response = _s13_callGemini(prompt, originalPart);
      results  = response && response.results;
      Logger.log("[S13] File_ID " + group.fileId + " — ניסיון חוזר עם המסמך המקורי");
    } else {
      const txtUrl     = _s13_fetchTxtUrlByFileId(group.fileId);
      const fallbackTxt = txtUrl ? _s13_fetchTxtContent(txtUrl) : null;

      if (fallbackTxt) {
        prompt   = _s13_buildPrompt(group, fallbackTxt, catalog);
        response = _s13_callGemini(prompt);
        results  = response && response.results;
        Logger.log("[S13] File_ID " + group.fileId + " — ניסיון חוזר עם TXT (גיבוי)");
      }
    }
  }

  if (!results || results.length === 0) {
    Logger.log("[S13] File_ID " + group.fileId + " — כשל מלא, אין תוצאות לכתיבה (סיבה: " +
      (_s13_lastFailReason || "לא ידועה") + ")");
    return { success: false, written: 0, failed: group.rows.length, targetRows: 0 };
  }

  let written    = 0;
  let failed     = 0;
  let targetRows = 0;

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

    const rowsWritten = _s13_writeExtractedRow(ss, eventRow.routingCategory, result.fields || {}, ctx);

    if (rowsWritten > 0) {
      sourceSheet.getRange(eventRow.row, 9).setValue("חולץ"); // I = Extraction_Status
      written++;
      targetRows += rowsWritten;
    } else {
      failed++;
    }
  });

  Logger.log("[S13] File_ID " + group.fileId + " הושלם — חולצו: " + written + " | שורות יעד: " + targetRows + " | נכשלו: " + failed);
  return { success: written > 0, written: written, failed: failed, targetRows: targetRows };
}