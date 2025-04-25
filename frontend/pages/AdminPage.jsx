import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Sidebar, Alert, ResponsiveTable, Loading, ConfirmModal, Pagination, Button } from '../components';
import { userTableColumns, uavTableColumns, flightLogTableColumns, getEnhancedFlightLogColumns } from '../utils/tableDefinitions';
import { userFilterFormFields, uavEditFormFields } from '../utils/formDefinitions';
import { useAuth, useApi } from '../utils/authUtils';

const Spinner = ({ message = "Loading..." }) => <Loading message={message} />;

const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;
  
  const [isStaff, setIsStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  
  const [filters, setFilters] = useState({});
  const [debouncedFilters, setDebouncedFilters] = useState({});
  const filterTimer = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  
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
  const [confirmDeleteUavId, setConfirmDeleteUavId] = useState(null);
  
  const [userFlightLogs, setUserFlightLogs] = useState([]);
  const [loadingFlightLogs, setLoadingFlightLogs] = useState(false);
  const [flightLogsError, setFlightLogsError] = useState(null);
  const [flightLogCurrentPage, setFlightLogCurrentPage] = useState(1);
  const [flightLogTotalPages, setFlightLogTotalPages] = useState(0);
  const [flightLogPageSize] = useState(10);
  const [editingFlightLogId, setEditingFlightLogId] = useState(null);
  const [editingFlightLog, setEditingFlightLog] = useState(null);
  const [confirmDeleteFlightLogId, setConfirmDeleteFlightLogId] = useState(null);

  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const queryParams = {
      ...debouncedFilters,
      page: currentPage,
      page_size: pageSize
    };
    
    const result = await fetchData('/api/admin/users/', queryParams);
    
    if (!result.error) {
      if (result.data.results && result.data.count !== undefined) {
        setUsers(result.data.results);
        setTotalPages(Math.ceil(result.data.count / pageSize));
      } else {
        setUsers(result.data);
        setTotalPages(1);
      }
    }
    setIsLoading(false);
  }, [fetchData, currentPage, debouncedFilters, pageSize]);

  const fetchUserUAVs = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingUAVs(true);
    
    const queryParams = {
      user_id: userId,
      page: uavCurrentPage,
      page_size: uavPageSize
    };
    
    const result = await fetchData('/api/admin/uavs/', queryParams);
    
    if (!result.error) {
      if (result.data.results && result.data.count !== undefined) {
        setUserUAVs(result.data.results);
        setUavTotalPages(Math.ceil(result.data.count / uavPageSize));
      } else {
        setUserUAVs(result.data);
        setUavTotalPages(1);
      }
    }
    setLoadingUAVs(false);
  }, [fetchData, uavCurrentPage, uavPageSize]);

  const fetchUserFlightLogs = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingFlightLogs(true);
    setFlightLogsError(null);

    const queryParams = {
      user: userId,
      page: flightLogCurrentPage,
      page_size: flightLogPageSize
    };

    try {
      const result = await fetchData('/api/flightlogs/', queryParams);

      if (!result.error) {
        setUserFlightLogs(result.data.results || []);
        if (result.data.count !== undefined) {
          setFlightLogTotalPages(Math.ceil(result.data.count / flightLogPageSize));
        } else {
          setFlightLogTotalPages(1);
        }
      } else {
        setUserFlightLogs([]);
        setFlightLogTotalPages(0);
      }
    } catch (err) {
      setFlightLogsError('Failed to load flight logs');
      setUserFlightLogs([]);
      setFlightLogTotalPages(0);
    } finally {
      setLoadingFlightLogs(false);
    }
  }, [fetchData, flightLogCurrentPage, flightLogPageSize]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const auth = checkAuthAndGetUser();
      if (!auth) {
        setIsStaff(false);
        setLoading(false);
        return;
      }
      
      try {
        const result = await fetchData(`/api/users/${auth.user_id}/`);
        if (!result.error) {
          setIsStaff(result.data.is_staff === true);
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
  }, [checkAuthAndGetUser, fetchData]);

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

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    
    const result = await fetchData(
      `/api/admin/users/${editingUserId}/`, 
      {}, 
      'PUT', 
      editingUser
    );
    
    if (!result.error) {
      fetchUsers();
      setEditingUserId(null);
      setEditingUser(null);
      setError(null);
    }
  }, [fetchData, editingUser, editingUserId, fetchUsers]);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditingUser(null);
  }, []);

  const handleDeleteUser = useCallback((id) => {
    setConfirmDeleteUserId(id);
  }, []);

  const performDeleteUser = useCallback(async (id) => {
    const result = await fetchData(`/api/admin/users/${id}/`, {}, 'DELETE');
    
    if (!result.error) {
      fetchUsers();
      setEditingUserId(null);
      setEditingUser(null);
      setError(null);
    }
  }, [fetchData, fetchUsers]);

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
    
    const result = await fetchData(
      `/api/admin/uavs/${editingUavId}/`, 
      {}, 
      'PUT', 
      editingUav
    );
    
    if (!result.error) {
      fetchUserUAVs(selectedUserId);
      setEditingUavId(null);
      setEditingUav(null);
      setUavError(null);
    }
  }, [fetchData, editingUav, editingUavId, fetchUserUAVs, selectedUserId]);

  const handleUavCancelEdit = useCallback(() => {
    setEditingUavId(null);
    setEditingUav(null);
    setUavError(null);
  }, []);

  const handleDeleteUav = useCallback((id) => {
    setConfirmDeleteUavId(id);
  }, []);

  const performDeleteUav = useCallback(async (id) => {
    const result = await fetchData(`/api/admin/uavs/${id}/`, {}, 'DELETE');
    
    if (!result.error) {
      fetchUserUAVs(selectedUserId);
      setEditingUavId(null);
      setEditingUav(null);
      setUavError(null);
    } else {
      setUavError('An error occurred while deleting the UAV.');
    }
  }, [fetchData, fetchUserUAVs, selectedUserId]);

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
    
    const result = await fetchData(
      `/api/flightlogs/${editingFlightLogId}/`, 
      {}, 
      'PUT', 
      editingFlightLog
    );
    
    if (!result.error) {
      fetchUserFlightLogs(selectedUserId);
      setEditingFlightLogId(null);
      setEditingFlightLog(null);
      setFlightLogsError(null);
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
    const result = await fetchData(`/api/flightlogs/${id}/`, {}, 'DELETE');
    
    if (!result.error) {
      fetchUserFlightLogs(selectedUserId);
      setEditingFlightLogId(null);
      setEditingFlightLog(null);
      setFlightLogsError(null);
    } else {
      setFlightLogsError('An error occurred while deleting the flight log.');
    }
  }, [fetchData, fetchUserFlightLogs, selectedUserId]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  
  const toggleMobileFilters = useCallback(() => {
    setMobileFiltersVisible(prev => !prev);
  }, []);
  
  const handlePageChange = useCallback((page) => setCurrentPage(page), []);
  const handleUavPageChange = useCallback((page) => setUavCurrentPage(page), []);

  const enhancedFlightLogColumns = useMemo(() => {
    return getEnhancedFlightLogColumns(userUAVs);
  }, [userUAVs]);

  const tableStyles = {
    tableLayout: "fixed", 
    width: "100%"
  };

  if (loading) return <Loading />;
  if (!isStaff) return <Navigate to="/flightlog" state={{ from: location }} replace />;

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
          <h1 className="text-2xl font-semibold text-center flex-1">Admin Panel - User Management</h1>
        </div>
        <Alert type="error" message={error} />
        {isLoading ? <Loading /> : (
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
              columns={userTableColumns}
              data={users}
              onEdit={handleEdit}
              filterFields={userFilterFormFields}
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
              mobileFiltersVisible={mobileFiltersVisible}
              tableStyles={tableStyles}
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
                      tableStyles={tableStyles}
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
                        columns={enhancedFlightLogColumns}
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
                        tableStyles={tableStyles}
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
