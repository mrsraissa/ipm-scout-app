const API_URL =
"https://script.google.com/macros/s/AKfycbwigtd8hNdT8xJ8Lc0P1iz5Y8dTnP6bKXGj1VViasoFLm7sf5MYhqrdOsIVvWyvgZfU/exec";

const pests = ["Thrips", "Aphids", "Whiteflies", "Fungus Gnats"];

const bayMap = {
  "S1":["B1","B2","B3","B4","B5","B6"],
  "S2":["B2","B3","B4","B5","B6","B7","B8","B9","B10","B11","B12","B13","B14","B15","B16"],
  "S3":["B2","B3","B4","B5","B6","B7","B8","B9","B10","B11","B12","B13","B14","B15","B16"],
  "S4":["B1","B2","B3","B4","B5","B6","B7","B8","B9","B10","B11","B12","B13","B14","B15","B16"],
  "S5":["B4","B5","B6","B7","B8","B9","B10"],
  "S6":["B2","B3","B4","B5","B6","B7","B8","B9","B10"],
  "S7":["B2","B3","B4","B5","B6","B7","B8","B9","B10"],
  "S8":["B1","B2","B3","B4","B5","B6","B7","B8","B9"],
  "S9":["B1","B2","B3","B4","B5"],
  "9A":["B6","B7","B8","B9","B10","B11","B12"],
  "9B":["B6","B7","B8","B9","B10","B11","B12"],
  "10A":["B1","B2","B3","B4","B5","B6","B7","B8","B9","B10"],
  "10B":["B1","B2","B3","B4","B5","B6","B7","B8","B9","B10"]
};

const sectionOrder = [
  "S1","S2","S3","S4","S5",
  "S6","S7","S8","S9","9A","9B","10A","10B"
];

let selectedSection = "";
let selectedBay = "";
let weekStatus = {};

renderSections();
loadStatus();

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = "cb_" + Date.now();

    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    const query = new URLSearchParams();
    query.append("action", action);
    query.append("callback", callbackName);

    Object.keys(params).forEach(key => {
      query.append(key, params[key]);
    });

    const script = document.createElement("script");
    script.src = API_URL + "?" + query.toString();

    script.onerror = function() {
      reject(new Error("Apps Script connection failed"));
    };

    document.body.appendChild(script);
  });
}

function postToGoogle(params) {
  const formData = new URLSearchParams();

  Object.keys(params).forEach(key => {
    formData.append(key, params[key]);
  });

  return fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });
}

async function loadStatus() {
  try {
    const result = await jsonp("getStatus");

    if (result.success) {
      weekStatus = result.records || {};
      localStorage.setItem("ipmWeekStatus", JSON.stringify(weekStatus));
      refreshCurrentScreen();
    }
  } catch (err) {
    const saved = localStorage.getItem("ipmWeekStatus");

    if (saved) {
      weekStatus = JSON.parse(saved);
    }

    refreshCurrentScreen();
  }
}

function refreshCurrentScreen() {
  if (selectedSection && !selectedBay) {
    showBays(selectedSection);
  }
}

function renderSections() {
  selectedSection = "";
  selectedBay = "";

  document.getElementById("userName").innerHTML = "Scout Entry";
  document.getElementById("bayContainer").innerHTML = "";
  document.getElementById("entryContainer").innerHTML = "";

  let html = `
    <h2>Select Section</h2>
    <div class="grid section-grid">
  `;

  sectionOrder.forEach(section => {
    html += `
      <button class="btn" onclick="showBays('${section}')">
        ${section}
      </button>
    `;
  });

  html += `</div>`;

  document.getElementById("sectionContainer").innerHTML = html;
}

function showBays(section) {
  selectedSection = section;
  selectedBay = "";

  document.getElementById("sectionContainer").innerHTML = "";
  document.getElementById("entryContainer").innerHTML = "";

  let html = `
    <button class="back-btn" onclick="renderSections()">← Sections</button>
    <h2>${section} - Select Bay</h2>
    <div class="grid bay-grid">
  `;

  bayMap[section].forEach(bay => {
    const status = getStatus(section, bay);

    html += `
      <button class="btn ${status}" onclick="showEntry('${bay}')">
        ${bay}
      </button>
    `;
  });

  html += `</div>`;

  document.getElementById("bayContainer").innerHTML = html;
}

function getStatus(section, bay) {
  const key = section + "|" + bay;
  const status = weekStatus[key] || localStorage.getItem("ipm_" + key);

  if (status === "Scouted") return "scouted";
  if (status === "Empty") return "empty";

  return "not-scouted";
}

function showEntry(bay) {
  selectedBay = bay;

  document.getElementById("bayContainer").innerHTML = "";

  let html = `
    <button class="back-btn" onclick="showBays('${selectedSection}')">← Bays</button>
    <h2>${selectedSection} - ${selectedBay}</h2>

    <div class="compact-entry">
  `;

  pests.forEach(pest => {
    html += `
      <div class="entry-row">
        <label>${pest}</label>
        <input type="number" min="0" value="0" data-pest="${pest}">
      </div>
    `;
  });

  html += `
    </div>

    <label><strong>Notes</strong></label>
    <textarea id="notes" placeholder="Crop, location, treatment, beneficials..."></textarea>

    <button class="save-btn" onclick="saveCounts()">Save Counts</button>
    <button class="empty-btn" onclick="saveEmptyBay()">Empty Bay / No Plants</button>

    <div id="message" class="message"></div>
  `;

  document.getElementById("entryContainer").innerHTML = html;
}

async function saveCounts() {
  const inputs = document.querySelectorAll("#entryContainer input");

  const values = {};

  inputs.forEach(input => {
    values[input.dataset.pest] = input.value;
  });

  const key = selectedSection + "|" + selectedBay;

  document.getElementById("message").innerHTML = "Saving...";

  try {
    await postToGoogle({
      scout: "Raissa",
      section: selectedSection,
      bay: selectedBay,
      status: "Scouted",
      thrips: values["Thrips"] || ,
      aphids: values["Aphids"] || ,
      whiteflies: values["Whiteflies"] || ,
      fungusGnats: values["Fungus Gnats"] || ,
      notes: document.getElementById("notes").value
    });

    weekStatus[key] = "Scouted";

    localStorage.setItem("ipm_" + key, "Scouted");
    localStorage.setItem("ipmWeekStatus", JSON.stringify(weekStatus));

    document.getElementById("message").innerHTML = "Saved";

    setTimeout(() => {
      showBays(selectedSection);
    }, 500);

  } catch(err) {
    document.getElementById("message").innerHTML = "Save failed";
  }
}

async function saveEmptyBay() {
  const key = selectedSection + "|" + selectedBay;

  document.getElementById("message").innerHTML = "Saving...";

  try {
    await postToGoogle({
      scout: "Raissa",
      section: selectedSection,
      bay: selectedBay,
      status: "Empty",
      notes: document.getElementById("notes").value || "No plants"
    });

    weekStatus[key] = "Empty";

    localStorage.setItem("ipm_" + key, "Empty");
    localStorage.setItem("ipmWeekStatus", JSON.stringify(weekStatus));

    document.getElementById("message").innerHTML =
      "Empty bay saved";

    setTimeout(() => {
      showBays(selectedSection);
    }, 500);

  } catch(err) {
    document.getElementById("message").innerHTML = "Save failed";
  }
}
