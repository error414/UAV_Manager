import React from 'react';

const Button = ({ 
  children, 
  type = "button", 
  onClick, 
  className = "" 
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;