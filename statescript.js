// URLs
let stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
let datasetURL = 'salesdata.csv';

// Data variables
let stateData; // GeoJSON state data
let dataset; // Sales data
let canvas = d3.select('#canvas');

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

    // Log state counts for debugging
    console.log("State Counts:", stateCounts);

    // Find min and max counts
    let maxCount = Math.max(...Object.values(stateCounts));
    let minCount = Math.min(...Object.values(stateCounts).filter((d) => d > 0)); // Ignore zero values
    console.log(`Max Count: ${maxCount}, Min Count (non-zero): ${minCount}`);

    return stateCounts;
};

let drawMap = (stateData, salesCounts) => {
    // Dynamically calculate thresholds based on data
    let maxCount = Math.max(...Object.values(salesCounts));
    let thresholds = [10, 100, 500, 1000];

    // Add thresholds dynamically for larger values
    for (let i = 2000; i <= maxCount; i += 2000) {
        thresholds.push(i);
    }
    console.log("Dynamic Thresholds:", thresholds); // Debugging

    // Dynamically generate a color range based on thresholds
    let numColors = thresholds.length + 1;
    let colors;

    if (numColors <= 9) {
        colors = d3.schemeReds[numColors]; // Use predefined color scheme
    } else {
        let interpolator = d3.interpolateReds; // Continuous interpolation
        colors = Array.from({ length: numColors }, (_, i) => interpolator(i / (numColors - 1)));
    }

    // Create the color scale
    let colorScale = d3.scaleThreshold()
        .domain(thresholds)
        .range(colors);

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
            return count > 0 ? colorScale(count) : "#f0f0f0"; // Default for no data
        })
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);

    // Add legend
    addLegend(thresholds, colorScale);
};

//Adding legend
let addLegend = (thresholds, colorScale) => {
    const legendContainer = d3.select('#legend');
    legendContainer.html(""); // Clear previous legend
    const colors = colorScale.range();
    // Helper function to format numbers
    const formatLabel = (value) => {
        if (value >= 1000) return `${value / 1000}K`; // Convert to "1K", "2K", etc.
        return value;
    };
    // Add a legend item for each color range
    colors.forEach((color, i) => {
        const legendItem = legendContainer.append('div').attr('class', 'legend-item');
        // Add color box
        legendItem.append('div')
            .attr('class', 'legend-color')
            .style('background-color', color);
        // Add label
        legendItem.append('div')
            .attr('class', 'legend-label')
            .text(() => {
                if (i === 0) return `< ${formatLabel(thresholds[i])}`; // First range
                if (i === thresholds.length) return `≥ ${formatLabel(thresholds[i - 1])}`; // Last range
                return `${formatLabel(thresholds[i - 1])} - ${formatLabel(thresholds[i])}`; // Intermediate ranges
            });
    });
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
