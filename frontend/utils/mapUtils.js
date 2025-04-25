import L from 'leaflet';

// Create custom map icons with different colors
export const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Predefined icons
export const takeoffIcon = createIcon('green');
export const landingIcon = createIcon('red');

// Calculate bearing between two coordinates for rotation
export const calculateBearing = (start, end) => {
  // Handle different coordinate input formats (array or object)
  let startLat, startLng, endLat, endLng;
  
  if (Array.isArray(start) && Array.isArray(end)) {
    // Format: [lat, lng]
    startLat = start[0];
    startLng = start[1];
    endLat = end[0];
    endLng = end[1];
  } else if (start?.lat !== undefined && end?.lat !== undefined) {
    // Format: {lat, lng} or {lat, lon}
    startLat = start.lat;
    startLng = start.lng || start.lon;
    endLat = end.lat;
    endLng = end.lng || end.lon;
  } else {
    // Invalid input format
    return 0; // Default heading
  }
  
  // Validate coordinates
  if (typeof startLat !== 'number' || typeof startLng !== 'number' || 
      typeof endLat !== 'number' || typeof endLng !== 'number' ||
      isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
    return 0; // Default heading
  }
  
  // Convert to radians
  startLat = startLat * Math.PI / 180;
  startLng = startLng * Math.PI / 180;
  endLat = endLat * Math.PI / 180;
  endLng = endLng * Math.PI / 180;

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
};

// Extract coordinates from string format like "12.345, 67.890"
export const extractCoordinates = (str) => {
  const match = str?.match(/(\d+\.\d+)\s*,\s*(\d+\.\d+)/);
  return match ? { lat: +match[1], lon: +match[2] } : null;
};

// Get coordinates for a flight, handling different data formats
export const getFlightCoordinates = (flight) => {
  if (!flight) return { departureCoords: null, landingCoords: null };
  
  const dep = flight.departure_lat && flight.departure_lon
    ? [flight.departure_lat, flight.departure_lon]
    : extractCoordinates(flight.departure_place) && [extractCoordinates(flight.departure_place).lat, extractCoordinates(flight.departure_place).lon];
  
  const land = flight.landing_lat && flight.landing_lon
    ? [flight.landing_lat, flight.landing_lon]
    : extractCoordinates(flight.landing_place) && [extractCoordinates(flight.landing_place).lat, extractCoordinates(flight.landing_place).lon];
  
  return { departureCoords: dep || null, landingCoords: land || null };
};

// Calculate map bounds based on available coordinates
export const getMapBounds = (flight, gpsTrack) => {
  if (gpsTrack?.length > 0) return gpsTrack;
  
  const { departureCoords, landingCoords } = getFlightCoordinates(flight);
  const points = [departureCoords, landingCoords].filter(Boolean);
  
  if (!points.length) return [[0, 0], [0, 0]];
  if (points.length === 1) {
    const [lat, lng] = points[0];
    return [[lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01]];
  }
  return points;
};
