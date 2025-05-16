import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button, Loading } from '../components';
import { CountryDropdown } from 'react-country-region-selector';
import { useAuth, useApi } from '../hooks';

const AdditionalDetails = () => {
  const API_URL = import.meta.env.VITE_API_URL;
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
  const [isLoading, setIsLoading] = useState(true);
  
  const { checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError);
  
  useEffect(() => {
    const auth = checkAuthAndGetUser();
    if (!auth) return;

    setIsLoading(true);
    
    fetchData(`/api/users/${auth.user_id}/`)
      .then(result => {
        if (!result.error) {
          setDetails({
            first_name: result.data.first_name || '',
            last_name: result.data.last_name || '',
            phone: result.data.phone || '',
            street: result.data.street || '',
            zip: result.data.zip || '',
            city: result.data.city || '',
            country: result.data.country || '',
          });
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [checkAuthAndGetUser, fetchData]);

  const handleChange = (e) => {
    setDetails({
      ...details,
      [e.target.name]: e.target.value,
    });
  };

  const handleNumericInput = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/\D/g, '');
    
    setDetails({
      ...details,
      [name]: numericValue,
    });
  };

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

    const auth = checkAuthAndGetUser();
    if (!auth) return;

    const result = await fetchData(`/api/users/${auth.user_id}/`, {}, 'PATCH', details);
    
    if (!result.error) {
      setSuccess('Details updated successfully!');
      navigate('/flightlog');
    }
  };

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

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
          labelClassName="text-white"
        />

        <FormInput
          label="Last Name"
          type="text"
          name="last_name"
          id="last_name"
          value={details.last_name}
          onChange={handleChange}
          required
          labelClassName="text-white"
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
          labelClassName="text-white"
        />

        <FormInput
          label="Street"
          type="text"
          name="street"
          id="street"
          value={details.street}
          onChange={handleChange}
          labelClassName="text-white"
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
          labelClassName="text-white"
        />

        <FormInput
          label="City"
          type="text"
          name="city"
          id="city"
          value={details.city}
          onChange={handleChange}
          labelClassName="text-white"
        />

        <div className="mb-4">
          <p className="text-white mb-2">Country</p>
          <CountryDropdown
            id="country"
            name="country"
            value={details.country}
            onChange={selectCountry}
            defaultOptionLabel=" "
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        <Button type="submit" variant="primary" fullWidth>Save Details</Button>
      </form>
    </AuthLayout>
  );
};

export default AdditionalDetails;