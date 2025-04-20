import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Sidebar, Alert, ResponsiveTable, Loading, ConfirmModal } from '../components';

const Spinner = ({ message = "Loading..." }) => <Loading message={message} />;

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  totalPages > 1 && (
    <div className="flex justify-center items-center mt-4 gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        &laquo; Prev
      </button>
      <div className="flex items-center gap-1">
        {currentPage > 3 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              1
            </button>
            {currentPage > 4 && <span className="px-1">...</span>}
          </>
        )}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(page => {
            if ((currentPage > 3 && page === 1) || (currentPage < totalPages - 2 && page === totalPages)) return false;
            return page >= currentPage - 1 && page <= currentPage + 1;
          })
          .map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {page}
            </button>
          ))}
        {currentPage < totalPages - 2 && (
          <>
            {currentPage < totalPages - 3 && <span className="px-1">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {totalPages}
            </button>
          </>
        )}
      </div>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        Next &raquo;
      </button>
    </div>
  )
);

const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isStaff, setIsStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState({});
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const filterTimer = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [userUAVs, setUserUAVs] = useState([]);
  const [loadingUAVs, setLoadingUAVs] = useState(false);
  const [uavCurrentPage, setUavCurrentPage] = useState(1);
  const [uavTotalPages, setUavTotalPages] = useState(0);
  const [uavPageSize] = useState(10);
  const [editingUavId, setEditingUavId] = useState(null);
  const [editingUav, setEditingUav] = useState(null);
  const [uavError, setUavError] = useState(null);
  const [userFlightLogs, setUserFlightLogs] = useState([]);
  const [loadingFlightLogs, setLoadingFlightLogs] = useState(false);
  const [flightLogsError, setFlightLogsError] = useState(null);
  const [flightLogCurrentPage, setFlightLogCurrentPage] = useState(1);
  const [flightLogTotalPages, setFlightLogTotalPages] = useState(0);
  const [flightLogPageSize] = useState(10);
  const [editingFlightLogId, setEditingFlightLogId] = useState(null);
  const [editingFlightLog, setEditingFlightLog] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [confirmDeleteUavId, setConfirmDeleteUavId] = useState(null);
  const [confirmDeleteFlightLogId, setConfirmDeleteFlightLogId] = useState(null);

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

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      if (!token || !user_id) {
        setIsStaff(false);
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/users/${user_id}/`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const userData = await response.json();
          setIsStaff(userData.is_staff === true);
        } else {
          setIsStaff(false);
        }
      } catch {
        setIsStaff(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminStatus();
  }, [API_URL, getAuthHeaders]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const queryParams = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    queryParams.append('page', currentPage);
    queryParams.append('page_size', pageSize);
    try {
      const response = await fetch(`${API_URL}/api/admin/users/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        if (handleAuthError(response)) return;
        if (response.status === 403) {
          setError('You do not have permission to access the admin panel.');
          navigate('/flightlog');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      if (data.results && data.count !== undefined) {
        setUsers(data.results);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setUsers(data);
        setTotalPages(1);
      }
    } catch (err) {
      setError('Could not load users: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, currentPage, debouncedFilters, getAuthHeaders, handleAuthError, navigate, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => {
      setDebouncedFilters(filters);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (filterTimer.current) clearTimeout(filterTimer.current);
    };
  }, [filters]);

  const fetchUserUAVs = useCallback(async (userId) => {
    if (!userId) return;

    setLoadingUAVs(true);
    const queryParams = new URLSearchParams();
    queryParams.append('user_id', userId);
    queryParams.append('page', uavCurrentPage);
    queryParams.append('page_size', uavPageSize);

    try {
      const response = await fetch(`${API_URL}/api/admin/uavs/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to fetch user UAVs');
      }

      const data = await response.json();
      if (data.results && data.count !== undefined) {
        setUserUAVs(data.results);
        setUavTotalPages(Math.ceil(data.count / uavPageSize));
      } else {
        setUserUAVs(data);
        setUavTotalPages(1);
      }
    } catch (err) {
      setError('Could not load user UAVs: ' + err.message);
    } finally {
      setLoadingUAVs(false);
    }
  }, [API_URL, getAuthHeaders, handleAuthError, uavCurrentPage, uavPageSize]);

  const fetchUserFlightLogs = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingFlightLogs(true);
    setFlightLogsError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('user_id', userId);
      queryParams.append('page', flightLogCurrentPage);
      queryParams.append('page_size', flightLogPageSize);
      const response = await fetch(`${API_URL}/api/flightlogs/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to fetch user flight logs');
      }
      const data = await response.json();
      const filteredLogs = (data.results || []).filter(log => log.user === userId || log.user === Number(userId));
      setUserFlightLogs(filteredLogs);
      if (data.count !== undefined) {
        setFlightLogTotalPages(Math.ceil(data.count / flightLogPageSize));
      } else {
        setFlightLogTotalPages(1);
      }
    } catch (err) {
      setFlightLogsError('Could not load user flight logs: ' + err.message);
      setUserFlightLogs([]);
      setFlightLogTotalPages(0);
    } finally {
      setLoadingFlightLogs(false);
    }
  }, [API_URL, getAuthHeaders, handleAuthError, flightLogCurrentPage, flightLogPageSize]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserUAVs(selectedUserId);
      fetchUserFlightLogs(selectedUserId);
    } else {
      setUserUAVs([]);
      setUserFlightLogs([]);
      setFlightLogTotalPages(0);
    }
  }, [fetchUserUAVs, fetchUserFlightLogs, selectedUserId, uavCurrentPage, flightLogCurrentPage]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditingUser(prev => {
      if (name === 'is_staff' || name === 'is_active') {
        return { ...prev, [name]: value === 'true' || value === true };
      }
      return { ...prev, [name]: value };
    });
  }, []);

  const handleEdit = useCallback((id) => {
    const userToEdit = users.find(user => user.user_id === id);
    if (userToEdit) {
      setEditingUser({ ...userToEdit });
      setEditingUserId(id);

      setSelectedUserId(null);
      setSelectedUserName('');
    }
  }, [users]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${editingUserId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(editingUser)
      });
      if (!response.ok) {
        if (handleAuthError(response)) return;
        const errorData = await response.json();
        setError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return;
      }
      fetchUsers();
      setEditingUserId(null);
      setEditingUser(null);
      setError(null);
    } catch {
      setError('An error occurred while saving the user.');
    }
  }, [API_URL, editingUser, editingUserId, fetchUsers, getAuthHeaders, handleAuthError]);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditingUser(null);
  }, []);

  const handleDeleteUser = useCallback((id) => {
    setConfirmDeleteUserId(id);
  }, []);

  const performDeleteUser = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to delete user');
      }
      fetchUsers();
      setEditingUserId(null);
      setEditingUser(null);
      setError(null);
    } catch {
      setError('An error occurred while deleting the user.');
    }
  }, [API_URL, fetchUsers, getAuthHeaders, handleAuthError]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleUavPageChange = useCallback((page) => {
    setUavCurrentPage(page);
  }, []);

  const handleUserSelect = useCallback((id) => {
    const selectedUser = users.find(user => user.user_id === id);
    if (selectedUser) {
      setSelectedUserId(id);
      setSelectedUserName(`${selectedUser.first_name || ''} ${selectedUser.last_name || ''} (${selectedUser.email})`);
      setUavCurrentPage(1);

      setEditingUavId(null);
      setEditingUav(null);
    }
  }, [users]);

  const handleUavEdit = useCallback((id) => {
    const uavToEdit = userUAVs.find(uav => uav.uav_id === id);
    if (uavToEdit) {
      setEditingUav({ ...uavToEdit });
      setEditingUavId(id);
      setUavError(null);
    }
  }, [userUAVs]);

  const handleUavEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditingUav(prev => {
      if (name === 'motors') {
        return { ...prev, [name]: parseInt(value) || 0 };
      }
      if (name === 'is_active') {
        return { ...prev, [name]: value === 'true' || value === true };
      }
      return { ...prev, [name]: value };
    });
  }, []);

  const handleUavSaveEdit = useCallback(async () => {
    if (!editingUav) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/uavs/${editingUavId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(editingUav)
      });

      if (!response.ok) {
        if (handleAuthError(response)) return;
        const errorData = await response.json();
        setUavError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return;
      }

      fetchUserUAVs(selectedUserId);
      setEditingUavId(null);
      setEditingUav(null);
      setUavError(null);
    } catch (err) {
      setUavError('An error occurred while saving the UAV.');
    }
  }, [API_URL, editingUav, editingUavId, fetchUserUAVs, getAuthHeaders, handleAuthError, selectedUserId]);

  const handleUavCancelEdit = useCallback(() => {
    setEditingUavId(null);
    setEditingUav(null);
    setUavError(null);
  }, []);

  const handleDeleteUav = useCallback((id) => {
    setConfirmDeleteUavId(id);
  }, []);

  const performDeleteUav = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/uavs/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to delete UAV');
      }

      fetchUserUAVs(selectedUserId);
      setEditingUavId(null);
      setEditingUav(null);
      setUavError(null);
    } catch (err) {
      setUavError('An error occurred while deleting the UAV.');
    }
  }, [API_URL, fetchUserUAVs, getAuthHeaders, handleAuthError, selectedUserId]);

  const handleFlightLogEdit = (id) => {
    const logToEdit = userFlightLogs.find(log => log.flightlog_id === id);
    if (logToEdit) {
      setEditingUav(null);
      setEditingUavId(null);
      setEditingUser(null);
      setEditingUserId(null);
      setEditingFlightLog({ ...logToEdit });
      setEditingFlightLogId(id);
    }
  };

  const handleFlightLogEditChange = (e) => {
    const { name, value } = e.target;
    setEditingFlightLog(prev => ({ ...prev, [name]: value }));
  };

  const handleFlightLogSaveEdit = async () => {
    if (!editingFlightLog) return;
    try {
      const response = await fetch(`${API_URL}/api/flightlogs/${editingFlightLogId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(editingFlightLog)
      });
      if (!response.ok) {
        if (handleAuthError(response)) return;
        const errorData = await response.json();
        setFlightLogsError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return;
      }
      fetchUserFlightLogs(selectedUserId);
      setEditingFlightLogId(null);
      setEditingFlightLog(null);
      setFlightLogsError(null);
    } catch (err) {
      setFlightLogsError('An error occurred while saving the flight log.');
    }
  };

  const handleFlightLogCancelEdit = () => {
    setEditingFlightLogId(null);
    setEditingFlightLog(null);
  };

  const handleFlightLogDelete = useCallback((id) => {
    setConfirmDeleteFlightLogId(id);
  }, []);

  const performDeleteFlightLog = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/flightlogs/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        if (handleAuthError(response)) return;
        throw new Error('Failed to delete flight log');
      }
      fetchUserFlightLogs(selectedUserId);
      setEditingFlightLogId(null);
      setEditingFlightLog(null);
      setFlightLogsError(null);
    } catch (err) {
      setFlightLogsError('An error occurred while deleting the flight log.');
    }
  }, [API_URL, fetchUserFlightLogs, getAuthHeaders, handleAuthError, selectedUserId]);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tableColumns = [
    { header: 'Email', accessor: 'email' },
    { header: 'First Name', accessor: 'first_name' },
    { header: 'Last Name', accessor: 'last_name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Street', accessor: 'street' },
    { header: 'ZIP', accessor: 'zip' },
    { header: 'City', accessor: 'city' },
    { header: 'Country', accessor: 'country' },
    { header: 'Staff Status', accessor: 'is_staff', render: (value) => value ? 'Yes' : 'No' },
    { header: 'Active', accessor: 'is_active', render: (value) => value ? 'Yes' : 'No' }
  ];

  const uavTableColumns = [
    { header: 'Aircraft', accessor: 'drone_name' },
    { header: 'Manufacturer', accessor: 'manufacturer' },
    { header: 'Type', accessor: 'type' },
    { header: 'Motors', accessor: 'motors' },
    { header: 'Motor Type', accessor: 'motor_type' },
    { header: 'Flight Time', accessor: 'total_flight_time', render: (seconds) => {
      if (!seconds) return 'N/A';
      const hh = Math.floor(seconds / 3600);
      const mm = Math.floor((seconds % 3600) / 60);
      return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    }},
    { header: 'TO', accessor: 'total_takeoffs' },
    { header: 'LDG', accessor: 'total_landings' },
    { header: 'Flight Controller', accessor: 'flight_controller' },
    { header: 'Firmware', accessor: 'firmware' },
    { header: 'Version', accessor: 'firmware_version' },
    { header: 'ESC', accessor: 'esc' },
    { header: 'ESC Firmware', accessor: 'esc_firmware' },
    { header: 'Video', accessor: 'video' },
    { header: 'Video System', accessor: 'video_system' },
    { header: 'Receiver', accessor: 'receiver' },
    { header: 'Receiver FW', accessor: 'receiver_firmware' },
    { header: 'GPS', accessor: 'gps' },
    { header: 'MAG', accessor: 'mag' },
    { header: 'BARO', accessor: 'baro' },
    { header: 'GYRO', accessor: 'gyro' },
    { header: 'ACC', accessor: 'acc' },
    { header: 'Reg. Number', accessor: 'registration_number' },
    { header: 'Serial Number', accessor: 'serial_number' },
    { header: 'Status', accessor: 'is_active', render: (value) => value ? 'Active' : 'Inactive' }
  ];

  const flightLogTableColumns = [
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
    { header: 'Comments', accessor: 'comments' }
  ];

  const filterFormFields = [
    { name: 'email', label: 'Email', type: 'text', placeholder: 'Search by email' },
    { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'Search by first name' },
    { name: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Search by last name' },
    { name: 'phone', label: 'Phone', type: 'text', placeholder: 'Search by phone' },
    { name: 'street', label: 'Street', type: 'text', placeholder: 'Search by street' },
    { name: 'zip', label: 'ZIP', type: 'text', placeholder: 'Search by ZIP' },
    { name: 'city', label: 'City', type: 'text', placeholder: 'Search by city' },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'Search by country' },
    { name: 'is_staff', label: 'Staff Status', type: 'select', placeholder: 'Select staff status', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
    { name: 'is_active', label: 'Active Status', type: 'select', placeholder: 'Select active status', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }
  ];

  const uavEditFormFields = [
    { name: 'drone_name', label: 'Aircraft Name', type: 'text', placeholder: 'Aircraft Name' },
    { name: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'Manufacturer' },
    { name: 'type', label: 'Type', type: 'text', placeholder: 'Type' },
    { name: 'motors', label: 'Motors', type: 'number', placeholder: 'Number of Motors' },
    { name: 'motor_type', label: 'Motor Type', type: 'text', placeholder: 'Motor Type' },
    { name: 'video', label: 'Video', type: 'text', placeholder: 'Video' },
    { name: 'video_system', label: 'Video System', type: 'text', placeholder: 'Video System' },
    { name: 'esc', label: 'ESC', type: 'text', placeholder: 'ESC' },
    { name: 'esc_firmware', label: 'ESC Firmware', type: 'text', placeholder: 'ESC Firmware' },
    { name: 'receiver', label: 'Receiver', type: 'text', placeholder: 'Receiver' },
    { name: 'receiver_firmware', label: 'Receiver Firmware', type: 'text', placeholder: 'Receiver Firmware' },
    { name: 'flight_controller', label: 'Flight Controller', type: 'text', placeholder: 'Flight Controller' },
    { name: 'firmware', label: 'Firmware', type: 'text', placeholder: 'Firmware' },
    { name: 'firmware_version', label: 'Firmware Version', type: 'text', placeholder: 'Firmware Version' },
    { name: 'gps', label: 'GPS', type: 'text', placeholder: 'GPS' },
    { name: 'mag', label: 'MAG', type: 'text', placeholder: 'MAG' },
    { name: 'baro', label: 'BARO', type: 'text', placeholder: 'BARO' },
    { name: 'gyro', label: 'GYRO', type: 'text', placeholder: 'GYRO' },
    { name: 'acc', label: 'ACC', type: 'text', placeholder: 'ACC' },
    { name: 'registration_number', label: 'Registration Number', type: 'text', placeholder: 'Registration Number' },
    { name: 'serial_number', label: 'Serial Number', type: 'text', placeholder: 'Serial Number' },
    { name: 'is_active', label: 'Active Status', type: 'select', placeholder: 'Active Status', options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }] }
  ];

  if (loading) return <Loading />;
  if (!isStaff) return <Navigate to="/flightlog" state={{ from: location }} replace />;

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
          <h1 className="text-2xl font-semibold text-center flex-1">Admin Panel - User Management</h1>
        </div>
        <Alert type="error" message={error} />
        {isLoading ? <Loading /> : (
          <>
            <ResponsiveTable 
              columns={tableColumns}
              data={users}
              onEdit={handleEdit}
              filterFields={filterFormFields}
              filters={filters}
              onFilterChange={handleFilterChange}
              editingId={editingUserId}
              editingData={editingUser}
              onEditChange={handleEditChange}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={handleDeleteUser}
              showAddRow={false}
              rowClickable={true}
              showActionColumn={true}
              actionColumnText="Actions"
              idField="user_id"
              titleField="email"
              onRowClick={handleUserSelect}
            />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            {selectedUserId && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold mb-4 text-center">Aircraft for {selectedUserName}</h2>
                {loadingUAVs ? <Loading /> : userUAVs.length > 0 ? (
                  <>
                    <Alert type="error" message={uavError} />
                    <ResponsiveTable 
                      columns={uavTableColumns}
                      data={userUAVs}
                      onEdit={handleUavEdit}
                      filterFields={[]}
                      filters={{}}
                      rowClickable={false}
                      showActionColumn={true}
                      actionColumnText="Actions"
                      idField="uav_id"
                      titleField="drone_name"
                      editingId={editingUavId}
                      editingData={editingUav}
                      onEditChange={handleUavEditChange}
                      onSaveEdit={handleUavSaveEdit}
                      onCancelEdit={handleUavCancelEdit}
                      onDelete={handleDeleteUav}
                      editFormFields={uavEditFormFields}
                    />
                    <Pagination currentPage={uavCurrentPage} totalPages={uavTotalPages} onPageChange={handleUavPageChange} />
                  </>
                ) : (
                  <div className="text-center py-4 bg-gray-100 rounded-md">This user has no registered aircraft.</div>
                )}
                <div className="mt-10">
                  <h2 className="text-xl font-semibold mb-4 text-center">Flight Logs for {selectedUserName}</h2>
                  {loadingFlightLogs ? <Loading /> : flightLogsError ? (
                    <Alert type="error" message={flightLogsError} />
                  ) : userFlightLogs.length > 0 ? (
                    <>
                      <ResponsiveTable
                        columns={flightLogTableColumns}
                        data={userFlightLogs}
                        filterFields={[]}
                        filters={{}}
                        rowClickable={false}
                        showActionColumn={true}
                        actionColumnText="Actions"
                        idField="flightlog_id"
                        titleField="departure_date"
                        onEdit={handleFlightLogEdit}
                        editingId={editingFlightLogId}
                        editingData={editingFlightLog}
                        onEditChange={handleFlightLogEditChange}
                        onSaveEdit={handleFlightLogSaveEdit}
                        onCancelEdit={handleFlightLogCancelEdit}
                        onDelete={handleFlightLogDelete}
                        editFormFields={flightLogTableColumns.map(col => ({
                          name: col.accessor,
                          label: col.header,
                          type: 'text',
                          placeholder: col.header
                        }))}
                      />
                      <Pagination currentPage={flightLogCurrentPage} totalPages={flightLogTotalPages} onPageChange={setFlightLogCurrentPage} />
                    </>
                  ) : (
                    <div className="text-center py-4 bg-gray-100 rounded-md">This user has no flight logs.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <ConfirmModal
          open={!!confirmDeleteUserId}
          title="Delete User"
          message="Are you sure you want to delete this user? This action cannot be undone."
          onConfirm={() => {
            performDeleteUser(confirmDeleteUserId);
            setConfirmDeleteUserId(null);
          }}
          onCancel={() => setConfirmDeleteUserId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
        <ConfirmModal
          open={!!confirmDeleteUavId}
          title="Delete UAV"
          message="Are you sure you want to delete this UAV? All flight logs associated with this UAV will also be deleted. This action cannot be undone."
          onConfirm={() => {
            performDeleteUav(confirmDeleteUavId);
            setConfirmDeleteUavId(null);
          }}
          onCancel={() => setConfirmDeleteUavId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
        <ConfirmModal
          open={!!confirmDeleteFlightLogId}
          title="Delete Flight Log"
          message="Are you sure you want to delete this flight log?"
          onConfirm={() => {
            performDeleteFlightLog(confirmDeleteFlightLogId);
            setConfirmDeleteFlightLogId(null);
          }}
          onCancel={() => setConfirmDeleteFlightLogId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};

export default AdminPage;
