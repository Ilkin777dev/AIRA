import { Routes, Route } from "react-router-dom";

import MainPage from "./pages/MainPage";

import Register from "./pages/Register";

import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";

import Interview from "./pages/Interview";

import AdminCandidates from "./pages/AdminCandidates";

import ProtectedRoute from "./components/ProtectedRoute";

import AdminRoute from "./components/AdminRoute";

import MultiScreenCaptureTest from "./components/MultiScreenCaptureTest.jsx";

import CameraMicTest from "./components/CameraMicTest.jsx";

import InterviewRecordingTest from "./components/InterviewRecordingTest.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />

      <Route path="/register" element={<Register />} />

      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/interview"
        element={
          <ProtectedRoute>
            <Interview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminCandidates />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/candidates"
        element={
          <AdminRoute>
            <AdminCandidates />
          </AdminRoute>
        }
      />

      {/* TEMPORARY DEVELOPMENT ROUTES */}

      <Route path="/multi-screen-test" element={<MultiScreenCaptureTest />} />

      <Route path="/device-test" element={<CameraMicTest />} />

      <Route path="/recording-test" element={<InterviewRecordingTest />} />
    </Routes>
  );
}

export default App;
