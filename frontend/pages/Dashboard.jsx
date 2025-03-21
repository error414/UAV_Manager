import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');

    if (!token || !user_id) {
      navigate('/');
      return;
    }

    // Fetch user details from the custom endpoint
    fetch(`http://127.0.0.1:8000/api/users/${user_id}/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        setUser(data);
      })
      .catch(err => {
        console.error("Error fetching user details", err);
      });
  }, [navigate]);

  const handleLogoff = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    navigate('/');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {user ? (
        <div className="space-y-2">
          <p><strong>User ID:</strong> {user.user_id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>First Name:</strong> {user.first_name}</p>
          <p><strong>Last Name:</strong> {user.last_name}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>Street:</strong> {user.street}</p>
          <p><strong>Zip:</strong> {user.zip}</p>
          <p><strong>City:</strong> {user.city}</p>
          <p><strong>Country:</strong> {user.country}</p>
          <p><strong>Company:</strong> {user.company}</p>
          <p><strong>Drone Ops Nb:</strong> {user.drone_ops_nb}</p>
          <p><strong>Pilot License Nb:</strong> {user.pilot_license_nb}</p>
          <p><strong>A1/A3:</strong> {user.a1_a3 ? user.a1_a3 : "N/A"}</p>
          <p><strong>A2:</strong> {user.a2 ? user.a2 : "N/A"}</p>
          <p><strong>STS:</strong> {user.sts ? user.sts : "N/A"}</p>
          <p><strong>Created At:</strong> {user.created_at}</p>
          <p><strong>Updated At:</strong> {user.updated_at}</p>
        </div>
      ) : (
        <p>Loading user details...</p>
      )}
      <button
        onClick={handleLogoff}
        className="mt-4 py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Log Off
      </button>
    </div>
  );
};

export default Dashboard;
