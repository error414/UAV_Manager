import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button, ResponsiveTable, Loading, ConfirmModal } from '../components';

const AircraftList = () => {
  const navigate = useNavigate();
  const [aircrafts, setAircrafts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('drone_name');
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const filterTimer = useRef(null);
  const [importResult, setImportResult] = useState(null);
  
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
  
  const API_URL = import.meta.env.VITE_API_URL;
  
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }, []);
  
  const handleAuthError = useCallback((res) => {
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_id');
      navigate('/login');
      return true;
    }
    return false;
  }, [navigate]);
  
  const [filters, setFilters] = useState({
    drone_name: '',
    manufacturer: '',
    type: '',
    motors: '',
    motor_type: '',
    firmware_version: '',
    video_system: '',
    gps: '',
    mag: '',
    baro: '',
    gyro: '',
    acc: '',
    registration_number: '',
    serial_number: ''
  });

  const fetchAircrafts = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
      navigate('/login');
      return;
    }
    
    setIsLoading(true);
    
    const queryParams = new URLSearchParams();
    
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });
    
    queryParams.append('page', currentPage);
    queryParams.append('page_size', pageSize);
    queryParams.append('ordering', sortField);
    
    try {
      const response = await fetch(`${API_URL}/api/uavs/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to fetch aircraft data');
      }
      
      const data = await response.json();
      setAircrafts(data.results || []);
      setTotalPages(Math.ceil((data.count || 0) / pageSize));
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError('Could not load aircraft data.');
      setIsLoading(false);
    }
  }, [API_URL, getAuthHeaders, handleAuthError, navigate, debouncedFilters, currentPage, pageSize, sortField]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = null; 

    if (!file.name.endsWith('.csv')) {
      setError('File must be a CSV');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/import/uav/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        if (handleAuthError(response)) return;
        setError(result.error || 'Failed to import UAVs');
        setIsLoading(false);
        return;
      }

      await fetchAircrafts();
      
      setImportResult({
        message: (result.message || '') + (result.details?.duplicate_message || '')
      });
      setIsLoading(false);
    } catch (err) {
      console.error('Error uploading CSV:', err);
      setError('Failed to upload CSV. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAircrafts();
  }, [fetchAircrafts]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (filterTimer.current) {
      clearTimeout(filterTimer.current);
    }
    
    filterTimer.current = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }, 500);
  }, []);

  const handleNewAircraft = () => {
    navigate('/new-aircraft');
  };

  const handleImportCSV = () => {
    fileInputRef.current.click();
  };

  const handleAircraftClick = (uavId) => {
    navigate(`/aircraft-settings/${uavId}`);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleSortChange = useCallback((field) => {
    setSortField(prevSort => {
      if (prevSort === field) return `-${field}`;
      if (prevSort === `-${field}`) return field;
      return field;
    });
  }, []);

  const formatFlightTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  const tableColumns = [
    { header: 'Aircraft', accessor: 'drone_name' },
    { header: 'Manufacturer', accessor: 'manufacturer' },
    { header: 'Type', accessor: 'type' },
    { header: 'Motors', accessor: 'motors' },
    { header: 'Type of Motor', accessor: 'motor_type' },
    { header: 'Flight Time', accessor: 'total_flight_time', render: formatFlightTime },
    { header: 'TO', accessor: 'total_takeoffs' },
    { header: 'LDG', accessor: 'total_landings' },
    { header: 'Firmware', accessor: 'firmware_version' },
    { header: 'Video System', accessor: 'video_system' },
    { header: 'GPS', accessor: 'gps' },
    { header: 'MAG', accessor: 'mag' },
    { header: 'BARO', accessor: 'baro' },
    { header: 'GYRO', accessor: 'gyro' },
    { header: 'ACC', accessor: 'acc' }
  ];

  const handleExportCSV = () => {
    if (aircrafts.length === 0) {
      alert('No aircraft data to export.');
      return;
    }
    
    const headers = [
      'DroneName', 'Manufacturer', 'Type', 'Motors', 'MotorType',
      'Video', 'VideoSystem', 'ESC', 'ESCFirmware', 'Receiver',
      'ReceiverFirmware', 'FlightController', 'Firmware', 'FirmwareVersion',
      'GPS', 'MAG', 'BARO', 'GYRO', 'ACC', 'RegistrationNumber', 'SerialNumber'
    ];
    
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
    
    csvData.unshift(headers);
    
    const csvContent = csvData.map(row => {
      return row.map(cell => {
        if (cell === null || cell === undefined) {
          return '';
        }
        
        const cellStr = String(cell);
        
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').substring(0, 15);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `uav-export-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (filterTimer.current) {
        clearTimeout(filterTimer.current);
      }
    };
  }, []);

  const modifiedAircrafts = aircrafts.map(aircraft => ({
    ...aircraft,
    flightlog_id: aircraft.uav_id
  }));

  return (
    <div className="flex h-screen relative">
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-2 left-2 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar for mobile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
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
      
      <div 
        className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${
          sidebarOpen ? 'lg:ml-64' : ''
        }`}
      >
        <div className="flex items-center h-10 mb-4">
          <div className="w-10 lg:hidden"></div>
          
          <h1 className="text-2xl font-semibold text-center flex-1">Aircraft List</h1>
        </div>
        
        <Alert type="error" message={error} />
        
        {isLoading ? (
          <Loading message="Loading aircraft data..." />
        ) : (
          <ResponsiveTable
            columns={tableColumns}
            data={modifiedAircrafts || []}
            filterFields={tableColumns}
            filters={filters}
            onFilterChange={handleFilterChange}
            onEdit={handleAircraftClick}
            onRowClick={handleAircraftClick}
            hideDesktopFilters={false}
            rowClickable={true}
            showActionColumn={false}
            idField="flightlog_id"
            titleField="drone_name"
          />
        )}
        
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 gap-2">
            <button 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              &laquo; Prev
            </button>
            
            <div className="flex items-center gap-1">
              {currentPage > 3 && (
                <>
                  <button 
                    onClick={() => handlePageChange(1)}
                    className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-1">...</span>}
                </>
              )}
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if ((currentPage > 3 && page === 1) || (currentPage < totalPages - 2 && page === totalPages)) {
                    return false;
                  }
                  return page >= currentPage - 1 && page <= currentPage + 1;
                })
                .map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    {page}
                  </button>
                ))
              }
              
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-1">...</span>}
                  <button 
                    onClick={() => handlePageChange(totalPages)}
                    className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next &raquo;
            </button>
          </div>
        )}

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
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </div>
        <ConfirmModal
          open={!!importResult}
          title="Import abgeschlossen"
          message={importResult?.message || ''}
          onConfirm={() => setImportResult(null)}
          onCancel={() => setImportResult(null)}
          confirmText="OK"
          cancelText={null}
        />
      </div>
    </div>
  );
};

export default AircraftList;