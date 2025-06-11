import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Alert, FormInput, Loading } from '../components';
import { CountryDropdown } from 'react-country-region-selector';
import { useAuth, useApi } from '../hooks';
import { getAllUserFormFields, validateForm, useFieldValidation, processBackendErrors } from '../utils';

const UserSettings = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  // Create initial form data based on all user form fields
  const getInitialFormData = () => {
    const initialData = {};
    getAllUserFormFields().forEach(column => {
      initialData[column.accessor] = '';
    });
    return initialData;
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [userSettings, setUserSettings] = useState({
    notifications_enabled: true,
    a1_a3_reminder: false,
    a2_reminder: false,
    sts_reminder: false,
    reminder_months_before: 3,
    theme: '',
    preferred_units: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);

  const { checkAuthAndGetUser, getAuthHeaders, handleAuthError } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  useEffect(() => {
    // Check authentication and fetch user data on mount
    const auth = checkAuthAndGetUser();
    if (!auth) return;

    fetchUserData();
  }, [navigate]);

  const formatDateForInput = (dateString) => {
    // Format date as YYYY-MM-DD for input fields
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const fetchUserData = async () => {
    try {
      const auth = checkAuthAndGetUser();
      if (!auth) return;

      setIsLoading(true);

      const userResult = await fetchData(`/api/users/${auth.user_id}/`);

      if (!userResult.error) {
        const userData = userResult.data;
        const a1_a3 = userData.a1_a3 ? formatDateForInput(userData.a1_a3) : '';
        const a2 = userData.a2 ? formatDateForInput(userData.a2) : '';
        const sts = userData.sts ? formatDateForInput(userData.sts) : '';
        
        // Create safe form data using initial structure
        const safeFormData = getInitialFormData();
        
        // Override with actual data, ensuring no null/undefined values
        Object.keys(safeFormData).forEach(key => {
          if (userData[key] !== null && userData[key] !== undefined) {
            safeFormData[key] = userData[key];
          }
        });
        
        // Set formatted dates
        safeFormData.a1_a3 = a1_a3;
        safeFormData.a2 = a2;
        safeFormData.sts = sts;
        
        setFormData(safeFormData);

        const settingsResult = await fetchData('/api/user-settings/');

        if (!settingsResult.error) {
          const settingsData = settingsResult.data;
          if (settingsData && settingsData.length > 0) {
            const today = new Date();
            // Check if license dates are valid (future)
            const isA1A3Valid = a1_a3 && new Date(a1_a3) > today;
            const isA2Valid = a2 && new Date(a2) > today;
            const isSTSValid = sts && new Date(sts) > today;
            setUserSettings({
              notifications_enabled: settingsData[0].notifications_enabled ?? true,
              a1_a3_reminder: (settingsData[0].a1_a3_reminder ?? false) && isA1A3Valid,
              a2_reminder: (settingsData[0].a2_reminder ?? false) && isA2Valid,
              sts_reminder: (settingsData[0].sts_reminder ?? false) && isSTSValid,
              reminder_months_before: settingsData[0].reminder_months_before ?? 3,
              theme: settingsData[0].theme || '',
              preferred_units: settingsData[0].preferred_units || '',
              settings_id: settingsData[0].settings_id
            });
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      setError('Failed to load user data. Please try again.');
      setIsLoading(false);
    }
  };

  const handleFieldValidation = useFieldValidation(validationErrors, setValidationErrors, formData);

  const handleChange = (e) => {
    // Update form data on input change
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Use centralized validation
    handleFieldValidation(name, value);
  };

  const handleSettingsChange = (e) => {
    // Update user settings on change
    const { name, value, type, checked } = e.target;

    setUserSettings(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };

      // Disable reminders if license date is not valid
      if (type === 'checkbox' && checked) {
        if (name === 'a1_a3_reminder' && (!formData.a1_a3 || new Date(formData.a1_a3) <= new Date())) {
          updated.a1_a3_reminder = false;
        }
        if (name === 'a2_reminder' && (!formData.a2 || new Date(formData.a2) <= new Date())) {
          updated.a2_reminder = false;
        }
        if (name === 'sts_reminder' && (!formData.sts || new Date(formData.sts) <= new Date())) {
          updated.sts_reminder = false;
        }
      }

      // Enable notifications if any reminder is enabled
      if (name === 'a1_a3_reminder' || name === 'a2_reminder' || name === 'sts_reminder') {
        updated.notifications_enabled =
          updated.a1_a3_reminder ||
          updated.a2_reminder ||
          updated.sts_reminder;
      }

      return updated;
    });
  };

  const selectCountry = (val) => {
    setFormData(prev => ({ ...prev, country: val }));
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      
      const response = await fetch(`${API_URL}/api/export-user-data/`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (handleAuthError(response)) {
          throw new Error('Authentication failed');
        }
        throw new Error(`Failed to export: ${response.status} ${response.statusText}`);
      }
      
      // Download exported ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'dronelogbook_export.zip';
      
      if (contentDisposition) {
        const filenameMatch = /filename="(.+)"/.exec(contentDisposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Your data has been exported successfully!');
    } catch (err) {
      setError('Failed to export data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    // Trigger file input click
    fileInputRef.current.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a ZIP file');
      return;
    }
    
    try {
      setIsImporting(true);
      setError(null);
      setSuccess(null);
      
      const auth = checkAuthAndGetUser();
      if (!auth) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/import-user-data/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        // Log error details for debugging
        console.error('Import failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        let result;
        try {
          result = JSON.parse(errorText);
        } catch (e) {
          result = { detail: errorText || 'Import failed' };
        }
        
        throw new Error(result.detail || result.message || 'Import failed');
      }
      
      const result = await response.json();
      
      fileInputRef.current.value = '';
      
      // Show import summary
      const details = result.details;
      setSuccess(
        `Import successful! Imported: ${details.uavs_imported} UAVs, ` +
        `${details.flight_logs_imported} flight logs, ` +
        `${details.maintenance_logs_imported} maintenance logs, and ` +
        `${details.maintenance_reminders_imported} maintenance reminders.`
      );
      
    } catch (err) {
      setError('Failed to import data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setValidationErrors({});

    try {
      const auth = checkAuthAndGetUser();
      if (!auth) return;

      // Use centralized form validation for all required fields
      const fieldsToValidate = ['first_name', 'last_name', 'email', 'phone', 'zip'];
      const errors = validateForm(formData, fieldsToValidate);

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError('Please fix the validation errors before submitting');
        return;
      }

      // Remove empty license dates
      const cleanedData = { ...formData };
      if (!cleanedData.a1_a3) delete cleanedData.a1_a3;
      if (!cleanedData.a2) delete cleanedData.a2;
      if (!cleanedData.sts) delete cleanedData.sts;

      const userResult = await fetchData(
        `/api/users/${auth.user_id}/`,
        {},
        'PATCH',
        cleanedData
      );

      if (userResult.error) {
        const backendErrors = processBackendErrors(userResult.data);
        if (Object.keys(backendErrors).length > 0) {
          setValidationErrors(backendErrors);
          const firstError = Object.values(backendErrors)[0];
          setError(firstError);
          return;
        }
        setError(userResult.data || 'Failed to update user profile');
        return;
      }

      // Settings update logic
      const settingsMethod = userSettings.settings_id ? 'PUT' : 'POST';
      const settingsEndpoint = userSettings.settings_id
        ? `/api/user-settings/${userSettings.settings_id}/`
        : '/api/user-settings/';

      const settingsData = {
        user: auth.user_id,
        notifications_enabled: userSettings.notifications_enabled,
        a1_a3_reminder: userSettings.a1_a3_reminder,
        a2_reminder: userSettings.a2_reminder,
        sts_reminder: userSettings.sts_reminder,
        reminder_months_before: userSettings.reminder_months_before,
        theme: userSettings.theme,
        preferred_units: userSettings.preferred_units
      };

      const settingsResult = await fetchData(
        settingsEndpoint,
        {},
        settingsMethod,
        settingsData
      );

      if (settingsResult.error) {
        const backendErrors = processBackendErrors(settingsResult.data);
        if (Object.keys(backendErrors).length > 0) {
          setValidationErrors(prevErrors => ({ ...prevErrors, ...backendErrors }));
          setError('Please fix the validation errors before submitting');
          return;
        }
        setError(settingsResult.data || 'Failed to update settings');
        return;
      }

      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.message || 'An error occurred while saving settings.');
    }
  };

  if (isLoading) {
    return <Loading message="Loading user data..." />;
  }

  const LicenseField = ({
    label, dateName, dateValue, onChange, reminderName, reminderChecked, onReminderChange
  }) => {
    // Only enable reminder if date is in the future
    const isDateValid = dateValue && new Date(dateValue) > new Date();
    return (
      <div className="grid grid-cols-4 gap-2 items-center">
        {/* License label */}
        <div className="col-span-1">
          <label>{label}</label>
        </div>
        <div className="col-span-1">
          <label>Valid until:</label>
        </div>
        <div className="col-span-2">
          <FormInput
            type="date"
            name={dateName}
            id={dateName}
            value={dateValue}
            onChange={onChange}
          />
        </div>
        <div className="col-span-4 flex items-center mt-1">
          <input
            type="checkbox"
            name={reminderName}
            id={reminderName}
            checked={reminderChecked}
            onChange={onReminderChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={!isDateValid}
          />
          <label htmlFor={reminderName} className={`ml-2 text-sm text-gray-700 ${!isDateValid ? 'text-gray-400' : ''}`}>
            Send me a reminder before expiry
          </label>
          {!isDateValid && (
            <span className="ml-2 text-xs text-gray-400">(Set a future date to enable)</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout title="User Settings">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-medium text-gray-900">Data Management</h3>
              <p className="text-sm text-gray-500">
                Export or import your drone data including UAVs, flight logs, and maintenance records.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleImportData} 
                variant="secondary" 
                disabled={isImporting}
                className="min-w-max"
              >
                {isImporting ? (
                  <>
                    {/* Spinner icon */}
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    {/* Import icon */}
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                    </svg>
                    Import Data
                  </>
                )}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".zip"
                className="hidden"
              />
              <Button 
                onClick={handleExportData} 
                variant="secondary" 
                disabled={isExporting}
                className="min-w-max"
              >
                {isExporting ? (
                  <>
                    {/* Spinner icon */}
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    {/* Export icon */}
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label>First name*</label>
            <FormInput
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
              className={validationErrors.first_name ? 'border-red-500' : ''}
            />
            {validationErrors.first_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
            )}
          </div>
          
          <div>
            <label>Last name*</label>
            <FormInput
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
              className={validationErrors.last_name ? 'border-red-500' : ''}
            />
            {validationErrors.last_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.last_name}</p>
            )}
          </div>
          
          <div>
            <label>Company Name</label>
            <FormInput
              type="text"
              name="company"
              id="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Drone Solutions Inc."
            />
          </div>
          
          <div>
            <label>E-mail</label>
            <FormInput
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john.doe@example.com"
              required
              disabled
              className={validationErrors.email ? 'border-red-500' : ''}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>
          
          <div>
            <label>Phone number</label>
            <FormInput
              type="text"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+41785678901"
              className={validationErrors.phone ? 'border-red-500' : ''}
            />
            {validationErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
            )}
          </div>
          
          <div>
            <label>Street Address</label>
            <FormInput
              type="text"
              name="street"
              id="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Drone Street 12"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Zip Code</label>
              <FormInput
                type="text"
                name="zip"
                id="zip"
                value={formData.zip}
                onChange={handleChange}
                placeholder="8008"
                className={validationErrors.zip ? 'border-red-500' : ''}
              />
              {validationErrors.zip && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.zip}</p>
              )}
            </div>
            <div>
              <label>City</label>
              <FormInput
                type="text"
                name="city"
                id="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Drone City"
              />
            </div>
          </div>
          
          <div>
            <label>Country</label>
            <div className="mt-1">
              <CountryDropdown
                id="country"
                name="country"
                value={formData.country}
                onChange={selectCountry}
                defaultOptionLabel=" "
                className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label>Drone Operator Number</label>
            <FormInput
              type="text"
              name="drone_ops_nb"
              id="drone_ops_nb"
              value={formData.drone_ops_nb}
              onChange={handleChange}
              placeholder="CHEdkI9245ddjG325"
            />
          </div>
          
          <div>
            <label>Pilot License number</label>
            <FormInput
              type="text"
              name="pilot_license_nb"
              id="pilot_license_nb"
              value={formData.pilot_license_nb}
              onChange={handleChange}
              placeholder="FCL.CH.345789"
            />
          </div>
          
          <h3 className="text-lg font-medium pt-2 text-black">License Category</h3>
          
          <LicenseField 
            label="A1 / A3"
            dateName="a1_a3"
            dateValue={formData.a1_a3}
            onChange={handleChange}
            reminderName="a1_a3_reminder"
            reminderChecked={userSettings.a1_a3_reminder}
            onReminderChange={handleSettingsChange}
          />
          
          <LicenseField 
            label="A2"
            dateName="a2"
            dateValue={formData.a2}
            onChange={handleChange}
            reminderName="a2_reminder"
            reminderChecked={userSettings.a2_reminder}
            onReminderChange={handleSettingsChange}
          />
          
          <LicenseField 
            label="STS"
            dateName="sts"
            dateValue={formData.sts}
            onChange={handleChange}
            reminderName="sts_reminder"
            reminderChecked={userSettings.sts_reminder}
            onReminderChange={handleSettingsChange}
          />
          
          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-medium text-black">Notification Settings</h3>
            
            <div className="mt-4">
              <label htmlFor="reminder_months_before" className="block text-sm font-medium text-gray-700">
                Send reminders before expiry (months):
              </label>
              <select
                id="reminder_months_before"
                name="reminder_months_before"
                value={userSettings.reminder_months_before}
                onChange={handleSettingsChange}
                className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              >
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="col-span-1 md:col-span-2 mt-6 flex justify-center">
          <Button type="submit" variant="primary" fullWidth={false} className="max-w-md">
            Save changes
          </Button>
        </div>
      </form>
    </Layout>
  );
};

export default UserSettings;