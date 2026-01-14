const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// NOAA API proxy endpoint to avoid CORS issues
app.get('/api/tides', async (req, res) => {
    const { station, beginDate, range } = req.query;
    
    if (!station || !beginDate || !range) {
        return res.status(400).json({ error: 'Missing required parameters: station, beginDate, range' });
    }
    
    const noaaUrl = `https://tidesandcurrents.noaa.gov/api/datagetter?product=predictions&application=TidesApp&begin_date=${beginDate}&range=${range}&datum=MLLW&station=${station}&time_zone=lst_ldt&units=english&format=json`;
    
    try {
        const response = await fetch(noaaUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching NOAA data:', error);
        res.status(500).json({ error: 'Failed to fetch tide data from NOAA' });
    }
});

// Get tide predictions for a full day (hourly intervals)
app.get('/api/tides/daily', async (req, res) => {
    const { station, date } = req.query;
    
    if (!station || !date) {
        return res.status(400).json({ error: 'Missing required parameters: station, date' });
    }
    
    const noaaUrl = `https://tidesandcurrents.noaa.gov/api/datagetter?product=predictions&application=TidesApp&begin_date=${date}&range=24&datum=MLLW&station=${station}&time_zone=lst_ldt&units=english&interval=h&format=json`;
    
    try {
        const response = await fetch(noaaUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching daily NOAA data:', error);
        res.status(500).json({ error: 'Failed to fetch daily tide data from NOAA' });
    }
});

// Get high/low tide predictions
app.get('/api/tides/hilo', async (req, res) => {
    const { station, beginDate, endDate } = req.query;
    
    if (!station || !beginDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters: station, beginDate, endDate' });
    }
    
    const noaaUrl = `https://tidesandcurrents.noaa.gov/api/datagetter?product=predictions&application=TidesApp&begin_date=${beginDate}&end_date=${endDate}&datum=MLLW&station=${station}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
    
    try {
        const response = await fetch(noaaUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching hi/lo NOAA data:', error);
        res.status(500).json({ error: 'Failed to fetch hi/lo tide data from NOAA' });
    }
});

// Get list of popular NOAA stations
app.get('/api/stations', (req, res) => {
    const stations = [
        { id: '9414523', name: 'Redwood City, CA', region: 'San Francisco Bay' },
        { id: '9414290', name: 'San Francisco, CA', region: 'San Francisco Bay' },
        { id: '9414750', name: 'Alameda, CA', region: 'San Francisco Bay' },
        { id: '9410170', name: 'San Diego, CA', region: 'Southern California' },
        { id: '9410660', name: 'Los Angeles, CA', region: 'Southern California' },
        { id: '9411340', name: 'Santa Barbara, CA', region: 'Central California' },
        { id: '9413450', name: 'Monterey, CA', region: 'Central California' },
        { id: '9447130', name: 'Seattle, WA', region: 'Pacific Northwest' },
        { id: '9432780', name: 'Charleston, OR', region: 'Pacific Northwest' },
        { id: '8443970', name: 'Boston, MA', region: 'New England' },
        { id: '8461490', name: 'New London, CT', region: 'New England' },
        { id: '8518750', name: 'The Battery, NY', region: 'New York' },
        { id: '8723214', name: 'Virginia Key, FL', region: 'Florida' },
        { id: '8467150', name: 'Bridgeport, CT', region: 'New England' },
        { id: '8574680', name: 'Baltimore, MD', region: 'Mid-Atlantic' },
        { id: '8638610', name: 'Sewells Point, VA', region: 'Mid-Atlantic' },
        { id: '8771450', name: 'Galveston Bay, TX', region: 'Gulf Coast' },
        { id: '8726520', name: 'St. Petersburg, FL', region: 'Gulf Coast' },
    ];
    res.json(stations);
});

app.listen(PORT, () => {
    console.log(`🌊 Tides Server running at http://localhost:${PORT}`);
});
