import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  CardReview,
  CustomVideo,
  LearningSnapshot,
  ParkingQuestion,
  Rating,
  SyncStatus,
  TimestampNote,
} from '../types/learning';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { SupabaseRepository } from '../services/repo/SupabaseRepository';
import { LocalRepository, clearLocalSnapshot, localHasData, readLocalSnapshot } from '../services/repo/LocalRepository';
import type { LearningRepository } from '../services/repo/LearningRepository';
import { computeStreak, emptySnapshot, legacyToSnapshot, planImport, todayStr } from '../lib/snapshot';
import { newReview, schedule } from '../lib/sm2';
import { uuid } from '../lib/id';
import { parseLegacyJson } from '../lib/legacyImport';
import { parseBackup } from '../lib/backupImport';
import { mapAuthError } from '../lib/authValidation';
import { isSafeHttpUrl } from '../lib/youtube';

interface Ctx {
  snap: LearningSnapshot;
  ready: boolean;
  repo: LearningRepository;
  status: SyncStatus;
  syncError: string | null;
  userEmail: string | null;
  isCloud: boolean;
  cloudAvailable: boolean;
  pendingLocalMerge: boolean;
  retry(): void;
  signInWithPassword(email: string, password: string): Promise<string | null>;
  signUpWithPassword(email: string, password: string): Promise<{ error: string | null; needsConfirmation: boolean }>;
  updatePassword(newPassword: string): Promise<string | null>;
  signOut(): Promise<void>;
  mergeLocalToCloud(): Promise<void>;
  dismissLocalMerge(): void;
  setLastModule(id: number): void;
  setTheme(t: 'light' | 'dark'): void;
  toggleComplete(moduleId: number): void;
  setWatched(moduleId: number, videoKey: string, watched: boolean): void;
  setPosition(moduleId: number, videoKey: string, sec: number): void;
  saveNote(moduleId: number, md: string): Promise<void>;
  addTimestamp(moduleId: number, videoKey: string, sec: number, text: string): void;
  updateTimestamp(n: TimestampNote): void;
  deleteTimestamp(id: string): void;
  saveCustomVideo(moduleId: number, title: string, url: string, replacesIndex: number | null): string | null;
  deleteCustomVideo(id: string): void;
  rateCard(cardId: string, rating: Rating): void;
  addQuestion(moduleId: number | null, question: string): void;
  updateQuestion(q: ParkingQuestion): void;
  deleteQuestion(id: string): void;
  importLegacy(text: string): string | null;
  exportBackup(): string;
  importBackup(text: string): string | null;
}

const LearningCtx = createContext<Ctx | null>(null);

export function useLearning(): Ctx {
  const c = useContext(LearningCtx);
  if (!c) throw new Error('useLearning 必須在 LearningProvider 內使用');
  return c;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<LearningSnapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('guest');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingLocalMerge, setPendingLocalMerge] = useState(false);
  const localRepo = useMemo(() => new LocalRepository(), []);
  const [repo, setRepo] = useState<LearningRepository>(localRepo);
  const inflight = useRef(0);
  /** 目前仍失敗、等待重試的寫入 */
  const failures = useRef<Set<() => Promise<void>>>(new Set());
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const repoRef = useRef(repo);
  repoRef.current = repo;

  // ---- Auth 監聽 ----
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // ---- 依登入狀態切換 repository 並載入 ----
  const userId = session?.user.id ?? null;
  useEffect(() => {
    let cancelled = false;
    // 多使用者切換安全：登出或換帳號時，丟棄前一位使用者尚未成功的寫入閉包，
    // 避免下一位使用者按 retry() 時把別人的資料重播到自己的帳號
    failures.current.clear();
    setSyncError(null);
    (async () => {
      setReady(false);
      try {
        if (supabase && userId) {
          const cloud = new SupabaseRepository(supabase, userId);
          setStatus('syncing');
          const s = await cloud.load();
          if (cancelled) return;
          setRepo(cloud);
          setSnap(s);
          setStatus('synced');
          setSyncError(null);
          setPendingLocalMerge(localHasData());
        } else {
          const s = await localRepo.load();
          if (cancelled) return;
          setRepo(localRepo);
          setSnap(s);
          setStatus('guest');
          setPendingLocalMerge(false);
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setSyncError(msg(e));
        const s = readLocalSnapshot();
        setRepo(localRepo);
        setSnap(s);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, localRepo]);

  // ---- 主題 ----
  useEffect(() => {
    document.documentElement.classList.toggle('dark', snap.preferences.theme === 'dark');
  }, [snap.preferences.theme]);

  /** 樂觀更新：先改畫面，再寫入；失敗顯示「同步失敗」並可重試 */
  const commit = useCallback((next: LearningSnapshot, write: () => Promise<void>) => {
    setSnap(next);
    const r = repoRef.current;
    const cloud = r.kind === 'cloud';
    const exec = async () => {
      inflight.current += 1;
      if (cloud) setStatus('syncing');
      try {
        await write();
        // 重試成功：只清除自己的失敗紀錄，不影響其他仍失敗的寫入
        failures.current.delete(exec);
      } catch (e) {
        failures.current.add(exec);
        setSyncError(msg(e));
      } finally {
        inflight.current -= 1;
      }
      // 所有寫入結束後才依「是否仍有失敗」決定狀態，避免後來的成功掩蓋先前的失敗
      if (cloud && inflight.current === 0) {
        if (failures.current.size > 0) setStatus('error');
        else {
          setStatus('synced');
          setSyncError(null);
        }
      } else if (cloud && failures.current.has(exec)) {
        setStatus('error');
      }
    };
    return exec();
  }, []);

  const touchStreak = useCallback((s: LearningSnapshot): LearningSnapshot => {
    const p = computeStreak(s.preferences, todayStr());
    return p === s.preferences ? s : { ...s, preferences: p };
  }, []);

  const savePrefs = useCallback(
    (s: LearningSnapshot) => {
      const next = touchStreak(s);
      void commit(next, () => repoRef.current.savePreferences(next.preferences));
    },
    [commit, touchStreak],
  );

  const retry = useCallback(() => {
    // 情況 1：已登入但目前仍是本機 repo（初次雲端載入失敗）→ 重新載入並切換回雲端 repo
    if (supabase && userId && repoRef.current.kind !== 'cloud') {
      const cloud = new SupabaseRepository(supabase, userId);
      setStatus('syncing');
      cloud
        .load()
        .then((s) => {
          setRepo(cloud);
          repoRef.current = cloud;
          setSnap(s);
          failures.current.clear();
          setStatus('synced');
          setSyncError(null);
          setPendingLocalMerge(localHasData());
        })
        .catch((e) => {
          setStatus('error');
          setSyncError(msg(e));
        });
      return;
    }
    // 情況 2：雲端寫入失敗 → 重跑所有仍失敗的寫入
    const pending = [...failures.current];
    for (const f of pending) void f();
  }, [userId]);

  // ---- 動作 ----
  const setLastModule = useCallback(
    (id: number) => {
      const cur = snapRef.current;
      if (cur.preferences.lastModuleId === id && cur.preferences.lastStudyDate === todayStr()) return;
      savePrefs({ ...cur, preferences: { ...cur.preferences, lastModuleId: id } });
    },
    [savePrefs],
  );

  const setTheme = useCallback(
    (t: 'light' | 'dark') => {
      const cur = snapRef.current;
      savePrefs({ ...cur, preferences: { ...cur.preferences, theme: t } });
    },
    [savePrefs],
  );

  const toggleComplete = useCallback(
    (moduleId: number) => {
      const cur = snapRef.current;
      const old = cur.moduleProgress.find((m) => m.moduleId === moduleId);
      const done = !(old?.isCompleted ?? false);
      const item = { moduleId, isCompleted: done, completedAt: done ? new Date().toISOString() : null };
      const list = old ? cur.moduleProgress.map((m) => (m.moduleId === moduleId ? item : m)) : [...cur.moduleProgress, item];
      const next = touchStreak({ ...cur, moduleProgress: list });
      void commit(next, async () => {
        await repoRef.current.saveModuleProgress(item);
        if (next.preferences !== cur.preferences) await repoRef.current.savePreferences(next.preferences);
      });
    },
    [commit, touchStreak],
  );

  const upsertVideo = useCallback(
    (moduleId: number, videoKey: string, patch: { watched?: boolean; lastPositionSec?: number }) => {
      const cur = snapRef.current;
      const old = cur.videoProgress.find((v) => v.moduleId === moduleId && v.videoKey === videoKey);
      const item = {
        moduleId,
        videoKey,
        watched: patch.watched ?? old?.watched ?? false,
        lastPositionSec: patch.lastPositionSec ?? old?.lastPositionSec ?? 0,
      };
      const list = old ? cur.videoProgress.map((v) => (v === old ? item : v)) : [...cur.videoProgress, item];
      void commit({ ...cur, videoProgress: list }, () => repoRef.current.saveVideoProgress(item));
    },
    [commit],
  );

  const setWatched = useCallback((m: number, k: string, w: boolean) => upsertVideo(m, k, { watched: w }), [upsertVideo]);
  const setPosition = useCallback((m: number, k: string, s: number) => upsertVideo(m, k, { lastPositionSec: Math.floor(s) }), [upsertVideo]);

  const saveNote = useCallback(
    (moduleId: number, md: string) => {
      const cur = snapRef.current;
      return commit({ ...cur, moduleNotes: { ...cur.moduleNotes, [moduleId]: md } }, () => repoRef.current.saveModuleNote(moduleId, md));
    },
    [commit],
  );

  const addTimestamp = useCallback(
    (moduleId: number, videoKey: string, sec: number, text: string) => {
      const n: TimestampNote = { id: uuid(), moduleId, videoKey, timestampSec: Math.max(0, Math.floor(sec)), noteText: text.trim(), createdAt: new Date().toISOString() };
      if (!n.noteText) return;
      const cur = snapRef.current;
      void commit({ ...cur, timestampNotes: [...cur.timestampNotes, n] }, () => repoRef.current.saveTimestampNote(n));
    },
    [commit],
  );
  const updateTimestamp = useCallback(
    (n: TimestampNote) => {
      const cur = snapRef.current;
      void commit({ ...cur, timestampNotes: cur.timestampNotes.map((x) => (x.id === n.id ? n : x)) }, () => repoRef.current.saveTimestampNote(n));
    },
    [commit],
  );
  const deleteTimestamp = useCallback(
    (id: string) => {
      const cur = snapRef.current;
      void commit({ ...cur, timestampNotes: cur.timestampNotes.filter((x) => x.id !== id) }, () => repoRef.current.deleteTimestampNote(id));
    },
    [commit],
  );

  const saveCustomVideo = useCallback(
    (moduleId: number, title: string, url: string, replacesIndex: number | null): string | null => {
      const t = title.trim();
      const u = url.trim();
      if (!t) return '請輸入標題。';
      if (!isSafeHttpUrl(u)) return '網址必須以 https:// 或 http:// 開頭。';
      const cur = snapRef.current;
      const existing = replacesIndex === null ? undefined : cur.customVideos.find((v) => v.moduleId === moduleId && v.replacesIndex === replacesIndex);
      const item: CustomVideo = { id: existing?.id ?? uuid(), moduleId, title: t, url: u, replacesIndex, createdAt: existing?.createdAt ?? new Date().toISOString() };
      const list = existing ? cur.customVideos.map((v) => (v.id === existing.id ? item : v)) : [...cur.customVideos, item];
      void commit({ ...cur, customVideos: list }, () => repoRef.current.saveCustomVideo(item));
      return null;
    },
    [commit],
  );
  const deleteCustomVideo = useCallback(
    (id: string) => {
      const cur = snapRef.current;
      void commit({ ...cur, customVideos: cur.customVideos.filter((v) => v.id !== id) }, () => repoRef.current.deleteCustomVideo(id));
    },
    [commit],
  );

  const rateCard = useCallback(
    (cardId: string, rating: Rating) => {
      const cur = snapRef.current;
      const old = cur.cardReviews.find((c) => c.cardId === cardId) ?? newReview(cardId);
      const item: CardReview = schedule(old, rating);
      const list = cur.cardReviews.some((c) => c.cardId === cardId) ? cur.cardReviews.map((c) => (c.cardId === cardId ? item : c)) : [...cur.cardReviews, item];
      const next = touchStreak({ ...cur, cardReviews: list });
      void commit(next, async () => {
        await repoRef.current.saveCardReview(item);
        if (next.preferences !== cur.preferences) await repoRef.current.savePreferences(next.preferences);
      });
    },
    [commit, touchStreak],
  );

  const addQuestion = useCallback(
    (moduleId: number | null, question: string) => {
      const t = question.trim();
      if (!t) return;
      const now = new Date().toISOString();
      const q: ParkingQuestion = { id: uuid(), moduleId, question: t, answer: '', isResolved: false, createdAt: now, updatedAt: now };
      const cur = snapRef.current;
      void commit({ ...cur, parkingQuestions: [q, ...cur.parkingQuestions] }, () => repoRef.current.saveParking(q));
    },
    [commit],
  );
  const updateQuestion = useCallback(
    (q: ParkingQuestion) => {
      const item = { ...q, updatedAt: new Date().toISOString() };
      const cur = snapRef.current;
      void commit({ ...cur, parkingQuestions: cur.parkingQuestions.map((x) => (x.id === q.id ? item : x)) }, () => repoRef.current.saveParking(item));
    },
    [commit],
  );
  const deleteQuestion = useCallback(
    (id: string) => {
      const cur = snapRef.current;
      void commit({ ...cur, parkingQuestions: cur.parkingQuestions.filter((x) => x.id !== id) }, () => repoRef.current.deleteParking(id));
    },
    [commit],
  );

  const applyMerged = useCallback(
    (incoming: LearningSnapshot, preferIncomingLast: boolean) => {
      const { merged, toWrite } = planImport(snapRef.current, incoming, { preferIncomingLast });
      void commit(merged, () => repoRef.current.importSnapshot(toWrite));
    },
    [commit],
  );

  const importLegacy = useCallback(
    (text: string): string | null => {
      const r = parseLegacyJson(text);
      if (!r.ok) return r.error;
      applyMerged(legacyToSnapshot(r.data), true);
      return null;
    },
    [applyMerged],
  );

  const exportBackup = useCallback(
    () => JSON.stringify({ app: 'ai-consultant-studio', version: 1, exportedAt: new Date().toISOString(), data: snapRef.current }, null, 2),
    [],
  );

  const importBackup = useCallback(
    (text: string): string | null => {
      const r = parseBackup(text);
      if (!r.ok) return r.error;
      applyMerged(r.data, false);
      return null;
    },
    [applyMerged],
  );

  // ---- 登入 / 遷移 ----
  // 註冊、登入、改密碼一律走 Supabase Auth SDK；本程式不儲存、不雜湊密碼
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!supabase) return '尚未設定 Supabase。';
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? mapAuthError(error.message) : null;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null; needsConfirmation: boolean }> => {
    if (!supabase) return { error: '尚未設定 Supabase。', needsConfirmation: false };
    // 若後台仍開著 Confirm email，驗證信導回「目前所在的網址（含專案路徑）」；
    // 該網址需在 Supabase 的 Redirect URLs 白名單內，否則 Supabase 會改導向 Site URL
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) return { error: mapAuthError(error.message), needsConfirmation: false };
    if (data.session) return { error: null, needsConfirmation: false }; // 關閉 Confirm email：已直接登入
    // Supabase 反帳號枚舉：Email 已註冊時不回錯誤，而是回傳 identities 為空的假使用者
    if (data.user?.identities?.length === 0) return { error: '此 Email 可能已註冊，請直接嘗試登入。', needsConfirmation: false };
    return { error: null, needsConfirmation: true }; // 後台仍開著 Confirm email
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<string | null> => {
    if (!supabase) return '尚未設定 Supabase。';
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? mapAuthError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const mergeLocalToCloud = useCallback(async () => {
    const local = readLocalSnapshot();
    const { merged, toWrite } = planImport(snapRef.current, local);
    setStatus('syncing');
    try {
      await repoRef.current.importSnapshot(toWrite);
      setSnap(merged);
      clearLocalSnapshot();
      setPendingLocalMerge(false);
      setStatus('synced');
      setSyncError(null);
    } catch (e) {
      setStatus('error');
      setSyncError(msg(e));
    }
  }, []);

  // ---- 切頁／關閉前不遺失資料：寫入為即時送出，這裡只提醒仍在傳送中的變更 ----
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (inflight.current > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const value: Ctx = {
    snap,
    ready,
    repo,
    status,
    syncError,
    userEmail: session?.user.email ?? null,
    isCloud: repo.kind === 'cloud',
    cloudAvailable: isSupabaseConfigured,
    pendingLocalMerge,
    retry,
    signInWithPassword,
    signUpWithPassword,
    updatePassword,
    signOut,
    mergeLocalToCloud,
    dismissLocalMerge: () => setPendingLocalMerge(false),
    setLastModule,
    setTheme,
    toggleComplete,
    setWatched,
    setPosition,
    saveNote,
    addTimestamp,
    updateTimestamp,
    deleteTimestamp,
    saveCustomVideo,
    deleteCustomVideo,
    rateCard,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    importLegacy,
    exportBackup,
    importBackup,
  };

  return <LearningCtx.Provider value={value}>{children}</LearningCtx.Provider>;
}
