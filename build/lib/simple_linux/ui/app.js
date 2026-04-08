// Current zoom level, synced with config on startup
let currentZoom = 1.0;

/**
 * Applies zoom by scaling the root font size.
 * All rem-based sizes in the UI scale proportionally.
 */
function applyZoom(zoom) {
    document.documentElement.style.fontSize = `${zoom * 16}px`;
}

// Wait for pywebview to be ready before initializing anything
window.addEventListener('pywebviewready', async () => {

    // Load and apply saved zoom level from config
    currentZoom = await window.pywebview.api.get_zoom();
    applyZoom(currentZoom);

    // Ctrl++ to zoom in, Ctrl+- to zoom out (clamped between 0.7 and 1.5)
    document.addEventListener('keydown', async (e) => {
        if (!e.ctrlKey) return;
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            currentZoom = Math.min(1.5, Math.round((currentZoom + 0.1) * 10) / 10);
        } else if (e.key === '-') {
            e.preventDefault();
            currentZoom = Math.max(0.7, Math.round((currentZoom - 0.1) * 10) / 10);
        } else {
            return;
        }
        applyZoom(currentZoom);
        await window.pywebview.api.save_zoom(currentZoom);
    });

    // Initialize all pages — each function builds the page's HTML and attaches events
    initHome();
    initServices();
    initEnv();
    initSettings();
    initHelp();
    initSysinfo();
    initScheduled();
    initLogs();

    // Attach click handlers to all sidebar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.page);
        });
    });

    // Start on the home page
    navigateTo('home');
});

/**
 * Switches the active page by toggling CSS classes.
 * Hides all pages and nav items, then activates the selected one.
 */
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
}