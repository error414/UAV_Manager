import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from './Button';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user data to display the name
    const fetchUserData = async () => {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      
      if (!token || !user_id) return;
      
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/${user_id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
          setUserName(fullName || userData.email);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    navigate('/login');
  };

  return (
    <aside
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transform transition-transform duration-300 ease-in-out fixed lg:static lg:w-64 w-64 bg-gray-800 text-white h-full z-10 flex flex-col`}
    >
      <div className="p-4 text-xl font-bold border-b border-gray-700 flex justify-between items-center">
        <span>UAV Manager</span>
        <button onClick={toggleSidebar} className="lg:hidden text-white" aria-label="Close sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link to="/flightlog" className="block hover:bg-gray-700 px-2 py-1 rounded" onClick={toggleSidebar}>
          Flight Log
        </Link>
        <Link to="/aircraft-list" className="block hover:bg-gray-700 px-2 py-1 rounded" onClick={toggleSidebar}>
          Aircraft List
        </Link>
        <Link to="/user-settings" className="block hover:bg-gray-700 px-2 py-1 rounded" onClick={toggleSidebar}>
          User Settings
        </Link>
      </nav>
      
      {/* User info and logout at the bottom */}
      <div className="p-4 border-t border-gray-700">
        {userName && (
          <div className="text-center mb-3 font-semibold text-gray-300">
            {userName}
          </div>
        )}
        <Button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700"
        >
          Log Out
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;