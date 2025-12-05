export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
}

export function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; 
    
    return bearing;
}

export function getCompassDirection(bearing) {
    const directions = [
        { name: 'N', min: 0, max: 22.5 },
        { name: 'NE', min: 22.5, max: 67.5 },
        { name: 'E', min: 67.5, max: 112.5 },
        { name: 'SE', min: 112.5, max: 157.5 },
        { name: 'S', min: 157.5, max: 202.5 },
        { name: 'SW', min: 202.5, max: 247.5 },
        { name: 'W', min: 247.5, max: 292.5 },
        { name: 'NW', min: 292.5, max: 337.5 },
        { name: 'N', min: 337.5, max: 360 }
    ];
    
    for (let dir of directions) {
        if (bearing >= dir.min && bearing < dir.max) {
            return dir.name;
        }
    }
    return 'N';
}
