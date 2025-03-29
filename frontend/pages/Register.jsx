import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button } from '../components';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    re_password: '',
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Get API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.password !== formData.re_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Registration request using Djoser's endpoint
      const response = await fetch(`${API_URL}/auth/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (response.ok) {
        // Save user_id from registration response to localStorage
        if (data.user_id) {
          localStorage.setItem('user_id', data.user_id);
        }

        // Check for token under "access" (if LOGIN_ON_REGISTRATION is enabled)
        if (data.access) {
          localStorage.setItem('access_token', data.access);
        } else {
          // If no token is returned, try logging in
          const loginResponse = await fetch(`${API_URL}/auth/jwt/create/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
          });
          const loginData = await loginResponse.json();
          console.log('Login response:', loginData);
          if (loginResponse.ok && loginData.access) {
            localStorage.setItem('access_token', loginData.access);
          } else {
            setError("Login failed after registration. Please try again.");
            return;
          }
        }
        setSuccess('Registration successful!');
        navigate('/AdditionalDetails');
      } else {
        setError(JSON.stringify(data));
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <AuthLayout title="Register">
      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <form onSubmit={handleSubmit}>
        <FormInput
          label="E-Mail"
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          required
          labelClassName="text-white" // Weißer Text für das Label
        />

        <FormInput
          label="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
          labelClassName="text-white" // Weißer Text für das Label
        />

        <FormInput
          label="Repeat Password"
          type="password"
          name="re_password"
          id="re_password"
          value={formData.re_password}
          onChange={handleChange}
          required
          className="mb-6"
          labelClassName="text-white" // Weißer Text für das Label
        />

        <Button type="submit">Register</Button>
      </form>
    </AuthLayout>
  );
};

export default Register;
