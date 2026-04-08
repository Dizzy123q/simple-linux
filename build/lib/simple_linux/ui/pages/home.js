function initHome() {
    const page = document.getElementById('page-home');

    page.innerHTML = `
        <div class="home-search-wrap hidden" id="homeSearchWrap">
            <div class="home-search-row">
                <input
                    class="input home-search"
                    id="homeSearchBar"
                    type="text"
                    placeholder="Search another manual... e.g. grep, ssh, ls"
                >
                <button class="btn" id="translateBtn">Translate</button>
            </div>
            <div class="translate-panel hidden" id="translatePanel">
                <div class="translate-panel-header">
                    <p class="detail-label">Translation</p>
                    <button class="translate-close" id="translateClose">✕</button>
                </div>
                <div id="translationText" class="translation-text">Select text and press Translate.</div>
            </div>
        </div>

        <div class="home-center" id="homeCenter">
            <h1 class="home-title">Simple Linux</h1>
            <textarea
                class="input home-input"
                id="homeInput"
                placeholder="Type a command..."
                rows="4"
            ></textarea>
        </div>

        <div class="home-man-content hidden" id="homeManContent"></div>
    `;

    const input = document.getElementById('homeInput');
    const searchBar = document.getElementById('homeSearchBar');
    const searchWrap = document.getElementById('homeSearchWrap');
    const center = document.getElementById('homeCenter');
    const manContent = document.getElementById('homeManContent');

    // Pick a random placeholder to keep the UI feeling dynamic
    const placeholders = [
        "Type a command...",
        "Try: ls, nginx, ssh...",
        "Which command do you want to explore?",
        "Type a command name...",
    ];
    input.placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

    // Submit on Enter (Shift+Enter inserts a newline instead)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const query = input.value.trim();
            if (query) loadManPage(query);
        }
    });

    // Submit from the top search bar on Enter
    searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchBar.value.trim();
            if (query) loadManPage(query);
        }
    });

    // Listen for loadMan events dispatched by other pages (e.g. Services "View manual" button)
    document.addEventListener('loadMan', (e) => {
        loadManPage(e.detail);
    });

    // Tracks the last translated string to avoid duplicate API calls
    let lastTranslated = '';

    document.getElementById('translateBtn').addEventListener('click', () => onTranslate());

    // Close the translation panel and reset state
    document.getElementById('translateClose').addEventListener('click', () => {
        document.getElementById('translatePanel').classList.add('hidden');
        lastTranslated = '';
    });

    // Ctrl+T shortcut to trigger translation
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault();
            onTranslate();
        }
    });

    /**
     * Translates the currently selected text on the page.
     * Skips the API call if the same text was already translated.
     */
    async function onTranslate() {
        const selected = window.getSelection().toString().trim();
        const panel = document.getElementById('translatePanel');
        const translationText = document.getElementById('translationText');

        panel.classList.remove('hidden');

        if (!selected) {
            translationText.textContent = 'Select text before translating.';
            return;
        }

        if (selected === lastTranslated) return;
        lastTranslated = selected;
        translationText.textContent = 'Translating...';

        const result = await window.pywebview.api.translate(selected);
        translationText.textContent = result.success ? result.translation : `Eroare: ${result.error}`;
    }

    /**
     * Fetches and renders the man page for a given query.
     * Hides the landing center view and shows the search bar + content area.
     */
    async function loadManPage(query) {
        center.classList.add('hidden');
        searchWrap.classList.remove('hidden');
        manContent.classList.remove('hidden');

        searchBar.value = query;
        manContent.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

        const result = await window.pywebview.api.get_man_page(query);
        manContent.innerHTML = '';

        if (!result.success) {
            manContent.innerHTML = `<p class="man-error">${result.error}</p>`;
            return;
        }

        // Render each section with a title and content block
        result.sections.forEach(section => {
            const titleEl = document.createElement('p');
            titleEl.className = 'man-section-title';
            titleEl.textContent = section.title;
            manContent.appendChild(titleEl);

            const contentEl = document.createElement('p');
            contentEl.className = 'man-paragraph';
            contentEl.textContent = section.content;
            manContent.appendChild(contentEl);
        });
    }
}