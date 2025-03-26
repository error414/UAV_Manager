import React from 'react';

/**
 * Table for mobile:
 *  - On <sm screens: displays each row as a "card" with labeled fields
 *  - On >=sm screens: you can simply hide it (show your normal table instead)
 */
const Table = ({ 
  columns, 
  data, 
  onEdit, 
  editingId,
  editingData,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  availableUAVs = []
}) => {
  return (
    <div className="sm:hidden overflow-x-auto relative shadow-md rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left text-gray-500 table-auto">
        {/* We hide the desktop header on mobile */}
        <thead className="hidden">
          <tr>
            {columns.map((col) => (
              <th key={col.accessor}>{col.header}</th>
            ))}
            {onEdit && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {data.map((row, rowIndex) => {
            const isEditing = editingId === row.flightlog_id;
            
            return (
              <tr
                key={row.flightlog_id || rowIndex}
                className="bg-white border-b hover:bg-gray-50 transition-colors
                           flex flex-col mb-4 rounded shadow-sm"
              >
                {columns.map((col) => {
                  // If this row is being edited, show input fields
                  if (isEditing) {
                    // Special cases for dropdown fields
                    if (col.accessor === 'uav') {
                      return (
                        <td key={col.accessor} className="py-3 px-4">
                          <span className="font-bold text-gray-700">{col.header}:</span>{' '}
                          <select
                            name="uav"
                            value={editingData.uav}
                            onChange={onEditChange}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
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
                    } else if (col.accessor === 'light_conditions') {
                      return (
                        <td key={col.accessor} className="py-3 px-4">
                          <span className="font-bold text-gray-700">{col.header}:</span>{' '}
                          <select
                            name="light_conditions"
                            value={editingData.light_conditions}
                            onChange={onEditChange}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                          >
                            <option value="">Select</option>
                            <option value="Day">Day</option>
                            <option value="Night">Night</option>
                          </select>
                        </td>
                      );
                    } else if (col.accessor === 'ops_conditions') {
                      return (
                        <td key={col.accessor} className="py-3 px-4">
                          <span className="font-bold text-gray-700">{col.header}:</span>{' '}
                          <select
                            name="ops_conditions"
                            value={editingData.ops_conditions}
                            onChange={onEditChange}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                          >
                            <option value="">Select</option>
                            <option value="VLOS">VLOS</option>
                            <option value="BLOS">BLOS</option>
                          </select>
                        </td>
                      );
                    } else if (col.accessor === 'pilot_type') {
                      return (
                        <td key={col.accessor} className="py-3 px-4">
                          <span className="font-bold text-gray-700">{col.header}:</span>{' '}
                          <select
                            name="pilot_type"
                            value={editingData.pilot_type}
                            onChange={onEditChange}
                            className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                          >
                            <option value="">Select</option>
                            <option value="PIC">PIC</option>
                            <option value="Dual">Dual</option>
                            <option value="Instruction">Instruction</option>
                          </select>
                        </td>
                      );
                    }
                    
                    // Determine input type based on the field
                    let inputType = 'text';
                    let inputStep = null;
                    let inputMin = null;
                    
                    if (col.accessor === 'departure_date') {
                      inputType = 'date';
                    } else if (col.accessor === 'departure_time' || col.accessor === 'landing_time') {
                      inputType = 'time';
                      inputStep = "1"; // Enable seconds in time inputs
                    } else if (col.accessor === 'flight_duration' || col.accessor === 'takeoffs' || col.accessor === 'landings') {
                      inputType = 'number';
                      inputStep = "1";
                      inputMin = "0"; // Prevent negative values
                    }
                    
                    return (
                      <td key={col.accessor} className="py-3 px-4">
                        <span className="font-bold text-gray-700">{col.header}:</span>{' '}
                        <input
                          type={inputType}
                          name={col.accessor}
                          value={editingData[col.accessor] || ''}
                          onChange={onEditChange}
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
                          step={inputStep}
                          min={inputMin}
                        />
                      </td>
                    );
                  }
                  
                  // If not editing, show regular cell content
                  const cellValue = row[col.accessor];
                  return (
                    <td key={col.accessor} className="py-3 px-4">
                      <span className="font-bold text-gray-700">{col.header}:</span>{' '}
                      <span>
                        {col.render ? col.render(cellValue, row) : cellValue}
                      </span>
                    </td>
                  );
                })}

                {/* Action buttons cell */}
                <td className="py-3 px-4 flex items-center">
                  {isEditing ? (
                    <>
                      <span className="font-bold text-gray-700 mr-2">Actions:</span>
                      <div className="flex space-x-4">
                        <button
                          onClick={onSaveEdit}
                          className="text-green-600 hover:text-green-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => onDelete(row.flightlog_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-gray-700 mr-2">Edit:</span>
                      <button
                        onClick={() => onEdit(row.flightlog_id)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;