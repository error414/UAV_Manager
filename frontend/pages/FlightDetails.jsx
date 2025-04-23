import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loading, ConfirmModal, Button, Alert, Sidebar } from '../components';
import { useAuth, useApi } from '../utils/authUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const takeoffIcon = createIcon('green');
const landingIcon = createIcon('red');

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

const calculateBearing = (start, end) => {
  const startLat = start.lat * Math.PI / 180;
  const startLng = start.lng * Math.PI / 180;
  const endLat = end.lat * Math.PI / 180;
  const endLng = end.lng * Math.PI / 180;

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
};

const FlightDetails = () => {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const [flight, setFlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [gpsTrack, setGpsTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(20);
  const [resetTrigger, setResetTrigger] = useState(false);
  const animationRef = useRef(null);
  const lastFrameTime = useRef(0);
  const animationData = useRef({ loaded: false, track: null });

  const { getAuthHeaders, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, message => setAlertMessage({ type: 'error', message }));

  const parseGPSFile = async (file) => {
    const csvText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error reading the file.'));
      reader.readAsText(file);
    });
    if (!csvText?.trim()) throw new Error('The file is empty.');
    const rows = csvText.split('\n').filter(r => r.trim());
    if (rows.length < 2) throw new Error('The file contains no data rows.');
    const header = rows[0].trim();
    const expectedHeader = 'time (us), GPS_numSat, GPS_coord[0], GPS_coord[1], GPS_altitude, GPS_speed (m/s), GPS_ground_course';
    if (header !== expectedHeader) throw new Error('The file header does not match the expected format:\n' + `"${expectedHeader}"`);
    const headerColumns = header.split(',').map(col => col.trim().toLowerCase());
    const idx = name => headerColumns.findIndex(col => col === name);
    const indexMap = {
      lat: idx('gps_coord[0]'),
      lon: idx('gps_coord[1]'),
      time: idx('time (us)'),
      alt: idx('gps_altitude'),
      sat: idx('gps_numsat'),
      speed: idx('gps_speed (m/s)'),
      course: idx('gps_ground_course')
    };
    if (indexMap.lat === -1 || indexMap.lon === -1) throw new Error('No valid GPS coordinates found.');
    const trackPoints = [], gpsData = [];
    rows.slice(1).forEach(row => {
      const columns = row.trim().split(',').map(col => col.trim());
      if (columns.length <= Math.max(indexMap.lat, indexMap.lon)) return;
      const lat = parseFloat(columns[indexMap.lat]), lon = parseFloat(columns[indexMap.lon]);
      if (!isNaN(lat) && !isNaN(lon)) {
        trackPoints.push([lat, lon]);
        const gpsPoint = { latitude: lat, longitude: lon, timestamp: indexMap.time !== -1 && columns[indexMap.time] ? parseInt(columns[indexMap.time], 10) || 0 : 0 };
        if (indexMap.alt !== -1 && columns[indexMap.alt]) gpsPoint.altitude = parseFloat(columns[indexMap.alt]);
        if (indexMap.sat !== -1 && columns[indexMap.sat]) gpsPoint.num_sat = parseInt(columns[indexMap.sat], 10);
        if (indexMap.speed !== -1 && columns[indexMap.speed]) gpsPoint.speed = parseFloat(columns[indexMap.speed]);
        if (indexMap.course !== -1 && columns[indexMap.course]) gpsPoint.ground_course = parseFloat(columns[indexMap.course]);
        gpsData.push(gpsPoint);
      }
    });
    if (!trackPoints.length) throw new Error('No valid GPS coordinates found in the file.');
    return { trackPoints, gpsData };
  };

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

  const startAnimation = () => {
    if (!gpsTrack?.length) return;
    if (currentPointIndex >= gpsTrack.length - 1) setCurrentPointIndex(0);
    setIsPlaying(true);
    let playing = true;
    if (!animationData.current.loaded) animationData.current = { loaded: true, track: gpsTrack };
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    lastFrameTime.current = null;
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
    if (newSpeed > 50) console.warn('High animation speeds may cause performance issues');
    setAnimationSpeed(newSpeed);
    if (isPlaying) {
      pauseAnimation();
      startAnimation();
    }
  };

  useEffect(() => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      lastFrameTime.current = 0;
    }
  }, []);

  const getUavId = (uav) => (uav?.uav_id ? uav.uav_id : !isNaN(uav) ? Number(uav) : null);

  const extractCoordinates = (str) => {
    const match = str?.match(/(\d+\.\d+)\s*,\s*(\d+\.\d+)/);
    return match ? { lat: +match[1], lon: +match[2] } : null;
  };

  useEffect(() => {
    let isActive = true;
    const fetchFlightDetails = async () => {
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      try {
        const result = await fetchData(`/api/flightlogs/${flightId}/`);
        if (result.error || !isActive) return;
        const data = result.data;
        if (data.uav) {
          const uavId = getUavId(data.uav);
          if (uavId) {
            const uavResult = await fetchData(`/api/uavs/${uavId}/`);
            if (!uavResult.error && isActive) data.uav = uavResult.data;
          }
        }
        if (!animationData.current.loaded) {
          const gpsResult = await fetchData(`/api/flightlogs/${flightId}/gps/`);
          if (!gpsResult.error && gpsResult.data?.length && isActive) {
            const trackPoints = gpsResult.data.map(p => [p.latitude, p.longitude]);
            setGpsTrack(trackPoints);
            animationData.current = { loaded: true, track: trackPoints };
          }
        }
        if (isActive) setFlight(data);
      } catch {
        if (isActive) setAlertMessage({ type: 'error', message: 'Failed to load flight details' });
      }
    };
    fetchFlightDetails();
    return () => { isActive = false; };
  }, [API_URL, flightId, fetchData, checkAuthAndGetUser]);

  const getCoordinates = () => {
    if (!flight) return { departureCoords: null, landingCoords: null };
    const dep = flight.departure_lat && flight.departure_lon
      ? [flight.departure_lat, flight.departure_lon]
      : extractCoordinates(flight.departure_place) && [extractCoordinates(flight.departure_place).lat, extractCoordinates(flight.departure_place).lon];
    const land = flight.landing_lat && flight.landing_lon
      ? [flight.landing_lat, flight.landing_lon]
      : extractCoordinates(flight.landing_place) && [extractCoordinates(flight.landing_place).lat, extractCoordinates(flight.landing_place).lon];
    return { departureCoords: dep || null, landingCoords: land || null };
  };

  const getBounds = () => {
    const { departureCoords, landingCoords } = getCoordinates();
    const points = [departureCoords, landingCoords].filter(Boolean);
    if (!points.length) return [[0, 0], [0, 0]];
    if (points.length === 1) {
      const [lat, lng] = points[0];
      return [[lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01]];
    }
    return points;
  };

  const toggleSidebar = () => setSidebarOpen(v => !v);

  if (!flight) return <Loading message="Loading flight details..." />;

  const flightDurationFormatted = flight.flight_duration
    ? `${Math.floor(flight.flight_duration / 60)}min ${flight.flight_duration % 60}s`
    : 'N/A';

  const { departureCoords, landingCoords } = getCoordinates();
  const hasMapData = departureCoords || landingCoords || (gpsTrack?.length > 0);
  const hasGpsTrack = gpsTrack?.length > 0;

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Flight Information</h3>
              <div className="space-y-2">
                {[
                  ['Drone Name', flight.uav?.drone_name],
                  ['Manufacturer', flight.uav?.manufacturer],
                  ['Type', flight.uav?.type],
                  ['Motors', flight.uav?.motors],
                  ['Type of Motor', flight.uav?.motor_type],
                  ['Registration Number', flight.uav?.registration_number],
                  ['Serial Number', flight.uav?.serial_number],
                  ['OPS Conditions', flight.ops_conditions],
                  ['Pilot Type', flight.pilot_type],
                  ['Landings', flight.landings],
                  ['Total Flight Time', flightDurationFormatted],
                  ['Departure Place', flight.departure_place],
                  ['Landing Place', flight.landing_place],
                  ['Date', flight.departure_date],
                  ['Departure Time', flight.departure_time],
                  ['Landing Time', flight.landing_time],
                  ['Flight Duration', `${flight.flight_duration || 'N/A'} seconds`]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center">
                    <span className="font-semibold text-gray-700 w-40">{label}:</span>
                    <span className="text-gray-900">{value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col" style={{ height: '100%', minHeight: '400px' }}>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Map View</h3>
            <div className="flex-1" style={{ minHeight: '350px' }}>
              {hasMapData ? (
                <>
                  <MapContainer
                    bounds={hasGpsTrack ? gpsTrack : getBounds()}
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
                    {hasGpsTrack && (
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
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500 rounded-lg">
                  <p>No GPS data available for this flight</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={() => navigate('/flightlog')} className="bg-blue-500 hover:bg-blue-600 text-white">
            Back to Flight Log
          </Button>
          {!gpsTrack ? (
            <Button
              onClick={handleImportGPS}
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={isLoading}
            >
              Import GPS Track
            </Button>
          ) : (
            <Button
              onClick={handleDeleteGPS}
              className="bg-red-500 hover:bg-red-600 text-white"
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

        {hasGpsTrack && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-800 mb-3">GPS Track Animation</h3>
            <div className="flex flex-wrap gap-4 justify-center items-center">
              <div className="flex gap-2">
                {!isPlaying ? (
                  <Button onClick={startAnimation} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2">
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Play
                    </span>
                  </Button>
                ) : (
                  <Button onClick={pauseAnimation} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2">
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Pause
                    </span>
                  </Button>
                )}
                <Button onClick={resetAnimation} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Reset
                  </span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Animation Speed:</span>
                <select 
                  value={animationSpeed} 
                  onChange={e => changeSpeed(Number(e.target.value))}
                  className="border rounded px-3 py-2"
                >
                  <option value={1}>Slow (1x)</option>
                  <option value={2}>Normal (2x)</option>
                  <option value={5}>Fast (5x)</option>
                  <option value={10}>Very Fast (10x)</option>
                  <option value={20}>Super Fast (20x)</option>
                  <option value={50}>Ultra Fast (50x)</option>
                  <option value={75}>Max Speed (75x)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 w-full">
              <div className="h-2 w-full bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${gpsTrack.length ? (currentPointIndex / (gpsTrack.length - 1)) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Start</span>
                <span>Position: {currentPointIndex} / {gpsTrack.length - 1}</span>
                <span>End</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightDetails;
