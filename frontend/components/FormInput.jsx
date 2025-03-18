import React from 'react';

const FormInput = ({
  label,
  type = 'text',
  name,
  id,
  value,
  onChange,
  required = false,
  className = '',
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block mb-1 text-gray-200">
        {label}
      </label>
      <input
        type={type}
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded border border-gray-600 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
        required={required}
      />
    </div>
  );
};

export default FormInput;