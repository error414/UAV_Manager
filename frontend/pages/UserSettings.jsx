import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Sidebar, FormInput, Loading } from '../components';
import { CountryDropdown } from 'react-country-region-selector';
import { useAuth, useApi } from '../utils/authUtils';

const LicenseField = ({
  label, dateName, dateValue, onChange, reminderName, reminderChecked, onReminderChange
}) => {
  const isDateValid = dateValue && new Date(dateValue) > new Date();
  return (
    <div className="grid grid-cols-4 gap-2 items-center">
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

const UserSettings = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    drone_ops_nb: '',
    pilot_license_nb: '',
    phone: '',
    street: '',
    zip: '',
    city: '',
    country: '',
    a1_a3: '',
    a2: '',
    sts: ''
  });
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

  const { checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;

    fetchUserData();
  }, [navigate]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const formatDateForInput = (dateString) => {
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
        setFormData({
          ...userData,
          a1_a3,
          a2,
          sts
        });

        const settingsResult = await fetchData('/api/user-settings/');

        if (!settingsResult.error) {
          const settingsData = settingsResult.data;
          if (settingsData && settingsData.length > 0) {
            const today = new Date();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;

    setUserSettings(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const auth = checkAuthAndGetUser();
      if (!auth) return;

      if (!formData.first_name || !formData.last_name || !formData.email) {
        setError('Please fill in all required fields: First Name, Last Name, and Email');
        return;
      }

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

      if (!userResult.error) {
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

        if (!settingsResult.error) {
          setSuccess('Settings saved successfully!');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving settings.');
    }
  };

  if (isLoading) {
    return <Loading message="Loading user data..." />;
  }

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
          <h1 className="text-2xl font-semibold text-center flex-1">User Settings</h1>
        </div>
        
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label>First name</label>
              <FormInput
                type="text"
                name="first_name"
                id="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="John"
                required
              />
            </div>
            
            <div>
              <label>Last name</label>
              <FormInput
                type="text"
                name="last_name"
                id="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                required
              />
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
              />
            </div>
            
            <div>
              <label>Phone number</label>
              <FormInput
                type="text"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8901"
              />
            </div>
            
            <div>
              <label>Street Address</label>
              <FormInput
                type="text"
                name="street"
                id="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Drone Street"
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
                  placeholder="12345"
                />
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
      </div>
    </div>
  );
};

export default UserSettings;