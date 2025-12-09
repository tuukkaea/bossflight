
export function initializeCustomMap(elementId) {
    const map = L.map(elementId, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}

export function createPurpleMarker() {
    const purpleIcon = L.divIcon({
        className: 'custom-purple-marker',
        html: `
            <div class="marker-dot">
                <div class="dot-glow"></div>
                <div class="dot-center"></div>
            </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
    });

    return purpleIcon;
}

export function addPurpleBorderOverlay(map) {
    const overlayPane = map.createPane('purpleOverlay');
    overlayPane.style.zIndex = 400;
    overlayPane.style.pointerEvents = 'none';
    overlayPane.style.mixBlendMode = 'screen';
    overlayPane.style.opacity = '0.15';
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'purpleOverlay',
        subdomains: 'abcd'
    }).addTo(map);
}
