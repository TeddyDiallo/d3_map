const stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const datasetURL = 'salesdata.csv';

let stateData, dataset;

// Process data for maps
function processData(data) {
    let stateCounts = {};

    data.forEach(row => {
        let state = row['State'];
        stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    return { stateCounts };
}

function drawMap(svgId, stateData, salesData) {
    const svgWidth = 400; // Width of the SVG container
    const svgHeight = 250; // Height of the SVG container

    const svg = d3.select(svgId)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.selectAll('*').remove();

    const projection = d3.geoAlbersUsa()
        .scale(550) // Adjust the scale to fit your SVG size
        .translate([svgWidth / 2, svgHeight / 2]); // Center the map in the container

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleQuantize()
        .domain([0, d3.max(Object.values(salesData.stateCounts))])
        .range(d3.schemeBlues[9]);

    svg.selectAll('path')
        .data(stateData)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => colorScale(salesData.stateCounts[d.properties.name] || 0))
        .attr('stroke', '#000');
}

// Load data and draw maps
Promise.all([d3.json(stateURL), d3.csv(datasetURL)]).then(([topoData, csvData]) => {
    stateData = topojson.feature(topoData, topoData.objects.states).features;
    dataset = csvData;

    const salesData = processData(dataset);

    // Draw two identical maps side by side
    drawMap('#heatmap', stateData, salesData); // First map
    drawMap('#bubblemap', stateData, salesData); // Second map (identical to the first)
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
