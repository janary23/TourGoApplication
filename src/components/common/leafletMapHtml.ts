// ─────────────────────────────────────────────────────────────────────────────
// LEAFLET + OPENSTREETMAP MAP PAGE
// A self-contained HTML page loaded once into a WebView, then driven purely
// via injected JS calls (window.TourGoMap.*) from the React Native side —
// no page reloads for marker/route/center updates, which is what keeps this
// smooth. 100% free, keyless: OpenStreetMap's own tile server for the
// default layer, Esri's public ArcGIS Online basemaps (also free, keyless)
// for the dark/satellite alternatives, since OSM itself doesn't publish
// those styles.
//
// No native module involved anywhere in this — react-native-webview is one
// of the modules Expo Go itself ships with, so this runs without a custom
// dev client or any native rebuild.
//
// Person pins (setMarkers with a `label`/`photoUrl` field) use a Life360-
// style look: circular photo (or initials fallback), a soft pulsing "live"
// ring, and a name pill underneath — rather than a plain colored dot.
// ─────────────────────────────────────────────────────────────────────────────

const BRAND = '#028BEB';

export function buildLeafletMapHtml(initialLat: number, initialLng: number, initialZoom: number, isDark: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: ${isDark ? '#0B0F19' : '#E2E8F0'}; }
    .leaflet-control-attribution { font-size: 9px !important; }

    .tg-pin { display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.35); font-size: 13px; }
    .tg-pin-selected { border-color: #FACC15 !important; transform: scale(1.15); }
    .tg-stop-pin { display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.35); font-weight: 800; font-size: 13px; color: #fff; }

    /* Life360-style person pin: photo/initials circle + pulsing live ring + name pill */
    .tg-person-wrap { display: flex; flex-direction: column; align-items: center; width: 76px; }
    .tg-person-pin-box { position: relative; width: 38px; height: 38px; }
    .tg-person-pulse { position: absolute; top: 0; left: 0; width: 38px; height: 38px; border-radius: 50%; border: 2px solid; pointer-events: none; animation: tg-pulse-anim 2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite; }
    @keyframes tg-pulse-anim { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.9); opacity: 0; } }
    .tg-person-pin { width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; background-size: cover; background-position: center; }
    .tg-person-pin img { width: 100%; height: 100%; object-fit: cover; }
    .tg-person-pin-selected { border-color: #FACC15; box-shadow: 0 0 0 3px rgba(250,204,21,0.35), 0 3px 8px rgba(0,0,0,0.4); }
    .tg-name-pill { margin-top: 3px; background: rgba(15,23,42,0.85); color: #fff; font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 8px; white-space: nowrap; max-width: 76px; overflow: hidden; text-overflow: ellipsis; }
    .tg-name-pill-selected { background: ${BRAND}; }
    .tg-outside-badge { position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%; background: #EF4444; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }

    /* "You are here" dot, same pulsing language as person pins */
    .tg-user-box { position: relative; width: 18px; height: 18px; }
    .tg-user-pulse { position: absolute; top: -7px; left: -7px; width: 32px; height: 32px; border-radius: 50%; background: rgba(37,99,235,0.35); pointer-events: none; animation: tg-user-pulse-anim 2.2s ease-out infinite; }
    @keyframes tg-user-pulse-anim { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
    .tg-user-dot { width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }

    /* Safe-zone center marker */
    .tg-zone-center { width: 26px; height: 26px; border-radius: 50%; background: ${BRAND}; border: 2.5px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; }

    /* Keyless Dark Mode styling on OpenStreetMap tiles */
    .tg-dark-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var map = L.map('map', { zoomControl: false, attributionControl: true })
        .setView([${initialLat}, ${initialLng}], ${initialZoom});

      var LAYERS = {
        street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        dark: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          className: 'tg-dark-tiles',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        })
      };
      var currentLayer = LAYERS.${isDark ? 'dark' : 'street'};
      currentLayer.addTo(map);

      function post(payload) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      map.on('click', function () { post({ type: 'mapPress' }); });

      var markerLayer = L.layerGroup().addTo(map);
      var routeLine = null;
      var geofenceCircle = null;
      var geofenceCenterMarker = null;
      var userDot = null;

      function divIcon(html, width, height, anchorX, anchorY) {
        return L.divIcon({ html: html, className: '', iconSize: [width, height], iconAnchor: [anchorX, anchorY] });
      }

      function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function personPinHtml(m) {
        var ring = m.color || '#64748B';
        var inner = m.photoUrl
          ? '<img src="' + esc(m.photoUrl) + '" onerror="this.style.display=\\'none\\';" />'
          : '<span style="font-size:12px;font-weight:800;color:#fff;letter-spacing:-0.2px;">' + esc(m.label || '') + '</span>';
        var pulse = m.live ? '<div class="tg-person-pulse" style="border-color:' + ring + ';"></div>' : '';
        var badge = m.outside ? '<div class="tg-outside-badge">!</div>' : '';
        var pill = m.nameLabel
          ? '<div class="tg-name-pill' + (m.selected ? ' tg-name-pill-selected' : '') + '">' + esc(m.nameLabel) + '</div>'
          : '';
        return (
          '<div class="tg-person-wrap">' +
            '<div class="tg-person-pin-box">' +
              pulse +
              '<div class="tg-person-pin' + (m.selected ? ' tg-person-pin-selected' : '') + '" style="background:' + ring + ';">' + inner + '</div>' +
              badge +
            '</div>' +
            pill +
          '</div>'
        );
      }

      window.TourGoMap = {
        setTileLayer: function (name) {
          var next = LAYERS[name] || LAYERS.street;
          if (next === currentLayer) return;
          map.removeLayer(currentLayer);
          currentLayer = next;
          currentLayer.addTo(map);
        },

        setMarkers: function (json) {
          var markers = JSON.parse(json);
          markerLayer.clearLayers();
          markers.forEach(function (m) {
            if (m.label != null || m.photoUrl) {
              // Person pin — photo/initials + pulse + name pill.
              var html = personPinHtml(m);
              var marker = L.marker([m.lat, m.lng], {
                icon: divIcon(html, 76, 60, 38, 19),
                zIndexOffset: m.selected ? 900 : 400
              }).addTo(markerLayer);
              marker.on('click', function () { post({ type: 'markerPress', id: m.id }); });
              return;
            }
            // Generic pin (emergency spots, POIs) — colored circle + a real
            // SVG icon (no emoji: they render inconsistently across
            // platforms/OS versions, which looked unpolished on safety pins).
            var bg = m.color || (m.isEmergency ? '#EF4444' : '#FFFFFF');
            var content = m.iconSvg || '';
            var size = 30;
            var html2 = '<div class="tg-pin' + (m.selected ? ' tg-pin-selected' : '') + '" style="width:' + size + 'px;height:' + size + 'px;background:' + bg + ';">' + content + '</div>';
            var marker2 = L.marker([m.lat, m.lng], { icon: divIcon(html2, size, size, size / 2, size / 2) }).addTo(markerLayer);
            marker2.on('click', function () { post({ type: 'markerPress', id: m.id }); });
          });
        },

        setRoute: function (json) {
          var stops = JSON.parse(json);
          if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
          var latlngs = stops.filter(function (s) { return s.lat != null && s.lng != null; }).map(function (s) { return [s.lat, s.lng]; });
          if (latlngs.length > 1) {
            routeLine = L.polyline(latlngs, { color: '${BRAND}', weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(map);
          }
          stops.forEach(function (s) {
            if (s.lat == null || s.lng == null) return;
            var size = 32;
            var html = '<div class="tg-stop-pin' + (s.selected ? ' tg-pin-selected' : '') + '" style="width:' + size + 'px;height:' + size + 'px;background:${BRAND};">' + s.stopNumber + '</div>';
            var marker = L.marker([s.lat, s.lng], { icon: divIcon(html, size, size, size / 2, size / 2), zIndexOffset: 500 }).addTo(markerLayer);
            marker.on('click', function () { post({ type: 'markerPress', id: 'stop-' + s.stopNumber }); });
          });
        },

        setGeofence: function (lat, lng, radiusMeters) {
          if (geofenceCircle) { map.removeLayer(geofenceCircle); geofenceCircle = null; }
          if (geofenceCenterMarker) { map.removeLayer(geofenceCenterMarker); geofenceCenterMarker = null; }
          if (lat == null || lng == null || !radiusMeters) return;
          geofenceCircle = L.circle([lat, lng], {
            radius: radiusMeters,
            color: '${BRAND}',
            weight: 2.5,
            opacity: 0.9,
            fillColor: '${BRAND}',
            fillOpacity: 0.14
          }).addTo(map);
          geofenceCenterMarker = L.marker([lat, lng], {
            icon: divIcon('<div class="tg-zone-center">\\uD83D\\uDEA9</div>', 26, 26, 13, 13),
            zIndexOffset: 100,
            interactive: false
          }).addTo(map);
        },

        setUserLocation: function (lat, lng) {
          if (userDot) { map.removeLayer(userDot); userDot = null; }
          if (lat == null || lng == null) return;
          userDot = L.marker([lat, lng], {
            icon: divIcon('<div class="tg-user-box"><div class="tg-user-pulse"></div><div class="tg-user-dot"></div></div>', 18, 18, 9, 9),
            zIndexOffset: 1000,
            interactive: false
          }).addTo(map);
        },

        flyTo: function (lat, lng, zoom) {
          map.flyTo([lat, lng], zoom != null ? zoom : map.getZoom(), { duration: 0.6 });
        },

        fitGeofence: function (lat, lng, radiusMeters) {
          if (lat == null || lng == null || !radiusMeters) return;
          var circle = L.circle([lat, lng], { radius: radiusMeters });
          map.fitBounds(circle.getBounds().pad(0.15), { animate: true });
        },

        fitBounds: function (minLat, minLng, maxLat, maxLng) {
          map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [30, 30], animate: true });
        },

        setZoom: function (zoom) {
          map.setZoom(zoom);
        },

        zoomBy: function (delta) {
          map.setZoom(map.getZoom() + delta);
        }
      };

      post({ type: 'ready' });
    })();
  </script>
</body>
</html>`;
}
