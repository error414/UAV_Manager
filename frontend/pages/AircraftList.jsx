import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Alert, Button, ResponsiveTable, Loading, ConfirmModal, Pagination } from '../components';
import { uavTableColumns } from '../utils/tableDefinitions';
import { UAV_INITIAL_FILTERS } from '../utils/filterDefinitions';
import { useAuth, useApi } from '../utils/authUtils';

const AircraftList = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const filterFieldsForTable = uavTableColumns.map(col => ({
    name: col.accessor,
    placeholder: col.header,
  }));

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
  const [filters, setFilters] = useState(UAV_INITIAL_FILTERS);
  const filtersRef = useRef(filters);
  
  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

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

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    fetchAircrafts();
  }, [fetchAircrafts]);

  useEffect(() => {
    return () => {
      if (filterTimer.current) {
        clearTimeout(filterTimer.current);
      }
    };
  }, []);

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

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;

    setFilters(prev => {
      const updated = { ...prev, [name]: value };
      filtersRef.current = updated;
      if (filterTimer.current) {
        clearTimeout(filterTimer.current);
      }
      filterTimer.current = setTimeout(() => {
        setCurrentPage(1);
        setDebouncedFilters({ ...filtersRef.current });
      }, 500);
      return updated;
    });
  }, []);

  const handleNewAircraft = () => {
    navigate('/newaircraft');
  };

  const handleImportCSV = () => {
    fileInputRef.current.click();
  };

  const handleAircraftClick = (uavId) => {
    navigate(`/aircraftsettings/${uavId}`);
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

  const modifiedAircrafts = aircrafts.map(aircraft => ({
    ...aircraft,
    flightlog_id: aircraft.uav_id
  }));

  return (
    <div className="flex h-screen relative">
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
            columns={uavTableColumns}
            data={modifiedAircrafts || []}
            filterFields={filterFieldsForTable}
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
        
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />

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