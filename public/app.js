/**
 * Tides - Practice Tide Checker
 * JavaScript Application Logic
 */

// === State Management ===
const state = {
    stations: [],
    results: [],
    isLoading: false,
    dateMode: 'single', // 'single' or 'range'
    mainTab: 'onetime', // 'onetime' or 'recurring'
    weekOffset: 0, // For recurring: 0 = this week, -1 = last week, +1 = next week
    currentRecurringDays: [], // Days selected for recurring
    currentRecurringConfig: null // Config for recurring
};

// === DOM Elements ===
const elements = {
    // Main tabs
    mainTabs: document.querySelectorAll('.main-tab'),
    onetimeTab: document.getElementById('onetime-tab'),
    recurringTab: document.getElementById('recurring-tab'),

    // One Time - Station
    stationSelect: document.getElementById('station'),
    customStationBtn: document.getElementById('custom-station-btn'),
    customStation: document.getElementById('custom-station'),
    minimumHeight: document.getElementById('minimum-height'),

    // One Time - Dates
    singleDate: document.getElementById('single-date'),
    startTimeSingle: document.getElementById('start-time-single'),
    endTimeSingle: document.getElementById('end-time-single'),
    beginDate: document.getElementById('begin-date'),
    endDate: document.getElementById('end-date'),
    startTime: document.getElementById('start-time'),
    endTime: document.getElementById('end-time'),

    // One Time - Mode tabs
    modeTabs: document.querySelectorAll('.mode-tab'),
    singleDateMode: document.getElementById('single-date-mode'),
    rangeDateMode: document.getElementById('range-date-mode'),

    // One Time - Options
    optionsToggle: document.getElementById('options-toggle'),
    optionsCard: document.querySelector('.options-card'),
    suppressWarnings: document.getElementById('suppress-warnings'),
    weeklyMode: document.getElementById('weekly-mode'),
    showChart: document.getElementById('show-chart'),
    checkTidesBtn: document.getElementById('check-tides-btn'),

    // Recurring - Station
    recurringStation: document.getElementById('recurring-station'),
    recurringCustomStationBtn: document.getElementById('recurring-custom-station-btn'),
    recurringCustomStation: document.getElementById('recurring-custom-station'),
    recurringMinimumHeight: document.getElementById('recurring-minimum-height'),

    // Recurring - Schedule
    dayCheckboxes: document.querySelectorAll('input[name="recurring-day"]'),
    recurringStartTime: document.getElementById('recurring-start-time'),
    recurringEndTime: document.getElementById('recurring-end-time'),
    recurringShowChart: document.getElementById('recurring-show-chart'),

    // Recurring - Actions
    checkRecurringBtn: document.getElementById('check-recurring-btn'),
    generateLinkBtn: document.getElementById('generate-link-btn'),
    generatedLinkContainer: document.getElementById('generated-link-container'),
    generatedLink: document.getElementById('generated-link'),
    copyLinkBtn: document.getElementById('copy-link-btn'),

    // Week Navigation
    weekNav: document.getElementById('week-nav'),
    prevWeekBtn: document.getElementById('prev-week-btn'),
    nextWeekBtn: document.getElementById('next-week-btn'),
    weekLabel: document.getElementById('week-label'),

    // Shared Results
    resultsSection: document.getElementById('results-section'),
    resultsContainer: document.getElementById('results-container'),
    goodCount: document.getElementById('good-count'),
    warningCount: document.getElementById('warning-count'),
    totalCount: document.getElementById('total-count'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    setDefaultDates();
    attachEventListeners();
    await loadStations();

    // Check for URL parameters and auto-run if present
    loadFromUrlParams();
}

// === URL Parameter Handling ===
function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Check if we have any tide params
    if (!params.has('station') && !params.has('date') && !params.has('days')) return;

    // Station
    const station = params.get('station');
    if (station) {
        // Try to select from dropdown first
        const optionExists = Array.from(elements.stationSelect.options).some(opt => opt.value === station);
        if (optionExists) {
            elements.stationSelect.value = station;
        } else {
            // Use custom station input
            elements.customStation.value = station;
            elements.customStation.classList.remove('hidden');
            elements.customStationBtn.classList.add('active');
        }
    }

    // Minimum height
    if (params.has('min')) {
        elements.minimumHeight.value = params.get('min');
    }

    // Time window
    if (params.has('start')) {
        const startTime = params.get('start');
        elements.startTimeSingle.value = startTime;
        elements.startTime.value = startTime;
    }
    if (params.has('end')) {
        const endTime = params.get('end');
        elements.endTimeSingle.value = endTime;
        elements.endTime.value = endTime;
    }

    // Options
    if (params.has('chart')) {
        elements.showChart.checked = params.get('chart') === '1';
    }

    // Handle recurring 'days' parameter (e.g., days=0,6 for Sunday and Saturday)
    if (params.has('days')) {
        const days = params.get('days').split(',').map(Number);

        // Switch to recurring tab
        switchMainTab('recurring');

        // Populate recurring form
        if (station) {
            const optionExists = Array.from(elements.recurringStation.options).some(opt => opt.value === station);
            if (optionExists) {
                elements.recurringStation.value = station;
            } else {
                elements.recurringCustomStation.value = station;
                elements.recurringCustomStation.classList.remove('hidden');
                elements.recurringCustomStationBtn.classList.add('active');
            }
        }

        if (params.has('min')) {
            elements.recurringMinimumHeight.value = params.get('min');
        }

        // Check the day checkboxes
        elements.dayCheckboxes.forEach(cb => {
            cb.checked = days.includes(parseInt(cb.value));
        });

        if (params.has('start')) {
            elements.recurringStartTime.value = params.get('start');
        }
        if (params.has('end')) {
            elements.recurringEndTime.value = params.get('end');
        }
        if (params.has('chart')) {
            elements.recurringShowChart.checked = params.get('chart') === '1';
        }

        // Run the recurring check
        if (station && days.length > 0) {
            setTimeout(() => checkRecurringTides(days, params), 500);
        }
        return; // Don't run normal check
    }

    // Date mode and dates (for non-recurring)
    const mode = params.get('mode') || 'single';
    switchDateMode(mode);

    if (mode === 'single' && params.has('date')) {
        const dateParam = params.get('date');
        const resolvedDate = resolveDynamicDate(dateParam);
        elements.singleDate.value = resolvedDate;
    } else if (mode === 'range') {
        if (params.has('from')) {
            const fromParam = params.get('from');
            elements.beginDate.value = resolveDynamicDate(fromParam);
        }
        if (params.has('to')) {
            const toParam = params.get('to');
            elements.endDate.value = resolveDynamicDate(toParam);
        }
        if (params.has('weekly')) {
            elements.weeklyMode.checked = params.get('weekly') === '1';
        }
    }

    // Auto-run if we have sufficient parameters
    if (station && (params.has('date') || params.has('from'))) {
        setTimeout(() => checkTides(), 500);
    }
}

// Check tides for recurring schedule (specific days of week) - called from URL params
async function checkRecurringTides(days, params) {
    const station = params.get('station');
    const minHeight = parseFloat(params.get('min')) || 1.5;
    const startTime = params.get('start') || '10:00';
    const endTime = params.get('end') || '14:30';
    const showChart = params.get('chart') === '1';

    const config = {
        station,
        minimumHeight: minHeight,
        startTime,
        endTime,
        showChart,
        suppressWarnings: false,
        weeklyMode: false
    };

    // Store for week navigation
    state.weekOffset = 0;
    state.currentRecurringDays = days;
    state.currentRecurringConfig = config;

    // Use shared function
    checkRecurringWithDays(days, config, 0);
}

// Resolve dynamic date strings like 'next-sunday' to actual dates
function resolveDynamicDate(dateStr) {
    // If it's already a date format (YYYY-MM-DD), return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Handle 'next-' prefixed day names
    const dayMatch = dateStr.toLowerCase().match(/^next-(\w+)$/);
    if (dayMatch) {
        const dayName = dayMatch[1];
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);

        if (dayIndex !== -1) {
            const today = new Date();
            const todayDay = today.getDay();
            let daysUntil = dayIndex - todayDay;

            // If it's the same day or already passed this week, get this week's occurrence (including today)
            if (daysUntil < 0) {
                daysUntil += 7;
            }

            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysUntil);
            return formatDateForInput(targetDate);
        }
    }

    // Handle 'today'
    if (dateStr.toLowerCase() === 'today') {
        return formatDateForInput(new Date());
    }

    // Handle 'tomorrow'
    if (dateStr.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDateForInput(tomorrow);
    }

    // Fallback: return as-is and let the date input handle it
    return dateStr;
}

function updateUrlWithParams() {
    const config = getConfiguration();
    const params = new URLSearchParams();

    params.set('station', config.station);
    params.set('min', config.minimumHeight.toString());
    params.set('mode', state.dateMode);

    if (state.dateMode === 'single') {
        params.set('date', formatDateForInput(config.beginDate));
    } else {
        params.set('from', formatDateForInput(config.beginDate));
        params.set('to', formatDateForInput(config.endDate));
        params.set('weekly', config.weeklyMode ? '1' : '0');
    }

    params.set('start', config.startTime);
    params.set('end', config.endTime);
    params.set('chart', config.showChart ? '1' : '0');

    // Update URL without reloading
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    return newUrl;
}

function setDefaultDates() {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    // Single date mode - today
    elements.singleDate.value = formatDateForInput(today);

    // Range mode - 3 months
    elements.beginDate.value = formatDateForInput(today);
    elements.endDate.value = formatDateForInput(threeMonthsLater);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function attachEventListeners() {
    // Main tab switching
    elements.mainTabs.forEach(tab => {
        tab.addEventListener('click', () => switchMainTab(tab.dataset.tab));
    });

    // One Time - Custom station button toggle
    elements.customStationBtn.addEventListener('click', () => toggleCustomStation('onetime'));

    // One Time - Custom station input
    elements.customStation.addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            elements.stationSelect.value = '';
        }
    });

    elements.stationSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            elements.customStation.value = '';
        }
    });

    // One Time - Date mode tabs
    elements.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => switchDateMode(tab.dataset.mode));
    });

    // One Time - Options collapse toggle
    elements.optionsToggle.addEventListener('click', toggleOptions);

    // One Time - Check tides button
    elements.checkTidesBtn.addEventListener('click', checkTides);

    // Recurring - Custom station button toggle
    elements.recurringCustomStationBtn.addEventListener('click', () => toggleCustomStation('recurring'));

    // Recurring - Custom station input
    elements.recurringCustomStation.addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            elements.recurringStation.value = '';
        }
    });

    elements.recurringStation.addEventListener('change', (e) => {
        if (e.target.value) {
            elements.recurringCustomStation.value = '';
        }
    });

    // Recurring - Check and generate buttons
    elements.checkRecurringBtn.addEventListener('click', checkRecurringFromUI);
    elements.generateLinkBtn.addEventListener('click', generateRecurringLink);
    elements.copyLinkBtn.addEventListener('click', copyLinkToClipboard);

    // Week navigation
    elements.prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    elements.nextWeekBtn.addEventListener('click', () => navigateWeek(1));
}

function switchMainTab(tab) {
    state.mainTab = tab;

    // Update tab active state
    elements.mainTabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Show/hide tab content
    elements.onetimeTab.classList.toggle('active', tab === 'onetime');
    elements.recurringTab.classList.toggle('active', tab === 'recurring');

    // Hide results when switching tabs
    elements.resultsSection.classList.add('hidden');
}

function toggleCustomStation(tab) {
    if (tab === 'onetime') {
        const isHidden = elements.customStation.classList.contains('hidden');
        elements.customStation.classList.toggle('hidden', !isHidden);
        elements.customStationBtn.classList.toggle('active', isHidden);
        if (isHidden) {
            elements.customStation.focus();
        } else {
            elements.customStation.value = '';
        }
    } else {
        const isHidden = elements.recurringCustomStation.classList.contains('hidden');
        elements.recurringCustomStation.classList.toggle('hidden', !isHidden);
        elements.recurringCustomStationBtn.classList.toggle('active', isHidden);
        if (isHidden) {
            elements.recurringCustomStation.focus();
        } else {
            elements.recurringCustomStation.value = '';
        }
    }
}

function switchDateMode(mode) {
    state.dateMode = mode;

    // Update tab active state
    elements.modeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // Show/hide date modes
    elements.singleDateMode.classList.toggle('active', mode === 'single');
    elements.rangeDateMode.classList.toggle('active', mode === 'range');
}

function toggleOptions() {
    elements.optionsCard.classList.toggle('open');
}

// === Recurring Schedule Functions ===
function checkRecurringFromUI() {
    const selectedDays = Array.from(elements.dayCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));

    if (selectedDays.length === 0) {
        showError('Please select at least one practice day.');
        return;
    }

    const station = elements.recurringCustomStation.value.trim() || elements.recurringStation.value;
    if (!station) {
        showError('Please select or enter a NOAA station.');
        return;
    }

    const config = {
        station,
        minimumHeight: parseFloat(elements.recurringMinimumHeight.value) || 1.5,
        startTime: elements.recurringStartTime.value,
        endTime: elements.recurringEndTime.value,
        showChart: elements.recurringShowChart.checked
    };

    // Reset week offset and store for navigation
    state.weekOffset = 0;
    state.currentRecurringDays = selectedDays;
    state.currentRecurringConfig = config;

    checkRecurringWithDays(selectedDays, config, 0);
}

function navigateWeek(direction) {
    state.weekOffset += direction;
    checkRecurringWithDays(state.currentRecurringDays, state.currentRecurringConfig, state.weekOffset);
}

function updateWeekLabel() {
    if (state.weekOffset === 0) {
        elements.weekLabel.textContent = 'This Week';
    } else if (state.weekOffset === 1) {
        elements.weekLabel.textContent = 'Next Week';
    } else if (state.weekOffset === -1) {
        elements.weekLabel.textContent = 'Last Week';
    } else if (state.weekOffset > 1) {
        elements.weekLabel.textContent = `+${state.weekOffset} Weeks`;
    } else {
        elements.weekLabel.textContent = `${state.weekOffset} Weeks`;
    }
}

async function checkRecurringWithDays(days, config, weekOffset = 0) {
    // Calculate next occurrence of each day, adjusted by week offset
    const datesToCheck = days.map(dayIndex => {
        const date = getNextDayOfWeek(dayIndex);
        date.setDate(date.getDate() + (weekOffset * 7));
        return date;
    }).sort((a, b) => a - b);

    // Show loading
    setLoading(true);

    // Clear previous results
    state.results = [];
    elements.resultsContainer.innerHTML = '';
    elements.resultsSection.classList.add('hidden');

    try {
        for (let i = 0; i < datesToCheck.length; i++) {
            const date = datesToCheck[i];
            const result = await checkTideForDate(date, config);
            state.results.push(result);
            addResultCard(result, i);
        }

        updateResultsSummary();

        // Show week navigation
        elements.weekNav.classList.remove('hidden');
        updateWeekLabel();

        elements.resultsSection.classList.remove('hidden');

        setTimeout(() => {
            elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);

    } catch (error) {
        console.error('Error checking recurring tides:', error);
        showError('Failed to fetch tide data. Please try again.');
    } finally {
        setLoading(false);
    }
}

function generateRecurringLink() {
    const selectedDays = Array.from(elements.dayCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedDays.length === 0) {
        showError('Please select at least one practice day.');
        return;
    }

    const station = elements.recurringCustomStation.value.trim() || elements.recurringStation.value;
    if (!station) {
        showError('Please select or enter a NOAA station.');
        return;
    }

    const minHeight = elements.recurringMinimumHeight.value;
    const startTime = elements.recurringStartTime.value;
    const endTime = elements.recurringEndTime.value;
    const showChart = elements.recurringShowChart.checked ? '1' : '0';

    const params = new URLSearchParams();
    params.set('station', station);
    params.set('min', minHeight);
    params.set('days', selectedDays.join(','));
    params.set('start', startTime);
    params.set('end', endTime);
    params.set('chart', showChart);

    const link = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    elements.generatedLink.value = link;
    elements.generatedLinkContainer.classList.remove('hidden');
}

function copyLinkToClipboard() {
    elements.generatedLink.select();
    navigator.clipboard.writeText(elements.generatedLink.value).then(() => {
        elements.copyLinkBtn.textContent = '✓';
        setTimeout(() => {
            elements.copyLinkBtn.textContent = '📋';
        }, 2000);
    });
}

// Resolve dynamic date strings like 'next-sunday' to actual dates
function resolveDynamicDate(dateStr) {
    // If it's already a date format (YYYY-MM-DD), return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Handle 'today'
    if (dateStr.toLowerCase() === 'today') {
        return formatDateForInput(new Date());
    }

    // Handle 'tomorrow'
    if (dateStr.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDateForInput(tomorrow);
    }

    // Fallback: return as-is
    return dateStr;
}

// Get the next occurrence of a day of the week (0=Sunday, 1=Monday, etc.)
function getNextDayOfWeek(dayIndex) {
    const today = new Date();
    const todayDay = today.getDay();
    let daysUntil = dayIndex - todayDay;

    // If it's negative, get next week's occurrence
    // If it's 0 (same day), include today
    if (daysUntil < 0) {
        daysUntil += 7;
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate;
}


async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        state.stations = await response.json();
        populateStationDropdown();
    } catch (error) {
        console.error('Failed to load stations:', error);
        const fallback = '<option value="9414523">Redwood City, CA (9414523)</option>';
        elements.stationSelect.innerHTML = fallback;
        elements.recurringStation.innerHTML = fallback;
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

    // Populate both dropdowns
    elements.stationSelect.innerHTML = html;
    elements.recurringStation.innerHTML = html;
}

function groupByRegion(stations) {
    return stations.reduce((acc, station) => {
        if (!acc[station.region]) {
            acc[station.region] = [];
        }
        acc[station.region].push(station);
        return acc;
    }, {});
}

// === Main Tide Checking Logic ===
async function checkTides() {
    // Validate inputs
    if (!validateInputs()) return;

    // Get configuration
    const config = getConfiguration();

    // Update URL for sharing
    updateUrlWithParams();

    // Show loading
    setLoading(true);

    // Clear previous results
    state.results = [];
    elements.resultsContainer.innerHTML = '';
    elements.resultsSection.classList.add('hidden');

    try {
        // Calculate dates to check
        const datesToCheck = calculateDatesToCheck(config);

        // Check each date
        for (let i = 0; i < datesToCheck.length; i++) {
            const date = datesToCheck[i];
            const result = await checkTideForDate(date, config);
            state.results.push(result);

            // Add result card with staggered animation
            addResultCard(result, i);
        }

        // Update summary
        updateResultsSummary();

        // Hide week navigation (only for recurring)
        elements.weekNav.classList.add('hidden');

        // Show results section
        elements.resultsSection.classList.remove('hidden');

        // Scroll to results
        setTimeout(() => {
            elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);

    } catch (error) {
        console.error('Error checking tides:', error);
        showError('Failed to fetch tide data. Please try again.');
    } finally {
        setLoading(false);
    }
}

function validateInputs() {
    const station = elements.customStation.value.trim() || elements.stationSelect.value;
    if (!station) {
        showError('Please select or enter a NOAA station.');
        return false;
    }

    if (state.dateMode === 'single') {
        const singleDate = new Date(elements.singleDate.value);
        if (isNaN(singleDate.getTime())) {
            showError('Please enter a valid date.');
            return false;
        }
    } else {
        const beginDate = new Date(elements.beginDate.value);
        const endDate = new Date(elements.endDate.value);

        if (isNaN(beginDate.getTime()) || isNaN(endDate.getTime())) {
            showError('Please enter valid dates.');
            return false;
        }

        if (beginDate > endDate) {
            showError('Begin date must be before end date.');
            return false;
        }
    }

    return true;
}

// Parse date string (YYYY-MM-DD) as local date, not UTC
function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function getConfiguration() {
    const isSingleMode = state.dateMode === 'single';

    return {
        station: elements.customStation.value.trim() || elements.stationSelect.value,
        minimumHeight: parseFloat(elements.minimumHeight.value) || 1.5,
        beginDate: isSingleMode ? parseLocalDate(elements.singleDate.value) : parseLocalDate(elements.beginDate.value),
        endDate: isSingleMode ? parseLocalDate(elements.singleDate.value) : parseLocalDate(elements.endDate.value),
        startTime: isSingleMode ? elements.startTimeSingle.value : elements.startTime.value,
        endTime: isSingleMode ? elements.endTimeSingle.value : elements.endTime.value,
        suppressWarnings: elements.suppressWarnings.checked,
        weeklyMode: !isSingleMode && elements.weeklyMode.checked,
        showChart: elements.showChart.checked
    };
}

function calculateDatesToCheck(config) {
    const dates = [];
    const currentDate = new Date(config.beginDate);
    const increment = config.weeklyMode ? 7 : 1;

    // For single day mode, just return that one date
    if (state.dateMode === 'single') {
        return [new Date(config.beginDate)];
    }

    while (currentDate <= config.endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + increment);
    }

    return dates;
}

async function checkTideForDate(date, config) {
    const dateStr = formatDateForAPI(date);

    // Calculate range in hours
    const [startHour] = config.startTime.split(':');
    const [endHour] = config.endTime.split(':');
    const range = parseInt(endHour) + 1; // Add 1 hour buffer

    try {
        // Fetch tide data
        const response = await fetch(`/api/tides?station=${config.station}&beginDate=${dateStr}&range=${range}`);
        const data = await response.json();

        if (data.error || !data.predictions) {
            return {
                date,
                isGood: false,
                error: data.error || 'No predictions available',
                events: []
            };
        }

        // Parse practice time window
        const practiceStart = parseTime(config.startTime);
        const practiceEnd = parseTime(config.endTime);

        // Analyze tide events
        const events = [];
        let isGood = true;
        let previousEvent = null;
        let previousNotChecked = true;
        let minTide = Infinity; // Track lowest tide during practice window

        for (const prediction of data.predictions) {
            const eventTime = parseEventTime(prediction.t);
            const eventHeight = parseFloat(prediction.v);

            // Check if event is after practice end
            if (compareTime(eventTime, practiceEnd) > 0) {
                break;
            }

            // Check if event is within practice window
            if (compareTime(eventTime, practiceStart) > 0) {
                // Check previous event if it's the first one in window
                if (previousNotChecked && previousEvent) {
                    const isSafe = previousEvent.height > config.minimumHeight;
                    events.push({
                        time: formatTime(previousEvent.time),
                        height: previousEvent.height.toFixed(2),
                        isSafe,
                        isInWindow: false
                    });
                    if (!isSafe) isGood = false;
                    minTide = Math.min(minTide, previousEvent.height);
                    previousNotChecked = false;
                }

                // Check current event
                const isSafe = eventHeight > config.minimumHeight;
                events.push({
                    time: formatTime(eventTime),
                    height: eventHeight.toFixed(2),
                    isSafe,
                    isInWindow: true
                });
                if (!isSafe) isGood = false;
                minTide = Math.min(minTide, eventHeight);
            } else {
                // Store as previous event
                previousEvent = {
                    time: eventTime,
                    height: eventHeight
                };
            }
        }

        // Fetch daily data for chart if needed
        let chartData = null;
        if (config.showChart) {
            try {
                const dailyResponse = await fetch(`/api/tides/daily?station=${config.station}&date=${dateStr}`);
                const dailyData = await dailyResponse.json();
                if (dailyData.predictions) {
                    chartData = dailyData.predictions.map(p => ({
                        time: parseEventTime(p.t),
                        height: parseFloat(p.v)
                    }));
                }
            } catch (e) {
                console.warn('Failed to fetch daily chart data:', e);
            }
        }

        return {
            date,
            isGood,
            events,
            minTide: minTide === Infinity ? null : minTide,
            chartData,
            config
        };

    } catch (error) {
        console.error(`Error fetching tide for ${dateStr}:`, error);
        return {
            date,
            isGood: false,
            error: 'Failed to fetch tide data',
            events: []
        };
    }
}

// === Time Utilities ===
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

function parseEventTime(timeStr) {
    // Format: "YYYY-MM-DD HH:MM"
    const timePart = timeStr.split(' ')[1];
    const [hours, minutes] = timePart.split(':').map(Number);
    return { hours, minutes };
}

function compareTime(time1, time2) {
    const t1 = time1.hours * 60 + time1.minutes;
    const t2 = time2.hours * 60 + time2.minutes;
    return t1 - t2;
}

function formatTime(time) {
    const h = time.hours;
    const m = String(time.minutes).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

function formatDateForDisplay(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// === UI Updates ===
function addResultCard(result, index) {
    const card = document.createElement('div');
    card.className = `result-card ${result.isGood ? 'good' : 'warning'}`;
    card.style.animationDelay = `${index * 0.1}s`;

    const dateStr = formatDateForDisplay(result.date);
    const dateApiStr = formatDateForAPI(result.date);

    // Calculate margin from minimum
    const minTideDisplay = result.minTide !== null ? result.minTide.toFixed(1) : '--';
    const margin = result.minTide !== null ? (result.minTide - result.config.minimumHeight).toFixed(1) : null;
    const marginText = margin !== null ? (parseFloat(margin) >= 0 ? `+${margin}` : margin) : '';
    const marginClass = margin !== null ? (parseFloat(margin) >= 0 ? 'positive' : 'negative') : '';

    card.innerHTML = `
        <div class="result-card-header" onclick="toggleResultDetails(this)">
            <div class="result-date">
                <span class="result-date-icon"></span>
                <span class="result-date-text">${dateStr}</span>
            </div>
            <div class="result-meta">
                <span class="result-min-tide">Low: ${minTideDisplay} ft ${marginText ? `<span class="margin ${marginClass}">(${marginText})</span>` : ''}</span>
                <span class="result-status">
                    ${result.isGood ? 'Safe for Practice' : 'Caution Advised'}
                </span>
            </div>
        </div>
        <div class="result-details">
            ${result.error ? `<p class="error-message">${result.error}</p>` : ''}
            ${result.events.length > 0 ? `
                <div class="tide-events">
                    <h4 style="margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">Tide Events During Practice Window:</h4>
                    ${result.events.map(event => `
                        <div class="tide-event ${event.isSafe ? 'good' : 'bad'}">
                            <span class="tide-event-time">${event.time}</span>
                            <span class="tide-event-height">${event.height} ft</span>
                            <span class="tide-event-status">${event.isSafe ? '✓ Above minimum' : '✗ Below minimum'}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--text-muted);">No tide events recorded during practice window.</p>'}
            ${result.chartData && result.config.showChart ? `
                <div class="tide-chart-container">
                    <canvas id="chart-${index}" class="tide-chart"></canvas>
                </div>
            ` : ''}
            <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${result.config?.station || '9414523'}&units=standard&bdate=${dateApiStr}&edate=${dateApiStr}&timezone=LST/LDT&clock=12hour&datum=MLLW&interval=hilo&action=dailychart&thresholdvalue=${result.config?.minimumHeight || 1.5}&threshold=lessThan" 
               target="_blank" 
               rel="noopener" 
               class="noaa-link-btn">
                🔗 View on NOAA
            </a>
        </div>
    `;

    elements.resultsContainer.appendChild(card);

    // Draw chart if data available
    if (result.chartData && result.config.showChart) {
        setTimeout(() => {
            drawTideChart(`chart-${index}`, result.chartData, result.config);
        }, 100);
    }
}

function toggleResultDetails(header) {
    const card = header.closest('.result-card');
    card.classList.toggle('expanded');
}

// Make toggleResultDetails available globally
window.toggleResultDetails = toggleResultDetails;

function updateResultsSummary() {
    const goodCount = state.results.filter(r => r.isGood).length;
    const warningCount = state.results.filter(r => !r.isGood).length;

    elements.goodCount.textContent = goodCount;
    elements.warningCount.textContent = warningCount;
    elements.totalCount.textContent = state.results.length;
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    elements.loadingOverlay.classList.toggle('hidden', !isLoading);
    elements.checkTidesBtn.disabled = isLoading;
}

function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <span class="toast-icon">⚠️</span>
        <span class="toast-message">${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(231, 76, 60, 0.95);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.9rem;
        box-shadow: 0 8px 30px rgba(231, 76, 60, 0.4);
        z-index: 2000;
        animation: slideDown 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// === Chart Drawing ===
function drawTideChart(canvasId, data, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    // Set canvas size
    canvas.width = container.offsetWidth * 2;
    canvas.height = container.offsetHeight * 2;
    ctx.scale(2, 2); // Retina display support

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    // Find data range
    const heights = data.map(d => d.height);
    const minHeight = Math.min(...heights) - 1;
    const maxHeight = Math.max(...heights) + 1;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (height - padding.top - padding.bottom) * i / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Draw minimum threshold line
    const thresholdY = height - padding.bottom -
        ((config.minimumHeight - minHeight) / (maxHeight - minHeight)) * (height - padding.top - padding.bottom);

    ctx.strokeStyle = 'rgba(243, 156, 18, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, thresholdY);
    ctx.lineTo(width - padding.right, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw threshold label
    ctx.fillStyle = 'rgba(243, 156, 18, 0.9)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Min: ${config.minimumHeight}ft`, padding.left + 5, thresholdY - 5);

    // Draw practice time window shading
    const practiceStart = parseTime(config.startTime);
    const practiceEnd = parseTime(config.endTime);

    const startX = padding.left + (practiceStart.hours / 24) * (width - padding.left - padding.right);
    const endX = padding.left + (practiceEnd.hours / 24) * (width - padding.left - padding.right);

    ctx.fillStyle = 'rgba(0, 180, 216, 0.1)';
    ctx.fillRect(startX, padding.top, endX - startX, height - padding.top - padding.bottom);

    // Draw tide line
    ctx.strokeStyle = 'rgba(72, 202, 228, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    data.forEach((point, i) => {
        const x = padding.left + (point.time.hours + point.time.minutes / 60) / 24 *
            (width - padding.left - padding.right);
        const y = height - padding.bottom -
            ((point.height - minHeight) / (maxHeight - minHeight)) * (height - padding.top - padding.bottom);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw gradient fill under the line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(72, 202, 228, 0.3)');
    gradient.addColorStop(1, 'rgba(72, 202, 228, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    data.forEach((point, i) => {
        const x = padding.left + (point.time.hours + point.time.minutes / 60) / 24 *
            (width - padding.left - padding.right);
        const y = height - padding.bottom -
            ((point.height - minHeight) / (maxHeight - minHeight)) * (height - padding.top - padding.bottom);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw time labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';

    for (let h = 0; h <= 24; h += 6) {
        const x = padding.left + (h / 24) * (width - padding.left - padding.right);
        const label = h === 0 || h === 24 ? '12 AM' :
            h === 12 ? '12 PM' :
                h < 12 ? `${h} AM` : `${h - 12} PM`;
        ctx.fillText(label, x, height - 10);
    }

    // Draw height labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = minHeight + (maxHeight - minHeight) * (4 - i) / 4;
        const y = padding.top + (height - padding.top - padding.bottom) * i / 4;
        ctx.fillText(`${value.toFixed(1)}ft`, padding.left - 5, y + 4);
    }
}
