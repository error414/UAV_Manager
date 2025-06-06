import { useState, useEffect } from 'react';

// Renders a label-value row
const InfoRow = ({ label, value }) => (
  <div className="flex items-center">
    <span className="font-semibold text-gray-700 w-40">{label}</span>
    <span className="text-gray-900">{value}</span>
  </div>
);

// Renders a label-value pair in a grid cell
const GridInfo = ({ label, value }) => (
  <div className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm min-h-[80px]">
    <span className="font-semibold text-gray-700">{label}</span>
    <span className="text-gray-900">{value}</span>
  </div>
);

// Section container with title
const InfoSection = ({ title, className = "bg-gray-50 p-4 rounded-lg shadow", children }) => (
  <div className={className}>
    <h3 className="text-lg font-medium text-gray-800 mb-3">{title}</h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

// Panel for displaying a list of label-value pairs
const DataPanel = ({ title, items = [], columns = 1 }) => (
  <div className="bg-white p-3 rounded-md shadow-sm">
    {title && <h4 className="text-md font-medium text-gray-700 mb-2">{title}</h4>}
    <div className="text-sm space-y-1">
      {items.map((item, index) => (
        <p key={index}>
          <span className="font-medium">{item.label}:</span> {item.value}
        </p>
      ))}
    </div>
  </div>
);

// Collapsible panel component
const AccordionPanel = ({ title, isOpen, toggleOpen, children }) => {
  return (
    <div className="bg-gray-50 p-2 rounded-lg shadow mb-2">
      <button
        className="w-full flex items-center justify-between font-semibold text-gray-700"
        onClick={toggleOpen}
      >
        {title}
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
};

// Data structure for flight info sections
const FLIGHT_INFO_SECTIONS = {
  drone: [
    ['Drone Name', flight => flight.uav?.drone_name],
    ['Manufacturer', flight => flight.uav?.manufacturer],
    ['Type', flight => flight.uav?.type],
    ['Motors', flight => flight.uav?.motors],
    ['Type of Motor', flight => flight.uav?.motor_type],
  ],
  registration: [
    ['Registration Number', flight => flight.uav?.registration_number],
    ['Serial Number', flight => flight.uav?.serial_number],
    ['OPS Conditions', flight => flight.ops_conditions],
  ],
  operation: [
    ['Pilot Type', flight => flight.pilot_type],
    ['Landings', flight => flight.landings],
    ['Total Flight Time', flight => {
      if (!flight.flight_duration) return 'N/A';
      // Format duration as min:s
      return `${Math.floor(flight.flight_duration / 60)}min ${flight.flight_duration % 60}s`;
    }],
  ],
  location: [
    ['Departure Place', flight => flight.departure_place],
    ['Landing Place', flight => flight.landing_place],
    ['Date', flight => flight.departure_date],
    ['Departure Time', flight => flight.departure_time],
    ['Landing Time', flight => flight.landing_time],
    ['Flight Duration', flight => flight.flight_duration ? `${flight.flight_duration} seconds` : 'N/A'],
  ]
};

// Flight info card with collapsible details
const FlightInfoCard = ({ flight, hasGpsTrack = false }) => {
  const [open, setOpen] = useState(!hasGpsTrack); // Open by default if no GPS track

  // Sync open state with hasGpsTrack
  useEffect(() => {
    setOpen(!hasGpsTrack);
  }, [hasGpsTrack]);

  if (!flight) return null;

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      <div className="flex items-center mb-3">
        <button
          className="text-gray-600 hover:text-gray-900 focus:outline-none mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? (
            <span>&#x25B2;</span> // Up arrow
          ) : (
            <span>&#x25BC;</span> // Down arrow
          )}
        </button>
        <h3 className="text-lg font-medium text-gray-800">Flight Information</h3>
        <div className="flex-1" />
      </div>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DataPanel 
            title="Drone Information" 
            items={FLIGHT_INFO_SECTIONS.drone.map(([label, getter]) => ({ 
              label, 
              value: getter(flight) || 'N/A' 
            }))} 
          />
          
          <DataPanel 
            title="Registration" 
            items={FLIGHT_INFO_SECTIONS.registration.map(([label, getter]) => ({ 
              label, 
              value: getter(flight) || 'N/A' 
            }))} 
          />
          
          <DataPanel 
            title="Operation" 
            items={FLIGHT_INFO_SECTIONS.operation.map(([label, getter]) => ({ 
              label, 
              value: getter(flight) || 'N/A' 
            }))} 
          />
          
          <DataPanel 
            title="Location & Time" 
            items={FLIGHT_INFO_SECTIONS.location.map(([label, getter]) => ({ 
              label, 
              value: getter(flight) || 'N/A' 
            }))} 
          />
        </div>
      )}
    </div>
  );
};

export { InfoRow, GridInfo, InfoSection, DataPanel, AccordionPanel, FlightInfoCard };
