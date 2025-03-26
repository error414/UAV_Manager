import React from 'react';
import EditableRow from './EditableRow';
import { Button } from './index';
import Filters from './Filters';

const ResponsiveTable = ({
  columns,
  data,
  filterFields,
  filters,
  onFilterChange,
  addFields,
  newItem,
  onNewItemChange,
  onAdd,
  onEdit,
  editingId,
  editingData,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  availableOptions,
  hideDesktopFilters = false,
}) => {
  return (
    <div>
      {/* Mobile view */}
      <div className="sm:hidden overflow-auto pb-20"> {/* Added overflow-auto and bottom padding */}
        {/* Mobile filters */}
        <Filters 
          fields={filterFields}
          filters={filters}
          onFilterChange={onFilterChange}
          availableOptions={availableOptions}
          asTable={false}
        />
        
        {/* Mobile data cards */}
        <div className="mt-4 space-y-4">
          {data.map((item) => (
            <div key={item.flightlog_id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              {editingId === item.flightlog_id ? (
                /* Editing form for mobile */
                <div className="space-y-3">
                  {columns.map((col) => (
                    <div key={col.accessor} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700">{col.header}</label>
                      {renderEditField(col, editingData, onEditChange, availableOptions)}
                    </div>
                  ))}
                  <div className="flex space-x-2 mt-3">
                    <Button onClick={onSaveEdit} className="bg-green-500 hover:bg-green-600">Save</Button>
                    <Button onClick={onCancelEdit} className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
                    <Button onClick={() => onDelete(item.flightlog_id)} className="bg-red-500 hover:bg-red-600">Delete</Button>
                  </div>
                </div>
              ) : (
                /* Card display */
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {columns.map((col) => (
                      <div key={col.accessor} className="mb-2">
                        <div className="text-xs font-bold text-gray-500">{col.header}</div>
                        <div className="text-gray-800">
                          {col.render ? col.render(item[col.accessor], item) : item[col.accessor]}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                    <Button onClick={() => onEdit(item.flightlog_id)} className="bg-blue-500 hover:bg-blue-600">Edit</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile Add New form */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="font-medium text-lg mb-3">Add New Flight</h3>
          <div className="space-y-3">
            {addFields.map((field) => (
              <div key={field.name} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">{field.label}</label>
                {renderAddField(field, newItem, onNewItemChange, availableOptions)}
              </div>
            ))}
            <Button onClick={onAdd} className="w-full bg-green-500 hover:bg-green-600 mt-3">Add</Button>
          </div>
        </div>
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-500 table-auto">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col.accessor} className="p-2 pl-3">{col.header}</th>
                ))}
                <th className="p-2 pl-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Desktop filters as table row - only if not hidden */}
              {!hideDesktopFilters && (
                <Filters 
                  fields={filterFields}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  availableOptions={availableOptions}
                  asTable={true}
                />
              )}
              
              {/* Data rows */}
              {data.map((item) => (
                <tr key={item.flightlog_id} className="bg-white border-b hover:bg-gray-50">
                  {editingId === item.flightlog_id ? (
                    // Editing row
                    <>
                      {columns.map((col) => (
                        <td key={col.accessor} className="py-3 px-4 pl-3">
                          {renderEditField(col, editingData, onEditChange, availableOptions)}
                        </td>
                      ))}
                      <td className="py-3 px-4 pl-3 flex space-x-2">
                        <Button onClick={onSaveEdit} className="bg-green-500 hover:bg-green-600">Save</Button>
                        <Button onClick={onCancelEdit} className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
                        <Button onClick={() => onDelete(item.flightlog_id)} className="bg-red-500 hover:bg-red-600">Delete</Button>
                      </td>
                    </>
                  ) : (
                    // Normal row
                    <>
                      {columns.map((col) => (
                        <td key={col.accessor} className="py-3 px-4 pl-3">
                          {col.render ? col.render(item[col.accessor], item) : item[col.accessor]}
                        </td>
                      ))}
                      <td className="py-3 px-4 pl-3 flex space-x-2">
                        <Button onClick={() => onEdit(item.flightlog_id)} className="bg-blue-500 hover:bg-blue-600">Edit</Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              
              {/* Add new row */}
              <tr className="bg-white border-b">
                {addFields.map((field) => (
                  <td key={field.name} className="py-3 px-4 pl-3">
                    {renderAddField(field, newItem, onNewItemChange, availableOptions)}
                  </td>
                ))}
                <td className="py-3 px-4 pl-3">
                  <Button onClick={onAdd} className="bg-green-500 hover:bg-green-600">Add</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper functions for rendering form fields
function renderEditField(column, data, onChange, availableOptions) {
  const fieldName = column.accessor;
  const value = data ? data[fieldName] : '';
  
  // Special handling for select fields
  if (fieldName === 'uav') {
    return (
      <select
        name={fieldName}
        value={value || ''}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">Select UAV</option>
        {availableOptions.availableUAVs?.map((uav) => (
          <option key={uav.uav_id} value={uav.uav_id}>
            {uav.drone_name}
          </option>
        ))}
      </select>
    );
  }
  
  // Handle other select fields
  if (['light_conditions', 'ops_conditions', 'pilot_type'].includes(fieldName)) {
    const options = {
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
    
    return (
      <select
        name={fieldName}
        value={value || ''}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">Select {column.header}</option>
        {options[fieldName]?.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  
  // Default to text input
  return (
    <input
      type={fieldName.includes('time') ? 'time' : fieldName.includes('date') ? 'date' : 'text'}
      name={fieldName}
      value={value || ''}
      onChange={onChange}
      className="w-full px-2 py-1 border border-gray-300 rounded"
    />
  );
}

function renderAddField(field, data, onChange, availableOptions) {
  if (field.type === 'select') {
    if (field.name === 'uav') {
      return (
        <select
          name={field.name}
          value={data[field.name] || ''}
          onChange={onChange}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        >
          <option value="">{field.placeholder}</option>
          {availableOptions.availableUAVs?.map((uav) => (
            <option key={uav.uav_id} value={uav.uav_id}>
              {uav.drone_name}
            </option>
          ))}
        </select>
      );
    }
    
    return (
      <select
        name={field.name}
        value={data[field.name] || ''}
        onChange={onChange}
        className="w-full px-2 py-1 border border-gray-300 rounded"
      >
        <option value="">{field.placeholder}</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  
  return (
    <input
      type={field.type}
      name={field.name}
      placeholder={field.placeholder}
      value={data[field.name] || ''}
      onChange={onChange}
      className="w-full px-2 py-1 border border-gray-300 rounded"
      step={field.step}
      min={field.min}
    />
  );
}

export default ResponsiveTable;