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
      className={`w-full py-2 px-4 bg-blue-500 text-white rounded 
                 hover:bg-blue-600 active:bg-blue-700 
                 transition-all duration-200 ease-in-out 
                 transform active:scale-95 
                 focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;