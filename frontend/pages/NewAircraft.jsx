import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout, Button, Alert, AircraftForm, Loading, ConfirmModal } from '../components';
import { useAuth, useApi } from '../hooks';

const DEFAULT_FORM_DATA = {
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

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const getNextYearDate = (dateString) => {
  const date = new Date(dateString);
  const nextYear = new Date(date);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return nextYear.toISOString().split('T')[0];
};

const useAircraftForm = (isEditMode, uavId) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [canDelete, setCanDelete] = useState(true);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  
  const { checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => {
      const newData = { ...prevData, [name]: value };
      
      if (name.endsWith('_maint_date') && value) {
        const reminderFieldName = name.replace('_maint_date', '_reminder_date');
        newData[reminderFieldName] = getNextYearDate(value);
      }
      
      return newData;
    });
  };

  const handleSetTodayMaintDates = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = getNextYearDate(today);
    
    setFormData(prevData => ({
      ...prevData,
      props_maint_date: today,
      motor_maint_date: today,
      frame_maint_date: today,
      props_reminder_date: nextYear,
      motor_reminder_date: nextYear,
      frame_reminder_date: nextYear
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      
      if (!formData.drone_name || !formData.type || !formData.motors || !formData.motor_type) {
        setError('Please fill in all required fields: Drone Name, Type, Motors, and Type of Motor');
        return;
      }

      const filteredFormData = { ...formData };
      
      // Collect maintenance dates for later use
      const maintFields = [
        'props_maint_date', 'motor_maint_date', 'frame_maint_date',
        'props_reminder_date', 'motor_reminder_date', 'frame_reminder_date'
      ];
      
      const maintenanceData = {};
      
      maintFields.forEach(field => {
        if (filteredFormData[field] && filteredFormData[field].trim() !== '') {
          maintenanceData[field] = filteredFormData[field];
        }
        // Remove from initial payload if not in edit mode
        if (!isEditMode) {
          delete filteredFormData[field];
        }
      });

      const basicPayload = {
        ...filteredFormData,
        user: auth.user_id,
        motors: parseInt(filteredFormData.motors),
        gps: parseInt(filteredFormData.gps),
        mag: parseInt(filteredFormData.mag),
        baro: parseInt(filteredFormData.baro),
        gyro: parseInt(filteredFormData.gyro),
        acc: parseInt(filteredFormData.acc)
      };

      if (isEditMode) {
        // In edit mode, update everything in one request
        const endpoint = `/api/uavs/${uavId}/`;
        const result = await fetchData(endpoint, {}, 'PUT', basicPayload);
        
        if (!result.error) {
          setSuccess('Aircraft successfully updated!');
          setTimeout(() => navigate('/AircraftList'), 1500);
        }
      } else {
        // For new aircraft: first create the UAV, then add maintenance data
        const createResult = await fetchData('/api/uavs/', {}, 'POST', basicPayload);
        
        if (!createResult.error) {
          const newUavId = createResult.data.id || createResult.data.uav_id;
          
          // Check if we have maintenance dates to update
          const hasMaintData = Object.keys(maintenanceData).length > 0;
          
          if (hasMaintData && newUavId) {
            // Update the newly created UAV with maintenance dates
            const updateResult = await fetchData(
              `/api/uavs/${newUavId}/`, 
              {}, 
              'PATCH', 
              maintenanceData
            );
            
            if (updateResult.error) {
              setSuccess('Aircraft registered, but there was an issue setting maintenance dates.');
            } else {
              setSuccess('Aircraft successfully registered with maintenance dates!');
            }
          } else {
            setSuccess('Aircraft successfully registered!');
          }
          
          setFormData(DEFAULT_FORM_DATA);
          // Add redirection to AircraftList after successful creation
          setTimeout(() => navigate('/AircraftList'), 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    
    const result = await fetchData(`/api/uavs/${uavId}/`, {}, 'DELETE');
    if (!result.error) {
      setSuccess('Aircraft successfully deleted!');
      setTimeout(() => navigate('/AircraftList'), 1500);
    }
  };

  const handleToggleActive = async () => {
    if (!isEditMode) return;
    
    const newActiveState = !formData.is_active;
    const result = await fetchData(
      `/api/uavs/${uavId}/`, 
      {}, 
      'PATCH', 
      { is_active: newActiveState }
    );
    
    if (!result.error) {
      setFormData(prev => ({ ...prev, is_active: newActiveState }));
      setSuccess(`Aircraft successfully ${newActiveState ? 'reactivated' : 'deactivated'}`);
      
      if (!newActiveState && !canDelete) {
        setTimeout(() => navigate('/AircraftList'), 1500);
      }
    }
  };

  const handleSetInactive = () => handleToggleActive();

  useEffect(() => {
    if (!isEditMode) return;
    
    const fetchAircraftData = async () => {
      setIsLoading(true);
      const result = await fetchData(`/api/uavs/${uavId}/`);
      
      if (!result.error) {
        setFormData({
          ...result.data,
          motors: result.data.motors?.toString() || '4',
          gps: result.data.gps?.toString() || '1',
          mag: result.data.mag?.toString() || '1',
          baro: result.data.baro?.toString() || '1',
          gyro: result.data.gyro?.toString() || '1',
          acc: result.data.acc?.toString() || '1',
        });
      }
      setIsLoading(false);
    };
    
    fetchAircraftData();
  }, [API_URL, isEditMode, navigate, uavId, fetchData]);

  useEffect(() => {
    if (!isEditMode) return;
    
    const checkCanDelete = async () => {
      const result = await fetchData(`/api/flightlogs/?uav=${uavId}`);
      
      if (!result.error) {
        if (Array.isArray(result.data.results)) {
          setCanDelete(result.data.results.length === 0);
        } else if (Array.isArray(result.data)) {
          setCanDelete(result.data.length === 0);
        }
      }
    };
    
    checkCanDelete();
  }, [API_URL, isEditMode, uavId, fetchData]);

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
  const { checkAuthAndGetUser } = useAuth();
  
  const [confirmModal, setConfirmModal] = useState({
    type: null, 
    isOpen: false
  });

  const {
    formData,
    isLoading,
    error,
    success,
    handleChange,
    handleSubmit,
    handleDelete: executeDelete,
    handleSetInactive: executeSetInactive,
    handleToggleActive: executeToggleActive,
    handleSetTodayMaintDates,
    formatDateForInput,
    canDelete
  } = useAircraftForm(isEditMode, uavId);

  const handleDelete = () => setConfirmModal({ type: 'delete', isOpen: true });
  const handleSetInactive = () => setConfirmModal({ type: 'inactive', isOpen: true });
  const handleToggleActive = () => setConfirmModal({ type: 'toggle', isOpen: true });
  const handleBackToSettings = () => navigate(`/aircraftsettings/${uavId}`);

  const handleModalConfirm = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    switch (confirmModal.type) {
      case 'delete':
        await executeDelete();
        break;
      case 'inactive':
        await executeSetInactive();
        break;
      case 'toggle':
        await executeToggleActive();
        break;
    }
  };

  const getModalConfig = () => {
    switch (confirmModal.type) {
      case 'delete':
        return {
          title: "Delete Aircraft",
          message: "Are you sure you want to delete this aircraft? This action cannot be undone.",
          confirmText: "Delete"
        };
      case 'inactive':
        return {
          title: "Mark Aircraft as Inactive",
          message: "Are you sure you want to mark this aircraft as inactive?",
          confirmText: "Set Inactive"
        };
      case 'toggle':
        return {
          title: formData.is_active ? "Deactivate Aircraft" : "Reactivate Aircraft",
          message: formData.is_active
            ? "Are you sure you want to deactivate this aircraft?"
            : "Are you sure you want to reactivate this aircraft?",
          confirmText: formData.is_active ? "Deactivate" : "Reactivate"
        };
      default:
        return { title: "", message: "", confirmText: "Confirm" };
    }
  };

  useEffect(() => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;
  }, [navigate, checkAuthAndGetUser]);
  
  if (isLoading) {
    return <Loading message="Loading aircraft data..." />;
  }

  const modalConfig = getModalConfig();

  return (
    <Layout title={isEditMode ? 'Edit Aircraft' : 'New Aircraft'}>
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
        handleBackToSettings={handleBackToSettings}
      />
      
      <ConfirmModal
        open={confirmModal.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={handleModalConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText={modalConfig.confirmText}
        cancelText="Cancel"
      />
    </Layout>
  );
};

export default NewAircraftPage;