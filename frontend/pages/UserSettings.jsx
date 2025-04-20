import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Sidebar, FormInput, Loading } from '../components';
import { CountryDropdown } from 'react-country-region-selector';

const API_URL = import.meta.env.VITE_API_URL;

const LicenseField = ({ label, dateName, dateValue, onChange, reminderName, reminderChecked, onReminderChange }) => (
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
      />
      <label htmlFor={reminderName} className="ml-2 text-sm text-gray-700">
        Send me a reminder before expiry
      </label>
    </div>
  </div>
);

const UserSettings = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    } else {
      fetchUserData();
    }
  }, [navigate]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');

      if (!token || !user_id) {
        setError('Authentication required. Please log in again.');
        return;
      }

      setIsLoading(true);

      const userResponse = await fetch(`${API_URL}/api/users/${user_id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      }

      const userData = await userResponse.json();
      setFormData({
        ...userData,
        a1_a3: userData.a1_a3 ? formatDateForInput(userData.a1_a3) : '',
        a2: userData.a2 ? formatDateForInput(userData.a2) : '',
        sts: userData.sts ? formatDateForInput(userData.sts) : ''
      });

      const settingsResponse = await fetch(`${API_URL}/api/user-settings/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData && settingsData.length > 0) {
          setUserSettings({
            notifications_enabled: settingsData[0].notifications_enabled ?? true,
            a1_a3_reminder: settingsData[0].a1_a3_reminder ?? false,
            a2_reminder: settingsData[0].a2_reminder ?? false,
            sts_reminder: settingsData[0].sts_reminder ?? false,
            reminder_months_before: settingsData[0].reminder_months_before ?? 3,
            theme: settingsData[0].theme || '',
            preferred_units: settingsData[0].preferred_units || '',
            settings_id: settingsData[0].settings_id
          });
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
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');

      if (!token || !user_id) {
        setError('Authentication required. Please log in again.');
        return;
      }

      if (!formData.first_name || !formData.last_name || !formData.email) {
        setError('Please fill in all required fields: First Name, Last Name, and Email');
        return;
      }

      const cleanedData = { ...formData };
      if (!cleanedData.a1_a3) delete cleanedData.a1_a3;
      if (!cleanedData.a2) delete cleanedData.a2;
      if (!cleanedData.sts) delete cleanedData.sts;

      const userResponse = await fetch(`${API_URL}/api/users/${user_id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanedData)
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      }

      const settingsMethod = userSettings.settings_id ? 'PUT' : 'POST';
      const settingsUrl = userSettings.settings_id 
        ? `${API_URL}/api/user-settings/${userSettings.settings_id}/`
        : `${API_URL}/api/user-settings/`;

      const settingsResponse = await fetch(settingsUrl, {
        method: settingsMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user: user_id,
          notifications_enabled: userSettings.notifications_enabled,
          a1_a3_reminder: userSettings.a1_a3_reminder,
          a2_reminder: userSettings.a2_reminder,
          sts_reminder: userSettings.sts_reminder,
          reminder_months_before: userSettings.reminder_months_before,
          theme: userSettings.theme,
          preferred_units: userSettings.preferred_units
        })
      });

      if (!settingsResponse.ok) {
        const errorData = await settingsResponse.json();
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      }

      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.message || 'An error occurred while saving settings.');
    }
  };

  if (isLoading) {
    return <Loading message="Loading user data..." />;
  }

  const SidebarToggleButton = ({ position, onClick }) => (
    <button
      onClick={onClick}
      className={position}
      aria-label="Toggle sidebar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );

  return (
    <div className="flex h-screen relative">
      <SidebarToggleButton 
        position="lg:hidden fixed top-2 left-2 z-20 bg-gray-800 text-white p-2 rounded-md"
        onClick={toggleSidebar}
      />
      
      <SidebarToggleButton 
        position={`hidden lg:block fixed top-2 z-30 bg-gray-800 text-white p-2 rounded-md transition-all duration-300 ${
          sidebarOpen ? 'left-2' : 'left-4'
        }`}
        onClick={toggleSidebar}
      />
      
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
            <Button type="submit" className="max-w-md">
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettings;