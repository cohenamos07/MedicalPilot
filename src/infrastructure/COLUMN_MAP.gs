/**
 * MedicalPilot — COLUMN_MAP.gs
 * @version 2.18.0 | @updated 09/11/2026 11:25 | @service COLUMN_MAP
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/COLUMN_MAP.gs
 * @description מאגר עמודות מרכזי — Single Source of Truth לכל גיליוני המערכת.
 * @impacts גיליונות: ניהול_מיילים (27 עמודות), דוגמאות_למידה, מנהל_משאבים, S10, מסנכרן_קבצים,
 *          יומן_אירועים_רפואי (12 עמודות — [v2.10.0] עודכן מ-11, Task #205:
 *          נוספה S_Row בעמודה 7 [writers: VIEWENGINE], File_ID הוזז לעמודה 12).
 *          [v2.11.0] יומן_מצב_רפואי מתועד עכשיו כ-21 עמודות (היה 15 — כלל 3
 *          שדות שהוסרו בפועל: ET_CODE/Body_System_Normalized/Event_Type_
 *          Normalized). מיפוי_קודים מתועד עכשיו כ-29 עמודות, 6 בלוקים
 *          (איברים A-D/אירועים E-I/התמחות J-N/חומרה O-S/אבחנה T-X/וודאות
 *          Y-AC), במקום 4 עמודות שטוחות Type|Key. תיעוד בלבד — עדכון
 *          בדיעבד למבנה שכבר קיים בייצור מ-10/09/2026 (task214a/task215a).
 *          [v2.11.1] יומן_מצב_רפואי — 22 עמודות: נוספה Organ_Code (עמודה 22,
 *          writers: S16), Task #219.
 *          [v2.12.0] יומן_מצב_רפואי — 24 עמודות: נוספו Organ_State_Code (23)
 *          ו-Organ_Side_Code (24), writers: S13+S16, Task #224. מיפוי_קודים —
 *          39 עמודות, 8 בלוקים: נוספו מצב_איבר AD-AH ו-צד_איבר AI-AM.
 *          [v2.13.0] Task #256 (שלב 5) — תרופות_קבועות: 19 עמודות (היה 12) —
 *          נוספו M-S (ATC_Code | Dose_Amount | Dose_Unit | Times_Per_Day |
 *          Days_Per_Week | Enrich_Status | Treatment_Type), writers: S15.
 *          B, E ו-L — writers: S13+S15 (S15 כותב באישור). מיפוי_קודים — 58
 *          עמודות, 9 בלוקים: נוספו רזרבה AN-AZ (Reserved_01-13) ובלוק תרופות
 *          BA-BF (מפתח = קוד ATC), writers: S15+עמוס, readers: S15.
 *          [v2.14.0] Task #261 (שלב 5) — הנחיות_רפואיות_ומשימות: 13 עמודות (היה 9)
 *          — נוספו J-M (Instruction_Code | Instruction_Kind | Target_Code |
 *          Enrich_Status), writers: S15. E, F ו-I — writers: S13+S15 (S15 כותב
 *          באישור); F — ערכים פתוח|בוצע|בוטל. מיפוי_קודים — 63 עמודות: נוסף בלוק
 *          סוגי_הנחיות BX-CB (76-80, מפתח = INS00-INS09, רשימה סגורה), writers:
 *          עמוס, readers: S15. BG-BW (59-75) שמורות ל-Task #263/#264 — לא נרשמו.
 *          [v2.15.0] Task #262 — יומן_מצב_רפואי: 26 עמודות (היה 24) — נוספו
 *          Allergen_Code (25, קוד ATC מבלוק התרופות BA) ו-Reaction (26), writers:
 *          S13+S16, רק בשורות קוד אירוע A7. מיפוי_קודים — בלוק אירועים E-I מתועד
 *          כ-A0-A7 (נוספה משפחת A7 רגישויות ואלרגיות: A7A/A7B/A7C).
 *          [v2.16.0] Task #263 (שלב 6) — בדיקות_דם: 19 עמודות (היה 11) — נוספו
 *          L-S (LOINC_Code | Panel_Code | Specimen | Value_Num | Unit | Ref_Low |
 *          Ref_High | Enrich_Status), שורה לכל תוצאה; K — בוטל "תמיד SYS06" (S15
 *          כותב מהקטלוג). מיפוי_קודים — 74 עמודות: נוספו בלוק מאפייני_מעבדה BG-BL
 *          (59-64, מפתח = קוד LOINC, writers: S15+עמוס) ובלוק פאנלים BS-BW (71-75,
 *          PNL-L00-PNL-L16, רשימה סגורה, writers: עמוס). BM-BR (65-70) שמורות ל-#264.
 *          [v2.17.0] Task #264 (שלב 5) — בדיקות_גנטיות: 17 עמודות (היה 9) — נוספו
 *          J-Q (Trait_Code | Panel_Code | Tendency | Gene_Symbol | Variant_ID |
 *          Genotype | ACMG_Class | Enrich_Status), שורה לכל תכונה; I — בוטל "תמיד
 *          SYS14" (S15 כותב מהקטלוג). מיפוי_קודים — 86 עמודות: נוספו בלוק
 *          תכונות_גנטיות BM-BR (65-70, מפתח = GTR-nnn, writers: S15+עמוס) ובלוק
 *          גנים CC-CH (81-86, מפתח = סמל גן HGNC, writers: S15+עמוס). בלוק פאנלים
 *          BS-BW כולל עכשיו גם PNL-G00-PNL-G09.
 *          [v2.18.0] Task #277 — S10_למידה_רפואי הוסר (הגליון נמחק; הלמידה נמצאת
 *          בדוגמאות_למידה_S10 מאז Task 185). מסנכרן_קבצים — 15 עמודות A-O בפועל
 *          (היה 11 בשמות ישנים), writers: DEV_SYNC, כותרות בשורה 4.
 *          [v2.9.4] תרופות_קבועות (11), יומן_מצב_רפואי (11), בדיקות_דם (10),
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
 *          [v2.13.0] S15_EnrichCatalog (SHEET_CONFIG) — עמודות תרופות_קבועות M-S ובלוק BA-BF במיפוי_קודים
 *          [v2.14.0] S15_EnrichCatalog (SHEET_CONFIG) — עמודות הנחיות_רפואיות_ומשימות J-M ובלוק BX-CB במיפוי_קודים
 *          [v2.16.0] S15_EnrichCatalog (SHEET_CONFIG) — עמודות בדיקות_דם K-S ובלוקים BG-BL ו-BS-BW במיפוי_קודים
 *          [v2.17.0] S15_EnrichCatalog (SHEET_CONFIG) — עמודות בדיקות_גנטיות I-Q ובלוקים BM-BR ו-CC-CH במיפוי_קודים
 * @functions SHEET_CONFIG, SHEETS_MAP, SHEETS_DEFAULT_DATA,
 *            insertEditorGitLinesColumns, printSheetMap, printColumnDetail,
 *            restoreHeaders, checkWritePermissions, buildSheetFromMap,
 *            buildS10LearningSheet, buildDevSyncSheet,
 *            _promptSheetName, _colToLetter, _letterToCol, _medDate_normalizeDate
 *            [v2.18.0] buildS10LearningSheet הוסרה (Task #277).
 * @changes [v2.18.0] Task #277 — ניקוי והשוואה למבנה בפועל, אין שינוי בשירותי ה-Pipeline.
 *          SHEETS_MAP["S10_למידה_רפואי"] הוסר (11 שורות) — הגליון נמחק ב-08/11/2026,
 *          אף שירות לא קרא או כתב אליו (S10 כותב לדוגמאות_למידה_S10, S09 קורא ממנו).
 *          buildS10LearningSheet הוסרה — הייתה יוצרת את הגליון מחדש אם הורצה.
 *          SHEETS_MAP["מסנכרן_קבצים"]: 11→15 עמודות — שמות וסדר לפי devSync_RunScanButton
 *          (DevSyncInspector.gs v3.5): File_Name | View_Summary | Updated_Editor |
 *          Updated_Git | Editor_Lines | Git_Lines | Version_Editor | Version_Git |
 *          Service_Editor | Service_Git | Sync_Status (K) | System_Notes | System_Path |
 *          Git_Raw_Link | Git_Web_Link; writers: ["DEV_SYNC"]. buildDevSyncSheet —
 *          כותרות בשורה 4 והקפאת 4 שורות (היה שורה 1), כמו בגליון בפועל; שורות 1-3
 *          לאייקונים (setupDevSyncIcons, ViewEngine.gs v2.12.0). הערות כללי הכתיבה
 *          ו-SHEET_CONFIG עודכנו (S10 → דוגמאות_למידה_S10). אומת מול הקוד החי (diff
 *          מדויק לכל בלוק, node --check, טעינת המפה: 15 עמודות במסנכרן_קבצים, אין
 *          S10_למידה_רפואי) ובבדיקה פונקציונלית (הדפסת מבנה גיליון — 15 עמודות).
 * @changes [v2.17.0] Task #264 (שלב 5) — תיעוד מבני בלבד, אין שינוי לוגי.
 *          SHEETS_MAP["בדיקות_גנטיות"]: 9→17 עמודות — נוספו 10-17 (J-Q): Trait_Code,
 *          Panel_Code (PNL-G00-PNL-G09), Tendency (אין|נמוכה|בינונית|גבוהה),
 *          Gene_Symbol, Variant_ID, Genotype, ACMG_Class (5 דרגות), Enrich_Status
 *          (הוצע|מאומת), כפי שנכתבים ב-S13 v1.10.0 וב-S15 v1.7.0. I (Medical_System):
 *          writers הורחב ל-["S13","S15"], ההערה "תמיד SYS14" (Task #188) סומנה
 *          כמבוטלת — נשארה לתיעוד. נוספו readers: ["S15"] לעמודות ש-S15 קורא
 *          (A-G, I-Q). SHEETS_MAP["מיפוי_קודים"]: 74→86 עמודות — בלוק תכונות_גנטיות
 *          65-70 (BM-BR: Trait_Code | Normalized_Value | Description | Raw_Value |
 *          Icon_Link | Medical_System) ובלוק גנים 81-86 (CC-CH: Gene_Symbol |
 *          Normalized_Value | Description | Raw_Value | Icon_Link | Medical_System);
 *          עמודה 71 (Panel_Code) — טווח הערכים כולל PNL-G00-PNL-G09; הערת העמודות
 *          השמורות הוסרה — כל 86 העמודות רשומות. ללא שינוי בקוד restoreHeaders
 *          (חלופה א). אומת מול הקוד החי (diff מדויק, node --check, טעינת המפה: 17
 *          ו-86 עמודות, מספור רציף) ומול הגליון החי: 17 מתוך 17 שמות בבדיקות_גנטיות
 *          ו-86 מתוך 86 במיפוי_קודים זהים לשורה 4; בבדיקה פונקציונלית (הדפסת מבנה
 *          גיליון — J-Q ו-CC-CH מוצגות).
 * @changes [v2.16.0] Task #263 (שלב 6) — תיעוד מבני בלבד, אין שינוי לוגי.
 *          SHEETS_MAP["בדיקות_דם"]: 11→19 עמודות — נוספו 12-19 (L-S): LOINC_Code,
 *          Panel_Code, Specimen (דם|שתן|צואה|מדידה|אחר), Value_Num, Unit, Ref_Low,
 *          Ref_High, Enrich_Status (הוצע|מאומת), כפי שנכתבים ב-S13 v1.8.0 וב-S15
 *          v1.5.0. K (Medical_System): writers הורחב ל-["S13","S15"], ההערה "תמיד
 *          SYS06" (Task #188) סומנה כמבוטלת — נשארה לתיעוד. נוספו readers: ["S15"]
 *          לכל העמודות ש-S15 קורא (A-H, J-S). SHEETS_MAP["מיפוי_קודים"]: 63→74
 *          עמודות — בלוק מאפייני_מעבדה 59-64 (BG-BL: LOINC_Code | Normalized_Value |
 *          Description | Raw_Value | Icon_Link | Medical_System) ובלוק פאנלים 71-75
 *          (BS-BW: Panel_Code | Normalized_Value | Description | Raw_Value |
 *          Icon_Link); הערת העמודות השמורות עודכנה — רק BM-BR (65-70) ל-#264.
 *          אומת מול הקוד החי (diff מדויק, טעינת המפה בהדמיה: 19 ו-74 עמודות) ומול
 *          הגליון החי: 19 מתוך 19 שמות בבדיקות_דם ו-11 מתוך 11 בבלוקים החדשים זהים
 *          לשורה 4.
 * @changes [v2.15.0] Task #262 — תיעוד מבני בלבד, אין שינוי לוגי.
 *          SHEETS_MAP["יומן_מצב_רפואי"]: 24→26 עמודות — נוספו 25 Allergen_Code
 *          (קוד ATC מבלוק התרופות BA במיפוי_קודים או ריק) ו-26 Reaction (טקסט
 *          חופשי), writers: ["S13","S16"], מתמלאות רק בשורות קוד אירוע A7.
 *          SHEETS_MAP["מיפוי_קודים"] עמודה 5 (Event_Code): הערה וטווח ערכים
 *          עודכנו מ-A0-A4 ל-A0-A7. אומת מול הקוד החי (diff, node --check) ובבדיקת
 *          שטח: שורה 28 ביומן_מצב_רפואי נכתבה ע"י S13 ואושרה ב-S16 עם C10AA01 /
 *          "כאבי שרירים" בעמודות Y-Z.
 * @changes [v2.14.0] Task #261 (שלב 5) — תיעוד מבני בלבד, אין שינוי לוגי.
 *          SHEETS_MAP["הנחיות_רפואיות_ומשימות"]: 9→13 עמודות — נוספו 10-13 (J-M),
 *          writers: ["S15"], כולל ערכי Instruction_Kind (מתמשכת|משימה),
 *          Target_Code (התמחות / ATC / ריק) ו-Enrich_Status (הוצע|מאומת) כפי
 *          שמוגדרים ב-S15. E, F, I: writers הורחב ל-["S13","S15"]; F — נוסף
 *          הערך "בוטל". נוספו readers: ["S15"] לעמודות ש-S15 קורא (A-G, I-M).
 *          SHEETS_MAP["מיפוי_קודים"]: 58→63 עמודות — בלוק סוגי_הנחיות 76-80
 *          (BX-CB: Instruction_Code | Normalized_Value | Description |
 *          Raw_Value | Icon_Link); בלוק התמחות J-N — readers: ["S15"] ב-10, 11,
 *          13 (קודי יעד להנחיות). עמודות 59-75 לא נרשמו (חלופה א, החלטת עמוס
 *          28/10/2026) — יירשמו עם בלוקי #263/#264. אומת מול הקוד החי (diff,
 *          node --check, טעינת המפה: 13 ו-63 עמודות, 76 מתוך 76 שמות זהים לשורה
 *          4 בגליון החי) ובבדיקה פונקציונלית (הדפסת מבנה גיליון — J-M ו-BX-CB
 *          מוצגות).
 * @changes [v2.13.0] Task #256 (שלב 5) — תיעוד מבני בלבד, אין שינוי לוגי.
 *          SHEETS_MAP["תרופות_קבועות"]: 12→19 עמודות — נוספו 13-19 (M-S),
 *          writers: ["S15"], כולל ערכי Enrich_Status (הוצע|מאומת) ו-
 *          Treatment_Type (כרוני|זמני|לפי הצורך) כפי שמוגדרים ב-S15. B, E, L:
 *          writers הורחב ל-["S13","S15"]; הערת L עודכנה — מבטלת את "תמיד
 *          SYS00" (Task #188): S13 כותב SYS00 כברירת מחדל, באישור S15 נגזר
 *          מהקבוצה הטיפולית בקטלוג. נוספו readers: ["S15"] לעמודות ש-S15 קורא.
 *          SHEETS_MAP["מיפוי_קודים"]: 39→58 עמודות — רזרבה 40-52 (AN-AZ,
 *          Reserved_01-13) ובלוק תרופות 53-58 (BA-BF: ATC_Code |
 *          Normalized_Value | Description | Raw_Value | Icon_Link |
 *          Medical_System). העמודות והכותרות נוספו בגליון החי ע"י עמוס
 *          (26/10/2026). אומת מול הקוד החי (diff מדויק, node --check, טעינת
 *          המפה: 19 ו-58 עמודות, מספור רציף, 77 מתוך 77 שמות זהים לשורה 4
 *          בגליון החי) ובבדיקה פונקציונלית (הדפסת מבנה גיליון — M-S מוצגות).
 * @changes [v2.12.0] Task #224 (שלב 2) — SHEETS_MAP["יומן_מצב_רפואי"]: נוספו
 *          עמודות 23 = Organ_State_Code (OST0-OST2) ו-24 = Organ_Side_Code
 *          (LAT0-LAT3), zone: טכני, writers: ["S13","S16"] — מצב וצד איבר אחרי
 *          ניתוח; מתמלאות רק בשורות ניתוח, ריק = אין מידע. SHEETS_MAP["מיפוי_
 *          קודים"]: נוספו בלוק מצב_איבר (עמ' 30-34, AD-AH) ובלוק צד_איבר (עמ'
 *          35-39, AI-AM), באותו מבנה 5 עמודות כמו שאר הבלוקים; Raw_Value = מילות
 *          מפתח להצעה ב-S16. הבלוקים והכותרות W4:X4 נוספו בגליון החי ע"י עמוס
 *          (22/10/2026). S13/S16/ViewEngine עוד לא קוראים/כותבים לעמודות — שלבים
 *          3-5 של המשימה. אומת מול הקוד החי (diff מדויק, node --check, טעינת
 *          המפה: 24 עמודות ביומן_מצב_רפואי, 39 במיפוי_קודים).
 * @changes [v2.11.1] Task #219 — SHEETS_MAP["יומן_מצב_רפואי"]: נוספה עמודה
 *          22 = Organ_Code (zone: טכני, writers: ["S16"]) — תת-קוד איבר מבלוק
 *          איברים A-D במיפוי_קודים (למשל SYS12A ערמונית), נבחר ב-S16 מתוך
 *          האיברים של Medical_System; ריק = ללא איבר. נקרא ע"י הכרטיס
 *          האינפוגרפי (runInfographicIconMedicalStatus_LAB, ViewEngine.gs).
 *          העמודה נוספה בגליון החי ע"י עמוס (כותרת V4, צבע כמו R4-U4).
 *          S13 ממשיך לכתוב 21 ערכים בשורה חדשה — עמודה 22 נשארת ריקה עד
 *          אימות ב-S16. אומת מול הקוד החי (diff מדויק, node --check).
 * @changes [v2.11.0] Task #214 (המשך) — עדכון SHEETS_MAP["יומן_מצב_רפואי"]
 *          ו-SHEETS_MAP["מיפוי_קודים"] (תיעוד בלבד, אין שינוי לוגי). התיעוד
 *          היה שקרי כמעט שבוע — תיאר מבנה ישן (15 עמודות / 4 עמודות שטוחות
 *          Type|Key) בזמן שהייצור עבר מיגרציה חד-פעמית (task214a/task215a,
 *          10/09/2026) למבנה החדש. מקור האמת לכל שדה: _s13_buildRowValues
 *          (S13_ExtractMedical.gs) + אינדקסי refreshMedicalStatusRows
 *          (ViewEngine.gs) עבור יומן_מצב_רפואי; task215a_migrateCodeMap
 *          SheetToProduction (QA_Tests.gs) עבור מיפוי_קודים — נקרא ישירות
 *          מהקוד שבנה את הגליון בפועל, לא הונח. אומת מול הקוד החי (diff
 *          מדויק אחרי הדבקה) וגם מול צילומי-מסך של עמוס מהגליון החי בייצור
 *          (S_Row=6/68 תואם בדיוק לחפיפת 10/09 — מאשר שזה הגליון האמיתי).
 *          ממצא צד שהתגלה באימות: onEdit (_labJournal_autoFillClassification
 *          Code, QA_Tests.gs) עדיין בדוק לגליון הניסוי בלבד ("ניסוי_ יומן_
 *          מצב_רפואי"/"ניסוי_מיפוי_קודים") — לא פעיל על הייצור, בניגוד
 *          לכתוב בחפיפת 10/09 שהוא "הורחב לפעול על שני היומנים". תועד
 *          בהערות השדות (Specialty_Code/Severity_Code/Diagnosis_Code) —
 *          לא תוקן, מחוץ לתחום המשימה הזו (ממתין לבניית S16 מחדש).
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
S10      — כותב רק לגליון דוגמאות_למידה_S10 (Task 185; הגליון הישן הוסר ב-Task #277)
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
  // מחליף בפועל את S10_למידה_רפואי הישן (הגליון וההגדרה שלו הוסרו ב-Task #277)
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
    { col: 1,  name: "Drug_Name",         zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",        notes: "שם מסחרי של התרופה. [Task #256] S15 מחפש לפיו בקטלוג (מיפוי_קודים BA-BF) ומוסיף אותו ל-Raw_Value בקטלוג באישור" },
    { col: 2,  name: "Active_Ingredient", zone: "אירוע", writers: ["S13","S15"], readers: ["S15"], values: "טקסט חופשי",  notes: "החומר הפעיל, אם צוין במסמך. [Task #256] S15 כותב באישור (s15_approve) את שם החומר מהקטלוג, אם לא ריק" },
    { col: 3,  name: "Dosage",            zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",        notes: "לדוגמה: 25 mg. [Task #256] מקור הפירוק ל-Dose_Amount / Dose_Unit (עמ' 14-15)" },
    { col: 4,  name: "Frequency",         zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",        notes: "לדוגמה: 1 ביום. [Task #256] מקור הפירוק ל-Times_Per_Day / Days_Per_Week (עמ' 16-17)" },
    { col: 5,  name: "Treatment_Reason",  zone: "אירוע", writers: ["S13","S15"], readers: ["S15"], values: "טקסט חופשי",  notes: "האבחנה/הסיבה למרשם. [Task #256] S15 כותב באישור את הערך שאושר בחלון S16" },
    { col: 6,  name: "Start_Date",        zone: "אירוע", writers: ["S13"], readers: [], values: "תאריך DD/MM/YYYY",  notes: "אם צוין במסמך" },
    { col: 7,  name: "End_Date",          zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "תאריך DD/MM/YYYY",  notes: "אם צוין במסמך. [Task #256] קיים תאריך סיום → S15 מציע סוג טיפול \"זמני\"" },
    { col: 8,  name: "Status",            zone: "אירוע", writers: ["S13"], readers: [], values: "פעיל|הופסק",        notes: "ברירת מחדל: פעיל" },
    { col: 9,  name: "Doc_Issuer",        zone: "טכני",  writers: ["S13"], readers: [], values: "טקסט חופשי",        notes: "מנפיק המסמך — docIssuer" },
    { col: 10, name: "Source_URL",        zone: "טכני",  writers: ["S13"], readers: [], values: "https://drive.google.com/...", notes: "קישור לקובץ המקור" },
    { col: 11, name: "File_ID",           zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "מזהה קובץ מקורי — מפתח מקשר חזרה לניהול_מיילים" },
    { col: 12, name: "Medical_System",    zone: "טכני",  writers: ["S13","S15"], readers: [], values: "SYS00-SYS14",  notes: "[Task #256] S13 כותב SYS00 (כללי) כברירת מחדל; באישור ב-S15 נגזר מהקבוצה הטיפולית בקטלוג (מיפוי_קודים BF). מבטל את הכלל הקודם \"תמיד SYS00\" (Task #188)" },

    // [Task #256] עמודות העשרה M-S — נכתבות ע"י S15_EnrichCatalog.gs בלבד.
    // הצעה (runS15Enrich) כותבת M-R עם R="הוצע"; אישור בחלון S16 (s15_approve) כותב M-S עם R="מאומת".
    { col: 13, name: "ATC_Code",          zone: "טכני",  writers: ["S15"], readers: ["S15"], values: "קוד ATC ברמת חומר פעיל (למשל A10BA02) או ריק", notes: "[Task #256] מפתח לבלוק התרופות במיפוי_קודים (BA). ריק = לא נמצא קוד (למשל פריט שאינו תרופה)" },
    { col: 14, name: "Dose_Amount",       zone: "טכני",  writers: ["S15"], readers: [], values: "מספר (או טקסט למינון משולב, למשל 5/160)", notes: "[Task #256] כמות למנה — נלקחת משדה המינון בלבד (ריכוז בשם התרופה אינו מנה)" },
    { col: 15, name: "Dose_Unit",         zone: "טכני",  writers: ["S15"], readers: [], values: "MG|MCG|ML|APPLICATION וכו' או ריק", notes: "[Task #256] יחידת המנה" },
    { col: 16, name: "Times_Per_Day",     zone: "טכני",  writers: ["S15"], readers: [], values: "מספר או ריק",       notes: "[Task #256] מספר נטילות ביום" },
    { col: 17, name: "Days_Per_Week",     zone: "טכני",  writers: ["S15"], readers: [], values: "1-7 או ריק",        notes: "[Task #256] ימי נטילה בשבוע. מרווח של שבועות (למשל עירוי כל 3 שבועות) אינו ניתן לייצוג — Task #259" },
    { col: 18, name: "Enrich_Status",     zone: "טכני",  writers: ["S15"], readers: ["S15"], values: "הוצע|מאומת או ריק", notes: "[Task #256] ריק = ממתין להעשרה; שורה עם ערך לא מעובדת שוב ב-runS15Enrich" },
    { col: 19, name: "Treatment_Type",    zone: "טכני",  writers: ["S15"], readers: [], values: "כרוני|זמני|לפי הצורך", notes: "[Task #256] נקבע באימות בחלון S16; ההצעה האוטומטית (כללים קבועים, בלי Gemini) היא ברירת מחדל בלבד. מקור לחלוקת לוח התרופות באינפוגרפיקה" }
  ],
    // [Task 184] גליון יעד — מצב רפואי (medical_status) שחולץ ע"י S09 (כותרות אנגלית)
             "יומן_מצב_רפואי": [
    { col: 1,  name: "Event_Date",           zone: "אירוע", writers: ["S13"],       readers: [], values: "תאריך DD/MM/YYYY", notes: "מהמסמך או תאריך המסמך כברירת מחדל" },
    { col: 2,  name: "Event_Type",           zone: "אירוע", writers: ["S13"],       readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 3,  name: "Primary_Diagnosis",    zone: "תוכן",  writers: ["S13"],       readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 4,  name: "Severity_Status",      zone: "תוכן",  writers: ["S13"],       readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 5,  name: "Recommendations",      zone: "תוכן",  writers: ["S13"],       readers: [], values: "טקסט חופשי — ארוך", notes: "מקור MAX_TOKENS ב-Task 180" },
    { col: 6,  name: "Doc_Issuer",           zone: "טכני",  writers: ["S13"],       readers: [], values: "טקסט חופשי",       notes: "docIssuer" },
    { col: 7,  name: "Record_Status",        zone: "טכני",  writers: ["S13","S16"], readers: [], values: "חדש|מאומת",        notes: "\"חדש\" בכתיבת S13; \"מאומת\" בעדכון S16 בעת אישור" },
    { col: 8,  name: "S_Row",                zone: "טכני",  writers: ["VIEWENGINE"],readers: [], values: "מספר שורה",         notes: "[Task #206/#214] שורת מקור ב-ניהול_מיילים לפי File_ID (עמ' 17) — מחושב ע\"י refreshMedicalStatusRows" },
    { col: 9,  name: "Specialty_Name",       zone: "אירוע", writers: ["עמוס"],      readers: [], values: "רשימת בחירה — מיפוי_קודים בלוק התמחות", notes: "[Task #214/#216] Data Validation; אמורה למלא אוטומטית את Specialty_Code (עמ' 19) — ⚠️ בפועל onEdit לא פעיל בייצור, ראה דוח" },
    { col: 10, name: "Medical_System_Name",  zone: "אירוע", writers: ["S13"],       readers: [], values: "טקסט חופשי",       notes: "[Task #206] גולמי — הקוד מפסיק לדרוס אותה (בדומה ל-Event_Type)" },
    { col: 11, name: "Event_Code",           zone: "טכני",  writers: [],            readers: [], values: "קוד אירוע (למשל A0A)", notes: "[Task #214] ריק בפועל — אין מנגנון מילוי היום; מתוכנן ב-S16 (מיפוי_קודים בלוק אירועים E-I)" },
    { col: 12, name: "Event_Description",    zone: "אירוע", writers: [],            readers: [], values: "טקסט חופשי",       notes: "[Task #214] ריק בפועל — אותו סטטוס כמו Event_Code" },
    { col: 13, name: "Severity_Name",        zone: "תוכן",  writers: ["עמוס"],      readers: [], values: "רשימת בחירה — מיפוי_קודים בלוק חומרה", notes: "[Task #214/#216] Data Validation; ⚠️ אותה בעיית onEdit כמו Specialty_Name" },
    { col: 14, name: "Diagnosis_Name",       zone: "תוכן",  writers: ["עמוס"],      readers: [], values: "רשימת בחירה — מיפוי_קודים בלוק אבחנה", notes: "[Task #214/#216] Data Validation; ⚠️ אותה בעיית onEdit" },
    { col: 15, name: "Diagnosis_Certainty",  zone: "תוכן",  writers: ["עמוס"],      readers: [], values: "רשימת בחירה — מיפוי_קודים בלוק וודאות", notes: "[Task #214] עמודת קוד ישירה, בלי עמודת שם/פענוח נפרדת (יותר מדי מעט ערכים כדי להצדיק זוג)" },
    { col: 16, name: "Source_URL",           zone: "טכני",  writers: ["S13"],       readers: [], values: "https://drive.google.com/...", notes: "" },
    { col: 17, name: "File_ID",              zone: "טכני",  writers: ["S13"],       readers: [], values: "Drive ID",          notes: "" },
    { col: 18, name: "Medical_System",       zone: "טכני",  writers: ["S13","S16"], readers: [], values: "SYS00-SYS14",       notes: "[Task #188] דינמי — Gemini קובע לפי תוכן השורה" },
    { col: 19, name: "Specialty_Code",       zone: "טכני",  writers: [],            readers: [], values: "SPEC00-SPEC18",      notes: "[Task #214] ⚠️ מיועד להתמלא ע\"י onEdit — לא פעיל בייצור כרגע (ראה דוח)" },
    { col: 20, name: "Severity_Code",        zone: "טכני",  writers: [],            readers: [], values: "SEV0-SEV4",          notes: "[Task #214] ⚠️ אותו ממצא" },
    { col: 21, name: "Diagnosis_Code",       zone: "טכני",  writers: [],            readers: [], values: "DX00-DX13",          notes: "[Task #214] ⚠️ אותו ממצא" },
    { col: 22, name: "Organ_Code",           zone: "טכני",  writers: ["S16"],       readers: [], values: "תת-קוד איבר (למשל SYS12A) או ריק", notes: "[Task #219] select סגור ב-S16 מבלוק איברים A-D במיפוי_קודים, מסונן לפי Medical_System; ריק = ללא איבר. נקרא ע\"י runInfographicIconMedicalStatus_LAB (ViewEngine)" },
    { col: 23, name: "Organ_State_Code",     zone: "טכני",  writers: ["S13","S16"], readers: [], values: "OST0-OST2 או ריק", notes: "[Task #224] מצב איבר אחרי ניתוח — select סגור ב-S16 מבלוק מצב_איבר AD-AH במיפוי_קודים. מתמלא רק בשורות ניתוח: S13 מציע, S16 מאשר. ריק = אין מידע (לא \"קיים\")" },
    { col: 24, name: "Organ_Side_Code",      zone: "טכני",  writers: ["S13","S16"], readers: [], values: "LAT0-LAT3 או ריק", notes: "[Task #224] צד האיבר — select סגור ב-S16 מבלוק צד_איבר AI-AM במיפוי_קודים. סתירת צד בטקסט המקור → ריק + אזהרה ב-S16" },
    { col: 25, name: "Allergen_Code",        zone: "טכני",  writers: ["S13","S16"], readers: [], values: "קוד ATC מבלוק התרופות במיפוי_קודים (BA) או ריק", notes: "[Task #262] החומר הגורם לרגישות — רק בשורות קוד אירוע A7 (A7A אלרגיה / A7B רגישות / A7C תופעת לוואי). S13 כותב רק קוד שקיים בקטלוג, S16 מאשר (select סגור). חומר שאינו בקטלוג → ריק, ושמו נשאר ב-Primary_Diagnosis" },
    { col: 26, name: "Reaction",             zone: "תוכן",  writers: ["S13","S16"], readers: [], values: "טקסט חופשי או ריק", notes: "[Task #262] התגובה לחומר (למשל כאבי שרירים) — רק בשורות קוד אירוע A7. S13 מציע, S16 מאשר/עורך" }
  ],
  // [Task 184] גליון יעד — בדיקות דם שחולצו ע"י S09 (כותרות אנגלית)
  "בדיקות_דם": [
    { col: 1,  name: "Test_Date",     zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "תאריך DD/MM/YYYY", notes: "[Task #263] מוצג בחלון האימות (S15)" },
    { col: 2,  name: "Test_Name",     zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "לדוגמה: WBC, HB. [Task #263] עמודת השם של תחום המעבדה ב-S15 — מפתח חיפוש בקטלוג מאפייני_מעבדה; באישור קוד קיים — נוסף ל-Raw_Value בקטלוג" },
    { col: 3,  name: "Category",      zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "לדוגמה: המטולוגיה. [Task #263] הקשר לפרומפט ההעשרה" },
    { col: 4,  name: "Value",         zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "מספר/טקסט",        notes: "[Task #263] הערך כפי שבמסמך — הקשר לפרומפט ההעשרה ותצוגה בחלון האימות" },
    { col: 5,  name: "Normal_Range",  zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #263] מוצג בחלון האימות. ⚠️ בתדפיסי כללית און-ליין הגבול התחתון עלול להיות שגוי (Task #265)" },
    { col: 6,  name: "Status",        zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "תקין|גבוה|נמוך|לא תקין", notes: "[Task #263] מוצג בחלון האימות" },
    { col: 7,  name: "Doctor_Note",   zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #263] מוצג בחלון האימות" },
    { col: 8,  name: "Source_URL",    zone: "טכני",  writers: ["S13"], readers: ["S15"], values: "https://drive.google.com/...", notes: "[Task #263] תצוגת מסמך המקור בחלון האימות" },
    { col: 9,  name: "File_ID",       zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "" },
    { col: 10, name: "Doc_Issuer",    zone: "טכני",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",        notes: "docIssuer — [Task 184] תוקן: הייתה חסרת כותרת בגליון החי. [Task #263] מוצג בחלון האימות" },
    { col: 11, name: "Medical_System", zone: "טכני", writers: ["S13","S15"], readers: ["S15"], values: "SYS00-SYS14",       notes: "[Task #188] קבוע: תמיד SYS06 (דם וכלי דם) — כל בדיקת דם מקוטלגת אוטומטית. [Task #263] בוטל: S13 כותב ריק; S15 מציע בהעשרה וכותב באישור את מערכת היעד של המאפיין מהקטלוג (מיפוי_קודים BL) — הקטלוג גובר" },

    // [Task #263] עמודות L-S — שורה לכל תוצאה (S13 v1.8.0 מפצל אירוע מעבדה לתוצאות בודדות).
    // S13 כותב N-R וריק ב-K-M ו-S; העשרה (runS15Enrich, _s15_labHandler) כותבת K-M ו-S="הוצע";
    // אישור בחלון S16 (s15_labApprove) כותב K-M ו-O-S עם S="מאומת". K-M נכתבים בעיצוב טקסט.
    { col: 12, name: "LOINC_Code",    zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "קוד LOINC (למשל 718-7) או ריק", notes: "[Task #263] מפתח לבלוק מאפייני_מעבדה במיפוי_קודים (BG). קוד ריק מותר באישור. נכתב בעיצוב טקסט — קוד כמו 3016-3 מתפרש אחרת כתאריך" },
    { col: 13, name: "Panel_Code",    zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "PNL-L00-PNL-L16",   notes: "[Task #263] מבלוק פאנלים במיפוי_קודים (BS). בהעשרה — פאנל מחוץ לרשימה → PNL-L00; באישור — חובה לבחור מהרשימה" },
    { col: 14, name: "Specimen",      zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "דם|שתן|צואה|מדידה|אחר", notes: "[Task #263] סוג הדגימה — חלק ראשון בשיוך הכפול (מדידה = מדד חיוני). ערך מחוץ לרשימה → אחר. בחלון האימות — תצוגה בלבד" },
    { col: 15, name: "Value_Num",     zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "מספר או ריק",       notes: "[Task #263] הערך כמספר בלבד; ניתן לעריכה באישור" },
    { col: 16, name: "Unit",          zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "טקסט חופשי או ריק", notes: "[Task #263] יחידת המידה; הקשר לפרומפט ההעשרה; ניתנת לעריכה באישור" },
    { col: 17, name: "Ref_Low",       zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "מספר או ריק",       notes: "[Task #263] גבול תחתון של הטווח התקין; באישור — גבול תחתון ≤ עליון" },
    { col: 18, name: "Ref_High",      zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "מספר או ריק",       notes: "[Task #263] גבול עליון של הטווח התקין" },
    { col: 19, name: "Enrich_Status", zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "הוצע|מאומת או ריק", notes: "[Task #263] S13 כותב ריק = ממתין להעשרה; שורה עם ערך לא מעובדת שוב ב-runS15Enrich" }
  ],

  // [Task 184] גליון יעד — בדיקות גנטיות שחולצו ע"י S09 (כותרות אנגלית)
  "בדיקות_גנטיות": [
    { col: 1, name: "Test_Date",              zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "תאריך DD/MM/YYYY", notes: "[Task #264] מוצג בחלון האימות (S15)" },
    { col: 2, name: "Panel_Name",             zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "לדוגמה: נוטריגנטי. [Task #264] כותרת הקטע במסמך — הקשר לפרומפט ההעשרה (שיוך לפאנל PNL-G) ומוצג בחלון האימות" },
    { col: 3, name: "Gene_Variant",           zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #264] הטקסט הגולמי של הגן או הווריאנט כפי שבמסמך, רק אם מופיע — הקשר לפרומפט ההעשרה ומוצג בחלון האימות" },
    { col: 4, name: "Finding",                zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #264] שם התכונה — עמודת השם של תחום הגנטיקה ב-S15: מפתח חיפוש בקטלוג תכונות_גנטיות (BM-BR); באישור קוד מאומת — נוסף ל-Raw_Value בקטלוג" },
    { col: 5, name: "Clinical_Significance",  zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #264] התוצאה המילולית כפי שבמסמך (למשל \"אין נטייה למחסור\") — הקשר לפרומפט ההעשרה ומוצג בחלון האימות" },
    { col: 6, name: "Recommendation",         zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #264] ההמלצה מתוך סיכום הכרטיס במסמך — מוצגת בחלון האימות. נשארת בגליון (החלטת 01/11/2026)" },
    { col: 7, name: "Source_URL",             zone: "טכני",  writers: ["S13"], readers: ["S15"], values: "https://drive.google.com/...", notes: "[Task #264] תצוגת מסמך המקור בחלון האימות" },
    { col: 8, name: "File_ID",                zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "" },
    { col: 9, name: "Medical_System",         zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "SYS00-SYS14",       notes: "[Task #188] קבוע: תמיד SYS14 (גנים) — כל בדיקה גנטית מקוטלגת אוטומטית. [Task #264] בוטל: S13 כותב ריק; S15 מציע בהעשרה וכותב באישור את מערכת היעד של התכונה מהקטלוג (מיפוי_קודים BR) — הקטלוג גובר" },

    // [Task #264] עמודות J-Q — שורה לכל תכונה (S13 v1.10.0 מפצל אירוע גנטי לתכונות בודדות).
    // S13 כותב L-P וריק ב-I-K ו-Q; העשרה (runS15Enrich, _s15_genHandler) כותבת I-K ו-Q="הוצע";
    // אישור בחלון S16 (s15_genApprove) כותב I-K ו-Q="מאומת", ו-M רק אם שונה בחלון. I-K נכתבים בעיצוב טקסט.
    { col: 10, name: "Trait_Code",    zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "GTR-001-GTR-999 או ריק", notes: "[Task #264] מפתח לבלוק תכונות_גנטיות במיפוי_קודים (BM). קוד פנימי — לתכונות אין קידוד בינלאומי. באישור חובה לבחור מהקודים המוכרים (מאומתים או ממתינים)" },
    { col: 11, name: "Panel_Code",    zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "PNL-G00-PNL-G09",   notes: "[Task #264] מבלוק פאנלים במיפוי_קודים (BS) — קודי PNL-G בלבד. בהעשרה — פאנל מחוץ לרשימה → PNL-G00; באישור — חובה לבחור מהרשימה" },
    { col: 12, name: "Tendency",      zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "אין|נמוכה|בינונית|גבוהה או ריק", notes: "[Task #264] דרגת הנטייה לפי מילת הדרגה במסמך, מנורמלת לסולם הסגור (_s13_genTendency: מוגברת → גבוהה); ערך לא מוכר → ריק. בחלון האימות — תצוגה בלבד; איחוד ניסוחים בתצוגה (#260)" },
    { col: 13, name: "Gene_Symbol",   zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "סמל גן לפי HGNC (למשל MTHFR) או ריק", notes: "[Task #264] רק אם מופיע במסמך. מפתח לבלוק גנים במיפוי_קודים (CC); גן תקין שאינו בקטלוג — הצעה ממתינה בהעשרה ושורה חדשה בקטלוג באישור. S15 כותב רק אם שונה בחלון" },
    { col: 14, name: "Variant_ID",    zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "מזהה dbSNP (למשל rs1801133) או ריק", notes: "[Task #264] רק אם מופיע במסמך. בחלון האימות — תצוגה בלבד" },
    { col: 15, name: "Genotype",      zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "גנוטיפ (למשל C/T) או ריק", notes: "[Task #264] רק אם מופיע במסמך. בחלון האימות — תצוגה בלבד" },
    { col: 16, name: "ACMG_Class",    zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "פתוגני|כנראה פתוגני|משמעות לא ודאית|כנראה שפיר|שפיר או ריק", notes: "[Task #264] סיווג ACMG — רק מתוך 5 הדרגות (S13_GEN_ACMG), אחרת ריק. בחלון האימות — תצוגה בלבד" },
    { col: 17, name: "Enrich_Status", zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "הוצע|מאומת או ריק", notes: "[Task #264] S13 כותב ריק = ממתין להעשרה; שורה עם ערך לא מעובדת שוב ב-runS15Enrich" }
  ],

    // [Task 184] גליון יעד — הנחיות ומשימות שחולצו ע"י S09 (כותרות אנגלית)
  "הנחיות_רפואיות_ומשימות": [
    { col: 1, name: "Instruction_Date",  zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "תאריך DD/MM/YYYY", notes: "[Task #261] מוצג בחלון האימות (S15)" },
    { col: 2, name: "Doc_Issuer",        zone: "אירוע", writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "מנפיק — docIssuer. [Task #261] הקשר לפרומפט ההעשרה ומוצג בחלון האימות" },
    { col: 3, name: "Task_Description",  zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #261] עמודת השם של תחום ההנחיות ב-S15 — הטקסט שמסווג בהעשרה" },
    { col: 4, name: "Task_Type",         zone: "תוכן",  writers: ["S13"], readers: ["S15"], values: "טקסט חופשי",       notes: "[Task #261] סוג גולמי מהחילוץ — הקשר לפרומפט ההעשרה; מוצג בחלון האימות (לא נכתב)" },
    { col: 5, name: "Due_Date",          zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "תאריך DD/MM/YYYY", notes: "[Task #261] ניתן לעריכה בחלון האימות; S15 כותב באישור (s15_instrApprove) לפי אזור הזמן של הגליון. בסיס לחישוב \"באיחור\" בתצוגה" },
    { col: 6, name: "Status",            zone: "תוכן",  writers: ["S13","S15"], readers: ["S15"], values: "פתוח|בוצע|בוטל",   notes: "[Task #261] מחזור חיים — נקבע באישור בחלון האימות (פתוח / בוצע / בוטל)" },
    { col: 7, name: "Source_URL",        zone: "טכני",  writers: ["S13"], readers: ["S15"], values: "https://drive.google.com/...", notes: "[Task #261] תצוגת מסמך המקור בחלון האימות" },
    { col: 8, name: "File_ID",           zone: "טכני",  writers: ["S13"], readers: [], values: "Drive ID",          notes: "" },
    { col: 9, name: "Medical_System",    zone: "טכני",  writers: ["S13","S15"], readers: ["S15"], values: "SYS00-SYS14",       notes: "[Task #188] דינמי — Gemini קובע לפי תוכן ההנחיה (יכולה לגעת בכל מערכת). [Task #261] ההעשרה לא נוגעת בו; מתוקן באישור בחלון האימות (S15)" },

    // [Task #261] עמודות העשרה J-M — נכתבות ע"י S15_EnrichCatalog.gs בלבד.
    // הצעה (runS15Enrich, מטפל ההנחיות) כותבת J-M עם M="הוצע"; אישור בחלון S16 (s15_instrApprove) כותב J-M עם M="מאומת".
    { col: 10, name: "Instruction_Code", zone: "טכני",  writers: ["S15"], readers: ["S15"], values: "INS00-INS09",       notes: "[Task #261] סוג ההנחיה — רשימה סגורה מבלוק סוגי_הנחיות במיפוי_קודים (BX). קוד מחוץ לרשימה → INS00; לא מוצעים קודים חדשים" },
    { col: 11, name: "Instruction_Kind", zone: "טכני",  writers: ["S15"], readers: ["S15"], values: "מתמשכת|משימה",      notes: "[Task #261] אופי ההנחיה. ברירת המחדל — מתיאור הקוד בקטלוג (\"ברירת מחדל: ...\")" },
    { col: 12, name: "Target_Code",      zone: "טכני",  writers: ["S15"], readers: ["S15"], values: "SPEC00-SPEC18 / קוד ATC / ריק", notes: "[Task #261] יעד ההנחיה — רק קוד שקיים בקטלוג: התמחות (מיפוי_קודים J) או תרופה (BA). בעתיד גם פאנל/מאפיין מעבדה (Task #263). ריק = אין התאמה בטוחה" },
    { col: 13, name: "Enrich_Status",    zone: "טכני",  writers: ["S15"], readers: ["S15"], values: "הוצע|מאומת או ריק", notes: "[Task #261] ריק = ממתין להעשרה; שורה עם ערך לא מעובדת שוב ב-runS15Enrich" }
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

  // [Task 185] גליון למידה חדש — שורה אחת לכל אירוע (לא לכל מסמך), מאפשר
  // סינון/קיבוץ לפי Source_File_ID (מסמך) או Routing_Category (קטגוריה).
  // מחליף את S10_למידה_רפואי הישן — הגליון וההגדרה שלו הוסרו ב-Task #277.
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

  // [Task #277] עודכן ל-15 העמודות בפועל (A-O), לפי devSync_RunScanButton
  // (DevSyncInspector.gs v3.5). כותרות בשורה 4, נתונים משורה 5. שורות 1-3 —
  // אייקונים ותוויות (setupDevSyncIcons, ViewEngine.gs). אזור מרחבי מעמודה P.
  "מסנכרן_קבצים": [
    { col: 1,  name: "File_Name",      zone: "זיהוי", writers: ["DEV_SYNC"], readers: [], values: "שם קובץ",       notes: "שם הקובץ בעורך, ללא סיומת" },
    { col: 2,  name: "View_Summary",   zone: "זיהוי", writers: ["DEV_SYNC"], readers: [], values: "[ צפה בטקסט ]", notes: "לחיצה — תקציר @impacts/@functions באזור המרחבי" },
    { col: 3,  name: "Updated_Editor", zone: "עורך", writers: ["DEV_SYNC"], readers: [], values: "DDMMYYYY HH:MM", notes: "מועד @updated לפי כותרת הקובץ בעורך" },
    { col: 4,  name: "Updated_Git",    zone: "גיט", writers: ["DEV_SYNC"], readers: [], values: "DDMMYYYY HH:MM", notes: "מועד @updated לפי כותרת הקובץ בגיטהאב" },
    { col: 5,  name: "Editor_Lines",   zone: "עורך", writers: ["DEV_SYNC"], readers: [], values: "מספר שורות",    notes: "מספר שורות קוד בעורך — לזיהוי שינויים" },
    { col: 6,  name: "Git_Lines",      zone: "גיט", writers: ["DEV_SYNC"], readers: [], values: "מספר שורות",    notes: "מספר שורות קוד בגיטהאב — להשוואה" },
    { col: 7,  name: "Version_Editor", zone: "עורך", writers: ["DEV_SYNC"], readers: [], values: "מספר גרסה",     notes: "@version מהעורך" },
    { col: 8,  name: "Version_Git",    zone: "גיט", writers: ["DEV_SYNC"], readers: [], values: "מספר גרסה",     notes: "@version מהגיט" },
    { col: 9,  name: "Service_Editor", zone: "עורך", writers: ["DEV_SYNC"], readers: [], values: "קוד שירות",     notes: "@service מהעורך" },
    { col: 10, name: "Service_Git",    zone: "גיט", writers: ["DEV_SYNC"], readers: [], values: "קוד שירות",     notes: "@service מהגיט" },
    { col: 11, name: "Sync_Status",    zone: "סנכרון", writers: ["DEV_SYNC"], readers: [], values: "תואם|⬆ סנכרן לגיטהאב|⬇ סנכרן לעורך", notes: "מצב השוואה — צבע לפי עיצוב מותנה; אייקון הסנכרון לגיט מעליה" },
    { col: 12, name: "System_Notes",   zone: "סנכרון", writers: ["DEV_SYNC"], readers: [], values: "טקסט חופשי",    notes: "הערות מערכת (חסר בעורך/בגיט)" },
    { col: 13, name: "System_Path",    zone: "קישור", writers: ["DEV_SYNC"], readers: [], values: "נתיב",          notes: "נתיב הקובץ בגיט (src/infrastructure/...)" },
    { col: 14, name: "Git_Raw_Link",   zone: "קישור", writers: ["DEV_SYNC"], readers: [], values: "כתובת API",     notes: "קישור GitHub API לקובץ" },
    { col: 15, name: "Git_Web_Link",   zone: "קישור", writers: ["DEV_SYNC"], readers: [], values: "כתובת אתר",     notes: "קישור לקובץ באתר GitHub" }
   ],

   // [הרחבה, Task #206, סבב 3] גליון מיפוי_קודים — טבלה אחודה: מערכות גוף
  // (SYS00-SYS14) + קודי אירוע (ET_CODE). נטען דינמית ע"י _codeMap_buildLookup
  // (ViewEngine.gs). מפתח החיפוש תלוי-סוג: Key עבור מערכת_גוף, Raw_Value
  // עבור קוד_אירוע.
    "מיפוי_קודים": [
    // בלוק איברים (A-D) — קטלוג מערכות/איברי גוף. אינו נקרא בקוד כרגע.
    { col: 1, name: "Organ_Code",       zone: "מיפוי", writers: ["עמוס"], readers: [], values: "SYS00-SYS14 / תת-איבר (למשל SYS00A)", notes: "[Task #215a] בלוק איברים A-D. לא נקרא בקוד כרגע — קטלוג לשימוש עתידי" },
    { col: 2, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי — שם מערכת/איבר", notes: "" },
    { col: 3, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי",       notes: "לא בשימוש בפועל ברוב השורות" },
    { col: 4, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL",               notes: "מאוכלס רק לחלק מהשורות" },

    // בלוק אירועים (E-I) — 8 קטגוריות (A0-A7), כולל A5 עצמאי. [Task #262] A7 = רגישויות ואלרגיות.
    { col: 5, name: "Event_Code",       zone: "מיפוי", writers: ["עמוס"], readers: [], values: "A0-A7 (קטגוריה) / A0A וכו' (תת-קוד) / A5", notes: "[Task #215a] בלוק אירועים E-I. _s10_saveEventCodeToMap (S10_Validate.gs) מיועדת לכתוב לכאן — כרגע כותבת בטעות ל-A-D (ראה משימה #214)" },
    { col: 6, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 7, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי",       notes: "" },
    { col: 8, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי",       notes: "מפתח חיפוש לשורות תת-קוד; ריק בשורות הקטגוריה (A0-A4)" },
    { col: 9, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL",               notes: "" },

    // בלוק התמחות (J-N).
    { col: 10, name: "Specialty_Code",   zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "SPEC00-SPEC18", notes: "[Task #215a] בלוק התמחות J-N. onEdit (_labJournal_autoFillClassificationCode, QA_Tests.gs) קורא מכאן — פעיל רק בגליון הניסוי (ראה ממצא בדוח). [Task #261] S15 קורא כרשימת קודי יעד להנחיות (Target_Code)" },
    { col: 11, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "טקסט חופשי",     notes: "[Task #261] שם ההתמחות — בפרומפט ההעשרה ובחלון האימות של ההנחיות" },
    { col: 12, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי",     notes: "" },
    { col: 13, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "טקסט חופשי",     notes: "[Task #261] ניסוחים נלווים — בפרומפט ההעשרה של ההנחיות" },
    { col: 14, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL",             notes: "" },

    // בלוק חומרה (O-S).
    { col: 15, name: "Severity_Code",    zone: "מיפוי", writers: ["עמוס"], readers: [], values: "SEV0-SEV4", notes: "[Task #215a] בלוק חומרה O-S. אותה הערת onEdit כמו התמחות" },
    { col: 16, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 17, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 18, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 19, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL",         notes: "" },

    // בלוק אבחנה (T-X).
    { col: 20, name: "Diagnosis_Code",   zone: "מיפוי", writers: ["עמוס"], readers: [], values: "DX00-DX13", notes: "[Task #215a] בלוק אבחנה T-X. אותה הערת onEdit" },
    { col: 21, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 22, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 23, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 24, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL",         notes: "" },

       // בלוק וודאות אבחנה (Y-AC) — אין עמודת קוד נפרדת ביומן (ראה Diagnosis_Certainty).
    { col: 25, name: "Certainty_Code",   zone: "מיפוי", writers: ["עמוס"], readers: [], values: "CRT0-CRT3", notes: "[Task #215a] בלוק וודאות Y-AC. משמש כמקור לרשימת הבחירה ב-Diagnosis_Certainty; אין מנגנון onEdit לבלוק הזה" },
    { col: 26, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 27, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 28, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 29, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL",         notes: "" },

    // [Task #224] בלוק מצב איבר (AD-AH) — קיים / הוסר חלקית / הוסר.
    { col: 30, name: "Organ_State_Code", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "OST0-OST2", notes: "[Task #224] בלוק מצב_איבר AD-AH. מקור ל-Organ_State_Code (עמ' 23) ביומן_מצב_רפואי — S13 (הצעה) ו-S16 (select סגור)" },
    { col: 31, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 32, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 33, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי — מילות מפתח מופרדות בפסיקים", notes: "[Task #224] מקור ההצעה האוטומטית ב-S16" },
    { col: 34, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "" },

    // [Task #224] בלוק צד איבר (AI-AM) — לא רלוונטי / ימין / שמאל / דו-צדדי.
    { col: 35, name: "Organ_Side_Code",  zone: "מיפוי", writers: ["עמוס"], readers: [], values: "LAT0-LAT3", notes: "[Task #224] בלוק צד_איבר AI-AM. מקור ל-Organ_Side_Code (עמ' 24) ביומן_מצב_רפואי — S13 (הצעה) ו-S16 (select סגור)" },
    { col: 36, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 37, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי", notes: "" },
    { col: 38, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "טקסט חופשי — מילות מפתח מופרדות בפסיקים", notes: "[Task #224] מקור ההצעה האוטומטית ב-S16" },
     { col: 39, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "" },

    // [Task #256] עמודות רזרבה (AN-AZ) — שמורות להרחבה עתידית של בלוקי הקודים. כותרת שורה 3: "שמור_רזרב".
    { col: 40, name: "Reserved_01",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 41, name: "Reserved_02",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 42, name: "Reserved_03",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 43, name: "Reserved_04",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 44, name: "Reserved_05",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 45, name: "Reserved_06",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 46, name: "Reserved_07",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 47, name: "Reserved_08",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 48, name: "Reserved_09",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 49, name: "Reserved_10",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 50, name: "Reserved_11",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 51, name: "Reserved_12",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },
    { col: 52, name: "Reserved_13",      zone: "מיפוי", writers: [], readers: [], values: "ריק", notes: "[Task #256] רזרבה — לא בשימוש" },

    // [Task #256] בלוק תרופות (BA-BF) — קטלוג מרכזי, שורה לכל חומר פעיל, מפתח = קוד ATC. כותרת שורה 3: "תרופות".
    // נקרא ע"י S15 (_s15_readCatalog) להעשרה ולאימות; נכתב ע"י S15 באישור בחלון S16 (s15_approve): קוד חדש = שורה חדשה, קוד קיים = הוספת השם המסחרי ל-Raw_Value.
    { col: 53, name: "ATC_Code",         zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "קוד ATC ברמת חומר פעיל (למשל A10BA02)", notes: "[Task #256] מפתח הבלוק. מקור ל-ATC_Code (עמ' 13) בתרופות_קבועות. סיווג בינלאומי — לא ממציאים קודים" },
    { col: 54, name: "Normalized_Value", zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שם החומר הפעיל באנגלית (למשל metformin)", notes: "[Task #256] מקור ל-Active_Ingredient (עמ' 2) באישור; מפתח חיפוש ב-S15" },
    { col: 55, name: "Description",      zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "טקסט חופשי בעברית — ייעוד התרופה", notes: "[Task #256] למשל \"תרופה לסוכרת\"" },
    { col: 56, name: "Raw_Value",        zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שמות מסחריים מופרדים בפסיקים", notes: "[Task #256] מפתח חיפוש ב-S15; באישור קוד קיים — השם המסחרי מתווסף כאן" },
    { col: 57, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "[Task #256] ריק כרגע — לשימוש עתידי באינפוגרפיקה" },
    { col: 58, name: "Medical_System",   zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "SYS00-SYS14", notes: "[Task #256] מערכת הגוף לפי הקבוצה הטיפולית. מקור ל-Medical_System (עמ' 12) בתרופות_קבועות באישור" },

    // [Task #263] בלוק מאפייני_מעבדה (BG-BL) — קטלוג פתוח, שורה לכל מאפיין, מפתח = קוד LOINC. כותרת שורה 3: "מאפייני_מעבדה".
    // נקרא ע"י S15 (_s15_readCatalog) להעשרה ולאימות; נכתב ע"י S15 באישור בחלון S16 (s15_labApprove → _s15_labWriteCatalog): קוד חדש = שורה חדשה בעיצוב טקסט, קוד קיים = הוספת שם הבדיקה ל-Raw_Value.
    { col: 59, name: "LOINC_Code",       zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "קוד LOINC (למשל 718-7)", notes: "[Task #263] מפתח הבלוק. מקור ל-LOINC_Code (עמ' 12) בבדיקות_דם. סיווג בינלאומי — לא ממציאים קודים. נכתב בעיצוב טקסט — קוד כמו 3016-3 מתפרש אחרת כתאריך" },
    { col: 60, name: "Normalized_Value", zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שם המאפיין באנגלית (למשל Hemoglobin)", notes: "[Task #263] מוצג בחלון האימות; מפתח חיפוש ב-S15" },
    { col: 61, name: "Description",      zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "טקסט חופשי בעברית", notes: "[Task #263] למשל \"המוגלובין בדם\"" },
    { col: 62, name: "Raw_Value",        zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שמות הבדיקה במסמכים מופרדים בפסיקים", notes: "[Task #263] מפתח חיפוש ב-S15; באישור קוד קיים — שם הבדיקה מתווסף כאן" },
    { col: 63, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "[Task #263] ריק כרגע — לשימוש עתידי באינפוגרפיקה" },
    { col: 64, name: "Medical_System",   zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "SYS00-SYS14", notes: "[Task #263] מערכת היעד של המאפיין (שיוך כפול: סוג הדגימה בעמ' 14 בבדיקות_דם + המערכת כאן). מקור ל-Medical_System (עמ' 11) בבדיקות_דם — הקטלוג גובר" },

    // [Task #264] בלוק תכונות_גנטיות (BM-BR) — קטלוג פתוח, שורה לכל תכונה, מפתח = קוד פנימי GTR-nnn (לתכונות אין קידוד בינלאומי). כותרת שורה 3: "תכונות_גנטיות".
    // נקרא ע"י S15 (_s15_readCatalog) להעשרה ולאימות; בהעשרה (_s15_genHandler) — תכונה מוכרת (מאומתת או ממתינה) מקבלת את הקוד הקיים, תכונה חדשה את הקוד הפנוי הבא; תכונות עם אותו שם מנורמל באותה ריצה — קוד אחד.
    // נכתב ע"י S15 באישור בחלון S16 (s15_genApprove → _s15_genWriteTraitCatalog): קוד ממתין = שורה חדשה בעיצוב טקסט, קוד מאומת = נתוני הקטלוג גוברים ורק שם התכונה מתווסף ל-Raw_Value.
    { col: 65, name: "Trait_Code",       zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "GTR-001-GTR-999 (שלוש ספרות)", notes: "[Task #264] מפתח הבלוק. מקור ל-Trait_Code (עמ' 10) בבדיקות_גנטיות. קוד פנימי — באישור נבחר רק מהקודים המוכרים (מאומתים או ממתינים)" },
    { col: 66, name: "Normalized_Value", zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שם התכונה בעברית (למשל נטייה לפציעות ספורט בגיד אכילס)", notes: "[Task #264] מוצג בחלון האימות; מפתח חיפוש ב-S15" },
    { col: 67, name: "Description",      zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "טקסט חופשי בעברית", notes: "[Task #264] מהחלון או מההצעה הממתינה" },
    { col: 68, name: "Raw_Value",        zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שמות התכונה במסמכים מופרדים בפסיקים", notes: "[Task #264] מפתח חיפוש ב-S15; מחושב בשרת מההצעה ומשם התכונה (עמ' 4) — לא נשלח מהחלון (לקח #266)" },
    { col: 69, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "[Task #264] ריק כרגע — לשימוש עתידי באינפוגרפיקה" },
    { col: 70, name: "Medical_System",   zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "SYS00-SYS14", notes: "[Task #264] מערכת היעד של התכונה (שיוך כפול: מערכת הגן + מערכת התכונה). מקור ל-Medical_System (עמ' 9) בבדיקות_גנטיות — הקטלוג גובר" },

    // [Task #263] בלוק פאנלים (BS-BW) — רשימה סגורה משותפת: מעבדה PNL-L00-PNL-L16, גנטיקה PNL-G00-PNL-G09 ([Task #264]). כותרת שורה 3: "פאנלים".
    // נקרא ע"י S15 (_s15_readCatalog עם S15_LAB_PANEL_FIRST_COL) — בפרומפט ההעשרה וברשימת הפאנלים בחלון האימות (מעבדה — PNL-L, גנטיקה — PNL-G בלבד); לא נכתב בקוד — מנוהל ידנית ע"י עמוס בלבד.
    { col: 71, name: "Panel_Code",       zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "PNL-L00-PNL-L16 (מעבדה); PNL-G00-PNL-G09 (גנטיקה)", notes: "[Task #263] מפתח הבלוק. מקור ל-Panel_Code (עמ' 13) בבדיקות_דם. רשימה סגורה — בהעשרה פאנל מחוץ לרשימה → PNL-L00; באישור חובה לבחור מהרשימה. [Task #264] מקור ל-Panel_Code (עמ' 11) בבדיקות_גנטיות — מחוץ לרשימה → PNL-G00" },
    { col: 72, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "שם הפאנל בעברית (למשל ספירת דם)", notes: "[Task #263] מוצג בפרומפט ובחלון האימות" },
    { col: 73, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "טקסט חופשי — מה כולל הפאנל", notes: "[Task #263] הקשר לפרומפט ההעשרה" },
    { col: 74, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "ניסוחים וקיצורים מופרדים בפסיקים", notes: "[Task #263] רמזים לשיוך בפרומפט ההעשרה" },
    { col: 75, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "[Task #263] ריק כרגע — לשימוש עתידי באינפוגרפיקה" },

    // [Task #261] בלוק סוגי_הנחיות (BX-CB) — רשימה סגורה, INS00-INS09. כותרת שורה 3: "סוגי_הנחיות".
    // [Task #263] BG-BL ו-BS-BW נרשמו למעלה. [Task #264] BM-BR (תכונות_גנטיות) נרשם למעלה; CC-CH (גנים) נרשם למטה.
    // נקרא ע"י S15 (_s15_readCatalog) להעשרה ולאימות; לא נכתב בקוד — מנוהל ידנית ע"י עמוס בלבד.
    { col: 76, name: "Instruction_Code", zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "INS00-INS09", notes: "[Task #261] מפתח הבלוק. מקור ל-Instruction_Code (עמ' 10) בהנחיות_רפואיות_ומשימות. רשימה סגורה — S15 לא מציע קודים חדשים" },
    { col: 77, name: "Normalized_Value", zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "שם הסוג בעברית (למשל מעקב / ביקורת)", notes: "[Task #261] מוצג בפרומפט ובחלון האימות" },
    { col: 78, name: "Description",      zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "טקסט חופשי + \"ברירת מחדל: מתמשכת|משימה\"", notes: "[Task #261] S15 גוזר מכאן את ברירת המחדל של Instruction_Kind" },
    { col: 79, name: "Raw_Value",        zone: "מיפוי", writers: ["עמוס"], readers: ["S15"], values: "ניסוחים גולמיים מופרדים בפסיקים", notes: "[Task #261] ניסוחים מהיומן — בפרומפט ההעשרה" },
    { col: 80, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "[Task #261] ריק כרגע — לשימוש עתידי באינפוגרפיקה" },

    // [Task #264] בלוק גנים (CC-CH) — קטלוג פתוח, שורה לכל גן, מפתח = סמל גן בינלאומי (HGNC). כותרת שורה 3: "גנים".
    // נקרא ע"י S15 (_s15_readCatalog עם S15_GEN_GENE_FIRST_COL): בהעשרה — גן תקין (עמ' 13 בבדיקות_גנטיות) שאינו בקטלוג נשמר כהצעה ממתינה (block="genes");
    // נכתב ע"י S15 באישור בחלון S16 (s15_genApprove → _s15_genWriteGene): גן חדש = שורה חדשה בעיצוב טקסט; גן קיים — ללא שינוי.
    { col: 81, name: "Gene_Symbol",      zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "סמל גן לפי HGNC (למשל MTHFR, BRCA1)", notes: "[Task #264] מפתח הבלוק. מקור ל-Gene_Symbol (עמ' 13) בבדיקות_גנטיות. סיווג בינלאומי — לא ממציאים סמלים. סמל אחד בלבד: אות גדולה ואחריה אותיות, ספרות או מקף" },
    { col: 82, name: "Normalized_Value", zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "שם הגן (ברירת מחדל: הסמל עצמו)", notes: "[Task #264] מהחלון, מההצעה הממתינה או הסמל" },
    { col: 83, name: "Description",      zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "טקסט חופשי בעברית", notes: "[Task #264] מהחלון או מההצעה הממתינה; יכול להישאר ריק" },
    { col: 84, name: "Raw_Value",        zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "ניסוחי הגן במסמכים מופרדים בפסיקים", notes: "[Task #264] מחושב בשרת מההצעה ומעמודה M בשורה — לא נשלח מהחלון (לקח #266)" },
    { col: 85, name: "Icon_Link",        zone: "מיפוי", writers: ["עמוס"], readers: [], values: "URL", notes: "[Task #264] ריק כרגע — לשימוש עתידי באינפוגרפיקה" },
    { col: 86, name: "Medical_System",   zone: "מיפוי", writers: ["S15","עמוס"], readers: ["S15"], values: "SYS00-SYS14", notes: "[Task #264] מערכת הגוף של הגן — מההצעה הממתינה, אחרת מערכת התכונה שאושרה באותה שורה" }
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
// פונקציית עזר — הקמת גליון מסנכרן_קבצים
// [Task #277] כותרות בשורה 4 ו-4 שורות מוקפאות — כמו בגליון בפועל
//             (DEV_SYNC_HEADER_ROW ב-DevSyncInspector.gs). שורות 1-3 שמורות
//             לאייקונים ולתוויות (setupDevSyncIcons ב-ViewEngine.gs).
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

  sheet.getRange(4, 1, 1, totalCols).setValues([headers]).setFontWeight("bold");
  sheet.setFrozenRows(4);
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
