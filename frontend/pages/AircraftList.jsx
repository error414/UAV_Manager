import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Alert, Button, ResponsiveTable, Loading, ConfirmModal, Pagination } from '../components';
import { uavTableColumns, UAV_INITIAL_FILTERS, extractUavId } from '../utils';
import { useAuth, useApi, useUAVs } from '../hooks';

// Hilfshook für debounce-Filter
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

  // Cleanup
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
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState('drone_name');
  const [importResult, setImportResult] = useState(null);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);

  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  // Debounced Filter Hook
  const {
    filters,
    setFilters,
    debouncedFilters,
    handleFilterChange
  } = useDebouncedFilters(UAV_INITIAL_FILTERS);

  // UAVs laden (nutzt useUAVs, aber hier für die Tabelle)
  const { fetchUAVs } = useUAVs(
    async (cb) => {
      const auth = checkAuthAndGetUser();
      if (!auth) return null;
      return await cb();
    },
    fetchData,
    setAircrafts
  );

  // Daten laden
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
    fetchAircrafts();
  }, [fetchAircrafts]);

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
  const handlePageChange = useCallback((page) => setCurrentPage(page), []);

  const handleExportCSV = () => {
    if (aircrafts.length === 0) {
      alert('No aircraft data to export.');
      return;
    }
    const headers = [
      'drone_name', 'manufacturer', 'type', 'motors', 'motor_type',
      'video', 'video_system', 'esc', 'esc_firmware', 'receiver',
      'receiver_firmware', 'flight_controller', 'firmware', 'firmware_version',
      'gps', 'mag', 'baro', 'gyro', 'acc', 'registration_number', 'serial_number'
    ];
    const csvData = aircrafts.map(aircraft => headers.map(h => aircraft[h] || ''));
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
  };

  const toggleMobileFilters = () => setMobileFiltersVisible(prev => !prev);

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
            hideDesktopFilters={false}
            rowClickable={true}
            showActionColumn={false}
            idField="flightlog_id"
            titleField="drone_name"
            mobileFiltersVisible={mobileFiltersVisible}
          />
        </>
      )}
      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={handlePageChange} 
      />
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