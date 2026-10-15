import { useEffect, useState } from 'react'
import Nav from './components/Nav'
import GeneratePage from './pages/GeneratePage'
import HistoryPage from './pages/HistoryPage'
import ResumePage from './pages/ResumePage'
import SettingsPage from './pages/SettingsPage'

export type Page = 'generate' | 'resume' | 'settings' | 'history'

export default function App() {
  const [page, setPage] = useState<Page>('generate')

  useEffect(() => {
    chrome.storage.local.get('activePage').then((r) => {
      if (r.activePage) setPage(r.activePage as Page)
    })
  }, [])

  function navigate(p: Page) {
    setPage(p)
    chrome.storage.local.set({ activePage: p })
  }

  return (
    <div className="app">
      <div className="page-content">
        {page === 'generate' && <GeneratePage onNavigate={navigate} />}
        {page === 'resume' && <ResumePage />}
        {page === 'settings' && <SettingsPage />}
        {page === 'history' && <HistoryPage />}
      </div>
      <Nav current={page} onChange={navigate} />
    </div>
  )
}
