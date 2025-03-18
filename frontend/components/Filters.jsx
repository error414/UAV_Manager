import React from 'react';

const Filters = ({ fields, onFilterChange, asTable }) => {
  if (asTable) {
    // Desktop view: render as a table row (always visible)
    return (
      <tr className="table-row">
        {fields.map(field => (
          <td key={field.name} className="p-2">
            <input
              type={field.type || "text"}
              name={field.name}
              placeholder={field.placeholder || ""}
              value={field.value}
              onChange={onFilterChange}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
            />
          </td>
        ))}
        {/* Extra cell for alignment if needed */}
        <td className="p-2"></td>
      </tr>
    );
  }

  // Mobile view: render as a block of filters.
  return (
    <div className="lg:hidden p-4 bg-gray-50 space-y-3">
      {fields.map(field => (
        <div key={field.name} className="flex flex-col space-y-2">
          <label className="text-xs font-medium text-gray-700">{field.label}</label>
          <input
            type={field.type || "text"}
            name={field.name}
            placeholder={field.placeholder || ""}
            value={field.value}
            onChange={onFilterChange}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-100"
          />
        </div>
      ))}
    </div>
  );
};

export default Filters;
