// Process data for the time series
let processTimeSeriesData = (data, genderFilter = null, ageFilter = null) => {
    // Apply filters
    if (genderFilter && genderFilter !== 'all') {
        data = data.filter((d) => d['Customer Gender'] === genderFilter);
    }
    if (ageFilter && ageFilter !== 'all') {
        data = data.filter((d) => {
            let age = parseFloat(d['Customer Age']);
            if (ageFilter === '18-25') return age >= 18 && age <= 25;
            if (ageFilter === '26-35') return age >= 26 && age <= 35;
            if (ageFilter === '36-50') return age >= 36 && age <= 50;
            if (ageFilter === '51+') return age > 50;
        });
    }

    // Aggregate data by month
    let monthlyCounts = d3.rollup(
        data,
        (v) => v.length,
        (d) => d['Month'] // Assuming Month is already in the dataset
    );

    // Convert to an array and sort by month
    return Array.from(monthlyCounts, ([month, count]) => ({ month, count }))
        .sort((a, b) => new Date(`1 ${a.month} 2000`) - new Date(`1 ${b.month} 2000`));
};

// Draw the time series chart
let drawTimeSeries = (data) => {
    // Set up margins and dimensions
    let margin = { top: 20, right: 30, bottom: 30, left: 50 };
    let width = 960 - margin.left - margin.right;
    let height = 300 - margin.top - margin.bottom;

    // Clear the existing chart
    d3.select('#time-series-chart').selectAll('*').remove();

    // Create an SVG group
    let svg = d3.select('#time-series-chart')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    let x = d3.scaleBand()
        .domain(data.map((d) => d.month))
        .range([0, width])
        .padding(0.1);

    let y = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.count)])
        .nice()
        .range([height, 0]);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
    svg.append('g').call(d3.axisLeft(y));

    // Add the line
    let line = d3.line()
        .x((d) => x(d.month) + x.bandwidth() / 2)
        .y((d) => y(d.count))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#69b3a2')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add points
    svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d) => x(d.month) + x.bandwidth() / 2)
        .attr('cy', (d) => y(d.count))
        .attr('r', 4)
        .attr('fill', '#69b3a2');
};
