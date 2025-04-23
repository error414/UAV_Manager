import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import reactLogo from '../src/assets/react.svg';
import { useAuth, useApi } from '../utils/authUtils';

function DevToolsPage() {
  const [count, setCount] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleteUAVMessage, setDeleteUAVMessage] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;
  
  const { getAuthHeaders, checkAuthAndGetUser } = useAuth();
  const { fetchData } = useApi(API_URL, setError => {
    setDeleteMessage({ type: 'error', text: setError });
  });

  const deleteAllFlightLogs = async () => {
    if (!window.confirm('⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL flight logs? This cannot be undone!')) {
      return;
    }
    
    const auth = checkAuthAndGetUser();
    if (!auth) {
      setDeleteMessage({ type: 'error', text: 'You must be logged in to delete logs' });
      return;
    }
    
    try {
      let allLogs = [];
      let url = `/api/flightlogs/`;
      let nextUrl = url;
      
      while (nextUrl) {
        const result = await fetchData(nextUrl);
        if (result.error) throw new Error('Failed to fetch logs');
        
        const data = result.data;
        if (Array.isArray(data)) {
          allLogs = allLogs.concat(data);
          break;
        } else if (data.results) {
          allLogs = allLogs.concat(data.results);
          nextUrl = data.next ? data.next.replace(API_URL, '') : null;
        } else {
          break;
        }
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const log of allLogs) {
        const deleteResult = await fetchData(`/api/flightlogs/${log.flightlog_id}/`, {}, 'DELETE');
        if (!deleteResult.error) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      setDeleteMessage({
        type: 'success',
        text: `Deleted ${successCount} logs. Failed to delete ${errorCount} logs.`
      });
    } catch (err) {
      setDeleteMessage({ type: 'error', text: 'Error deleting logs: ' + err.message });
    }
  };

  const deleteAllUAVs = async () => {
    if (!window.confirm('⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL UAVs? This cannot be undone!')) {
      return;
    }
    
    const auth = checkAuthAndGetUser();
    if (!auth) {
      setDeleteUAVMessage({ type: 'error', text: 'You must be logged in to delete UAVs' });
      return;
    }
    
    try {
      let allUAVs = [];
      let url = `/api/uavs/`;
      let nextUrl = url;
      
      while (nextUrl) {
        const result = await fetchData(nextUrl);
        if (result.error) throw new Error('Failed to fetch UAVs');
        
        const data = result.data;
        if (Array.isArray(data)) {
          allUAVs = allUAVs.concat(data);
          break;
        } else if (data.results) {
          allUAVs = allUAVs.concat(data.results);
          nextUrl = data.next ? data.next.replace(API_URL, '') : null;
        } else {
          break;
        }
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const uav of allUAVs) {
        const deleteResult = await fetchData(`/api/uavs/${uav.uav_id}/`, {}, 'DELETE');
        if (!deleteResult.error) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      setDeleteUAVMessage({
        type: 'success',
        text: `Deleted ${successCount} UAVs. Failed to delete ${errorCount} UAVs.`
      });
    } catch (err) {
      setDeleteUAVMessage({ type: 'error', text: 'Error deleting UAVs: ' + err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="flex gap-4 mb-8">
        <a href="https://vite.dev" target="_blank" rel="noreferrer"></a>
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
        <Link 
          to="/register"
          className="block mx-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Register
        </Link>
        <Link 
          to="/login"
          className="block mx-auto bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Login
        </Link>
        <Link 
          to="/flightlog"
          className="block mx-auto bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Flightlog
        </Link>
        <Link 
          to="/aircraft-list"
          className="block mx-auto bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          Aircraft List
        </Link>
        <Link 
          to="/new-aircraft"
          className="block mx-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-10 rounded mt-4"
        >
          New Aircraft
        </Link>
        <p className="mt-4 text-gray-700">
          Edit <code>src/App.jsx</code> and save to test HMR.
        </p>
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

export default DevToolsPage;
