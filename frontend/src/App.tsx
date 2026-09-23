import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<PlaceholderPage titleKey="nav.board" />} />
          <Route path="interviews" element={<PlaceholderPage titleKey="nav.interviews" />} />
          <Route path="todos" element={<PlaceholderPage titleKey="nav.todos" />} />
          <Route path="cvs" element={<PlaceholderPage titleKey="nav.cvs" />} />
          <Route path="profile" element={<PlaceholderPage titleKey="nav.profile" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
