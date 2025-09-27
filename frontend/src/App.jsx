import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from '../pages/Register.jsx';
import Login from '../pages/Login.jsx';
import AdditionalDetails from '../pages/AdditionalDetails.jsx';
import Flightlog from '../pages/Flightlog.jsx';
import FlightlogCalendar from '../pages/FlightLogCalendar.jsx';
import AircraftList from '../pages/AircraftList.jsx'; 
import NewAircraftForm from '../pages/NewAircraft.jsx';
import UserSettings from '../pages/UserSettings.jsx';
import NewAircraftPage from '../pages/NewAircraft.jsx';
import AircraftSettings from '../pages/AircraftSettings.jsx';
import FlightDetails from '../pages/FlightDetails.jsx';
import AdminPage from '../pages/AdminPage';
import ForgotPassword from '../pages/ForgotPassword.jsx';
import ResetPassword from '../pages/ResetPassword.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/flightlog" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/additionalDetails" element={<AdditionalDetails />} />
        <Route path="/flightlog" element={<Flightlog />} />
        <Route path="/flightlogcalendar" element={<FlightlogCalendar />} />
        <Route path="/AircraftList" element={<AircraftList />} />
        <Route path="/newaircraft" element={<NewAircraftForm />} />
        <Route path="/UserSettings" element={<UserSettings />} />
        <Route path="/editaircraft/:uavId" element={<NewAircraftPage />} />
        <Route path="/AircraftSettings/:uavId" element={<AircraftSettings />} />
        <Route path="/Flightdetails/:flightId" element={<FlightDetails />} />
        <Route path="/Admin" element={<AdminPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;