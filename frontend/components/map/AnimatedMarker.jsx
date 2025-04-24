import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateBearing } from '../../utils/mapUtils';

const airplaneIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-11 w-11" fill="#3b82f6" stroke="#1e40af" stroke-width="0.5"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>`,
  className: 'airplane-icon',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21]
});

const AnimatedMarker = ({ track, isPlaying, currentPointIndex, resetTrigger }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!track?.length || currentPointIndex >= track.length) return;

    let bearing = 0;
    if (currentPointIndex < track.length - 1) {
      bearing = calculateBearing(L.latLng(track[currentPointIndex]), L.latLng(track[currentPointIndex + 1]));
    } else if (currentPointIndex > 0) {
      bearing = calculateBearing(L.latLng(track[currentPointIndex - 1]), L.latLng(track[currentPointIndex]));
    }

    const exactPosition = L.latLng(track[currentPointIndex][0], track[currentPointIndex][1]);

    if (!markerRef.current) {
      markerRef.current = L.marker(exactPosition, { icon: airplaneIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      markerRef.current.setLatLng(exactPosition);
    }
    const markerElement = markerRef.current.getElement();
    if (markerElement) {
      const baseTransform = (markerElement.style.transform || '').replace(/ rotate\([^)]+\)/g, '');
      markerElement.style.transform = `${baseTransform} rotate(${bearing}deg)`;
      markerElement.style.transformOrigin = 'center center';
    }
    if (isPlaying) map.panTo(exactPosition);

    return () => {
      if (resetTrigger && markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, track, currentPointIndex, isPlaying, resetTrigger]);

  return null;
};

export default AnimatedMarker;
