import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from '../pages/Register.jsx';
import Login from '../pages/Login.jsx';
import AdditionalDetails from '../pages/AdditionalDetails.jsx';
import Flightlog from '../pages/Flightlog.jsx';
import AircraftList from '../pages/AircraftList.jsx'; 
import NewAircraftForm from '../pages/NewAircraft.jsx';
import UserSettings from '../pages/UserSettings.jsx';
import NewAircraftPage from '../pages/NewAircraft.jsx';
import AircraftSettings from '../pages/AircraftSettings.jsx';
import FlightDetails from '../pages/FlightDetails.jsx';
import AdminPage from '../pages/AdminPage';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

function Home() {
  const [count, setCount] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleteUAVMessage, setDeleteUAVMessage] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const deleteAllFlightLogs = async () => {
    if (!window.confirm('⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL flight logs? This cannot be undone!')) {
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      setDeleteMessage({ type: 'error', text: 'You must be logged in to delete logs' });
      return;
    }

    try {
      // Alle Seiten abfragen
      let allLogs = [];
      let url = `${API_URL}/api/flightlogs/`;
      while (url) {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          allLogs = allLogs.concat(data);
          break;
        } else if (data.results) {
          allLogs = allLogs.concat(data.results);
          url = data.next;
        } else {
          break;
        }
      }

      let successCount = 0;
      let errorCount = 0;

      for (const log of allLogs) {
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

  const deleteAllUAVs = async () => {
    if (!window.confirm('⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL UAVs? This cannot be undone!')) {
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      setDeleteUAVMessage({ type: 'error', text: 'You must be logged in to delete UAVs' });
      return;
    }

    try {
      // Alle Seiten abfragen
      let allUAVs = [];
      let url = `${API_URL}/api/uavs/`;
      while (url) {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch UAVs');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          allUAVs = allUAVs.concat(data);
          break;
        } else if (data.results) {
          allUAVs = allUAVs.concat(data.results);
          url = data.next;
        } else {
          break;
        }
      }

      let successCount = 0;
      let errorCount = 0;

      for (const uav of allUAVs) {
        try {
          const deleteResponse = await fetch(`${API_URL}/api/uavs/${uav.uav_id}/`, {
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

      setDeleteUAVMessage({
        type: 'success',
        text: `Deleted ${successCount} UAVs. Failed to delete ${errorCount} UAVs.`
      });

    } catch (err) {
      console.error('Error deleting UAVs:', err);
      setDeleteUAVMessage({ type: 'error', text: 'Error deleting UAVs: ' + err.message });
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
      <h1 className="text-4xl font-bold text-center mb-4">⚠️ UAV Manager Dev Tools ⚠️</h1>
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
          <button
            onClick={deleteAllUAVs}
            className="block mx-auto bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-10 rounded mt-2"
          >
            Delete ALL UAVs
          </button>
          {deleteMessage && (
            <div className={`mt-2 p-2 rounded ${deleteMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {deleteMessage.text}
            </div>
          )}
          {deleteUAVMessage && (
            <div className={`mt-2 p-2 rounded ${deleteUAVMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {deleteUAVMessage.text}
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
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/additionalDetails" element={<AdditionalDetails />} />
        <Route path="/flightlog" element={<Flightlog />} />
        <Route path="/AircraftList" element={<AircraftList />} />
        <Route path="/new-aircraft" element={<NewAircraftForm />} />
        <Route path="/UserSettings" element={<UserSettings />} />
        <Route path="/edit-aircraft/:uavId" element={<NewAircraftPage />} />
        <Route path="/aircraft-settings/:uavId" element={<AircraftSettings />} />
        <Route path="/flightdetails/:flightId" element={<FlightDetails />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;