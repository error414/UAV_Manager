import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Alert, Button, ResponsiveTable, ConfirmModal, Pagination } from '../components';
import { getEnhancedFlightLogColumns, getFlightFormFields, INITIAL_FLIGHT_STATE, FLIGHT_FORM_OPTIONS, exportFlightLogToPDF, calculateFlightDuration, extractUavId } from '../utils';
import { useAuth, useApi, useUAVs } from '../hooks';

const Flightlog = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  
  const [logs, setLogs] = useState([]);
  const [availableUAVs, setAvailableUAVs] = useState([]);
  const [error, setError] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [filters, setFilters] = useState({...INITIAL_FLIGHT_STATE});
  const [newFlight, setNewFlight] = useState({...INITIAL_FLIGHT_STATE});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(17);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState('-departure_date,-departure_time');
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  const [mobileAddNewVisible, setMobileAddNewVisible] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [userData, setUserData] = useState(null);
  const [pageSizeInitialized, setPageSizeInitialized] = useState(false);
  const [pageSizeCalculationAttempted, setPageSizeCalculationAttempted] = useState(false);

  const fileInputRef = useRef(null);
  const filterTimer = useRef(null);
  const tableContainerRef = useRef(null);
  
  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);
  
  const safeAvailableUAVs = useMemo(() => {
    return Array.isArray(availableUAVs) ? availableUAVs : [];
  }, [availableUAVs]);
  
  const formFields = useMemo(() => getFlightFormFields(safeAvailableUAVs), [safeAvailableUAVs]);
  
  const toggleMobileFilters = useCallback(() => setMobileFiltersVisible(v => !v), []);
  const toggleMobileAddNew = useCallback(() => setMobileAddNewVisible(v => !v), []);

  const runAuthenticatedOperation = useCallback(async (operation) => {
    const auth = checkAuthAndGetUser();
    if (!auth) return null;
    return await operation(auth);
  }, [checkAuthAndGetUser]);

  const fetchFlightLogs = useCallback(async () => {
    return runAuthenticatedOperation(async () => {
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
        const resultCount = result.data.results?.length || 0;
        setLogs(result.data.results || []);
        setTotalPages(Math.ceil((result.data.count || 0) / pageSize));
      }
      
      setIsLoading(false);
      return result;
    });
  }, [runAuthenticatedOperation, fetchData, debouncedFilters, currentPage, pageSize, sortField]);

  const fetchAllFlightLogs = useCallback(async () => {
    let allLogs = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100;

    while (hasMore) {
      const queryParams = {
        ...debouncedFilters,
        page,
        page_size: pageSize,
        ordering: sortField
      };
      const result = await fetchData('/api/flightlogs/', queryParams);
      if (result.error) break;
      const pageLogs = result.data.results || [];
      allLogs = allLogs.concat(pageLogs);
      hasMore = pageLogs.length === pageSize;
      page += 1;
    }
    return allLogs;
  }, [debouncedFilters, sortField, fetchData]);

  const { fetchUAVs } = useUAVs(runAuthenticatedOperation, fetchData, setAvailableUAVs);

  const handleFormChange = useCallback((setter, e, isEditMode = false) => {
    const { name, value } = e.target;
    setter(prev => {
      const newState = { ...prev };
      if (name === 'uav') {
        newState.uav = typeof value === 'object' && value !== null && 'uav_id' in value
          ? value.uav_id
          : parseInt(value, 10) || '';
      } else {
        newState[name] = value;
      }
      if ((name === 'departure_time' || name === 'landing_time') && name !== 'flight_duration') {
        const deptTime = name === 'departure_time' ? value : prev.departure_time;
        const landTime = name === 'landing_time' ? value : prev.landing_time;
        const duration = calculateFlightDuration(deptTime, landTime);
        if (duration !== '') newState.flight_duration = duration;
      }
      return newState;
    });
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedFilters(f => ({ ...f, [name]: value }));
    }, 500);
  }, []);

  const handleNewFlightChange = useCallback((e) => handleFormChange(setNewFlight, e, false), [handleFormChange]);
  const handleEditChange = useCallback((e) => handleFormChange(setEditingLog, e, true), [handleFormChange]);

  const prepareFlightPayload = useCallback((flightData, userId) => {
    const uavValue = extractUavId(flightData.uav);
    if (!uavValue || isNaN(uavValue)) {
      setError('UAV is required and must be a valid selection.');
      return null;
    }
    return {
      ...flightData,
      uav_id: uavValue,
      flight_duration: parseInt(flightData.flight_duration) || 0,
      takeoffs: parseInt(flightData.takeoffs) || 1,  
      landings: parseInt(flightData.landings) || 1,
      comments: flightData.comments || '',
      user: userId
    };
  }, []);

  const handleNewFlightAdd = useCallback(async () => {
    const requiredFields = ['departure_date', 'departure_time', 'landing_time', 'uav', 
      'departure_place', 'landing_place', 'light_conditions', 'ops_conditions', 'pilot_type'];
      
    const missingFields = requiredFields.filter(field => !newFlight[field]);
    if (missingFields.length > 0) {
      setError('Please fill in all required fields.');
      return;
    }
  
    return runAuthenticatedOperation(async (auth) => {
      const flightPayload = prepareFlightPayload(newFlight, auth.user_id);
      if (!flightPayload) return;
      
      delete flightPayload.uav;
      
      const result = await fetchData('/api/flightlogs/', {}, 'POST', flightPayload);
      
      if (!result.error) {
        fetchFlightLogs();
        setNewFlight({...INITIAL_FLIGHT_STATE});
        setError(null);
      } else {
        setError(result.error?.detail || result.error?.message || 'Failed to add flight log');
      }
    });
  }, [runAuthenticatedOperation, prepareFlightPayload, fetchData, fetchFlightLogs, newFlight]);

  const handleRowClick = useCallback((id) => {
    navigate(`/flightdetails/${id}`);
  }, [navigate]);

  const handleEdit = useCallback((id) => {
    const logToEdit = logs.find(log => log.flightlog_id === id);
    
    if (logToEdit) {
      const uavValue = extractUavId(logToEdit.uav);
      
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
    return runAuthenticatedOperation(async (auth) => {
      const flightPayload = prepareFlightPayload(editingLog, auth.user_id);
      if (!flightPayload) return;

      delete flightPayload.uav;
      
      const result = await fetchData(`/api/flightlogs/${editingLogId}/`, {}, 'PUT', flightPayload);
      
      if (!result.error) {
        fetchFlightLogs();
        setEditingLogId(null);
        setEditingLog(null);
        setError(null);
      } else {
        console.error('Update error:', result.error);
        setError(result.error?.detail || result.error?.message || 'Failed to update flight log');
      }
    });
  }, [runAuthenticatedOperation, prepareFlightPayload, editingLog, editingLogId, fetchData, fetchFlightLogs]);

  const handleCancelEdit = useCallback(() => {
    setEditingLogId(null);
    setEditingLog(null);
  }, []);

  const handleDeleteLog = useCallback((id) => {
    setConfirmDeleteId(id);
  }, []);

  const performDeleteLog = useCallback(async (id) => {
    return runAuthenticatedOperation(async () => {
      const result = await fetchData(`/api/flightlogs/${id}/`, {}, 'DELETE');
      
      if (!result.error) {
        fetchFlightLogs();
        setEditingLogId(null);
        setEditingLog(null);
        setError(null);
      }
    });
  }, [runAuthenticatedOperation, fetchData, fetchFlightLogs]);

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_URL}/api/users/`, { headers });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setUserData(data[0]);
      } catch (e) { /* ignore */ }
    };
    fetchUser();
  }, [API_URL, getAuthHeaders]);

  const handleExportPDF = useCallback(async () => {
    const allLogs = await fetchAllFlightLogs();
    await exportFlightLogToPDF(allLogs, userData);
  }, [fetchAllFlightLogs, userData]);

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

  const calculateOptimalPageSize = useCallback(() => {
    if (!tableContainerRef.current) {
      // If table container isn't available, use default
      if (!pageSizeCalculationAttempted) {
        setPageSizeCalculationAttempted(true);
        setPageSizeInitialized(true);
      }
      return;
    }
    
    const containerHeight = tableContainerRef.current.clientHeight;
    
    // If container height is too small, use default
    if (containerHeight < 100) {
      if (!pageSizeCalculationAttempted) {
        setPageSizeCalculationAttempted(true);
        setPageSizeInitialized(true);
      }
      return;
    }
    
    const estimatedRowHeight = 53;
    const nonDataHeight = 150;
    const availableHeight = containerHeight - nonDataHeight;
    let optimalRows = Math.floor(availableHeight / estimatedRowHeight);
    optimalRows = Math.max(1, Math.min(optimalRows, 50)); // Increase min to 10, max to 50
    
    setPageSize(optimalRows);
    setPageSizeInitialized(true);
    setPageSizeCalculationAttempted(true);
  }, [pageSizeCalculationAttempted]);

  // Make the timeout longer to ensure DOM is fully rendered
  useEffect(() => {
    // Longer timeout (250ms) to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      calculateOptimalPageSize();
    }, 250);
    
    // Safety timer to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      if (!pageSizeInitialized) {
        setPageSizeInitialized(true);
        setIsLoading(false);
      }
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [calculateOptimalPageSize]);

  useEffect(() => {
    const handleResize = () => {
      calculateOptimalPageSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateOptimalPageSize]);

  // Separate effect for fetching UAVs
  useEffect(() => {
    fetchUAVs();
  }, [fetchUAVs]);

  // Modified to ensure data loads even if page size calculation had issues
  useEffect(() => {
    if (pageSizeInitialized) {
      fetchFlightLogs();
    }
  }, [fetchFlightLogs, pageSizeInitialized, debouncedFilters, currentPage, sortField]);

  useEffect(() => {
    return () => {
      if (filterTimer.current) {
        clearTimeout(filterTimer.current);
      }
    };
  }, []);

  return (
    <Layout title="Flight Log">
      <Alert type="error" message={error} />

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex flex-col h-full" style={{ height: "calc(100vh - 50px)" }}>
          <div className="xl:hidden mt-0.5 mb-0.5 w-full">
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
          
          <div className="flex-grow overflow-auto" ref={tableContainerRef}>
            <ResponsiveTable 
              columns={flightLogTableColumns}
              data={logs}
              onEdit={handleEdit}
              onRowClick={handleRowClick}
              filterFields={formFields}
              filters={filters}
              onFilterChange={handleFilterChange}
              addFields={formFields}
              newItem={newFlight}
              onNewItemChange={handleNewFlightChange}
              onAdd={handleNewFlightAdd}
              editingId={editingLogId}
              editingData={editingLog}
              onEditChange={handleEditChange}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={handleDeleteLog}
              onSort={handleSortChange}
              availableOptions={{ 
                availableUAVs: safeAvailableUAVs,
                formOptions: FLIGHT_FORM_OPTIONS
              }}
              rowClickable={true}
              showActionColumn={true}
              actionColumnText="Actions"
              titleField="uav"
              mobileFiltersVisible={mobileFiltersVisible}
              mobileAddNewVisible={mobileAddNewVisible}
              toggleMobileAddNew={toggleMobileAddNew}
            />
          </div>
          
          <div className="xl:hidden mt-3 mb-0.5 w-full">
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
          
          <div className="flex-shrink-0 border-t border-gray-200 bg-white mt-0 mb-0">
            <div className="xl:hidden py-1">
              <div className="flex justify-center mb-2">
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={handlePageChange} 
                  className="flex justify-center items-center gap-2" 
                />
              </div>
              <div className="space-y-2 px-1">
                <Button 
                  onClick={handleImportClick}
                  variant="primary"
                  size="md"
                  fullWidth={true}
                  className="flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import CSV
                </Button>
                <Button
                  onClick={handleExportPDF}
                  variant="secondary"
                  size="md"
                  fullWidth={true}
                  className="flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export PDF
                </Button>
              </div>
            </div>
            
            <div className="hidden xl:grid grid-cols-3 py-3 pb-1">
              <div className="flex space-x-2 self-center">
                <Button 
                  onClick={handleImportClick}
                  variant="primary"
                  size="md"
                >
                  Import CSV
                </Button>
                <Button
                  onClick={handleExportPDF}
                  variant="secondary"
                  size="md"
                >
                  Export PDF
                </Button>
              </div>

              <div className="flex justify-center">
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={handlePageChange} 
                  className="flex justify-center items-center gap-2" 
                />
              </div>
              
              <div></div>
            </div>
          </div>
        </div>
      )}

      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        style={{ display: 'none' }} 
      />

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
    </Layout>
  );
};

export default Flightlog;