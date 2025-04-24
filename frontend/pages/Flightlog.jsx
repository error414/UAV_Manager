import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button, ResponsiveTable, ConfirmModal, Pagination } from '../components';
import { getEnhancedFlightLogColumns } from '../utils/tableDefinitions';
import { getFlightFormFields, INITIAL_FLIGHT_STATE, FLIGHT_FORM_OPTIONS } from '../utils/formDefinitions';
import { useAuth, useApi } from '../utils/authUtils';

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
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  const [mobileAddNewVisible, setMobileAddNewVisible] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);
  const filterTimer = useRef(null);
  
  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);
  
  const safeAvailableUAVs = useMemo(() => {
    return Array.isArray(availableUAVs) ? availableUAVs : [];
  }, [availableUAVs]);
  
  const filterFormFields = useMemo(() => getFlightFormFields(safeAvailableUAVs), [safeAvailableUAVs]);
  const addFormFields = useMemo(() => getFlightFormFields(safeAvailableUAVs), [safeAvailableUAVs]);
  
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const toggleMobileFilters = useCallback(() => {
    setMobileFiltersVisible(prev => !prev);
  }, []);
  const toggleMobileAddNew = useCallback(() => {
    setMobileAddNewVisible(prev => !prev);
  }, []);

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
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div 
        className={`flex-1 flex flex-col w-full p-4 pt-0 transition-all duration-300 overflow-auto ${
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
          <>
            {/* Mobile Filter Toggle Button */}
            <div className="md:hidden mt-0.5 mb-0.5 w-full">
              <Button 
                onClick={toggleMobileFilters}
                variant="secondary"
                size="md"
                fullWidth={true}
                className="flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 0V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 0V4" />
                </svg>
                {mobileFiltersVisible ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>

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
              mobileFiltersVisible={mobileFiltersVisible}
              mobileAddNewVisible={mobileAddNewVisible}
              toggleMobileAddNew={toggleMobileAddNew}
            />
            
            {/* Mobile Add New Toggle Button - increased top margin */}
            <div className="md:hidden mt-3 mb-0.5 w-full">
              <Button 
                onClick={toggleMobileAddNew}
                variant="success"
                size="md"
                fullWidth={true}
                className="flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {mobileAddNewVisible ? 'Hide Add New Form' : 'Add New Flight'}
              </Button>
            </div>
          </>
        )}
        
        {/* Adjust the mt-2 value below to control spacing */}
        <div className="flex flex-col md:flex-row items-center">
          <div className="mt-4 w-full md:w-auto md:flex-1 flex md:justify-start mb-2 md:mb-0">
            <Button 
              onClick={handleImportClick}
              variant="primary"
              size="md"
              fullWidth={true}
              className="md:w-auto"
            >
              Import CSV
            </Button>
          </div>

          {/* Pagination - centered */}
          <div className="w-full md:flex-1 flex justify-center">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </div>
          
          {/* Empty space for balance on desktop */}
          <div className="hidden md:block md:flex-1"></div>
          
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