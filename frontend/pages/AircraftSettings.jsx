import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar, Button } from '../components';

const AircraftSettings = () => {
  const { uavId } = useParams();
  const navigate = useNavigate();
  const [aircraft, setAircraft] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [newLog, setNewLog] = useState({ 
    event_type: 'LOG', 
    description: '', 
    event_date: '',
    file: null 
  });
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLog, setEditingLog] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Helper function to handle maintenance log submissions
  const submitMaintenanceLog = async (logData, file, method, logId = null) => {
    const token = localStorage.getItem('access_token');
    const endpoint = logId 
      ? `${API_URL}/api/maintenance/${logId}/` 
      : `${API_URL}/api/maintenance/`;
    
    try {
      let response;
      
      if (file) {
        // Use FormData when submitting files
        const formData = new FormData();
        formData.append('description', logData.description);
        formData.append('event_date', logData.event_date);
        formData.append('event_type', 'LOG');
        formData.append('uav', uavId);
        formData.append('file', file); // Attach file
        
        response = await fetch(endpoint, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // Use JSON when no file is being submitted
        response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...logData,
            event_type: 'LOG',
            uav: uavId,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error details:', errorData);
        throw new Error(`Failed to ${method === 'POST' ? 'add' : 'update'} maintenance log`);
      }
      
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const fetchAircraft = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/uavs/${uavId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch aircraft data');
      const data = await response.json();

      // Fetch maintenance logs
      const logsResponse = await fetch(`${API_URL}/api/maintenance/?uav=${uavId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        data.maintenance_logs = logsData;
      }

      // Fetch maintenance reminders
      const remindersResponse = await fetch(`${API_URL}/api/maintenance-reminders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json();
        const uavReminders = remindersData.filter(reminder =>
          reminder.uav === parseInt(uavId)
        );

        uavReminders.forEach(reminder => {
          if (reminder.component === 'props') {
            data.next_props_maint_date = reminder.next_maintenance;
          } else if (reminder.component === 'motor') {
            data.next_motor_maint_date = reminder.next_maintenance;
          } else if (reminder.component === 'frame') {
            data.next_frame_maint_date = reminder.next_maintenance;
          }
        });
      }

      // Flight statistics are now included in the UAV detail response
      // No need to make separate API calls

      setAircraft(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAircraft();
  }, [uavId, API_URL]);

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

  const handleModifyClick = () => {
    navigate(`/edit-aircraft/${uavId}`);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const formatFlightHours = (hours) => {
    if (!hours) return 'N/A';
    const totalMinutes = Math.round(hours * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleLogChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setNewLog({ ...newLog, file: files[0] });
    } else {
      setNewLog({ ...newLog, [name]: value });
    }
  };

  const handleEditLog = (logId) => {
    const logToEdit = aircraft.maintenance_logs.find(log => log.maintenance_id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setEditingLog({ 
        ...logToEdit,
        file: null // Initialize file as null when editing
      });
    }
  };

  const handleEditLogChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setEditingLog({ ...editingLog, file: files[0] });
    } else {
      setEditingLog({ ...editingLog, [name]: value });
    }
  };

  const handleSaveEdit = async () => {
    const success = await submitMaintenanceLog(
      editingLog,
      editingLog.file,
      'PUT',
      editingLogId
    );
    
    if (success) {
      await fetchAircraft();
      setEditingLogId(null);
      setEditingLog(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingLog(null);
  };

  const handleAddLog = async () => {
    const success = await submitMaintenanceLog(
      newLog,
      newLog.file,
      'POST'
    );
    
    if (success) {
      await fetchAircraft();
      setNewLog({ event_type: 'LOG', description: '', event_date: '', file: null });
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this maintenance log?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/maintenance/${logId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete maintenance log');
      
      await fetchAircraft();
      
      setEditingLogId(null);
      setEditingLog(null);
    } catch (error) {
      console.error(error);
    }
  };

  if (!aircraft) return <div>Loading...</div>;

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
      <div className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="flex items-center h-10 mb-4">
          <div className="w-10 lg:hidden"></div>
          <h1 className="text-2xl font-semibold text-center flex-1">Aircraft Settings</h1>
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
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Drone Name:</span>
                  <span className="text-gray-900">{aircraft.drone_name || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Manufacturer:</span>
                  <span className="text-gray-900">{aircraft.manufacturer || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Type:</span>
                  <span className="text-gray-900">{aircraft.type || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Motors</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Motors:</span>
                  <span className="text-gray-900">{aircraft.motors || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Type of Motor:</span>
                  <span className="text-gray-900">{aircraft.motor_type || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Video Information</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Video:</span>
                  <span className="text-gray-900">{aircraft.video || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Video System:</span>
                  <span className="text-gray-900">{aircraft.video_system || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Firmware and Components</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Firmware:</span>
                  <span className="text-gray-900">{aircraft.firmware || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Firmware Version:</span>
                  <span className="text-gray-900">{aircraft.firmware_version || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">ESC:</span>
                  <span className="text-gray-900">{aircraft.esc || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">ESC Firmware:</span>
                  <span className="text-gray-900">{aircraft.esc_firmware || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Receiver:</span>
                  <span className="text-gray-900">{aircraft.receiver || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Receiver Firmware:</span>
                  <span className="text-gray-900">{aircraft.receiver_firmware || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Flight Controller:</span>
                  <span className="text-gray-900">{aircraft.flight_controller || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Sensors</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
                  <span className="font-semibold text-gray-700">GPS</span>
                  <span className="text-gray-900">{aircraft.gps || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
                  <span className="font-semibold text-gray-700">MAG</span>
                  <span className="text-gray-900">{aircraft.mag || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
                  <span className="font-semibold text-gray-700">BARO</span>
                  <span className="text-gray-900">{aircraft.baro || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
                  <span className="font-semibold text-gray-700">GYRO</span>
                  <span className="text-gray-900">{aircraft.gyro || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
                  <span className="font-semibold text-gray-700">ACC</span>
                  <span className="text-gray-900">{aircraft.acc || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Registration and Serial</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Registration Number:</span>
                  <span className="text-gray-900">{aircraft.registration_number || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Serial Number:</span>
                  <span className="text-gray-900">{aircraft.serial_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Flights:</span>
                  <span className="text-gray-900">{aircraft.total_flights || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Flight Time:</span>
                  <span className="text-gray-900">{formatFlightHours(aircraft.total_flight_time / 3600)}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Takeoffs (TO):</span>
                  <span className="text-gray-900">{aircraft.total_takeoffs || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-40">Total Landings (LDG):</span>
                  <span className="text-gray-900">{aircraft.total_landings || 'N/A'}</span>
                </div>
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
              <h3 className="text-lg font-medium text-gray-800 mb-3">Maintenance Logs</h3>
              <table className="w-full text-sm text-left text-gray-500 border border-gray-200">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Log</th>
                    <th className="px-4 py-2">File</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraft.maintenance_logs?.map((log, index) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                      {editingLogId === log.maintenance_id ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              name="event_date"
                              value={editingLog.event_date}
                              onChange={handleEditLogChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              name="description"
                              value={editingLog.description}
                              onChange={handleEditLogChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="file"
                              name="file"
                              onChange={handleEditLogChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-2 space-x-2 flex">
                            <Button
                              onClick={handleSaveEdit}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              className="bg-gray-500 hover:bg-gray-600 text-white"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleDeleteLog(log.maintenance_id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Delete
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2">{log.event_date || 'N/A'}</td>
                          <td className="px-4 py-2">{log.description || 'N/A'}</td>
                          <td className="px-4 py-2">
                            {log.file ? (
                              <a 
                                href={log.file} 
                                download 
                                className="text-blue-500 hover:underline"
                              >
                                Download File
                              </a>
                            ) : 'N/A'}
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              onClick={() => handleEditLog(log.maintenance_id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Edit
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        name="event_date"
                        value={newLog.event_date}
                        onChange={handleLogChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        name="description"
                        value={newLog.description}
                        onChange={handleLogChange}
                        placeholder="Description"
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="file"
                        name="file"
                        onChange={handleLogChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        onClick={handleAddLog}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Add
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center space-x-4">
          <Button
            onClick={handleModifyClick}
            className="max-w-md bg-blue-500 hover:bg-blue-600 text-white"
          >
            Modify Aircraft
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AircraftSettings;
