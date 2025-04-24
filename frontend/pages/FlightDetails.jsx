import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loading, ConfirmModal, Button, Alert, Sidebar, FlightInfoCard, AnimatedMarker, GpsAnimationControls } from '../components';
import { useAuth, useApi } from '../utils/authUtils';
import { takeoffIcon, landingIcon, getFlightCoordinates, getMapBounds } from '../utils/mapUtils';
import { parseGPSFile, calculateGpsStatistics } from '../utils/gpsUtils';
import { GpsDataPanel } from '../components/map/GpsAnimationControls';

// Ensure Leaflet default icons are properly set
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create a reusable FlightMap component to avoid duplication
const FlightMap = ({ flight, gpsTrack, departureCoords, landingCoords, isPlaying, currentPointIndex, resetTrigger }) => {
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
    maxSatellites: null,
    minSatellites: null
  });

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(20);
  const [resetTrigger, setResetTrigger] = useState(false);
  const animationRef = useRef(null);
  const lastFrameTime = useRef(0);
  const animationData = useRef({ loaded: false, track: null });

  const { getAuthHeaders, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, message => setAlertMessage({ type: 'error', message }));

  const memoizedFetchData = useRef(fetchData).current;
  const memoizedCheckAuth = useRef(checkAuthAndGetUser).current;

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
    if (!animationData.current.loaded) animationData.current = { loaded: true, track: gpsTrack };
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    lastFrameTime.current = null;
    let playing = true;
    
    const animate = (timestamp) => {
      if (!lastFrameTime.current) {
        lastFrameTime.current = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      const elapsed = timestamp - lastFrameTime.current;
      lastFrameTime.current = timestamp;
      const pointsToMove = Math.max(1, Math.min(Math.floor(elapsed * animationSpeed / 100), 10));
      setCurrentPointIndex(prevIndex => {
        const newIndex = prevIndex + pointsToMove;
        if (newIndex >= gpsTrack.length - 1) {
          playing = false;
          setIsPlaying(false);
          return gpsTrack.length - 1;
        }
        return newIndex;
      });
      if (playing) animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
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

  // Cleanup animation frame on unmount
  useEffect(() => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      lastFrameTime.current = 0;
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
        if (data.uav) {
          const uavId = data.uav?.uav_id ? data.uav.uav_id : !isNaN(data.uav) ? Number(data.uav) : null;
          if (uavId) {
            const uavResult = await memoizedFetchData(`/api/uavs/${uavId}/`, options);
            if (!uavResult.error && isActive) data.uav = uavResult.data;
          }
        }
        
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
        <div className="flex items-center h-10 mb-4">
          <h1 className="text-2xl font-semibold text-center flex-1">Flight Details</h1>
        </div>

        {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} />}
        {isLoading && <Loading message="Processing GPS data..." />}

        {hasGpsTrack && (isPlaying || currentPointIndex > 0) ? (
          // Three column layout when GPS data is active
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* Flight Information - 2/6 width */}
            <div className="lg:col-span-2">
              <FlightInfoCard flight={flight} />
            </div>
            
            {/* Live GPS Data - 1/6 width with matching height */}
            <div className="lg:col-span-1 flex">
              <GpsDataPanel 
                gpsPoint={currentGpsPoint} 
                gpsStats={gpsStats}
              />
            </div>
            
            {/* Map View - 3/6 width */}
            <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col lg:col-span-3" style={{ minHeight: '400px' }}>
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
                />
              </div>
            </div>
          </div>
        ) : (
          // Original two column layout when no GPS data or animation is not active
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FlightInfoCard flight={flight} />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col" style={{ height: '100%', minHeight: '400px' }}>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Map View</h3>
              <div className="flex-1" style={{ minHeight: '350px' }}>
                {hasMapData ? (
                  <FlightMap
                    flight={flight}
                    gpsTrack={gpsTrack}
                    departureCoords={departureCoords}
                    landingCoords={landingCoords}
                    isPlaying={isPlaying}
                    currentPointIndex={currentPointIndex}
                    resetTrigger={resetTrigger}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500 rounded-lg">
                    <p>No GPS data available for this flight</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          {!gpsTrack ? (
            <Button
              onClick={handleImportGPS}
              variant="success"
              disabled={isLoading}
            >
              Import GPS Track
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        {hasGpsTrack && (
          <div className="mt-4">
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
        )}
        
        <div className="mt-6 flex justify-center gap-4">
          <Button 
            onClick={() => navigate('/flightlog')} 
            variant="secondary"
          >
            Back to Flight Log
          </Button>
          {gpsTrack && (
            <Button
              onClick={handleDeleteGPS}
              variant="danger"
              disabled={isLoading}
            >
              Delete GPS Track
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightDetails;
