import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button, ResponsiveTable } from '../components';
import CSVImporter from '../helper/CSVImporter';

// Utility functions
const calculateFlightDuration = (deptTime, landTime) => {
  if (!deptTime || !landTime) return '';
  
  try {
    // Parse time strings to extract hours, minutes, seconds
    const [deptHours, deptMinutes, deptSeconds = 0] = deptTime.split(':').map(Number);
    const [landHours, landMinutes, landSeconds = 0] = landTime.split(':').map(Number);
    
    // Convert times to seconds
    const deptTotalSeconds = deptHours * 3600 + deptMinutes * 60 + deptSeconds;
    const landTotalSeconds = landHours * 3600 + landMinutes * 60 + landSeconds;
    
    // Calculate difference in seconds
    let durationInSeconds = landTotalSeconds - deptTotalSeconds;
    
    // Handle overnight flights
    if (durationInSeconds < 0) {
      durationInSeconds += 86400; // Add 24 hours (in seconds)
    }
    
    return Math.round(durationInSeconds);
  } catch (error) {
    console.error("Error calculating flight duration:", error);
    return '';
  }
};

// Options for select fields
const OPTIONS = {
  light_conditions: [
    { value: 'Day', label: 'Day' },
    { value: 'Night', label: 'Night' }
  ],
  ops_conditions: [
    { value: 'VLOS', label: 'VLOS' },
    { value: 'BLOS', label: 'BLOS' }
  ],
  pilot_type: [
    { value: 'PIC', label: 'PIC' },
    { value: 'Dual', label: 'Dual' },
    { value: 'Instruction', label: 'Instruction' }
  ]
};

const INITIAL_FLIGHT_STATE = {
  departure_place: '',
  departure_date: '',
  departure_time: '',
  landing_time: '',
  landing_place: '',
  flight_duration: '',
  takeoffs: '',
  landings: '',
  light_conditions: '',
  ops_conditions: '',
  pilot_type: '',
  uav: '',
  comments: ''
};

// Function to generate form fields (need to define this since it's referenced)
const getFormFields = (isFilter = false) => {
  const fields = [
    { name: 'departure_place', label: 'Departure Place', type: 'text', placeholder: 'Departure Place' },
    { name: 'departure_date', label: 'Date', type: 'date', placeholder: 'Date' },
    { name: 'departure_time', label: 'Departure Time', type: 'time', placeholder: 'Departure Time', step: '1' },
    { name: 'landing_time', label: 'LDG Time', type: 'time', placeholder: 'LDG Time', step: '1' },
    { name: 'landing_place', label: 'LDG Place', type: 'text', placeholder: 'LDG Place' },
    { name: 'flight_duration', label: 'Duration', type: 'number', placeholder: 'Duration (s)', step: '1', min: '0' },
    { name: 'takeoffs', label: 'T/O', type: 'number', placeholder: 'T/O', step: '1', min: '0' },
    { name: 'landings', label: 'LDG', type: 'number', placeholder: 'LDG', step: '1', min: '0' },
    { name: 'light_conditions', label: 'Light', type: 'select', placeholder: 'Light', options: OPTIONS.light_conditions },
    { name: 'ops_conditions', label: 'OPS', type: 'select', placeholder: 'OPS', options: OPTIONS.ops_conditions },
    { name: 'pilot_type', label: 'Pilot Type', type: 'select', placeholder: 'Pilot Type', options: OPTIONS.pilot_type },
    { name: 'uav', label: 'UAV', type: 'select', placeholder: 'Select UAV' },
    { name: 'comments', label: 'Comments', type: 'text', placeholder: 'Comments' }
  ];
  
  return fields;
};

const Flightlog = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [availableUAVs, setAvailableUAVs] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  
  const API_URL = import.meta.env.VITE_API_URL;
  
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [filters, setFilters] = useState({...INITIAL_FLIGHT_STATE});
  const [newFlight, setNewFlight] = useState({...INITIAL_FLIGHT_STATE});

  // CSV Importer: create a ref for the hidden file input
  const fileInputRef = useRef(null);

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

  const fetchFlightLogs = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) {
      navigate('/login');
      return;
    }
    
    fetch(`${API_URL}/api/flightlogs/?user=${user_id}`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) {
          if (handleAuthError(res)) return;
          throw new Error('Failed to fetch flight logs');
        }
        return res.json();
      })
      .then((data) => setLogs(data))
      .catch((err) => {
        console.error(err);
        setError('Could not load flight logs.');
      });
  }, [API_URL, getAuthHeaders, handleAuthError, navigate]);

  const { handleFileUpload } = CSVImporter({
    setError,
    navigate,
    API_URL,
    getAuthHeaders,
    availableUAVs,
    fetchFlightLogs
  });

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const fetchUAVs = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) return;
    
    fetch(`${API_URL}/api/uavs/?user=${user_id}`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch UAVs');
        return res.json();
      })
      .then((data) => setAvailableUAVs(data))
      .catch((err) => console.error(err));
  }, [API_URL, getAuthHeaders]);

  useEffect(() => {
    fetchFlightLogs();
    fetchUAVs();
  }, [fetchFlightLogs, fetchUAVs]);

  const tableColumns = useMemo(() => [
    { header: 'Dept Place', accessor: 'departure_place' },
    { header: 'Date', accessor: 'departure_date' },
    { header: 'Dept Time', accessor: 'departure_time' },
    { header: 'LDG Time', accessor: 'landing_time' },
    { header: 'LDG Place', accessor: 'landing_place' },
    { header: 'Duration', accessor: 'flight_duration' },
    { header: 'T/O', accessor: 'takeoffs' },
    { header: 'LDG', accessor: 'landings' },
    { header: 'Light', accessor: 'light_conditions' },
    { header: 'OPS', accessor: 'ops_conditions' },
    { header: 'Pilot Type', accessor: 'pilot_type' },
    { 
      header: 'UAV', 
      accessor: 'uav', 
      render: (value, row) => {
        if (value && typeof value === 'object' && value.drone_name) {
          return value.drone_name;
        }
        
        if (value) {
          const uavId = typeof value === 'object' ? value.uav_id : value;
          const foundUav = availableUAVs.find(uav => uav.uav_id == uavId);
          return foundUav ? foundUav.drone_name : `UAV #${uavId}`;
        }
        
        return '';
      } 
    },
    { header: 'Comments', accessor: 'comments' }
  ], [availableUAVs]);

  const filterFormFields = useMemo(() => getFormFields(true), []);
  const addFormFields = useMemo(() => getFormFields(false), []);

  const handleFormChange = useCallback((setter, e) => {
    const { name, value } = e.target;
    
    setter(prev => {
      const newState = { ...prev, [name]: value };
      
      if ((name === 'departure_time' || name === 'landing_time') && name !== 'flight_duration') {
        const deptTime = name === 'departure_time' ? value : prev.departure_time;
        const landTime = name === 'landing_time' ? value : prev.landing_time;
        
        const duration = calculateFlightDuration(deptTime, landTime);
        if (duration !== '') {
          newState.flight_duration = duration;
        }
      }
      
      return newState;
    });
  }, []);

  const handleFilterChange = useCallback((e) => handleFormChange(setFilters, e), [handleFormChange]);
  const handleNewFlightChange = useCallback((e) => handleFormChange(setNewFlight, e), [handleFormChange]);
  const handleEditChange = useCallback((e) => handleFormChange(setEditingLog, e), [handleFormChange]);

  const handleNewFlightAdd = useCallback(async () => {
    if (!newFlight.departure_date || !newFlight.departure_time || 
        !newFlight.landing_time || !newFlight.uav || 
        !newFlight.departure_place || !newFlight.landing_place || 
        !newFlight.light_conditions || !newFlight.ops_conditions || 
        !newFlight.pilot_type) {
      setError('Please fill in all required fields.');
      return;
    }
  
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) {
      navigate('/login');
      return;
    }
  
    const flightPayload = {
      ...newFlight,
      flight_duration: parseInt(newFlight.flight_duration) || 0,
      takeoffs: parseInt(newFlight.takeoffs) || 1,  
      landings: parseInt(newFlight.landings) || 1,
      comments: newFlight.comments || '',
      user: user_id
    };
  
    try {
      const response = await fetch(`${API_URL}/api/flightlogs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(flightPayload)
      });
  
      if (!response.ok) {
        if (handleAuthError(response)) return;
        const errorData = await response.json();
        setError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return;
      }
  
      fetchFlightLogs();
      setNewFlight({...INITIAL_FLIGHT_STATE});
      setError(null);
    } catch (err) {
      console.error(err);
      setError('An error occurred while adding the flight log.');
    }
  }, [API_URL, fetchFlightLogs, getAuthHeaders, handleAuthError, navigate, newFlight]);

  const handleEdit = useCallback((id) => {
    const logToEdit = logs.find(log => log.flightlog_id === id);
    
    if (logToEdit) {
      let uavValue;
  
      if (logToEdit.uav && typeof logToEdit.uav === 'object' && logToEdit.uav.uav_id) {
        uavValue = logToEdit.uav.uav_id;
      } else {
        uavValue = logToEdit.uav;
      }
      
      setEditingLog({
        ...logToEdit,
        uav: uavValue,
        departure_place: logToEdit.departure_place || '',
        departure_date: logToEdit.departure_date || '',
        departure_time: logToEdit.departure_time || '',
        landing_time: logToEdit.landing_time || '',
        landing_place: logToEdit.landing_place || '',
        flight_duration: logToEdit.flight_duration !== undefined ? logToEdit.flight_duration : '',
        takeoffs: logToEdit.takeoffs !== undefined ? logToEdit.takeoffs : '',
        landings: logToEdit.landings !== undefined ? logToEdit.landings : '',
        light_conditions: logToEdit.light_conditions || '',
        ops_conditions: logToEdit.ops_conditions || '',
        pilot_type: logToEdit.pilot_type || '',
        comments: logToEdit.comments || ''
      });
      
      setEditingLogId(id);
    }
  }, [logs]);

  const handleSaveEdit = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
      navigate('/login');
      return;
    }

    const updatedFlightLog = {
      ...editingLog,
      flight_duration: parseInt(editingLog.flight_duration) || 0,
      takeoffs: parseInt(editingLog.takeoffs) || 0,
      landings: parseInt(editingLog.landings) || 0,
      user: user_id
    };

    try {
      const response = await fetch(`${API_URL}/api/flightlogs/${editingLogId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updatedFlightLog)
      });

      if (!response.ok) {
        if (handleAuthError(response)) return;
        const errorData = await response.json();
        setError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return;
      }

      fetchFlightLogs();
      setEditingLogId(null);
      setEditingLog(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving the flight log.');
    }
  }, [API_URL, editingLog, editingLogId, fetchFlightLogs, getAuthHeaders, handleAuthError, navigate]);

  const handleCancelEdit = useCallback(() => {
    setEditingLogId(null);
    setEditingLog(null);
  }, []);

  const handleDeleteLog = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this flight log?')) {
      return;
    }
    
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/flightlogs/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to delete flight log');
      }

      fetchFlightLogs();
      setEditingLogId(null);
      setEditingLog(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('An error occurred while deleting the flight log.');
    }
  }, [API_URL, fetchFlightLogs, getAuthHeaders, handleAuthError, navigate]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

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

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;

        let logValue = '';
        switch (key) {
          case 'departure_date':
          case 'departure_time':
          case 'landing_time':
            logValue = log[key] || '';
            break;
          case 'flight_duration':
          case 'takeoffs':
          case 'landings':
            logValue = log[key] ? log[key].toString() : '';
            break;
          case 'uav':
            logValue = log.uav?.drone_name ? log.uav.drone_name.toLowerCase() : '';
            filterValue = filterValue.toLowerCase();
            break;
          default:
            logValue = log[key] ? log[key].toString().toLowerCase() : '';
            filterValue = filterValue.toLowerCase();
        }
        return logValue.includes(filterValue);
      });
    });
  }, [logs, filters]);

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
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 24 24" stroke="currentColor">
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
          
          <h1 className="text-2xl font-semibold text-center flex-1">Flight Log</h1>
        </div>
        
        <Alert type="error" message={error} />
        
        <ResponsiveTable 
          columns={tableColumns}
          data={filteredLogs}
          
          filterFields={filterFormFields}
          filters={filters}
          onFilterChange={handleFilterChange}
          
          addFields={addFormFields}
          newItem={newFlight}
          onNewItemChange={handleNewFlightChange}
          onAdd={handleNewFlightAdd}
          
          editingId={editingLogId}
          editingData={editingLog}
          onEditChange={handleEditChange}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          
          onEdit={handleEdit}
          onDelete={handleDeleteLog}
          
          availableOptions={{
            availableUAVs: availableUAVs
          }}
          
          rowClickable={false}
          showActionColumn={true}
          actionColumnText="Actions"
          titleField="uav" 
        />
        <div className="mt-4">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleImportClick}
          >
            Import CSV
          </button>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>
      </div>
    </div>
  );
};

export default Flightlog;