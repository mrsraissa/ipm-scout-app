const API_URL =
"https://script.google.com/macros/s/AKfycbwigtd8hNdT8xJ8Lc0P1iz5Y8dTnP6bKXGj1VViasoFLm7sf5MYhqrdOsIVvWyvgZfU/exec";

let appData = {};

loadData();

function loadData() {

    const callbackName = "jsonpCallback_" + Date.now();

    window[callbackName] = function(data) {

        appData = data;

        render();

        delete window[callbackName];
        script.remove();
    };

    const script = document.createElement("script");

    script.src =
        API_URL +
        "?action=getAppData" +
        "&callback=" +
        callbackName;

    document.body.appendChild(script);
}

function render() {

    document.getElementById("userName").innerHTML =
        "User: " + appData.user.name;

    renderSections();
}

function renderSections() {

    const container =
        document.getElementById("sectionContainer");

    let html = `
        <h2>Select Section</h2>
        <div class="grid">
    `;

    Object.keys(appData.bayMap)
        .sort()
        .forEach(section => {

            html += `
                <button
                    class="btn"
                    onclick="showBays('${section}')">
                    ${section}
                </button>
            `;
        });

    html += "</div>";

    container.innerHTML = html;
}

function showBays(section) {

    const container =
        document.getElementById("bayContainer");

    let html = `
        <h2>${section}</h2>
        <div class="grid">
    `;

    appData.bayMap[section].forEach(item => {

        html += `
            <button class="btn">
                ${item.bay}
            </button>
        `;
    });

    html += "</div>";

    container.innerHTML = html;
}
