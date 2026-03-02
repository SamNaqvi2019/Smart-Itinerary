import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface SpotLocation {
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
}

interface ItineraryMapViewProps {
  spots: SpotLocation[];
  dayLabel?: string;
  height?: number;
}

const ItineraryMapView: React.FC<ItineraryMapViewProps> = ({
  spots,
  dayLabel,
  height = 300,
}) => {
  const mapHtml = useMemo(() => {
    if (!spots || spots.length === 0) return null;

    // Center on first spot
    const centerLat = spots[0].latitude;
    const centerLon = spots[0].longitude;

    // Build markers JS array
    const markersJson = JSON.stringify(
      spots.map((s, i) => ({
        lat: s.latitude,
        lon: s.longitude,
        name: s.name,
        city: s.city || '',
        index: i + 1,
      }))
    );

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
    .custom-marker {
      background: #01411C;
      color: #fff;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .popup-inner { padding: 2px 0; }
    .popup-name { font-weight: 700; color: #01411C; font-size: 14px; }
    .popup-city { color: #666; font-size: 12px; margin-top: 2px; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLon}], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  var markers = ${markersJson};
  var bounds = [];

  markers.forEach(function(m) {
    var icon = L.divIcon({
      className: '',
      html: '<div class="custom-marker">' + m.index + '</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });

    var marker = L.marker([m.lat, m.lon], { icon: icon }).addTo(map);
    marker.bindPopup(
      '<div class="popup-inner"><div class="popup-name">' + m.name + '</div>' +
      (m.city ? '<div class="popup-city">' + m.city + '</div>' : '') + '</div>'
    );
    bounds.push([m.lat, m.lon]);
  });

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  // Draw a dashed polyline connecting the spots in order
  if (bounds.length > 1) {
    L.polyline(bounds, {
      color: '#D4AF37',
      weight: 2,
      opacity: 0.8,
      dashArray: '6 4',
    }).addTo(map);
  }
</script>
</body>
</html>`;
  }, [spots]);

  if (!spots || spots.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>No map data available</Text>
      </View>
    );
  }

  if (!mapHtml) return null;

  return (
    <View style={[styles.container, { height }]}>
      {dayLabel && (
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{dayLabel}</Text>
        </View>
      )}
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={['*']}
        // Needed for Leaflet CDN tiles on some Android versions
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: '#01411C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  placeholder: {
    backgroundColor: '#eee',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 13,
  },
});

export default ItineraryMapView;
