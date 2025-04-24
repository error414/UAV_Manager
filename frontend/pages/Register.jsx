import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button, Loading } from '../components';
import { useAuth, useApi } from '../utils/authUtils';

const Register = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    re_password: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      navigate('/flightlog', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (formData.password !== formData.re_password) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const registerResponse = await fetch(`${API_URL}/auth/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const registerData = await registerResponse.json();

      if (registerResponse.ok) {
        if (registerData.user_id) {
          localStorage.setItem('user_id', registerData.user_id);
        }

        if (registerData.access) {
          localStorage.setItem('access_token', registerData.access);
        } else {
          const loginResponse = await fetch(`${API_URL}/auth/jwt/create/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: formData.email, 
              password: formData.password 
            }),
          });
          
          const loginData = await loginResponse.json();
          
          if (!loginResponse.ok || !loginData.access) {
            throw new Error("Login failed after registration");
          }
          
          localStorage.setItem('access_token', loginData.access);
        }
        
        setSuccess('Registration successful!');
        navigate('/AdditionalDetails');
      } else {
        setError(typeof registerData === 'object' ? JSON.stringify(registerData) : registerData);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading message="Registering..." />;
  }

  return (
    <AuthLayout title="Register">
      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <form onSubmit={handleSubmit}>
        {['email', 'password', 're_password'].map((field) => (
          <FormInput
            key={field}
            label={field === 'email' ? 'E-Mail' : 
                  field === 'password' ? 'Password' : 'Repeat Password'}
            type={field === 'email' ? 'email' : 'password'}
            name={field}
            id={field}
            value={formData[field]}
            onChange={handleChange}
            required
            className={field === 're_password' ? 'mb-6' : ''}
            labelClassName="text-white"
          />
        ))}

        <Button type="submit" variant="primary" fullWidth>Register</Button>
      </form>
    </AuthLayout>
  );
};

export default Register;
