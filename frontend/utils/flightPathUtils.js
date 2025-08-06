/**
 * Flight path calculation utilities for creating synthetic flight paths
 * based on telemetry data and flight parameters
 */

/**
 * Creates a synthetic flight path based on takeoff/landing coordinates and telemetry data
 * @param {Array} departureCoords - [lat, lon] of takeoff
 * @param {Array} landingCoords - [lat, lon] of landing
 * @param {Array} telemetryData - Array of telemetry points from CSV
 * @param {number} initialHeading - Initial departing heading in degrees (0-359)
 * @param {number} medianSpeed - Median speed in km/h
 * @param {number} scalingFactor - Scaling factor for distance calculations
 * @param {Object} boundaries - Optional boundary constraints {north: meters, east: meters, south: meters, west: meters}
 * @param {Object} circularBoundary - Optional circular boundary {radius: meters}
 * @returns {Object} Object containing trackPoints array and gpsData array
 */
export const createSyntheticFlightPath = (
  departureCoords,
  landingCoords,
  telemetryData,
  initialHeading = null,
  medianSpeed = null,
  scalingFactor = 0.025,
  boundaries = null,
  circularBoundary = null
) => {
  if (!departureCoords || !landingCoords || !telemetryData?.length) {
    return { trackPoints: [], gpsData: [] };
  }

  const trackPoints = [];
  const gpsData = [];

  const totalDistance = calculateDistance(departureCoords, landingCoords);
  const directBearing = calculateBearing(departureCoords, landingCoords);
  const startHeading = initialHeading !== null ? initialHeading : directBearing;

  const baseSpeed = medianSpeed !== null ? medianSpeed : calculateMedianSpeed(telemetryData) || 20;

  let currentLat = departureCoords[0];
  let currentLon = departureCoords[1];
  let currentHeading = startHeading;

  // Calculate boundary coordinates if boundaries are provided
  let boundaryCoords = null;
  if (boundaries) {
    boundaryCoords = calculateBoundaryCoordinates(departureCoords, boundaries);
  }

  telemetryData.forEach((point, index) => {
    const ratio = index / (telemetryData.length - 1);

    let actualSpeed = baseSpeed;

    if (index === 0) {
      trackPoints.push([currentLat, currentLon]);
    } else {
      let timeDelta = (point.time - telemetryData[index - 1].time);
      if (timeDelta > 10000) timeDelta = timeDelta / 1000;

      // Since CSV logs 3 times per second, if no time data is available,
      // assume 1/3 second between points
      if (timeDelta === 0 || isNaN(timeDelta)) {
        timeDelta = 1/3; // 0.333 seconds between points
      }
      timeDelta = Math.max(0.1, Math.min(timeDelta, 10));

      // Convert to consistent units if needed
      if (actualSpeed < 5) { // Likely in m/s if very small
        actualSpeed = actualSpeed * 3.6; // Convert m/s to km/h
      }
      actualSpeed = Math.max(5, Math.min(actualSpeed, 120));

      let headingDelta = 0;
      if (point.Roll) headingDelta += point.Roll * 0.01;  // Reduced from 0.02
      if (point.Yaw && telemetryData[index - 1].Yaw !== undefined) {
        headingDelta += (point.Yaw - telemetryData[index - 1].Yaw) * 0.5; // Added factor
      }
      if (point.Ail) headingDelta += point.Ail * 0.03;   // Reduced from 0.05
      if (point.Rud) headingDelta += point.Rud * 0.04;   // Reduced from 0.07

      // Apply stick inputs with damping based on progress
      const stickDamping = Math.max(0.3, 1 - ratio * 0.7); // Reduce stick influence as we approach landing
      headingDelta *= stickDamping;

      currentHeading = normalizeHeading(currentHeading + headingDelta);

      // Check circular boundary constraints first (higher priority)
      if (circularBoundary && circularBoundary.radius > 0) {
        const circularTurn = checkCircularBoundaryViolation([currentLat, currentLon], currentHeading, departureCoords, circularBoundary.radius);
        if (circularTurn !== null) {
          currentHeading = circularTurn;
        }
      }
      // Check rectangular boundary constraints if no circular boundary violation
      else if (boundaryCoords) {
        const boundaryTurn = checkBoundaryViolation([currentLat, currentLon], currentHeading, boundaryCoords);
        if (boundaryTurn !== null) {
          currentHeading = boundaryTurn;
        }
      }

      // Progressive course correction towards landing area in final 20%
      if (ratio > 0.8) {
        // Reduce speed in final 20%: from 100% to 2% of median speed
        const minSpeedFactor = 0.02;
        const progress = (ratio - 0.8) / 0.2; // 0 at 80%, 1 at 100%
        const speedFactor = 1 - (1 - minSpeedFactor) * progress;
        actualSpeed = baseSpeed * speedFactor;

        const targetBearing = calculateBearing([currentLat, currentLon], landingCoords);
        const bearingDiff = normalizeHeading(targetBearing - currentHeading);
        
        // Limit bearing difference to prevent spinning - take shortest path
        let limitedBearingDiff = bearingDiff;
        if (limitedBearingDiff > 180) {
          limitedBearingDiff = limitedBearingDiff - 360;
        } else if (limitedBearingDiff < -180) {
          limitedBearingDiff = limitedBearingDiff + 360;
        }
        
        // Limit maximum turn rate to prevent sharp turns/spinning
        const maxTurnRate = 15; // Maximum degrees per correction
        limitedBearingDiff = Math.max(-maxTurnRate, Math.min(maxTurnRate, limitedBearingDiff));
        
        // Progressive correction strength from 0.2 to 0.5 in final 20%
        const correctionStrength = 0.2 + ((ratio - 0.8) / 0.2) * 0.3;
        const correction = limitedBearingDiff * correctionStrength;
        currentHeading = normalizeHeading(currentHeading + correction);
      }

      // Fixed distance calculation - convert km/h to km per time delta
      let distanceTraveled = (actualSpeed * (timeDelta / 3600)) * scalingFactor;

      // On the very last point, move directly to landing coordinates
      if (index === telemetryData.length - 1) {
        currentLat = landingCoords[0];
        currentLon = landingCoords[1];
      } else {
        const nextPosition = moveByDistanceAndBearing(
          [currentLat, currentLon],
          distanceTraveled,
          currentHeading
        );

        currentLat = nextPosition[0];
        currentLon = nextPosition[1];
      }

      trackPoints.push([currentLat, currentLon]);
    }

    gpsData.push({
      latitude: currentLat,
      longitude: currentLon,
      timestamp: point.time || index * 1000,
      altitude: point.GPS_altitude || 0,
      speed: actualSpeed, 
      ground_course: currentHeading,
      vertical_speed: point.VSpd || 0,
      pitch: point.Pitch || 0,
      roll: point.Roll || 0,
      yaw: point.Yaw || 0,
      receiver_battery: point.RxBt || 0,
      current: point.Curr || 0,
      capacity: point.Capa || 0,
      receiver_quality: point.RQly || 0,
      transmitter_quality: point.TQly || 0,
      transmitter_power: point.TPWR || 0,
      aileron: point.Ail || 0,
      elevator: point.Ele || 0,
      throttle: point.Thr || 0,
      rudder: point.Rud || 0,
      num_sat: 0
    });
  });

  return { trackPoints, gpsData };
};

/**
 * Parse telemetry data from CSV text
 * @param {string} csvText - CSV text content
 * @returns {Array} Array of telemetry data points
 */
export const parseTelemetryData = (csvText) => {
  if (!csvText?.trim()) return [];

  const rows = csvText.split('\n').filter(r => r.trim());
  if (rows.length < 2) return [];

  const header = rows[0].trim().split(',');
  const telemetryData = [];

  rows.slice(1).forEach(row => {
    const columns = row.trim().split(',');
    const dataPoint = {};

    header.forEach((col, index) => {
      const value = columns[index]?.trim();
      if (value && value !== '') {
        const numValue = parseFloat(value);
        dataPoint[col] = isNaN(numValue) ? value : numValue;
      }
    });

    if (Object.keys(dataPoint).length > 0) {
      telemetryData.push(dataPoint);
    }
  });

  return telemetryData;
};

/**
 * Calculate boundary coordinates based on departure point and meter offsets
 * @param {Array} departureCoords - [lat, lon] of departure point
 * @param {Object} boundaries - {north: meters, east: meters, south: meters, west: meters}
 * @returns {Object} Boundary coordinates
 */
const calculateBoundaryCoordinates = (departureCoords, boundaries) => {
  const [lat, lon] = departureCoords;
  const earthRadius = 6371000; // Earth radius in meters
  
  // Convert meters to degrees
  const latDeltaNorth = (boundaries.north || 0) / earthRadius * (180 / Math.PI);
  const latDeltaSouth = (boundaries.south || 0) / earthRadius * (180 / Math.PI);
  const lonDeltaEast = (boundaries.east || 0) / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  const lonDeltaWest = (boundaries.west || 0) / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  
  return {
    north: lat + latDeltaNorth,
    south: lat - latDeltaSouth,
    east: lon + lonDeltaEast,
    west: lon - lonDeltaWest
  };
};

/**
 * Check if current position with heading would violate boundaries and return corrective heading
 * @param {Array} currentPos - [lat, lon] current position
 * @param {number} currentHeading - Current heading in degrees
 * @param {Object} boundaryCoords - Boundary coordinates
 * @returns {number|null} Corrective heading or null if no violation
 */
const checkBoundaryViolation = (currentPos, currentHeading, boundaryCoords) => {
  const [lat, lon] = currentPos;
  const margin = 0.0001; // Small margin to start turning before hitting boundary
  
  let violatedBoundaries = [];
  
  // Check which boundaries are close to being violated
  if (lat >= boundaryCoords.north - margin) violatedBoundaries.push('north');
  if (lat <= boundaryCoords.south + margin) violatedBoundaries.push('south');
  if (lon >= boundaryCoords.east - margin) violatedBoundaries.push('east');
  if (lon <= boundaryCoords.west + margin) violatedBoundaries.push('west');
  
  if (violatedBoundaries.length === 0) return null;
  
  // Calculate center point of boundaries for reference
  const centerLat = (boundaryCoords.north + boundaryCoords.south) / 2;
  const centerLon = (boundaryCoords.east + boundaryCoords.west) / 2;
  
  // Calculate heading towards center
  const headingToCenter = calculateBearing([lat, lon], [centerLat, centerLon]);
  
  // Determine appropriate turn based on violated boundaries
  let targetHeading = headingToCenter;
  
  if (violatedBoundaries.includes('north')) {
    // If hitting north boundary, turn south (180°)
    if (currentHeading >= 270 || currentHeading <= 90) {
      targetHeading = 180;
    }
  }
  
  if (violatedBoundaries.includes('south')) {
    // If hitting south boundary, turn north (0°)
    if (currentHeading >= 90 && currentHeading <= 270) {
      targetHeading = 0;
    }
  }
  
  if (violatedBoundaries.includes('east')) {
    // If hitting east boundary, turn west (270°)
    if (currentHeading >= 0 && currentHeading <= 180) {
      targetHeading = 270;
    }
  }
  
  if (violatedBoundaries.includes('west')) {
    // If hitting west boundary, turn east (90°)
    if (currentHeading >= 180 && currentHeading <= 360) {
      targetHeading = 90;
    }
  }
  
  // For corner violations, use heading towards center
  if (violatedBoundaries.length > 1) {
    targetHeading = headingToCenter;
  }
  
  // Apply gradual turn towards target heading
  const headingDiff = targetHeading - currentHeading;
  let normalizedDiff = headingDiff;
  
  // Normalize to shortest path
  if (normalizedDiff > 180) normalizedDiff -= 360;
  if (normalizedDiff < -180) normalizedDiff += 360;
  
  // Limit turn rate for smooth turns
  const maxTurnRate = 30; // Maximum degrees per step
  const boundaryTurn = Math.max(-maxTurnRate, Math.min(maxTurnRate, normalizedDiff));
  
  return normalizeHeading(currentHeading + boundaryTurn);
};

/**
 * Check if current position with heading would violate circular boundary and return corrective heading
 * @param {Array} currentPos - [lat, lon] current position
 * @param {number} currentHeading - Current heading in degrees
 * @param {Array} centerCoords - [lat, lon] center coordinates (takeoff point)
 * @param {number} radius - Radius in meters
 * @returns {number|null} Corrective heading or null if no violation
 */
const checkCircularBoundaryViolation = (currentPos, currentHeading, centerCoords, radius) => {
  const distanceFromCenter = calculateDistance(currentPos, centerCoords) * 1000; // Convert km to meters
  const margin = radius * 0.05; // 5% margin to start turning before hitting boundary
  
  // Check if approaching boundary
  if (distanceFromCenter >= radius - margin) {
    // Calculate heading from current position back towards center
    const headingToCenter = calculateBearing(currentPos, centerCoords);
    
    // If we're moving away from center (heading difference > 90°), apply correction
    const headingDiff = Math.abs(normalizeHeading(currentHeading - headingToCenter));
    const isMovingAway = headingDiff > 90 && headingDiff < 270;
    
    if (isMovingAway) {
      // Calculate corrective heading - turn towards center with some tangential component
      // This creates a circular flight pattern rather than just heading straight back
      const tangentOffset = 45; // Degrees offset from direct heading to center
      let targetHeading = headingToCenter + (Math.random() > 0.5 ? tangentOffset : -tangentOffset);
      targetHeading = normalizeHeading(targetHeading);
      
      // Apply gradual turn towards target heading
      const turnDiff = targetHeading - currentHeading;
      let normalizedDiff = turnDiff;
      
      // Normalize to shortest path
      if (normalizedDiff > 180) normalizedDiff -= 360;
      if (normalizedDiff < -180) normalizedDiff += 360;
      
      // Limit turn rate for smooth turns
      const maxTurnRate = 25; // Maximum degrees per step for circular boundary
      const boundaryTurn = Math.max(-maxTurnRate, Math.min(maxTurnRate, normalizedDiff));
      
      return normalizeHeading(currentHeading + boundaryTurn);
    }
  }
  
  return null;
};

/**
 * Calculate bearing between two coordinates
 * @param {Array} coord1 - [lat, lon] of first coordinate
 * @param {Array} coord2 - [lat, lon] of second coordinate
 * @returns {number} Bearing in degrees
 */
const calculateBearing = (coord1, coord2) => {
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const lat1 = coord1[0] * Math.PI / 180;
  const lat2 = coord2[0] * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return normalizeHeading(bearing);
};

/**
 * Move a coordinate by distance and bearing
 * @param {Array} coord - [lat, lon] starting coordinate
 * @param {number} distance - Distance to move in kilometers
 * @param {number} bearing - Bearing in degrees
 * @returns {Array} New [lat, lon] coordinate
 */
const moveByDistanceAndBearing = (coord, distance, bearing) => {
  const R = 6371;
  const lat1 = coord[0] * Math.PI / 180;
  const lon1 = coord[1] * Math.PI / 180;
  const bearingRad = bearing * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
    Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
    Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
};

/**
 * Normalize heading to 0-360 degrees
 * @param {number} heading - Heading in degrees
 * @returns {number} Normalized heading
 */
const normalizeHeading = (heading) => {
  let normalized = heading % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

/**
 * Calculate median speed from telemetry data
 * @param {Array} telemetryData - Array of telemetry points
 * @returns {number|null} Median speed or null if no valid speeds
 */
const calculateMedianSpeed = (telemetryData) => {
  const speeds = telemetryData
    .map(point => point.GPS_speed)
    .filter(speed => speed != null && speed > 0)
    .sort((a, b) => a - b);

  if (speeds.length === 0) return null;

  const mid = Math.floor(speeds.length / 2);
  return speeds.length % 2 === 0
    ? (speeds[mid - 1] + speeds[mid]) / 2
    : speeds[mid];
};

/**
 * Calculate distance between two coordinates
 * @param {Array} coord1 - [lat, lon] of first coordinate
 * @param {Array} coord2 - [lat, lon] of second coordinate
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const lat1 = coord1[0] * Math.PI / 180;
  const lat2 = coord2[0] * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};