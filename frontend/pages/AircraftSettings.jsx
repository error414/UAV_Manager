import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, Loading, ConfirmModal, CompareModal, ScriptModal, ArrowButton, ConfigFileTable, InfoRow, GridInfo, InfoSection } from '../components';
import { maintenanceLogTableColumns, compareConfigFiles, na, formatFlightHours, formatDate, extractUavId } from '../utils';
import { useAuth, useApi } from '../hooks';

const AircraftSettings = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const { uavId: urlUavId } = useParams();
  const uavId = extractUavId(urlUavId);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const configFileInputRef = useRef(null);
  
  const [aircraft, setAircraft] = useState(null);
  const [newLog, setNewLog] = useState({ event_type: 'LOG', description: '', event_date: '', file: null });
  const [configFile, setConfigFile] = useState({
    name: '',
    file: null
  });
  const [configFiles, setConfigFiles] = useState([]);
  const [configFormErrors, setConfigFormErrors] = useState({});
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [editingConfig, setEditingConfig] = useState({ name: '', note: '' });
  const [deleteConfigId, setDeleteConfigId] = useState(null);
  const [showDeleteConfigModal, setShowDeleteConfigModal] = useState(false);
  const [scriptConfigId, setScriptConfigId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [deleteLogId, setDeleteLogId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [error, setError] = useState(null);

  const [selectedConfigs, setSelectedConfigs] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  const [minUavId, setMinUavId] = useState(null);
  const [maxUavId, setMaxUavId] = useState(null);

  const { getAuthHeaders, handleAuthError, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  // Extract filename from URL
  const getFilenameFromUrl = (url) => {
    if (!url) return '';
    return url.split('/').pop();
  };

  useEffect(() => { 
    fetchAircraft();
    fetchConfigFiles();
    fetchUavMeta();
  }, [uavId]);
  
  useEffect(() => {
    setSelectedConfigs([]);
  }, [configFiles]);

  // Validate maintenance log form
  const validateForm = (log, setErrors) => {
    const errors = {};
    if (!log.event_date) errors.event_date = 'Date is required';
    if (!log.description?.trim()) errors.description = 'Description is required';
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch aircraft and related data
  const fetchAircraft = async () => {
    try {
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      
      const [aircraftResult, logsResult, remindersResult] = await Promise.all([
        fetchData(`/api/uavs/${uavId}/`),
        fetchData(`/api/maintenance/?uav=${uavId}`),
        fetchData('/api/maintenance-reminders/')
      ]);
      
      if (!aircraftResult.error) {
        const data = aircraftResult.data;
        
        if (!logsResult.error) {
          data.maintenance_logs = logsResult.data;
        }
        
        if (!remindersResult.error) {
          const remindersData = remindersResult.data;
          // Map reminders to aircraft fields
          remindersData.filter(r => r.uav === uavId).forEach(reminder => {
            if (reminder.component === 'props') data.next_props_maint_date = reminder.next_maintenance;
            else if (reminder.component === 'motor') data.next_motor_maint_date = reminder.next_maintenance;
            else if (reminder.component === 'frame') data.next_frame_maint_date = reminder.next_maintenance;
          });
        }
        
        setAircraft(data);
      }
    } catch (error) {
      setError("Failed to load aircraft data");
    }
  };

  // Fetch configuration files for this UAV
  const fetchConfigFiles = async () => {
    try {
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      
      const result = await fetchData(`/api/uav-configs/?uav=${uavId}`);
      
      if (!result.error) {
        setConfigFiles(result.data);
      }
    } catch (error) {
      setError("Failed to load configuration files");
    }
  };

  // Fetch min/max UAV IDs for navigation
  const fetchUavMeta = async () => {
    try {
      const result = await fetchData(`/api/uavs/meta/`);
      if (!result.error) {
        setMinUavId(result.data?.minId);
        setMaxUavId(result.data?.maxId);
      }
    } catch (e) { /* ignore errors */ }
  };

  // Submit maintenance log (add or update)
  const submitMaintenanceLog = async (logData, file, method, logId = null, keepExistingFile = false) => {
    const auth = checkAuthAndGetUser();
    if (!auth) return false;
    
    const endpoint = logId 
      ? `/api/maintenance/${logId}/` 
      : `/api/maintenance/`;
      
    try {
      let response;
      
      if (file) {
        const formData = new FormData();
        formData.append('description', logData.description);
        formData.append('event_date', logData.event_date);
        formData.append('event_type', 'LOG');
        formData.append('uav', uavId);
        formData.append('file', file);
        
        response = await fetch(`${API_URL}${endpoint}`, {
          method,
          headers: getAuthHeaders(),
          body: formData,
        });
        
        if (!response.ok) {
          if (await handleAuthError(response)) return false;
          throw new Error(`Failed to ${method === 'POST' ? 'add' : 'update'} maintenance log`);
        }
      } else {
        const requestData = { ...logData, event_type: 'LOG', uav: uavId };
        if (method === 'PUT' && keepExistingFile) {
          delete requestData.file;
          delete requestData.originalFile;
        }
        
        const result = await fetchData(
          endpoint, 
          {}, 
          method, 
          requestData
        );
        
        if (result.error) return false;
      }
      
      return true;
    } catch (error) {
      setError(`Failed to ${method === 'POST' ? 'add' : 'update'} maintenance log`);
      return false;
    }
  };

  // Handle config file input changes
  const handleConfigChange = e => {
    const { name, value, files } = e.target;
    setConfigFile(cf => ({ ...cf, [name]: name === 'file' ? files[0] : value }));
  };
    // Add new configuration file
  const handleAddConfig = async () => {
    const errors = {};
    if (!configFile.name?.trim()) errors.name = 'Name is required';
    if (!configFile.file) {
      errors.file = 'File is required';
    } else {
      // Check file extension
      const fileName = configFile.file.name.toLowerCase();
      const allowedExtensions = ['.txt', '.csv', '.json'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        errors.file = 'Only .txt, .csv, and .json files are allowed';
      }
    }
    
    setConfigFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    try {
      const formData = new FormData();
      formData.append('name', configFile.name);
      formData.append('file', configFile.file);
      // Always use current date for upload
      formData.append('upload_date', new Date().toISOString().split('T')[0]);
      formData.append('uav', uavId);
      
      const response = await fetch(`${API_URL}/api/uav-configs/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      
      if (!response.ok) {
        if (await handleAuthError(response)) return;
        throw new Error('Failed to upload configuration file');
      }
      
      await fetchConfigFiles();
      setConfigFile({
        name: '',
        file: null
      });
      if (configFileInputRef.current) configFileInputRef.current.value = '';
      
    } catch (error) {
      setError("Failed to upload configuration file");
    }
  };

  // Start editing a configuration file (name and note)
  const handleEditConfig = configId => {
    const config = configFiles.find(c => c.config_id === configId);
    if (config) {
      setEditingConfigId(configId);
      setEditingConfig({ name: config.name || '', note: config.note || '' });
    }
  };

  // Handle editing config input changes
  const handleEditConfigChange = e => {
    const { name, value } = e.target;
    setEditingConfig(c => ({ ...c, [name]: value }));
  };

  // Cancel editing configuration file
  const handleCancelEditConfig = () => {
    setEditingConfigId(null);
    setEditingConfig({ name: '', note: '' });
  };

  // Save edited configuration file (name and note)
  const handleSaveConfig = async () => {
    if (!editingConfig.name?.trim()) return;
    try {
      const result = await fetchData(
        `/api/uav-configs/${editingConfigId}/`,
        {},
        'PATCH',
        { name: editingConfig.name.trim(), note: editingConfig.note }
      );
      if (!result.error) {
        await fetchConfigFiles();
        setEditingConfigId(null);
        setEditingConfig({ name: '', note: '' });
      }
    } catch (error) {
      setError("Failed to update configuration file");
    }
  };

  // Open the script popup for a configuration file
  const handleOpenScript = configId => {
    setScriptConfigId(configId);
  };

  // Save the script for the currently open configuration (popup stays open)
  const handleSaveScript = async (script) => {
    if (scriptConfigId == null) return false;
    try {
      const result = await fetchData(
        `/api/uav-configs/${scriptConfigId}/`,
        {},
        'PATCH',
        { script }
      );
      if (result.error) return false;
      await fetchConfigFiles();
      return true;
    } catch (error) {
      setError("Failed to save script");
      return false;
    }
  };

  // Show delete config confirmation modal
  const handleDeleteConfig = configId => {
    setDeleteConfigId(configId);
    setShowDeleteConfigModal(true);
  };

  // Confirm and delete configuration file
  const confirmDeleteConfig = async () => {
    try {
      const result = await fetchData(`/api/uav-configs/${deleteConfigId}/`, {}, 'DELETE');
      
      if (!result.error) {
        await fetchConfigFiles();
      }
    } catch (error) {
      setError("Failed to delete configuration file");
    } finally {
      setShowDeleteConfigModal(false);
      setDeleteConfigId(null);
    }
  };

  // Handle new maintenance log input changes
  const handleLogChange = e => {
    const { name, value, files } = e.target;
    setNewLog(l => ({ ...l, [name]: name === 'file' ? files[0] : value }));
  };
  
  // Handle editing maintenance log input changes
  const handleEditLogChange = e => {
    const { name, value, files } = e.target;
    setEditingLog(l => ({ ...l, [name]: name === 'file' ? files[0] : value }));
  };

  // Start editing a maintenance log
  const handleEditLog = logId => {
    const logToEdit = aircraft.maintenance_logs.find(log => log.maintenance_id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setEditingLog({ ...logToEdit, originalFile: logToEdit.file, file: null });
      setEditFormErrors({});
    }
  };

  // Save edited maintenance log
  const handleSaveEdit = async () => {
    if (!validateForm(editingLog, setEditFormErrors)) return;
    const hasNewFile = editingLog.file !== null;
    const success = await submitMaintenanceLog(
      editingLog,
      hasNewFile ? editingLog.file : null,
      'PUT',
      editingLogId,
      !hasNewFile && editingLog.originalFile
    );
    if (success) {
      await fetchAircraft();
      setEditingLogId(null);
      setEditingLog(null);
      setEditFormErrors({});
    }
  };

  // Cancel editing maintenance log
  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingLog(null);
    setEditFormErrors({});
  };

  // Add new maintenance log
  const handleAddLog = async () => {
    if (!validateForm(newLog, setFormErrors)) return;
    const success = await submitMaintenanceLog(newLog, newLog.file, 'POST');
    if (success) {
      await fetchAircraft();
      setNewLog({ event_type: 'LOG', description: '', event_date: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFormErrors({});
    }
  };

  // Show delete log confirmation modal
  const handleDeleteLog = logId => {
    setDeleteLogId(logId);
    setShowDeleteModal(true);
  };

  // Confirm and delete maintenance log
  const confirmDeleteLog = async () => {
    try {
      const result = await fetchData(`/api/maintenance/${deleteLogId}/`, {}, 'DELETE');
      
      if (!result.error) {
        await fetchAircraft();
        setEditingLogId(null);
        setEditingLog(null);
      }
    } catch (error) {
      setError("Failed to delete maintenance log");
    } finally {
      setShowDeleteModal(false);
      setDeleteLogId(null);
    }
  };

  // Toggle config selection for comparison
  const handleConfigSelection = (configId) => {
    setSelectedConfigs(prev => {
      if (prev.includes(configId)) {
        return prev.filter(id => id !== configId);
      } else {
        return [...prev, configId];
      }
    });
  };

  // Compare selected configuration files
  const compareFiles = async () => {
    const comparisonResult = await compareConfigFiles(selectedConfigs, configFiles, setError);
    if (comparisonResult) {
      setComparisonData(comparisonResult);
      setShowCompareModal(true);
    }
  };

  // Navigate to specific UAV by ID
  const navigateToUav = (id) => {
    navigate(`/aircraftsettings/${id}`);
  };
  
  // Navigate to previous UAV
  const navigateToPreviousUav = () => {
    if (minUavId !== null && uavId > minUavId) {
      navigateToUav(uavId - 1);
    }
  };
  
  // Navigate to next UAV
  const navigateToNextUav = () => {
    if (maxUavId !== null && uavId < maxUavId) {
      navigateToUav(uavId + 1);
    }
  };

  // Go to aircraft edit page
  const handleModifyClick = () => {
    navigate(`/editaircraft/${uavId}`);
  };

  if (!aircraft) return <Loading message="Loading..." />;

  return (
    <Layout>
      <div className="flex items-center justify-center gap-4 h-10">
        <ArrowButton
          direction="left"
          onClick={navigateToPreviousUav}
          title="Previous Aircraft"
          disabled={minUavId === null || uavId <= minUavId}
        />
        <h1 className="text-2xl font-semibold">
          Aircraft Settings
        </h1>
        <ArrowButton
          direction="right"
          onClick={navigateToNextUav}
          title="Next Aircraft"
          disabled={maxUavId === null || uavId >= maxUavId}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <InfoSection title="General Information">
            <InfoRow label="Drone Name:" value={na(aircraft.drone_name)} />
            <InfoRow label="Manufacturer:" value={na(aircraft.manufacturer)} />
            <InfoRow label="Type:" value={na(aircraft.type)} />
          </InfoSection>
          
          <InfoSection title="Motors">
            <InfoRow label="Motors:" value={na(aircraft.motors)} />
            <InfoRow label="Type of Motor:" value={na(aircraft.motor_type)} />
          </InfoSection>
          
          <InfoSection title="Video Information">
            <InfoRow label="Video:" value={na(aircraft.video)} />
            <InfoRow label="Video System:" value={na(aircraft.video_system)} />
          </InfoSection>
          
          <InfoSection title="Firmware and Components">
            <InfoRow label="Firmware:" value={na(aircraft.firmware)} />
            <InfoRow label="Firmware Version:" value={na(aircraft.firmware_version)} />
            <InfoRow label="ESC:" value={na(aircraft.esc)} />
            <InfoRow label="ESC Firmware:" value={na(aircraft.esc_firmware)} />
            <InfoRow label="Receiver:" value={na(aircraft.receiver)} />
            <InfoRow label="Receiver Firmware:" value={na(aircraft.receiver_firmware)} />
            <InfoRow label="Flight Controller:" value={na(aircraft.flight_controller)} />
          </InfoSection>

          <InfoSection title="Registration and Serial">
            <InfoRow label="Registration Number:" value={na(aircraft.registration_number)} />
            <InfoRow label="Serial Number:" value={na(aircraft.serial_number)} />
          </InfoSection>
          
          <InfoSection title="Sensors">
            <div className="grid grid-cols-5 gap-4">
              <GridInfo label="GPS" value={na(aircraft.gps)} />
              <GridInfo label="MAG" value={na(aircraft.mag)} />
              <GridInfo label="BARO" value={na(aircraft.baro)} />
              <GridInfo label="GYRO" value={na(aircraft.gyro)} />
              <GridInfo label="ACC" value={na(aircraft.acc)} />
            </div>
          </InfoSection>
        </div>
        
        <div className="space-y-6">
          <InfoSection title="Statistics" className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <InfoRow label="Total Flights:" value={na(aircraft.total_flights)} />
            <InfoRow label="Total Flight Time:" value={formatFlightHours(aircraft.total_flight_time)} />
            <InfoRow label="Total Takeoffs (TO):" value={na(aircraft.total_takeoffs)} />
            <InfoRow label="Total Landings (LDG):" value={na(aircraft.total_landings)} />
          </InfoSection>
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <ConfigFileTable
              tableType="config"
              configFiles={configFiles}
              selectedConfigs={selectedConfigs}
              onConfigSelection={handleConfigSelection}
              onDeleteConfig={handleDeleteConfig}
              configFile={configFile}
              configFormErrors={configFormErrors}
              onConfigChange={handleConfigChange}
              onAddConfig={handleAddConfig}
              configFileInputRef={configFileInputRef}
              getFilenameFromUrl={getFilenameFromUrl}
              onCompareFiles={compareFiles}
              editingConfigId={editingConfigId}
              editingConfig={editingConfig}
              onEditConfig={handleEditConfig}
              onEditConfigChange={handleEditConfigChange}
              onSaveConfig={handleSaveConfig}
              onCancelEditConfig={handleCancelEditConfig}
              onOpenScript={handleOpenScript}
            />
          </div>
          
        </div>
      </div>
      
      <div className="mt-6 flex justify-center space-x-4">
        <Button onClick={handleModifyClick} variant="primary" className="max-w-md">Modify Aircraft</Button>
      </div>
      
      <CompareModal 
        show={showCompareModal} 
        onClose={() => setShowCompareModal(false)} 
        data={comparisonData} 
      />

      <ScriptModal
        open={scriptConfigId !== null}
        configName={configFiles.find(c => c.config_id === scriptConfigId)?.name}
        script={configFiles.find(c => c.config_id === scriptConfigId)?.script || ''}
        onSave={handleSaveScript}
        onClose={() => setScriptConfigId(null)}
      />

      <ConfirmModal
        open={showDeleteConfigModal}
        title="Confirm Delete Configuration"
        message="Are you sure you want to delete this configuration file?"
        onConfirm={confirmDeleteConfig}
        onCancel={() => setShowDeleteConfigModal(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
      
    </Layout>
  );
};

export default AircraftSettings;
