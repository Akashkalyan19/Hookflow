import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppShell } from "./layouts/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { DeliveryDetailPage } from "./pages/DeliveryDetailPage";
import { EndpointDetailPage } from "./pages/EndpointDetailPage";
import { EndpointsPage } from "./pages/EndpointsPage";
import { LoadingState } from "./components/LoadingState";

function PrivateRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export function App() {
  return <Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route element={<PrivateRoutes />}>
      <Route index element={<DashboardPage />} />
      <Route path="/endpoints" element={<EndpointsPage />} />
      <Route path="/endpoints/:endpointId" element={<EndpointDetailPage />} />
      <Route path="/deliveries" element={<DeliveriesPage />} />
      <Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
