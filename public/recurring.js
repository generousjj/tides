/**
 * Recurring Practice Dashboard - JavaScript
 */

// === State Management ===
const state = {
    stations: [],
    config: null,
    practiceResults: [], // Stores fetched practice tide data for current period
    periodOffset: 0, // 0 = current 4 weeks, 1 = next 4 weeks, -1 = previous 4 weeks
    currentView: 'calendar', // 'calendar' or 'list'
    isLoading: false
};

// === DOM Elements ===
const elements = {
    // Setup Panel
    setupPanel: document.getElementById('setup-panel'),
    stationSelect: document.getElementById('station'),
    customStationBtn: document.getElementById('custom-station-btn'),
    customStation: document.getElementById('custom-station'),
    minimumHeight: document.getElementById('minimum-height'),
    dayCheckboxes: document.querySelectorAll('input[name="day"]'),
    startTime: document.getElementById('start-time'),
    endTime: document.getElementById('end-time'),
    loadDashboardBtn: document.getElementById('load-dashboard-btn'),

    // Dashboard
    dashboard: document.getElementById('dashboard'),
    scheduleSummary: document.getElementById('schedule-summary'),
    shareBtn: document.getElementById('share-btn'),
    editBtn: document.getElementById('edit-btn'),
    sharePanel: document.getElementById('share-panel'),
    shareLink: document.getElementById('share-link'),
    copyLinkBtn: document.getElementById('copy-link-btn'),
    calendarGrid: document.getElementById('calendar-grid'),
    detailSection: document.getElementById('detail-section'),
    detailContainer: document.getElementById('detail-container'),

    // View Toggle
    viewTabs: document.querySelectorAll('.view-tab'),
    calendarView: document.getElementById('calendar-view'),
    listView: document.getElementById('list-view'),
    listContainer: document.getElementById('list-container'),
    listPeriodLabel: document.getElementById('list-period-label'),
    prevListBtn: document.getElementById('prev-list-btn'),
    nextListBtn: document.getElementById('next-list-btn'),

    // Calendar Navigation
    prevPeriodBtn: document.getElementById('prev-period-btn'),
    nextPeriodBtn: document.getElementById('next-period-btn'),
    periodLabel: document.getElementById('period-label'),

    // Inline loading
    calendarLoading: document.getElementById('calendar-loading'),
    listLoading: document.getElementById('list-loading'),

    loadingOverlay: document.getElementById('loading-overlay')
};

// Day names
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    attachEventListeners();
    await loadStations();
    loadFromUrlParams();
}

function attachEventListeners() {
    elements.customStationBtn.addEventListener('click', toggleCustomStation);
    elements.customStation.addEventListener('input', (e) => {
        if (e.target.value.trim()) elements.stationSelect.value = '';
    });
    elements.stationSelect.addEventListener('change', (e) => {
        if (e.target.value) elements.customStation.value = '';
    });

    elements.loadDashboardBtn.addEventListener('click', loadDashboard);
    elements.shareBtn.addEventListener('click', toggleSharePanel);
    elements.editBtn.addEventListener('click', showSetupPanel);
    elements.copyLinkBtn.addEventListener('click', copyLinkToClipboard);

    // Calendar navigation
    elements.prevPeriodBtn.addEventListener('click', () => navigatePeriod(-1));
    elements.nextPeriodBtn.addEventListener('click', () => navigatePeriod(1));
    elements.periodLabel.addEventListener('click', goToToday);

    // List navigation
    elements.prevListBtn.addEventListener('click', () => navigatePeriod(-1));
    elements.nextListBtn.addEventListener('click', () => navigatePeriod(1));
    elements.listPeriodLabel.addEventListener('click', goToToday);

    // View toggle
    elements.viewTabs.forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });
}

function switchView(view) {
    state.currentView = view;

    // Update tab active state
    elements.viewTabs.forEach(t => {
        t.classList.toggle('active', t.dataset.view === view);
    });

    // Show/hide views
    elements.calendarView.classList.toggle('active', view === 'calendar');
    elements.listView.classList.toggle('active', view === 'list');

    // Hide detail section when switching
    elements.detailSection.classList.add('hidden');

    // Update URL with new view preference (only if config exists)
    if (state.config) {
        updateUrl();
        generateShareLink();
    }
}

function toggleCustomStation() {
    const isHidden = elements.customStation.classList.contains('hidden');
    elements.customStation.classList.toggle('hidden', !isHidden);
    elements.customStationBtn.classList.toggle('active', isHidden);
    if (isHidden) elements.customStation.focus();
    else elements.customStation.value = '';
}

// === URL Parameter Handling ===
function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('days')) return;

    // Immediately hide setup panel since we have URL params
    elements.setupPanel.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');

    const station = params.get('station');
    if (station) {
        const optionExists = Array.from(elements.stationSelect.options).some(opt => opt.value === station);
        if (optionExists) {
            elements.stationSelect.value = station;
        } else {
            elements.customStation.value = station;
            elements.customStation.classList.remove('hidden');
            elements.customStationBtn.classList.add('active');
        }
    }

    if (params.has('min')) {
        elements.minimumHeight.value = params.get('min');
    }

    const days = params.get('days').split(',').map(Number);
    elements.dayCheckboxes.forEach(cb => {
        cb.checked = days.includes(parseInt(cb.value));
    });

    if (params.has('start')) elements.startTime.value = params.get('start');
    if (params.has('end')) elements.endTime.value = params.get('end');

    // Load view preference from URL
    if (params.has('view')) {
        const view = params.get('view');
        if (view === 'list' || view === 'calendar') {
            switchView(view);
        }
    }

    // Auto-load dashboard
    setTimeout(() => loadDashboard(), 100);
}

// === Station Loading ===
async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        state.stations = await response.json();
        populateStationDropdown();
    } catch (error) {
        console.error('Failed to load stations:', error);
        elements.stationSelect.innerHTML = '<option value="9414523">Redwood City, CA (9414523)</option>';
    }
}

function populateStationDropdown() {
    const grouped = groupByRegion(state.stations);
    let html = '<option value="">Select a station...</option>';

    for (const [region, stations] of Object.entries(grouped)) {
        html += `<optgroup label="${region}">`;
        stations.forEach(station => {
            const selected = station.id === '9414523' ? 'selected' : '';
            html += `<option value="${station.id}" ${selected}>${station.name} (${station.id})</option>`;
        });
        html += '</optgroup>';
    }
    elements.stationSelect.innerHTML = html;
}

function groupByRegion(stations) {
    return stations.reduce((acc, station) => {
        if (!acc[station.region]) acc[station.region] = [];
        acc[station.region].push(station);
        return acc;
    }, {});
}

// === Dashboard Loading ===
async function loadDashboard() {
    const selectedDays = Array.from(elements.dayCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));

    if (selectedDays.length === 0) {
        showError('Please select at least one practice day.');
        return;
    }

    const station = elements.customStation.value.trim() || elements.stationSelect.value;
    if (!station) {
        showError('Please select or enter a NOAA station.');
        return;
    }

    state.config = {
        station,
        minimumHeight: parseFloat(elements.minimumHeight.value) || 2.0,
        practiceDays: selectedDays,
        startTime: elements.startTime.value,
        endTime: elements.endTime.value
    };

    // Reset period offset
    state.periodOffset = 0;

    // Update URL
    updateUrl();

    // Show dashboard, hide setup
    elements.setupPanel.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');

    // Update summary
    const dayNames = selectedDays.map(d => DAY_NAMES_SHORT[d]).join(', ');
    elements.scheduleSummary.textContent = `${dayNames} • ${formatTimeRange(state.config.startTime, state.config.endTime)} • Min ${state.config.minimumHeight}ft`;

    // Generate share link
    generateShareLink();

    // Fetch and display data
    await fetchPracticeForecast();
}

function showSetupPanel() {
    elements.dashboard.classList.add('hidden');
    elements.setupPanel.classList.remove('hidden');
}

function updateUrl() {
    const params = new URLSearchParams();
    params.set('station', state.config.station);
    params.set('min', state.config.minimumHeight);
    params.set('days', state.config.practiceDays.join(','));
    params.set('start', state.config.startTime);
    params.set('end', state.config.endTime);
    params.set('view', state.currentView);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
}

function generateShareLink() {
    const params = new URLSearchParams();
    params.set('station', state.config.station);
    params.set('min', state.config.minimumHeight);
    params.set('days', state.config.practiceDays.join(','));
    params.set('start', state.config.startTime);
    params.set('end', state.config.endTime);
    params.set('view', state.currentView);

    const link = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    elements.shareLink.value = link;
}

function toggleSharePanel() {
    elements.sharePanel.classList.toggle('hidden');
}

function copyLinkToClipboard() {
    elements.shareLink.select();
    navigator.clipboard.writeText(elements.shareLink.value).then(() => {
        elements.copyLinkBtn.textContent = '✓';
        setTimeout(() => {
            elements.copyLinkBtn.textContent = '📋';
        }, 2000);
    });
}

// === Period Navigation ===
async function navigatePeriod(direction) {
    state.periodOffset += direction;
    await fetchPracticeForecast(true); // true = inline loading
}

async function goToToday() {
    if (state.periodOffset === 0) return; // Already at today
    state.periodOffset = 0;
    await fetchPracticeForecast(true);
}

function updatePeriodLabel() {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() - baseDate.getDay()); // Start of current week

    // Add period offset (4 weeks per period)
    const periodStart = new Date(baseDate);
    periodStart.setDate(baseDate.getDate() + (state.periodOffset * 28));

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 27);

    const startMonth = MONTH_NAMES[periodStart.getMonth()];
    const startDay = periodStart.getDate();
    const endMonth = MONTH_NAMES[periodEnd.getMonth()];
    const endDay = periodEnd.getDate();
    const year = periodEnd.getFullYear();

    let labelText;
    if (startMonth === endMonth) {
        labelText = `${startMonth} ${startDay} - ${endDay}, ${year}`;
    } else {
        labelText = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }

    // Add "Today" hint if not at current period
    if (state.periodOffset !== 0) {
        labelText += ' (tap for today)';
    }

    // Update both labels
    elements.periodLabel.textContent = labelText;
    elements.listPeriodLabel.textContent = labelText;
}

// === Forecast Fetching ===
async function fetchPracticeForecast(inlineLoading = false) {
    if (inlineLoading) {
        setInlineLoading(true);
    } else {
        setLoading(true);
    }
    state.practiceResults = [];

    // Calculate the date range for this period
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() - baseDate.getDay()); // Start of current week

    // Add period offset (4 weeks per period)
    const periodStart = new Date(baseDate);
    periodStart.setDate(baseDate.getDate() + (state.periodOffset * 28));

    // Generate practice dates for this 4-week period
    const practiceDates = generatePracticeDatesForPeriod(state.config.practiceDays, periodStart, 28);

    // Fetch tide data for each date
    try {
        for (const date of practiceDates) {
            const result = await checkTideForDate(date, state.config);
            state.practiceResults.push(result);
        }

        updatePeriodLabel();
        renderCalendar();
        renderList();

    } catch (error) {
        console.error('Error fetching forecast:', error);
        showError('Failed to fetch tide data.');
    } finally {
        if (inlineLoading) {
            setInlineLoading(false);
        } else {
            setLoading(false);
        }
    }
}

function generatePracticeDatesForPeriod(practiceDays, startDate, numDays) {
    const dates = [];

    for (let i = 0; i < numDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        if (practiceDays.includes(date.getDay())) {
            dates.push(date);
        }
    }

    return dates;
}

async function checkTideForDate(date, config) {
    const dateStr = formatDateForAPI(date);
    const [endHour] = config.endTime.split(':');
    const range = parseInt(endHour) + 1;

    try {
        const response = await fetch(`/api/tides?station=${config.station}&beginDate=${dateStr}&range=${range}`);
        const data = await response.json();

        if (data.error || !data.predictions) {
            return { date, isGood: false, error: data.error || 'No predictions available', events: [], minTide: null };
        }

        const practiceStart = parseTime(config.startTime);
        const practiceEnd = parseTime(config.endTime);

        let isGood = true;
        let minTide = Infinity;
        let previousEvent = null;
        let previousNotChecked = true;

        for (const prediction of data.predictions) {
            const eventTime = parseEventTime(prediction.t);
            const eventHeight = parseFloat(prediction.v);

            if (compareTime(eventTime, practiceEnd) > 0) break;

            if (compareTime(eventTime, practiceStart) > 0) {
                if (previousNotChecked && previousEvent) {
                    if (previousEvent.height <= config.minimumHeight) isGood = false;
                    minTide = Math.min(minTide, previousEvent.height);
                    previousNotChecked = false;
                }

                if (eventHeight <= config.minimumHeight) isGood = false;
                minTide = Math.min(minTide, eventHeight);
            } else {
                previousEvent = { time: eventTime, height: eventHeight };
            }
        }

        return {
            date,
            isGood,
            minTide: minTide === Infinity ? null : minTide,
            margin: minTide !== Infinity ? minTide - config.minimumHeight : null
        };

    } catch (error) {
        console.error(`Error fetching tide for ${dateStr}:`, error);
        return { date, isGood: false, error: 'Failed to fetch', minTide: null };
    }
}

// === Calendar Rendering ===
function renderCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the start of the period
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() - baseDate.getDay()); // Start of current week

    const periodStart = new Date(baseDate);
    periodStart.setDate(baseDate.getDate() + (state.periodOffset * 28));

    // Build a map of results by date string for quick lookup
    const resultMap = {};
    state.practiceResults.forEach(r => {
        resultMap[formatDateKey(r.date)] = r;
    });

    let html = '';

    // Header row
    html += DAY_NAMES_SHORT.map(d => `<div class="calendar-header-cell">${d}</div>`).join('');

    // Generate 4 weeks
    for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 7; day++) {
            const date = new Date(periodStart);
            date.setDate(periodStart.getDate() + (week * 7) + day);

            const dateKey = formatDateKey(date);
            const result = resultMap[dateKey];
            const isPracticeDay = state.config.practiceDays.includes(date.getDay());
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;

            let classes = ['calendar-cell'];
            if (isToday) classes.push('today');
            if (isPast) classes.push('past');

            if (isPracticeDay && result) {
                classes.push('practice-day');
                classes.push(result.isGood ? 'safe' : 'caution');
            } else if (!isPracticeDay) {
                classes.push('no-practice');
            }

            const tideIndicator = result && result.minTide !== null ?
                `<span class="tide-indicator">${result.minTide.toFixed(1)}</span>` : '';

            html += `
                <div class="${classes.join(' ')}" data-date="${dateKey}">
                    <span>${date.getDate()}</span>
                    ${tideIndicator}
                </div>
            `;
        }
    }

    elements.calendarGrid.innerHTML = html;

    // Add click handlers for practice days
    elements.calendarGrid.querySelectorAll('.practice-day').forEach(cell => {
        cell.addEventListener('click', () => {
            const dateKey = cell.dataset.date;
            const index = state.practiceResults.findIndex(r => formatDateKey(r.date) === dateKey);
            if (index >= 0) showPracticeDetail(index);
        });
    });
}

function renderList() {
    // Filter to only show today and future practices
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futurePractices = state.practiceResults.filter((result, index) => {
        const practiceDate = new Date(result.date);
        practiceDate.setHours(0, 0, 0, 0);
        return practiceDate >= today;
    });

    if (futurePractices.length === 0) {
        elements.listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No upcoming practice days in this period.</p>';
        return;
    }

    const html = futurePractices.map((result) => {
        // Find the original index for showPracticeDetail
        const originalIndex = state.practiceResults.indexOf(result);
        const dayName = DAY_NAMES[result.date.getDay()];
        const dateStr = formatDateShort(result.date);
        const statusClass = result.isGood ? 'safe' : 'caution';
        const statusText = result.isGood ? '✓ Safe' : '⚠ Caution';
        const tideValue = result.minTide !== null ? `${result.minTide.toFixed(1)} ft` : '--';
        const marginValue = result.margin !== null ?
            (result.margin >= 0 ? `+${result.margin.toFixed(1)}` : result.margin.toFixed(1)) : '';
        const marginClass = result.margin !== null ? (result.margin >= 0 ? 'positive' : 'negative') : '';

        return `
            <div class="list-item ${statusClass}" onclick="showPracticeDetail(${originalIndex})">
                <div class="list-item-date">
                    <div class="date-day">${dayName}</div>
                    <div class="date-full">${dateStr}</div>
                </div>
                <div class="list-item-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="list-item-tide">
                    <div class="tide-value">${tideValue}</div>
                    ${marginValue ? `<div class="tide-margin ${marginClass}">${marginValue} ft</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    elements.listContainer.innerHTML = html;
}

function showPracticeDetail(index) {
    const result = state.practiceResults[index];
    if (!result) return;

    const dateStr = formatDateLong(result.date);
    const statusClass = result.isGood ? 'safe' : 'caution';
    const statusText = result.isGood ? '✅ Safe for Practice' : '⚠️ Caution Advised';
    const tideInfo = result.minTide !== null ?
        `Lowest tide: ${result.minTide.toFixed(2)}ft (min required: ${state.config.minimumHeight}ft)` :
        'Tide data unavailable';
    const marginInfo = result.margin !== null ?
        `Margin: ${result.margin >= 0 ? '+' : ''}${result.margin.toFixed(2)}ft` : '';

    elements.detailContainer.innerHTML = `
        <div class="detail-header">
            <h4>${dateStr}</h4>
            <span class="detail-status ${statusClass}">${statusText}</span>
        </div>
        <p class="detail-info">${tideInfo}</p>
        ${marginInfo ? `<p class="detail-margin">${marginInfo}</p>` : ''}
        <p class="detail-time">Practice window: ${formatTimeRange(state.config.startTime, state.config.endTime)}</p>
        <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${state.config.station}&units=standard&bdate=${formatDateForAPI(result.date)}&edate=${formatDateForAPI(result.date)}&timezone=LST/LDT&clock=12hour&datum=MLLW&interval=hilo&action=dailychart" 
           target="_blank" rel="noopener" class="noaa-link-btn" style="margin-top: 1rem;">
            🔗 View Full Details on NOAA
        </a>
    `;

    elements.detailSection.classList.remove('hidden');
    elements.detailSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// === Utility Functions ===
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateLong(date) {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTimeRange(start, end) {
    return `${formatTimeSimple(start)} - ${formatTimeSimple(end)}`;
}

function formatTimeSimple(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

function parseEventTime(timeStr) {
    const timePart = timeStr.split(' ')[1];
    const [hours, minutes] = timePart.split(':').map(Number);
    return { hours, minutes };
}

function compareTime(t1, t2) {
    if (t1.hours !== t2.hours) return t1.hours - t2.hours;
    return t1.minutes - t2.minutes;
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    elements.loadingOverlay.classList.toggle('hidden', !isLoading);
}

function setInlineLoading(isLoading) {
    state.isLoading = isLoading;
    elements.calendarLoading.classList.toggle('hidden', !isLoading);
    elements.listLoading.classList.toggle('hidden', !isLoading);
}

function showError(message) {
    alert(message);
}

// Make showPracticeDetail available globally
window.showPracticeDetail = showPracticeDetail;
