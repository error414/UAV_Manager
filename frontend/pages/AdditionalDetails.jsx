import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

    if (!user_id) {
      setError("User ID not found.");
      return;
    }

    try {
      // PATCH request to the custom endpoint for updating the user
      const response = await fetch(`http://127.0.0.1:8000/api/users/${user_id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(details),
      });
      const data = await response.json();
      console.log('Update response:', data);

      if (response.ok) {
        setSuccess('Details updated successfully!');
        navigate('/dashboard');
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
          Additional Details
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
          {/* First Name */}
          <div className="mb-4">
            <label htmlFor="first_name" className="block mb-1 text-gray-200">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={details.first_name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Last Name */}
          <div className="mb-4">
            <label htmlFor="last_name" className="block mb-1 text-gray-200">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={details.last_name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label htmlFor="phone" className="block mb-1 text-gray-200">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={details.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Street */}
          <div className="mb-4">
            <label htmlFor="street" className="block mb-1 text-gray-200">
              Street
            </label>
            <input
              type="text"
              name="street"
              id="street"
              value={details.street}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Zip */}
          <div className="mb-4">
            <label htmlFor="zip" className="block mb-1 text-gray-200">
              Zip
            </label>
            <input
              type="text"
              name="zip"
              id="zip"
              value={details.zip}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* City */}
          <div className="mb-4">
            <label htmlFor="city" className="block mb-1 text-gray-200">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              value={details.city}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Country */}
          <div className="mb-6">
            <label htmlFor="country" className="block mb-1 text-gray-200">
              Country
            </label>
            <input
              type="text"
              name="country"
              id="country"
              value={details.country}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Details
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdditionalDetails;
