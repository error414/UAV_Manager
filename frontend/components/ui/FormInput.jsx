import React from 'react';

const FormInput = ({
  label,
  labelClassName = '',
  type = 'text',
  name,
  id,
  value,
  onChange,
  required = false,
  className = '',
  placeholder = '',
  min,
  options = [],
}) => {
  if (type !== 'select') {
    return (
      <div className={`mb-4 ${className}`}>
        {label && (
          <label
            htmlFor={id}
            className={`block text-sm font-medium text-black ${labelClassName}`} 
          >
            {label}
          </label>
        )}
        <input
          type={type}
          name={name}
          id={id || name}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
          required={required}
          placeholder={placeholder}
          min={min}
        />
      </div>
    );
  }

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-medium text-black ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          name={name}
          id={id || name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded appearance-none bg-white text-gray-900 focus:outline-none focus:border-blue-500 pr-8"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FormInput;