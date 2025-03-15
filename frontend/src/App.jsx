import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from '../pages/Register.jsx';
import Login from '../pages/Login.jsx';
import AdditionalDetails from '../pages/AdditionalDetails.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Flightlog from '../pages/Flightlog.jsx'; // Added Flightlog import
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

function Home() {
  const [count, setCount] = useState(0);

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
      <h1 className="text-4xl font-bold text-center mb-4">Vite + React</h1>
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
        <p className="mt-4 text-gray-700">
          Edit <code>src/App.jsx</code> and save to test HMR.
        </p>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
