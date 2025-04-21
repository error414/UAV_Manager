import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button, ResponsiveTable, ConfirmModal } from '../components';
import { getEnhancedFlightLogColumns } from '../utils/tableDefinitions';

const calculateFlightDuration = (deptTime, landTime) => {
  if (!deptTime || !landTime) return '';
  
  try {
    const [deptHours, deptMinutes, deptSeconds = 0] = deptTime.split(':').map(Number);
    const [landHours, landMinutes, landSeconds = 0] = landTime.split(':').map(Number);
    const deptTotalSeconds = deptHours * 3600 + deptMinutes * 60 + deptSeconds;
    const landTotalSeconds = landHours * 3600 + landMinutes * 60 + landSeconds;
    let durationInSeconds = landTotalSeconds - deptTotalSeconds;
    if (durationInSeconds < 0) {
      durationInSeconds += 86400;
    }
    
    return Math.round(durationInSeconds);
  } catch (error) {
    return '';
  }
};

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

const useAuth = () => {
  const navigate = useNavigate();
  
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
  
  const checkAuthAndGetUser = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
      navigate('/login');
      return null;
    }
    
    return { token, user_id };
  }, [navigate]);
  
  return { getAuthHeaders, handleAuthError, checkAuthAndGetUser };
};

const useApi = (baseUrl, setError) => {
  const { getAuthHeaders, handleAuthError } = useAuth();
  
  const fetchData = useCallback(async (endpoint, queryParams = {}, method = 'GET', body = null) => {
    const url = new URL(`${baseUrl}${endpoint}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
    
    try {
      const options = {
        method,
        headers: getAuthHeaders()
      };
      
      if (body && method !== 'GET') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        if (handleAuthError(response)) return { error: true };
        
        let errorData = 'Unknown error';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const text = await response.text();
          if (text) {
            try {
              errorData = JSON.parse(text);
            } catch (e) {
              errorData = text;
            }
          }
        }
        
        setError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return { error: true };
      }
      
      if (method === 'DELETE' || response.status === 204 || response.headers.get('content-length') === '0') {
        return { error: false, data: {} };
      }
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          return { error: false, data };
        } else {
          return { error: false, data: {} };
        }
      } catch (err) {
        return { error: false, data: {} };
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      return { error: true };
    }
  }, [baseUrl, getAuthHeaders, handleAuthError, setError]);
  
  return { fetchData };
};

const Flightlog = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  
  const [logs, setLogs] = useState([]);
  const [availableUAVs, setAvailableUAVs] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [filters, setFilters] = useState({...INITIAL_FLIGHT_STATE});
  const [newFlight, setNewFlight] = useState({...INITIAL_FLIGHT_STATE});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState('-departure_date,-departure_time');
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);
  const filterTimer = useRef(null);
  
  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);
  
  const safeAvailableUAVs = useMemo(() => {
    return Array.isArray(availableUAVs) ? availableUAVs : [];
  }, [availableUAVs]);
  
  const getFormFields = useCallback((isFilter = false) => {
    return [
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
      { 
        name: 'uav', 
        label: 'UAV', 
        type: 'select', 
        placeholder: 'Select UAV',
        options: safeAvailableUAVs.map(uav => ({ value: uav.uav_id, label: uav.drone_name }))
      },
      { name: 'comments', label: 'Comments', type: 'text', placeholder: 'Comments' }
    ];
  }, [safeAvailableUAVs]);
  
  const filterFormFields = useMemo(() => getFormFields(true), [getFormFields]);
  const addFormFields = useMemo(() => getFormFields(false), [getFormFields]);
  
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  const fetchFlightLogs = useCallback(async () => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;
    
    setIsLoading(true);
    
    const queryParams = {
      ...debouncedFilters,
      page: currentPage,
      page_size: pageSize,
      ordering: sortField
    };
    
    if (queryParams.uav && typeof queryParams.uav === 'object' && queryParams.uav.uav_id) {
      queryParams.uav = queryParams.uav.uav_id;
    }
    
    const result = await fetchData('/api/flightlogs/', queryParams);
    
    if (!result.error) {
      setLogs(result.data.results || []);
      setTotalPages(Math.ceil((result.data.count || 0) / pageSize));
    }
    
    setIsLoading(false);
  }, [checkAuthAndGetUser, fetchData, debouncedFilters, currentPage, pageSize, sortField]);

  const fetchUAVs = useCallback(async () => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;
    
    const result = await fetchData('/api/uavs/');
    
    if (!result.error) {
      const uavArray = Array.isArray(result.data) ? result.data : (result.data.results || []);
      setAvailableUAVs(uavArray);
    }
  }, [checkAuthAndGetUser, fetchData]);

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

  const handleNewFlightChange = useCallback((e) => handleFormChange(setNewFlight, e), [handleFormChange]);
  const handleEditChange = useCallback((e) => handleFormChange(setEditingLog, e), [handleFormChange]);

  const handleNewFlightAdd = useCallback(async () => {
    const requiredFields = ['departure_date', 'departure_time', 'landing_time', 'uav', 
      'departure_place', 'landing_place', 'light_conditions', 'ops_conditions', 'pilot_type'];
      
    const missingFields = requiredFields.filter(field => !newFlight[field]);
    if (missingFields.length > 0) {
      setError('Please fill in all required fields.');
      return;
    }
  
    const auth = checkAuthAndGetUser();
    if (!auth) return;
  
    const flightPayload = {
      ...newFlight,
      flight_duration: parseInt(newFlight.flight_duration) || 0,
      takeoffs: parseInt(newFlight.takeoffs) || 1,  
      landings: parseInt(newFlight.landings) || 1,
      comments: newFlight.comments || '',
      user: auth.user_id
    };
  
    const result = await fetchData('/api/flightlogs/', {}, 'POST', flightPayload);
    
    if (!result.error) {
      fetchFlightLogs();
      setNewFlight({...INITIAL_FLIGHT_STATE});
      setError(null);
    }
  }, [fetchData, checkAuthAndGetUser, fetchFlightLogs, newFlight]);

  const handleRowClick = useCallback((id) => {
    navigate(`/flightdetails/${id}`);
  }, [navigate]);

  const handleEdit = useCallback((id) => {
    const logToEdit = logs.find(log => log.flightlog_id === id);
    
    if (logToEdit) {
      let uavValue = logToEdit.uav;
      if (uavValue && typeof uavValue === 'object' && uavValue.uav_id) {
        uavValue = uavValue.uav_id;
      }
      
      setEditingLog({
        ...logToEdit,
        uav: uavValue,
        ...Object.keys(INITIAL_FLIGHT_STATE).reduce((acc, key) => {
          acc[key] = logToEdit[key] !== undefined ? logToEdit[key] : '';
          return acc;
        }, {})
      });
      
      setEditingLogId(id);
    }
  }, [logs]);

  const handleSaveEdit = useCallback(async () => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;

    const updatedFlightLog = {
      ...editingLog,
      flight_duration: parseInt(editingLog.flight_duration) || 0,
      takeoffs: parseInt(editingLog.takeoffs) || 0,
      landings: parseInt(editingLog.landings) || 0,
      user: auth.user_id
    };

    const result = await fetchData(`/api/flightlogs/${editingLogId}/`, {}, 'PUT', updatedFlightLog);
    
    if (!result.error) {
      fetchFlightLogs();
      setEditingLogId(null);
      setEditingLog(null);
      setError(null);
    }
  }, [fetchData, checkAuthAndGetUser, editingLog, editingLogId, fetchFlightLogs]);

  const handleCancelEdit = useCallback(() => {
    setEditingLogId(null);
    setEditingLog(null);
  }, []);

  const handleDeleteLog = useCallback((id) => {
    setConfirmDeleteId(id);
  }, []);

  const performDeleteLog = useCallback(async (id) => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;
    
    const result = await fetchData(`/api/flightlogs/${id}/`, {}, 'DELETE');
    
    if (!result.error) {
      fetchFlightLogs();
      setEditingLogId(null);
      setEditingLog(null);
      setError(null);
    }
  }, [fetchData, checkAuthAndGetUser, fetchFlightLogs]);

  const handleFileUpload = useCallback(async (event) => {
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
      const response = await fetch(`${API_URL}/api/import/flightlog/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        if (handleAuthError(response)) return;
        setError(result.error || 'Failed to import flight logs');
        setIsLoading(false);
        return;
      }

      await fetchFlightLogs();
      
      setImportResult({
        message: (result.message || '') + (result.details?.unmapped_message || '')
      });
    } catch (err) {
      setError('Failed to upload CSV. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, fetchFlightLogs, getAuthHeaders, handleAuthError]);

  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleSortChange = useCallback((field) => {
    setSortField(prevSort => {
      if (field === 'departure_date') {
        return prevSort === field ? `-${field},-departure_time` : `${field},departure_time`;
      }
      
      return prevSort === field ? `-${field}` : (prevSort === `-${field}` ? field : field);
    });
  }, []);

  const flightLogTableColumns = useMemo(() => {
    return getEnhancedFlightLogColumns(safeAvailableUAVs);
  }, [safeAvailableUAVs]);

  useEffect(() => {
    fetchFlightLogs();
    fetchUAVs();
  }, [fetchFlightLogs, fetchUAVs]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchFlightLogs();
  }, [fetchFlightLogs, debouncedFilters, currentPage, sortField]);

  useEffect(() => {
    return () => {
      if (filterTimer.current) {
        clearTimeout(filterTimer.current);
      }
    };
  }, []);

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
          <h1 className="text-2xl font-semibold text-center flex-1">Flight Log</h1>
        </div>
        
        <Alert type="error" message={error} />
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <ResponsiveTable 
            columns={flightLogTableColumns}
            data={logs}
            onEdit={handleEdit}
            onRowClick={handleRowClick}
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
            onDelete={handleDeleteLog}
            availableOptions={{ availableUAVs: safeAvailableUAVs }}
            rowClickable={true}
            showActionColumn={true}
            actionColumnText="Actions"
            titleField="uav"
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
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-200"
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
                    className={`w-8 h-8 flex items-center justify-center rounded ${
                      currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
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
                    className="w-8 h-8 flex items-center justify-center rounded bg-gray-200"
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

        <ConfirmModal
          open={!!confirmDeleteId}
          title="Confirm Deletion"
          message="Do you really want to delete this flight log?"
          onConfirm={() => {
            performDeleteLog(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
        
        <ConfirmModal
          open={!!importResult}
          title="Import completed"
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

export default Flightlog;