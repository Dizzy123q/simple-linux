/**
 * Initializes the Logs page.
 * Renders the category selection view and loads categories from the API.
 */
function initLogs() {
    const page = document.getElementById('page-logs');
    page.innerHTML = `
        <div class="logs-container" id="logsContainer">
            ${renderCategoriesView()}
        </div>
    `;
    loadCategories();
}


/**
 * Returns the HTML for the category selection view.
 * Shows a grid of category cards the user can click to open.
 */
function renderCategoriesView() {
    return `
        <div id="logsCatView">
            <h1 class="panel-title">Logs</h1>
            <div class="logs-cats-grid" id="logsCatGrid">
                <div class="spinner-wrap"><div class="spinner"></div></div>
            </div>
        </div>
    `;
}


/**
 * Returns the HTML for the log detail view for a given category.
 * Includes a back button, line count selector, search bar and output area.
 */
function renderLogsView(label) {
    return `
        <div id="logsDetailView">
            <div class="logs-detail-header">
                <button class="logs-back-btn" id="logsBackBtn">←</button>
                <span class="panel-title" style="font-size:1.1rem;">${label}</span>
                <select class="logs-lines-select" id="logsLinesSelect">
                    <option value="50">50 lines</option>
                    <option value="100" selected>100 lines</option>
                    <option value="200">200 lines</option>
                    <option value="500">500 lines</option>
                </select>
            </div>
            <input class="input" id="logsSearch" type="text" placeholder="Search logs...">
            <div class="logs-output" id="logsOutput">
                <div class="spinner-wrap"><div class="spinner"></div></div>
            </div>
        </div>
    `;
}


/**
 * Fetches log categories from the API and renders a card for each.
 * Each card shows a color dot, label and description.
 */
async function loadCategories() {
    const grid = document.getElementById('logsCatGrid');
    const cats = await window.pywebview.api.get_log_categories();
    grid.innerHTML = '';

    cats.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'logs-cat-card';
        card.innerHTML = `
            <div class="logs-cat-top">
                <div class="logs-cat-dot" style="background:${cat.color}"></div>
                <span class="logs-cat-name">${cat.label}</span>
            </div>
            <div class="logs-cat-desc">${cat.description}</div>
        `;
        card.addEventListener('click', () => openCategory(cat.id, cat.label));
        grid.appendChild(card);
    });
}


/**
 * Opens a log category by replacing the container with the detail view.
 * Attaches event handlers for the back button, line count selector and search.
 * Fetches logs immediately on open.
 */
async function openCategory(id, label) {
    const container = document.getElementById('logsContainer');
    container.innerHTML = renderLogsView(label);

    // Go back to the category selection view
    document.getElementById('logsBackBtn').addEventListener('click', () => {
        container.innerHTML = renderCategoriesView();
        loadCategories();
    });

    let currentLines = 100;

    // Refetch logs when the line count changes
    document.getElementById('logsLinesSelect').addEventListener('change', async (e) => {
        currentLines = parseInt(e.target.value);
        await fetchLogs(id, currentLines);
    });

    // Filter already-rendered lines without a new API call
    document.getElementById('logsSearch').addEventListener('input', (e) => {
        filterLogs(e.target.value.trim().toLowerCase());
    });

    await fetchLogs(id, currentLines);
}


/**
 * Fetches log lines for a category from the API and renders them in the output area.
 * Each line stores its message in a data attribute for client-side filtering.
 * Lines with warn or err level get a colored label and brighter text.
 */
async function fetchLogs(category, lines) {
    const output = document.getElementById('logsOutput');
    output.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

    const result = await window.pywebview.api.get_logs(category, lines);
    output.innerHTML = '';

    if (!result.success) {
        output.innerHTML = `<div class="logs-error">${result.error}</div>`;
        return;
    }

    result.lines.forEach(line => {
        const el = document.createElement('div');
        el.className = 'logs-line';
        el.dataset.msg = line.msg.toLowerCase(); // Used for client-side search filtering
        el.innerHTML = `
            <span class="logs-ts">${line.ts}</span>
            ${line.level !== 'info' ? `<span class="logs-lvl logs-lvl-${line.level}">${line.level.toUpperCase()}</span>` : ''}
            <span class="logs-msg ${line.level !== 'info' ? 'logs-msg-hi' : ''}">${line.msg}</span>
        `;
        output.appendChild(el);
    });
}


/**
 * Filters visible log lines by hiding those that don't match the query.
 * Operates on already-rendered DOM elements — no API call needed.
 */
function filterLogs(query) {
    document.querySelectorAll('.logs-line').forEach(el => {
        el.style.display = el.dataset.msg.includes(query) ? '' : 'none';
    });
}