import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    re_password: '',
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

    if (formData.password !== formData.re_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Registration request using Djoser's endpoint
      const response = await fetch('http://localhost:8000/auth/users/', {
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
          const loginResponse = await fetch('http://localhost:8000/auth/jwt/create/', {
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
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-sm p-6 bg-gray-700 rounded shadow-md">
        <h2 className="text-3xl font-semibold text-center text-white mb-6">
          Register
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2 bg-green-200 text-green-800 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block mb-1 text-gray-200">
              E-Mail
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label htmlFor="password" className="block mb-1 text-gray-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Repeat Password */}
          <div className="mb-6">
            <label htmlFor="re_password" className="block mb-1 text-gray-200">
              Repeat Password
            </label>
            <input
              type="password"
              name="re_password"
              id="re_password"
              value={formData.re_password}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
