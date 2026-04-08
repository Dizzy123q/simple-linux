function initHelp() {
    const page = document.getElementById('page-help');
    page.innerHTML = `
        <div class="help-container">
            <h1 class="panel-title">Documentation</h1>
            <div class="help-content">
                <div class="help-section">
                    <p class="detail-label">What is Simple Linux?</p>
                    <p class="help-text">
                        Simple Linux is a visual assistant that helps beginners explore and understand their Linux system in a simple and intuitive way.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">Home</p>
                    <p class="help-text">
                        Type a command name and press <kbd>Enter</kbd> to view its manual page. You can search for another command anytime using the search bar at the top. Select any text and press <kbd>Ctrl+T</kbd> to translate it with DeepL.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">Services</p>
                    <p class="help-text">
                        View all systemd services on your system. Search by name and click a service to see its status, PID, description, and quick commands for starting, stopping and restarting it.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">Environment</p>
                    <p class="help-text">
                        Browse all environment variables on your system. Search by name and copy values with one click to look them up online.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">Logs</p>
                    <p class="help-text">
                        Explore system logs organized by category: System, Kernel, Auth, Boot and Applications. Select a category, choose how many lines to display and search for specific keywords.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">Scheduled</p>
                    <p class="help-text">
                        View all scheduled tasks on your system — both systemd timers and cron jobs. See the schedule and next execution time for each task. Filter by type using the tabs at the top.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">System Info</p>
                    <p class="help-text">
                        Monitor your system hardware in real time — CPU, RAM, GPU, disk usage, network interfaces and uptime. Data refreshes automatically every 2 seconds.
                    </p>
                </div>
                <div class="help-section">
                    <p class="detail-label">Settings</p>
                    <p class="help-text">
                        Add your DeepL API key and choose the language for manual page translations. Use <kbd>Ctrl++</kbd> and <kbd>Ctrl+-</kbd> to adjust the zoom level.
                    </p>
                </div>
            </div>
        </div>
    `;
}