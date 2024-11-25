// URLs
let stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
let datasetURL = 'salesdata.csv';

// Data variables
let stateData; // GeoJSON state data
let dataset; // Sales data
let canvas = d3.select('#canvas');

// Piecewise color scale
let colorScale = d3.scaleThreshold()
    .domain([10, 50, 100, 500, 1000]) // Thresholds for sales counts
    .range(["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"]); // Cascading colors

// Process data function
let processData = (data, genderFilter = null, ageFilter = null) => {
    let stateCounts = {};

    // Apply gender filter
    if (genderFilter && genderFilter !== 'all') {
        data = data.filter((d) => d['Customer Gender'] === genderFilter);
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

    // Count sales per state
    data.forEach((row) => {
        let state = row['State'];
        stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    // Log the counts for debugging
    console.log("State Counts:", stateCounts);

    // Find min and max counts
    let maxCount = Math.max(...Object.values(stateCounts));
    let minCount = Math.min(...Object.values(stateCounts).filter((d) => d > 0)); // Ignore zero values

    // Log min and max counts
    console.log(`Max Count: ${maxCount}, Min Count (non-zero): ${minCount}`);

    return stateCounts;
};

// Draw map function
let drawMap = (stateData, salesCounts) => {
    let projection = d3.geoAlbersUsa();
    let path = d3.geoPath().projection(projection);

    // Draw the states
    canvas.selectAll('path')
        .data(stateData)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'state')
        .transition()
        .duration(500)
        .attr('fill', (d) => {
            let state = d.properties.name;
            let count = salesCounts[state] || 0;
            return count > 0 ? colorScale(count) : "#f0f0f0"; // Default for zero values
        })
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);
};

// Update map function
let updateMap = (salesCounts) => {
    canvas.selectAll('path').remove(); // Clear existing map
    drawMap(stateData, salesCounts); // Redraw map with updated color scale
};

// Add legend
let addLegend = () => {
    const thresholds = colorScale.domain();
    const colors = colorScale.range();

    let legend = d3.select('#legend').selectAll('div')
        .data(thresholds)
        .enter()
        .append('div')
        .attr('class', 'legend-item');

    legend.append('div')
        .attr('class', 'legend-color')
        .style('background-color', (d, i) => colors[i]);

    legend.append('div')
        .attr('class', 'legend-label')
        .text((d, i) => {
            if (i === 0) return `< ${thresholds[i]}`;
            if (i === thresholds.length - 1) return `> ${thresholds[i]}`;
            return `${thresholds[i - 1]} - ${thresholds[i]}`;
        });
};

// Fetch and process data
Promise.all([
    d3.json(stateURL), // Load the states TopoJSON
    d3.csv(datasetURL) // Load the sales dataset
]).then(([stateTopoData, csvData]) => {
    // Process the state data into GeoJSON
    stateData = topojson.feature(stateTopoData, stateTopoData.objects.states).features;

    // Store the dataset
    dataset = csvData;

    // Initial rendering (no filters)
    let initialCounts = processData(dataset);
    drawMap(stateData, initialCounts);

    // Add legend
    addLegend();

    // Add event listeners for dropdowns
    d3.select('#gender-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;

        // Log selected filters
        console.log(`Selected Gender: ${gender}, Selected Age Group: ${ageGroup}`);

        // Process filtered data
        let filteredCounts = processData(dataset, gender, ageGroup);

        // Update the map
        updateMap(filteredCounts);
    });

    d3.select('#age-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;

        // Log selected filters
        console.log(`Selected Gender: ${gender}, Selected Age Group: ${ageGroup}`);

        // Process filtered data
        let filteredCounts = processData(dataset, gender, ageGroup);

        // Update the map
        updateMap(filteredCounts);
    });
}).catch((error) => {
    console.error('Error loading data:', error);
});
