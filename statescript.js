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
    drawBubbleMap('#bubblemap', stateData, initialData);

    // Add event listeners for filters
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
        drawBubbleMap('#bubblemap', stateData, filteredData);
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

function processTimeSeriesData(data, yearFilter = null) {
    // Apply year filter if specified
    if (yearFilter && yearFilter !== 'all') {
        data = data.filter(d => d['Year'] === yearFilter);
    }
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    // Initialize an array for the 12 months
    const timeSeries = Array.from({ length: 12 }, (_, monthIndex) => {
        const month = monthNames[monthIndex];
        const femaleCount = data.filter(d => d['Month'] === month && d['Customer Gender'] === 'F').length;
        const maleCount = data.filter(d => d['Month'] === month && d['Customer Gender'] === 'M').length;
        return {
            month,
            femaleCount,
            maleCount
        };
    });
    return timeSeries;
}

// function drawTimeSeries(svgId, timeSeriesData, selectedYear) {
//     const svgWidth = 800; // Match width with other components
//     const svgHeight = 250; // Ensure space for legends and axes

//     const svg = d3.select(svgId)
//         .attr('width', svgWidth)
//         .attr('height', svgHeight);

//     svg.selectAll('*').remove(); // Clear previous content

//     const margin = { top: 30, right: 50, bottom: 50, left: 50 };
//     const width = svgWidth - margin.left - margin.right;
//     const height = svgHeight - margin.top - margin.bottom;

//     const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

//     // Scales
//     const xScale = d3.scalePoint()
//         .domain(timeSeriesData.map(d => d.month))
//         .range([0, width]);

//     const maxCount = d3.max(timeSeriesData, d => Math.max(d.maleCount, d.femaleCount)) || 1;
//     const yScale = d3.scaleLinear()
//         .domain([0, maxCount])
//         .nice()
//         .range([height, 0]);

//     // Axes
//     g.append('g')
//     .attr('transform', `translate(0,${height})`)
//     .call(
//         d3.axisBottom(xScale)
//             .tickFormat(month => month.slice(0, 3)) // Use first 3 letters of month
//     );

//     g.append('g').call(d3.axisLeft(yScale));

//     // Line generator
//     const line = d3.line()
//         .x(d => xScale(d.month))
//         .y(d => yScale(d.value));

//     const maleLineColor = '#0056b3';
//     const femaleLineColor = '#d62728';

//     // Draw male line
//     g.append('path')
//         .datum(timeSeriesData.map(d => ({ month: d.month, value: d.maleCount })))
//         .attr('fill', 'none')
//         .attr('stroke', maleLineColor)
//         .attr('stroke-width', 2)
//         .attr('d', line);

//     // Draw female line
//     g.append('path')
//         .datum(timeSeriesData.map(d => ({ month: d.month, value: d.femaleCount })))
//         .attr('fill', 'none')
//         .attr('stroke', femaleLineColor)
//         .attr('stroke-width', 2)
//         .attr('d', line);

//     // Add points for male line
//     g.selectAll('.male-point')
//         .data(timeSeriesData)
//         .enter()
//         .append('circle')
//         .attr('class', 'male-point')
//         .attr('cx', d => xScale(d.month))
//         .attr('cy', d => yScale(d.maleCount))
//         .attr('r', 4)
//         .attr('fill', maleLineColor);

//     // Add points for female line
//     g.selectAll('.female-point')
//         .data(timeSeriesData)
//         .enter()
//         .append('circle')
//         .attr('class', 'female-point')
//         .attr('cx', d => xScale(d.month))
//         .attr('cy', d => yScale(d.femaleCount))
//         .attr('r', 4)
//         .attr('fill', femaleLineColor);

//     // Add legend
//     const legend = svg.append('g').attr('transform', `translate(${width + margin.left - 150}, 20)`);

//     legend.append('circle').attr('cx', 0).attr('cy', 10).attr('r', 5).style('fill', maleLineColor);
//     legend.append('text').attr('x', 10).attr('y', 15).text('Men').style('font-size', '12px');

//     legend.append('circle').attr('cx', 0).attr('cy', 30).attr('r', 5).style('fill', femaleLineColor);
//     legend.append('text').attr('x', 10).attr('y', 35).text('Women').style('font-size', '12px');

//     legend.append('text')
//         .attr('x', 0)
//         .attr('y', 0)
//         .text(selectedYear === 'all' ? 'All Years' : `Year: ${selectedYear}`)
//         .style('font-size', '14px')
//         .style('font-weight', 'bold');
// }

// Add year filter

function drawTimeSeries(svgId, timeSeriesData, selectedYear) {
    const svgWidth = 800; // Match width with other components
    const svgHeight = 250; // Ensure space for legends and axes

    const svg = d3.select(svgId)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.selectAll('*').remove(); // Clear previous content

    const margin = { top: 30, right: 50, bottom: 50, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', '1px solid #ccc')
        .style('border-radius', '4px')
        .style('padding', '10px')
        .style('display', 'none');

    // Scales
    const xScale = d3.scalePoint()
        .domain(timeSeriesData.map(d => d.month))
        .range([0, width]);

    const maxCount = d3.max(timeSeriesData, d => Math.max(d.maleCount, d.femaleCount)) || 1;
    const yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([height, 0]);

    // Axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(
            d3.axisBottom(xScale)
                .tickFormat(month => month.slice(0, 3)) // Use first 3 letters of month
        );

    g.append('g').call(d3.axisLeft(yScale));

    const line = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(d.value));

    const maleLineColor = '#0056b3';
    const femaleLineColor = '#d62728';

    // Draw male line
    g.append('path')
        .datum(timeSeriesData.map(d => ({ month: d.month, value: d.maleCount })))
        .attr('fill', 'none')
        .attr('stroke', maleLineColor)
        .attr('stroke-width', 2)
        .attr('d', line);

    // Draw female line
    g.append('path')
        .datum(timeSeriesData.map(d => ({ month: d.month, value: d.femaleCount })))
        .attr('fill', 'none')
        .attr('stroke', femaleLineColor)
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add male points with hover interaction
    g.selectAll('.male-point')
        .data(timeSeriesData)
        .enter()
        .append('circle')
        .attr('class', 'male-point')
        .attr('cx', d => xScale(d.month))
        .attr('cy', d => yScale(d.maleCount))
        .attr('r', 4)
        .attr('fill', maleLineColor)
        .on('mouseover', (event, d) => {
            tooltip.style('display', 'block')
                .html(`
                    <strong>Gender:</strong> Male<br>
                    <strong>Month:</strong> ${d.month}<br>
                    <strong>Year:</strong> ${selectedYear === 'all' ? 'All Years' : selectedYear}<br>
                    <strong>Value:</strong> ${d.maleCount}
                `);
        })
        .on('mousemove', (event) => {
            tooltip.style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => {
            tooltip.style('display', 'none');
        });

    // Add female points with hover interaction
    g.selectAll('.female-point')
        .data(timeSeriesData)
        .enter()
        .append('circle')
        .attr('class', 'female-point')
        .attr('cx', d => xScale(d.month))
        .attr('cy', d => yScale(d.femaleCount))
        .attr('r', 4)
        .attr('fill', femaleLineColor)
        .on('mouseover', (event, d) => {
            tooltip.style('display', 'block')
                .html(`
                    <strong>Gender:</strong> Female<br>
                    <strong>Month:</strong> ${d.month}<br>
                    <strong>Year:</strong> ${selectedYear === 'all' ? 'All Years' : selectedYear}<br>
                    <strong>Value:</strong> ${d.femaleCount}
                `);
        })
        .on('mousemove', (event) => {
            tooltip.style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => {
            tooltip.style('display', 'none');
        });

    // Add legend
    const legend = svg.append('g').attr('transform', `translate(${width + margin.left - 150}, 20)`);

    legend.append('circle').attr('cx', 0).attr('cy', 10).attr('r', 5).style('fill', maleLineColor);
    legend.append('text').attr('x', 10).attr('y', 15).text('Men').style('font-size', '12px');

    legend.append('circle').attr('cx', 0).attr('cy', 30).attr('r', 5).style('fill', femaleLineColor);
    legend.append('text').attr('x', 10).attr('y', 35).text('Women').style('font-size', '12px');

    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text(selectedYear === 'all' ? 'All Years' : `Year: ${selectedYear}`)
        .style('font-size', '14px')
        .style('font-weight', 'bold');
}

function addYearFilter(containerId, years, onChange) {
    const container = d3.select(containerId);
    container.html(''); // Clear previous content

    const select = container.append('select').attr('id', 'year-filter');
    select.append('option').attr('value', 'all').text('All Years');

    years.forEach(year => {
        select.append('option').attr('value', year).text(year);
    });

    select.on('change', function () {
        const selectedYear = d3.select(this).node().value;
        onChange(selectedYear);
    });
}

// Add year filter and initialize chart
Promise.all([d3.csv(datasetURL)]).then(([csvData]) => {
    const years = Array.from(new Set(csvData.map(d => d['Year']))).sort();
    const timeSeriesData = processTimeSeriesData(csvData);

    addYearFilter('#time-series-controls', years, selectedYear => {
        const filteredData = processTimeSeriesData(csvData, selectedYear);
        drawTimeSeries('#time-series-chart', filteredData, selectedYear);
    });

    drawTimeSeries('#time-series-chart', timeSeriesData, 'all');
});

function drawBubbleMap(svgId, stateData, salesData) {
    const svgWidth = 400; // Width of the SVG container
    const svgHeight = 250; // Height of the SVG container

    const svg = d3.select(svgId)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.selectAll('*').remove(); // Clear the SVG before redrawing

    const projection = d3.geoAlbersUsa()
        .scale(550) // Maintain consistent scaling
        .translate([svgWidth / 2, svgHeight / 2]); // Center the map

    const path = d3.geoPath().projection(projection);

    // Draw the base map
    svg.selectAll('path')
        .data(stateData)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', '#f0f0f0') // Default background color
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5);

    // Get profits and calculate averages
    const profits = salesData.stateProfits;
    const statesWithProfits = Object.keys(profits).length;
    const totalProfit = Object.values(profits).reduce((sum, value) => sum + value, 0);
    const avgProfit = statesWithProfits > 0 ? totalProfit / statesWithProfits : 0;

    // Calculate minimum and maximum profit per state
    const minProfit = d3.min(Object.values(profits)) || 0;
    const maxProfit = d3.max(Object.values(profits)) || 1;

    console.log('Min Profit:', minProfit, 'Max Profit:', maxProfit, 'Avg Profit:', avgProfit);

    // Updated profit ranges
    const profitRanges = [
        { range: [-Infinity, -500], color: 'red' },         // Large loss
        { range: [-500, 0], color: 'lightcoral' },         // Small loss
        { range: [0, 150000], color: 'lightgreen' },       // Small profit
        { range: [150000, Infinity], color: 'green' }      // Large profit
    ];

    // Define size scale for bubbles (based on average profit)
    const radiusScale = d3.scaleSqrt()
        .domain([Math.abs(minProfit), Math.abs(avgProfit)])
        .range([5, 10]); // Adjust size range as needed

    // Add bubbles
    svg.selectAll('circle')
        .data(stateData.filter(d => profits[d.properties.name.toLowerCase()] !== undefined))
        .enter()
        .append('circle')
        .attr('cx', d => projection(d3.geoCentroid(d))[0]) // Bubble position (center of state)
        .attr('cy', d => projection(d3.geoCentroid(d))[1])
        .attr('r', d => {
            const profit = profits[d.properties.name.toLowerCase()] || 0;
            return radiusScale(Math.abs(profit));
        })
        .attr('fill', d => {
            const profit = profits[d.properties.name.toLowerCase()] || 0;
            const range = profitRanges.find(r => profit >= r.range[0] && profit < r.range[1]);
            return range ? range.color : 'grey'; // Default to grey for undefined ranges
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5);

    // Add legend
    addBubbleLegend(svgId.replace('#', '') + '-legend', profitRanges, radiusScale);
}

function addBubbleLegend(legendId, profitRanges, radiusScale) {
    //print the radius scale
    console.log(radiusScale.domain());
    const legendContainer = d3.select(`#${legendId}`);
    legendContainer.html(''); // Clear previous content

    // Add color legend
    profitRanges.forEach(({ range, color }) => {
        legendContainer.append('div')
            .attr('class', 'legend-item')
            .html(`
                <div class="legend-color" style="background-color: ${color}"></div>
                <div class="legend-label">${range[0] === -Infinity ? `< $${formatThreshold(Math.abs(range[1]))}` :
                    range[1] === Infinity ? `≥ $${formatThreshold(range[0])}` :
                    `$${formatThreshold(range[0])} - $${formatThreshold(range[1])}`}</div>
            `);
    });


    // Add title for the bubble legend
    legendContainer.append('div')
        .attr('class', 'legend-title')
        .html('<strong>Avg Profit/Size</strong>');

    // Add size legend using the same scale as the map
    const sizes = [
        radiusScale.domain()[0],              // Minimum value in the domain
        (radiusScale.domain()[0] + radiusScale.domain()[1]) / 2, // Midpoint value
        radiusScale.domain()[1]              // Maximum value in the domain
    ];
    const offset = 25; // Offset for the circle within the SVG

    sizes.forEach(size => {
        const radius = radiusScale(size); // Calculate the radius for the legend bubble
        legendContainer.append('div')
            .attr('class', 'legend-item legend-bubble')
            .html(`
                <svg width="${radius * 2 + offset}" height="${radius * 2 + 6}" style="display: inline-block; vertical-align: middle;">
                    <circle cx="${radius + offset / 2}" cy="${radius + 5}" r="${radius}" fill="grey" stroke="black"></circle>
                </svg>
                <span style="margin-left: 10px; vertical-align: middle;">$${size.toFixed(0)}</span>
            `);
    });
}


