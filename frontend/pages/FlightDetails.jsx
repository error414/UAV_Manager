import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loading, ConfirmModal, Button, Alert, Sidebar } from '../components';

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Define custom icons
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

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login', { replace: true });
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(url, { 
      ...options, 
      headers: { 
        ...(options.headers || {}), 
        Authorization: `Bearer ${token}` 
      } 
    });
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('access_token');
      navigate('/login', { replace: true });
      throw new Error('Authentication failed');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }
    
    return response;
  };

  const getUavId = (uav) => {
    if (!uav) return null;
    if (typeof uav === 'object' && uav.uav_id) return uav.uav_id;
    if (!isNaN(uav)) return Number(uav);
    return null;
  };

  const extractCoordinates = (str) => {
    if (!str) return null;
    const match = str.match(/(\d+\.\d+)\s*,\s*(\d+\.\d+)/);
    return match ? { lat: +match[1], lon: +match[2] } : null;
  };

  useEffect(() => {
    const fetchFlightDetails = async () => {
      try {
        const response = await fetchWithAuth(`${API_URL}/api/flightlogs/${flightId}/`);
        const data = await response.json();

        const promises = [];
        
        if (data.uav) {
          const uavId = getUavId(data.uav);
          if (uavId) {
            promises.push(
              fetchWithAuth(`${API_URL}/api/uavs/${uavId}/`)
                .then(r => r.json())
                .then(uavData => { data.uav = uavData; })
            );
          }
        }
        
        promises.push(
          fetchWithAuth(`${API_URL}/api/flightlogs/${flightId}/gps/`)
            .then(r => r.json())
            .then(gpsData => {
              if (gpsData?.length) setGpsTrack(gpsData.map(p => [p.latitude, p.longitude]));
            })
            .catch(() => {})
        );
        
        await Promise.all(promises);
        setFlight(data);
      } catch (error) {
        console.error('Error fetching flight details:', error);
      }
    };
    
    fetchFlightDetails();
  }, [API_URL, flightId, navigate]);

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

  const parseGPSFile = async (file) => {
    const csvText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error reading the file.'));
      reader.readAsText(file);
    });

    if (!csvText?.trim()) throw new Error('The file is empty.');
    
    const rows = csvText.split('\n').filter(r => r.trim().length > 0);
    if (rows.length < 2) throw new Error('The file contains no data rows.');
    
    const header = rows[0].trim();
    const expectedHeader = 'time (us), GPS_numSat, GPS_coord[0], GPS_coord[1], GPS_altitude, GPS_speed (m/s), GPS_ground_course';
    if (header !== expectedHeader) {
      throw new Error('The file header does not match the expected format:\n' +
        `"${expectedHeader}"`);
    }
    
    const headerColumns = header.split(',').map(col => col.trim().toLowerCase());
    const indexMap = {
      lat: headerColumns.findIndex(col => col === 'gps_coord[0]'),
      lon: headerColumns.findIndex(col => col === 'gps_coord[1]'),
      time: headerColumns.findIndex(col => col === 'time (us)'),
      alt: headerColumns.findIndex(col => col === 'gps_altitude'),
      sat: headerColumns.findIndex(col => col === 'gps_numsat'),
      speed: headerColumns.findIndex(col => col === 'gps_speed (m/s)'),
      course: headerColumns.findIndex(col => col === 'gps_ground_course')
    };
    
    if (indexMap.lat === -1 || indexMap.lon === -1) 
      throw new Error('No valid GPS coordinates found.');
    
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
          timestamp: indexMap.time !== -1 && columns[indexMap.time] ? parseInt(columns[indexMap.time], 10) || 0 : 0,
        };
        
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const handleImportGPS = () => fileInputRef.current.click();
  const handleDeleteGPS = () => setShowDeleteModal(true);
  const cancelDeleteGPS = () => setShowDeleteModal(false);

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
        await fetchWithAuth(`${API_URL}/api/flightlogs/${flightId}/gps/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gps_data: gpsData })
        });
        
        setAlertMessage({ type: 'success', message: `Successfully imported and saved ${trackPoints.length} GPS points.` });
      } catch (error) {
        setAlertMessage({ type: 'error', message: `Error: ${error.message || 'Invalid or unsupported file.'}` });
      } finally {
        setIsLoading(false);
        event.target.value = '';
      }
    }, 50);
  };

  const confirmDeleteGPS = async () => {
    setShowDeleteModal(false);
    setIsLoading(true);
    setAlertMessage(null);
    
    try {
      await fetchWithAuth(`${API_URL}/api/flightlogs/${flightId}/gps/`, {
        method: 'DELETE'
      });
      
      setGpsTrack(null);
      setAlertMessage({ type: 'success', message: 'Successfully deleted GPS track' });
    } catch (error) {
      setAlertMessage({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  if (!flight) return <Loading message="Loading flight details..." />;

  const flightDurationFormatted = flight.flight_duration 
    ? `${Math.floor(flight.flight_duration / 60)}min ${flight.flight_duration % 60}s` 
    : 'N/A';

  const { departureCoords, landingCoords } = getCoordinates();
  const hasMapData = departureCoords || landingCoords || (gpsTrack && gpsTrack.length > 0);

  return (
    <div className="flex h-screen relative">
      <button
        onClick={toggleSidebar}
        className="fixed top-2 left-2 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

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
                <MapContainer
                  bounds={gpsTrack && gpsTrack.length > 0 ? gpsTrack : getBounds()}
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
                  {gpsTrack && gpsTrack.length > 0 && (
                    <Polyline
                      positions={gpsTrack}
                      pathOptions={{ color: 'blue', weight: 3, opacity: 0.7 }}
                    />
                  )}
                </MapContainer>
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
      </div>
    </div>
  );
};

export default FlightDetails;
