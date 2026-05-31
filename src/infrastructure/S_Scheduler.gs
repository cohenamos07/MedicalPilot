/**
 * MedicalPilot — S_Scheduler.gs
 * @version 1.0.1 | @updated 31/05/2026 21:02 | @service SCHEDULER
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S_Scheduler.gs
 * @impacts ניהול גובים מתוזמנים — הפעלה ועצירה מהתפריט.
 *          מנהל טריגר לילי להמרת קבצים ל-TXT (nightlyConvertBatch).
 *          תלויות: S06_ConvertTXT.gs.
 *          נקרא מהתפריט בלבד — אינו חלק מזרימת עיבוד אוטומטי.
 * שינוי: [v1.0.1] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *         [v1.0.0] גרסה ראשונה — גוב המרת TXT
 */
// ══════════════════════════════════════════════════════════════════
// רישום גובים — הגדרות קבועות
// ══════════════════════════════════════════════════════════════════

const JOB_REGISTRY = [
  {
    id:        "CONVERT_TXT",
    name:      "המרת קבצים ל-TXT",
    func:      "nightlyConvertBatch",
    startHour: 0,  startMin: 30,   // 00:30
    endHour:   7,  endMin:   30,   // 07:30
    interval:  30,                  // כל 30 דקות
    batchSize: 2                    // 2 שורות לריצה
  }
];

// ══════════════════════════════════════════════════════════════════
// פונקציה 1 — הפעל גוב (מהתפריט)
// ══════════════════════════════════════════════════════════════════

function startJob() {
  const ui = SpreadsheetApp.getUi();

  // בנה רשימת גובים זמינים (שאינם פעילים כבר)
  const active   = _getActiveJobIds();
  const available = JOB_REGISTRY.filter(function(j) {
    return active.indexOf(j.id) === -1;
  });

  if (available.length === 0) {
    ui.alert("כל הגובים כבר פעילים.", "הרץ 'עצור גוב' לעצירה.", ui.ButtonSet.OK);
    return;
  }

  // בנה טקסט רשימה
  let listText = "בחר גוב להפעלה:\n\n";
  available.forEach(function(j, i) {
    listText += (i + 1) + ". " + j.name + "\n";
    listText += "   כל " + j.interval + " דקות | " + j.batchSize + " שורות\n";
    listText += "   חלון: " + _fmtTime(j.startHour, j.startMin) + " עד " + _fmtTime(j.endHour, j.endMin) + "\n\n";
  });
  listText += "הכנס מספר:";

  const result = ui.prompt("הפעל גוב", listText, ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const choice = parseInt(result.getResponseText().trim());
  if (isNaN(choice) || choice < 1 || choice > available.length) {
    ui.alert("מספר לא תקין.");
    return;
  }

  const job = available[choice - 1];

  // מחיקת טריגר קיים לאותה פונקציה (למקרה שנשאר)
  _deleteTriggerByFunc(job.func);

  // יצירת טריגר חדש
  ScriptApp.newTrigger(job.func)
    .timeBased()
    .everyMinutes(job.interval)
    .create();

  Logger.log("גוב הופעל: " + job.id + " | " + job.func);

  ui.alert(
    "✅ גוב הופעל בהצלחה",
    "שם: "    + job.name + "\n" +
    "מרווח: כל " + job.interval + " דקות\n" +
    "שורות: " + job.batchSize + " לריצה\n" +
    "חלון: "  + _fmtTime(job.startHour, job.startMin) + " עד " + _fmtTime(job.endHour, job.endMin),
    ui.ButtonSet.OK
  );
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 2 — עצור גוב (מהתפריט)
// ══════════════════════════════════════════════════════════════════

function stopJob() {
  const ui = SpreadsheetApp.getUi();

  const triggers = ScriptApp.getProjectTriggers();
  const jobFuncs = JOB_REGISTRY.map(function(j) { return j.func; });

  // מצא טריגרים פעילים של גובים מוכרים
  const activeTriggers = triggers.filter(function(t) {
    return jobFuncs.indexOf(t.getHandlerFunction()) !== -1;
  });

  if (activeTriggers.length === 0) {
    ui.alert("אין גובים פעילים כרגע.", "", ui.ButtonSet.OK);
    return;
  }

  // בנה רשימת פעילים
  let listText = "גובים פעילים:\n\n";
  activeTriggers.forEach(function(t, i) {
    const job = JOB_REGISTRY.find(function(j) { return j.func === t.getHandlerFunction(); });
    const name = job ? job.name : t.getHandlerFunction();
    listText += (i + 1) + ". " + name + "\n";
  });

  if (activeTriggers.length > 1) {
    listText += (activeTriggers.length + 1) + ". עצור הכל\n";
  }

  listText += "\nהכנס מספר:";

  const result = ui.prompt("עצור גוב", listText, ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const choice = parseInt(result.getResponseText().trim());
  if (isNaN(choice) || choice < 1 || choice > activeTriggers.length + 1) {
    ui.alert("מספר לא תקין.");
    return;
  }

  let stopped = 0;

  if (choice === activeTriggers.length + 1) {
    // עצור הכל
    activeTriggers.forEach(function(t) {
      ScriptApp.deleteTrigger(t);
      stopped++;
    });
    ui.alert("✅ כל " + stopped + " הגובים נעצרו.", "", ui.ButtonSet.OK);
  } else {
    // עצור ספציפי
    const t   = activeTriggers[choice - 1];
    const job = JOB_REGISTRY.find(function(j) { return j.func === t.getHandlerFunction(); });
    ScriptApp.deleteTrigger(t);
    stopped++;
    ui.alert("✅ גוב נעצר: " + (job ? job.name : t.getHandlerFunction()), "", ui.ButtonSet.OK);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 3 — הצג גובים פעילים (מהתפריט)
// ══════════════════════════════════════════════════════════════════

function showActiveJobs() {
  const ui       = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  const jobFuncs = JOB_REGISTRY.map(function(j) { return j.func; });

  const activeTriggers = triggers.filter(function(t) {
    return jobFuncs.indexOf(t.getHandlerFunction()) !== -1;
  });

  if (activeTriggers.length === 0) {
    ui.alert("📋 גובים פעילים", "אין גובים פעילים כרגע.", ui.ButtonSet.OK);
    return;
  }

  let report = "📋 גובים פעילים — " + activeTriggers.length + "\n";
  report += "═".repeat(35) + "\n\n";

  activeTriggers.forEach(function(t) {
    const job = JOB_REGISTRY.find(function(j) { return j.func === t.getHandlerFunction(); });
    if (job) {
      report += "✅ " + job.name + "\n";
      report += "   כל " + job.interval + " דקות\n";
      report += "   חלון: " + _fmtTime(job.startHour, job.startMin) + " עד " + _fmtTime(job.endHour, job.endMin) + "\n\n";
    } else {
      report += "✅ " + t.getHandlerFunction() + "\n\n";
    }
  });

  ui.alert("📋 גובים פעילים", report, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציות עזר
// ══════════════════════════════════════════════════════════════════

function _getActiveJobIds() {
  const triggers = ScriptApp.getProjectTriggers();
  const active   = [];
  JOB_REGISTRY.forEach(function(j) {
    triggers.forEach(function(t) {
      if (t.getHandlerFunction() === j.func) active.push(j.id);
    });
  });
  return active;
}

function _deleteTriggerByFunc(funcName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === funcName) ScriptApp.deleteTrigger(t);
  });
}

function _fmtTime(hour, min) {
  return (hour < 10 ? "0" : "") + hour + ":" + (min < 10 ? "0" : "") + min;
}