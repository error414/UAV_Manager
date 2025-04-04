import React from 'react';

const Filters = ({ fields, filters, onFilterChange, availableOptions, asTable = false }) => {
  if (asTable) {
    // Desktop view - render as table row
    return (
      <tr className="table-row bg-gray-50">
        {fields.map(field => (
          <td key={field.name} className="p-2">
            {field.type === 'select' ? (
              <select
                name={field.name}
                value={filters[field.name] || ''}
                onChange={onFilterChange}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              >
                <option value="">{field.placeholder}</option>
                {field.name === 'uav' ? (
                  availableOptions?.availableUAVs?.map(uav => (
                    <option key={uav.uav_id} value={uav.uav_id}>
                      {uav.drone_name}
                    </option>
                  ))
                ) : (
                  field.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                placeholder={field.placeholder || ""}
                value={filters[field.name] || ""}
                onChange={onFilterChange}
                className="w-full px-2 py-1 border border-gray-300 rounded"
                step={field.step}
                min={field.min}
              />
            )}
          </td>
        ))}
        <td className="p-2"></td>
      </tr>
    );
  }

  // Mobile view - render as block (same as before)
  return (
    <div className="p-4 bg-gray-50 space-y-3">
      {fields.map(field => (
        <div key={field.name} className="flex flex-col space-y-2">
          <label className="text-xs font-medium text-gray-700">{field.label}</label>
          {field.type === 'select' ? (
            <select
              name={field.name}
              value={filters[field.name] || ''}
              onChange={onFilterChange}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            >
              <option value="">{field.placeholder}</option>
              {field.name === 'uav' ? (
                availableOptions?.availableUAVs?.map(uav => (
                  <option key={uav.uav_id} value={uav.uav_id}>
                    {uav.drone_name}
                  </option>
                ))
              ) : (
                field.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          ) : (
            <input
              type={field.type || "text"}
              name={field.name}
              placeholder={field.placeholder || ""}
              value={filters[field.name] || ""}
              onChange={onFilterChange}
              className="w-full px-2 py-1 border border-gray-300 rounded"
              step={field.step}
              min={field.min}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Filters;
