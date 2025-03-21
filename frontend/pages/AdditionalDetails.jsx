import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button } from '../components';
import { CountryDropdown } from 'react-country-region-selector';
import { apiService } from '../services/api'; // Import the API service

const AdditionalDetails = () => {
  const navigate = useNavigate();
  const [details, setDetails] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    street: '',
    zip: '',
    city: '',
    country: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');

      // If not logged in, redirect to login page
      if (!token || !user_id) {
        navigate('/login');
        return;
      }

      try {
        // Use apiService instead of direct fetch
        const userData = await apiService.updateUser(user_id, {}, token);
        
        // Populate form fields with existing data
        setDetails({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          phone: userData.phone || '',
          street: userData.street || '',
          zip: userData.zip || '',
          city: userData.city || '',
          country: userData.country || '',
        });
      } catch (err) {
        console.error("Error fetching user details", err);
        
        // Handle authentication errors
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          navigate('/login');
        }
      }
    };

    fetchUserDetails();
  }, [navigate]);

  const handleChange = (e) => {
    setDetails({
      ...details,
      [e.target.name]: e.target.value,
    });
  };

  // Handle numeric input fields (phone and zip)
  const handleNumericInput = (e) => {
    const { name, value } = e.target;
    
    // Only allow numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    setDetails({
      ...details,
      [name]: numericValue,
    });
  };

  // Handle country selection
  const selectCountry = (val) => {
    setDetails({
      ...details,
      country: val
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');

    if (!user_id || !token) {
      navigate('/login');
      return;
    }

    try {
      // Use apiService instead of direct fetch
      const data = await apiService.updateUser(user_id, details, token);
      
      setSuccess('Details updated successfully!');
      setTimeout(() => {
        navigate('/flightlog');
      }, 1000);
    } catch (err) {
      console.error('Error updating user details:', err);
      
      // Handle authentication errors
      if (err.message && err.message.includes('401')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        navigate('/login');
        return;
      }
      
      setError('An error occurred while updating your details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Additional Details">
      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <form onSubmit={handleSubmit}>
        <FormInput
          label="First Name"
          type="text"
          name="first_name"
          id="first_name"
          value={details.first_name}
          onChange={handleChange}
          required
          disabled={isLoading}
        />

        <FormInput
          label="Last Name"
          type="text"
          name="last_name"
          id="last_name"
          value={details.last_name}
          onChange={handleChange}
          required
          disabled={isLoading}
        />

        <FormInput
          label="Phone"
          type="tel"
          name="phone"
          id="phone"
          value={details.phone}
          onChange={handleNumericInput}
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={isLoading}
        />

        <FormInput
          label="Street"
          type="text"
          name="street"
          id="street"
          value={details.street}
          onChange={handleChange}
          disabled={isLoading}
        />

        <FormInput
          label="Zip"
          type="text"
          name="zip"
          id="zip"
          value={details.zip}
          onChange={handleNumericInput}
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={isLoading}
        />

        <FormInput
          label="City"
          type="text"
          name="city"
          id="city"
          value={details.city}
          onChange={handleChange}
          disabled={isLoading}
        />

        {/* Country field */}
        <div className="mb-4">
          <p className="text-white mb-2">Country</p>
          <CountryDropdown
            id="country"
            name="country"
            value={details.country}
            onChange={selectCountry}
            defaultOptionLabel=" "
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            disabled={isLoading}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isLoading}
          className={isLoading ? "opacity-70 cursor-not-allowed" : ""}
        >
          {isLoading ? "Saving..." : "Save Details"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default AdditionalDetails;