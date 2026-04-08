function initServices() {
    const page = document.getElementById('page-services');

    page.innerHTML = `
        <div class="services-layout">

            <!-- Left panel: service list with search and stats -->
            <div class="left-panel">
                <h1 class="panel-title">Services</h1>

                <div class="stats">
                    <div class="stat">
                        <span class="stat-label">Total</span>
                        <span class="stat-value total" id="statTotal">—</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Active</span>
                        <span class="stat-value active" id="statActive">—</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Failed</span>
                        <span class="stat-value failed" id="statFailed">—</span>
                    </div>
                </div>

                <input class="input" id="servicesSearch" type="text" placeholder="Search for services...">

                <div class="services-list" id="servicesList">
                    <div class="spinner-wrap" id="servicesSpinner">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>

            <!-- Right panel: service details, shown after selecting a service -->
            <div class="right-panel">
                <div class="empty-state" id="servicesEmpty">
                    <h2>Services Dashboard</h2>
                    <p>Select a service from the left to view details.</p>
                </div>

                <div class="details hidden" id="servicesDetails">
                    <div class="details-header">
                        <h2 class="details-title" id="detailsName"></h2>
                        <span class="status-badge" id="detailsBadge"></span>
                    </div>

                    <div class="detail-block">
                        <span class="detail-label">Description</span>
                        <span class="detail-value" id="detailsDesc"></span>
                    </div>

                    <div class="detail-block">
                        <span class="detail-label">PID</span>
                        <span class="detail-value" id="detailsPid"></span>
                    </div>

                    <div class="detail-block">
                        <span class="detail-label">Commands</span>
                        <div class="commands" id="commandsList"></div>
                    </div>

                    <!-- Only shown if a man page exists for this service -->
                    <div class="detail-block hidden" id="manBlock">
                        <span class="detail-label">Manual</span>
                        <button class="man-btn" id="servicesManBtn">View manual</button>
                    </div>
                </div>
            </div>

        </div>
    `;

    let currentService = null; // Name of the currently selected service
    let allCards = [];         // All rendered service cards, used for filtering
    let loaded = false;        // Services are loaded only once, on first page open

    // Filter visible cards based on search input
    document.getElementById('servicesSearch').addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        allCards.forEach(({ el, name }) => {
            el.style.display = name.toLowerCase().includes(query) ? '' : 'none';
        });
    });

    // Navigate to Home and trigger the man page load for the current service
    document.getElementById('servicesManBtn').addEventListener('click', () => {
        if (currentService) {
            navigateTo('home');
            // Small delay to let the home page render before dispatching the event
            setTimeout(() => {
                const event = new CustomEvent('loadMan', { detail: currentService });
                document.dispatchEvent(event);
            }, 50);
        }
    });

    // Load services only on first visit to avoid unnecessary API calls
    document.querySelector('[data-page="services"]').addEventListener('click', () => {
        if (!loaded) {
            loadServices();
            loaded = true;
        }
    });


    /**
     * Fetches all services from the API, updates the stats counters
     * and renders a card for each service in the list.
     */
    async function loadServices() {
        const list = document.getElementById('servicesList');
        const spinner = document.getElementById('servicesSpinner');

        spinner.style.display = 'flex';
        const services = await window.pywebview.api.get_services();
        spinner.style.display = 'none';

        document.getElementById('statTotal').textContent = services.length;
        document.getElementById('statActive').textContent = services.filter(s => s.status === 'active').length;
        document.getElementById('statFailed').textContent = services.filter(s => s.status === 'failed').length;

        allCards = [];
        services.forEach(service => {
            const card = createCard(service);
            list.appendChild(card);
            allCards.push({ el: card, name: service.name });
        });
    }


    /**
     * Creates a single service card element with a status dot and click handler.
     */
    function createCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        const dotClass = service.status === 'active' ? 'dot-active' : service.status === 'failed' ? 'dot-failed' : 'dot-inactive';
        card.innerHTML = `
            <div class="card-left">
                <div class="status-dot ${dotClass}"></div>
                <span class="service-name">${service.name}</span>
            </div>
            <span class="service-status-text">${service.status}</span>
        `;
        card.addEventListener('click', () => selectService(card, service.name, service.status));
        return card;
    }


    /**
     * Selects a service, highlights its card and loads its details from the API.
     * Shows a loading state while waiting for the API response.
     */
    async function selectService(cardEl, name, status) {
        allCards.forEach(({ el }) => el.classList.remove('active-card'));
        cardEl.classList.add('active-card');

        currentService = name;

        document.getElementById('servicesEmpty').classList.add('hidden');
        document.getElementById('servicesDetails').classList.remove('hidden');
        document.getElementById('manBlock').classList.add('hidden');

        document.getElementById('detailsName').textContent = name;
        document.getElementById('detailsDesc').textContent = 'Loading...';
        document.getElementById('detailsPid').textContent = '...';

        // Set status badge before the API call so it shows immediately
        const badge = document.getElementById('detailsBadge');
        badge.textContent = status;
        badge.className = `status-badge badge-${status === 'active' ? 'active' : status === 'failed' ? 'failed' : 'inactive'}`;

        // Render commands immediately — they don't require an API call
        setCommands(name);

        const result = await window.pywebview.api.get_service_details(name);

        if (result.success) {
            document.getElementById('detailsDesc').textContent = result.description;
            document.getElementById('detailsPid').textContent = result.pid && result.pid !== '0' ? result.pid : '—';
        } else {
            document.getElementById('detailsDesc').textContent = result.error;
            document.getElementById('detailsPid').textContent = '—';
        }

        // Show the manual button only if a man page exists for this service
        if (result.has_man) {
            document.getElementById('manBlock').classList.remove('hidden');
        }
    }


    /**
     * Renders the three systemctl commands (start, stop, restart) for a service.
     * Each command has a copy button.
     */
    function setCommands(name) {
        const list = document.getElementById('commandsList');
        const commands = [
            `sudo systemctl start ${name}`,
            `sudo systemctl stop ${name}`,
            `sudo systemctl restart ${name}`,
        ];
        list.innerHTML = commands.map(cmd => `
            <div class="cmd-row">
                <span class="cmd-text">${cmd}</span>
                <button class="copy-btn" onclick="copyCmd(this, '${cmd}')">Copy</button>
            </div>
        `).join('');
    }
}


/**
 * Copies a command to the clipboard and briefly shows a checkmark on the button.
 */
function copyCmd(btn, text) {
    navigator.clipboard.writeText(text);
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = 'Copy', 1500);
}