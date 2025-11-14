document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SET YOUR LOCAL DATA FILE AND REFRESH RATE ---

    // Point to the local CSV file in your folder
    const dataURL = 'data.csv';

    // How often to check for updates (in milliseconds)
    const REFRESH_INTERVAL = 2000; // 2 seconds

    // --- 2. INITIAL (ZEROED) DATA ---
    
    let totalSeats = 243;

    // Updated with new party names and data structure
    let leftPanelData = [
        { name: 'BJP', leads: 0, won: 0 },
        { name: 'JDU', leads: 0, won: 0 },
        { name: 'LJPRV', leads: 0, won: 0 },
        { name: 'RJD', leads: 0, won: 0 },
        { name: 'Congress', leads: 0, won: 0 },
        { name: 'CPI(ML)(L)', leads: 0, won: 0 },
        { name: 'HAMS', leads: 0, won: 0 },
        { name: 'JanSuraj Party', leads: 0, won: 0 },
        { name: 'Others', leads: 0, won: 0 }
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
            // UPDATED: New HTML structure for leads and won
            row.innerHTML = `
                <span class="party-name">${party.name}</span>
                <span class="party-leads" id="party-leads-${index}" data-target="${party.leads}">0</span>
                <span class="party-won" id="party-won-${index}" data-target="${party.won}">0</span>
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
        // Trends tally is based on the bottom panel (alliances)
        const currentTrends = bottomPanelData.reduce((sum, party) => sum + party.seats, 0);
        trendsTallyEl.setAttribute('data-target-current', currentTrends);
        trendsTallyEl.setAttribute('data-target-total', totalSeats);
    }

    // Function to animate all numbers
    function animateNumbers() {
        // UPDATED: Animate both leads and won
        leftPanelData.forEach((party, index) => {
            const leadsEl = document.getElementById(`party-leads-${index}`);
            const wonEl = document.getElementById(`party-won-${index}`);
            animateCountUp(leadsEl, party.leads);
            animateCountUp(wonEl, party.won);
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

    // --- 4. LOCAL FILE DATA FETCHER ---

    // Main function to update all data from the local sheet
    async function updateDataFromFile() {
        console.log("Checking for updates from data.csv...");
        
        try {
            const cacheBustURL = `${dataURL}?t=${new Date().getTime()}`;
            const response = await fetch(cacheBustURL);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            
            // Prepare new data arrays
            let newLeftData = [];
            let newBottomData = [];
            let newTotalSeats = totalSeats; // Default to current

            // Parse CSV: split by new line, remove header
            const rows = csvText.trim().split('\n').slice(1);
            
            rows.forEach(row => {
                // UPDATED: Parse 4 columns
                const [type, name, value1, value2] = row.split(',');
                if (!type || !name || value1 === undefined) return; // Skip empty rows

                const formattedName = name.trim();
                const formattedValue1 = parseInt(value1.trim()) || 0;
                const formattedValue2 = parseInt(value2.trim()) || 0; // For 'won'

                if (type.trim() === 'left') {
                    // UPDATED: Save both leads and won
                    newLeftData.push({ name: formattedName, leads: formattedValue1, won: formattedValue2 });
                } else if (type.trim() === 'bottom') {
                    // 'bottom' only uses Value1
                    newBottomData.push({ name: formattedName, seats: formattedValue1 });
                } else if (type.trim() === 'config' && formattedName === 'TotalSeats') {
                    // 'config' only uses Value1
                    newTotalSeats = formattedValue1;
                }
            });

            // Check if data has actually changed before re-rendering
            let dataChanged = false;
            if (newLeftData.length > 0 && JSON.stringify(newLeftData) !== JSON.stringify(leftPanelData)) {
                leftPanelData = newLeftData;
                dataChanged = true;
            }
            if (newBottomData.length > 0 && JSON.stringify(newBottomData) !== JSON.stringify(bottomPanelData)) {
                bottomPanelData = newBottomData;
                dataChanged = true;
            }
            if (newTotalSeats !== totalSeats) {
                totalSeats = newTotalSeats;
                dataChanged = true;
            }

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
    renderPanels();
    animateNumbers();
    updateDataFromFile();
    setInterval(updateDataFromFile, REFRESH_INTERVAL);

});