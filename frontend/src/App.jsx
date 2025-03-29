import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from '../pages/Register.jsx';
import Login from '../pages/Login.jsx';
import AdditionalDetails from '../pages/AdditionalDetails.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Flightlog from '../pages/Flightlog.jsx';
import AircraftList from '../pages/AircraftList.jsx'; 
import NewAircraftForm from '../pages/NewAircraft.jsx'; // Import the new component
import UserSettings from '../pages/UserSettings.jsx'; // Import the new component
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

function Home() {
  const [count, setCount] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const deleteAllFlightLogs = async () => {
    if (!window.confirm('⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL flight logs? This cannot be undone!')) {
      return;
    }
    
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
      setDeleteMessage({ type: 'error', text: 'You must be logged in to delete logs' });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/flightlogs/?user=${user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const logs = await response.json();
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const log of logs) {
        try {
          const deleteResponse = await fetch(`${API_URL}/api/flightlogs/${log.flightlog_id}/`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (deleteResponse.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }
      
      setDeleteMessage({ 
        type: 'success', 
        text: `Deleted ${successCount} logs. Failed to delete ${errorCount} logs.` 
      });
      
    } catch (err) {
      console.error('Error deleting logs:', err);
      setDeleteMessage({ type: 'error', text: 'Error deleting logs: ' + err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="flex gap-4 mb-8">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="h-16 w-16" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="h-16 w-16" alt="React logo" />
        </a>
      </div>
      <h1 className="text-4xl font-bold text-center mb-4">UAV Manager</h1>
      <div className="bg-white shadow rounded p-6 mb-4">
        <button 
          onClick={() => setCount((prevCount) => prevCount + 1)}
          className="block mx-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-10 rounded"
        >
          count is {count}
        </button>
        {/* Registration button */}
        <Link 
          to="/register"
          className="block mx-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Register
        </Link>
        {/* Login button */}
        <Link 
          to="/login"
          className="block mx-auto bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Login
        </Link>
        {/* Dashboard button */}
        <Link 
          to="/dashboard"
          className="block mx-auto bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Dashboard
        </Link>
        {/* Flightlog button */}
        <Link 
          to="/flightlog"
          className="block mx-auto bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Flightlog
        </Link>
        {/* Aircraft List button */}
        <Link 
          to="/aircraft-list"
          className="block mx-auto bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Aircraft List
        </Link>
        {/* New Aircraft button */}
        <Link 
          to="/new-aircraft"
          className="block mx-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          New Aircraft
        </Link>
        <p className="mt-4 text-gray-700">
          Edit <code>src/App.jsx</code> and save to test HMR.
        </p>
        {/* Development Button - Delete All Flight Logs */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-red-500 font-bold mb-2">⚠️ DEVELOPMENT TOOLS ⚠️</h2>
          <button 
            onClick={deleteAllFlightLogs}
            className="block mx-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-10 rounded mt-2"
          >
            Delete ALL Flight Logs
          </button>
          
          {deleteMessage && (
            <div className={`mt-2 p-2 rounded ${deleteMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {deleteMessage.text}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Click on the Vite and React logos to learn more.
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home Route */}
        <Route path="/" element={<Home />} />
        {/* Registration Route */}
        <Route path="/register" element={<Register />} />
        {/* Login Route */}
        <Route path="/login" element={<Login />} />
        {/* Additional Details Route */}
        <Route path="/additionalDetails" element={<AdditionalDetails />} />
        {/* Dashboard Route */}
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Flightlog Route */}
        <Route path="/flightlog" element={<Flightlog />} />
        {/* Aircraft List Route */}
        <Route path="/aircraft-list" element={<AircraftList />} />
        {/* Add a route for the capitalized version too in case it's being used elsewhere */}
        <Route path="/AircraftList" element={<AircraftList />} />
        {/* New Aircraft Form Route */}
        <Route path="/new-aircraft" element={<NewAircraftForm />} />
        <Route path="/UserSettings" element={<UserSettings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;