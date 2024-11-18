// URLs
let stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
let datasetURL = 'salesdata.csv';

// Data variables
let stateData; // GeoJSON state data
let dataset; // Sales data
let canvas = d3.select('#canvas');

// Color scale
let colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]);

// Process data function
let processData = (data, genderFilter = null, ageFilter = null) => {
    let stateCounts = {};

    // Apply gender filter
    if (genderFilter) {
        data = data.filter((d) => d['Customer Gender'] === genderFilter);
    }

    // Apply age group filter
    if (ageFilter) {
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

    // Add filter event listeners
    d3.select('#all-gender').on('click', () => {
        let counts = processData(dataset);
        updateMap(counts);
    });

    d3.select('#male').on('click', () => {
        let counts = processData(dataset, 'M');
        updateMap(counts);
    });

    d3.select('#female').on('click', () => {
        let counts = processData(dataset, 'F');
        updateMap(counts);
    });

    d3.select('#age-18-25').on('click', () => {
        let counts = processData(dataset, null, '18-25');
        updateMap(counts);
    });

    d3.select('#age-26-35').on('click', () => {
        let counts = processData(dataset, null, '26-35');
        updateMap(counts);
    });

    d3.select('#age-36-50').on('click', () => {
        let counts = processData(dataset, null, '36-50');
        updateMap(counts);
    });

    d3.select('#age-51-plus').on('click', () => {
        let counts = processData(dataset, null, '51+');
        updateMap(counts);
    });
}).catch((error) => {
    console.error('Error loading data:', error);
});
