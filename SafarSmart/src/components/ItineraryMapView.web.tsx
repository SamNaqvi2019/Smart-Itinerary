/**
 * Web-specific itinerary map — uses a native <iframe srcDoc> to embed Leaflet.
 * This is the most reliable approach for Expo web: no WebView, no script injection,
 * just a standard browser iframe that loads Leaflet from CDN in its own context.
 */
import React, { useMemo } from 'react';

interface SpotLocation {
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
}

interface Props {
  spots: SpotLocation[];
  dayLabel?: string;
  height?: number;
}

const ItineraryMapView: React.FC<Props> = ({ spots, dayLabel, height = 300 }) => {
  const html = useMemo(() => {
    if (!spots || spots.length === 0) return '';

    const centerLat = spots.reduce((s, p) => s + p.latitude,  0) / spots.length;
    const centerLon = spots.reduce((s, p) => s + p.longitude, 0) / spots.length;
    const markersJs = spots
      .map(
        (s, i) => `
          L.marker([${s.latitude},${s.longitude}], {icon: makeIcon(${i + 1})})
           .addTo(map)
           .bindPopup('<b style="color:#01411C">${s.name.replace(/'/g, "\\'")}</b>'
             + '${s.city ? `<br><small>${s.city.replace(/'/g, "\\'")}</small>` : ""}');
        `
      )
      .join('\n');

    const boundsJs =
      spots.length > 1
        ? `map.fitBounds([${spots.map((s) => `[${s.latitude},${s.longitude}]`).join(',')}],{padding:[30,30]});`
        : '';

    const lineJs =
      spots.length > 1
        ? `L.polyline([${spots.map((s) => `[${s.latitude},${s.longitude}]`).join(',')}],
            {color:'#D4AF37',weight:2.5,opacity:0.85,dashArray:'8 4'}).addTo(map);`
        : '';

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif}
#map{width:100%;height:100vh}
</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true}).setView([${centerLat},${centerLon}],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {attribution:'© OpenStreetMap',maxZoom:18}).addTo(map);

function makeIcon(n){
  return L.divIcon({className:'',
    html:'<div style="background:#01411C;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)">'+n+'</div>',
    iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-17]});
}

${markersJs}
${boundsJs}
${lineJs}
</script></body></html>`;
  }, [spots]);

  if (!spots || spots.length === 0) {
    return (
      <div style={{ height, borderRadius: 14, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#999', fontSize: 13 }}>No map data</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden' }}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Itinerary Map"
        sandbox="allow-scripts allow-same-origin"
      />
      {dayLabel && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: '#01411C', color: '#fff',
          padding: '4px 14px', borderRadius: 20,
          fontSize: 12, fontWeight: 700, pointerEvents: 'none',
          boxShadow: '0 1px 4px rgba(0,0,0,.3)',
        }}>
          {dayLabel}
        </div>
      )}
    </div>
  );
};

export default ItineraryMapView;
