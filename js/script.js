const API_URL =
"https://script.google.com/macros/s/AKfycbwigtd8hNdT8xJ8Lc0P1iz5Y8dTnP6bKXGj1VViasoFLm7sf5MYhqrdOsIVvWyvgZfU/exec";
let appData = {};

loadData();

async function loadData(){

    const response = await fetch(
        API_URL + "?action=getAppData"
    );

    appData = await response.json();

    render();
}

function render(){

    document.getElementById("userName").innerHTML =
        "User: " + appData.user.name;

    renderSections();
}

function renderSections(){

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

function showBays(section){

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
