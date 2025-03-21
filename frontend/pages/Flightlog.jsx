import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filters, Sidebar, Alert, AddNew, Button, Table } from '../components';

// Utility functions
const calculateFlightDuration = (deptTime, landTime) => {
  if (!deptTime || !landTime) return '';
  
  try {
    const deptDate = new Date(`2000-01-01T${deptTime}`);
    const landDate = new Date(`2000-01-01T${landTime}`);
    
    let differenceInSeconds = (landDate - deptDate) / 1000;
    
    // Handle overnight flights
    if (differenceInSeconds < 0) {
      differenceInSeconds += 24 * 60 * 60;
    }
    
    return Math.round(differenceInSeconds);
  } catch (err) {
    console.error("Error calculating flight duration:", err);
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

const Flightlog = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [availableUAVs, setAvailableUAVs] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Get API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL;
  
  // State for inline editing
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);

  // Filters and new flight state
  const [filters, setFilters] = useState({...INITIAL_FLIGHT_STATE});
  const [newFlight, setNewFlight] = useState({...INITIAL_FLIGHT_STATE});

  // Fetch API helpers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleAuthError = (res) => {
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_id');
      navigate('/login');
      return true;
    }
    return false;
  };

  // Fetch flight logs
  const fetchFlightLogs = () => {
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
  };

  // Fetch available UAVs
  const fetchUAVs = () => {
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
  };

  // Initial data fetching
  useEffect(() => {
    fetchFlightLogs();
    fetchUAVs();
  }, [navigate]);

  // Table column definitions
  const tableColumns = [
    { header: 'Dept Place', accessor: 'departure_place' },
    { header: 'Date', accessor: 'departure_date' },
    { header: 'Dept Time', accessor: 'departure_time' },
    { header: 'Landing Time', accessor: 'landing_time' },
    { header: 'Landing Place', accessor: 'landing_place' },
    { header: 'Duration', accessor: 'flight_duration' },
    { header: 'Takeoffs', accessor: 'takeoffs' },
    { header: 'Landings', accessor: 'landings' },
    { header: 'Light Conditions', accessor: 'light_conditions' },
    { header: 'Ops Conditions', accessor: 'ops_conditions' },
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
  ];

  // Form field definitions
  const getFormFields = (forFilters = false) => {
    const baseFields = [
      { label: 'Departure Place', name: 'departure_place', type: 'text', placeholder: forFilters ? 'Filter Departure Place' : 'Departure place', required: !forFilters },
      { label: 'Departure Date', name: 'departure_date', type: 'date', required: !forFilters },
      { label: 'Departure Time', name: 'departure_time', type: 'time', required: !forFilters, step: "1" },
      { label: 'Landing Time', name: 'landing_time', type: 'time', required: !forFilters, step: "1" },
      { label: 'Landing Place', name: 'landing_place', type: 'text', placeholder: forFilters ? 'Filter Landing Place' : 'Landing place', required: !forFilters },
      { label: 'Flight Duration', name: 'flight_duration', type: 'number', placeholder: forFilters ? 'Filter Duration' : 'Flight time (s)', step: "1", min: "0", required: false },
      { label: 'Takeoffs', name: 'takeoffs', type: 'number', placeholder: forFilters ? 'Filter Takeoffs' : 'Number of T/O', step: "1", min: "0", required: !forFilters },
      { label: 'Landings', name: 'landings', type: 'number', placeholder: forFilters ? 'Filter Landings' : 'Number of LDG', step: "1", min: "0", required: !forFilters },
      { label: 'Light Conditions', name: 'light_conditions', type: forFilters ? 'text' : 'select', placeholder: forFilters ? 'Filter Light Conditions' : 'Select', options: OPTIONS.light_conditions, required: !forFilters },
      { label: 'Ops Conditions', name: 'ops_conditions', type: forFilters ? 'text' : 'select', placeholder: forFilters ? 'Filter Ops Conditions' : 'Select', options: OPTIONS.ops_conditions, required: !forFilters },
      { label: 'Pilot Type', name: 'pilot_type', type: forFilters ? 'text' : 'select', placeholder: forFilters ? 'Filter Pilot Type' : 'Select', options: OPTIONS.pilot_type, required: !forFilters }
    ];
  
    // Add UAV field with appropriate options for non-filter forms
    if (!forFilters) {
      baseFields.push({
        label: 'UAV', 
        name: 'uav', 
        type: 'select', 
        required: true, 
        placeholder: 'Select UAV',
        options: availableUAVs.map((uav) => ({ 
          value: uav.uav_id, 
          label: `${uav.drone_name} (${uav.serial_number})` 
        }))
      });
    } else {
      baseFields.push({ label: 'UAV', name: 'uav', type: 'text', placeholder: 'Filter UAV' });
    }
    
    // Add comments field
    baseFields.push({ 
      label: 'Comments', 
      name: 'comments', 
      type: 'text', 
      placeholder: forFilters ? 'Filter Comments' : 'Comments (optional)', 
      required: false 
    });
    
    return baseFields;
  };

  // Form change handlers
  const handleFormChange = (setter, e) => {
    const { name, value } = e.target;
    
    setter(prev => {
      const newState = { ...prev, [name]: value };
      
      // Auto-calculate flight duration for time changes
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
  };

  const handleFilterChange = (e) => handleFormChange(setFilters, e);
  const handleNewFlightChange = (e) => handleFormChange(setNewFlight, e);
  const handleEditChange = (e) => handleFormChange(setEditingLog, e);

  // CRUD operations
  const handleNewFlightAdd = async () => {
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
  };

  const handleEdit = (id) => {
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
  };

  const handleSaveEdit = async () => {
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
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingLog(null);
  };

  const handleDeleteLog = async (id) => {
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
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Filter logs using all filter attributes
  const filteredLogs = logs.filter((log) => {
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

  // Render edit cell for desktop view
  const renderEditCell = (log) => {
    const isEditing = editingLogId === log.flightlog_id;
    
    return (
      <td className="py-3 px-4">
        {isEditing ? (
          <div className="flex space-x-2">
            <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800">Save</button>
            <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={() => handleDeleteLog(log.flightlog_id)} className="text-red-600 hover:text-red-800">Delete</button>
          </div>
        ) : (
          <button onClick={() => handleEdit(log.flightlog_id)} className="text-blue-600 hover:text-blue-800">Edit</button>
        )}
      </td>
    );
  };

  // Render edit field for desktop view
  const renderEditField = (log, col) => {
    const isEditing = editingLogId === log.flightlog_id;
    
    if (!isEditing) {
      return <td key={col.accessor} className="py-3 px-4">{col.render ? col.render(log[col.accessor], log) : log[col.accessor]}</td>;
    }
    
    // Special case handling for selects
    if (col.accessor === 'uav') {
      return (
        <td key={col.accessor} className="py-3 px-4">
          <select
            name="uav"
            value={editingLog.uav}
            onChange={handleEditChange}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          >
            <option value="">Select UAV</option>
            {availableUAVs.map((uav) => (
              <option key={uav.uav_id} value={uav.uav_id}>
                {uav.drone_name} ({uav.serial_number})
              </option>
            ))}
          </select>
        </td>
      );
    }
    
    if (['light_conditions', 'ops_conditions', 'pilot_type'].includes(col.accessor)) {
      return (
        <td key={col.accessor} className="py-3 px-4">
          <select
            name={col.accessor}
            value={editingLog[col.accessor]}
            onChange={handleEditChange}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          >
            <option value="">Select</option>
            {OPTIONS[col.accessor].map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </td>
      );
    }
    
    // Determine input type based on the field
    let inputType = 'text';
    let inputProps = {};
    
    if (col.accessor === 'departure_date') {
      inputType = 'date';
    } else if (col.accessor === 'departure_time' || col.accessor === 'landing_time') {
      inputType = 'time';
      inputProps.step = "1";
    } else if (col.accessor === 'flight_duration' || col.accessor === 'takeoffs' || col.accessor === 'landings') {
      inputType = 'number';
      inputProps.step = "1";
      inputProps.min = "0";
    }
    
    return (
      <td key={col.accessor} className="py-3 px-4">
        <input
          type={inputType}
          name={col.accessor}
          value={editingLog[col.accessor] || ''}
          onChange={handleEditChange}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          {...inputProps}
        />
      </td>
    );
  };

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
        <h1 className="text-2xl font-semibold mb-4">Flight Log</h1>
        <Alert type="error" message={error} />

        {/* MOBILE: Filters, Card-Style Table, and AddNew Form */}
        <div className="sm:hidden">
          <Filters fields={getFormFields(true)} onFilterChange={handleFilterChange} />
          <Table 
            columns={tableColumns} 
            data={filteredLogs}
            onEdit={handleEdit}
            editingId={editingLogId}
            editingData={editingLog}
            onEditChange={handleEditChange}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDeleteLog}
            availableUAVs={availableUAVs}
          />
          <AddNew
            fields={getFormFields()}
            formValues={newFlight}
            onChange={handleNewFlightChange}
            onSubmit={handleNewFlightAdd}
            submitLabel="Add"
          />
        </div>

        {/* DESKTOP: Table with Filter row and AddNew row */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left text-gray-500 table-auto">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  {getFormFields(true).map((field) => (
                    <th key={field.name} className="p-2">
                      <input
                        type={field.type}
                        name={field.name}
                        placeholder={field.placeholder || field.label}
                        value={filters[field.name]}
                        onChange={handleFilterChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                      />
                    </th>
                  ))}
                  {/* Empty cell for Edit column */}
                  <th className="p-2"></th>
                </tr>
                <tr>
                  {tableColumns.map((col) => (
                    <th key={col.accessor} className="p-2 pl-3">{col.header}</th>
                  ))}
                  <th className="p-2 pl-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.flightlog_id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    {tableColumns.map((col) => renderEditField(log, col))}
                    {renderEditCell(log)}
                  </tr>
                ))}
                
                {/* Desktop AddNew row */}
                <tr>
                  {getFormFields().map((field) => (
                    <td key={field.name} className="py-3 px-4 pl-3">
                      {field.type === 'select' ? (
                        <select
                          name={field.name}
                          value={newFlight[field.name]}
                          onChange={handleNewFlightChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                        >
                          <option value="">{field.placeholder}</option>
                          {field.options && field.options.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder}
                          value={newFlight[field.name]}
                          onChange={handleNewFlightChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                          step={field.step}
                          min={field.min}
                        />
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <Button onClick={handleNewFlightAdd} className="bg-green-500 hover:bg-green-600">Add</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flightlog;