import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import LessonsPage from './pages/LessonsPage'
import PlaybookPage from './pages/PlaybookPage'
import ScriptPage from './pages/ScriptPage'
import CoachPage from './pages/CoachPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/lessons" replace />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="playbook" element={<PlaybookPage />} />
          <Route path="script" element={<ScriptPage />} />
          <Route path="coach" element={<CoachPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
