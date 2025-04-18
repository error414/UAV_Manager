import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';

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

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchFlightDetails = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/flightlogs/${flightId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch flight details');
        const data = await response.json();
        
        // Fetch UAV details if available - handle different possible structures
        let uavId = null;
        
        if (data.uav) {
          // Case 1: data.uav is an object with uav_id property
          if (typeof data.uav === 'object' && data.uav.uav_id) {
            uavId = data.uav.uav_id;
          } 
          // Case 2: data.uav is just the ID itself
          else if (typeof data.uav === 'number' || (typeof data.uav === 'string' && !isNaN(data.uav))) {
            uavId = data.uav;
          }
          
          if (uavId) {
            const uavResponse = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (uavResponse.ok) {
              const uavData = await uavResponse.json();
              // Replace the original uav reference with detailed data
              data.uav = uavData;
            }
          }
        }

        setFlight(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchFlightDetails();
  }, [API_URL, flightId, navigate]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Function to extract coordinates from string if they appear to be GPS coordinates
  const extractCoordinates = (str) => {
    if (!str) return null;
    
    // Match a pattern like "47.184693,8.664236" or "47.184693, 8.664236"
    const coordRegex = /(\d+\.\d+)\s*,\s*(\d+\.\d+)/;
    const match = str.match(coordRegex);
    
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2])
      };
    }
    return null;
  };

  // Get coordinates from either direct lat/lon fields or from place strings
  const getCoordinates = () => {
    const result = {
      departureCoords: null,
      landingCoords: null
    };
    
    // First try to use the explicit lat/lon fields
    if (flight.departure_lat && flight.departure_lon) {
      result.departureCoords = [flight.departure_lat, flight.departure_lon];
    } 
    // Otherwise try to extract from departure_place if it looks like coordinates
    else {
      const extractedDept = extractCoordinates(flight.departure_place);
      if (extractedDept) {
        result.departureCoords = [extractedDept.lat, extractedDept.lon];
      }
    }
    
    // Same for landing coordinates
    if (flight.landing_lat && flight.landing_lon) {
      result.landingCoords = [flight.landing_lat, flight.landing_lon];
    } else {
      const extractedLand = extractCoordinates(flight.landing_place);
      if (extractedLand) {
        result.landingCoords = [extractedLand.lat, extractedLand.lon];
      }
    }
    
    return result;
  };

  const getBounds = () => {
    const { departureCoords, landingCoords } = getCoordinates();
    const points = [];
    
    if (departureCoords) {
      points.push(departureCoords);
    }
    
    if (landingCoords) {
      points.push(landingCoords);
    }
    
    // If no points are available, use default position
    if (points.length === 0) {
      return [[0, 0], [0, 0]]; // Default value
    }
    
    // If only one point is available, create a small area around it
    if (points.length === 1) {
      const [lat, lng] = points[0];
      return [[lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01]];
    }
    
    return points;
  };

  if (!flight) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading flight details...</p>
      </div>
    );
  }

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

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} style={{ zIndex: 10 }} />
      <div className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="flex items-center h-10 mb-4">
          <h1 className="text-2xl font-semibold text-center flex-1">Flight Details</h1>
        </div>

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
                return (departureCoords || landingCoords) ? (
                  <MapContainer
                    bounds={getBounds()}
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
                          <strong>Takeoff:</strong> {flight.departure_place || 'N/A'}<br/>
                          <strong>Time:</strong> {flight.departure_time || 'N/A'}
                        </Popup>
                      </Marker>
                    )}
                    
                    {landingCoords && (
                      <Marker position={landingCoords} icon={landingIcon}>
                        <Popup>
                          <strong>Landing:</strong> {flight.landing_place || 'N/A'}<br/>
                          <strong>Time:</strong> {flight.landing_time || 'N/A'}
                        </Popup>
                      </Marker>
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

        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate('/flightlog')} className="bg-blue-500 hover:bg-blue-600 text-white">
            Back to Flight Log
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightDetails;
