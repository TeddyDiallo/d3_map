// URLs
let stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
let datasetURL = 'salesdata.csv';

// Data variables
let stateData; // GeoJSON state data
let dataset; // Sales data
let canvas = d3.select('#canvas');

// Color scale
let colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]);
//let colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, 100]);

const validStates = new Set([
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington", "West Virginia", "Wisconsin", "Wyoming",
    "District of Columbia"
]);

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
        if (validStates.has(state)) { // Use Set for efficient state validation
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
    });
    console.log('State Counts:', stateCounts);
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
        .attr('fill', (d) => {
            let state = d.properties.name;
            let count = salesCounts[state] || 0;
            return colorScale(count);
        })
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);
};

// Update map function
let updateMap = (salesCounts) => {
    // Dynamically adjust the color scale domain
    let maxCount = Math.max(...Object.values(salesCounts)); // Get the max sales count
    colorScale.domain([0, maxCount]); // Adjust the domain dynamically

    canvas.selectAll('path').remove(); // Clear existing map
    drawMap(stateData, salesCounts); // Redraw map with filtered data
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
        let filteredCounts = processData(dataset, gender, ageGroup);
        updateMap(filteredCounts);
    });

    d3.select('#age-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;
        let filteredCounts = processData(dataset, gender, ageGroup);
        updateMap(filteredCounts);
    });
}).catch((error) => {
    console.error('Error loading data:', error);
});
