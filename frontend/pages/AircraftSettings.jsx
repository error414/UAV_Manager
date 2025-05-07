import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar, Button, Loading, ConfirmModal, CompareModal } from '../components';
import { maintenanceLogTableColumns, uavConfigTableColumns } from '../utils/tableDefinitions';
import { useAuth, useApi } from '../utils/authUtils';
import { generateDiff, prepareComparisonData, compareConfigFiles } from '../utils/compareUtils';
import { na, formatFlightHours, formatDate } from '../utils/flightTimesUtils';
import ArrowButton from '../components/ui/ArrowButton';

const AircraftSettings = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const { uavId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const configFileInputRef = useRef(null);
  
  const [aircraft, setAircraft] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [newLog, setNewLog] = useState({ event_type: 'LOG', description: '', event_date: '', file: null });
  const [configFile, setConfigFile] = useState({
    name: '',
    file: null
  });
  const [configFiles, setConfigFiles] = useState([]);
  const [configFormErrors, setConfigFormErrors] = useState({});
  const [deleteConfigId, setDeleteConfigId] = useState(null);
  const [showDeleteConfigModal, setShowDeleteConfigModal] = useState(false);
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
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSelectedConfigs([]);
  }, [configFiles]);

  const validateForm = (log, setErrors) => {
    const errors = {};
    if (!log.event_date) errors.event_date = 'Date is required';
    if (!log.description?.trim()) errors.description = 'Description is required';
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
          remindersData.filter(r => r.uav === parseInt(uavId)).forEach(reminder => {
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

  const fetchUavMeta = async () => {
    try {
      const result = await fetchData(`/api/uavs/meta/`);
      if (!result.error) {
        setMinUavId(result.data?.minId);
        setMaxUavId(result.data?.maxId);
      }
    } catch (e) { /* ignore */ }
  };

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
          if (handleAuthError(response)) return false;
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

  const handleConfigChange = e => {
    const { name, value, files } = e.target;
    setConfigFile(cf => ({ ...cf, [name]: name === 'file' ? files[0] : value }));
  };
  
  const handleAddConfig = async () => {
    const errors = {};
    if (!configFile.name?.trim()) errors.name = 'Name is required';
    if (!configFile.file) errors.file = 'File is required';
    
    setConfigFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    try {
      const formData = new FormData();
      formData.append('name', configFile.name);
      formData.append('file', configFile.file);
      // Always use current date when uploading
      formData.append('upload_date', new Date().toISOString().split('T')[0]);
      formData.append('uav', uavId);
      
      const response = await fetch(`${API_URL}/api/uav-configs/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      
      if (!response.ok) {
        if (handleAuthError(response)) return;
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

  const handleDeleteConfig = configId => {
    setDeleteConfigId(configId);
    setShowDeleteConfigModal(true);
  };

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

  const toggleSidebar = () => setSidebarOpen(v => !v);
  const handleModifyClick = () => navigate(`/editaircraft/${uavId}`);

  const handleLogChange = e => {
    const { name, value, files } = e.target;
    setNewLog(l => ({ ...l, [name]: name === 'file' ? files[0] : value }));
  };
  
  const handleEditLogChange = e => {
    const { name, value, files } = e.target;
    setEditingLog(l => ({ ...l, [name]: name === 'file' ? files[0] : value }));
  };

  const handleEditLog = logId => {
    const logToEdit = aircraft.maintenance_logs.find(log => log.maintenance_id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setEditingLog({ ...logToEdit, originalFile: logToEdit.file, file: null });
      setEditFormErrors({});
    }
  };

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

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingLog(null);
    setEditFormErrors({});
  };

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

  const handleDeleteLog = logId => {
    setDeleteLogId(logId);
    setShowDeleteModal(true);
  };

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

  const handleConfigSelection = (configId) => {
    setSelectedConfigs(prev => {
      if (prev.includes(configId)) {
        return prev.filter(id => id !== configId);
      } else {
        return [...prev, configId];
      }
    });
  };

  const compareFiles = async () => {
    const comparisonResult = await compareConfigFiles(selectedConfigs, configFiles, setError);
    if (comparisonResult) {
      setComparisonData(comparisonResult);
      setShowCompareModal(true);
    }
  };

  const navigateToUav = (id) => {
    navigate(`/aircraftsettings/${id}`);
  };
  const navigateToPreviousUav = () => {
    if (minUavId !== null && Number(uavId) > minUavId) {
      navigateToUav(Number(uavId) - 1);
    }
  };
  const navigateToNextUav = () => {
    if (maxUavId !== null && Number(uavId) < maxUavId) {
      navigateToUav(Number(uavId) + 1);
    }
  };

  const renderInput = ({ type, name, value, onChange, placeholder, error, ...rest }) => (
    <>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-2 py-1 border rounded ${error ? 'border-red-500' : 'border-gray-300'}`}
        required
        {...rest}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex items-center">
      <span className="font-semibold text-gray-700 w-40">{label}</span>
      <span className="text-gray-900">{na(value)}</span>
    </div>
  );

  const GridInfo = ({ label, value }) => (
    <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className="text-gray-900">{na(value)}</span>
    </div>
  );

  if (!aircraft) return <Loading message="Loading..." />;

  return (
    <div className="flex h-screen relative">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="flex items-center justify-center gap-4 h-10 mb-4">
          <ArrowButton
            direction="left"
            onClick={navigateToPreviousUav}
            title="Previous Aircraft"
            disabled={minUavId === null || Number(uavId) <= minUavId}
          />
          <h1 className="text-2xl font-semibold">
            Aircraft Settings
          </h1>
          <ArrowButton
            direction="right"
            onClick={navigateToNextUav}
            title="Next Aircraft"
            disabled={maxUavId === null || Number(uavId) >= maxUavId}
          />
        </div>
        {aircraft.is_active === false && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p><strong>This aircraft is inactive.</strong> You must reactivate it to make changes.</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">General Information</h3>
              <div className="space-y-2">
                <InfoRow label="Drone Name:" value={aircraft.drone_name} />
                <InfoRow label="Manufacturer:" value={aircraft.manufacturer} />
                <InfoRow label="Type:" value={aircraft.type} />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Motors</h3>
              <div className="space-y-2">
                <InfoRow label="Motors:" value={aircraft.motors} />
                <InfoRow label="Type of Motor:" value={aircraft.motor_type} />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Video Information</h3>
              <div className="space-y-2">
                <InfoRow label="Video:" value={aircraft.video} />
                <InfoRow label="Video System:" value={aircraft.video_system} />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Firmware and Components</h3>
              <div className="space-y-2">
                <InfoRow label="Firmware:" value={aircraft.firmware} />
                <InfoRow label="Firmware Version:" value={aircraft.firmware_version} />
                <InfoRow label="ESC:" value={aircraft.esc} />
                <InfoRow label="ESC Firmware:" value={aircraft.esc_firmware} />
                <InfoRow label="Receiver:" value={aircraft.receiver} />
                <InfoRow label="Receiver Firmware:" value={aircraft.receiver_firmware} />
                <InfoRow label="Flight Controller:" value={aircraft.flight_controller} />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Registration and Serial</h3>
              <div className="space-y-2">
                <InfoRow label="Registration Number:" value={aircraft.registration_number} />
                <InfoRow label="Serial Number:" value={aircraft.serial_number} />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Sensors</h3>
              <div className="grid grid-cols-5 gap-4">
                <GridInfo label="GPS" value={aircraft.gps} />
                <GridInfo label="MAG" value={aircraft.mag} />
                <GridInfo label="BARO" value={aircraft.baro} />
                <GridInfo label="GYRO" value={aircraft.gyro} />
                <GridInfo label="ACC" value={aircraft.acc} />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Statistics</h3>
              <div className="space-y-2">
                <InfoRow label="Total Flights:" value={aircraft.total_flights} />
                <InfoRow label="Total Flight Time:" value={formatFlightHours(aircraft.total_flight_time)} />
                <InfoRow label="Total Takeoffs (TO):" value={aircraft.total_takeoffs} />
                <InfoRow label="Total Landings (LDG):" value={aircraft.total_landings} />
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Maintenance Information</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-gray-700 block">Last Props Maintenance:</span>
                    <span className="text-gray-900">{formatDate(aircraft.props_maint_date)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 block">Next Props Maintenance:</span>
                    <span className="text-gray-900">{formatDate(aircraft.next_props_maint_date)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-gray-700 block">Last Motor Maintenance:</span>
                    <span className="text-gray-900">{formatDate(aircraft.motor_maint_date)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 block">Next Motor Maintenance:</span>
                    <span className="text-gray-900">{formatDate(aircraft.next_motor_maint_date)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-gray-700 block">Last Frame Maintenance:</span>
                    <span className="text-gray-900">{formatDate(aircraft.frame_maint_date)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 block">Next Frame Maintenance:</span>
                    <span className="text-gray-900">{formatDate(aircraft.next_frame_maint_date)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-800">Configuration Files</h3>
                {selectedConfigs.length === 2 && (
                  <Button onClick={compareFiles} variant="primary">
                    Compare Selected Files
                  </Button>
                )}
              </div>
              <table className="w-full text-sm text-left text-gray-500 border border-gray-200">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Select</th>
                    <th className="px-4 py-2">Config Name</th>
                    <th className="px-4 py-2">File</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configFiles.map((config) => (
                    <tr key={config.config_id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedConfigs.includes(config.config_id)}
                          onChange={() => handleConfigSelection(config.config_id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {config.name || 'N/A'}
                      </td>
                      <td className="px-4 py-2">
                        {config.file ? (
                          <a href={config.file} download className="text-blue-500 hover:underline">
                            {getFilenameFromUrl(config.file)}
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-2">
                        <Button onClick={() => handleDeleteConfig(config.config_id)} variant="danger">Delete</Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        name="name"
                        value={configFile.name}
                        onChange={handleConfigChange}
                        placeholder="Enter configuration name"
                        className={`w-full px-2 py-1 border rounded ${configFormErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {configFormErrors.name && <p className="text-red-500 text-xs mt-1">{configFormErrors.name}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="file"
                        name="file"
                        onChange={handleConfigChange}
                        className={`w-full px-2 py-1 border rounded ${configFormErrors.file ? 'border-red-500' : 'border-gray-300'}`}
                        ref={configFileInputRef}
                      />
                      {configFormErrors.file && <p className="text-red-500 text-xs mt-1">{configFormErrors.file}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <Button onClick={handleAddConfig} variant="success">Add</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Maintenance Logs</h3>
              <table className="w-full text-sm text-left text-gray-500 border border-gray-200">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    {maintenanceLogTableColumns.map(col => (
                      <th key={col.accessor} className="px-4 py-2">{col.header}</th>
                    ))}
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraft.maintenance_logs?.map((log, index) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                      {editingLogId === log.maintenance_id ? (
                        <>
                          <td className="px-4 py-2">
                            {renderInput({
                              type: "date",
                              name: "event_date",
                              value: editingLog.event_date,
                              onChange: handleEditLogChange,
                              error: editFormErrors.event_date
                            })}
                          </td>
                          <td className="px-4 py-2">
                            {renderInput({
                              type: "text",
                              name: "description",
                              value: editingLog.description,
                              onChange: handleEditLogChange,
                              error: editFormErrors.description
                            })}
                          </td>
                          <td className="px-4 py-2">
                            {editingLog.originalFile && (
                              <div className="mb-2 text-sm">
                                <span>Current file: </span>
                                <a href={editingLog.originalFile} download className="text-blue-500 hover:underline">
                                  {getFilenameFromUrl(editingLog.originalFile)}
                                </a>
                              </div>
                            )}
                            <input
                              type="file"
                              name="file"
                              onChange={handleEditLogChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current file</p>
                          </td>
                          <td className="px-4 py-2 space-x-2 flex">
                            <Button onClick={handleSaveEdit} variant="success">Save</Button>
                            <Button onClick={handleCancelEdit} variant="secondary">Cancel</Button>
                            <Button onClick={() => handleDeleteLog(log.maintenance_id)} variant="danger">Delete</Button>
                          </td>
                        </>
                      ) : (
                        <>
                          {maintenanceLogTableColumns.map(col => (
                            <td className="px-4 py-2" key={col.accessor}>
                              {col.accessor === 'file' && log.file
                                ? (
                                    <a href={log.file} download className="text-blue-500 hover:underline">
                                      {getFilenameFromUrl(log.file)}
                                    </a>
                                  )
                                : col.render
                                  ? col.render(log[col.accessor], log)
                                  : log[col.accessor] || 'N/A'}
                            </td>
                          ))}
                          <td className="px-4 py-2">
                            <Button onClick={() => handleEditLog(log.maintenance_id)} variant="primary">Edit</Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2">
                      {renderInput({
                        type: "date",
                        name: "event_date",
                        value: newLog.event_date,
                        onChange: handleLogChange,
                        error: formErrors.event_date
                      })}
                    </td>
                    <td className="px-4 py-2">
                      {renderInput({
                        type: "text",
                        name: "description",
                        value: newLog.description,
                        onChange: handleLogChange,
                        placeholder: "Description",
                        error: formErrors.description
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="file"
                        name="file"
                        onChange={handleLogChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        ref={fileInputRef}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Button onClick={handleAddLog} variant="success">Add</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
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

        <ConfirmModal
          open={showDeleteConfigModal}
          title="Confirm Delete Configuration"
          message="Are you sure you want to delete this configuration file?"
          onConfirm={confirmDeleteConfig}
          onCancel={() => setShowDeleteConfigModal(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />
        
        <ConfirmModal
          open={showDeleteModal}
          title="Confirm Delete Log"
          message="Are you sure you want to delete this maintenance log?"
          onConfirm={confirmDeleteLog}
          onCancel={() => setShowDeleteModal(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};

export default AircraftSettings;
