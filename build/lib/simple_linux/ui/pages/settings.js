// Supported translation languages — display name maps to DeepL language code
const LANGUAGES = {
    "Romanian":  "RO",
    "English":   "EN",
    "French":    "FR",
    "German":    "DE",
    "Spanish":   "ES",
    "Italian":   "IT",
};

// Tracks the currently selected language code across renders
let selectedLang = "RO";

function initSettings() {
    const page = document.getElementById('page-settings');

    page.innerHTML = `
        <div class="settings-container">
            <h1 class="panel-title">Settings</h1>
            <div class="settings-section">
                <p class="detail-label">DeepL API Key</p>
                <div class="input-row">
                    <input
                        class="input"
                        id="apiKeyInput"
                        type="password"
                        placeholder="Enter your DeepL API key..."
                    >
                    <button class="btn" id="toggleKeyBtn">Show</button>
                </div>
            </div>
            <div class="settings-section">
                <p class="detail-label">Translation language</p>
                <div class="lang-list" id="langList"></div>
            </div>
            <div class="settings-footer">
                <button class="btn btn-primary" id="saveBtn">Save</button>
                <span class="confirm-msg hidden" id="confirmMsg"></span>
            </div>
        </div>
    `;

    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleKeyBtn = document.getElementById('toggleKeyBtn');

    // Toggle API key visibility between password and plain text
    toggleKeyBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
    });

    document.getElementById('saveBtn').addEventListener('click', () => onSave());

    // Build the language list once on init
    buildLangList();

    // Reload saved settings every time the page is opened
    document.querySelector('[data-page="settings"]').addEventListener('click', () => {
        loadSettings();
    });


    /**
     * Renders the language selection list from the LANGUAGES map.
     * Each item stores its language code in a data attribute for easy lookup.
     */
    function buildLangList() {
        const list = document.getElementById('langList');
        list.innerHTML = '';
        Object.entries(LANGUAGES).forEach(([name, code]) => {
            const item = document.createElement('div');
            item.className = 'lang-item';
            item.dataset.code = code;
            item.innerHTML = `
                <div class="lang-dot"></div>
                <span>${name}</span>
            `;
            item.addEventListener('click', () => selectLang(code));
            list.appendChild(item);
        });
    }


    /**
     * Marks the selected language item as active and updates selectedLang.
     */
    function selectLang(code) {
        selectedLang = code;
        document.querySelectorAll('.lang-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.code === code);
        });
    }


    /**
     * Loads the saved config from the API and populates the form fields.
     */
    async function loadSettings() {
        const config = await window.pywebview.api.get_settings();
        document.getElementById('apiKeyInput').value = config.deepl_key || '';
        selectLang(config.target_lang || 'RO');
    }


    /**
     * Saves the current form values to config.
     * Reads the existing zoom value from config to avoid overwriting it.
     * Shows a success or error message for 3 seconds after saving.
     */
    async function onSave() {
        const key = document.getElementById('apiKeyInput').value.trim();

        // Read current config to preserve zoom level
        const config = await window.pywebview.api.get_settings();

        const result = await window.pywebview.api.save_settings({
            deepl_key: key,
            target_lang: selectedLang,
            zoom: config.zoom || 1.0,
        });

        const confirmMsg = document.getElementById('confirmMsg');
        confirmMsg.classList.remove('hidden');

        if (result.success) {
            confirmMsg.textContent = '✓ Saved successfully.';
            confirmMsg.style.color = 'var(--accent-green)';
        } else {
            confirmMsg.textContent = `✗ Error: ${result.error}`;
            confirmMsg.style.color = 'var(--accent-red)';
        }

        setTimeout(() => confirmMsg.classList.add('hidden'), 3000);
    }
}