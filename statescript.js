let stateURL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

let stateData;

let canvas = d3.select('#canvas');

let drawMap = () => {
    // Define a projection
    let projection = d3.geoAlbersUsa();
    let path = d3.geoPath().projection(projection);

    // Draw the map
    canvas.selectAll('path')
        .data(stateData)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', 'state')
        .attr('fill', '#cccccc')
        .attr('stroke', 'blue')
        .attr('stroke-width', 0.5);
};

// Fetch and process state data
d3.json(stateURL).then((data) => {
    stateData = topojson.feature(data, data.objects.states).features;
    drawMap();
}).catch((error) => {
    console.error('Error loading data:', error);
});
