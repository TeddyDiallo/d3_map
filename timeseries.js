function processTimeSeriesData(data, genderFilter = null, ageFilter = null) {
    if (genderFilter && genderFilter !== 'all') {
        data = data.filter(d => d['Customer Gender'] === genderFilter);
    }
    if (ageFilter && ageFilter !== 'all') {
        data = data.filter(d => {
            let age = parseFloat(d['Customer Age']);
            if (ageFilter === '18-25') return age >= 18 && age <= 25;
            if (ageFilter === '26-35') return age >= 26 && age <= 35;
            if (ageFilter === '36-50') return age >= 36 && age <= 50;
            if (ageFilter === '51+') return age > 50;
        });
    }

    let monthlyCounts = d3.rollup(
        data,
        v => v.length,
        d => d['Month']
    );

    return Array
