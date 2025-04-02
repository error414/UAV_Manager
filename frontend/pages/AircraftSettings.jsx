import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar, Button } from '../components';

const AircraftSettings = () => {
  const { uavId } = useParams();
  const navigate = useNavigate();
  const [aircraft, setAircraft] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch aircraft data');
        const data = await response.json();
        setAircraft(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchAircraft();
  }, [uavId, API_URL]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleModifyClick = () => {
    navigate(`/edit-aircraft/${uavId}`);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const formatFlightHours = (hours) => {
    if (!hours) return 'N/A';
    const totalMinutes = Math.round(hours * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  if (!aircraft) return <div>Loading...</div>;

  return (
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-2 left-2 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar for mobile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className={`hidden lg:block fixed top-2 z-30 bg-gray-800 text-white p-2 rounded-md transition-all duration-300 ${
          sidebarOpen ? 'left-2' : 'left-4'
        }`}
        aria-label="Toggle sidebar for desktop"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="flex items-center h-10 mb-4">
          <div className="w-10 lg:hidden"></div>
          <h1 className="text-2xl font-semibold text-center flex-1">Aircraft Settings</h1>
        </div>
        
        {/* Inactive Aircraft Alert */}
        {aircraft.is_active === false && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p><strong>This aircraft is inactive.</strong> You must reactivate it to make changes.</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Section: General Information */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">General Information</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Drone Name:</span>
                  <span className="text-gray-900">{aircraft.drone_name || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Manufacturer:</span>
                  <span className="text-gray-900">{aircraft.manufacturer || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Type:</span>
                  <span className="text-gray-900">{aircraft.type || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section: Motors */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Motors</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Motors:</span>
                  <span className="text-gray-900">{aircraft.motors || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Type of Motor:</span>
                  <span className="text-gray-900">{aircraft.motor_type || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section: Video Information */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Video Information</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Video:</span>
                  <span className="text-gray-900">{aircraft.video || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Video System:</span>
                  <span className="text-gray-900">{aircraft.video_system || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section: Firmware and Components */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Firmware and Components</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Firmware:</span>
                  <span className="text-gray-900">{aircraft.firmware || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Firmware Version:</span>
                  <span className="text-gray-900">{aircraft.firmware_version || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">ESC:</span>
                  <span className="text-gray-900">{aircraft.esc || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">ESC Firmware:</span>
                  <span className="text-gray-900">{aircraft.esc_firmware || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Receiver:</span>
                  <span className="text-gray-900">{aircraft.receiver || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Receiver Firmware:</span>
                  <span className="text-gray-900">{aircraft.receiver_firmware || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Flight Controller:</span>
                  <span className="text-gray-900">{aircraft.flight_controller || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Section: Sensors */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Sensors</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700">GPS</span>
                  <span className="text-gray-900">{aircraft.gps || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700">MAG</span>
                  <span className="text-gray-900">{aircraft.mag || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700">BARO</span>
                  <span className="text-gray-900">{aircraft.baro || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700">GYRO</span>
                  <span className="text-gray-900">{aircraft.gyro || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700">ACC</span>
                  <span className="text-gray-900">{aircraft.acc || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section: Registration and Serial Number */}
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Registration and Serial</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Registration Number:</span>
                  <span className="text-gray-900">{aircraft.registration_number || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Serial Number:</span>
                  <span className="text-gray-900">{aircraft.serial_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section: Statistics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Flights:</span>
                  <span className="text-gray-900">{aircraft.total_flights || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Flight Hours:</span>
                  <span className="text-gray-900">{formatFlightHours(aircraft.total_flight_hours)}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Last Maintenance:</span>
                  <span className="text-gray-900">{aircraft.last_maintenance || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section: Maintenance Logs */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Maintenance Logs</h3>
              <table className="w-full text-sm text-left text-gray-500 border border-gray-200">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Log</th>
                    <th className="px-4 py-2">File</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraft.maintenance_logs?.map((log, index) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{log.date || 'N/A'}</td>
                      <td className="px-4 py-2">{log.description || 'N/A'}</td>
                      <td className="px-4 py-2">
                        {log.file ? (
                          <a href={log.file} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            View File
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <Button
            onClick={() => alert('Add Log')}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Add Log
          </Button>
          <Button
            onClick={() => alert('Export Logs')}
            className="bg-gray-500 hover:bg-gray-600 text-white"
          >
            Export Logs
          </Button>
          <Button
            onClick={handleModifyClick}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Modify Aircraft
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AircraftSettings;
