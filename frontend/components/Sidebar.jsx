import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [userName, setUserName] = useState('');
  const [activePath, setActivePath] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL;

  // Speichern und Wiederherstellen des aktiven Pfads
  useEffect(() => {
    const currentPath = location.pathname;
    localStorage.setItem('activePath', currentPath);
    setActivePath(currentPath);
  }, [location.pathname]);

  // Beim ersten Laden den gespeicherten Pfad wiederherstellen
  useEffect(() => {
    const savedPath = localStorage.getItem('activePath');
    if (savedPath) {
      setActivePath(savedPath);
    } else {
      setActivePath(location.pathname);
    }
  }, []);

  useEffect(() => {
    // Fetch user data to display the name
    const fetchUserData = async () => {
      const token = localStorage.getItem('access_token');
      const user_id = localStorage.getItem('user_id');
      
      if (!token || !user_id) return;
      
      try {
        const response = await fetch(`${API_URL}/api/users/${user_id}/`, {
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
  }, [API_URL]);
  
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    navigate('/login');
  };

  // Menu items with appropriate icons
  const menuItems = [
    { path: '/flightlog', icon: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z', label: 'Flight Log' },
    { path: '/AircraftList', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Aircraft List' },
    { path: '/UserSettings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', label: 'User Settings' }
  ];

  return (
    <aside
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transform transition-transform duration-300 ease-in-out fixed w-64 bg-gray-900 text-gray-300 h-full z-10 flex flex-col overflow-y-auto`}
    >
      <div className="p-3 text-lg font-bold border-b border-gray-800 flex items-center">
        <span className="ml-10">UAV Manager</span>
      </div>     
      <nav className="flex-1 py-1">
        {menuItems.map((item) => {
          const isActive = 
            activePath === item.path || 
            activePath === `${item.path}/` ||
            (item.path !== '/' && activePath.startsWith(item.path)) ||
            location.pathname === item.path || 
            location.pathname === `${item.path}/` ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex items-center px-3 py-2 text-sm hover:bg-gray-800 ${
                isActive ? 'bg-blue-600 text-white' : ''
              }`} 
              onClick={() => {
                setActivePath(item.path);
                localStorage.setItem('activePath', item.path);
                toggleSidebar();
              }}
            >
              {item.icon && (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {userName && (
        <div className="p-3 border-t border-gray-800">
          <div className="text-center mb-2 text-sm text-gray-400">
            {userName}
          </div>
          <Button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 w-full"
          >
            Log Out
          </Button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;