import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards';
import { BoardPage } from './features/board/BoardPage';
import { CvsPage } from './features/cvs/CvsPage';
import { InterviewsPage } from './features/interviews/InterviewsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { TodosPage } from './features/todos/TodosPage';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
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
          <Route index element={<BoardPage />} />
          <Route path="interviews" element={<InterviewsPage />} />
          <Route path="todos" element={<TodosPage />} />
          <Route path="cvs" element={<CvsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
