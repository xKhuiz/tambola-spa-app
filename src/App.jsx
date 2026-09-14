import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import HostCreatePage from "./pages/HostCreatePage";
import HostLobbyPage from "./pages/HostLobbyPage";
import HostGamePage from "./pages/HostGamePage";
import HostSummaryPage from "./pages/HostSummaryPage";
import PlayPage from "./pages/PlayPage";
import PlayGamePage from "./pages/PlayGamePage";
import PlaySummaryPage from "./pages/PlaySummaryPage";
import TicketPreviewDevPage from "./pages/TicketPreviewDevPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/host/create"
        element={
          <ProtectedRoute>
            <HostCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/:roomId/lobby"
        element={
          <ProtectedRoute>
            <HostLobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/:roomId/game"
        element={
          <ProtectedRoute>
            <HostGamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/:roomId/summary"
        element={
          <ProtectedRoute>
            <HostSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route path="/play/:roomId" element={<PlayPage />} />
      <Route path="/play/:roomId/game" element={<PlayGamePage />} />
      <Route path="/play/:roomId/summary" element={<PlaySummaryPage />} />
      <Route path="/dev/ticket-preview" element={<TicketPreviewDevPage />} />
    </Routes>
  );
}
