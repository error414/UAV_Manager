import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loading, ConfirmModal, Button, Alert, Sidebar, FlightInfoCard, AnimatedMarker, GpsAnimationControls, TelemetryPanel, AttitudeIndicator, AltitudeIndicator, VerticalSpeedIndicator, CompassIndicator, TurnCoordinator, ThrottleYawStick, ElevatorAileronStick, SignalStrengthIndicator, ReceiverBatteryIndicator, CapacityIndicator, CurrentIndicator } from '../components';
import AirspeedIndicator from '../components/instruments/analog/AirspeedIndicator';
import { useAuth, useApi } from '../utils/authUtils';
import { takeoffIcon, landingIcon, getFlightCoordinates, getMapBounds } from '../utils/mapUtils';
import { parseGPSFile, calculateGpsStatistics } from '../utils/gpsUtils';
import { GpsDataPanel } from '../components/map/GpsAnimationControls';
import ArrowButton from '../components/ui/ArrowButton';

// Ensure Leaflet default icons are properly set
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create a reusable FlightMap component to avoid duplication
const FlightMap = ({ flight, gpsTrack, departureCoords, landingCoords, isPlaying, currentPointIndex, resetTrigger, fullGpsData }) => {
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
          <Polyline
            positions={gpsTrack}
            pathOptions={{ color: 'blue', weight: 3, opacity: 0.7 }}
          />
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

const FlightDetails = () => {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const [flight, setFlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
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

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(20);
  const [resetTrigger, setResetTrigger] = useState(false);
  const intervalRef = useRef(null);
  const animationData = useRef({ loaded: false, track: null });

  const { getAuthHeaders, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, message => setAlertMessage({ type: 'error', message }));

  const memoizedFetchData = useRef(fetchData).current;
  const memoizedCheckAuth = useRef(checkAuthAndGetUser).current;

  const [telemetryOpen, setTelemetryOpen] = useState(false); // Standard: zugeklappt

  // States für mobile Accordion
  const [showInstrumentsMobile, setShowInstrumentsMobile] = useState(false);
  const [showSignalMobile, setShowSignalMobile] = useState(false);
  const [showSticksMobile, setShowSticksMobile] = useState(false);
  const [showTelemetryMobile, setShowTelemetryMobile] = useState(false);

  const instrumentsContainerRef = useRef(null);
  const [instrumentSize, setInstrumentSize] = useState(200);

  const controlsContainerRef = useRef(null);
  const [controlSize, setControlSize] = useState(200);
  const telemetryContainerRef = useRef(null);
  const [telemetrySize, setTelemetrySize] = useState(48);

  // Neue Refs für Signal, Sticks und Telemetrie
  const signalContainerRef = useRef(null);
  const sticksContainerRef = useRef(null);
  const telemetryBoxRef = useRef(null);

  const [signalSize, setSignalSize] = useState(48);

  // Dynamische Größenberechnung für die einzelnen Boxen
  useEffect(() => {
    const updateSizes = () => {
      // Signal
      if (signalContainerRef.current) {
        const width = signalContainerRef.current.offsetWidth;
        const newSize = Math.min(Math.floor((width - 16)), 64);
        setSignalSize(newSize > 32 ? newSize : 32);
      }
      // Sticks
      if (sticksContainerRef.current) {
        const width = sticksContainerRef.current.offsetWidth;
        const newSize = Math.min(Math.floor((width - 32) / 2), 220);
        setControlSize(newSize > 120 ? newSize : 120);
      }
      // Telemetrie
      if (telemetryBoxRef.current) {
        const width = telemetryBoxRef.current.offsetWidth;
        const newSize = Math.min(Math.floor((width - 16)), 64);
        setTelemetrySize(newSize > 32 ? newSize : 32);
      }
    };
    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // Dynamische Größenberechnung für Desktop
  useEffect(() => {
    const updateSize = () => {
      if (instrumentsContainerRef.current) {
        const width = instrumentsContainerRef.current.offsetWidth;
        const newSize = Math.min(Math.floor((width - 48) / 3), 220);
        setInstrumentSize(newSize > 120 ? newSize : 120); // min 120px
      }
    };
    // Initial nach dem ersten Layout
    requestAnimationFrame(updateSize);
    // Nach Sidebar-Transition nochmal prüfen (z.B. nach 250ms)
    const timeout = setTimeout(updateSize, 250);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeout);
    };
  }, [flight, gpsTrack, sidebarOpen]);

  useEffect(() => {
    const updateControlSize = () => {
      if (sticksContainerRef.current) {
        const width = sticksContainerRef.current.offsetWidth;
        const newSize = Math.min(Math.floor((width - 32) / 2), 220);
        setControlSize(newSize > 120 ? newSize : 120);
      }
    };
    // Initial nach dem ersten Layout
    requestAnimationFrame(updateControlSize);
    // Nach Sidebar-Transition nochmal prüfen (z.B. nach 250ms)
    const timeout = setTimeout(updateControlSize, 250);
    window.addEventListener('resize', updateControlSize);
    return () => {
      window.removeEventListener('resize', updateControlSize);
      clearTimeout(timeout);
    };
  }, [flight, gpsTrack, sidebarOpen]);

  useEffect(() => {
    const updateTelemetrySize = () => {
      if (telemetryContainerRef.current) {
        const width = telemetryContainerRef.current.offsetWidth;
        // 3 Telemetry-Icons nebeneinander, max 64px
        const newSize = Math.min(Math.floor((width - 32) / 3), 64);
        setTelemetrySize(newSize > 32 ? newSize : 32);
      }
    };
    updateTelemetrySize();
    window.addEventListener('resize', updateTelemetrySize);
    return () => window.removeEventListener('resize', updateTelemetrySize);
  }, []);

  // Update telemetryOpen state based on GPS track availability
  useEffect(() => {
    // Only expand when no GPS track is available
    if (!gpsTrack || gpsTrack.length === 0) {
      setTelemetryOpen(true);
    } else {
      setTelemetryOpen(false); // Ensure it's collapsed when GPS data is available
    }
  }, [gpsTrack]);

  // Add these navigation functions
  const navigateToFlight = (id) => {
    // Reset animation and data states
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentPointIndex(0);
    setResetTrigger(prev => !prev);
    setGpsTrack(null);
    setFullGpsData(null);
    setAlertMessage(null);
    animationData.current = { loaded: false, track: null };
    
    // Navigate to the new flight
    navigate(`/flightdetails/${id}`);
  };

  const navigateToPreviousFlight = () => {
    if (minFlightId !== null && Number(flightId) > minFlightId) {
      navigateToFlight(Number(flightId) - 1);
    }
  };

  const navigateToNextFlight = () => {
    if (maxFlightId !== null && Number(flightId) < maxFlightId) {
      navigateToFlight(Number(flightId) + 1);
    }
  };

  // Handle GPS import
  const handleImportGPS = () => fileInputRef.current.click();

  const handleDeleteGPS = () => setShowDeleteModal(true);

  const cancelDeleteGPS = () => setShowDeleteModal(false);

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

  // Animation controls
  const startAnimation = () => {
    if (!gpsTrack?.length) return;

    if (currentPointIndex >= gpsTrack.length - 1) setCurrentPointIndex(0);
    setIsPlaying(true);

    // Clean up previous interval if it exists
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCurrentPointIndex(prevIndex => {
        if (prevIndex >= gpsTrack.length - 1) {
          setIsPlaying(false);
          clearInterval(intervalRef.current);
          return gpsTrack.length - 1;
        }
        return prevIndex + 1;
      });
    }, 1000 / animationSpeed); // <-- now truly "entries per second"
  };

  const pauseAnimation = () => {
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resetAnimation = () => {
    pauseAnimation();
    setCurrentPointIndex(0);
    setResetTrigger(prev => !prev);
  };

  const changeSpeed = (newSpeed) => {
    setAnimationSpeed(newSpeed);
    if (isPlaying) {
      pauseAnimation();
      startAnimation();
    }
  };

  const handlePositionChange = (newPosition) => {
    if (isPlaying) {
      pauseAnimation();
    }
    setCurrentPointIndex(newPosition);
  };

  // Cleanup interval on unmount
  useEffect(() => () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Fetch flight details and GPS data
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
        
        // Get UAV data if available
        if (data.uav) {
          const uavId = data.uav?.uav_id || (!isNaN(data.uav) ? Number(data.uav) : null);
          if (uavId) {
            const uavResult = await memoizedFetchData(`/api/uavs/${uavId}/`, options);
            if (!uavResult.error && isActive) data.uav = uavResult.data;
          }
        }
        
        // Fetch GPS data if not already loaded
        if (!animationData.current.loaded) {
          const gpsResult = await memoizedFetchData(`/api/flightlogs/${flightId}/gps/`, options);
          if (!gpsResult.error && gpsResult.data?.length && isActive) {
            const trackPoints = gpsResult.data.map(p => [p.latitude, p.longitude]);
            setGpsTrack(trackPoints);
            setFullGpsData(gpsResult.data);
            setGpsStats(calculateGpsStatistics(gpsResult.data));
            animationData.current = { loaded: true, track: trackPoints };
          }
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
        }
      } catch (e) { /* ignore */ }
    };
    fetchMeta();
    return () => { isActive = false; };
  }, [fetchData]);

  const toggleSidebar = () => setSidebarOpen(v => !v);

  if (!flight) return <Loading message="Loading flight details..." />;

  const { departureCoords, landingCoords } = getFlightCoordinates(flight);
  const hasMapData = departureCoords || landingCoords || (gpsTrack?.length > 0);
  const hasGpsTrack = gpsTrack?.length > 0;

  // Get the current GPS point based on animation index
  const currentGpsPoint = fullGpsData && currentPointIndex < fullGpsData.length 
    ? fullGpsData[currentPointIndex] 
    : null;

  return (
    <div className="flex h-screen relative">
      <ConfirmModal
        open={showDeleteModal}
        title="Delete GPS Track"
        message="Are you sure you want to delete the GPS track for this flight? This action cannot be undone."
        onConfirm={confirmDeleteGPS}
        onCancel={cancelDeleteGPS}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} style={{ zIndex: 10 }} />
      <div className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="flex items-center justify-center gap-4 h-10 mb-4">
          <ArrowButton
            direction="left"
            onClick={navigateToNextFlight}
            title="Next Flight"
            disabled={maxFlightId === null || Number(flightId) >= maxFlightId}
          />
          <h1 className="text-2xl font-semibold">
            Flight Details {flight.uav?.drone_name && `- ${flight.uav.drone_name}`}
          </h1>
          <ArrowButton
            direction="right"
            onClick={navigateToPreviousFlight}
            title="Previous Flight"
            disabled={minFlightId === null || Number(flightId) <= minFlightId}
          />
        </div>

        {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} />}
        {isLoading && <Loading message="Processing GPS data..." />}

        {hasGpsTrack ? (
          // Layout: Instruments + Map (top), Live GPS Data, GPS Animation, Telemetry, Flight Info
          <div className="grid grid-cols-1 gap-4">
            {/* Top row: Instruments + Map (top), responsive */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Linke Spalte */}
              <div className="md:col-span-3 xl:col-span-2 flex flex-col">
                {/* MOBILE: Instrumente untereinander, jeder Kasten einzeln auf-/zuklappbar */}
                <div className="lg:hidden flex flex-col gap-4">
                  {/* Instruments */}
                  <div className="bg-gray-50 p-2 rounded-lg shadow mb-2">
                    <button
                      className="w-full flex items-center justify-between font-semibold text-gray-700"
                      onClick={() => setShowInstrumentsMobile(v => !v)}
                    >
                      Flight Instruments
                      <span>{showInstrumentsMobile ? '▲' : '▼'}</span>
                    </button>
                    {showInstrumentsMobile && (
                      <div className="flex flex-col items-center gap-4 mt-2">
                        <div className="flex flex-col items-center gap-4">
                          <AirspeedIndicator airspeed={currentGpsPoint?.speed || 0} size={200} />
                          <TurnCoordinator turnRate={currentGpsPoint?.yaw ? (currentGpsPoint.yaw - (fullGpsData[currentPointIndex-1]?.yaw || currentGpsPoint.yaw))*10 : 0} size={200} />
                        </div>
                        <div className="flex flex-col items-center gap-4">
                          <AttitudeIndicator pitch={currentGpsPoint?.pitch || 0} roll={currentGpsPoint?.roll || 0} size={200} />
                          <CompassIndicator heading={currentGpsPoint?.ground_course || 0} size={200} />
                        </div>
                        <div className="flex flex-col items-center gap-4">
                          <AltitudeIndicator altitude={currentGpsPoint?.altitude || 0} size={200} maxAltitude={200} />
                          <VerticalSpeedIndicator verticalSpeed={currentGpsPoint?.vertical_speed || 0} size={200} minSpeed={-15} maxSpeed={15} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Signal */}
                  <div className="bg-gray-50 p-2 rounded-lg shadow mb-2">
                    <button
                      className="w-full flex items-center justify-between font-semibold text-gray-700"
                      onClick={() => setShowSignalMobile(v => !v)}
                    >
                      Signal
                      <span>{showSignalMobile ? '▲' : '▼'}</span>
                    </button>
                    {showSignalMobile && (
                      <div className="flex flex-col items-center justify-center w-full mt-2">
                        <SignalStrengthIndicator
                          receiver_quality={currentGpsPoint?.receiver_quality ?? 0}
                          transmitter_quality={currentGpsPoint?.transmitter_quality ?? 0}
                          transmitter_power={currentGpsPoint?.transmitter_power ?? 0}
                          size={48}
                          direction="vertical"
                        />
                      </div>
                    )}
                  </div>
                  {/* Sticks */}
                  <div className="bg-gray-50 p-2 rounded-lg shadow mb-2">
                    <button
                      className="w-full flex items-center justify-between font-semibold text-gray-700"
                      onClick={() => setShowSticksMobile(v => !v)}
                    >
                      Flight Control Sticks
                      <span>{showSticksMobile ? '▲' : '▼'}</span>
                    </button>
                    {showSticksMobile && (
                      <div className="flex flex-row justify-center items-center gap-4 mt-2 min-h-[220px]">
                        <div className="flex flex-col items-center gap-4">
                          <ThrottleYawStick throttle={currentGpsPoint?.throttle ?? 0} yaw={currentGpsPoint?.rudder ?? 0} size={200} />
                        </div>
                        <ElevatorAileronStick elevator={currentGpsPoint?.elevator ?? 0} aileron={currentGpsPoint?.aileron ?? 0} size={200} />
                      </div>
                    )}
                  </div>
                  {/* Telemetry */}
                  <div className="bg-gray-50 p-2 rounded-lg shadow mb-2">
                    <button
                      className="w-full flex items-center justify-between font-semibold text-gray-700"
                      onClick={() => setShowTelemetryMobile(v => !v)}
                    >
                      Telemetry
                      <span>{showTelemetryMobile ? '▲' : '▼'}</span>
                    </button>
                    {showTelemetryMobile && (
                      <div className="flex flex-col items-center justify-center w-full mt-2">
                        <ReceiverBatteryIndicator value={currentGpsPoint?.receiver_battery ?? 0} />
                        <CapacityIndicator value={currentGpsPoint?.capacity ?? 0} />
                        <CurrentIndicator value={currentGpsPoint?.current ?? 0} />
                      </div>
                    )}
                  </div>
                </div>
                {/* DESKTOP: Instrumente nebeneinander wie gehabt */}
                <div className="hidden lg:block">
                  {/* Flight Instruments */}
                  <div
                    className="bg-gray-50 p-4 rounded-lg shadow mb-4 flex justify-center gap-4"
                    ref={instrumentsContainerRef}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <AirspeedIndicator airspeed={currentGpsPoint?.speed || 0} size={instrumentSize} />
                      <TurnCoordinator turnRate={currentGpsPoint?.yaw ? (currentGpsPoint.yaw - (fullGpsData[currentPointIndex-1]?.yaw || currentGpsPoint.yaw))*10 : 0} size={instrumentSize} />
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <AttitudeIndicator pitch={currentGpsPoint?.pitch || 0} roll={currentGpsPoint?.roll || 0} size={instrumentSize} />
                      <CompassIndicator heading={currentGpsPoint?.ground_course || 0} size={instrumentSize} />
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <AltitudeIndicator altitude={currentGpsPoint?.altitude || 0} size={instrumentSize} maxAltitude={200} />
                      <VerticalSpeedIndicator verticalSpeed={currentGpsPoint?.vertical_speed || 0} size={instrumentSize} minSpeed={-15} maxSpeed={15} />
                    </div>
                  </div>
                  {/* Signal, Sticks, Telemetry nebeneinander */}
                  <div className="flex flex-row gap-4 mb-4">
                    {/* Signal */}
                    <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col items-center flex-[0.5] min-w-0" ref={signalContainerRef}>
                      <div className="flex flex-col items-center justify-center w-full mt-2">
                        <SignalStrengthIndicator
                          receiver_quality={currentGpsPoint?.receiver_quality ?? 0}
                          transmitter_quality={currentGpsPoint?.transmitter_quality ?? 0}
                          transmitter_power={currentGpsPoint?.transmitter_power ?? 0}
                          size={signalSize}
                          direction="vertical"
                        />
                      </div>
                    </div>
                    {/* Sticks */}
                    <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-row justify-center gap-4 flex-[2] min-w-0 items-center" ref={sticksContainerRef}>
                      <div className="flex flex-col items-center gap-2 min-w-0">
                        <ThrottleYawStick throttle={currentGpsPoint?.throttle ?? 0} yaw={currentGpsPoint?.rudder ?? 0} size={controlSize} />
                        <div className="text-xs text-gray-600 mt-1">
                          T: {currentGpsPoint?.throttle ?? 0} Y: {currentGpsPoint?.rudder ?? 0}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-0">
                        <ElevatorAileronStick elevator={currentGpsPoint?.elevator ?? 0} aileron={currentGpsPoint?.aileron ?? 0} size={controlSize} />
                        <div className="text-xs text-gray-600 mt-1">
                          E: {currentGpsPoint?.elevator ?? 0} A: {currentGpsPoint?.aileron ?? 0}
                        </div>
                      </div>
                    </div>
                    {/* Telemetry */}
                    <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col items-center flex-[0.5] min-w-0" ref={telemetryBoxRef}>
                      <div className="flex flex-col items-center justify-center w-full mt-10">
                        <ReceiverBatteryIndicator value={currentGpsPoint?.receiver_battery ?? 0} size={telemetrySize} />
                        <CapacityIndicator value={currentGpsPoint?.capacity ?? 0} size={telemetrySize} />
                        <CurrentIndicator value={currentGpsPoint?.current ?? 0} size={telemetrySize} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Map View */}
              <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col md:col-span-3 xl:col-span-4" style={{ minHeight: '400px' }}>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Map View</h3>
                <div className="flex-1" style={{ minHeight: '350px' }}>
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
              </div>
            </div>
            {/* GPS Track Animation - full width, now above Telemetry */}
            <div>
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
            {/* Flight Telemetry - full width with 3 equal blocks */}
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
                  {/* Platzhalter für rechtsbündige Elemente, falls nötig */}
                  <div className="flex-1" />
                </div>
                {telemetryOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Statistics Block */}
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <h4 className="text-md font-medium text-gray-700 mb-2">Statistics</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Altitude:</span> {gpsStats.minAltitude?.toFixed(1) || 'N/A'} - {gpsStats.maxAltitude?.toFixed(1) || 'N/A'} m</p>
                        <p><span className="font-medium">Speed:</span> {gpsStats.minSpeed?.toFixed(1) || 'N/A'} - {gpsStats.maxSpeed?.toFixed(1) || 'N/A'} km/h</p>
                        <p><span className="font-medium">Vertical Speed:</span> {gpsStats.minVerticalSpeed?.toFixed(1) || 'N/A'} - {gpsStats.maxVerticalSpeed?.toFixed(1) || 'N/A'} m/s</p>
                        <p><span className="font-medium">Satellites:</span> {gpsStats.minSatellites || 'N/A'} - {gpsStats.maxSatellites || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Telemetry Block 1 */}
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <h4 className="text-md font-medium text-gray-700 mb-2">Position Data</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Latitude:</span> {currentGpsPoint?.latitude?.toFixed(6) || 'N/A'}</p>
                        <p><span className="font-medium">Longitude:</span> {currentGpsPoint?.longitude?.toFixed(6) || 'N/A'}</p>
                        <p><span className="font-medium">Satellites:</span> {currentGpsPoint?.num_sat || 'N/A'}</p>
                        <p><span className="font-medium">Timestamp:</span> {currentGpsPoint?.timestamp || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Telemetry Block 2 */}
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <h4 className="text-md font-medium text-gray-700 mb-2">Movement Data</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Speed:</span> {currentGpsPoint?.speed?.toFixed(1) || 'N/A'} km/h</p>
                        <p><span className="font-medium">Vertical Speed:</span> {currentGpsPoint?.vertical_speed?.toFixed(1) || 'N/A'} m/s</p>
                        <p><span className="font-medium">Altitude:</span> {currentGpsPoint?.altitude?.toFixed(1) || 'N/A'} m</p>
                        <p><span className="font-medium">Ground Course:</span> {currentGpsPoint?.ground_course?.toFixed(1) || 'N/A'}°</p>
                      </div>
                    </div>
                    
                    {/* Telemetry Block 3 */}
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <h4 className="text-md font-medium text-gray-700 mb-2">Attitude Data</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Pitch:</span> {currentGpsPoint?.pitch?.toFixed(1) || 'N/A'}°</p>
                        <p><span className="font-medium">Roll:</span> {currentGpsPoint?.roll?.toFixed(1) || 'N/A'}°</p>
                        <p><span className="font-medium">Yaw:</span> {currentGpsPoint?.yaw?.toFixed(1) || 'N/A'}°</p>
                        <p><span className="font-medium">Heading:</span> {currentGpsPoint?.ground_course?.toFixed(1) || 'N/A'}°</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Flight Information - single card with sections */}
            <div>
              <FlightInfoCard flight={flight} hasGpsTrack={true} />
            </div>
          </div>
        ) : (
          // Modified layout when no GPS track is available - only show FlightInfoCard
          <div className="grid grid-cols-1 gap-6">
            <FlightInfoCard flight={flight} hasGpsTrack={false} />
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <Button 
            onClick={() => navigate('/flightlog')} 
            variant="secondary"
          >
            Back to Flight Log
          </Button>
          
          {!gpsTrack ? (
            <Button
              onClick={handleImportGPS}
              variant="primary"
              disabled={isLoading}
            >
              Import GPS Track
            </Button>
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
      </div>
    </div>
  );
};

export default FlightDetails;
