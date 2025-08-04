const shipIcon = L.icon({
    iconUrl: './images/Segelschiff3.png',
    iconSize: [50, 50], // Größe des Icons
    iconAnchor: [25, 25], // Punkt in der Mitte des Icons
    popupAnchor: [0, -20] // Position des Popups über dem Icon
});

let map, userMarker, anchorMarker, mobMarker, anchorCircle;
const waypointList = document.getElementById("waypointList");
const speedKmh = document.getElementById("speedKmh");
const speedKnots = document.getElementById("speedKnots");
const headingDisplay = document.getElementById("heading");
const coordLink = document.getElementById("coordLink");
const mobCoords = document.getElementById("mobCoords");
const anchorCoords = document.getElementById("anchorCoords");
const anchorStatus = document.getElementById("anchorStatus");
const trackCoordinates = [];
let anchorLat = null;
let anchorLon = null;
const anchorRadius = 30;
let currentLat = null;
let currentLon = null;
let waypointInterval = null;
let trackMarkers = [];

function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
    }).addTo(map);

    
    // Add OpenSeaMap layer
    L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenSeaMap contributors',
        transparent: true
    }).addTo(map);

    userMarker = L.marker([lat, lon], { icon: shipIcon }).addTo(map).bindPopup("⛵ Du bist hier").openPopup();
}

function updateUserPosition(lat, lon) {
    if (!map) initMap(lat, lon);
    userMarker.setLatLng([lat, lon]);
    map.setView([lat, lon]);

    updateLink(coordLink, lat, lon);
}

function toKnots(kmh) {
    return kmh * 0.539957;
}

function updateAnchorStatus(lat, lon) {
if (anchorLat === null || anchorLon === null) {
    anchorStatus.textContent = "Status: Anker nicht gesetzt";
    anchorStatus.classList.remove("anchor-safe", "anchor-alert");
    return;
}

        const distance = map.distance([lat, lon], [anchorLat, anchorLon]);
        if (distance > anchorRadius) {
            anchorStatus.textContent = "Status: Ankeralarm!";
            anchorStatus.classList.remove("anchor-safe");
            anchorStatus.classList.add("anchor-alert");
        } else {
            anchorStatus.textContent = "Status: Anker sitzt";
            anchorStatus.classList.remove("anchor-alert");
            anchorStatus.classList.add("anchor-safe");
        }
}

function addWaypoint(lat, lon, type) {
    const timestamp = new Date().toLocaleString("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const waypointNumber = waypointList.children.length + 1;
    let emoji = '';
    if (type === 'mob') emoji = ' ❌';
    else if (type === 'anchor') emoji = ' ⚓️';

    // Neue Markerposition schon vorher definieren
    const currentLatLng = L.latLng(lat, lon);

    let distanceText = "";
    if (trackMarkers.length >= 1) {
        const prevLatLng = trackMarkers[trackMarkers.length - 1].getLatLng();
        const dist = calculateDistance(prevLatLng.lat, prevLatLng.lng, lat, lon);
        distanceText = ` <span style="float:right; color:gray;">${dist.toFixed(1)} m</span>`;
    }

    const li = document.createElement("li");
    li.innerHTML = `${waypointNumber}; ${timestamp.replace(",", ";")} — <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank">${lat.toFixed(6)}, ${lon.toFixed(6)}</a>${emoji}${distanceText}`;
    waypointList.prepend(li);

    if (trackMarkers.length > 0) {
        const lastMarker = trackMarkers[trackMarkers.length - 1];
        lastMarker.setStyle({ color: "blue", fillColor: "blue" });
    }

    let color = "blue";
    if (trackMarkers.length === 0) {
        color = "green";
    }

    const marker = L.circleMarker(currentLatLng, {
        radius: 6,
        color: color,
        fillColor: color,
        fillOpacity: 1,
    }).addTo(map);

    marker.bindPopup(`Wegpunkt ${waypointNumber}:<br>📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    trackMarkers.push(marker);

    trackCoordinates.push({ lat, lon });

    // Gesamtstrecke berechnen
let totalDistance = 0;
for (let i = 1; i < trackCoordinates.length; i++) {
    const prev = trackCoordinates[i - 1];
    const curr = trackCoordinates[i];
    totalDistance += calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
}
const totalNm = totalDistance * 0.539957;
document.getElementById("totalDistance").innerText =
    `Gesamtweg: ${totalDistance.toFixed(2)} km / ${totalNm.toFixed(2)} nm`;
}


function toRad(value) {
    return value * Math.PI / 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Erdradius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


function updateLink(element, lat, lon) {
    const formatted = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    element.textContent = `${formatted}`;
    element.href = `https://www.google.com/maps?q=${lat},${lon}`;
}

// MOB setzen
document.getElementById("mobButton").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        updateLink(mobCoords, currentLat, currentLon);

        if (mobMarker) map.removeLayer(mobMarker);

        mobMarker = L.marker([currentLat, currentLon], {
            icon: L.icon({
                iconUrl: "./images/Rettungsring2.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup(`<strong>❌ MOB:</strong><br>📍 ${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`);

        addWaypoint(currentLat, currentLon, 'mob'); // Hier MOB-Wegpunkt hinzufügen
    }
});


// Anker setzen
document.getElementById("setAnchor").addEventListener("click", () => {
    if (currentLat !== null && currentLon !== null) {
        anchorLat = currentLat;
        anchorLon = currentLon;

        updateLink(anchorCoords, anchorLat, anchorLon);

        if (anchorMarker) map.removeLayer(anchorMarker);
        if (anchorCircle) map.removeLayer(anchorCircle);

        anchorMarker = L.marker([anchorLat, anchorLon], {
            icon: L.icon({
                iconUrl: "./images/Anker.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            }),
        }).addTo(map).bindPopup(`<strong>⚓️ Anker:</strong><br>📍 ${anchorLat.toFixed(6)}, ${anchorLon.toFixed(6)}`);

        anchorCircle = L.circle([anchorLat, anchorLon], {
            radius: anchorRadius,
            color: "red",
            fillOpacity: 0.1,
        }).addTo(map);

        updateAnchorStatus(currentLat, currentLon);

        addWaypoint(anchorLat, anchorLon, 'anchor');  // Hier Anker-Wegpunkt hinzufügen
    }
});


// Position überwachen
navigator.geolocation.watchPosition(
    (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const speed = position.coords.speed ?? 0;
        const heading = position.coords.heading ?? 0;

        currentLat = lat;
        currentLon = lon;

        updateUserPosition(lat, lon);

        speedKmh.textContent = (speed * 3.6).toFixed(1);
        speedKnots.textContent = toKnots(speed * 3.6).toFixed(1);
        headingDisplay.textContent = heading.toFixed(0);

        updateAnchorStatus(lat, lon);
    },
    (error) => {
        alert("GPS-Fehler: " + error.message);
    },
    { enableHighAccuracy: true }
);


document.getElementById("startTracking").addEventListener("click", () => {
    if (!waypointInterval) {
        const intervalValue = parseInt(document.getElementById("intervalSelect").value, 10);

        if (currentLat !== null && currentLon !== null) {
            addWaypoint(currentLat, currentLon);
        }

        waypointInterval = setInterval(() => {
            if (currentLat !== null && currentLon !== null) {
                addWaypoint(currentLat, currentLon);
            }
        }, intervalValue);

        // Buttons aktualisieren
        document.getElementById("startTracking").classList.add("active-start");
        document.getElementById("stopTracking").classList.remove("active-stop");
        document.getElementById("startTracking").classList.remove("neutral");
        document.getElementById("stopTracking").classList.add("neutral");
    }
});



document.getElementById("stopTracking").addEventListener("click", () => {
    if (waypointInterval) {
        clearInterval(waypointInterval);
        waypointInterval = null;

        // Buttons aktualisieren
        document.getElementById("stopTracking").classList.add("active-stop");
        document.getElementById("startTracking").classList.remove("active-start");
        document.getElementById("startTracking").classList.add("neutral");
        document.getElementById("stopTracking").classList.remove("neutral");
    }
});



document.getElementById("generatePDF").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Wegpunkte", 10, 10);

    const listItems = document.querySelectorAll("#waypointList li");

    if (listItems.length === 0) {
        alert("Es gibt keine Wegpunkte zum Exportieren.");
        return;
    }

    let y = 20;
    listItems.forEach((li, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(`${index + 1}. ${li.innerText}`, 10, y);
        y += 10;
    });

    doc.save("wegpunkte.pdf");
});

document.getElementById("showTrack").addEventListener("click", () => {
    // Vorherige Marker entfernen
    trackMarkers.forEach(marker => map.removeLayer(marker));
    trackMarkers = [];

    const listItems = waypointList.querySelectorAll("li");
    const points = [];

    listItems.forEach((item, index) => {
        const link = item.querySelector("a");
        if (link) {
            const [latStr, lonStr] = link.textContent.split(", ");
            const lat = parseFloat(latStr);
            const lon = parseFloat(lonStr);

            const markerIcon = L.icon({
                iconUrl: "https://static.vecteezy.com/ti/gratis-vektor/p2/6114750-reisszwecke-mit-metallnadel-und-rotem-kopf-plastikkreis-reissnadel-auf-transparentem-hintergrund-buro-reisszwecke-fur-pinnwand-und-papier-an-der-wand-befestigen-isoliert-illustration-vektor.jpg",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            });

            const marker = L.marker([lat, lon], { icon: markerIcon })
                .addTo(map)
                .bindPopup(`📍 Punkt ${listItems.length - index}:<br> ${lat.toFixed(6)}, ${lon.toFixed(6)}`);

            trackMarkers.push(marker);
            points.push([lat, lon]);
        }
    });

    if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds);
    }
});
