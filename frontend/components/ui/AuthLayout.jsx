const AuthLayout = ({ children, title }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-sm p-6 bg-gray-700 rounded shadow-md">
        <h2 className="text-3xl font-semibold text-center text-white mb-6">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;