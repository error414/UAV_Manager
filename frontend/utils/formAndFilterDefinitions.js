/**
 * Combined form and filter definitions for the application
 * Contains all form fields, filter configurations, and initial states
 */

// === USER MANAGEMENT ===
export const userFilterFormFields = [
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

// === UAV MANAGEMENT ===
// UAV Edit Form
export const uavEditFormFields = [
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

// UAV Filter Initial State
export const UAV_INITIAL_FILTERS = {
  drone_name: '',
  manufacturer: '',
  type: '',
  motors: '',
  motor_type: '',
  firmware_version: '',
  video_system: '',
  gps: '',
  mag: '',
  baro: '',
  gyro: '',
  acc: '',
  registration_number: '',
  serial_number: ''
};

// === FLIGHT LOG MANAGEMENT ===
// Flight Log Form Options
export const FLIGHT_FORM_OPTIONS = {
  light_conditions: [
    { value: 'Day', label: 'Day' },
    { value: 'Night', label: 'Night' }
  ],
  ops_conditions: [
    { value: 'VLOS', label: 'VLOS' },
    { value: 'BLOS', label: 'BLOS' }
  ],
  pilot_type: [
    { value: 'PIC', label: 'PIC' },
    { value: 'Dual', label: 'Dual' },
    { value: 'Instruction', label: 'Instruction' }
  ]
};

// Flight Log Initial State
export const INITIAL_FLIGHT_STATE = {
  departure_place: '',
  departure_date: '',
  departure_time: '',
  landing_time: '',
  landing_place: '',
  flight_duration: '',
  takeoffs: '',
  landings: '',
  light_conditions: '',
  ops_conditions: '',
  pilot_type: '',
  uav: '',
  comments: ''
};

// Function to get flight log form fields with dynamic UAV options
export const getFlightFormFields = (availableUAVs = []) => [
  { name: 'departure_place', label: 'Departure Place', type: 'text', placeholder: 'Departure Place' },
  { name: 'departure_date', label: 'Date', type: 'date', placeholder: 'Date' },
  { name: 'departure_time', label: 'Departure Time', type: 'time', placeholder: 'Departure Time', step: '1' },
  { name: 'landing_time', label: 'LDG Time', type: 'time', placeholder: 'LDG Time', step: '1' },
  { name: 'landing_place', label: 'LDG Place', type: 'text', placeholder: 'LDG Place' },
  { name: 'flight_duration', label: 'Duration', type: 'number', placeholder: 'Duration (s)', step: '1', min: '0' },
  { name: 'takeoffs', label: 'T/O', type: 'number', placeholder: 'T/O', step: '1', min: '0' },
  { name: 'landings', label: 'LDG', type: 'number', placeholder: 'LDG', step: '1', min: '0' },
  { name: 'light_conditions', label: 'Light', type: 'select', placeholder: 'Light', options: FLIGHT_FORM_OPTIONS.light_conditions },
  { name: 'ops_conditions', label: 'OPS', type: 'select', placeholder: 'OPS', options: FLIGHT_FORM_OPTIONS.ops_conditions },
  { name: 'pilot_type', label: 'Pilot Type', type: 'select', placeholder: 'Pilot Type', options: FLIGHT_FORM_OPTIONS.pilot_type },
  { 
    name: 'uav', 
    label: 'UAV', 
    type: 'select', 
    placeholder: 'Select UAV',
    options: Array.isArray(availableUAVs) ? availableUAVs.map(uav => ({ 
      value: uav.uav_id, 
      label: uav.drone_name 
    })) : []
  },
  { name: 'comments', label: 'Comments', type: 'text', placeholder: 'Comments' }
];
