/**
 * MedicalPilot — TestLab.gs
 * ספריית ניסויים זמניים — לא מועלה לגיטהאב
 * @version 2.0.0 | @updated 30/04/2026 17:30
 */

// ══════════════════════════════════════════════════════════════════
// ניסוי 1 — קריאת Gemini ישירה
// ══════════════════════════════════════════════════════════════════

function testGeminiDirect() {
  const ui     = SpreadsheetApp.getUi();
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  const url    = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  const payload = { contents: [{ parts: [{ text: "ענה במילה אחת בעברית: מה צבע השמיים?" }] }] };
  const response = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
  ui.alert("ניסוי Gemini ישיר\nקוד: " + response.getResponseCode() + "\n\n" + response.getContentText().substring(0, 500));
}

// ══════════════════════════════════════════════════════════════════
// ניסוי 2 — בדיקת מנהל מחלצים
// ══════════════════════════════════════════════════════════════════

function testExtractorManager() {
  const ui = SpreadsheetApp.getUi();
  try {
    const extractor = getAvailableExtractor("COMPLEX");
    if (!extractor) { ui.alert("❌ אין מחלץ זמין"); return; }
    ui.alert("✅ מחלץ נמצא:\nID: " + extractor.id + "\nנשאר: " + extractor.remaining + "\nסטטוס: " + extractor.status);
  } catch (e) { ui.alert("❌ שגיאה: " + e.message); }
}

// ══════════════════════════════════════════════════════════════════
// ניסוי 3 — Gemini דרך מנהל מחלצים
// ══════════════════════════════════════════════════════════════════

function testGeminiViaManager() {
  const ui     = SpreadsheetApp.getUi();
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  try {
    const extractor = getAvailableExtractor("SIMPLE");
    if (!extractor) { ui.alert("❌ אין מחלץ זמין"); return; }
    const url      = extractor.url + "?key=" + apiKey;
    const payload  = { contents: [{ parts: [{ text: "ענה במילה אחת בעברית: מה צבע השמיים?" }] }] };
    const response = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    const code     = response.getResponseCode();
    if (code === 200) { updateExtractorUsage(extractor.id); }
    ui.alert((code === 200 ? "✅" : "❌") + " מחלץ: " + extractor.id + "\nקוד: " + code + "\n\n" + response.getContentText().substring(0, 500));
  } catch (e) { ui.alert("❌ שגיאה: " + e.message); }
}