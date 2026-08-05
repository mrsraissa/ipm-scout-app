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

  S5: [
    "B4", "B5", "B6", "B7",
    "B8", "B9", "B10"
  ],

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

  S9: [
    "B1", "B2", "B3", "B4", "B5"
  ],

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function initializeApp() {
  loadCachedStatus();

  // Show the section screen immediately.
  renderSections();

  // Refresh shared status shortly after the page appears.
  setTimeout(() => {
    loadStatus();
  }, 100);
}

/* --------------------------------------------------
   LOCAL CACHE
-------------------------------------------------- */

function loadCachedStatus() {
  const savedStatus =
    localStorage.getItem("ipmWeekStatus");

  if (!savedStatus) {
    weekStatus = {};
    return;
  }

  try {
    weekStatus =
      JSON.parse(savedStatus) || {};
  } catch (error) {
    console.warn(
      "Could not read cached status:",
      error
    );

    weekStatus = {};
    localStorage.removeItem("ipmWeekStatus");
  }
}

function saveStatusCache() {
  try {
    localStorage.setItem(
      "ipmWeekStatus",
      JSON.stringify(weekStatus)
    );
  } catch (error) {
    console.warn(
      "Could not save cached status:",
      error
    );
  }
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

    const script =
      document.createElement("script");

    const timeout = setTimeout(() => {
      cleanup();

      reject(
        new Error(
          "Apps Script request timed out"
        )
      );
    }, 8000);

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

    script.src =
      API_URL + "?" + query.toString();

    script.onerror = function() {
      cleanup();

      reject(
        new Error(
          "Apps Script connection failed"
        )
      );
    };

    document.body.appendChild(script);
  });
}

function postToGoogle(params) {
  const formData = new URLSearchParams();

  Object.keys(params).forEach(key => {
    formData.append(key, params[key]);
  });

  /*
   * Send the request without making the interface wait
   * for the complete Apps Script response.
   */
  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  }).catch(error => {
    console.error(
      "Background submission failed:",
      error
    );
  });
}

/* --------------------------------------------------
   SHARED BAY STATUS
-------------------------------------------------- */

async function loadStatus() {
  if (isStatusRefreshing) {
    return false;
  }

  isStatusRefreshing = true;

  try {
    const result =
      await jsonp("getStatus");

    if (result && result.success) {
      weekStatus =
        result.records || {};

      saveStatusCache();
      refreshCurrentScreen();

      return true;
    }

    return false;
  } catch (error) {
    console.warn(
      "Could not load the latest shared bay status:",
      error
    );

    // Continue showing cached data.
    refreshCurrentScreen();

    return false;
  } finally {
    isStatusRefreshing = false;
  }
}

async function refreshStatusSilently() {
  if (isStatusRefreshing) {
    return false;
  }

  isStatusRefreshing = true;

  try {
    const result =
      await jsonp("getStatus");

    if (result && result.success) {
      weekStatus =
        result.records || {};

      saveStatusCache();

      return true;
    }

    return false;
  } catch (error) {
    console.warn(
      "Could not refresh shared bay status:",
      error
    );

    return false;
  } finally {
    isStatusRefreshing = false;
  }
}

function refreshCurrentScreen() {
  if (
    selectedSection &&
    !selectedBay
  ) {
    renderBayButtons(selectedSection);
  }
}

/* --------------------------------------------------
   SECTION SCREEN
-------------------------------------------------- */

function renderSections() {
  selectedSection = "";
  selectedBay = "";

  const userName =
    document.getElementById("userName");

  const sectionContainer =
    document.getElementById(
      "sectionContainer"
    );

  const bayContainer =
    document.getElementById(
      "bayContainer"
    );

  const entryContainer =
    document.getElementById(
      "entryContainer"
    );

  if (userName) {
    userName.innerHTML = "Scout Entry";
  }

  if (bayContainer) {
    bayContainer.innerHTML = "";
  }

  if (entryContainer) {
    entryContainer.innerHTML = "";
  }

  if (!sectionContainer) {
    console.error(
      "sectionContainer was not found."
    );
    return;
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

  // Show cached colors immediately.
  renderBayButtons(section);

  // Refresh shared data in the background.
  refreshStatusSilently().then(updated => {
    if (
      updated &&
      selectedSection === section &&
      selectedBay === ""
    ) {
      renderBayButtons(section);
    }
  });
}

function renderBayButtons(section) {
  if (!bayMap[section]) {
    console.error(
      "Section not found:",
      section
    );
    return;
  }

  const sectionContainer =
    document.getElementById(
      "sectionContainer"
    );

  const bayContainer =
    document.getElementById(
      "bayContainer"
    );

  const entryContainer =
    document.getElementById(
      "entryContainer"
    );

  if (
    !sectionContainer ||
    !bayContainer ||
    !entryContainer
  ) {
    console.error(
      "One or more screen containers were not found."
    );
    return;
  }

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
    const statusClass =
      getBayStatus(section, bay);

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

function handleBayClick(bay) {
  /*
   * Do not call Apps Script again here.
   * The status was already refreshed when the section opened.
   */
  const key =
    selectedSection + "|" + bay;

  const status = weekStatus[key];

  if (
    status === "Scouted" ||
    status === "Empty"
  ) {
    const shouldModify = confirm(
      "This bay was already entered this week.\n\n" +
      "Do you want to modify it?"
    );

    if (!shouldModify) {
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
    document.getElementById(
      "bayContainer"
    );

  const entryContainer =
    document.getElementById(
      "entryContainer"
    );

  if (!bayContainer || !entryContainer) {
    console.error(
      "Entry screen containers were not found."
    );
    return;
  }

  bayContainer.innerHTML = "";

  let html = `
    <button
      class="back-btn"
      onclick="showBays('${selectedSection}')"
    >
      ← Bays
    </button>

    <h2>
      ${selectedSection} - ${selectedBay}
    </h2>

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

    <div
      id="message"
      class="message"
    ></div>
  `;

  entryContainer.innerHTML = html;
}

function setSavingState(isSaving) {
  const saveCountsButton =
    document.getElementById(
      "saveCountsButton"
    );

  const saveEmptyButton =
    document.getElementById(
      "saveEmptyButton"
    );

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

function saveCounts() {
  const inputs =
    document.querySelectorAll(
      "#entryContainer input"
    );

  const values = {};

  inputs.forEach(input => {
    values[input.dataset.pest] =
      input.value;
  });

  const sectionAtSave =
    selectedSection;

  const bayAtSave =
    selectedBay;

  const key =
    sectionAtSave + "|" + bayAtSave;

  const message =
    document.getElementById("message");

  const notes =
    document.getElementById("notes");

  if (!message) {
    return;
  }

  message.innerHTML = "Sending...";
  setSavingState(true);

  try {
    postToGoogle({
      scout: "Raissa",
      section: sectionAtSave,
      bay: bayAtSave,
      status: "Scouted",
      thrips:
        values["Thrips"] || 0,
      aphids:
        values["Aphids"] || 0,
      whiteflies:
        values["Whiteflies"] || 0,
      fungusGnats:
        values["Fungus Gnats"] || 0,
      notes:
        notes ? notes.value : ""
    });

    /*
     * Update the local screen immediately.
     * The browser does not wait for Apps Script.
     */
    weekStatus[key] = "Scouted";
    saveStatusCache();

    message.innerHTML = "Submitted";

    setTimeout(() => {
      selectedBay = "";
      renderBayButtons(sectionAtSave);
    }, 250);

    /*
     * Confirm the shared sheet status in the background.
     */
    setTimeout(() => {
      refreshStatusSilently().then(updated => {
        if (
          updated &&
          selectedSection === sectionAtSave &&
          selectedBay === ""
        ) {
          renderBayButtons(sectionAtSave);
        }
      });
    }, 1800);

  } catch (error) {
    console.error(
      "Submission failed:",
      error
    );

    message.innerHTML =
      "Submission failed.";

    setSavingState(false);
  }
}

/* --------------------------------------------------
   SAVE EMPTY BAY
-------------------------------------------------- */

function saveEmptyBay() {
  const sectionAtSave =
    selectedSection;

  const bayAtSave =
    selectedBay;

  const key =
    sectionAtSave + "|" + bayAtSave;

  const message =
    document.getElementById("message");

  const notes =
    document.getElementById("notes");

  if (!message) {
    return;
  }

  message.innerHTML = "Sending...";
  setSavingState(true);

  try {
    postToGoogle({
      scout: "Raissa",
      section: sectionAtSave,
      bay: bayAtSave,
      status: "Empty",
      notes:
        notes && notes.value
          ? notes.value
          : "No plants"
    });

    weekStatus[key] = "Empty";
    saveStatusCache();

    message.innerHTML =
      "Empty bay submitted";

    setTimeout(() => {
      selectedBay = "";
      renderBayButtons(sectionAtSave);
    }, 250);

    setTimeout(() => {
      refreshStatusSilently().then(updated => {
        if (
          updated &&
          selectedSection === sectionAtSave &&
          selectedBay === ""
        ) {
          renderBayButtons(sectionAtSave);
        }
      });
    }, 1800);

  } catch (error) {
    console.error(
      "Empty bay submission failed:",
      error
    );

    message.innerHTML =
      "Submission failed.";

    setSavingState(false);
  }
}

/* --------------------------------------------------
   MANUAL TEST
-------------------------------------------------- */

function testSave() {
  const formData =
    new URLSearchParams();

  formData.append("scout", "Raissa");
  formData.append("section", "S1");
  formData.append("bay", "B1");
  formData.append("status", "Scouted");
  formData.append("thrips", "7");
  formData.append("aphids", "1");
  formData.append("whiteflies", "0");
  formData.append("fungusGnats", "2");
  formData.append(
    "notes",
    "GitHub test save"
  );

  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  })
    .then(() => {
      alert("Test sent");
    })
    .catch(error => {
      console.error(
        "Test save failed:",
        error
      );

      alert("Test failed");
    });
}
