const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  let result = { success: false, message: "Invalid action" };

  try {
    if (action === "getStatus") {
      result = getThisWeekStatus();
    }

    if (action === "saveScoutingEntry") {
      const entry = JSON.parse(e.parameter.entry);
      result = saveScoutingEntry(entry);
    }
  } catch (err) {
    result = { success: false, message: err.message };
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(result) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result = { success: false, message: "Invalid request" };

  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === "saveScoutingEntry") {
      result = saveScoutingEntry(body.entry);
    }
  } catch (err) {
    result = { success: false, message: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;

  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function saveScoutingEntry(entry) {
  const sheet = SS.getSheetByName("Scout_Data");
  const now = new Date();
  const week = getWeekNumber(now);
  const scout = entry.scout || "Raissa";

  if (entry.status === "Empty") {
    sheet.appendRow([
      now,
      week,
      scout,
      entry.section,
      entry.bay,
      "Empty",
      "",
      "",
      entry.notes || "No plants"
    ]);

    return {
      success: true,
      message: "Empty bay saved",
      week: week
    };
  }

  entry.counts.forEach(item => {
    sheet.appendRow([
      now,
      week,
      scout,
      entry.section,
      entry.bay,
      "Scouted",
      item.pest,
      Number(item.count || 0),
      entry.notes || ""
    ]);
  });

  return {
    success: true,
    message: "Counts saved",
    week: week
  };
}

function getThisWeekStatus() {
  const sheet = SS.getSheetByName("Scout_Data");
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return {
      success: true,
      records: {}
    };
  }

  const headers = data.shift();
  const weekNow = getWeekNumber(new Date());

  const weekIndex = headers.indexOf("Week");
  const sectionIndex = headers.indexOf("Section");
  const bayIndex = headers.indexOf("Bay");
  const statusIndex = headers.indexOf("Status");

  const records = {};

  data.forEach(row => {
    if (row[weekIndex] == weekNow) {
      const key = row[sectionIndex] + "|" + row[bayIndex];
      records[key] = row[statusIndex];
    }
  });

  return {
    success: true,
    week: weekNow,
    records: records
  };
}
