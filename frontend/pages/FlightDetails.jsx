import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import { Loading, ConfirmModal } from '../components';
import Alert from '../components/Alert';

// Helper functions
const getUavId = (uav) => {
  if (!uav) return null;
  if (typeof uav === 'object' && uav.uav_id) return uav.uav_id;
  if (!isNaN(uav)) return Number(uav);
  return null;
};

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('No authentication token found');
  return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
};

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Define custom icons for takeoff and landing
const takeoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const landingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const FlightDetails = () => {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const [flight, setFlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [gpsTrack, setGpsTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const fileInputRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchFlightDetails = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return navigate('/login');
      try {
        const response = await fetch(`${API_URL}/api/flightlogs/${flightId}/`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch flight details');
        const data = await response.json();

        const fetches = [];
        if (data.uav) {
          const uavId = getUavId(data.uav);
          if (uavId) {
            fetches.push(
              fetchWithAuth(`${API_URL}/api/uavs/${uavId}/`)
                .then(r => r.json())
                .then(uavData => { data.uav = uavData; })
                .catch(console.error)
            );
          }
        }
        fetches.push(
          fetchWithAuth(`${API_URL}/api/flightlogs/${flightId}/gps/`)
            .then(r => r.json())
            .then(gpsData => {
              if (gpsData?.length) setGpsTrack(gpsData.map(p => [p.latitude, p.longitude]));
            })
            .catch(console.error)
        );
        await Promise.all(fetches);
        setFlight(data);
      } catch (error) {
        console.error('Error fetching flight details:', error);
      }
    };
    fetchFlightDetails();
  }, [API_URL, flightId, navigate]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const extractCoordinates = (str) => {
    if (!str) return null;
    const match = str.match(/(\d+\.\d+)\s*,\s*(\d+\.\d+)/);
    return match ? { lat: +match[1], lon: +match[2] } : null;
  };

  const getCoordinates = () => {
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

  const handleImportGPS = () => fileInputRef.current.click();

  const parseGPSFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        if (!csvText?.trim()) return reject(new Error('Die Datei ist leer.'));
        const rows = csvText.split('\n').filter(r => r.trim().length > 0);
        if (rows.length < 2) return reject(new Error('Die Datei enthält keine Datenzeilen.'));
        const header = rows[0];
        const headerColumns = header.split(',').map(col => col.trim().toLowerCase());
        // Flexible Header-Erkennung
        const latIndex = headerColumns.findIndex(col => col === 'latitude' || col === 'lat' || col.includes('gps_coord[0]') || col.includes('lat'));
        const lonIndex = headerColumns.findIndex(col => col === 'longitude' || col === 'lon' || col.includes('gps_coord[1]') || col.includes('lon'));
        const timeIndex = headerColumns.findIndex(col => col.includes('time'));
        const altIndex = headerColumns.findIndex(col => col.includes('alt'));
        const satIndex = headerColumns.findIndex(col => col.includes('sat'));
        const speedIndex = headerColumns.findIndex(col => col.includes('speed'));
        const courseIndex = headerColumns.findIndex(col => col.includes('course'));
        if (latIndex === -1 || lonIndex === -1) return reject(new Error('Keine gültigen GPS-Koordinaten gefunden.'));
        const trackPoints = [], gpsData = [];
        rows.slice(1).forEach((row) => {
          const columns = row.trim().split(',').map(col => col.trim());
          if (columns.length <= Math.max(latIndex, lonIndex)) return;
          const lat = parseFloat(columns[latIndex]);
          const lon = parseFloat(columns[lonIndex]);
          if (!isNaN(lat) && !isNaN(lon)) {
            trackPoints.push([lat, lon]);
            const gpsPoint = {
              latitude: lat,
              longitude: lon,
              timestamp: timeIndex !== -1 && columns[timeIndex] ? parseInt(columns[timeIndex], 10) || 0 : 0,
            };
            if (altIndex !== -1 && columns[altIndex]) gpsPoint.altitude = parseFloat(columns[altIndex]);
            if (satIndex !== -1 && columns[satIndex]) gpsPoint.num_sat = parseInt(columns[satIndex], 10);
            if (speedIndex !== -1 && columns[speedIndex]) gpsPoint.speed = parseFloat(columns[speedIndex]);
            if (courseIndex !== -1 && columns[courseIndex]) gpsPoint.ground_course = parseFloat(columns[courseIndex]);
            gpsData.push(gpsPoint);
          }
        });
        if (!trackPoints.length) return reject(new Error('Keine gültigen GPS-Koordinaten in der Datei gefunden.'));
        resolve({ trackPoints, gpsData });
      } catch (err) {
        reject(new Error(`Fehler beim Parsen der GPS-Daten: ${err.message || 'Unbekannter Fehler'}`));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
    reader.readAsText(file);
  });

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setAlertMessage(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setAlertMessage({ type: 'error', message: 'Bitte wähle eine CSV-Datei aus.' });
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAlertMessage({ type: 'error', message: 'Dateigröße überschreitet das 10MB-Limit.' });
      event.target.value = '';
      return;
    }
    setIsLoading(true);
    try {
      // Keine Vorab-Validierung, direkt parseGPSFile nutzen
      const { trackPoints, gpsData } = await parseGPSFile(file);
      setGpsTrack(trackPoints);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/flightlogs/${flightId}/gps/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ gps_data: gpsData })
      });
      if (!response.ok) throw new Error((await response.json()).detail || 'Fehler beim Speichern der GPS-Daten.');
      setAlertMessage({ type: 'success', message: `Erfolgreich ${trackPoints.length} GPS-Punkte importiert und gespeichert.` });
    } catch (error) {
      setAlertMessage({ type: 'error', message: `Fehler: ${error.message || 'Ungültige oder nicht unterstützte Datei.'}` });
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleDeleteGPS = () => setShowDeleteModal(true);

  const confirmDeleteGPS = async () => {
    setShowDeleteModal(false);
    setIsLoading(true);
    setAlertMessage(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/flightlogs/${flightId}/gps/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error((await response.json()).detail || 'Failed to delete GPS data');
      setGpsTrack(null);
      setAlertMessage({ type: 'success', message: 'Successfully deleted GPS track' });
    } catch (error) {
      setAlertMessage({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeleteGPS = () => setShowDeleteModal(false);

  if (!flight) return <Loading message="Loading flight details..." />;

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

        {alertMessage && (
          <Alert type={alertMessage.type} className="mb-4">
            {alertMessage.message}
          </Alert>
        )}

        {isLoading && <Loading message="Processing GPS data..." />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Flight Information</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Drone Name:</span>
                  <span className="text-gray-900">{flight.uav?.drone_name || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Manufacturer:</span>
                  <span className="text-gray-900">{flight.uav?.manufacturer || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Type:</span>
                  <span className="text-gray-900">{flight.uav?.type || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Motors:</span>
                  <span className="text-gray-900">{flight.uav?.motors || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Type of Motor:</span>
                  <span className="text-gray-900">{flight.uav?.motor_type || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Registration Number:</span>
                  <span className="text-gray-900">{flight.uav?.registration_number || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Serial Number:</span>
                  <span className="text-gray-900">{flight.uav?.serial_number || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">OPS Conditions:</span>
                  <span className="text-gray-900">{flight.ops_conditions || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Pilot Type:</span>
                  <span className="text-gray-900">{flight.pilot_type || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Landings:</span>
                  <span className="text-gray-900">{flight.landings || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Flight Time:</span>
                  <span className="text-gray-900">{flight.flight_duration ? `${Math.floor(flight.flight_duration / 60)}min ${flight.flight_duration % 60}s` : 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Departure Place:</span>
                  <span className="text-gray-900">{flight.departure_place || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Landing Place:</span>
                  <span className="text-gray-900">{flight.landing_place || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Date:</span>
                  <span className="text-gray-900">{flight.departure_date || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Departure Time:</span>
                  <span className="text-gray-900">{flight.departure_time || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Landing Time:</span>
                  <span className="text-gray-900">{flight.landing_time || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Flight Duration:</span>
                  <span className="text-gray-900">{flight.flight_duration || 'N/A'} seconds</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg shadow flex flex-col" style={{ height: '100%', minHeight: '400px' }}>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Map View</h3>
            <div className="flex-1" style={{ minHeight: '350px' }}>
              {(() => {
                const { departureCoords, landingCoords } = getCoordinates();
                return (departureCoords || landingCoords || (gpsTrack && gpsTrack.length > 0)) ? (
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
                    <p>Keine GPS-Daten verfügbar für diesen Flug</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={() => navigate('/flightlog')} className="bg-blue-500 hover:bg-blue-600 text-white">
            Back to Flight Log
          </Button>
          {!gpsTrack && (
            <Button
              onClick={handleImportGPS}
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={isLoading}
            >
              Import GPS Track
            </Button>
          )}
          {gpsTrack && (
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
