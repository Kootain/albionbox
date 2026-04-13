import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { UploadPage } from './pages/UploadPage'
import { ViewVideosPage } from './pages/ViewVideosPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<UploadPage />} />
        <Route path="videos" element={<ViewVideosPage />} />
      </Route>
    </Routes>
  )
}

export default App
