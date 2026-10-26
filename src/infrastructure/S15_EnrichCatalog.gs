/**
 * @file        S15_EnrichCatalog.gs
 * @version     1.0.0 | @updated 26/10/2026 16:49 | @service S15
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
 * @impacts     תרופות_קבועות: קורא A-E (שם, חומר פעיל, מינון, תדירות, סיבה),
 *              כותב M-R בלבד (ATC_Code | Dose_Amount | Dose_Unit |
 *              Times_Per_Day | Days_Per_Week | Enrich_Status="הוצע").
 *              לא נוגע בעמודות A-L. שורה עם R לא ריק — לא מעובדת שוב.
 *              מיפוי_קודים: קורא בלבד, בלוק BA-BF (עמודות 53-58).
 *              Script Properties: S15_PENDING_CATALOG (הצעות קטלוג, JSON).
 *              תלויות: SHEET_CONFIG (COLUMN_MAP.gs), CODE_MAP_SHEET_NAME
 *              (ViewEngine.gs), S13_BODY_SYSTEMS (S13_ExtractMedical.gs —
 *              לשמות המערכות בפרומפט, עם בדיקת typeof), GEMINI_API_KEY.
 * @callers     runS15EnrichIcon (ViewEngine.gs, אייקון "[ S15 העשרה ]")
 * @functions   runS15Enrich | _s15_getDomain | _s15_readCatalog | _s15_normalizeName |
 *              _s15_findInCatalog | _s15_collectPendingRows | _s15_buildPrompt |
 *              _s15_callGemini | _s15_cleanCode | _s15_cleanNumber |
 *              _s15_savePendingCatalog | _s15_getPendingCatalog
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
    pending.forEach(function(item) {
      item.catalogMatch = _s15_findInCatalog(catalog, item.name);
    });

    const response = _s15_callGemini(_s15_buildPrompt(domain, pending));
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