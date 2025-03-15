import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// UI components
import { Filters, Sidebar, Alert, AddNew } from '../components/ui';
// Mobile card-style Table (card layout for mobile)
import Table from '../components/ui/Table';

const Flightlog = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [availableUAVs, setAvailableUAVs] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Updated filters state with all 12 attributes
  const [filters, setFilters] = useState({
    departure_place: '',
    departure_date: '',
    departure_time: '',
    landing_time: '',
    landing_place: '',
    flight_duration: '',
    takeoffs: '',
    landings: '',
    light_conditions: '',
    ops_conditions: '',
    pilot_type: '',
    uav: ''
  });

  // "Add New" flight state (12 fields)
  const [newFlight, setNewFlight] = useState({
    departure_place: '',
    departure_date: '',
    departure_time: '',
    landing_time: '',
    landing_place: '',
    flight_duration: '',
    takeoffs: '',
    landings: '',
    light_conditions: '',
    ops_conditions: '',
    pilot_type: '',
    uav: ''
  });

  // Fetch flight logs
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) {
      navigate('/login');
      return;
    }
    fetch(`http://127.0.0.1:8000/api/flightlogs/?user=${user_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            navigate('/login');
          }
          throw new Error('Failed to fetch flight logs');
        }
        return res.json();
      })
      .then((data) => setLogs(data))
      .catch((err) => {
        console.error(err);
        setError('Could not load flight logs.');
      });
  }, [navigate]);

  // Fetch available UAVs
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) return;
    fetch(`http://127.0.0.1:8000/api/uavs/?user=${user_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch UAVs');
        return res.json();
      })
      .then((data) => setAvailableUAVs(data))
      .catch((err) => console.error(err));
  }, []);

  // Table columns (note the added UAV column)
  const tableColumns = [
    { header: 'Dept Place', accessor: 'departure_place' },
    {
      header: 'Date',
      accessor: 'departure_time',
      render: (value) => (value ? value.substring(0, 10) : '')
    },
    {
      header: 'Dept Time',
      accessor: 'departure_time',
      render: (value) => (value ? new Date(value).toLocaleTimeString() : '')
    },
    {
      header: 'Landing Time',
      accessor: 'landing_time',
      render: (value) => (value ? new Date(value).toLocaleTimeString() : '')
    },
    { header: 'Landing Place', accessor: 'landing_place' },
    { header: 'Duration', accessor: 'flight_duration' },
    { header: 'Takeoffs', accessor: 'takeoffs' },
    { header: 'Landings', accessor: 'landings' },
    { header: 'Light Conditions', accessor: 'light_conditions' },
    { header: 'Ops Conditions', accessor: 'ops_conditions' },
    { header: 'Pilot Type', accessor: 'pilot_type' },
    {
      header: 'UAV',
      accessor: 'uav',
      render: (value) => (value ? value.drone_name : '')
    }
  ];

  // "Add New" fields (all 12)
  const addNewFields = [
    {
      label: 'Departure Place',
      name: 'departure_place',
      type: 'text',
      placeholder: 'Departure place',
      required: true
    },
    {
      label: 'Departure Date',
      name: 'departure_date',
      type: 'date',
      required: true
    },
    {
      label: 'Departure Time',
      name: 'departure_time',
      type: 'time',
      required: true
    },
    {
      label: 'Landing Time',
      name: 'landing_time',
      type: 'time',
      required: true
    },
    {
      label: 'Landing Place',
      name: 'landing_place',
      type: 'text',
      placeholder: 'Landing place'
    },
    {
      label: 'Flight Duration',
      name: 'flight_duration',
      type: 'number',
      placeholder: 'Flight time (s)'
    },
    {
      label: 'Takeoffs',
      name: 'takeoffs',
      type: 'number',
      placeholder: 'Number of T/O'
    },
    {
      label: 'Landings',
      name: 'landings',
      type: 'number',
      placeholder: 'Number of LDG'
    },
    {
      label: 'Light Conditions',
      name: 'light_conditions',
      type: 'text',
      placeholder: 'Day/Night'
    },
    {
      label: 'Ops Conditions',
      name: 'ops_conditions',
      type: 'text',
      placeholder: 'VLOS/BVLOS'
    },
    {
      label: 'Pilot Type',
      name: 'pilot_type',
      type: 'text',
      placeholder: 'Pilot type'
    },
    {
      label: 'UAV',
      name: 'uav',
      type: 'select',
      required: true,
      placeholder: 'Select UAV',
      options: availableUAVs.map((uav) => ({
        value: uav.uav_id,
        label: `${uav.drone_name} (${uav.serial_number})`
      }))
    }
  ];

  // Filter fields for all attributes
  const filterFields = [
    {
      label: 'Departure Place',
      name: 'departure_place',
      type: 'text',
      placeholder: 'Filter Departure Place',
      value: filters.departure_place
    },
    {
      label: 'Departure Date',
      name: 'departure_date',
      type: 'date',
      value: filters.departure_date
    },
    {
      label: 'Departure Time',
      name: 'departure_time',
      type: 'time',
      value: filters.departure_time
    },
    {
      label: 'Landing Time',
      name: 'landing_time',
      type: 'time',
      value: filters.landing_time
    },
    {
      label: 'Landing Place',
      name: 'landing_place',
      type: 'text',
      placeholder: 'Filter Landing Place',
      value: filters.landing_place
    },
    {
      label: 'Flight Duration',
      name: 'flight_duration',
      type: 'number',
      placeholder: 'Filter Duration',
      value: filters.flight_duration
    },
    {
      label: 'Takeoffs',
      name: 'takeoffs',
      type: 'number',
      placeholder: 'Filter Takeoffs',
      value: filters.takeoffs
    },
    {
      label: 'Landings',
      name: 'landings',
      type: 'number',
      placeholder: 'Filter Landings',
      value: filters.landings
    },
    {
      label: 'Light Conditions',
      name: 'light_conditions',
      type: 'text',
      placeholder: 'Filter Light Conditions',
      value: filters.light_conditions
    },
    {
      label: 'Ops Conditions',
      name: 'ops_conditions',
      type: 'text',
      placeholder: 'Filter Ops Conditions',
      value: filters.ops_conditions
    },
    {
      label: 'Pilot Type',
      name: 'pilot_type',
      type: 'text',
      placeholder: 'Filter Pilot Type',
      value: filters.pilot_type
    },
    {
      label: 'UAV',
      name: 'uav',
      type: 'text',
      placeholder: 'Filter UAV',
      value: filters.uav
    }
  ];

  // When a filter field changes, update state
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // When an "Add New" flight field changes, update state
  const handleNewFlightChange = (e) => {
    setNewFlight({ ...newFlight, [e.target.name]: e.target.value });
  };

  // POST logic to add a new flight (same as before)
  const handleNewFlightAdd = async () => {
    if (
      !newFlight.departure_date ||
      !newFlight.departure_time ||
      !newFlight.landing_time ||
      !newFlight.uav
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const user_id = localStorage.getItem('user_id');
    if (!token || !user_id) {
      navigate('/login');
      return;
    }

    const departureDateTime = new Date(
      `${newFlight.departure_date}T${newFlight.departure_time}`
    );
    const landingDateTime = new Date(newFlight.landing_time);

    const flightPayload = {
      departure_place: newFlight.departure_place,
      departure_time: departureDateTime.toISOString(),
      landing_time: landingDateTime.toISOString(),
      landing_place: newFlight.landing_place,
      flight_duration: parseInt(newFlight.flight_duration) || 0,
      takeoffs: parseInt(newFlight.takeoffs) || 0,
      landings: parseInt(newFlight.landings) || 0,
      light_conditions: newFlight.light_conditions,
      ops_conditions: newFlight.ops_conditions,
      pilot_type: newFlight.pilot_type,
      uav: newFlight.uav,
      user: user_id
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/flightlogs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(flightPayload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          navigate('/login');
          return;
        }
        const errorData = await response.json();
        setError(
          typeof errorData === 'object'
            ? JSON.stringify(errorData)
            : errorData
        );
        return;
      }

      const newLog = await response.json();
      setLogs((prev) => [...prev, newLog]);
      setNewFlight({
        departure_place: '',
        departure_date: '',
        departure_time: '',
        landing_time: '',
        landing_place: '',
        flight_duration: '',
        takeoffs: '',
        landings: '',
        light_conditions: '',
        ops_conditions: '',
        pilot_type: '',
        uav: ''
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('An error occurred while adding the flight log.');
    }
  };

  // Edit callback remains unchanged
  const handleEdit = (id) => {
    alert(`Edit flight log with id ${id}`);
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Filter logs using all filter attributes
  const filteredLogs = logs.filter((log) => {
    // Loop over each filter key and check if it matches the log value
    return Object.entries(filters).every(([key, filterValue]) => {
      if (!filterValue) return true; // if no filter, accept this log

      let logValue = '';
      switch (key) {
        case 'departure_date':
          logValue = log.departure_time ? log.departure_time.substring(0, 10) : '';
          break;
        case 'departure_time':
          logValue = log.departure_time ? new Date(log.departure_time).toLocaleTimeString() : '';
          break;
        case 'landing_time':
          logValue = log.landing_time ? new Date(log.landing_time).toLocaleTimeString() : '';
          break;
        case 'flight_duration':
        case 'takeoffs':
        case 'landings':
          logValue = log[key] ? log[key].toString() : '';
          break;
        case 'uav':
          logValue = log.uav?.drone_name ? log.uav.drone_name.toLowerCase() : '';
          filterValue = filterValue.toLowerCase();
          break;
        default:
          logValue = log[key] ? log[key].toString().toLowerCase() : '';
          filterValue = filterValue.toLowerCase();
      }
      return logValue.includes(filterValue);
    });
  });

  return (
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-20 bg-gray-800 text-white p-2 rounded-md"
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col w-full p-4 pt-16 lg:pt-4">
        <h1 className="text-2xl font-semibold mb-4">Flight Log</h1>
        <Alert type="error" message={error} />

        {/* MOBILE: Filters, Card-Style Table, and AddNew Form */}
        <div className="sm:hidden">
          <Filters fields={filterFields} onFilterChange={handleFilterChange} />
          <Table columns={tableColumns} data={filteredLogs} onEdit={handleEdit} />
          <AddNew
            fields={addNewFields}
            formValues={newFlight}
            onChange={handleNewFlightChange}
            onSubmit={handleNewFlightAdd}
            submitLabel="Add"
          />
        </div>

        {/* DESKTOP: Traditional Table Layout */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left text-gray-500 table-auto">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th colSpan={tableColumns.length + 1} className="p-2">
                    <Filters asTable fields={filterFields} onFilterChange={handleFilterChange} />
                  </th>
                </tr>
                <tr>
                  {tableColumns.map((col) => (
                    <th key={col.accessor} className="p-2">
                      {col.header}
                    </th>
                  ))}
                  <th className="p-2">Edit</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={log.flightlog_id || index} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    {tableColumns.map((col) => (
                      <td key={col.accessor} className="py-3 px-4">
                        {col.render ? col.render(log[col.accessor], log) : log[col.accessor]}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <button onClick={() => handleEdit(log.flightlog_id)} className="text-blue-600 hover:text-blue-800">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Desktop AddNew row */}
                <tr>
                  <td colSpan={tableColumns.length + 1}>
                    <AddNew
                      asTable
                      fields={addNewFields}
                      formValues={newFlight}
                      onChange={handleNewFlightChange}
                      onSubmit={handleNewFlightAdd}
                      submitLabel="Add"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flightlog;
