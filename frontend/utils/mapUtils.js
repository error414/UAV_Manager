import L from 'leaflet';

// Create a custom Leaflet icon with a given color
export const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Predefined icons for takeoff and landing
export const takeoffIcon = createIcon('green');
export const landingIcon = createIcon('red');

// Returns bearing in degrees from start to end coordinates
export const calculateBearing = (start, end) => {
  // Expects [lat, lng] arrays
  if (!Array.isArray(start) || !Array.isArray(end) || start.length !== 2 || end.length !== 2) { 
    return 0;
  }
  let [startLat, startLng] = start; 
  let [endLat, endLng] = end;

  // Validate input types
  if (typeof startLat !== 'number' || typeof startLng !== 'number' || 
      typeof endLat !== 'number' || typeof endLng !== 'number' ||
      isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
    return 0;
  }
  
  // Convert degrees to radians
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

// Parses coordinates from string format "lat, lng"
export const extractCoordinates = (str) => {
  const match = str?.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  return match ? { lat: +match[1], lon: +match[2] } : null;
};

// Returns departure and landing coordinates from flight object
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

// Returns map bounds based on available coordinates or GPS track
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
