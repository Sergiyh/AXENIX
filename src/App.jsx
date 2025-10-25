import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Rooms from "./pages/Rooms";
import Room from "./pages/Room"
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import JoinByLink from "./pages/JoinByLink";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/users" element={<Users />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/join" element={<JoinByLink />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}
