import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button, Loading } from '../components';
import { validateForm, useFieldValidation, processBackendErrors } from '../utils';

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
  const [validationErrors, setValidationErrors] = useState({});
  
  useEffect(() => {
    // Redirect if already authenticated
    if (localStorage.getItem('access_token')) {
      navigate('/flightlog', { replace: true });
    }
  }, [navigate]);

  const handleFieldValidation = useFieldValidation(validationErrors, setValidationErrors, formData);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Use centralized validation
    handleFieldValidation(name, value);
    
    // Special handling for password confirmation
    if (name === 'password' && formData.re_password) {
      handleFieldValidation('re_password', formData.re_password);
    }
    if (name === 're_password' && value) {
      handleFieldValidation('re_password', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    setIsLoading(true);

    // Use centralized form validation
    const fieldsToValidate = ['email', 'password', 're_password'];
    const errors = validateForm(formData, fieldsToValidate);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix the validation errors before submitting');
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
        // Store user_id if returned by API
        if (registerData.user_id) {
          localStorage.setItem('user_id', registerData.user_id);
        }

        // Store access token if returned, otherwise login
        if (registerData.access) {
          localStorage.setItem('access_token', registerData.access);
        } else {
          // Login after registration if access token not returned
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
        // Process backend validation errors
        const backendErrors = processBackendErrors(registerData);
        
        // Check if it's the specific "user already exists" error
        if (backendErrors.email === 'An account with this email address already exists') {
          setError('An account with this email address already exists');
        } else if (Object.keys(backendErrors).length > 0) {
          setValidationErrors(backendErrors);
          setError('Please fix the validation errors');
        } else {
          setError('Registration failed. Please try again.');
        }
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
        <FormInput
          label="E-Mail"
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          required
          labelClassName="text-white"
          className={validationErrors.email ? 'border-red-500' : ''}
          autoComplete="email"
        />
        {validationErrors.email && (
          <p className="mt-1 mb-4 text-sm text-red-400">{validationErrors.email}</p>
        )}

        <FormInput
          label="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
          labelClassName="text-white"
          className={validationErrors.password ? 'border-red-500' : ''}
          autoComplete="new-password"
        />
        {validationErrors.password && (
          <p className="mt-1 mb-4 text-sm text-red-400">{validationErrors.password}</p>
        )}

        <FormInput
          label="Repeat Password"
          type="password"
          name="re_password"
          id="re_password"
          value={formData.re_password}
          onChange={handleChange}
          required
          className={`mb-6 ${validationErrors.re_password ? 'border-red-500' : ''}`}
          labelClassName="text-white"
          autoComplete="new-password"
        />
        {validationErrors.re_password && (
          <p className="mt-1 mb-4 text-sm text-red-400">{validationErrors.re_password}</p>
        )}

        <Button type="submit" variant="primary" fullWidth>Register</Button>
      </form>
    </AuthLayout>
  );
};

export default Register;
