function initEnv() {
    const page = document.getElementById('page-env');

    page.innerHTML = `
        <div class="env-container">
            <div class="env-header">
                <h1 class="panel-title">Environment Variables</h1>
                <span class="env-count hidden" id="envCount"></span>
            </div>
            <input class="input" id="envSearch" type="text" placeholder="Search variables...">
            <div class="env-grid" id="envGrid">
                <div class="spinner-wrap" id="envSpinner">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;

    let allCards = []; // All rendered cards, used for search filtering
    let loaded = false; // Variables are loaded only once, on first page open

    // Filter visible cards based on search input
    document.getElementById('envSearch').addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        allCards.forEach(({ el, name }) => {
            el.style.display = name.toLowerCase().includes(query) ? '' : 'none';
        });
    });

    // Load variables only on first visit to avoid unnecessary API calls
    document.querySelector('[data-page="env"]').addEventListener('click', () => {
        if (!loaded) {
            loadEnvVars();
            loaded = true;
        }
    });


    /**
     * Fetches all environment variables from the API and renders a card for each.
     * Updates the variable count shown in the header.
     */
    async function loadEnvVars() {
        const grid = document.getElementById('envGrid');
        const spinner = document.getElementById('envSpinner');

        spinner.style.display = 'flex';
        const vars = await window.pywebview.api.get_env_variables();
        spinner.style.display = 'none';

        grid.innerHTML = '';
        allCards = [];

        document.getElementById('envCount').textContent = `${vars.length} variables`;
        document.getElementById('envCount').classList.remove('hidden');

        vars.forEach(v => {
            const card = createCard(v);
            grid.appendChild(card);
            allCards.push({ el: card, name: v.name });
        });
    }


    /**
     * Creates a single environment variable card.
     * Long values are truncated at 80 characters for display,
     * but the full value is always copied to the clipboard.
     */
    function createCard(v) {
        const card = document.createElement('div');
        card.className = 'env-card';

        // Truncate long values for display only
        const truncated = v.value.length > 80
            ? v.value.substring(0, 80) + '...'
            : v.value;

        // Escape backticks and $ to safely embed the value in an inline onclick handler
        card.innerHTML = `
            <span class="env-name">${v.name}</span>
            <span class="env-value">${truncated}</span>
            <button class="env-copy" onclick="copyEnvValue(this, \`${v.value.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">Copy</button>
        `;
        return card;
    }
}


/**
 * Copies an environment variable value to the clipboard
 * and briefly shows a checkmark on the button.
 */
function copyEnvValue(btn, value) {
    navigator.clipboard.writeText(value);
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = 'Copy', 1500);
}