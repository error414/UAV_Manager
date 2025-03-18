import React from 'react';

const Alert = ({ type, message }) => {
  if (!message) return null;
  
  const styles = {
    error: "mb-4 p-2 bg-red-200 text-red-800 rounded",
    success: "mb-4 p-2 bg-green-200 text-green-800 rounded"
  };
  
  return (
    <div className={styles[type]}>
      {message}
    </div>
  );
};

export default Alert;