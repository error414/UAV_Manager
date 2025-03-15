import React from 'react';

/**
 * Table for mobile:
 *  - On <sm screens: displays each row as a "card" with labeled fields
 *  - On >=sm screens: you can simply hide it (show your normal table instead)
 */
const Table = ({ columns, data, onEdit }) => {
  return (
    <div className="sm:hidden overflow-x-auto relative shadow-md rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left text-gray-500 table-auto">
        {/* We hide the desktop header on mobile */}
        <thead className="hidden">
          <tr>
            {columns.map((col) => (
              <th key={col.accessor}>{col.header}</th>
            ))}
            {onEdit && <th>Edit</th>}
          </tr>
        </thead>

        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              className="bg-white border-b hover:bg-gray-50 transition-colors
                         flex flex-col mb-4 rounded shadow-sm"
            >
              {columns.map((col) => {
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

              {/* Edit button cell (if needed) */}
              {onEdit && (
                <td className="py-3 px-4 flex items-center">
                  <span className="font-bold text-gray-700 mr-2">Edit:</span>
                  <button
                    onClick={() => onEdit(row.id)}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5h2M6 20h12M9.2 9.2l5.6 5.6m0 0L19 20m-4.2-5.2l-5.6-5.6"
                      />
                    </svg>
                    <span className="sr-only">Edit</span>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
