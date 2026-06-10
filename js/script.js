const API_URL =
"https://script.google.com/macros/s/AKfycbwigtd8hNdT8xJ8Lc0P1iz5Y8dTnP6bKXGj1VViasoFLm7sf5MYhqrdOsIVvWyvgZfU/exec";

let appData = {
    user: {
        name:
            localStorage.getItem("employeeName")
            || "Scout"
    },
    pests: ["Thrips", "Aphids", "Whiteflies", "Fungus Gnats"],
    lastRecords: {},
    emptyBays: [],
    bayMap: {
        "S1":[["B1",1],["B2",2],["B3",3],["B4",4],["B5",5],["B6",6]],
        "S2":[["B2",1],["B3",2],["B4",3],["B5",4],["B6",5],["B7",6],["B8",7],["B9",8],["B10",9],["B11",10],["B12",11],["B13",12],["B14",13],["B15",14],["B16",15]],
        "S3":[["B2",1],["B3",2],["B4",3],["B5",4],["B6",5],["B7",6],["B8",7],["B9",8],["B10",9],["B11",10],["B12",11],["B13",12],["B14",13],["B15",14],["B16",15]],
        "S4":[["B1",1],["B2",2],["B3",3],["B4",4],["B5",5],["B6",6],["B7",7],["B8",8],["B9",9],["B10",10],["B11",11],["B12",12],["B13",13],["B14",14],["B15",15],["B16",16]],
        "S5":[["B4",1],["B5",2],["B6",3],["B7",4],["B8",5],["B9",6],["B10",7]],
        "S6":[["B2",1],["B3",2],["B4",3],["B5",4],["B6",5],["B7",6],["B8",7],["B9",8],["B10",9]],
        "S7":[["B2",1],["B3",2],["B4",3],["B5",4],["B6",5],["B7",6],["B8",7],["B9",8],["B10",9]],
        "S8":[["B1",1],["B2",2],["B3",3],["B4",4],["B5",5],["B6",6],["B7",7],["B8",8],["B9",9]],
        "S9":[["B1",1],["B2",2],["B3",3],["B4",4],["B5",5]],
        "9A":[["B6",1],["B7",2],["B8",3],["B9",4],["B10",5],["B11",6],["B12",7]],
        "9B":[["B6",1],["B7",2],["B8",3],["B9",4],["B10",5],["B11",6],["B12",7]],
        "10A":[["B1",1],["B2",2],["B3",3],["B4",4],["B5",5],["B6",6],["B7",7],["B8",8],["B9",9],["B10",10]],
        "10B":[["B1",1],["B2",2],["B3",3],["B4",4],["B5",5],["B6",6],["B7",7],["B8",8],["B9",9],["B10",10]]
    }
};

let selectedSection = "";
let selectedBay = "";

const sectionOrder = [
    "S1","S2","S3","S4","S5",
    "S6","S7","S8","S9",
    "9A","9B","10A","10B"
];

renderSections();
loadGoogleData();

function normalizeBayMap(rawMap) {
    const fixed = {};

    Object.keys(rawMap).forEach(section => {
        fixed[section] = rawMap[section].map(item => {
            if (Array.isArray(item)) {
                return { bay: item[0], order: item[1] };
            }
            return item;
        });
    });

    return fixed;
}

appData.bayMap = normalizeBayMap(appData.bayMap);

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

async function loadGoogleData() {
    document.getElementById("userName").innerHTML = "Loading Google data...";

    try {
        const googleData = await jsonp("getAppData");

        appData.user = googleData.user || appData.user;
        appData.pests = googleData.pests || appData.pests;
        appData.lastRecords = googleData.lastRecords || {};
        appData.emptyBays = googleData.emptyBays || [];

        document.getElementById("userName").innerHTML =
            "User: " + appData.user.name;

        if (selectedSection) {
            showBays(selectedSection);
        }
    } catch (error) {
        document.getElementById("userName").innerHTML =
            "Offline mode: data entry screen available";
    }
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

    const inputs =
        document.querySelectorAll("#entryContainer input");

    const formData = new URLSearchParams();

    formData.append("scout", appData.user.name);
    formData.append("section", selectedSection);
    formData.append("bay", selectedBay);
    formData.append("status", "Scouted");
    formData.append(
        "notes",
        document.getElementById("notes").value
    );

    inputs.forEach(input => {
        formData.append(
            input.dataset.pest,
            input.value
        );
    });

    document.getElementById("message").innerHTML =
        "Saving...";

    await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type":
                "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });

    document.getElementById("message").innerHTML =
        "Saved";

    setTimeout(() => {
        showBays(selectedSection);
    }, 600);
}

async function saveEmptyBay() {

    const formData = new URLSearchParams();

    formData.append("scout", appData.user.name);
    formData.append("section", selectedSection);
    formData.append("bay", selectedBay);
    formData.append("status", "Empty");
    formData.append(
        "notes",
        document.getElementById("notes").value || "No plants"
    );

    document.getElementById("message").innerHTML =
        "Saving...";

    await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type":
                "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });

    document.getElementById("message").innerHTML =
        "Saved";

    setTimeout(() => {
        showBays(selectedSection);
    }, 600);
}
