import React from 'react';

const OPTIONS = {
  light_conditions: [
    { value: 'Day', label: 'Day' },
    { value: 'Night', label: 'Night' }
  ],
  ops_conditions: [
    { value: 'VLOS', label: 'VLOS' },
    { value: 'BLOS', label: 'BLOS' }
  ],
  pilot_type: [
    { value: 'PIC', label: 'PIC' },
    { value: 'Dual', label: 'Dual' },
    { value: 'Instruction', label: 'Instruction' }
  ]
};

const EditableRow = React.memo(({ 
  log, 
  columns, 
  isEditing, 
  editingData, 
  availableUAVs, 
  onEditChange, 
  onSave, 
  onCancel, 
  onDelete,
  onEdit
}) => {
  const renderEditField = (col) => {
    if (!isEditing) {
      return (
        <td key={col.accessor} className="py-3 px-4">
          {col.render ? col.render(log[col.accessor], log) : log[col.accessor]}
        </td>
      );
    }
    
    // Render select for UAV field
    if (col.accessor === 'uav') {
      return (
        <td key={col.accessor} className="py-3 px-4">
          <select
            name="uav"
            value={editingData.uav}
            onChange={onEditChange}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          >
            <option value="">Select UAV</option>
            {availableUAVs.map((uav) => (
              <option key={uav.uav_id} value={uav.uav_id}>
                {uav.drone_name} ({uav.serial_number})
              </option>
            ))}
          </select>
        </td>
      );
    }
    
    // Render select for enum fields
    if (['light_conditions', 'ops_conditions', 'pilot_type'].includes(col.accessor)) {
      return (
        <td key={col.accessor} className="py-3 px-4">
          <select
            name={col.accessor}
            value={editingData[col.accessor]}
            onChange={onEditChange}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          >
            <option value="">Select</option>
            {OPTIONS[col.accessor].map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </td>
      );
    }
    
    // Set input type and props based on field
    let inputType = 'text';
    let inputProps = {};
    
    if (col.accessor === 'departure_date') {
      inputType = 'date';
    } else if (col.accessor === 'departure_time' || col.accessor === 'landing_time') {
      inputType = 'time';
      inputProps.step = "1";
    } else if (col.accessor === 'flight_duration' || col.accessor === 'takeoffs' || col.accessor === 'landings') {
      inputType = 'number';
      inputProps.step = "1";
      inputProps.min = "0";
    }
    
    return (
      <td key={col.accessor} className="py-3 px-4">
        <input
          type={inputType}
          name={col.accessor}
          value={editingData[col.accessor] || ''}
          onChange={onEditChange}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          {...inputProps}
        />
      </td>
    );
  };

  // Renders action buttons or edit button
  const renderEditCell = () => {
    return (
      <td className="py-3 px-4">
        {isEditing ? (
          <div className="flex space-x-2">
            <button onClick={onSave} className="text-green-600 hover:text-green-800">Save</button>
            <button onClick={onCancel} className="text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={() => onDelete(log.flightlog_id)} className="text-red-600 hover:text-red-800">Delete</button>
          </div>
        ) : (
          <button onClick={() => onEdit(log.flightlog_id)} className="text-blue-600 hover:text-blue-800">Edit</button>
        )}
      </td>
    );
  };

  return (
    <tr className="bg-white border-b hover:bg-gray-50 transition-colors">
      {columns.map(col => renderEditField(col))}
      {renderEditCell()}
    </tr>
  );
});

export default EditableRow;