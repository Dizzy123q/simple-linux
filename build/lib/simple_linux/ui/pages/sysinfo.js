let sysinfoInterval = null;

function initSysinfo() {
    const page = document.getElementById('page-sysinfo');

    page.innerHTML = `
        <div class="sysinfo-container">
            <h1 class="panel-title">System Info</h1>
            <div class="sysinfo-grid" id="sysinfoGrid">
                <div class="spinner-wrap" id="sysinfoSpinner">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;

    document.querySelector('[data-page="sysinfo"]').addEventListener('click', () => {
        startPolling();
    });

    // Opreste polling cand pleci de pe pagina
    document.querySelectorAll('.nav-item:not([data-page="sysinfo"])').forEach(item => {
        item.addEventListener('click', () => {
            stopPolling();
        });
    });
}


function startPolling() {
    loadSysinfo();
    sysinfoInterval = setInterval(loadSysinfo, 2000);
}


function stopPolling() {
    if (sysinfoInterval) {
        clearInterval(sysinfoInterval);
        sysinfoInterval = null;
    }
}


async function loadSysinfo() {
    const data = await window.pywebview.api.get_system_info();
    const grid = document.getElementById('sysinfoGrid');
    if (!grid) return;

    document.getElementById('sysinfoSpinner')?.remove();

    grid.innerHTML = `
        ${renderOS(data.os)}
        ${renderCPU(data.cpu)}
        ${renderGPU(data.gpu)}
        ${renderRAM(data.ram)}
        ${renderDisk(data.disk)}
        ${renderUptime(data.uptime)}
        ${renderNetwork(data.network)}
    `;
}


function renderOS(os) {
    if (os.error) return renderError('Operating System', os.error);
    return `
        <div class="si-card">
            ${cardHeader(iconGlobe(), 'Operating System')}
            <div class="si-rows">
                ${row('Distribution', os.distro)}
                ${row('Kernel', os.kernel)}
                ${row('Architecture', os.arch)}
                ${row('Hostname', os.hostname)}
            </div>
        </div>
    `;
}


function renderCPU(cpu) {
    if (cpu.error) return renderError('CPU', cpu.error);
    const color = cpu.usage > 80 ? '#f87171' : cpu.usage > 50 ? '#fbbf24' : '#4ade80';
    return `
        <div class="si-card">
            ${cardHeader(iconCPU(), 'CPU')}
            <div class="si-big-row">
                <div>
                    <div class="si-big-value">${cpu.usage}%</div>
                    <div class="si-big-label">Usage</div>
                </div>
                <div class="si-progress-wrap">
                    <div class="si-progress-bar">
                        <div class="si-progress-fill" style="width:${cpu.usage}%;background:${color};transition:width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
            <div class="si-divider"></div>
            <div class="si-rows">
                ${row('Model', cpu.model)}
                ${row('Cores', `${cpu.cores} / ${cpu.threads} threads`)}
                ${cpu.freq_ghz ? row('Frequency', `${cpu.freq_ghz} GHz`) : ''}
                ${cpu.temp !== null && cpu.temp !== undefined ? row('Temperature', `${cpu.temp}°C`) : ''}
            </div>
        </div>
    `;
}


function renderGPU(gpu) {
    if (gpu.error) return renderError('GPU', gpu.error);
    const hasUsage = gpu.usage !== null && gpu.usage !== undefined;
    const color = '#a78bfa';
    return `
        <div class="si-card">
            ${cardHeader(iconGPU(), 'GPU')}
            ${hasUsage ? `
            <div class="si-big-row">
                <div>
                    <div class="si-big-value">${gpu.usage}%</div>
                    <div class="si-big-label">Usage</div>
                </div>
                <div class="si-progress-wrap">
                    <div class="si-progress-bar">
                        <div class="si-progress-fill" style="width:${gpu.usage}%;background:${color};transition:width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
            <div class="si-divider"></div>
            ` : ''}
            <div class="si-rows">
                ${row('Model', gpu.model)}
                ${gpu.vram_total_gb ? row('VRAM', `${gpu.vram_used_gb} / ${gpu.vram_total_gb} GB`) : ''}
                ${gpu.temp !== null && gpu.temp !== undefined ? row('Temperature', `${gpu.temp}°C`) : ''}
                ${gpu.driver ? row('Driver', gpu.driver) : ''}
            </div>
        </div>
    `;
}


function renderRAM(ram) {
    if (ram.error) return renderError('RAM', ram.error);
    const color = ram.percent > 80 ? '#f87171' : ram.percent > 60 ? '#fbbf24' : '#60a5fa';
    return `
        <div class="si-card">
            ${cardHeader(iconRAM(), 'RAM')}
            <div class="si-big-row">
                <div>
                    <div class="si-big-value">${ram.percent}%</div>
                    <div class="si-big-label">Usage</div>
                </div>
                <div class="si-progress-wrap">
                    <div class="si-progress-bar">
                        <div class="si-progress-fill" style="width:${ram.percent}%;background:${color};transition:width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
            <div class="si-divider"></div>
            <div class="si-rows">
                ${row('Total', `${ram.total_gb} GB`)}
                ${row('Used', `${ram.used_gb} GB`)}
                ${row('Free', `${ram.free_gb} GB`)}
            </div>
        </div>
    `;
}


function renderDisk(disks) {
    if (!disks || disks.length === 0) return '';
    if (disks[0].error) return renderError('Disk', disks[0].error);

    const rows = disks.map(d => `
        <div class="si-rows">
            ${row(d.mountpoint, `${d.used_gb} / ${d.total_gb} GB · ${d.percent}%`)}
        </div>
        <div class="si-progress-bar" style="margin: -0.25rem 0 0.5rem;">
            <div class="si-progress-fill" style="width:${d.percent}%;background:#fbbf24;transition:width 0.5s ease;"></div>
        </div>
    `).join('');

    return `
        <div class="si-card">
            ${cardHeader(iconDisk(), 'Disk')}
            ${rows}
        </div>
    `;
}


function renderUptime(uptime) {
    return `
        <div class="si-card">
            ${cardHeader(iconClock(), 'Uptime')}
            <div class="si-big-value">${uptime}</div>
            <div class="si-big-label">system uptime</div>
        </div>
    `;
}


function renderNetwork(network) {
    if (!network || network.error) return renderError('Network', network?.error || 'Nedetectat');

    const ifaces = Object.entries(network).map(([name, data]) => `
        <div class="si-rows">
            ${row('Interface', name)}
            ${row('IP', data.ip)}
            ${row('↓ Primit', `${data.bytes_recv_gb} GB`)}
            ${row('↑ Trimis', `${data.bytes_sent_gb} GB`)}
        </div>
    `).join('<div class="si-divider"></div>');

    return `
        <div class="si-card">
            ${cardHeader(iconNetwork(), 'Network')}
            ${ifaces}
        </div>
    `;
}


function renderError(title, msg) {
    return `
        <div class="si-card">
            <div class="si-card-header">
                <span class="si-card-title">${title}</span>
            </div>
            <span class="si-error">${msg}</span>
        </div>
    `;
}


function cardHeader(icon, title) {
    return `
        <div class="si-card-header">
            <div class="si-icon-wrap">${icon}</div>
            <span class="si-card-title">${title}</span>
        </div>
    `;
}


function row(label, value) {
    return `
        <div class="si-row">
            <span class="si-row-label">${label}</span>
            <span class="si-row-value">${value}</span>
        </div>
    `;
}


// ─── ICONS ───────────────────────────────────────────────

function iconGlobe() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
}

function iconCPU() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
}

function iconGPU() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M14 12h4"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="18" y1="2" x2="18" y2="6"/><line x1="6" y1="18" x2="6" y2="22"/><line x1="18" y1="18" x2="18" y2="22"/></svg>`;
}

function iconRAM() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><line x1="6" y1="11" x2="6" y2="13"/><line x1="10" y1="11" x2="10" y2="13"/><line x1="14" y1="11" x2="14" y2="13"/><line x1="18" y1="11" x2="18" y2="13"/></svg>`;
}

function iconDisk() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`;
}

function iconClock() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
}

function iconNetwork() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#606060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`;
}