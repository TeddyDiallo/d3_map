// URLs
let stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
let datasetURL = 'salesdata.csv';

// Data variables
let stateData; // GeoJSON state data
let dataset; // Sales data
let canvas = d3.select('#canvas');

// Color scale
let colorScale = d3.scaleSequentialLog()
    .interpolator(d3.interpolateLab("lightcoral", "black")); // Transition from light red to black

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

    return stateCounts;
};

// Draw map function
let drawMap = (stateData, salesCounts) => {
    // Dynamically adjust the color scale domain
    let maxCount = Math.max(...Object.values(salesCounts));
    let minCount = Math.min(...Object.values(salesCounts).filter(d => d > 0));
    colorScale.domain([minCount, maxCount]); // Adjust domain dynamically

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
            return count > 0 ? colorScale(count) : "#f0f0f0"; // Default color for zero values
        })
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);
};

// Update map function
let updateMap = (salesCounts) => {
    canvas.selectAll('path').remove(); // Clear existing map
    drawMap(stateData, salesCounts); // Redraw map with updated color scale
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

    // Add event listeners for dropdowns
    d3.select('#gender-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;

        // Process filtered data
        let filteredCounts = processData(dataset, gender, ageGroup);

        // Update the map
        updateMap(filteredCounts);
    });

    d3.select('#age-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;

        // Process filtered data
        let filteredCounts = processData(dataset, gender, ageGroup);

        // Update the map
        updateMap(filteredCounts);
    });
}).catch((error) => {
    console.error('Error loading data:', error);
});
