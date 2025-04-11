import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Alert, Sidebar, AircraftForm } from '../components';

// Custom hook for form management
const useAircraftForm = (isEditMode, uavId) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [canDelete, setCanDelete] = useState(true);
  
  // Default form values - add is_active field
  const defaultFormData = {
    drone_name: '',
    manufacturer: '',
    type: 'Quad',
    motors: '4',
    motor_type: 'Electric',
    video: 'Analog',
    video_system: 'HD-Zero',
    flight_controller: '',
    firmware: 'Betaflight',
    firmware_version: '',
    esc: '',
    esc_firmware: '',
    receiver: '',
    receiver_firmware: '',
    registration_number: '',
    serial_number: '',
    gps: '1',
    mag: '1',
    baro: '1',
    gyro: '1',
    acc: '1',
    props_maint_date: '',
    motor_maint_date: '',
    frame_maint_date: '',
    props_reminder_date: '',
    motor_reminder_date: '',
    frame_reminder_date: '',
    is_active: true  
  };
  
  const [formData, setFormData] = useState(defaultFormData);

  // Format date for input fields
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => {
      const newData = {
        ...prevData,
        [name]: value
      };
      
      // If this is a maintenance date, automatically set reminder date to 1 year later
      if (name.endsWith('_maint_date') && value) {
        const reminderFieldName = name.replace('_maint_date', '_reminder_date');
        const maintDate = new Date(value);
        const reminderDate = new Date(maintDate);
        reminderDate.setFullYear(reminderDate.getFullYear() + 1);
        newData[reminderFieldName] = reminderDate.toISOString().split('T')[0];
      }
      
      return newData;
    });
  };

  // Handle setting today's date for all maintenance fields
  const handleSetTodayMaintDates = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];
    
    setFormData(prevData => ({
      ...prevData,
      props_maint_date: today,
      motor_maint_date: today,
      frame_maint_date: today,
      props_reminder_date: nextYearStr,
      motor_reminder_date: nextYearStr,
      frame_reminder_date: nextYearStr
    }));
  };

  // Fetch aircraft data for edit mode
  useEffect(() => {
    if (!isEditMode) return;
    
    const fetchAircraftData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      
      try {
        const response = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch aircraft data');
        }
        
        const aircraftData = await response.json();
        
        // Convert numeric values to strings for form inputs
        setFormData({
          ...aircraftData,
          motors: aircraftData.motors?.toString() || '4',
          gps: aircraftData.gps?.toString() || '1',
          mag: aircraftData.mag?.toString() || '1',
          baro: aircraftData.baro?.toString() || '1',
          gyro: aircraftData.gyro?.toString() || '1',
          acc: aircraftData.acc?.toString() || '1',
        });
      } catch (err) {
        console.error('Error fetching aircraft data:', err);
        setError('Failed to load aircraft data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAircraftData();
  }, [API_URL, isEditMode, navigate, uavId]);

  // Check if the UAV can be deleted
  useEffect(() => {
    if (!isEditMode) return;
    
    const checkCanDelete = async () => {
      const token = localStorage.getItem('access_token');
      
      try {
        // Query specifically for flight logs related to this UAV
        const checkResponse = await fetch(`${API_URL}/api/flightlogs/?uav=${uavId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!checkResponse.ok) {
          throw new Error('Failed to check flight logs');
        }
        
        const flightLogs = await checkResponse.json();
        // Handle paginated response - check if results array is empty
        if (flightLogs && Array.isArray(flightLogs.results)) {
          setCanDelete(flightLogs.results.length === 0);
        } else if (Array.isArray(flightLogs)) {
          // Direct array response
          setCanDelete(flightLogs.length === 0);
        } else {
          // Unexpected response format
          console.error('Unexpected response format:', flightLogs);
          setCanDelete(true); // Default to allowing deletion if we can't determine
        }
      } catch (err) {
        console.error('Error checking if aircraft can be deleted:', err);
      }
    };
    
    checkCanDelete();
  }, [API_URL, isEditMode, uavId]);

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      
      if (!token || !user_id) {
        setError('Authentication required. Please log in again.');
        return;
      }

      // Required fields validation
      if (!formData.drone_name || !formData.type || !formData.motors || !formData.motor_type) {
        setError('Please fill in all required fields: Drone Name, Type, Motors, and Type of Motor');
        return;
      }

      // Prepare payload for backend by removing empty date fields
      const filteredFormData = { ...formData };
      
      // List of all date fields that should be removed if empty
      const dateFields = [
        'props_maint_date', 'motor_maint_date', 'frame_maint_date',
        'props_reminder_date', 'motor_reminder_date', 'frame_reminder_date'
      ];
      
      // Remove empty date fields
      dateFields.forEach(field => {
        if (!filteredFormData[field] || filteredFormData[field].trim() === '') {
          delete filteredFormData[field];
        }
      });

      // Prepare final payload
      const aircraftPayload = {
        ...filteredFormData,
        user: user_id,
        motors: parseInt(filteredFormData.motors),
        gps: parseInt(filteredFormData.gps),
        mag: parseInt(filteredFormData.mag),
        baro: parseInt(filteredFormData.baro),
        gyro: parseInt(filteredFormData.gyro),
        acc: parseInt(filteredFormData.acc)
      };

      const url = isEditMode ? `${API_URL}/api/uavs/${uavId}/` : `${API_URL}/api/uavs/`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aircraftPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      }

      await response.json();
      setSuccess(isEditMode ? 'Aircraft successfully updated!' : 'Aircraft successfully registered!');
      
      // Reset form or navigate based on mode
      if (!isEditMode) {
        setFormData(defaultFormData);
      } else {
        setTimeout(() => navigate('/aircraft-list'), 1500);
      }
    } catch (err) {
      console.error('Error handling aircraft:', err);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  // Simplified handleDelete function
  const handleDelete = async () => {
    if (!isEditMode) return;
    
    try {
      const token = localStorage.getItem('access_token');
      
      // Confirm deletion
      if (!window.confirm('Are you sure you want to delete this aircraft? This action cannot be undone.')) {
        return;
      }
      
      const deleteResponse = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete aircraft');
      }
      
      setSuccess('Aircraft successfully deleted!');
      setTimeout(() => navigate('/aircraft-list'), 1500);
    } catch (err) {
      console.error('Error deleting aircraft:', err);
      setError(err.message || 'An error occurred while processing your request.');
    }
  };

  // Add a new function to mark as inactive
  const handleSetInactive = async () => {
    if (!isEditMode) return;
    
    try {
      const token = localStorage.getItem('access_token');
      
      if (!window.confirm('Are you sure you want to mark this aircraft as inactive?')) {
        return;
      }
      
      const updateResponse = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: false })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to mark aircraft as inactive');
      }
      
      setSuccess('Aircraft successfully marked as inactive');
      setTimeout(() => navigate('/aircraft-list'), 1500);
    } catch (err) {
      console.error('Error marking aircraft as inactive:', err);
      setError(err.message || 'An error occurred while processing your request.');
    }
  };

  // Add this function to the useAircraftForm hook
  const handleToggleActive = async () => {
    if (!isEditMode) return;
    
    try {
      const token = localStorage.getItem('access_token');
      
      // If currently inactive, confirm reactivation
      if (!formData.is_active) {
        if (!window.confirm('Are you sure you want to reactivate this aircraft?')) {
          return;
        }
      } else {
        // If active, confirm deactivation
        if (!window.confirm('Are you sure you want to deactivate this aircraft?')) {
          return;
        }
      }
      
      const newActiveState = !formData.is_active;
      
      const updateResponse = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newActiveState })
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to ${newActiveState ? 'reactivate' : 'deactivate'} aircraft`);
      }
      
      // Update local state
      setFormData(prev => ({ ...prev, is_active: newActiveState }));
      setSuccess(`Aircraft successfully ${newActiveState ? 'reactivated' : 'deactivated'}`);
      
      // If reactivating, just update the UI
      // If deactivating and has references, navigate away
      if (!newActiveState && !canDelete) {
        setTimeout(() => navigate('/aircraft-list'), 1500);
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
      setError(err.message || 'An error occurred while processing your request.');
    }
  };

  return {
    formData,
    isLoading,
    error,
    success,
    handleChange,
    handleSubmit,
    handleDelete,
    handleSetInactive,
    handleToggleActive,
    handleSetTodayMaintDates,
    formatDateForInput,
    setError,
    canDelete
  };
};

// Main component
const NewAircraftPage = () => {
  const navigate = useNavigate();
  const { uavId } = useParams();
  const isEditMode = !!uavId;
  
  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  
  // Form management hook
  const {
    formData,
    isLoading,
    error,
    success,
    handleChange,
    handleSubmit,
    handleDelete,
    handleSetInactive,
    handleToggleActive,
    handleSetTodayMaintDates,
    formatDateForInput,
    setError,
    canDelete
  } = useAircraftForm(isEditMode, uavId);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) navigate('/login');
  }, [navigate]);
  
  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Toggle sidebar function
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading aircraft data...</p>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-semibold text-center flex-1">
            {isEditMode ? 'Edit Aircraft' : 'New Aircraft'}
          </h1>
        </div>

        {isEditMode && (
          <div className="mb-4">
            <Button onClick={() => navigate(`/aircraft-settings/${uavId}`)} className="bg-gray-500 hover:bg-gray-600">
              Back to Aircraft Settings
            </Button>
          </div>
        )}
        
        {isEditMode && formData.is_active === false && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p><strong>This aircraft is inactive.</strong> You must reactivate it to make changes.</p>
            </div>
          </div>
        )}
        
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        
        <AircraftForm
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          handleDelete={handleDelete}
          handleSetInactive={handleSetInactive}
          handleToggleActive={handleToggleActive}
          handleSetTodayMaintDates={handleSetTodayMaintDates}
          formatDateForInput={formatDateForInput}
          isEditMode={isEditMode}
          isLoading={isLoading}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
};

export default NewAircraftPage;