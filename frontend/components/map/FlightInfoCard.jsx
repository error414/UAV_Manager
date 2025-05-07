import React, { useState, useEffect } from 'react';

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

const FlightInfoCard = ({ flight, hasGpsTrack = false }) => {
  const [open, setOpen] = useState(!hasGpsTrack); // Open by default only if no GPS track

  // Update open state when hasGpsTrack changes
  useEffect(() => {
    setOpen(!hasGpsTrack);
  }, [hasGpsTrack]);

  if (!flight) return null;

  // Create a card with 4 blocks in a grid layout
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
        {/* Platzhalter für rechtsbündige Elemente, falls nötig */}
        <div className="flex-1" />
      </div>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Drone Information Block */}
          <div className="bg-white p-3 rounded-md shadow-sm">
            <h4 className="text-md font-medium text-gray-700 mb-2">Drone Information</h4>
            <div className="text-sm space-y-1">
              {FLIGHT_INFO_SECTIONS.drone.map(([label, getter]) => (
                <p key={label}>
                  <span className="font-medium">{label}:</span> {getter(flight) || 'N/A'}
                </p>
              ))}
            </div>
          </div>
          
          {/* Registration Block */}
          <div className="bg-white p-3 rounded-md shadow-sm">
            <h4 className="text-md font-medium text-gray-700 mb-2">Registration</h4>
            <div className="text-sm space-y-1">
              {FLIGHT_INFO_SECTIONS.registration.map(([label, getter]) => (
                <p key={label}>
                  <span className="font-medium">{label}:</span> {getter(flight) || 'N/A'}
                </p>
              ))}
            </div>
          </div>
          
          {/* Operation Block */}
          <div className="bg-white p-3 rounded-md shadow-sm">
            <h4 className="text-md font-medium text-gray-700 mb-2">Operation</h4>
            <div className="text-sm space-y-1">
              {FLIGHT_INFO_SECTIONS.operation.map(([label, getter]) => (
                <p key={label}>
                  <span className="font-medium">{label}:</span> {getter(flight) || 'N/A'}
                </p>
              ))}
            </div>
          </div>
          
          {/* Location/Time Block */}
          <div className="bg-white p-3 rounded-md shadow-sm">
            <h4 className="text-md font-medium text-gray-700 mb-2">Location & Time</h4>
            <div className="text-sm space-y-1">
              {FLIGHT_INFO_SECTIONS.location.map(([label, getter]) => (
                <p key={label}>
                  <span className="font-medium">{label}:</span> {getter(flight) || 'N/A'}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightInfoCard;
