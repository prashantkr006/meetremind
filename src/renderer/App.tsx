import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'

type Page = 'dashboard' | 'settings' | 'calendar'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <DashboardPage />}
        {page === 'settings' && <SettingsPage />}
        {page === 'calendar' && <CalendarPage />}
      </main>
    </div>
  )
}
