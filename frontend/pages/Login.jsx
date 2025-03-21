import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button } from '../components';
import { apiService } from '../services/api'; // Import the API service

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

    try {
      // Use the API service for login instead of direct fetch
      const data = await apiService.login(formData.email, formData.password);
      
      if (data.access) {
        // Save token to localStorage
        localStorage.setItem('access_token', data.access);
        
        // Fetch the user ID from the /me endpoint
        const userData = await apiService.getUser(data.access);
        if (userData.user_id) {
          localStorage.setItem('user_id', userData.user_id);
        }
        
        setSuccess('Login successful!');
        navigate('/flightlog');
      } else {
        setError(data.detail || 'No access token received.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <AuthLayout title="Login">
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
        />

        <FormInput
          label="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="mb-6"
        />

        <Button type="submit">Login</Button>
        
        <div className="mt-4 text-center">
          <span className="text-gray-300">Don't have an account? </span>
          <Link to="/register" className="text-blue-400 hover:text-blue-300">
            Register
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;