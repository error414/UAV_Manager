export const userTableColumns = [
  { header: 'Email', accessor: 'email' },
  { header: 'First Name', accessor: 'first_name' },
  { header: 'Last Name', accessor: 'last_name' },
  { header: 'Phone', accessor: 'phone' },
  { header: 'Street', accessor: 'street' },
  { header: 'ZIP', accessor: 'zip' },
  { header: 'City', accessor: 'city' },
  { header: 'Country', accessor: 'country' },
  { header: 'Staff Status', accessor: 'is_staff', render: (value) => value ? 'Yes' : 'No' },
  { header: 'Active', accessor: 'is_active', render: (value) => value ? 'Yes' : 'No' }
];

export const uavTableColumns = [
  { header: 'Aircraft', accessor: 'drone_name' },
  { header: 'Manufacturer', accessor: 'manufacturer' },
  { header: 'Type', accessor: 'type' },
  { header: 'Motors', accessor: 'motors' },
  { header: 'Motor Type', accessor: 'motor_type' },
  { header: 'Flight Time', accessor: 'total_flight_time', render: (seconds) => {
    if (!seconds) return 'N/A';
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  }},
  { header: 'TO', accessor: 'total_takeoffs' },
  { header: 'LDG', accessor: 'total_landings' },
  { header: 'Flight Controller', accessor: 'flight_controller' },
  { header: 'Firmware', accessor: 'firmware' },
  { header: 'Version', accessor: 'firmware_version' },
  { header: 'ESC', accessor: 'esc' },
  { header: 'ESC Firmware', accessor: 'esc_firmware' },
  { header: 'Video', accessor: 'video' },
  { header: 'Video System', accessor: 'video_system' },
  { header: 'Receiver', accessor: 'receiver' },
  { header: 'Receiver FW', accessor: 'receiver_firmware' },
  { header: 'GPS', accessor: 'gps' },
  { header: 'MAG', accessor: 'mag' },
  { header: 'BARO', accessor: 'baro' },
  { header: 'GYRO', accessor: 'gyro' },
  { header: 'ACC', accessor: 'acc' },
  { header: 'Reg. Number', accessor: 'registration_number' },
  { header: 'Serial Number', accessor: 'serial_number' },
  { header: 'Status', accessor: 'is_active', render: (value) => value ? 'Active' : 'Inactive' }
];

export const flightLogTableColumns = [
  { header: 'Dept Place', accessor: 'departure_place' },
  { header: 'Date', accessor: 'departure_date' },
  { header: 'Dept Time', accessor: 'departure_time' },
  { header: 'LDG Time', accessor: 'landing_time' },
  { header: 'LDG Place', accessor: 'landing_place' },
  { header: 'Duration', accessor: 'flight_duration' },
  { header: 'T/O', accessor: 'takeoffs' },
  { header: 'LDG', accessor: 'landings' },
  { header: 'Light', accessor: 'light_conditions' },
  { header: 'OPS', accessor: 'ops_conditions' },
  { header: 'Pilot Type', accessor: 'pilot_type' },
  { 
    header: 'UAV', 
    accessor: 'uav', 
    render: (value) => {
      if (value && typeof value === 'object' && value.drone_name) {
        return value.drone_name;
      }
      if (value && typeof value === 'object' && value.uav_id) {
        return `UAV #${value.uav_id}`;
      }
      if (value) {
        return `UAV #${value}`;
      }
      return '';
    } 
  },
  { header: 'Comments', accessor: 'comments' }
];

export const getEnhancedFlightLogColumns = (availableUAVs) => {
  return flightLogTableColumns.map(col => {
    if (col.accessor === 'uav') {
      return {
        ...col,
        render: (value) => {
          if (value && typeof value === 'object' && value.drone_name) {
            return value.drone_name;
          }
          
          if (value) {
            const uavId = typeof value === 'object' ? value.uav_id : value;
            const foundUav = availableUAVs.find(uav => uav.uav_id == uavId);
            return foundUav ? foundUav.drone_name : `UAV #${uavId}`;
          }
          
          return '';
        }
      };
    }
    return col;
  });
};

export const maintenanceLogTableColumns = [
  { header: 'Date', accessor: 'event_date' },
  { header: 'Log', accessor: 'description' },
  { header: 'File', accessor: 'file', render: (file) => file ? 'Download' : 'N/A' }
];

export const uavConfigTableColumns = [
  { header: 'Date', accessor: 'upload_date' },
  { header: 'Name', accessor: 'name' },
  { header: 'File', accessor: 'file', render: (file) => file ? 'Download' : 'N/A' }
];
