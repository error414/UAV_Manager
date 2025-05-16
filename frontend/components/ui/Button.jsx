const Button = ({
  children,
  type = "button",
  onClick,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  className = ""
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${size === "sm" ? "py-1 px-3 text-sm" : size === "lg" ? "py-3 px-6 text-lg" : "py-2 px-4"}
        ${variant === "success" ? "bg-green-500 hover:bg-green-600 active:bg-green-700 focus:ring-green-300 text-white" : 
          variant === "danger" ? "bg-red-500 hover:bg-red-600 active:bg-red-700 focus:ring-red-300 text-white" : 
          variant === "secondary" ? "bg-gray-500 hover:bg-gray-600 active:bg-gray-700 focus:ring-gray-300 text-white" : 
          "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-300 text-white"}
        rounded
        transition-all duration-200 ease-in-out
        transform active:scale-95
        focus:outline-none focus:ring-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
    >
      {children}
    </button>
  );
};

export default Button;