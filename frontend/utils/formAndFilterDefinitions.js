/**
 * Form and filter definitions for the app
 */

// === VALIDATION UTILITIES ===
export const validateEmail = (email) => {
  // More strict email validation that matches backend requirements
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Allow numbers, spaces, +, -, (, ) and common phone formatting
  const phoneRegex = /^[\+]?[\d\s\-\(\)]*$/;
  return phoneRegex.test(phone);
};

export const validateZip = (zip) => {
  // Only allow numbers
  const zipRegex = /^\d*$/;
  return zipRegex.test(zip);
};

// Enhanced password validation to match Django's default validators
export const validatePassword = (password) => {
  if (!password || password.length < 8) return false;
  
  // Check for common passwords (basic check)
  const commonPasswords = ['password', '12345678', 'qwertyui', 'abc123456'];
  if (commonPasswords.includes(password.toLowerCase())) return false;
  
  // Check if password is entirely numeric
  if (/^\d+$/.test(password)) return false;
  
  return true;
};

/**
 * Processes backend validation errors for user registration
 * @param {Object|String} backendError - The error response from backend
 * @returns {Object} - Processed errors with field names as keys and user-friendly messages as values
 */
export const processBackendErrors = (backendError) => {
  const processedErrors = {};
  
  try {
    // Parse JSON string if needed
    let errorData = backendError;
    if (typeof backendError === 'string') {
      try {
        errorData = JSON.parse(backendError);
      } catch (parseError) {
        // If it's not JSON, treat as a general error message
        return { general: backendError };
      }
    }
    
    // Process each field error
    Object.keys(errorData).forEach(field => {
      const fieldErrors = errorData[field];
      
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        let errorMessage = fieldErrors[0];
        
        // Convert specific backend message to user-friendly one
        if (errorMessage === 'user with this email already exists.') {
          processedErrors[field] = 'An account with this email address already exists';
        } else {
          processedErrors[field] = errorMessage;
        }
      }
    });
    
  } catch (e) {
    console.error('Failed to parse backend errors:', e);
    return { general: 'Validation errors occurred. Please check your input.' };
  }
  
  return processedErrors;
};

// Field validation rules configuration
export const FIELD_VALIDATION_RULES = {
  email: {
    required: true,
    validator: validateEmail,
    errorMessage: 'Please enter a valid email address'
  },
  phone: {
    required: false,
    validator: validatePhone,
    errorMessage: 'Phone number can only contain numbers, spaces, +, -, (, )'
  },
  zip: {
    required: false,
    validator: validateZip,
    errorMessage: 'ZIP code can only contain numbers'
  },
  first_name: {
    required: true,
    validator: (value) => value && value.trim().length > 0,
    errorMessage: 'First name is required'
  },
  last_name: {
    required: true,
    validator: (value) => value && value.trim().length > 0,
    errorMessage: 'Last name is required'
  },
  password: {
    required: true,
    validator: validatePassword,
    errorMessage: 'Password must be at least 8 characters long and cannot be entirely numeric or a common password'
  },
  re_password: {
    required: true,
    validator: (value, formData) => value && formData && value === formData.password,
    errorMessage: 'Passwords do not match'
  }
};

/**
 * Validates a single field based on configured rules
 * @param {string} fieldName - The name of the field to validate
 * @param {string} value - The value to validate
 * @param {Object} formData - Full form data for cross-field validation
 * @returns {string|null} - Error message if invalid, null if valid
 */
export const validateField = (fieldName, value, formData = null) => {
  const rule = FIELD_VALIDATION_RULES[fieldName];
  if (!rule) return null;

  // Check if field is required and empty
  if (rule.required && (!value || !value.trim())) {
    return rule.errorMessage;
  }

  // If field has a value, validate it
  if (value && value.trim() && rule.validator && !rule.validator(value, formData)) {
    return rule.errorMessage;
  }

  return null;
};

/**
 * Validates multiple fields at once
 * @param {Object} formData - Object containing field names and values
 * @param {Array} fieldsToValidate - Array of field names to validate
 * @returns {Object} - Object with field names as keys and error messages as values
 */
export const validateForm = (formData, fieldsToValidate = []) => {
  const errors = {};
  
  fieldsToValidate.forEach(fieldName => {
    const error = validateField(fieldName, formData[fieldName], formData);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

/**
 * Hook for real-time field validation
 * @param {Object} validationErrors - Current validation errors state
 * @param {Function} setValidationErrors - Function to update validation errors
 * @param {Object} formData - Current form data for cross-field validation
 * @returns {Function} - Function to handle field changes with validation
 */
export const useFieldValidation = (validationErrors, setValidationErrors, formData = null) => {
  return (fieldName, value) => {
    // Clear existing error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Validate field if it has a value
    if (value && value.trim()) {
      const error = validateField(fieldName, value, formData);
      if (error) {
        setValidationErrors(prev => ({
          ...prev,
          [fieldName]: error
        }));
      }
    }
  };
}

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

// Initial filter state for UAVs
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

// Options for flight log select fields
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

// Initial state for flight log form
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

// Returns flight log form fields, UAV options are dynamic
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
