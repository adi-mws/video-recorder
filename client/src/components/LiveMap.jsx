import { useEffect, useRef } from 'react';
import { Box, Button } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function createRiderIcon() {
  return L.divIcon({
    className: 'live-rider-marker',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(25, 118, 210, 0.25);
        "></span>
        <span style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1976d2;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function LiveMap({
  latest,
  history,
  autoFollow,
  onAutoFollowChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const polylineRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTargetRef = useRef(null);
  const autoFollowRef = useRef(autoFollow);

  useEffect(() => {
    autoFollowRef.current = autoFollow;
  }, [autoFollow]);

  // Initialize Leaflet map once; never tear down on coordinate updates.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const initialLat = latest?.latitude ?? 0;
    const initialLng = latest?.longitude ?? 0;

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const polyline = L.polyline([], {
      color: '#1976d2',
      weight: 4,
      opacity: 0.75,
    }).addTo(map);

    const accuracyCircle = L.circle([initialLat, initialLng], {
      radius: latest?.accuracy || 15,
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      icon: createRiderIcon(),
    }).addTo(map);

    map.on('dragstart', () => {
      if (autoFollowRef.current) {
        onAutoFollowChange(false);
      }
    });

    mapRef.current = map;
    markerRef.current = marker;
    accuracyCircleRef.current = accuracyCircle;
    polylineRef.current = polyline;
    lastTargetRef.current = [initialLat, initialLng];

    // Ensure proper tile sizing after layout settles.
    const resizeTimer = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(resizeTimer);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      accuracyCircleRef.current = null;
      polylineRef.current = null;
      lastTargetRef.current = null;
    };
    // Intentionally initialize once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly animate marker, trail, and pan without resetting user's zoom.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const accuracyCircle = accuracyCircleRef.current;
    const polyline = polylineRef.current;

    if (!map || !marker || !latest) return;

    const targetLat = latest.latitude;
    const targetLng = latest.longitude;

    const trailPoints = [...history]
      .reverse()
      .map((pt) => [pt.latitude, pt.longitude]);
    polyline?.setLatLngs(trailPoints);

    if (accuracyCircle) {
      accuracyCircle.setLatLng([targetLat, targetLng]);
      if (typeof latest.accuracy === 'number') {
        accuracyCircle.setRadius(Math.max(latest.accuracy, 5));
      }
    }

    const startPos = marker.getLatLng();
    const fromLat = startPos?.lat ?? targetLat;
    const fromLng = startPos?.lng ?? targetLng;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const durationMs = 650;
    const startTime = performance.now();

    const step = (now) => {
      const t = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const lat = fromLat + (targetLat - fromLat) * eased;
      const lng = fromLng + (targetLng - fromLng) * eased;
      marker.setLatLng([lat, lng]);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
    lastTargetRef.current = [targetLat, targetLng];

    if (autoFollowRef.current) {
      map.panTo([targetLat, targetLng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [latest, history]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !latest) return;
    onAutoFollowChange(true);
    map.panTo([latest.latitude, latest.longitude], {
      animate: true,
      duration: 0.5,
    });
  };

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        height: { xs: 380, sm: 460, md: 540 },
        width: '100%',
        bgcolor: 'grey.100',
      }}
    >
      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />

      {!autoFollow && latest && (
        <Button
          variant="contained"
          size="small"
          startIcon={<MyLocationIcon />}
          onClick={handleRecenter}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          Recenter
        </Button>
      )}
    </Box>
  );
}

