/**
 * One Time Tide Check - JavaScript
 */

// === State Management ===
const state = {
    stations: [],
    results: [],
    isLoading: false,
    dateMode: 'single'
};

// === DOM Elements ===
const elements = {
    stationSelect: document.getElementById('station'),
    customStationBtn: document.getElementById('custom-station-btn'),
    customStation: document.getElementById('custom-station'),
    minimumHeight: document.getElementById('minimum-height'),
    singleDate: document.getElementById('single-date'),
    startTimeSingle: document.getElementById('start-time-single'),
    endTimeSingle: document.getElementById('end-time-single'),
    beginDate: document.getElementById('begin-date'),
    endDate: document.getElementById('end-date'),
    startTime: document.getElementById('start-time'),
    endTime: document.getElementById('end-time'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    singleDateMode: document.getElementById('single-date-mode'),
    rangeDateMode: document.getElementById('range-date-mode'),
    optionsToggle: document.getElementById('options-toggle'),
    optionsCard: document.querySelector('.options-card'),
    suppressWarnings: document.getElementById('suppress-warnings'),
    weeklyMode: document.getElementById('weekly-mode'),
    showChart: document.getElementById('show-chart'),
    checkTidesBtn: document.getElementById('check-tides-btn'),
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
    loadFromUrlParams();
}

// === URL Parameter Handling ===
function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('station') && !params.has('date')) return;

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

    if (params.has('start')) {
        elements.startTimeSingle.value = params.get('start');
        elements.startTime.value = params.get('start');
    }
    if (params.has('end')) {
        elements.endTimeSingle.value = params.get('end');
        elements.endTime.value = params.get('end');
    }

    if (params.has('chart')) {
        elements.showChart.checked = params.get('chart') === '1';
    }

    const mode = params.get('mode') || 'single';
    switchDateMode(mode);

    if (mode === 'single' && params.has('date')) {
        elements.singleDate.value = params.get('date');
    } else if (mode === 'range') {
        if (params.has('from')) elements.beginDate.value = params.get('from');
        if (params.has('to')) elements.endDate.value = params.get('to');
        if (params.has('weekly')) elements.weeklyMode.checked = params.get('weekly') === '1';
    }

    if (station && (params.has('date') || params.has('from'))) {
        setTimeout(() => checkTides(), 500);
    }
}

function setDefaultDates() {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    elements.singleDate.value = formatDateForInput(today);
    elements.beginDate.value = formatDateForInput(today);
    elements.endDate.value = formatDateForInput(threeMonthsLater);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function attachEventListeners() {
    elements.customStationBtn.addEventListener('click', toggleCustomStation);
    elements.customStation.addEventListener('input', (e) => {
        if (e.target.value.trim()) elements.stationSelect.value = '';
    });
    elements.stationSelect.addEventListener('change', (e) => {
        if (e.target.value) elements.customStation.value = '';
    });
    elements.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => switchDateMode(tab.dataset.mode));
    });
    elements.optionsToggle.addEventListener('click', toggleOptions);
    elements.checkTidesBtn.addEventListener('click', checkTides);
}

function toggleCustomStation() {
    const isHidden = elements.customStation.classList.contains('hidden');
    elements.customStation.classList.toggle('hidden', !isHidden);
    elements.customStationBtn.classList.toggle('active', isHidden);
    if (isHidden) elements.customStation.focus();
    else elements.customStation.value = '';
}

function switchDateMode(mode) {
    state.dateMode = mode;
    elements.modeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    elements.singleDateMode.classList.toggle('active', mode === 'single');
    elements.rangeDateMode.classList.toggle('active', mode === 'range');
}

function toggleOptions() {
    elements.optionsCard.classList.toggle('open');
}

// === API Functions ===
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

// === Main Tide Checking ===
async function checkTides() {
    if (!validateInputs()) return;
    const config = getConfiguration();

    setLoading(true);
    state.results = [];
    elements.resultsContainer.innerHTML = '';
    elements.resultsSection.classList.add('hidden');

    try {
        const datesToCheck = calculateDatesToCheck(config);

        for (let i = 0; i < datesToCheck.length; i++) {
            const date = datesToCheck[i];
            const result = await checkTideForDate(date, config);
            state.results.push(result);
            addResultCard(result, i);
        }

        updateResultsSummary();
        elements.resultsSection.classList.remove('hidden');

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
    return true;
}

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
    const [endHour] = config.endTime.split(':');
    const range = parseInt(endHour) + 1;

    try {
        const response = await fetch(`/api/tides?station=${config.station}&beginDate=${dateStr}&range=${range}`);
        const data = await response.json();

        if (data.error || !data.predictions) {
            return { date, isGood: false, error: data.error || 'No predictions available', events: [] };
        }

        const practiceStart = parseTime(config.startTime);
        const practiceEnd = parseTime(config.endTime);

        const events = [];
        let isGood = true;
        let previousEvent = null;
        let previousNotChecked = true;
        let minTide = Infinity;

        for (const prediction of data.predictions) {
            const eventTime = parseEventTime(prediction.t);
            const eventHeight = parseFloat(prediction.v);

            if (compareTime(eventTime, practiceEnd) > 0) break;

            if (compareTime(eventTime, practiceStart) > 0) {
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
                previousEvent = { time: eventTime, height: eventHeight };
            }
        }

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

        return { date, isGood, events, minTide: minTide === Infinity ? null : minTide, chartData, config };

    } catch (error) {
        console.error(`Error fetching tide for ${dateStr}:`, error);
        return { date, isGood: false, error: 'Failed to fetch tide data', events: [] };
    }
}

// === Utility Functions ===
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
    const timePart = timeStr.split(' ')[1];
    const [hours, minutes] = timePart.split(':').map(Number);
    return { hours, minutes };
}

function compareTime(t1, t2) {
    if (t1.hours !== t2.hours) return t1.hours - t2.hours;
    return t1.minutes - t2.minutes;
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
               target="_blank" rel="noopener" class="noaa-link-btn">
                🔗 View on NOAA
            </a>
        </div>
    `;

    elements.resultsContainer.appendChild(card);

    if (result.chartData && result.config.showChart) {
        setTimeout(() => drawTideChart(`chart-${index}`, result.chartData, result.config), 100);
    }
}

function toggleResultDetails(header) {
    const card = header.closest('.result-card');
    card.classList.toggle('expanded');
}

function updateResultsSummary() {
    const goodDays = state.results.filter(r => r.isGood).length;
    const warningDays = state.results.filter(r => !r.isGood).length;
    elements.goodCount.textContent = goodDays;
    elements.warningCount.textContent = warningDays;
    elements.totalCount.textContent = state.results.length;
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    elements.loadingOverlay.classList.toggle('hidden', !isLoading);
    elements.checkTidesBtn.disabled = isLoading;
}

function showError(message) {
    alert(message);
}

// === Chart Drawing ===
function drawTideChart(canvasId, chartData, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const heights = chartData.map(d => d.height);
    const minHeight = Math.min(...heights, config.minimumHeight);
    const maxHeight = Math.max(...heights) + 0.5;

    const practiceStart = parseTime(config.startTime);
    const practiceEnd = parseTime(config.endTime);

    const getX = (time) => {
        const minutes = time.hours * 60 + time.minutes;
        return padding.left + (minutes / (24 * 60)) * chartWidth;
    };
    const getY = (h) => padding.top + chartHeight - ((h - minHeight) / (maxHeight - minHeight)) * chartHeight;

    // Practice window highlight
    ctx.fillStyle = 'rgba(72, 202, 228, 0.1)';
    ctx.fillRect(getX(practiceStart), padding.top, getX(practiceEnd) - getX(practiceStart), chartHeight);

    // Minimum line
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, getY(config.minimumHeight));
    ctx.lineTo(width - padding.right, getY(config.minimumHeight));
    ctx.stroke();
    ctx.setLineDash([]);

    // Tide line
    ctx.strokeStyle = '#48CAE4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    chartData.forEach((point, i) => {
        const x = getX(point.time);
        const y = getY(point.height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(72, 202, 228, 0.3)');
    gradient.addColorStop(1, 'rgba(72, 202, 228, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    chartData.forEach((point, i) => {
        const x = getX(point.time);
        const y = getY(point.height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(getX(chartData[chartData.length - 1].time), height - padding.bottom);
    ctx.lineTo(getX(chartData[0].time), height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let h = 0; h <= 24; h += 6) {
        const x = getX({ hours: h, minutes: 0 });
        ctx.fillText(`${h}:00`, x, height - 10);
    }

    ctx.textAlign = 'right';
    const step = Math.ceil((maxHeight - minHeight) / 4);
    for (let h = Math.ceil(minHeight); h <= maxHeight; h += step || 1) {
        ctx.fillText(`${h}ft`, padding.left - 5, getY(h) + 3);
    }
}
