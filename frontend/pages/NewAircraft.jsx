import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Sidebar, FormInput } from '../components';

const NewAircraftPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // State for form data
  const [formData, setFormData] = useState({
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
    frame_reminder_date: ''
  });

  // State for alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for dropdown options
  const [aircraftTypes] = useState([
    { value: 'Quad', label: 'Quad' },
    { value: 'Tricopter', label: 'Tricopter' },
    { value: 'Hexacopter', label: 'Hexacopter' },
    { value: 'Wing', label: 'Wing' },
    { value: 'Airplane', label: 'Airplane' }
  ]);

  const [flightControllerTypes] = useState([
    { value: 'Happymodel x12 AIO', label: 'Happymodel x12 AIO' },
    { value: 'KISS', label: 'KISS' },
    { value: 'DJI', label: 'DJI' },
    { value: 'Ardupilot', label: 'Ardupilot' },
    { value: 'Other', label: 'Other' }
  ]);

  const [firmwareOptions] = useState([
    { value: 'Betaflight', label: 'Betaflight' },
    { value: 'INAV', label: 'INAV' },
    { value: 'Cleanflight', label: 'Cleanflight' },
    { value: 'Baseflight', label: 'Baseflight' },
    { value: 'Emuflight', label: 'Emuflight' },
    { value: 'Other', label: 'Other' }
  ]);

  const [videoOptions] = useState([
    { value: 'Analog', label: 'Analog' },
    { value: 'Digital', label: 'Digital' },
    { value: 'None', label: 'None' }
  ]);

  const [videoSystemOptions] = useState([
    { value: 'HD-Zero', label: 'HD-Zero' },
    { value: 'DJI O2', label: 'DJI O2' },
    { value: 'DJI O3', label: 'DJI O3' },
    { value: 'DJI O4', label: 'DJI O4' },
    { value: 'Analog', label: 'Analog' },
    { value: 'Walksnail', label: 'Walksnail' },
    { value: 'Caddx Vista', label: 'Caddx Vista' },
    { value: 'Others', label: 'Others' }
  ]);

  // Toggle sidebar
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Format date to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Handle form submission
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
      if (!formData.drone_name || !formData.manufacturer || !formData.serial_number) {
        setError('Please fill in all required fields: Drone Name, Manufacturer, and Serial Number');
        return;
      }

      // Create payload for backend
      const aircraftPayload = {
        ...formData,
        user: user_id,
        motors: parseInt(formData.motors),
        // Convert string values to integers if needed
        gps: parseInt(formData.gps),
        mag: parseInt(formData.mag),
        baro: parseInt(formData.baro),
        gyro: parseInt(formData.gyro),
        acc: parseInt(formData.acc)
      };

      const response = await fetch('http://127.0.0.1:8000/api/uavs/', {
        method: 'POST',
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

      const data = await response.json();
      setSuccess('Aircraft successfully registered!');
      
      // Reset form after successful submission
      setFormData({
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
        frame_reminder_date: ''
      });
    } catch (err) {
      console.error('Error registering aircraft:', err);
      setError(err.message || 'An error occurred while registering the aircraft.');
    }
  };

  // Helper function to create a select element with custom styling
  const renderSelect = (name, value, options, onChange) => (
    <div className="relative">
      <select
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-400 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black pr-8"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content - Form Area */}
      <div className="flex-1 flex flex-col w-full overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-5xl pt-16 lg:pt-4">
          <h1 className="text-2xl font-bold mb-6 text-center lg:block hidden">New Aircraft</h1>
          
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Drone Name */}
              <div>
                <label className="block text-sm font-medium text-black">Drone Name</label>
                <FormInput
                  type="text"
                  name="drone_name"
                  id="drone_name"
                  value={formData.drone_name}
                  onChange={handleChange}
                  placeholder="ModularHDZero"
                  className="border-gray-400 text-black"
                  required
                />
              </div>
              
              {/* Manufacturer */}
              <div>
                <label className="block text-sm font-medium text-black">Manufacturer</label>
                <FormInput
                  type="text"
                  name="manufacturer"
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  placeholder="Happymodel"
                  className="border-gray-400 text-black"
                  required
                />
              </div>
              
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-black">Type</label>
                {renderSelect("type", formData.type, aircraftTypes, handleChange)}
              </div>
              
              {/* Motors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black">Motors</label>
                  <FormInput
                    type="number"
                    name="motors"
                    id="motors"
                    value={formData.motors}
                    onChange={handleChange}
                    min="0"
                    className="mt-0 border-gray-400 text-black"
                  />
                </div>
                
                {/* Motor Type */}
                <div>
                  <label className="block text-sm font-medium text-black">Type of Motor</label>
                  <FormInput
                    type="text"
                    name="motor_type"
                    id="motor_type"
                    value={formData.motor_type}
                    onChange={handleChange}
                    placeholder="Electric"
                    className="mt-0 border-gray-400 text-black"
                  />
                </div>
              </div>
              
              {/* Video */}
              <div>
                <label className="block text-sm font-medium text-black">Video</label>
                {renderSelect("video", formData.video, videoOptions, handleChange)}
              </div>
              
              {/* Video System */}
              <div>
                <label className="block text-sm font-medium text-black">Video System</label>
                {renderSelect("video_system", formData.video_system, videoSystemOptions, handleChange)}
              </div>
              
              {/* ESC */}
              <div>
                <label className="block text-sm font-medium text-black">ESC</label>
                <FormInput
                  type="text"
                  name="esc"
                  id="esc"
                  value={formData.esc}
                  onChange={handleChange}
                  placeholder="Happymodel x12 AIO 12A"
                  className="border-gray-400 text-black"
                />
              </div>
              
              {/* ESC Firmware */}
              <div>
                <label className="block text-sm font-medium text-black">ESC Firmware</label>
                <FormInput
                  type="text"
                  name="esc_firmware"
                  id="esc_firmware"
                  value={formData.esc_firmware}
                  onChange={handleChange}
                  placeholder="Bluejay_0.21.0"
                  className="border-gray-400 text-black"
                />
              </div>
              
              {/* Receiver */}
              <div>
                <label className="block text-sm font-medium text-black">Receiver</label>
                <FormInput
                  type="text"
                  name="receiver"
                  id="receiver"
                  value={formData.receiver}
                  onChange={handleChange}
                  placeholder="RadioMaster RP1"
                  className="border-gray-400 text-black"
                />
              </div>
              
              {/* Receiver Firmware */}
              <div>
                <label className="block text-sm font-medium text-black">Receiver Firmware</label>
                <FormInput
                  type="text"
                  name="receiver_firmware"
                  id="receiver_firmware"
                  value={formData.receiver_firmware}
                  onChange={handleChange}
                  placeholder="elrs v3.5.3"
                  className="border-gray-400 text-black"
                />
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-4">
              {/* Flight Controller */}
              <div>
                <label className="block text-sm font-medium text-black">Flight Controller</label>
                <FormInput
                  type="text"
                  name="flight_controller"
                  id="flight_controller"
                  value={formData.flight_controller}
                  onChange={handleChange}
                  placeholder="Happymodel x12 AIO"
                  className="border-gray-400 text-black"
                />
              </div>
              
              {/* Firmware */}
              <div>
                <label className="block text-sm font-medium text-black">Firmware</label>
                {renderSelect("firmware", formData.firmware, firmwareOptions, handleChange)}
              </div>
              
              {/* Firmware Version */}
              <div>
                <label className="block text-sm font-medium text-black">Firmware Version</label>
                <FormInput
                  type="text"
                  name="firmware_version"
                  id="firmware_version"
                  value={formData.firmware_version}
                  onChange={handleChange}
                  placeholder="4.5.5"
                  className="border-gray-400 text-black"
                />
              </div>
              
              {/* Sensors Grid */}
              <div className="grid grid-cols-5 gap-1">
                <div>
                  <label className="block text-sm font-medium text-black text-center">GPS</label>
                  <FormInput
                    type="number"
                    name="gps"
                    id="gps"
                    value={formData.gps}
                    onChange={handleChange}
                    min="0"
                    className="text-center mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black text-center">Mag</label>
                  <FormInput
                    type="number"
                    name="mag"
                    id="mag"
                    value={formData.mag}
                    onChange={handleChange}
                    min="0"
                    className="text-center mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black text-center">Baro</label>
                  <FormInput
                    type="number"
                    name="baro"
                    id="baro"
                    value={formData.baro}
                    onChange={handleChange}
                    min="0"
                    className="text-center mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black text-center">Gyro</label>
                  <FormInput
                    type="number"
                    name="gyro"
                    id="gyro"
                    value={formData.gyro}
                    onChange={handleChange}
                    min="0"
                    className="text-center mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black text-center">ACC</label>
                  <FormInput
                    type="number"
                    name="acc"
                    id="acc"
                    value={formData.acc}
                    onChange={handleChange}
                    min="0"
                    className="text-center mt-0 border-gray-400 text-black"
                  />
                </div>
              </div>
              
              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-black">Registration Number</label>
                <FormInput
                  type="text"
                  name="registration_number"
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  placeholder="CHEdkI9245ddjG325"
                  className="border-gray-400 text-black"
                />
              </div>
              
              {/* Serial Number */}
              <div>
                <label className="block text-sm font-medium text-black">Serial Number</label>
                <FormInput
                  type="text"
                  name="serial_number"
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  placeholder="SN5678905312AB"
                  className="border-gray-400 text-black"
                  required
                />
              </div>
              
              {/* Maintenance Dates */}
              <h3 className="text-lg font-medium pt-2 text-black">Last Maintenance:</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Props Maintenance */}
                <div>
                  <label className="block text-sm font-medium text-black">Props Maint:</label>
                  <FormInput
                    type="date"
                    name="props_maint_date"
                    id="props_maint_date"
                    value={formatDateForInput(formData.props_maint_date)}
                    onChange={handleChange}
                    className="mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Next:</label>
                  <FormInput
                    type="date"
                    name="props_reminder_date"
                    id="props_reminder_date"
                    value={formatDateForInput(formData.props_reminder_date)}
                    onChange={handleChange}
                    className="mt-0 w-full border-gray-400 text-black"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Motor Maintenance */}
                <div>
                  <label className="block text-sm font-medium text-black">Motor Maint:</label>
                  <FormInput
                    type="date"
                    name="motor_maint_date"
                    id="motor_maint_date"
                    value={formatDateForInput(formData.motor_maint_date)}
                    onChange={handleChange}
                    className="mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Next:</label>
                  <FormInput
                    type="date"
                    name="motor_reminder_date"
                    id="motor_reminder_date"
                    value={formatDateForInput(formData.motor_reminder_date)}
                    onChange={handleChange}
                    className="mt-0 w-full border-gray-400 text-black"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Frame Maintenance */}
                <div>
                  <label className="block text-sm font-medium text-black">Frame Maint:</label>
                  <FormInput
                    type="date"
                    name="frame_maint_date"
                    id="frame_maint_date"
                    value={formatDateForInput(formData.frame_maint_date)}
                    onChange={handleChange}
                    className="mt-0 border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Next:</label>
                  <FormInput
                    type="date"
                    name="frame_reminder_date"
                    id="frame_reminder_date"
                    value={formatDateForInput(formData.frame_reminder_date)}
                    onChange={handleChange}
                    className="mt-0 w-full border-gray-400 text-black"
                  />
                </div>
              </div>
            </div>
            
            {/* Submit Button - Full Width */}
            <div className="col-span-1 md:col-span-2 mt-6">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewAircraftPage;