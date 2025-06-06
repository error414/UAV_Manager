const Filters = ({ fields, filters, onFilterChange, availableOptions, asTable = false, mobileFiltersVisible = true }) => {
  if (asTable) {
    // Render filters as a table row (desktop)
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
                  // UAV select: populate from availableUAVs if present
                  Array.isArray(availableOptions?.availableUAVs) ? 
                    availableOptions.availableUAVs.map((uav) => (
                      <option key={uav.uav_id} value={uav.uav_id}>
                        {uav.drone_name}
                      </option>
                    )) : 
                    <option value="" disabled>No UAVs available</option>
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
                type="text"
                name={field.name}
                placeholder={field.placeholder || ""}
                value={filters[field.name] || ""}
                onChange={onFilterChange}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            )}
          </td>
        ))}
        <td className="p-2"></td>
      </tr>
    );
  }

  // Render filters as blocks (mobile), visibility controlled by mobileFiltersVisible
  return (
    <div className={`p-3 bg-gray-50 space-y-2 ${mobileFiltersVisible ? 'block' : 'hidden'}`}>
      {fields.map(field => (
        <div key={field.name} className="flex flex-col space-y-1">
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
                // UAV select: populate from availableUAVs if present
                Array.isArray(availableOptions?.availableUAVs) ? 
                  availableOptions.availableUAVs.map((uav) => (
                    <option key={uav.uav_id} value={uav.uav_id}>
                      {uav.drone_name}
                    </option>
                  )) : 
                  <option value="" disabled>No UAVs available</option>
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
              type="text"
              name={field.name}
              placeholder={field.placeholder || ""}
              value={filters[field.name] || ""}
              onChange={onFilterChange}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Filters;
