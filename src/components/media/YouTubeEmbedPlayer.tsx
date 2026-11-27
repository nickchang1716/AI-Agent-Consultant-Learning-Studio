import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface YTPlayer {
  getCurrentTime(): number;
  seekTo(sec: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('無法載入 YouTube 播放器（可能離線或被封鎖）'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

export interface PlayerHandle {
  getCurrentTime(): number;
  seekTo(sec: number): void;
}

interface Props {
  videoId: string;
  startSec?: number;
  onProgress?: (sec: number) => void;
}

const YouTubeEmbedPlayer = forwardRef<PlayerHandle, Props>(function YouTubeEmbedPlayer({ videoId, startSec = 0, onProgress }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      try {
        return player.current?.getCurrentTime() ?? 0;
      } catch {
        return 0;
      }
    },
    seekTo: (sec: number) => {
      try {
        player.current?.seekTo(Math.max(0, sec), true);
        player.current?.playVideo();
      } catch {
        /* player not ready */
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setError(null);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const mount = document.createElement('div');
        host.current.innerHTML = '';
        host.current.appendChild(mount);
        player.current = new YT.Player(mount, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { start: Math.floor(startSec), rel: 0, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: () => {
              timer = window.setInterval(() => {
                try {
                  const t = player.current?.getCurrentTime();
                  if (typeof t === 'number' && t > 0) progressRef.current?.(t);
                } catch {
                  /* ignore */
                }
              }, 10_000);
            },
          },
        });
        const iframe = host.current.querySelector('iframe');
        if (iframe) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : '播放器載入失敗'));
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      try {
        const t = player.current?.getCurrentTime();
        if (typeof t === 'number' && t > 0) progressRef.current?.(t);
        player.current?.destroy();
      } catch {
        /* ignore */
      }
      player.current = null;
    };
    // startSec 只用於初次載入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
      <div ref={host} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
      {error && <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">{error}</p>}
    </div>
  );
});

export default YouTubeEmbedPlayer;
