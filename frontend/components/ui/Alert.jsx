import { useState } from 'react';

const icons = {
  error: (
    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M9 12l2 2l4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  )
};

const styles = {
  error: "mb-4 p-4 flex items-center bg-red-50 text-red-800 rounded shadow-lg border border-red-200 animate-fade-in",
  success: "mb-4 p-4 flex items-center bg-green-50 text-green-800 rounded shadow-lg border border-green-200 animate-fade-in"
};

const closeBtnStyle =
  "ml-auto bg-transparent border-0 text-xl leading-none font-bold cursor-pointer text-gray-400 hover:text-gray-700 focus:outline-none";

const Alert = ({ type, message }) => {
  const [visible, setVisible] = useState(true);
  if (!message || !visible) return null;

  return (
    <div className={styles[type] || styles.error} style={{ transition: 'opacity 0.3s' }}>
      {icons[type] || icons.error}
      <span className="flex-1">{message}</span>
      <button className={closeBtnStyle} aria-label="Close" onClick={() => setVisible(false)}>
        &times;
      </button>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </div>
  );
};

export default Alert;