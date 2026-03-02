/**
 * Web-specific fare map (A→B route) using iframe + srcDoc + Leaflet.
 * Guaranteed to work in Expo web — no WebView, no CDN injection into parent page.
 */
import React, { useMemo } from 'react';

interface Coords { lat: number; lon: number; }

interface Props {
  originCity:        string;
  destinationCity:   string;
  originCoords:      Coords;
  destinationCoords: Coords;
  distanceKm:        number;
  durationMinutes:   number;
  height?:           number;
}

const FareMapView: React.FC<Props> = ({
  originCity, destinationCity,
  originCoords, destinationCoords,
  distanceKm, durationMinutes,
  height = 300,
}) => {
  const durationText =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`;

  const html = useMemo(() => {
    const centerLat = (originCoords.lat + destinationCoords.lat) / 2;
    const centerLon = (originCoords.lon + destinationCoords.lon) / 2;
    const oSafe     = originCity.replace(/'/g, "\\'");
    const dSafe     = destinationCity.replace(/'/g, "\\'");

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif}
#map{width:100%;height:100vh}
.badge{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);
  background:#01411C;color:#fff;padding:6px 18px;border-radius:999px;
  font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);
  z-index:9999;white-space:nowrap;pointer-events:none}
.eta{position:fixed;top:10px;right:10px;
  background:#D4AF37;color:#fff;padding:4px 13px;border-radius:999px;
  font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.25);
  z-index:9999;pointer-events:none}
</style>
</head><body>
<div id="map"></div>
<div class="badge">${distanceKm.toFixed(1)} km</div>
<div class="eta">~${durationText}</div>
<script>
var map=L.map('map',{zoomControl:false}).setView([${centerLat},${centerLon}],7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {attribution:'© OpenStreetMap',maxZoom:18}).addTo(map);

var iconA=L.divIcon({className:'',
  html:'<div style="background:#01411C;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">A</div>',
  iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-19]});

var iconB=L.divIcon({className:'',
  html:'<div style="background:#D4AF37;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">B</div>',
  iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-19]});

L.marker([${originCoords.lat},${originCoords.lon}],{icon:iconA}).addTo(map)
 .bindPopup('<b style="color:#01411C">${oSafe}</b><br><small style="color:#666">Origin</small>');
L.marker([${destinationCoords.lat},${destinationCoords.lon}],{icon:iconB}).addTo(map)
 .bindPopup('<b style="color:#D4AF37">${dSafe}</b><br><small style="color:#666">Destination</small>');

L.polyline([[${originCoords.lat},${originCoords.lon}],[${destinationCoords.lat},${destinationCoords.lon}]],
  {color:'#01411C',weight:3,opacity:0.85}).addTo(map);

map.fitBounds([[${originCoords.lat},${originCoords.lon}],[${destinationCoords.lat},${destinationCoords.lon}]],
  {padding:[45,45]});
</script></body></html>`;
  }, [originCoords, destinationCoords, originCity, destinationCity, distanceKm, durationMinutes]);

  return (
    <div style={{ position: 'relative', height, borderRadius: 16, overflow: 'hidden' }}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Route Map"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default FareMapView;
