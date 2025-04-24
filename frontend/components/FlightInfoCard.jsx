import React from 'react';

const FlightInfoCard = ({ flight }) => {
  if (!flight) return null;
  
  const flightDurationFormatted = flight.flight_duration
    ? `${Math.floor(flight.flight_duration / 60)}min ${flight.flight_duration % 60}s`
    : 'N/A';
    
  const flightInfo = [
    ['Drone Name', flight.uav?.drone_name],
    ['Manufacturer', flight.uav?.manufacturer],
    ['Type', flight.uav?.type],
    ['Motors', flight.uav?.motors],
    ['Type of Motor', flight.uav?.motor_type],
    ['Registration Number', flight.uav?.registration_number],
    ['Serial Number', flight.uav?.serial_number],
    ['OPS Conditions', flight.ops_conditions],
    ['Pilot Type', flight.pilot_type],
    ['Landings', flight.landings],
    ['Total Flight Time', flightDurationFormatted],
    ['Departure Place', flight.departure_place],
    ['Landing Place', flight.landing_place],
    ['Date', flight.departure_date],
    ['Departure Time', flight.departure_time],
    ['Landing Time', flight.landing_time],
    ['Flight Duration', `${flight.flight_duration || 'N/A'} seconds`]
  ];
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-800 mb-3">Flight Information</h3>
      <div className="space-y-2">
        {flightInfo.map(([label, value]) => (
          <div key={label} className="flex items-center">
            <span className="font-semibold text-gray-700 w-40">{label}:</span>
            <span className="text-gray-900">{value || 'N/A'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightInfoCard;
