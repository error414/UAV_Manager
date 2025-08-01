/**
 * Parses GPS data from a CSV file and returns track points and detailed data
 * @param {File} file - The CSV file containing GPS data
 * @returns {Promise<Object>} Object containing trackPoints array and gpsData array
 */
export const parseGPSFile = async (file) => {
  // Read file as text using FileReader
  const csvText = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Error reading the file.'));
    reader.readAsText(file);
  });
  
  if (!csvText?.trim()) throw new Error('The file is empty.');
  
  // Split file into non-empty rows
  const rows = csvText.split('\n').filter(r => r.trim());
  if (rows.length < 2) throw new Error('The file contains no data rows.');
  
  // Check header matches expected format
  const header = rows[0].trim();
  const expectedHeader = 'time,GPS_numSat,GPS_coord[0],GPS_coord[1],GPS_altitude,GPS_speed,GPS_ground_course,VSpd,Pitch,Roll,Yaw,RxBt,Curr,Capa,RQly,TQly,TPWR,Ail,Ele,Thr,Rud';
  if (header !== expectedHeader) {
    throw new Error('The file header does not match the expected format:\n' + `"${expectedHeader}"`);
  }
  
  // Build column index map for fast lookup
  const headerColumns = header.split(',').map(col => col.trim().toLowerCase());
  const idx = name => headerColumns.findIndex(col => col === name);
  const indexMap = {
    lat: idx('gps_coord[0]'),
    lon: idx('gps_coord[1]'),
    time: idx('time'),
    alt: idx('gps_altitude'),
    sat: idx('gps_numsat'),
    speed: idx('gps_speed'),
    course: idx('gps_ground_course'),
    vspd: idx('vspd'),
    pitch: idx('pitch'),
    roll: idx('roll'),
    yaw: idx('yaw'),
    rxbt: idx('rxbt'),
    curr: idx('curr'),
    capa: idx('capa'),
    rqly: idx('rqly'),
    tqly: idx('tqly'),
    tpwr: idx('tpwr'),
    ail: idx('ail'),
    ele: idx('ele'),
    thr: idx('thr'),
    rud: idx('rud')
  };
  
  if (indexMap.lat === -1 || indexMap.lon === -1) {
    throw new Error('No valid GPS coordinates found.');
  }
  
  const trackPoints = [], gpsData = [];
  rows.slice(1).forEach(row => {
    const columns = row.trim().split(',').map(col => col.trim());
    if (columns.length <= Math.max(indexMap.lat, indexMap.lon)) return;
    
    const lat = parseFloat(columns[indexMap.lat]);
    const lon = parseFloat(columns[indexMap.lon]);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      trackPoints.push([lat, lon]);
      
      const gpsPoint = {
        latitude: lat,
        longitude: lon,
        timestamp: indexMap.time !== -1 && columns[indexMap.time] 
          ? parseInt(columns[indexMap.time], 10) || 0 
          : 0
      };
      
      if (indexMap.alt !== -1 && columns[indexMap.alt]) {
        gpsPoint.altitude = parseFloat(columns[indexMap.alt]);
      }
      
      if (indexMap.sat !== -1 && columns[indexMap.sat]) {
        gpsPoint.num_sat = parseInt(columns[indexMap.sat], 10);
      }
      
      if (indexMap.speed !== -1 && columns[indexMap.speed]) {
        gpsPoint.speed = parseFloat(columns[indexMap.speed]);
      }
      
      if (indexMap.course !== -1 && columns[indexMap.course]) {
        gpsPoint.ground_course = parseFloat(columns[indexMap.course]);
      }

      if (indexMap.vspd !== -1 && columns[indexMap.vspd]) {
        gpsPoint.vertical_speed = parseFloat(columns[indexMap.vspd]);
      }
      
      if (indexMap.pitch !== -1 && columns[indexMap.pitch]) {
        gpsPoint.pitch = parseFloat(columns[indexMap.pitch]);
      }
      
      if (indexMap.roll !== -1 && columns[indexMap.roll]) {
        gpsPoint.roll = parseFloat(columns[indexMap.roll]);
      }
      
      if (indexMap.yaw !== -1 && columns[indexMap.yaw]) {
        gpsPoint.yaw = parseFloat(columns[indexMap.yaw]);
      }
      
      if (indexMap.rxbt !== -1 && columns[indexMap.rxbt]) {
        gpsPoint.receiver_battery = parseFloat(columns[indexMap.rxbt]);
      }
      
      if (indexMap.curr !== -1 && columns[indexMap.curr]) {
        gpsPoint.current = parseFloat(columns[indexMap.curr]);
      }
      
      if (indexMap.capa !== -1 && columns[indexMap.capa]) {
        gpsPoint.capacity = parseFloat(columns[indexMap.capa]);
      }
      
      if (indexMap.rqly !== -1 && columns[indexMap.rqly]) {
        gpsPoint.receiver_quality = parseInt(columns[indexMap.rqly], 10);
      }
      
      if (indexMap.tqly !== -1 && columns[indexMap.tqly]) {
        gpsPoint.transmitter_quality = parseInt(columns[indexMap.tqly], 10);
      }
      
      if (indexMap.tpwr !== -1 && columns[indexMap.tpwr]) {
        gpsPoint.transmitter_power = parseInt(columns[indexMap.tpwr], 10);
      }
      
      if (indexMap.ail !== -1 && columns[indexMap.ail]) {
        gpsPoint.aileron = parseFloat(columns[indexMap.ail]);
      }
      
      if (indexMap.ele !== -1 && columns[indexMap.ele]) {
        gpsPoint.elevator = parseFloat(columns[indexMap.ele]);
      }
      
      if (indexMap.thr !== -1 && columns[indexMap.thr]) {
        gpsPoint.throttle = parseFloat(columns[indexMap.thr]);
      }
      
      if (indexMap.rud !== -1 && columns[indexMap.rud]) {
        gpsPoint.rudder = parseFloat(columns[indexMap.rud]);
      }
      
      gpsData.push(gpsPoint);
    }
  });
  
  if (!trackPoints.length) {
    throw new Error('No valid GPS coordinates found in the file.');
  }
  
  return { trackPoints, gpsData };
};

/**
 * Computes min/max statistics for altitude, speed, vertical speed, and satellites
 * @param {Array} gpsData - Array of GPS data points
 * @returns {Object} Object containing min/max values for altitude, speed, satellites
 */
export const calculateGpsStatistics = (gpsData) => {
  if (!gpsData?.length) return {
    maxAltitude: null,
    minAltitude: null,
    maxSpeed: null, 
    minSpeed: null,
    maxVerticalSpeed: null,
    minVerticalSpeed: null,
    maxSatellites: null,
    minSatellites: null
  };

  return gpsData.reduce((acc, point) => {
    if (point.altitude !== undefined) {
      if (acc.maxAltitude === null || point.altitude > acc.maxAltitude) acc.maxAltitude = point.altitude;
      if (acc.minAltitude === null || point.altitude < acc.minAltitude) acc.minAltitude = point.altitude;
    }
    
    if (point.speed !== undefined) {
      if (acc.maxSpeed === null || point.speed > acc.maxSpeed) acc.maxSpeed = point.speed;
      if (acc.minSpeed === null || point.speed < acc.minSpeed) acc.minSpeed = point.speed;
    }
    
    if (point.vertical_speed !== undefined) {
      if (acc.maxVerticalSpeed === null || point.vertical_speed > acc.maxVerticalSpeed) acc.maxVerticalSpeed = point.vertical_speed;
      if (acc.minVerticalSpeed === null || point.vertical_speed < acc.minVerticalSpeed) acc.minVerticalSpeed = point.vertical_speed;
    }
    
    if (point.num_sat !== undefined) {
      if (acc.maxSatellites === null || point.num_sat > acc.maxSatellites) acc.maxSatellites = point.num_sat;
      if (acc.minSatellites === null || point.num_sat < acc.minSatellites) acc.minSatellites = point.num_sat;
    }
    
    return acc;
  }, {
    maxAltitude: null,
    minAltitude: null,
    maxSpeed: null, 
    minSpeed: null,
    maxVerticalSpeed: null,
    minVerticalSpeed: null,
    maxSatellites: null,
    minSatellites: null
  });
};

/**
 * Creates a synthetic flight path based on takeoff/landing coordinates and telemetry data
 * @param {Array} departureCoords - [lat, lon] of takeoff
 * @param {Array} landingCoords - [lat, lon] of landing
 * @param {Array} telemetryData - Array of telemetry points from CSV
 * @param {number} initialHeading - Initial departing heading in degrees (0-359)
 * @param {number} medianSpeed - Median speed in km/h
 * @returns {Object} Object containing trackPoints array and gpsData array
 */
export const createSyntheticFlightPath = (
  departureCoords,
  landingCoords,
  telemetryData,
  initialHeading = null,
  medianSpeed = null,
  scalingFactor = 0.025
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

  telemetryData.forEach((point, index) => {
    const ratio = index / (telemetryData.length - 1);

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

      // Use base speed without modifications
      let actualSpeed = baseSpeed;
      
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

      // Progressive course correction towards landing area in final 20%
      if (ratio > 0.8) {
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
      speed: point.GPS_speed || baseSpeed,
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
      num_sat: point.GPS_numSat || 8
    });
  });

  return { trackPoints, gpsData };
};

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

const normalizeHeading = (heading) => {
  let normalized = heading % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

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

// Add missing calculateDistance function
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

