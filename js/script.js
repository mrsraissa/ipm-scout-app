const API_URL =
"https://script.google.com/macros/s/AKfycbwigtd8hNdT8xJ8Lc0P1iz5Y8dTnP6bKXGj1VViasoFLm7sf5MYhqrdOsIVvWyvgZfU/exec";

let appData = {};
let selectedSection = "";
let selectedBay = "";

const sectionOrder = [
    "S1","S2","S3","S4","S5",
    "S6","S7","S8","S9",
    "9A","9B","10A","10B"
];

loadData();

function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = "jsonpCallback_" + Date.now();

        window[callbackName] = function(data) {
            resolve(data);
            delete window[callbackName];
            script.remove();
        };

        const query = new URLSearchParams({
            action: action,
            callback: callbackName,
            ...params
        });

        const script = document.createElement("script");
        script.src = API_URL + "?" + query.toString();

        script.onerror = reject;

        document.body.appendChild(script);
    });
}

async function loadData() {
    document.getElementById("userName").innerHTML = "Loading data...";

    appData = await jsonp("getAppData");

    document.getElementById("userName").innerHTML =
        "User: " + appData.user.name;

    renderSections();
}

function renderSections() {
    selectedSection = "";
    selectedBay = "";

    document.getElementById("bayContainer").innerHTML = "";
    document.getElementById("entryContainer").innerHTML = "";

    const container = document.getElementById("sectionContainer");

    let html = `
        <h2>Select Section</h2>
        <div class="grid">
    `;

    sectionOrder.forEach(section => {
        if (appData.bayMap[section]) {
            html += `
                <button class="btn" onclick="showBays('${section}')">
                    ${section}
                </button>
            `;
        }
    });

    html += "</div>";

    container.innerHTML = html;
}

function showBays(section) {
    selectedSection = section;
    selectedBay = "";

    document.getElementById("sectionContainer").innerHTML = "";
    document.getElementById("entryContainer").innerHTML = "";

    const container = document.getElementById("bayContainer");

    let html = `
        <button class="back-btn" onclick="renderSections()">← Back to Sections</button>
        <h2>${section} - Select Bay</h2>
        <div class="grid">
    `;

    appData.bayMap[section].forEach(item => {
        const statusClass = getBayStatusClass(section, item.bay);

        html += `
            <button class="btn ${statusClass}" onclick="showEntry('${item.bay}')">
                ${item.bay}
            </button>
        `;
    });

    html += "</div>";

    container.innerHTML = html;
}

function getBayStatusClass(section, bay) {
    const permanentEmpty = appData.emptyBays.some(
        item => item.section === section && item.bay === bay
    );

    if (permanentEmpty) return "empty";

    const key = section + "|" + bay;
    const status = appData.lastRecords[key];

    if (status === "Scouted") return "scouted";
    if (status === "Empty") return "empty";

    return "not-scouted";
}

function showEntry(bay) {
    selectedBay = bay;

    document.getElementById("bayContainer").innerHTML = "";

    const container = document.getElementById("entryContainer");

    let html = `
        <button class="back-btn" onclick="showBays('${selectedSection}')">← Back to Bays</button>
        <h2>${selectedSection} - ${selectedBay}</h2>
    `;

    appData.pests.forEach(pest => {
        html += `
            <div class="entry-row">
                <label>${pest}</label>
                <input type="number" min="0" value="0" data-pest="${pest}">
            </div>
        `;
    });

    html += `
        <label><strong>Notes</strong></label>
        <textarea id="notes" placeholder="Crop, location, beneficials, treatment notes..."></textarea>

        <button class="save-btn" onclick="saveCounts()">Save Counts</button>
        <button class="empty-btn" onclick="saveEmptyBay()">Empty Bay / No Plants</button>

        <div id="message" class="message"></div>
    `;

    container.innerHTML = html;
}

async function saveCounts() {
    const inputs = document.querySelectorAll("#entryContainer input");

    const counts = Array.from(inputs).map(input => ({
        pest: input.dataset.pest,
        count: input.value
    }));

    const entry = {
        scout: appData.user.name,
        section: selectedSection,
        bay: selectedBay,
        status: "Scouted",
        counts: counts,
        notes: document.getElementById("notes").value
    };

    document.getElementById("message").innerHTML = "Saving...";

    const result = await jsonp("saveScoutingEntry", {
        entry: JSON.stringify(entry)
    });

    document.getElementById("message").innerHTML = result.message;

    appData.lastRecords[selectedSection + "|" + selectedBay] = "Scouted";

    setTimeout(() => {
        showBays(selectedSection);
    }, 800);
}

async function saveEmptyBay() {
    const entry = {
        scout: appData.user.name,
        section: selectedSection,
        bay: selectedBay,
        status: "Empty",
        counts: [],
        notes: document.getElementById("notes").value || "No plants"
    };

    document.getElementById("message").innerHTML = "Saving empty bay...";

    const result = await jsonp("saveScoutingEntry", {
        entry: JSON.stringify(entry)
    });

    document.getElementById("message").innerHTML = result.message;

    appData.lastRecords[selectedSection + "|" + selectedBay] = "Empty";

    setTimeout(() => {
        showBays(selectedSection);
    }, 800);
}
