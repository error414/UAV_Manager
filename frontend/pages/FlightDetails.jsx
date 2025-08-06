import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Layout, Loading, ConfirmModal, Button, Alert, FlightInfoCard, AnimatedMarker, GpsAnimationControls, AirspeedIndicator, AttitudeIndicator, AltitudeIndicator, ArrowButton, VerticalSpeedIndicator, CompassIndicator,
  TurnCoordinator, ThrottleYawStick, ElevatorAileronStick, SignalStrengthIndicator, ReceiverBatteryIndicator, CapacityIndicator, CurrentIndicator, DataPanel, AccordionPanel
} from '../components';
import { useAuth, useApi, useResponsiveSize, useGpsAnimation, useAccordionState, } from '../hooks';
import { takeoffIcon, landingIcon, getFlightCoordinates, getMapBounds, parseGPSFile, calculateGpsStatistics, createSyntheticFlightPath, parseTelemetryData } from '../utils';

// Set Leaflet default icons for markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Map component for displaying flight and GPS track
const FlightMap = ({ flight, gpsTrack, departureCoords, landingCoords, isPlaying, currentPointIndex, resetTrigger, fullGpsData }) => {
  // Create color-coded polyline segments based on satellite count
  const createColorCodedSegments = () => {
    if (!fullGpsData || !gpsTrack || fullGpsData.length !== gpsTrack.length) {
      return [];
    }

    const segments = [];
    let currentSegment = [];
    let currentColor = 'blue';

    for (let i = 0; i < fullGpsData.length; i++) {
      const point = fullGpsData[i];
      const numSat = point.num_sat || 0;
      
      // Determine color based on satellite count
      let color;
      if (numSat < 4) {
        color = 'red'; // Red for poor GPS signal
      } else if (numSat < 6) {
        color = '#FFD700'; // Yellow
      } else {
        color = 'blue'; // Blue (default)
      }

      // If color changes or this is the first point, start new segment
      if (color !== currentColor || currentSegment.length === 0) {
        // Save previous segment if it has points
        if (currentSegment.length > 0) {
          segments.push({
            positions: [...currentSegment],
            color: currentColor
          });
        }
        
        // Start new segment
        currentSegment = [gpsTrack[i]];
        currentColor = color;
      } else {
        // Add point to current segment
        currentSegment.push(gpsTrack[i]);
      }
    }

    // Add the last segment
    if (currentSegment.length > 0) {
      segments.push({
        positions: currentSegment,
        color: currentColor
      });
    }

    return segments;
  };

  const colorCodedSegments = createColorCodedSegments();

  return (
    <MapContainer
      bounds={getMapBounds(flight, gpsTrack)}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 0, minHeight: '300px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {departureCoords && (
        <Marker position={departureCoords} icon={takeoffIcon}>
          <Popup>
            <strong>Takeoff:</strong> {flight.departure_place || 'N/A'}<br />
            <strong>Time:</strong> {flight.departure_time || 'N/A'}
          </Popup>
        </Marker>
      )}
      {landingCoords && (
        <Marker position={landingCoords} icon={landingIcon}>
          <Popup>
            <strong>Landing:</strong> {flight.landing_place || 'N/A'}<br />
            <strong>Time:</strong> {flight.landing_time || 'N/A'}
          </Popup>
        </Marker>
      )}
      {gpsTrack?.length > 0 && (
        <>
          {/* Render color-coded segments if GPS data is available */}
          {colorCodedSegments.length > 0 ? (
            colorCodedSegments.map((segment, index) => (
              <Polyline
                key={index}
                positions={segment.positions}
                pathOptions={{ 
                  color: segment.color, 
                  weight: 3, 
                  opacity: 0.7 
                }}
              />
            ))
          ) : (
            /* Fallback to single blue line if no GPS data */
            <Polyline
              positions={gpsTrack}
              pathOptions={{ color: 'blue', weight: 3, opacity: 0.7 }}
            />
          )}
          <AnimatedMarker 
            track={gpsTrack} 
            isPlaying={isPlaying}
            currentPointIndex={currentPointIndex}
            resetTrigger={resetTrigger}
            fullGpsData={fullGpsData}
          />
        </>
      )}
    </MapContainer>
  );
};

// Renders flight instruments (airspeed, attitude, etc.)
const FlightInstruments = ({ currentGpsPoint, size, fullGpsData, currentPointIndex }) => {
  // Calculate turn rate based on yaw difference
  const getTurnRate = () => {
    if (!currentGpsPoint?.yaw) return 0;
    const prevYaw = fullGpsData[currentPointIndex-1]?.yaw || currentGpsPoint.yaw;
    return (currentGpsPoint.yaw - prevYaw) * 10;
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <AirspeedIndicator airspeed={currentGpsPoint?.speed || 0} size={size} />
        <TurnCoordinator turnRate={getTurnRate()} size={size} />
      </div>
      <div className="flex flex-col items-center gap-4">
        <AttitudeIndicator pitch={currentGpsPoint?.pitch || 0} roll={currentGpsPoint?.roll || 0} size={size} />
        <CompassIndicator heading={currentGpsPoint?.ground_course || 0} size={size} />
      </div>
      <div className="flex flex-col items-center gap-4">
        <AltitudeIndicator altitude={currentGpsPoint?.altitude || 0} size={size} maxAltitude={200} />
        <VerticalSpeedIndicator verticalSpeed={currentGpsPoint?.vertical_speed || 0} size={size} minSpeed={-15} maxSpeed={15} />
      </div>
    </>
  );
};

// Renders throttle/yaw and elevator/aileron sticks
const FlightControlSticks = ({ currentGpsPoint, size }) => {
  const throttle = currentGpsPoint?.throttle ?? 0;
  const yaw = currentGpsPoint?.rudder ?? 0;
  const elevator = currentGpsPoint?.elevator ?? 0;
  const aileron = currentGpsPoint?.aileron ?? 0;
  
  // Limit stick size to avoid oversizing
  const stickSize = Math.min(size, 200);
  
  return (
    <div className="flex justify-center items-center gap-4 w-full">
      <ThrottleYawStick throttle={throttle} yaw={yaw} size={stickSize} />
      <ElevatorAileronStick elevator={elevator} aileron={aileron} size={stickSize} />
    </div>
  );
};

// Renders telemetry indicators (battery, capacity, current)
const TelemetryIndicators = ({ currentGpsPoint, size }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <ReceiverBatteryIndicator value={currentGpsPoint?.receiver_battery ?? 0} size={size} />
      <CapacityIndicator value={currentGpsPoint?.capacity ?? 0} size={size} />
      <CurrentIndicator value={currentGpsPoint?.current ?? 0} size={size} />
    </div>
  );
};

const FlightDetails = () => {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const [flight, setFlight] = useState(null);
  const [gpsTrack, setGpsTrack] = useState(null);
  const [fullGpsData, setFullGpsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gpsStats, setGpsStats] = useState({
    maxAltitude: null,
    minAltitude: null,
    maxSpeed: null,
    minSpeed: null,
    maxVerticalSpeed: null,
    minVerticalSpeed: null,
    maxSatellites: null,
    minSatellites: null
  });
  const [minFlightId, setMinFlightId] = useState(null);
  const [maxFlightId, setMaxFlightId] = useState(null);
  const [orderedFlightIds, setOrderedFlightIds] = useState([]);
  const [currentFlightIndex, setCurrentFlightIndex] = useState(-1);
  const [isCalculatingPath, setIsCalculatingPath] = useState(false);
  const [hasSyntheticPath, setHasSyntheticPath] = useState(false);
  const [showFlightPathModal, setShowFlightPathModal] = useState(false);
  const [flightPathParams, setFlightPathParams] = useState({
    heading: '',
    medianSpeed: '',
    circularRadius: '',
    boundaryNorth: '',
    boundaryEast: '',
    boundarySouth: '',
    boundaryWest: ''
  });

  const {
    isPlaying,
    currentPointIndex,
    animationSpeed,
    resetTrigger,
    startAnimation,
    pauseAnimation,
    resetAnimation,
    changeSpeed,
    handlePositionChange,
    setCurrentPointIndex
  } = useGpsAnimation(gpsTrack);

  const { checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, message => setAlertMessage({ type: 'error', message }));

  const memoizedFetchData = useRef(fetchData).current;
  const memoizedCheckAuth = useRef(checkAuthAndGetUser).current;

  const [telemetryOpen, setTelemetryOpen] = useState(false);

  // Use custom hook for accordion state
  const { state: accordion, toggle: toggleAccordion } = useAccordionState([
    'instruments', 'signal', 'sticks', 'telemetry'
  ]);

  // Refs for responsive sizing
  const instrumentsContainerRef = useRef(null);
  const signalContainerRef = useRef(null);
  const sticksContainerRef = useRef(null);
  const telemetryBoxRef = useRef(null);

  // Use custom hook for responsive sizes
  const instrumentSize = useResponsiveSize(instrumentsContainerRef, 200, 120);
  const signalSize = useResponsiveSize(signalContainerRef, 48, 32);
  const controlSize = useResponsiveSize(sticksContainerRef, 200, 120);
  const telemetrySize = useResponsiveSize(telemetryBoxRef, 48, 32);

  // Show telemetry panel if no GPS track
  useEffect(() => {
    if (!gpsTrack || gpsTrack.length === 0) {
      setTelemetryOpen(true);
    } else {
      setTelemetryOpen(false);
    }
  }, [gpsTrack]);

  // Navigation helpers for previous/next flight
  const navigateToFlight = (id) => {
    pauseAnimation();
    setCurrentPointIndex(0);
    setGpsTrack(null);
    setFullGpsData(null);
    setAlertMessage(null);
    navigate(`/flightdetails/${id}`);
  };

  const navigateToPreviousFlight = () => {
    if (orderedFlightIds.length > 0 && currentFlightIndex < orderedFlightIds.length - 1) {
      navigateToFlight(orderedFlightIds[currentFlightIndex + 1]);
    }
  };

  const navigateToNextFlight = () => {
    if (orderedFlightIds.length > 0 && currentFlightIndex > 0) {
      navigateToFlight(orderedFlightIds[currentFlightIndex - 1]);
    }
  };

  // Handle GPS import/delete actions
  const handleImportGPS = () => fileInputRef.current.click();
  const handleDeleteGPS = () => setShowDeleteModal(true);
  const cancelDeleteGPS = () => setShowDeleteModal(false);

  // Confirm GPS track deletion
  const confirmDeleteGPS = async () => {
    setShowDeleteModal(false);
    setIsLoading(true);
    setAlertMessage(null);

    const result = await fetchData(`/api/flightlogs/${flightId}/gps/`, {}, 'DELETE');

    if (!result.error) {
      setGpsTrack(null);
      setFullGpsData(null);
      setAlertMessage({ type: 'success', message: 'Successfully deleted GPS track' });
    }

    setIsLoading(false);
  };

  // Handle GPS file upload and parsing
  const handleFileChange = async (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    if (!file) return;

    setAlertMessage(null);

    setTimeout(async () => {
      try {
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Please select a CSV file.');
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size exceeds the 10MB limit.');
        }

        setIsLoading(true);
        const { trackPoints, gpsData } = await parseGPSFile(file);

        setGpsTrack(trackPoints);
        setFullGpsData(gpsData);
        setGpsStats(calculateGpsStatistics(gpsData));

        const result = await fetchData(`/api/flightlogs/${flightId}/gps/`, {}, 'POST', { gps_data: gpsData });

        if (result.error) {
          throw new Error('Failed to upload GPS data');
        }

        setAlertMessage({ type: 'success', message: `Successfully imported and saved ${trackPoints.length} GPS points.` });
      } catch (error) {
        setAlertMessage({ type: 'error', message: `Error: ${error.message || 'Invalid or unsupported file.'}` });
      } finally {
        setIsLoading(false);
        event.target.value = '';
      }
    }, 50);
  };

  // Handle flight path parameter submission
  const handleFlightPathSubmit = () => {
    const heading = parseFloat(flightPathParams.heading);
    const medianSpeed = parseFloat(flightPathParams.medianSpeed);
    
    if (isNaN(heading) || heading < 0 || heading >= 360) {
      setAlertMessage({ type: 'error', message: 'Please enter a valid heading between 0 and 359 degrees.' });
      return;
    }
    
    if (isNaN(medianSpeed) || medianSpeed <= 0) {
      setAlertMessage({ type: 'error', message: 'Please enter a valid median speed greater than 0 km/h.' });
      return;
    }

    // Parse circular boundary (optional)
    const circularRadius = parseFloat(flightPathParams.circularRadius);
    const circularBoundary = !isNaN(circularRadius) && circularRadius > 0 ? { radius: circularRadius } : null;

    // Parse rectangular boundaries (optional)
    const boundaries = {
      north: parseFloat(flightPathParams.boundaryNorth) || 0,
      east: parseFloat(flightPathParams.boundaryEast) || 0,
      south: parseFloat(flightPathParams.boundarySouth) || 0,
      west: parseFloat(flightPathParams.boundaryWest) || 0
    };

    // Check if any rectangular boundary is set
    const hasRectangularBoundaries = boundaries.north > 0 || boundaries.east > 0 || 
                                   boundaries.south > 0 || boundaries.west > 0;
    
    setShowFlightPathModal(false);
    processFlightPathCalculation(heading, medianSpeed, hasRectangularBoundaries ? boundaries : null, circularBoundary);
  };

  // Process flight path calculation with user parameters
  const processFlightPathCalculation = (heading, medianSpeed, boundaries = null, circularBoundary = null) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsCalculatingPath(true);
      setAlertMessage(null);

      try {
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Please select a CSV file.');
        }

        // Read file as text
        const csvText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Error reading the file.'));
          reader.readAsText(file);
        });

        // Parse telemetry data
        const telemetryData = parseTelemetryData(csvText);
        
        if (!telemetryData.length) {
          throw new Error('No telemetry data found in the file.');
        }

        // Get flight coordinates
        const { departureCoords, landingCoords } = getFlightCoordinates(flight);
        
        if (!departureCoords || !landingCoords) {
          throw new Error('Missing takeoff or landing coordinates. Please ensure both departure and landing locations are set.');
        }

        // Create synthetic flight path with user parameters and boundaries
        const { trackPoints, gpsData } = createSyntheticFlightPath(
          departureCoords, 
          landingCoords, 
          telemetryData,
          heading,
          medianSpeed,
          0.025, // scalingFactor
          boundaries,
          circularBoundary
        );

        if (!trackPoints.length) {
          throw new Error('Failed to generate flight path.');
        }

        // Set the calculated path
        setGpsTrack(trackPoints);
        setFullGpsData(gpsData);
        setGpsStats(calculateGpsStatistics(gpsData));

        // Automatically save to database
        const result = await fetchData(`/api/flightlogs/${flightId}/gps/`, {}, 'POST', { 
          gps_data: gpsData,
          is_synthetic: true 
        });

        if (result.error) {
          throw new Error('Failed to save calculated flight path to database');
        }

        const boundaryText = circularBoundary ? ` with circular boundary (${circularBoundary.radius}m radius)` : 
                           boundaries ? ' with rectangular boundary constraints' : '';
        setAlertMessage({ 
          type: 'success', 
          message: `Successfully calculated and saved flight path with ${trackPoints.length} points based on telemetry data${boundaryText}.` 
        });

      } catch (error) {
        setAlertMessage({ 
          type: 'error', 
          message: `Error: ${error.message}` 
        });
      } finally {
        setIsCalculatingPath(false);
      }
    };

    fileInput.click();
  };

  // Handle Calculate Flight Path - now shows popup first
  const handleCalculateFlightPath = () => {
    setFlightPathParams({ 
      heading: '', 
      medianSpeed: '',
      circularRadius: '',
      boundaryNorth: '',
      boundaryEast: '',
      boundarySouth: '',
      boundaryWest: ''
    });
    setShowFlightPathModal(true);
  };

  // Fetch flight and GPS data on mount or flightId change
  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    
    const fetchFlightDetails = async () => {
      const auth = memoizedCheckAuth();
      if (!auth) return;
      
      try {
        const options = { signal: controller.signal };
        const result = await memoizedFetchData(`/api/flightlogs/${flightId}/`, options);
        if (result.error || !isActive) return;
        
        const data = result.data;
        
        // Fetch UAV details if available
        if (data.uav) {
          const uavId = data.uav?.uav_id || (!isNaN(data.uav) ? Number(data.uav) : null);
          if (uavId) {
            const uavResult = await memoizedFetchData(`/api/uavs/${uavId}/`, options);
            if (!uavResult.error && isActive) data.uav = uavResult.data;
          }
        }
        
        // Fetch GPS data if not already loaded
        const gpsResult = await memoizedFetchData(`/api/flightlogs/${flightId}/gps/`, options);
        if (!gpsResult.error && gpsResult.data?.length && isActive) {
          const trackPoints = gpsResult.data.map(p => [p.latitude, p.longitude]);
          setGpsTrack(trackPoints);
          setFullGpsData(gpsResult.data);
          setGpsStats(calculateGpsStatistics(gpsResult.data));
        }
        
        if (isActive) setFlight(data);
      } catch (error) {
        if (error.name !== 'AbortError' && isActive) {
          setAlertMessage({ type: 'error', message: 'Failed to load flight details' });
        }
      }
    };
    
    fetchFlightDetails();
    
    return () => { 
      isActive = false;
      controller.abort();
    };
  }, [flightId, memoizedFetchData, memoizedCheckAuth]);

  // Fetch min/max flightId for navigation
  useEffect(() => {
    let isActive = true;
    const fetchMeta = async () => {
      try {
        const result = await fetchData(`/api/flightlogs/meta/`);
        if (!result.error && isActive) {
          setMinFlightId(result.data?.minId);
          setMaxFlightId(result.data?.maxId);
          
          if (result.data?.orderedIds) {
            setOrderedFlightIds(result.data.orderedIds);
            
            // Find current flight index in ordered array
            const currentIndex = result.data.orderedIds.indexOf(parseInt(flightId));
            setCurrentFlightIndex(currentIndex);
          }
        }
      } catch (e) { /* ignore errors */ }
    };
    fetchMeta();
    return () => { isActive = false; };
  }, [fetchData, flightId]);

  if (!flight) return <Loading message="Loading flight details..." />;

  const { departureCoords, landingCoords } = getFlightCoordinates(flight);
  const hasGpsTrack = gpsTrack?.length > 0;

  // Get current GPS point for animation
  const currentGpsPoint = fullGpsData && currentPointIndex < fullGpsData.length 
    ? fullGpsData[currentPointIndex] 
    : null;

  // Prepare telemetry/statistics panels
  const statisticsItems = [
    { label: 'Altitude', value: `${gpsStats.minAltitude?.toFixed(1) || 'N/A'} - ${gpsStats.maxAltitude?.toFixed(1) || 'N/A'} m` },
    { label: 'Speed', value: `${gpsStats.minSpeed?.toFixed(1) || 'N/A'} - ${gpsStats.maxSpeed?.toFixed(1) || 'N/A'} km/h` },
    { label: 'Vertical Speed', value: `${gpsStats.minVerticalSpeed?.toFixed(1) || 'N/A'} - ${gpsStats.maxVerticalSpeed?.toFixed(1) || 'N/A'} m/s` },
    { label: 'Satellites', value: `${gpsStats.minSatellites || 'N/A'} - ${gpsStats.maxSatellites || 'N/A'}` }
  ];
  
  const positionItems = [
    { label: 'Latitude', value: currentGpsPoint?.latitude?.toFixed(6) || 'N/A' },
    { label: 'Longitude', value: currentGpsPoint?.longitude?.toFixed(6) || 'N/A' },
    { label: 'Satellites', value: currentGpsPoint?.num_sat || 'N/A' },
    { label: 'Timestamp', value: currentGpsPoint?.timestamp || 'N/A' }
  ];
  
  const movementItems = [
    { label: 'Speed', value: `${currentGpsPoint?.speed?.toFixed(1) || 'N/A'} km/h` },
    { label: 'Vertical Speed', value: `${currentGpsPoint?.vertical_speed?.toFixed(1) || 'N/A'} m/s` },
    { label: 'Altitude', value: `${currentGpsPoint?.altitude?.toFixed(1) || 'N/A'} m` },
    { label: 'Ground Course', value: `${currentGpsPoint?.ground_course?.toFixed(1) || 'N/A'}°` }
  ];
  
  const attitudeItems = [
    { label: 'Pitch', value: `${currentGpsPoint?.pitch?.toFixed(1) || 'N/A'}°` },
    { label: 'Roll', value: `${currentGpsPoint?.roll?.toFixed(1) || 'N/A'}°` },
    { label: 'Yaw', value: `${currentGpsPoint?.yaw?.toFixed(1) || 'N/A'}°` },
    { label: 'Heading', value: `${currentGpsPoint?.ground_course?.toFixed(1) || 'N/A'}°` }
  ];

  return (
    <Layout>
      <ConfirmModal
        open={showDeleteModal}
        title="Delete GPS Track"
        message="Are you sure you want to delete the GPS track for this flight? This action cannot be undone."
        onConfirm={confirmDeleteGPS}
        onCancel={cancelDeleteGPS}
        confirmText="Delete"
        cancelText="Cancel"
      />
      
      {/* Flight Path Parameters Modal */}
      <ConfirmModal
        open={showFlightPathModal}
        title="Flight Path Parameters"
        onConfirm={handleFlightPathSubmit}
        onCancel={() => setShowFlightPathModal(false)}
        confirmText="Calculate"
        cancelText="Cancel"
        message={
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Please provide the initial departing heading and median speed for better flight path calculation.
            </p>
            
            {/* Required Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Departing Heading (0-359°) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="359"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 90"
                  value={flightPathParams.heading}
                  onChange={(e) => setFlightPathParams(prev => ({ ...prev, heading: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Median Speed (km/h) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 50"
                  value={flightPathParams.medianSpeed}
                  onChange={(e) => setFlightPathParams(prev => ({ ...prev, medianSpeed: e.target.value }))}
                />
              </div>
            </div>

            {/* Circular Boundary Parameters */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Circular Flight Boundary (Optional)
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Set a circular boundary around the takeoff point. Drone will turn when approaching this limit.
              </p>
              <div className="w-1/2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Radius from Takeoff Point (meters)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 500"
                  value={flightPathParams.circularRadius}
                  onChange={(e) => setFlightPathParams(prev => ({ ...prev, circularRadius: e.target.value }))}
                />
              </div>
            </div>

            {/* Rectangular Boundary Parameters */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Rectangular Flight Boundaries (Optional)
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Set maximum distances in meters from takeoff point. Drone will turn when approaching these limits.
                Note: Circular boundary takes priority over rectangular boundaries if both are set.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    North Boundary (meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 500"
                    value={flightPathParams.boundaryNorth}
                    onChange={(e) => setFlightPathParams(prev => ({ ...prev, boundaryNorth: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    East Boundary (meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 300"
                    value={flightPathParams.boundaryEast}
                    onChange={(e) => setFlightPathParams(prev => ({ ...prev, boundaryEast: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    South Boundary (meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 200"
                    value={flightPathParams.boundarySouth}
                    onChange={(e) => setFlightPathParams(prev => ({ ...prev, boundarySouth: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    West Boundary (meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 400"
                    value={flightPathParams.boundaryWest}
                    onChange={(e) => setFlightPathParams(prev => ({ ...prev, boundaryWest: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        }
      />

      <div className="flex items-center justify-center gap-4 h-10 mb-4">
        <ArrowButton
          direction="left"
          onClick={navigateToNextFlight}
          title="Next Flight"
          disabled={orderedFlightIds.length === 0 || currentFlightIndex <= 0}
        />
        <h1 className="text-2xl font-semibold">
          Flight Details {flight.uav?.drone_name && `- ${flight.uav.drone_name}`}
        </h1>
        <ArrowButton
          direction="right"
          onClick={navigateToPreviousFlight}
          title="Previous Flight"
          disabled={orderedFlightIds.length === 0 || currentFlightIndex >= orderedFlightIds.length - 1 || currentFlightIndex === -1}
        />
      </div>

      {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} />}
      {isLoading && <Loading message="Processing GPS data..." />}

      {hasGpsTrack ? (
        // Main layout: instruments, map, telemetry, info
        <div className="grid grid-cols-1 gap-4">
          {/* Top row: instruments and map */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Left column */}
            <div className="md:col-span-3 2xl:col-span-2 flex flex-col">
              {/* Mobile: collapsible instrument panels */}
              <div className="lg:hidden flex flex-col gap-4">
                <AccordionPanel 
                  title="Flight Instruments" 
                  isOpen={accordion.instruments} 
                  toggleOpen={() => toggleAccordion('instruments')}
                >
                  <div className="flex flex-col items-center gap-4">
                    <FlightInstruments 
                      currentGpsPoint={currentGpsPoint} 
                      size={200}
                      fullGpsData={fullGpsData}
                      currentPointIndex={currentPointIndex}
                    />
                  </div>
                </AccordionPanel>
                
                <AccordionPanel 
                  title="Signal" 
                  isOpen={accordion.signal} 
                  toggleOpen={() => toggleAccordion('signal')}
                >
                  <div className="flex flex-col items-center justify-center w-full">
                    <SignalStrengthIndicator
                      receiver_quality={currentGpsPoint?.receiver_quality ?? 0}
                      transmitter_quality={currentGpsPoint?.transmitter_quality ?? 0}
                      transmitter_power={currentGpsPoint?.transmitter_power ?? 0}
                      size={48}
                      direction="vertical"
                    />
                  </div>
                </AccordionPanel>
                
                <AccordionPanel 
                  title="Flight Control Sticks" 
                  isOpen={accordion.sticks} 
                  toggleOpen={() => toggleAccordion('sticks')}
                >
                  <div className="flex flex-row justify-center items-center gap-4 min-h-[220px]">
                    <FlightControlSticks currentGpsPoint={currentGpsPoint} size={200} />
                  </div>
                </AccordionPanel>
                
                <AccordionPanel 
                  title="Telemetry" 
                  isOpen={accordion.telemetry} 
                  toggleOpen={() => toggleAccordion('telemetry')}
                >
                  <div className="flex flex-col items-center justify-center w-full">
                    <TelemetryIndicators currentGpsPoint={currentGpsPoint} size={48} />
                  </div>
                </AccordionPanel>
              </div>
              
              {/* Desktop: instrument panels side by side */}
              <div className="hidden lg:block">
                <div
                  className="bg-gray-50 p-4 rounded-lg shadow mb-4 flex justify-center gap-4"
                  ref={instrumentsContainerRef}
                >
                  <FlightInstruments 
                    currentGpsPoint={currentGpsPoint} 
                    size={instrumentSize}
                    fullGpsData={fullGpsData}
                    currentPointIndex={currentPointIndex}
                  />
                </div>
                <div className="flex flex-row gap-4 mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg shadow flex flex-col items-center justify-center flex-[0.5] min-w-0" ref={signalContainerRef}>
                    <div className="w-full h-full flex items-center justify-center" style={{ maxHeight: controlSize * 0.9 }}>
                      <SignalStrengthIndicator
                        receiver_quality={currentGpsPoint?.receiver_quality ?? 0}
                        transmitter_quality={currentGpsPoint?.transmitter_quality ?? 0}
                        transmitter_power={currentGpsPoint?.transmitter_power ?? 0}
                        size={Math.min(signalSize, controlSize * 0.25)}
                        maxSize={90}
                        direction="vertical"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-row justify-center gap-4 flex-[2] min-w-0 items-center" ref={sticksContainerRef}>
                    <FlightControlSticks currentGpsPoint={currentGpsPoint} size={controlSize} />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col items-center flex-[0.5] min-w-0" ref={telemetryBoxRef}>
                    <TelemetryIndicators currentGpsPoint={currentGpsPoint} size={telemetrySize} />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col justify-between md:col-span-3 2xl:col-span-4" 
                 style={{ height: 'calc(100% - 1rem)' }}>
              <div className="flex-1" style={{ minHeight: '280px' }}>
                <FlightMap
                  flight={flight}
                  gpsTrack={gpsTrack}
                  departureCoords={departureCoords}
                  landingCoords={landingCoords}
                  isPlaying={isPlaying}
                  currentPointIndex={currentPointIndex}
                  resetTrigger={resetTrigger}
                  fullGpsData={fullGpsData}
                />
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <GpsAnimationControls
                  isPlaying={isPlaying}
                  startAnimation={startAnimation}
                  pauseAnimation={pauseAnimation}
                  resetAnimation={resetAnimation}
                  animationSpeed={animationSpeed}
                  changeSpeed={changeSpeed}
                  currentPointIndex={currentPointIndex}
                  trackLength={gpsTrack?.length || 0}
                  onPositionChange={handlePositionChange}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <div className="flex items-center mb-3">
                <button
                  className="text-gray-600 hover:text-gray-900 focus:outline-none mr-2"
                  onClick={() => setTelemetryOpen((v) => !v)}
                  aria-label={telemetryOpen ? 'Collapse' : 'Expand'}
                >
                  {telemetryOpen ? (
                    <span>&#x25B2;</span> // Up arrow
                  ) : (
                    <span>&#x25BC;</span> // Down arrow
                  )}
                </button>
                <h3 className="text-lg font-medium text-gray-800">Flight Telemetry</h3>
                <div className="flex-1" />
              </div>
              {telemetryOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <DataPanel title="Statistics" items={statisticsItems} />
                  <DataPanel title="Position Data" items={positionItems} />
                  <DataPanel title="Movement Data" items={movementItems} />
                  <DataPanel title="Attitude Data" items={attitudeItems} />
                </div>
              )}
            </div>
          </div>
          <div>
            <FlightInfoCard flight={flight} hasGpsTrack={true} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <FlightInfoCard flight={flight} hasGpsTrack={false} />
        </div>
      )}

      <div className="mt-6 flex justify-center gap-4 flex-wrap">
        <Button 
          onClick={() => {
            const search = location.search || '';
            navigate('/flightlog' + search);
          }} 
          variant="secondary"
        >
          Back to Flight Log
        </Button>
        
        {!gpsTrack ? (
          <>
            <Button
              onClick={handleImportGPS}
              variant="primary"
              disabled={isLoading || isCalculatingPath}
            >
              Import GPS Track
            </Button>
            <Button
              onClick={handleCalculateFlightPath}
              variant="primary"
              disabled={isLoading || isCalculatingPath || !departureCoords || !landingCoords}
              title={!departureCoords || !landingCoords ? 'Takeoff and landing coordinates required' : ''}
            >
              {isCalculatingPath ? 'Calculating...' : 'Calculate Flight Path'}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleDeleteGPS}
            variant="danger"
            disabled={isLoading}
          >
            Delete GPS Track
          </Button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv"
          onChange={handleFileChange}
        />
      </div>
    </Layout>
  );
};

export default FlightDetails;
