import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import LessonsPage from './pages/LessonsPage'
import PlaybookPage from './pages/PlaybookPage'
import ScriptPage from './pages/ScriptPage'
import CoachPage from './pages/CoachPage'
import MyOfferPage from './pages/MyOfferPage'
import ScriptTestingPage from './pages/ScriptTestingPage'
import Onboarding from './components/Onboarding'

export default function App() {
  const [onboardingVisible, setOnboardingVisible] = useState(true)

  return (
    <BrowserRouter>
      {onboardingVisible && <Onboarding onClose={() => setOnboardingVisible(false)} />}
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/lessons" replace />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="playbook" element={<PlaybookPage />} />
          <Route path="script" element={<ScriptPage />} />
          <Route path="coach" element={<CoachPage />} />
          <Route path="offer" element={<MyOfferPage />} />
          <Route path="testing" element={<ScriptTestingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
