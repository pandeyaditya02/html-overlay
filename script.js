document.addEventListener('DOMContentLoaded', () => {

    // --- 1. PASTE YOUR NEW SINGLE GOOGLE SHEET URL HERE ---

    // URL from publishing your 'AllData' sheet as a CSV
    const googleSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQa-YCXNluBVT0W_cJDgNoOdUR4-r5kb_SHsIH_iHcPMy0d1tlhX_3za0GvX89AVcD8LUDkhB7Xn2mP/pub?gid=1543965916&single=true&output=csv';

    // How often to check for updates (in milliseconds)
    const REFRESH_INTERVAL = 5000; // 5 seconds

    // --- 2. INITIAL (ZEROED) DATA ---
    
    let totalSeats = 243;
    let leftPanelData = [
        { name: 'BJP', seats: 0 },
        { name: 'CONGRESS', seats: 0 },
        { name: 'RJD', seats: 0 },
        { name: 'JAN SURAAJ ', seats: 0 },
        { name: 'OTH', seats: 0 }
    ];
    let bottomPanelData = [
        { name: 'NDA', seats: 0 },
        { name: 'MGB', seats: 0 },
        { name: 'JAN SURAAJ', seats: 0 },
        { name: 'OTHERS', seats: 0 }
    ];

    // --- 3. SCRIPT LOGIC (No need to edit below) ---

    const partyList = document.getElementById('party-list');
    const mainTally = document.getElementById('main-tally');
    const trendsTallyEl = document.getElementById('trends-tally');

    // Function to build the HTML from the data variables
    function renderPanels() {
        partyList.innerHTML = '';
        leftPanelData.forEach((party, index) => {
            const row = document.createElement('div');
            row.className = 'party-row';
            row.innerHTML = `
                <span class="party-name">${party.name}</span>
                <span class="party-seats" id="party-seats-${index}" data-target="${party.seats}">0</span>
            `;
            partyList.appendChild(row);
        });

        mainTally.innerHTML = '';
        bottomPanelData.forEach((party, index) => {
            const block = document.createElement('div');
            block.className = 'tally-block';
            block.innerHTML = `
                <span class="tally-name">${party.name}</span>
                <span class="tally-seats" id="tally-seats-${index}" data-target="${party.seats}">0</span>
            `;
            mainTally.appendChild(block);
        });

        updateTrendsTally();
    }

    // Function to calculate and set the trends tally
    function updateTrendsTally() {
        const currentTrends = bottomPanelData.reduce((sum, party) => sum + party.seats, 0);
        trendsTallyEl.setAttribute('data-target-current', currentTrends);
        trendsTallyEl.setAttribute('data-target-total', totalSeats);
    }

    // Function to animate all numbers
    function animateNumbers() {
        leftPanelData.forEach((party, index) => {
            const el = document.getElementById(`party-seats-${index}`);
            animateCountUp(el, party.seats);
        });

        bottomPanelData.forEach((party, index) => {
            const el = document.getElementById(`tally-seats-${index}`);
            animateCountUp(el, party.seats);
        });
        animateTrends();
    }
    
    // Helper function for the number count-up animation
    function animateCountUp(element, target) {
        if (!element) return; // Failsafe
        let start = parseInt(element.innerText.split('/')[0], 10) || 0;
        const end = parseInt(target, 10);
        if (start === end) return;
        const duration = 1000;
        const range = end - start;
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const currentNum = Math.floor(progress * range + start);
            element.innerText = currentNum;
            if (progress < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    // Special animation for the "0/0" trends box
    function animateTrends() {
        const targetCurrent = parseInt(trendsTallyEl.getAttribute('data-target-current'), 10);
        const targetTotal = parseInt(trendsTallyEl.getAttribute('data-target-total'), 10);
        let startCurrent = parseInt(trendsTallyEl.innerText.split('/')[0], 10) || 0;
        const endCurrent = targetCurrent;
        if (startCurrent === endCurrent) {
            trendsTallyEl.innerText = `${endCurrent}/${targetTotal}`;
            return;
        }
        const duration = 1000;
        const range = endCurrent - startCurrent;
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const currentNum = Math.floor(progress * range + startCurrent);
            trendsTallyEl.innerText = `${currentNum}/${targetTotal}`;
            if (progress < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    // --- 4. NEW GOOGLE SHEETS DATA FETCHER ---

    // Main function to update all data from the single sheet
    async function updateDataFromSheets() {
        console.log("Checking for updates...");
        
        try {
            // Add cache-busting parameter to URL
            const cacheBustURL = `${googleSheetURL}&t=${new Date().getTime()}`;
            const response = await fetch(cacheBustURL);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            
            const csvText = await response.text();
            
            // Prepare new data arrays
            let newLeftData = [];
            let newBottomData = [];
            let newTotalSeats = totalSeats; // Default to current

            // Parse CSV: split by new line, remove header
            const rows = csvText.trim().split('\n').slice(1);
            
            rows.forEach(row => {
                const [type, name, value] = row.split(',');
                if (!type || !name || value === undefined) return; // Skip empty rows

                const formattedName = name.trim();
                const formattedValue = parseInt(value.trim()) || 0;

                if (type.trim() === 'left') {
                    newLeftData.push({ name: formattedName, seats: formattedValue });
                } else if (type.trim() === 'bottom') {
                    newBottomData.push({ name: formattedName, seats: formattedValue });
                } else if (type.trim() === 'config' && formattedName === 'TotalSeats') {
                    newTotalSeats = formattedValue;
                }
            });

            // Check if data has actually changed before re-rendering
            let dataChanged = false;
            if (JSON.stringify(newLeftData) !== JSON.stringify(leftPanelData)) {
                leftPanelData = newLeftData;
                dataChanged = true;
            }
            if (JSON.stringify(newBottomData) !== JSON.stringify(bottomPanelData)) {
                bottomPanelData = newBottomData;
                dataChanged = true;
            }
            if (newTotalSeats !== totalSeats) {
                totalSeats = newTotalSeats;
                dataChanged = true;
            }

            // Only re-render and animate if data has actually changed
            if (dataChanged) {
                console.log("Data changed, updating overlay!");
                renderPanels();
                animateNumbers();
            } else {
                console.log("No changes detected.");
            }

        } catch (error) {
            console.error(`Error fetching data:`, error);
        }
    }

    // --- 5. INITIAL RUN ---

    // 1. Render the initial (zeroed) panels immediately
    renderPanels();
    animateNumbers();

    // 2. Fetch data from Google Sheets for the first time
    updateDataFromSheets();

    // 3. Set an interval to keep checking for updates
    setInterval(updateDataFromSheets, REFRESH_INTERVAL);

});