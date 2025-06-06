const ArrowButton = ({
  direction = 'left',
  onClick,
  title,
  disabled = false,
  className = '',
  ...props
}) => {
  // Show left arrow for 'left', right arrow otherwise
  const isLeft = direction === 'left';
  return (
    <button
      className={`text-gray-600 hover:text-blue-600 hover:bg-gray-100 p-2 rounded-full transition-colors ${className}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      {...props}
    >
      {isLeft ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

export default ArrowButton;
