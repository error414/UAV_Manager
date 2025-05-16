const Loading = ({ message = 'Loading...' }) => (
  <div className="flex h-screen items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
      <p>{message}</p>
    </div>
  </div>
);

export default Loading;
