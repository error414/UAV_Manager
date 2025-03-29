import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Sidebar, FormInput } from '../components';
import { CountryDropdown } from 'react-country-region-selector';

const UserSettings = () => {
  const navigate = useNavigate();
  // Initialize sidebarOpen based on screen size - match existing pages
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  
  // Add resize handler to match existing behavior
  useEffect(() => {
    const handleResize = () => {
      // For desktop: automatically show sidebar
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } 
      // For mobile: automatically hide sidebar
      else {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Get API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL;
  
  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    } else {
      fetchUserData();
    }
  }, [navigate]);

  // State for form data
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

  // State for alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Toggle sidebar function - match existing behavior
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Fetch user data from API
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      
      if (!token || !user_id) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/api/users/${user_id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      }

      const userData = await response.json();
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        company: userData.company || '',
        drone_ops_nb: userData.drone_ops_nb || '',
        pilot_license_nb: userData.pilot_license_nb || '',
        phone: userData.phone || '',
        street: userData.street || '',
        zip: userData.zip || '',
        city: userData.city || '',
        country: userData.country || '',
        a1_a3: userData.a1_a3 ? formatDateForInput(userData.a1_a3) : '',
        a2: userData.a2 ? formatDateForInput(userData.a2) : '',
        sts: userData.sts ? formatDateForInput(userData.sts) : ''
      });
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data. Please try again.');
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle country selection
  const selectCountry = (val) => {
    setFormData({
      ...formData,
      country: val
    });
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
      if (!formData.first_name || !formData.last_name || !formData.email) {
        setError('Please fill in all required fields: First Name, Last Name, and Email');
        return;
      }

      // Create a cleaned data object that omits empty date fields
      const cleanedData = {
        ...formData
      };

      // Remove empty date fields to avoid validation errors
      if (!cleanedData.a1_a3) delete cleanedData.a1_a3;
      if (!cleanedData.a2) delete cleanedData.a2;
      if (!cleanedData.sts) delete cleanedData.sts;

      const response = await fetch(`${API_URL}/api/users/${user_id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      }

      await response.json();
      setSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Error updating user settings:', err);
      setError(err.message || 'An error occurred while saving settings.');
    }
  };

  return (
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Toggle - match existing behavior */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-2 left-2 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar for mobile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      {/* Desktop toggle - match existing behavior */}
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

      {/* Main Content - match layout with existing pages */}
      <div 
        className={`flex-1 flex flex-col w-full p-4 pt-2 transition-all duration-300 overflow-auto ${
          sidebarOpen ? 'lg:ml-64' : ''
        }`}
      >
        {/* Title with consistent styling */}
        <div className="flex items-center h-10 mb-4">
          {/* Empty div for spacing on mobile (same width as toggle button) */}
          <div className="w-10 lg:hidden"></div>
          
          {/* Centered title */}
          <h1 className="text-2xl font-semibold text-center flex-1">User Settings</h1>
        </div>
        
        {/* Alerts */}
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        
        {/* Form content */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label className="">First name</label>
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
            
            {/* Last Name */}
            <div>
              <label className="">Last name</label>
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
            
            {/* Company Name */}
            <div>
              <label className="">Company Name</label>
              <FormInput
                type="text"
                name="company"
                id="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Drone Solutions Inc."
                />
            </div>
            
            {/* Email */}
            <div>
              <label className="">E-mail</label>
              <FormInput
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
                required
                disabled // Email should not be changed directly through this form
              />
            </div>
            
            {/* Phone Number */}
            <div>
              <label className="">Phone number</label>
              <FormInput
                type="text"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8901"
                />
            </div>
            
            {/* Street Address */}
            <div>
              <label className="">Street Address</label>
              <FormInput
                type="text"
                name="street"
                id="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Drone Street"
                />
            </div>
            
            {/* Zip and City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="">Zip Code</label>
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
                <label className="">City</label>
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
            
            {/* Country */}
            <div>
              <label className="">Country</label>
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
          
          {/* Right Column */}
          <div className="space-y-4">
            {/* Drone Operator Number */}
            <div>
              <label className="">Drone Operator Number</label>
              <FormInput
                type="text"
                name="drone_ops_nb"
                id="drone_ops_nb"
                value={formData.drone_ops_nb}
                onChange={handleChange}
                placeholder="CHEdkI9245ddjG325"
                />
            </div>
            
            {/* Pilot License Number */}
            <div>
              <label className="">Pilot License number</label>
              <FormInput
                type="text"
                name="pilot_license_nb"
                id="pilot_license_nb"
                value={formData.pilot_license_nb}
                onChange={handleChange}
                placeholder="FCL.CH.345789"
                />
            </div>
            
            {/* License Category */}
            <h3 className="text-lg font-medium pt-2 text-black">License Category</h3>
            
            {/* A1/A3 License */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <div className="col-span-1">
                <label className="">A1 / A3</label>
              </div>
              <div className="col-span-1">
                <label className="">Valid until:</label>
              </div>
              <div className="col-span-2">
                <FormInput
                  type="date"
                  name="a1_a3"
                  id="a1_a3"
                  value={formData.a1_a3}
                  onChange={handleChange}
                  />
              </div>
            </div>
            
            {/* A2 License */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <div className="col-span-1">
                <label className="">A2</label>
              </div>
              <div className="col-span-1">
                <label className="">Valid until:</label>
              </div>
              <div className="col-span-2">
                <FormInput
                  type="date"
                  name="a2"
                  id="a2"
                  value={formData.a2}
                  onChange={handleChange}
                  />
              </div>
            </div>
            
            {/* STS License */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <div className="col-span-1">
                <label className="">STS</label>
              </div>
              <div className="col-span-1">
                <label className="">Valid until:</label>
              </div>
              <div className="col-span-2">
                <FormInput
                  type="date"
                  name="sts"
                  id="sts"
                  value={formData.sts}
                  onChange={handleChange}
                  />
              </div>
            </div>
          </div>
          
          {/* Submit Button - Full Width */}
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