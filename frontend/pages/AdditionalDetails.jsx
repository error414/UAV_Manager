import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button } from '../components/ui';

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

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');

    // Wenn nicht eingeloggt, zur Login-Seite weiterleiten
    if (!token || !user_id) {
      navigate('/login');
      return;
    }

    // Daten des aktuellen Benutzers abrufen und Formularfelder vorbelegen
    fetch(`http://127.0.0.1:8000/api/users/${user_id}/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          // If token expired or invalid, redirect to login
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            navigate('/login');
            throw new Error('Token expired. Please login again.');
          }
          throw new Error('Failed to fetch user data');
        }
        return response.json();
      })
      .then(data => {
        // Vorbelegung der Felder, falls vorhanden
        setDetails({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          street: data.street || '',
          zip: data.zip || '',
          city: data.city || '',
          country: data.country || '',
        });
      })
      .catch(err => {
        console.error("Error fetching user details", err);
      });
  }, [navigate]);

  const handleChange = (e) => {
    setDetails({
      ...details,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');

    if (!user_id || !token) {
      navigate('/login');
      return;
    }

    try {
      // PATCH-Request zum Aktualisieren der Benutzerdaten
      const response = await fetch(`http://127.0.0.1:8000/api/users/${user_id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(details),
      });

      if (!response.ok) {
        // Handle token expiration during form submission
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          navigate('/login');
          return;
        }
        
        const errorData = await response.json();
        setError(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        return;
      }

      const data = await response.json();
      console.log('Update response:', data);
      setSuccess('Details updated successfully!');
      navigate('/flightlog');
    } catch (err) {
      setError('An error occurred. Please try again later.');
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
        />

        <FormInput
          label="Last Name"
          type="text"
          name="last_name"
          id="last_name"
          value={details.last_name}
          onChange={handleChange}
          required
        />

        <FormInput
          label="Phone"
          type="text"
          name="phone"
          id="phone"
          value={details.phone}
          onChange={handleChange}
        />

        <FormInput
          label="Street"
          type="text"
          name="street"
          id="street"
          value={details.street}
          onChange={handleChange}
        />

        <FormInput
          label="Zip"
          type="text"
          name="zip"
          id="zip"
          value={details.zip}
          onChange={handleChange}
        />

        <FormInput
          label="City"
          type="text"
          name="city"
          id="city"
          value={details.city}
          onChange={handleChange}
        />

        <FormInput
          label="Country"
          type="text"
          name="country"
          id="country"
          value={details.country}
          onChange={handleChange}
          className="mb-6"
        />

        <Button type="submit">Save Details</Button>
      </form>
    </AuthLayout>
  );
};

export default AdditionalDetails;
