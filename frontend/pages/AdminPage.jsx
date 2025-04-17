import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Sidebar, Alert, ResponsiveTable } from '../components';

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

  useEffect(() => {
    if (selectedUserId) {
      fetchUserUAVs(selectedUserId);
    } else {
      setUserUAVs([]);
    }
  }, [fetchUserUAVs, selectedUserId, uavCurrentPage]);

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
      
      // Clear selected user for UAVs when editing
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

  const handleDeleteUser = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
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
    }
  }, [users]);

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
    { header: 'Flight Time', accessor: 'total_flight_time', render: (seconds) => {
      if (!seconds) return 'N/A';
      const hh = Math.floor(seconds / 3600);
      const mm = Math.floor((seconds % 3600) / 60);
      return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    }},
    { header: 'TO', accessor: 'total_takeoffs' },
    { header: 'LDG', accessor: 'total_landings' },
    { header: 'Reg. Number', accessor: 'registration_number' }
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

  const editFormFields = [
    { name: 'email', label: 'Email', type: 'email', placeholder: 'Email' },
    { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'First Name' },
    { name: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Last Name' },
    { name: 'phone', label: 'Phone', type: 'text', placeholder: 'Phone' },
    { name: 'street', label: 'Street', type: 'text', placeholder: 'Street' },
    { name: 'zip', label: 'ZIP', type: 'text', placeholder: 'ZIP' },
    { name: 'city', label: 'City', type: 'text', placeholder: 'City' },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'Country' },
    { name: 'company', label: 'Company', type: 'text', placeholder: 'Company' },
    { name: 'drone_ops_nb', label: 'Drone Ops #', type: 'text', placeholder: 'Drone Operations Number' },
    { name: 'pilot_license_nb', label: 'Pilot License #', type: 'text', placeholder: 'Pilot License Number' },
    { name: 'a1_a3', label: 'A1/A3 Date', type: 'date', placeholder: 'A1/A3 Date' },
    { name: 'a2', label: 'A2 Date', type: 'date', placeholder: 'A2 Date' },
    { name: 'sts', label: 'STS Date', type: 'date', placeholder: 'STS Date' },
    { name: 'is_staff', label: 'Staff Status', type: 'select', placeholder: 'Staff Status', options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }] },
    { name: 'is_active', label: 'Active Status', type: 'select', placeholder: 'Active Status', options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }] }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isStaff) {
    return <Navigate to="/flightlog" state={{ from: location }} replace />;
  }

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
          <h1 className="text-2xl font-semibold text-center flex-1">Admin Panel - User Management</h1>
        </div>
        <Alert type="error" message={error} />
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
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

            {selectedUserId && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold mb-4">
                  Aircraft for {selectedUserName}
                </h2>
                
                {loadingUAVs ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : userUAVs.length > 0 ? (
                  <>
                    <ResponsiveTable 
                      columns={uavTableColumns}
                      data={userUAVs}
                      rowClickable={false}
                      showActionColumn={false}
                      idField="uav_id"
                      titleField="drone_name"
                      filterFields={[]} // Add empty array to prevent mapping error
                      filters={{}}      // Add empty object for filters
                    />
                    
                    {uavTotalPages > 1 && (
                      <div className="flex justify-center items-center mt-4 gap-2">
                        <button 
                          onClick={() => handleUavPageChange(Math.max(1, uavCurrentPage - 1))}
                          disabled={uavCurrentPage === 1}
                          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                        >
                          &laquo; Prev
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: uavTotalPages }, (_, i) => i + 1)
                            .filter(page => page >= uavCurrentPage - 1 && page <= uavCurrentPage + 1)
                            .map(page => (
                              <button
                                key={page}
                                onClick={() => handleUavPageChange(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded ${uavCurrentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                              >
                                {page}
                              </button>
                            ))
                          }
                        </div>
                        <button 
                          onClick={() => handleUavPageChange(Math.min(uavTotalPages, uavCurrentPage + 1))}
                          disabled={uavCurrentPage === uavTotalPages}
                          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                        >
                          Next &raquo;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 bg-gray-100 rounded-md">
                    This user has no registered aircraft.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
