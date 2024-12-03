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
    let stateProfits = {};

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

    // Count sales and calculate profits per state
    data.forEach((row) => {
        let state = row['State'];
        let profit = parseFloat(row['Revenue']) - parseFloat(row['Cost']);

        stateCounts[state] = (stateCounts[state] || 0) + 1;
        stateProfits[state] = (stateProfits[state] || 0) + profit;
    });

    // Normalize keys in stateProfits to lowercase
    let normalizedProfits = {};
    for (let state in stateProfits) {
        normalizedProfits[state.toLowerCase()] = stateProfits[state];
    }
    stateProfits = normalizedProfits;

    return { stateCounts, stateProfits };
};

// Format thresholds for legend
let formatThreshold = (value) => {
    if (value >= 1000) {
        return `${value / 1000}K`;
    }
    return value.toString();
};

// Add legend function
let addLegend = (thresholds, colorScale) => {
    const legendContainer = d3.select('#legend');
    const colors = colorScale.range();

    colors.forEach((color, i) => {
        const legendItem = legendContainer.append('div').attr('class', 'legend-item');
        legendItem.append('div')
            .attr('class', 'legend-color')
            .style('background-color', color);
        legendItem.append('div')
            .attr('class', 'legend-label')
            .text(() => {
                if (i === 0) return `< ${formatThreshold(thresholds[i])}`;
                if (i === thresholds.length) return `≥ ${formatThreshold(thresholds[i - 1])}`;
                return `${formatThreshold(thresholds[i - 1])} - ${formatThreshold(thresholds[i])}`;
            });
    });
};

// Draw map function
let drawMap = (stateData, salesData, mapType = 'heatmap') => {
    let stateCounts = salesData.stateCounts;
    let stateProfits = salesData.stateProfits;

    // Clear previous map
    canvas.selectAll('path').remove();
    canvas.selectAll('circle').remove();
    d3.select('#legend').html("");

    let maxCount = Math.max(...Object.values(stateCounts));
    let thresholds = [10, 100, 500, 1000];
    for (let i = 2000; i <= maxCount; i += 2000) {
        thresholds.push(i);
    }

    let numColors = thresholds.length + 1;
    let colors = numColors <= 9 ? d3.schemeReds[numColors] : Array.from({ length: numColors }, (_, i) => d3.interpolateReds(i / (numColors - 1)));

    let colorScale = d3.scaleThreshold()
        .domain(thresholds)
        .range(colors);

    let projection = d3.geoAlbersUsa();
    let path = d3.geoPath().projection(projection);

    if (mapType === 'heatmap') {
        canvas.selectAll('path')
            .data(stateData)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('fill', (d) => {
                let state = d.properties.name;
                let count = stateCounts[state] || 0;
                return count > 0 ? colorScale(count) : "#f0f0f0";
            })
            .attr('stroke', '#000')
            .attr('stroke-width', 0.5);
        addLegend(thresholds, colorScale);
    } else if (mapType === 'bubblemap') {
        canvas.selectAll('circle')
            .data(stateData)
            .enter()
            .append('circle')
            .filter((d) => {
                let state = d.properties.name.toLowerCase();
                return stateProfits.hasOwnProperty(state);
            })
            .attr('cx', (d) => {
                let centroid = d3.geoCentroid(d);
                return projection(centroid)[0];
            })
            .attr('cy', (d) => {
                let centroid = d3.geoCentroid(d);
                return projection(centroid)[1];
            })
            .attr('r', (d) => {
                let state = d.properties.name.toLowerCase();
                let profit = stateProfits[state] || 0;
                return Math.sqrt(Math.abs(profit)) / 50;
            })
            .attr('fill', (d) => {
                let state = d.properties.name.toLowerCase();
                let profit = stateProfits[state] || 0;
                return profit > 0 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .style('pointer-events', 'none');
    }
};

// Fetch and process data
Promise.all([
    d3.json(stateURL),
    d3.csv(datasetURL)
]).then(([stateTopoData, csvData]) => {
    stateData = topojson.feature(stateTopoData, stateTopoData.objects.states).features;
    dataset = csvData;

    let initialCounts = processData(dataset);
    drawMap(stateData, initialCounts, 'heatmap');

    let initialTimeSeries = processTimeSeriesData(dataset);
    drawTimeSeries(initialTimeSeries);

    // Event listeners for filters
    d3.select('#gender-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;
        let filteredCounts = processData(dataset, gender, ageGroup);
        drawMap(stateData, filteredCounts, d3.select('.toggle-btn.active').node().id === 'heatmap-btn' ? 'heatmap' : 'bubblemap');
        let timeSeriesData = processTimeSeriesData(dataset, gender, ageGroup);
        drawTimeSeries(timeSeriesData);    
    });

    d3.select('#age-filter').on('change', () => {
        let gender = d3.select('#gender-filter').node().value;
        let ageGroup = d3.select('#age-filter').node().value;
        let filteredCounts = processData(dataset, gender, ageGroup);
        drawMap(stateData, filteredCounts, d3.select('.toggle-btn.active').node().id === 'heatmap-btn' ? 'heatmap' : 'bubblemap');
        let timeSeriesData = processTimeSeriesData(dataset, gender, ageGroup);
        drawTimeSeries(timeSeriesData);
    });

    // Map toggle buttons
    d3.select('#heatmap-btn').on('click', () => {
        d3.selectAll('.toggle-btn').classed('active', false);
        d3.select('#heatmap-btn').classed('active', true);
        let filteredCounts = processData(dataset, d3.select('#gender-filter').node().value, d3.select('#age-filter').node().value);
        drawMap(stateData, filteredCounts, 'heatmap');
    });

    d3.select('#bubblemap-btn').on('click', () => {
        d3.selectAll('.toggle-btn').classed('active', false);
        d3.select('#bubblemap-btn').classed('active', true);
        let filteredCounts = processData(dataset, d3.select('#gender-filter').node().value, d3.select('#age-filter').node().value);
        drawMap(stateData, filteredCounts, 'bubblemap');
    });
}).catch((error) => {
    console.error('Error loading data:', error);
});
