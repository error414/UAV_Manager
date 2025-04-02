import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button } from '../components';
import UAVImporter from '../helper/UAVImporter';

const AircraftList = () => {
  const navigate = useNavigate();
  const [aircrafts, setAircrafts] = useState([]);
  // Initialize sidebarOpen based on screen size - same as Flightlog
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Add resize handler to match Flightlog behavior
  useEffect(() => {
    const handleResize = () => {
      // For desktop: automatically show sidebar
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } 
      // For mobile: automatically hide sidebar
      else {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Get API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL;
  
  // Function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  };
  
  // State for filters - based on UAV model fields
  const [filters, setFilters] = useState({
    drone_name: '',
    manufacturer: '',
    type: '',
    motors: '',
    motor_type: '',
    ldg: '', // This might need to be calculated or added to the model
    firmware_version: '',
    video_system: '',
    gps: '',
    mag: '',
    baro: '',
    gyro: '',
    acc: ''
  });

  // Function to fetch aircraft data - MOVED UP before it's used
  const fetchAircrafts = async () => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
      navigate('/login');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/uavs/?user=${user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch aircraft data');
      }
      
      const data = await response.json();
      // Fetch total landings for each UAV
      const aircraftsWithLandings = await Promise.all(
        data.map(async (aircraft) => {
          const landingsResponse = await fetch(`${API_URL}/api/flightlogs/total-landings/?uav=${aircraft.uav_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const landingsData = await landingsResponse.json();
          return { ...aircraft, total_landings: landingsData.total_landings || 0 };
        })
      );
      setAircrafts(aircraftsWithLandings);
    } catch (err) {
      console.error(err);
      setError('Could not load aircraft data.');
    }
  };

  // Initialize the UAV importer - MOVED AFTER fetchAircrafts is defined
  const { handleFileUpload } = UAVImporter({
    setError,
    navigate,
    API_URL,
    getAuthHeaders,
    fetchAircrafts
  });

  // Fetch aircraft data
  useEffect(() => {
    fetchAircrafts();
  }, [navigate]);

  // Function to handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Function to navigate to new aircraft page
  const handleNewAircraft = () => {
    navigate('/new-aircraft');
  };

  // Function to handle CSV import
  const handleImportCSV = () => {
    // Trigger file input click
    fileInputRef.current.click();
  };

  // Function to handle clicking on an aircraft (navigate to settings view)
  const handleAircraftClick = (uavId) => {
    navigate(`/aircraft-settings/${uavId}`);
  };

  // Toggle sidebar for mobile view
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Filter aircrafts based on filter criteria
  const filteredAircrafts = aircrafts.filter(aircraft => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (!filterValue) return true;
      
      const aircraftValue = String(aircraft[key] || '').toLowerCase();
      return aircraftValue.includes(filterValue.toLowerCase());
    });
  });

  // Define columns for the aircraft table to match the wireframe
  const tableColumns = [
    { header: 'Aircraft', accessor: 'drone_name' },
    { header: 'Manufacturer', accessor: 'manufacturer' },
    { header: 'Type', accessor: 'type' },
    { header: 'Motors', accessor: 'motors' },
    { header: 'Type of Motor', accessor: 'motor_type' },
    { header: 'LDG', accessor: 'total_landings' }, // Updated to show total landings
    { header: 'Firmware', accessor: 'firmware_version' },
    { header: 'Video System', accessor: 'video_system' },
    { header: 'GPS', accessor: 'gps' },
    { header: 'MAG', accessor: 'mag' },
    { header: 'BARO', accessor: 'baro' },
    { header: 'GYRO', accessor: 'gyro' },
    { header: 'ACC', accessor: 'acc' }
  ];

  // Function to handle CSV export
  const handleExportCSV = () => {
    if (aircrafts.length === 0) {
      alert('No aircraft data to export.');
      return;
    }
    
    // CSV header row - MUST match exactly what the importer expects
    const headers = [
      'DroneName', 'Manufacturer', 'Type', 'Motors', 'MotorType',
      'Video', 'VideoSystem', 'ESC', 'ESCFirmware', 'Receiver',
      'ReceiverFirmware', 'FlightController', 'Firmware', 'FirmwareVersion',
      'GPS', 'MAG', 'BARO', 'GYRO', 'ACC', 'RegistrationNumber', 'SerialNumber'
    ];
    
    // Map data fields to CSV rows - ensure field names match the importer
    const csvData = aircrafts.map(aircraft => [
      aircraft.drone_name || '',
      aircraft.manufacturer || '',
      aircraft.type || '',
      aircraft.motors || '',
      aircraft.motor_type || '',
      aircraft.video || '',
      aircraft.video_system || '',
      aircraft.esc || '',
      aircraft.esc_firmware || '',
      aircraft.receiver || '',
      aircraft.receiver_firmware || '',
      aircraft.flight_controller || '',
      aircraft.firmware || '',
      aircraft.firmware_version || '',
      aircraft.gps || '',
      aircraft.mag || '',
      aircraft.baro || '',
      aircraft.gyro || '',
      aircraft.acc || '',
      aircraft.registration_number || '',
      aircraft.serial_number || ''
    ]);
    
    // Add header row to CSV data
    csvData.unshift(headers);
    
    // Convert to CSV format with proper handling of special characters
    const csvContent = csvData.map(row => {
      return row.map(cell => {
        // Handle null/undefined values
        if (cell === null || cell === undefined) {
          return '';
        }
        
        // Convert numbers to strings
        const cellStr = String(cell);
        
        // Handle fields with commas, quotes, or newlines
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          // Escape quotes with double quotes and wrap in quotes
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').substring(0, 15);
    
    // Set download attributes and trigger click
    link.setAttribute('href', url);
    link.setAttribute('download', `uav-export-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up by revoking the object URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Toggle - match Flightlog */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-2 left-2 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar for mobile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      {/* Desktop toggle - match Flightlog */}
      <button
        onClick={toggleSidebar}
        className={`hidden lg:block fixed top-2 z-30 bg-gray-800 text-white p-2 rounded-md transition-all duration-300 ${
          sidebarOpen ? 'left-2' : 'left-4'
        }`}
        aria-label="Toggle sidebar for desktop"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Update container classes to match Flightlog */}
      <div 
        className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${
          sidebarOpen ? 'lg:ml-64' : ''
        }`}
      >
        {/* Add title styling to match Flightlog */}
        <div className="flex items-center h-10 mb-4">
          {/* Empty div for spacing on mobile (same width as toggle button) */}
          <div className="w-10 lg:hidden"></div>
          
          {/* Centered title */}
          <h1 className="text-2xl font-semibold text-center flex-1">Aircraft List</h1>
        </div>
        
        <Alert type="error" message={error} />

        {/* Desktop view */}
        <div className="hidden sm:block">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Filter Row */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {tableColumns.map(column => (
                      <th key={column.accessor} className="p-2">
                        <input
                          type="text"
                          name={column.accessor}
                          placeholder="Filter"
                          value={filters[column.accessor] || ''}
                          onChange={handleFilterChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                        />
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-100">
                    {tableColumns.map(column => (
                      <th key={column.accessor} className="p-2 text-xs font-medium uppercase tracking-wider text-gray-700">
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAircrafts.map(aircraft => (
                    <tr 
                      key={aircraft.uav_id} 
                      className={`border-b hover:bg-gray-50 cursor-pointer ${aircraft.is_active === false ? 'bg-red-100' : 'bg-white'}`}
                      onClick={() => handleAircraftClick(aircraft.uav_id)}
                    >
                      {tableColumns.map(column => (
                        <td key={column.accessor} className="p-3">
                          {aircraft[column.accessor] || 'N/A'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile view - card-based display */}
        <div className="sm:hidden">
          {filteredAircrafts.map(aircraft => (
            <div 
              key={aircraft.uav_id}
              className={`rounded-lg shadow mb-4 p-4 ${aircraft.is_active === false ? 'bg-red-100' : 'bg-white'}`}
              onClick={() => handleAircraftClick(aircraft.uav_id)}
            >
              <h3 className="font-bold text-lg mb-2">{aircraft.drone_name || 'Unnamed Aircraft'}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm"><span className="font-medium">Manufacturer:</span> {aircraft.manufacturer || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Type:</span> {aircraft.type || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Motors:</span> {aircraft.motors || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Motor Type:</span> {aircraft.motor_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm"><span className="font-medium">Firmware:</span> {aircraft.firmware_version || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Video:</span> {aircraft.video_system || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Serial:</span> {aircraft.serial_number || 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 p-4 mt-4">
          <Button 
            onClick={handleNewAircraft} 
            className="max-w-xs"
          >
            New Aircraft
          </Button>
          <Button 
            onClick={handleImportCSV} 
            className="bg-green-500 hover:bg-green-600 max-w-xs"
          >
            Import CSV
          </Button>
          <Button 
            onClick={handleExportCSV} 
            className="bg-blue-500 hover:bg-blue-600 max-w-xs"
          >
            Export CSV
          </Button>
          
          {/* Hidden file input for CSV import */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
};

export default AircraftList;