import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar, { ChapterList, ProgressSummary } from './components/layout/Sidebar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import SyncBadge from './components/layout/SyncBadge';
import AuthModal from './components/layout/AuthModal';
import FloatingQuestionButton from './components/parking/FloatingQuestionButton';
import { useLearning } from './context/LearningContext';
import HomePage from './pages/HomePage';
import ModulePage from './pages/ModulePage';
import LabsPage from './pages/LabsPage';
import FlashcardsPage from './pages/FlashcardsPage';
import ParkingLotPage from './pages/ParkingLotPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { ready, pendingLocalMerge, mergeLocalToCloud, dismissLocalMerge } = useLearning();
  const loc = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawer(false);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar />

      <header className="sticky top-0 z-30 flex items-center gap-2 bg-navy px-3 py-2 text-white lg:ml-[280px] lg:justify-end">
        <button type="button" className="btn-ghost !border-white/30 !bg-transparent !px-2 !text-white lg:hidden" onClick={() => setDrawer(true)} aria-label="開啟章節目錄">
          <Menu size={20} />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">AI Agent Consultant Studio</span>
        <SyncBadge onOpenAuth={() => setAuthOpen(true)} />
        <button type="button" className="btn !hidden !px-3 text-xs text-white/90 underline lg:!inline-flex" onClick={() => setAuthOpen(true)}>帳號</button>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="章節目錄">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col gap-3 overflow-y-auto bg-navy p-3">
            <button type="button" className="btn-ghost self-end !border-white/30 !bg-transparent !px-2 !text-white" onClick={() => setDrawer(false)} aria-label="關閉"><X size={18} /></button>
            <ProgressSummary />
            <ChapterList onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <main className="px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 lg:ml-[280px] lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-5xl">
          {pendingLocalMerge && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between" role="status">
              <span>偵測到這台裝置有訪客學習紀錄，要合併至雲端帳號嗎？</span>
              <span className="flex gap-2">
                <button type="button" className="btn-primary" onClick={() => void mergeLocalToCloud()}>合併至雲端</button>
                <button type="button" className="btn-ghost" onClick={dismissLocalMerge}>稍後</button>
              </span>
            </div>
          )}
          {!ready ? (
            <p className="py-10 text-center text-slate-500" role="status">載入中…</p>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/module/:id" element={<ModulePage />} />
              <Route path="/labs" element={<LabsPage />} />
              <Route path="/flashcards" element={<FlashcardsPage />} />
              <Route path="/parking" element={<ParkingLotPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          )}
        </div>
      </main>

      <FloatingQuestionButton />
      <MobileBottomNav />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
