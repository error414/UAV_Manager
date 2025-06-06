import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-rotatedmarker';
import { calculateBearing } from '../../utils/mapUtils';

const airplaneIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-11 w-11" fill="#3b82f6" stroke="#1e40af" stroke-width="0.5"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>`,
  className: 'airplane-icon',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21]
});

const AnimatedMarker = ({ track, isPlaying, currentPointIndex, resetTrigger, fullGpsData }) => {
  const map = useMap();
  const markerRef = useRef(null);
  const animationRef = useRef(null);
  const lastValidBearingRef = useRef(0);
  
  useEffect(() => {
    if (!track || track.length === 0) return;
    
    const initialPosition = track[currentPointIndex] || track[0];
    
    // Create marker only once
    if (initialPosition && !markerRef.current) {
      markerRef.current = L.marker(initialPosition, { 
        icon: airplaneIcon,
        rotationOrigin: 'center center'
      }).addTo(map);
    }
    
    // Cleanup marker and animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, track, currentPointIndex, fullGpsData]);
  
  useEffect(() => {
    if (!markerRef.current || !track || currentPointIndex >= track.length) return;
    
    const currentPosition = track[currentPointIndex];
    if (!currentPosition) return;
    
    markerRef.current.setLatLng(currentPosition);
    updateBearingFromPositions(track, currentPointIndex);
  }, [track, currentPointIndex, fullGpsData]);
  
  useEffect(() => {
    if (!markerRef.current || !track || track.length === 0) return;
    
    // Reset marker to first position on reset
    const initialPosition = track[0];
    if (initialPosition) {
      markerRef.current.setLatLng(initialPosition);
      updateBearingFromPositions(track, 0);
    }
  }, [resetTrigger, track, fullGpsData]);
  
  // Calculate and set bearing using calculateBearing
  const updateBearingFromPositions = (track, index) => {
    if (!markerRef.current) return;
    const currentPosition = track[index];
    const previousIndex = index > 0 ? index - 1 : 0;
    const previousPosition = track[previousIndex];
    if (
      previousPosition &&
      currentPosition &&
      Array.isArray(previousPosition) &&
      Array.isArray(currentPosition) &&
      previousPosition.length >= 2 &&
      currentPosition.length >= 2 &&
      (Math.abs(previousPosition[0] - currentPosition[0]) > 0.0000001 ||
        Math.abs(previousPosition[1] - currentPosition[1]) > 0.0000001)
    ) {
      try {
        const bearing = calculateBearing(previousPosition, currentPosition);
        if (!isNaN(bearing)) {
          markerRef.current.setRotationAngle(bearing);
          lastValidBearingRef.current = bearing;
        } else {
          markerRef.current.setRotationAngle(lastValidBearingRef.current);
        }
      } catch (error) {
        markerRef.current.setRotationAngle(lastValidBearingRef.current);
      }
    } else {
      markerRef.current.setRotationAngle(lastValidBearingRef.current);
    }
  };
  
  return null;
};

export default AnimatedMarker;
