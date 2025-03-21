import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button } from '../components';
import { apiService } from '../services/api'; // Import the API service

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    re_password: '',
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);

    if (formData.password !== formData.re_password) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Use apiService.register instead of direct fetch
      const registerData = await apiService.register(formData);
      
      // Check if registration was successful
      if (registerData && !registerData.error) {
        setSuccess('Registration successful! Logging you in...');
        
        // After registration, attempt to log in
        try {
          const loginData = await apiService.login(formData.email, formData.password);
          
          if (loginData && loginData.access) {
            localStorage.setItem('access_token', loginData.access);
            
            // Get user data
            const userData = await apiService.getUser(loginData.access);
            if (userData && userData.user_id) {
              localStorage.setItem('user_id', userData.user_id);
              
              setSuccess('Registration successful! Redirecting to complete your profile...');
              
              // Navigate to AdditionalDetails
              navigate('/AdditionalDetails');
            } else {
              throw new Error('Failed to get user data');
            }
          } else {
            throw new Error(loginData?.detail || 'Login failed');
          }
        } catch (loginErr) {
          console.error("Login error after registration:", loginErr);
          setSuccess('Registration successful! Please log in with your new account.');
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        }
      } else {
        // Handle registration errors
        if (registerData && typeof registerData === 'object') {
          const errorMessage = Object.entries(registerData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ');
          setError(errorMessage);
        } else {
          throw new Error('Registration failed with an unknown error');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
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
          disabled={isLoading}
        />

        <FormInput
          label="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={isLoading}
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
          disabled={isLoading}
        />

        <Button 
          type="submit" 
          disabled={isLoading}
          className={isLoading ? "opacity-70 cursor-not-allowed" : ""}
        >
          {isLoading ? "Processing..." : "Register"}
        </Button>
        
        <div className="mt-4 text-center">
          <span className="text-gray-300">Already have an account? </span>
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
