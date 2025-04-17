import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ...existing routes... */}
        
        {/* Protected admin route */}
        <Route 
          path="/admin" 
          element={<AdminPage />} 
        />
        
        {/* ...existing routes... */}tes... */}
      </Routes>
    </BrowserRouter>rRouter>
  );
}

export default App;App;
