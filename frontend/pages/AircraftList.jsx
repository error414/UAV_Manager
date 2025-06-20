import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Alert, Button, ResponsiveTable, Loading, ConfirmModal, Pagination } from '../components';
import { uavTableColumns, UAV_INITIAL_FILTERS, extractUavId } from '../utils';
import { useAuth, useApi } from '../hooks';

// Debounced filter hook for input fields
function useDebouncedFilters(initialFilters, delay = 500) {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);
  const filterTimer = useRef(null);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const updated = { ...prev, [name]: value };
      if (filterTimer.current) clearTimeout(filterTimer.current);
      filterTimer.current = setTimeout(() => {
        setDebouncedFilters(updated);
      }, delay);
      return updated;
    });
  }, [delay]);

  useEffect(() => {
    return () => {
      if (filterTimer.current) clearTimeout(filterTimer.current);
    };
  }, []);

  return { filters, setFilters, debouncedFilters, handleFilterChange };
}

const AircraftList = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [aircrafts, setAircrafts] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobilePage, setMobilePage] = useState(1);
  const [pageSize, setPageSize] = useState(17);
  const [pageSizeInitialized, setPageSizeInitialized] = useState(false);
  const [pageSizeCalculationAttempted, setPageSizeCalculationAttempted] = useState(false);
  const tableContainerRef = useRef(null);
  const [totalPages, setTotalPages] = useState(0);
  const [sortField] = useState('drone_name');
  const [importResult, setImportResult] = useState(null);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);

  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  // Debounced filter hook
  const {
    filters,
    debouncedFilters,
    handleFilterChange
  } = useDebouncedFilters(UAV_INITIAL_FILTERS);

  // Dynamically calculate optimal desktop page size
  const calculateOptimalPageSize = useCallback(() => {
    if (!tableContainerRef.current) {
      if (!pageSizeCalculationAttempted) {
        setPageSizeCalculationAttempted(true);
        setPageSizeInitialized(true);
      }
      return;
    }
    const container = tableContainerRef.current;
    const viewportHeight = window.innerHeight;
    const rect = container.getBoundingClientRect();
    // Reserve space for pagination/buttons at the bottom
    const bottomMargin = 120;
    const availableHeight = Math.max(100, viewportHeight - rect.top - bottomMargin);
    const estimatedRowHeight = 53;
    let optimalRows = Math.floor(availableHeight / estimatedRowHeight);
    optimalRows = Math.max(1, Math.min(optimalRows, 50));
    setPageSize(optimalRows);
    setPageSizeInitialized(true);
    setPageSizeCalculationAttempted(true);
  }, [pageSizeCalculationAttempted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateOptimalPageSize();
    }, 250);
    // Fallback in case calculation fails
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

  // Fetch aircraft data using current filters and pagination
  const fetchAircrafts = useCallback(async () => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;
    setIsLoading(true);
    const queryParams = {
      ...debouncedFilters,
      page: currentPage,
      page_size: pageSize,
      ordering: sortField
    };
    const result = await fetchData('/api/uavs/', queryParams);
    if (!result.error) {
      setAircrafts(result.data.results || []);
      setTotalPages(Math.ceil((result.data.count || 0) / pageSize));
    }
    setIsLoading(false);
  }, [fetchData, checkAuthAndGetUser, debouncedFilters, currentPage, pageSize, sortField]);

  useEffect(() => {
    if (pageSizeInitialized) {
      fetchAircrafts();
    }
  }, [fetchAircrafts, pageSizeInitialized, debouncedFilters, currentPage, sortField]);

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
      setError('Failed to upload CSV. Please try again.');
      setIsLoading(false);
    }
  };

  const handleNewAircraft = () => navigate('/newaircraft');
  const handleImportCSV = () => fileInputRef.current.click();
  const handleAircraftClick = (uav) => navigate(`/aircraftsettings/${extractUavId(uav)}`);

  const handleExportCSV = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all aircraft data for export (without pagination)
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      
      const queryParams = {
        ...debouncedFilters,
        page_size: 10000, // Large number to get all records
        ordering: sortField
      };
      
      const result = await fetchData('/api/uavs/', queryParams);
      
      if (result.error) {
        setError('Failed to fetch aircraft data for export');
        setIsLoading(false);
        return;
      }
      
      const allAircrafts = result.data.results || [];
      
      if (allAircrafts.length === 0) {
        alert('No aircraft data to export.');
        setIsLoading(false);
        return;
      }
      
      const headers = [
        'drone_name', 'manufacturer', 'type', 'motors', 'motor_type',
        'video', 'video_system', 'esc', 'esc_firmware', 'receiver',
        'receiver_firmware', 'flight_controller', 'firmware', 'firmware_version',
        'gps', 'mag', 'baro', 'gyro', 'acc', 'registration_number', 'serial_number'
      ];
      
      const csvData = allAircrafts.map(aircraft => headers.map(h => aircraft[h] || ''));
      csvData.unshift(headers);
      
      const csvContent = csvData.map(row =>
        row.map(cell => {
          if (cell === null || cell === undefined) return '';
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
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
    } catch (err) {
      setError('Failed to export CSV. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMobileFilters = () => setMobileFiltersVisible(prev => !prev);

  const MOBILE_PAGE_SIZE = 7; // Fixed value for mobile pagination

  // Returns paged data for mobile view
  const getMobilePagedData = () => {
    const start = (mobilePage - 1) * MOBILE_PAGE_SIZE;
    return modifiedAircrafts.slice(start, start + MOBILE_PAGE_SIZE);
  };

  // Reset mobile page when data or filters change
  useEffect(() => {
    setMobilePage(1);
  }, [aircrafts, filters]);

  const modifiedAircrafts = aircrafts.map(aircraft => ({
    ...aircraft,
    flightlog_id: extractUavId(aircraft)
  }));

  return (
    <Layout title="Aircraft List">
      <Alert type="error" message={error} />
      {isLoading ? (
        <Loading message="Loading aircraft data..." />
      ) : (
        <>
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
          {/* Desktop table container with dynamic height and white background */}
          <div className="hidden md:block md:flex flex-col w-full">
            <div
              className="overflow-hidden rounded-lg border border-gray-200 shadow-md bg-white inline-block align-top"
              ref={tableContainerRef}
            >
              <ResponsiveTable
                columns={uavTableColumns}
                data={modifiedAircrafts || []}
                filterFields={uavTableColumns.map(col => ({
                  name: col.accessor,
                  placeholder: col.header,
                }))}
                filters={filters}
                onFilterChange={handleFilterChange}
                onEdit={handleAircraftClick}
                onRowClick={handleAircraftClick}
                hideDesktopFilters={true}
                rowClickable={true}
                showActionColumn={false}
                idField="flightlog_id"
                titleField="drone_name"
                mobileFiltersVisible={mobileFiltersVisible}
                tableStyles={{ width: '100%' }}
              />
            </div>
          </div>
          {/* Mobile table with fixed pagination */}
          <div className="md:hidden">
            <ResponsiveTable
              columns={uavTableColumns}
              data={getMobilePagedData()}
              filterFields={uavTableColumns.map(col => ({
                name: col.accessor,
                placeholder: col.header,
              }))}
              filters={filters}
              onFilterChange={handleFilterChange}
              onEdit={handleAircraftClick}
              onRowClick={handleAircraftClick}
              hideDesktopFilters={true}
              rowClickable={true}
              showActionColumn={false}
              idField="flightlog_id"
              titleField="drone_name"
              mobileFiltersVisible={mobileFiltersVisible}
              tableStyles={{ width: '100%' }}
            />
            <Pagination
              currentPage={mobilePage}
              totalPages={Math.max(1, Math.ceil((modifiedAircrafts.length || 0) / MOBILE_PAGE_SIZE))}
              onPageChange={setMobilePage}
              className="flex justify-center items-center mt-2 gap-2"
            />
          </div>
        </>
      )}
      {/* Desktop pagination */}
      <div className="hidden md:flex justify-center gap-4 p-4 mt-4">
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>
      <div className="flex justify-center gap-4 p-4 mt-4">
        <Button 
          onClick={handleNewAircraft} 
          variant="primary"
          fullWidth={false}
          className="max-w-xs"
        >
          New Aircraft
        </Button>
        <Button 
          onClick={handleImportCSV} 
          variant="primary"
          fullWidth={false}
          className="max-w-xs"
        >
          Import CSV
        </Button>
        <Button 
          onClick={handleExportCSV} 
          variant="primary"
          fullWidth={false}
          className="max-w-xs"
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
    </Layout>
  );
};

export default AircraftList;