const API_URL =
  "https://script.google.com/macros/s/AKfycbwdJdfkIzl3ndZZe7go7IB8EONnlMWcPaHKhfXGUoRco1ShtQ6fcmbyJYDH38Ee7ccy/exec";

const pests = [
  "Thrips",
  "Aphids",
  "Whiteflies",
  "Fungus Gnats"
];

const bayMap = {
  S1: ["B1", "B2", "B3", "B4", "B5", "B6"],

  S2: [
    "B2", "B3", "B4", "B5", "B6",
    "B7", "B8", "B9", "B10", "B11",
    "B12", "B13", "B14", "B15", "B16"
  ],

  S3: [
    "B2", "B3", "B4", "B5", "B6",
    "B7", "B8", "B9", "B10", "B11",
    "B12", "B13", "B14", "B15", "B16"
  ],

  S4: [
    "B1", "B2", "B3", "B4", "B5",
    "B6", "B7", "B8", "B9", "B10",
    "B11", "B12", "B13", "B14", "B15", "B16"
  ],

  S5: ["B4", "B5", "B6", "B7", "B8", "B9", "B10"],

  S6: [
    "B2", "B3", "B4", "B5", "B6",
    "B7", "B8", "B9", "B10"
  ],

  S7: [
    "B2", "B3", "B4", "B5", "B6",
    "B7", "B8", "B9", "B10"
  ],

  S8: [
    "B1", "B2", "B3", "B4", "B5",
    "B6", "B7", "B8", "B9"
  ],

  S9: ["B1", "B2", "B3", "B4", "B5"],

  S9A: [
    "B6", "B7", "B8", "B9",
    "B10", "B11", "B12"
  ],

  S9B: [
    "B6", "B7", "B8", "B9",
    "B10", "B11", "B12"
  ],

  S10A: [
    "B1", "B2", "B3", "B4", "B5",
    "B6", "B7", "B8", "B9", "B10"
  ],

  S10B: [
    "B1", "B2", "B3", "B4", "B5",
    "B6", "B7", "B8", "B9", "B10"
  ]
};

const sectionOrder = [
  "S1", "S2", "S3", "S4", "S5",
  "S6", "S7", "S8", "S9",
  "S9A", "S9B", "S10A", "S10B"
];

let selectedSection = "";
let selectedBay = "";
let weekStatus = {};
let isStatusRefreshing = false;

/* --------------------------------------------------
   INITIAL LOAD
-------------------------------------------------- */

initializeApp();

function initializeApp() {
  loadCachedStatus();
  renderSections();

  // Refresh shared information without delaying the first screen.
  loadStatus();
}

/* --------------------------------------------------
   LOCAL CACHE
-------------------------------------------------- */

function loadCachedStatus() {
  const savedStatus = localStorage.getItem("ipmWeekStatus");

  if (!savedStatus) {
    weekStatus = {};
    return;
  }

  try {
    weekStatus = JSON.parse(savedStatus) || {};
  } catch (error) {
    console.warn("Could not read cached status:", error);
    weekStatus = {};
    localStorage.removeItem("ipmWeekStatus");
  }
}

function saveStatusCache() {
  localStorage.setItem(
    "ipmWeekStatus",
    JSON.stringify(weekStatus)
  );
}

/* --------------------------------------------------
   API REQUESTS
-------------------------------------------------- */

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "cb_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2);

    const script = document.createElement("script");

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Apps Script request timed out"));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }
    }

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    const query = new URLSearchParams();

    query.append("action", action);
    query.append("callback", callbackName);
    query.append("_", Date.now());

    Object.keys(params).forEach(key => {
      query.append(key, params[key]);
    });

    script.src = API_URL + "?" + query.toString();

    script.onerror = function() {
      cleanup();
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

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

/* --------------------------------------------------
   SHARED BAY STATUS
-------------------------------------------------- */

async function loadStatus() {
  if (isStatusRefreshing) {
    return;
  }

  isStatusRefreshing = true;

  try {
    const result = await jsonp("getStatus");

    if (result && result.success) {
      weekStatus = result.records || {};
      saveStatusCache();
      refreshCurrentScreen();
    }
  } catch (error) {
    console.warn(
      "Could not load the latest shared bay status:",
      error
    );

    // Cached data remains visible if Google is slow or offline.
    refreshCurrentScreen();
  } finally {
    isStatusRefreshing = false;
  }
}

async function refreshStatusSilently() {
  if (isStatusRefreshing) {
    return;
  }

  isStatusRefreshing = true;

  try {
    const result = await jsonp("getStatus");

    if (result && result.success) {
      weekStatus = result.records || {};
      saveStatusCache();
    }
  } catch (error) {
    console.warn(
      "Could not refresh shared bay status:",
      error
    );
  } finally {
    isStatusRefreshing = false;
  }
}

function refreshCurrentScreen() {
  if (selectedSection && !selectedBay) {
    renderBayButtons(selectedSection);
  }
}

/* --------------------------------------------------
   SECTION SCREEN
-------------------------------------------------- */

function renderSections() {
  selectedSection = "";
  selectedBay = "";

  const userName = document.getElementById("userName");
  const sectionContainer =
    document.getElementById("sectionContainer");
  const bayContainer =
    document.getElementById("bayContainer");
  const entryContainer =
    document.getElementById("entryContainer");

  if (userName) {
    userName.innerHTML = "Scout Entry";
  }

  if (bayContainer) {
    bayContainer.innerHTML = "";
  }

  if (entryContainer) {
    entryContainer.innerHTML = "";
  }

  let html = `
    <h2>Select Section</h2>

    <div class="grid section-grid">
  `;

  sectionOrder.forEach(section => {
    html += `
      <button
        class="btn"
        onclick="showBays('${section}')"
      >
        ${section}
      </button>
    `;
  });

  html += `</div>`;

  sectionContainer.innerHTML = html;
}

/* --------------------------------------------------
   BAY SCREEN
-------------------------------------------------- */

function showBays(section) {
  selectedSection = section;
  selectedBay = "";

  // Display cached status immediately.
  renderBayButtons(section);

  // Then retrieve the latest status entered by other users.
  refreshStatusSilently().then(() => {
    if (
      selectedSection === section &&
      selectedBay === ""
    ) {
      renderBayButtons(section);
    }
  });
}

function renderBayButtons(section) {
  if (!bayMap[section]) {
    console.error("Section not found:", section);
    return;
  }

  const sectionContainer =
    document.getElementById("sectionContainer");
  const bayContainer =
    document.getElementById("bayContainer");
  const entryContainer =
    document.getElementById("entryContainer");

  sectionContainer.innerHTML = "";
  entryContainer.innerHTML = "";

  let html = `
    <button
      class="back-btn"
      onclick="renderSections()"
    >
      ← Sections
    </button>

    <h2>${section} - Select Bay</h2>

    <div class="grid bay-grid">
  `;

  bayMap[section].forEach(bay => {
    const statusClass = getBayStatus(section, bay);

    html += `
      <button
        class="btn ${statusClass}"
        onclick="handleBayClick('${bay}')"
      >
        ${bay}
      </button>
    `;
  });

  html += `</div>`;

  bayContainer.innerHTML = html;
}

function getBayStatus(section, bay) {
  const key = section + "|" + bay;
  const status = weekStatus[key];

  if (status === "Scouted") {
    return "scouted";
  }

  if (status === "Empty") {
    return "empty";
  }

  return "not-scouted";
}

/* --------------------------------------------------
   OPEN / MODIFY BAY
-------------------------------------------------- */

async function handleBayClick(bay) {
  // Check the server again before opening the bay.
  // This reduces the chance that two people enter the same bay.
  await refreshStatusSilently();

  const key = selectedSection + "|" + bay;
  const status = weekStatus[key];

  if (status === "Scouted" || status === "Empty") {
    const shouldModify = confirm(
      "This bay was already entered this week.\n\n" +
      "Do you want to modify it?"
    );

    if (!shouldModify) {
      renderBayButtons(selectedSection);
      return;
    }
  }

  showEntry(bay);
}

/* --------------------------------------------------
   ENTRY SCREEN
-------------------------------------------------- */

function showEntry(bay) {
  selectedBay = bay;

  const bayContainer =
    document.getElementById("bayContainer");
  const entryContainer =
    document.getElementById("entryContainer");

  bayContainer.innerHTML = "";

  let html = `
    <button
      class="back-btn"
      onclick="showBays('${selectedSection}')"
    >
      ← Bays
    </button>

    <h2>${selectedSection} - ${selectedBay}</h2>

    <div class="compact-entry">
  `;

  pests.forEach(pest => {
    html += `
      <div class="entry-row">
        <label>${pest}</label>

        <input
          type="number"
          min="0"
          value="0"
          data-pest="${pest}"
        >
      </div>
    `;
  });

  html += `
    </div>

    <label>
      <strong>Notes</strong>
    </label>

    <textarea
      id="notes"
      placeholder="Crop, location, treatment, beneficials..."
    ></textarea>

    <button
      id="saveCountsButton"
      class="save-btn"
      onclick="saveCounts()"
    >
      Save Counts
    </button>

    <button
      id="saveEmptyButton"
      class="empty-btn"
      onclick="saveEmptyBay()"
    >
      Empty Bay / No Plants
    </button>

    <div id="message" class="message"></div>
  `;

  entryContainer.innerHTML = html;
}

function setSavingState(isSaving) {
  const saveCountsButton =
    document.getElementById("saveCountsButton");
  const saveEmptyButton =
    document.getElementById("saveEmptyButton");

  if (saveCountsButton) {
    saveCountsButton.disabled = isSaving;
  }

  if (saveEmptyButton) {
    saveEmptyButton.disabled = isSaving;
  }
}

/* --------------------------------------------------
   SAVE COUNTS
-------------------------------------------------- */

async function saveCounts() {
  const inputs =
    document.querySelectorAll("#entryContainer input");

  const values = {};

  inputs.forEach(input => {
    values[input.dataset.pest] = input.value;
  });

  const sectionAtSave = selectedSection;
  const bayAtSave = selectedBay;
  const key = sectionAtSave + "|" + bayAtSave;

  const message = document.getElementById("message");

  message.innerHTML = "Saving...";
  setSavingState(true);

  try {
    await postToGoogle({
      scout: "Raissa",
      section: sectionAtSave,
      bay: bayAtSave,
      status: "Scouted",
      thrips: values["Thrips"] || 0,
      aphids: values["Aphids"] || 0,
      whiteflies: values["Whiteflies"] || 0,
      fungusGnats: values["Fungus Gnats"] || 0,
      notes: document.getElementById("notes").value
    });

    // Update the local screen immediately.
    weekStatus[key] = "Scouted";
    saveStatusCache();

    message.innerHTML = "Saved";

    // Give Apps Script time to finish writing, then refresh.
    await wait(700);
    await refreshStatusSilently();

    selectedBay = "";
    renderBayButtons(sectionAtSave);
  } catch (error) {
    console.error("Save failed:", error);

    message.innerHTML =
      "Save failed. Check the internet connection.";

    setSavingState(false);
  }
}

/* --------------------------------------------------
   SAVE EMPTY BAY
-------------------------------------------------- */

async function saveEmptyBay() {
  const sectionAtSave = selectedSection;
  const bayAtSave = selectedBay;
  const key = sectionAtSave + "|" + bayAtSave;

  const message = document.getElementById("message");

  message.innerHTML = "Saving...";
  setSavingState(true);

  try {
    await postToGoogle({
      scout: "Raissa",
      section: sectionAtSave,
      bay: bayAtSave,
      status: "Empty",
      notes:
        document.getElementById("notes").value ||
        "No plants"
    });

    weekStatus[key] = "Empty";
    saveStatusCache();

    message.innerHTML = "Empty bay saved";

    await wait(700);
    await refreshStatusSilently();

    selectedBay = "";
    renderBayButtons(sectionAtSave);
  } catch (error) {
    console.error("Empty bay save failed:", error);

    message.innerHTML =
      "Save failed. Check the internet connection.";

    setSavingState(false);
  }
}

/* --------------------------------------------------
   MANUAL TEST
-------------------------------------------------- */

function testSave() {
  const formData = new URLSearchParams();

  formData.append("scout", "Raissa");
  formData.append("section", "S1");
  formData.append("bay", "B1");
  formData.append("status", "Scouted");
  formData.append("thrips", "7");
  formData.append("aphids", "1");
  formData.append("whiteflies", "0");
  formData.append("fungusGnats", "2");
  formData.append("notes", "GitHub test save");

  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  })
    .then(() => {
      alert("Test sent");
    })
    .catch(error => {
      console.error("Test save failed:", error);
      alert("Test failed");
    });
}
