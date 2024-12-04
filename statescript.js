const stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const datasetURL = 'salesdata.csv';

let stateData, dataset;

function processData(data, genderFilter = null, ageFilter = null) {
    let stateCounts = {};  
    let stateProfits = {}; 

    // Apply gender filter
    if (genderFilter && genderFilter !== 'all') {
        data = data.filter((d) => d['Customer Gender'] === genderFilter);
        console.log("Dataset size after gender filter:", data.length);
    }
    // Apply age group filter
    if (ageFilter && ageFilter !== 'all') {
        data = data.filter((d) => {
            let age = parseFloat(d['Customer Age']);
            if (ageFilter === '18-25') return age >= 18 && age <= 25;
            if (ageFilter === '26-35') return age >= 26 && age <= 35;
            if (ageFilter === '36-50') return age >= 36 && age <= 50;
            if (ageFilter === '51+') return age > 50;
        });
    }
    // Count sales and calculate profits per state
    data.forEach((row) => {
        let state = row['State'];
        let revenue = parseFloat(row['Revenue']);
        let cost = parseFloat(row['Cost']);
        let profit = revenue - cost;
        // Update stateCounts
        stateCounts[state] = (stateCounts[state] || 0) + 1;
        // Update stateProfits
        stateProfits[state] = (stateProfits[state] || 0) + profit;
    });
    // Normalize keys in stateProfits to lowercase
    let normalizedProfits = {};
    for (let state in stateProfits) {
        normalizedProfits[state.toLowerCase()] = stateProfits[state];
    }
    stateProfits = normalizedProfits;

    return { stateCounts, stateProfits };
}

function addLegend(legendId, thresholds, colorScale) {
    const legendContainer = d3.select(`#${legendId}`); // Select the correct legend container
    legendContainer.html(''); // Clear previous legend content

    const colors = colorScale.range();

    // Create legend items for each unique threshold
    colors.forEach((color, i) => {
        const legendItem = legendContainer.append('div').attr('class', 'legend-item');

        // Add the color box
        legendItem.append('div')
            .attr('class', 'legend-color')
            .style('background-color', i === 0 ? '#d3d3d3' : color); // Grey for "None"

        // Add the label
        legendItem.append('div')
            .attr('class', 'legend-label')
            .text(() => {
                if (i === 0) return 'None'; // Hardcode the first range as "None"
                if (i === thresholds.length) return `≥ ${formatThreshold(thresholds[i - 1])}`; // Last range
                return `${formatThreshold(thresholds[i - 1])} - ${formatThreshold(thresholds[i])}`; // Intermediate ranges
            });
    });
}
function formatThreshold(value) {
    return value >= 1000 ? `${Math.ceil(value / 1000)}k` : `${Math.ceil(value)}`;
}

function drawMap(svgId, stateData, salesData) {
    const svgWidth = 400; // Width of the SVG container
    const svgHeight = 250; // Height of the SVG container

    const svg = d3.select(svgId)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.selectAll('*').remove(); // Clear the SVG before redrawing

    const projection = d3.geoAlbersUsa()
        .scale(550) // Keep the scaling to fit the SVG correctly
        .translate([svgWidth / 2, svgHeight / 2]); // Center the map in the container

    const path = d3.geoPath().projection(projection);

    // Calculate dynamic thresholds
    const counts = Object.values(salesData.stateCounts);
    const maxCount = d3.max(counts) || 1; // Avoid division by 0
    let rawThresholds = d3.range(0, maxCount, maxCount / 9); // Generate thresholds
    const adjustedThresholds = [...new Set(rawThresholds.map(formatToRoundedThreshold))]; // Remove duplicates

    // Adjust number of colors based on unique thresholds
    const colorScale = d3.scaleThreshold()
        .domain(adjustedThresholds)
        .range(adjustedThresholds.map((_, i) => d3.interpolateReds(i / (adjustedThresholds.length - 1))));

    // Draw the states on the map
    svg.selectAll('path')
        .data(stateData)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => {
            const state = d.properties.name;
            const count = salesData.stateCounts[state] || 0;
            return count > 0 ? colorScale(count) : "#f0f0f0"; // Default gray for zero values
        })
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);

    // Add the legend next to the map
    addLegend(svgId.replace('#', '') + '-legend', adjustedThresholds, colorScale);
}
function formatToRoundedThreshold(value) {
    if (value >= 1000) {
        return Math.ceil(value / 1000) * 1000; // Round to the nearest thousand
    }
    return Math.ceil(value / 100) * 100; // Round to the nearest hundred
}

// Load data and draw maps
Promise.all([d3.json(stateURL), d3.csv(datasetURL)]).then(([topoData, csvData]) => {
    stateData = topojson.feature(topoData, topoData.objects.states).features;
    dataset = csvData;

    // Initial rendering with no filters applied
    const initialData = processData(dataset);
    drawMap('#heatmap', stateData, initialData); // First map
    drawMap('#bubblemap', stateData, initialData); // Second map

    // Add event listeners for dropdown filters
    d3.select('#gender-filter').on('change', updateMaps);
    d3.select('#age-filter').on('change', updateMaps);

    // Function to update maps when filters are applied
    function updateMaps() {
        const gender = d3.select('#gender-filter').node().value; // Get gender filter
        const ageGroup = d3.select('#age-filter').node().value; // Get age filter

        // Process filtered data
        const filteredData = processData(dataset, gender, ageGroup);

        // Redraw both maps with filtered data
        drawMap('#heatmap', stateData, filteredData);
        drawMap('#bubblemap', stateData, filteredData);
    }
}).catch((error) => {
    console.error('Error loading data:', error);
});

// Toggle legend visibility
document.getElementById("toggle-legend").addEventListener("click", function () {
    const legends = document.querySelectorAll(".legend");
    const button = this;

    legends.forEach(legend => {
        if (legend.style.display === "none" || legend.style.display === "") {
            legend.style.display = "block"; // Show legend
            button.textContent = "Hide Legend"; // Update button text
        } else {
            legend.style.display = "none"; // Hide legend
            button.textContent = "Show Legend"; // Update button text
        }
    });
});

function drawTimeSeries(svgId, data) {
    const svgWidth = 800; // Width of the time series container
    const svgHeight = 250; // Height of the time series container

    const svg = d3.select(svgId)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Example time series data
    const timeSeriesData = data.map((d, i) => ({
        date: new Date(2023, i, 1), // Example months
        value: Math.random() * 100, // Random values
    }));

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(timeSeriesData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(timeSeriesData, d => d.value)])
        .nice()
        .range([height, 0]);

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6));

    g.append('g').call(d3.axisLeft(y));

    // Line
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value));

    g.append('path')
        .datum(timeSeriesData)
        .attr('fill', 'none')
        .attr('stroke', '#007acc')
        .attr('stroke-width', 2)
        .attr('d', line);
}

// Draw the time series chart
Promise.resolve().then(() => {
    // Use fake data here; replace with actual if available
    const fakeData = Array(12).fill(0).map((_, i) => i); // Example data
    drawTimeSeries('#time-series-chart', fakeData);
});
