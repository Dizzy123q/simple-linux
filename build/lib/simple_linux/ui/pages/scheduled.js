/**
 * Initializes the Scheduled page.
 * Renders the layout with tabs, search and card grid.
 * Data is loaded only on first visit.
 */
function initScheduled() {
    const page = document.getElementById('page-scheduled');

    page.innerHTML = `
        <div class="sched-container">
            <div class="sched-top">
                <h1 class="panel-title">Scheduled</h1>
                <div class="sched-tabs">
                    <div class="sched-tab active" data-filter="all">All</div>
                    <div class="sched-tab" data-filter="timer">Timers</div>
                    <div class="sched-tab" data-filter="cron">Cron</div>
                </div>
            </div>
            <input class="input" id="schedSearch" type="text" placeholder="Search tasks...">
            <div class="spinner-wrap" id="schedSpinner">
                <div class="spinner"></div>
            </div>
            <div class="sched-grid" id="schedGrid"></div>
        </div>
    `;

    let allJobs = [];        // All jobs fetched from the API
    let currentFilter = 'all'; // Currently active tab filter
    let loaded = false;      // Jobs are loaded only once, on first page open

    // Load jobs only on first visit to avoid unnecessary API calls
    document.querySelector('[data-page="scheduled"]').addEventListener('click', () => {
        if (!loaded) {
            loadScheduled();
            loaded = true;
        }
    });

    // Re-render cards on search input using the current filter
    document.getElementById('schedSearch').addEventListener('input', (e) => {
        renderCards(e.target.value.trim().toLowerCase(), currentFilter);
    });

    // Switch active tab and re-render cards with the new filter
    page.querySelectorAll('.sched-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            page.querySelectorAll('.sched-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            const query = document.getElementById('schedSearch').value.trim().toLowerCase();
            renderCards(query, currentFilter);
        });
    });


    /**
     * Fetches all scheduled jobs from the API and renders them.
     * Shows a spinner while loading.
     */
    async function loadScheduled() {
        document.getElementById('schedSpinner').style.display = 'flex';
        allJobs = await window.pywebview.api.get_scheduled();
        document.getElementById('schedSpinner').style.display = 'none';
        renderCards('', 'all');
    }


    /**
     * Filters allJobs by type and search query, then renders matching cards.
     * Filtering happens entirely on the client — no API call needed.
     * Shows "No results" if nothing matches.
     */
    function renderCards(query, filter) {
        const grid = document.getElementById('schedGrid');
        grid.innerHTML = '';

        const filtered = allJobs.filter(job => {
            const matchFilter = filter === 'all' || job.type === filter;
            const matchQuery = job.name.toLowerCase().includes(query) ||
                               job.schedule.toLowerCase().includes(query);
            return matchFilter && matchQuery;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="sched-empty">No results.</div>`;
            return;
        }

        filtered.forEach(job => {
            const card = document.createElement('div');
            card.className = 'sched-card';
            card.innerHTML = `
                <div class="sched-card-top">
                    <span class="sched-card-name">${job.name}</span>
                    <span class="sched-type-badge sched-type-${job.type}">${job.type}</span>
                </div>
                <div class="sched-card-row">
                    <span class="sched-card-label">Schedule</span>
                    <span class="sched-card-value">${job.schedule}</span>
                </div>
                <div class="sched-card-row">
                    <span class="sched-card-label">Next run</span>
                    <span class="sched-card-value-muted">${job.next}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}