import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface Coords {
  lat: number;
  lon: number;
}

interface FareMapViewProps {
  originCity: string;
  destinationCity: string;
  originCoords: Coords;
  destinationCoords: Coords;
  distanceKm: number;
  durationMinutes: number;
  height?: number;
}

const FareMapView: React.FC<FareMapViewProps> = ({
  originCity,
  destinationCity,
  originCoords,
  destinationCoords,
  distanceKm,
  durationMinutes,
  height = 300,
}) => {
  const mapHtml = useMemo(() => {
    const centerLat = (originCoords.lat + destinationCoords.lat) / 2;
    const centerLon = (originCoords.lon + destinationCoords.lon) / 2;

    const durationText =
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        : `${durationMinutes} min`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; }
    #map { width: 100%; height: 100vh; }
    .marker-a {
      background: #01411C;
      color: #fff;
      border-radius: 50%;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .marker-b {
      background: #D4AF37;
      color: #fff;
      border-radius: 50%;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .popup-name { font-weight: 700; color: #01411C; font-size: 14px; }
    .popup-role { color: #666; font-size: 11px; margin-top: 2px; }
    .dist-badge {
      position: fixed;
      bottom: 12px; left: 50%;
      transform: translateX(-50%);
      background: #01411C;
      color: #fff;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px; font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 9999;
      white-space: nowrap;
    }
    .eta-badge {
      position: fixed;
      top: 10px; right: 10px;
      background: #D4AF37;
      color: #fff;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px; font-weight: 700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      z-index: 9999;
    }
  </style>
</head>
<body>
<div id="map"></div>
<div class="dist-badge">📍 ${distanceKm.toFixed(1)} km</div>
<div class="eta-badge">⏱ ~${durationText}</div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLon}], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  var iconA = L.divIcon({
    className: '',
    html: '<div class="marker-a">A</div>',
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
  });
  var iconB = L.divIcon({
    className: '',
    html: '<div class="marker-b">B</div>',
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
  });

  L.marker([${originCoords.lat}, ${originCoords.lon}], { icon: iconA })
    .addTo(map)
    .bindPopup('<div class="popup-name">${originCity}</div><div class="popup-role">Origin</div>');

  L.marker([${destinationCoords.lat}, ${destinationCoords.lon}], { icon: iconB })
    .addTo(map)
    .bindPopup('<div class="popup-name">${destinationCity}</div><div class="popup-role">Destination</div>');

  L.polyline(
    [[${originCoords.lat}, ${originCoords.lon}], [${destinationCoords.lat}, ${destinationCoords.lon}]],
    { color: '#01411C', weight: 3, opacity: 0.85 }
  ).addTo(map);

  map.fitBounds([
    [${originCoords.lat}, ${originCoords.lon}],
    [${destinationCoords.lat}, ${destinationCoords.lon}]
  ], { padding: [40, 40] });
</script>
</body>
</html>`;
  }, [originCoords, destinationCoords, originCity, destinationCity, distanceKm, durationMinutes]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default FareMapView;
