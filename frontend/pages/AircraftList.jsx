import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button } from '../components';

const AircraftList = () => {
  const navigate = useNavigate();
  const [aircrafts, setAircrafts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  
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

  // Fetch aircraft data
  useEffect(() => {
    fetchAircrafts();
  }, [navigate]);

  // Function to fetch aircraft data
  const fetchAircrafts = async () => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
      navigate('/login');
      return;
    }
    
    try {
      const response = await fetch(`/api/uavs/?user=${user_id}`, {
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
      setAircrafts(data);
    } catch (err) {
      console.error(err);
      setError('Could not load aircraft data.');
    }
  };

  // Function to handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Function to navigate to new aircraft page
  const handleNewAircraft = () => {
    navigate('/new-aircraft');
  };

  // Function to handle CSV import (placeholder)
  const handleImportCSV = () => {
    // Implement CSV import logic or navigate to import page
    alert('CSV import functionality would be implemented here');
  };

  // Function to handle clicking on an aircraft (navigate to detail view)
  const handleAircraftClick = (uavId) => {
    navigate(`/aircraft-detail/${uavId}`);
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
    { header: 'LDG', accessor: 'ldg' }, // May need adjustment based on your data model
    { header: 'Firmware', accessor: 'firmware_version' },
    { header: 'Video System', accessor: 'video_system' },
    { header: 'GPS', accessor: 'gps' },
    { header: 'MAG', accessor: 'mag' },
    { header: 'BARO', accessor: 'baro' },
    { header: 'GYRO', accessor: 'gyro' },
    { header: 'ACC', accessor: 'acc' }
  ];

  return (
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col w-full p-4 pt-16 lg:pt-4">
        <h1 className="text-2xl font-semibold mb-4">Aircraft List</h1>
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
                      className="bg-white border-b hover:bg-gray-50 cursor-pointer"
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
              className="bg-white rounded-lg shadow mb-4 p-4"
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
            className="bg-blue-500 hover:bg-blue-600 max-w-xs"
          >
            New Aircraft
          </Button>
          <Button 
            onClick={handleImportCSV} 
            className="bg-green-500 hover:bg-green-600 max-w-xs"
          >
            Import CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AircraftList;