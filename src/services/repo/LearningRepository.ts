import type {
  CardReview,
  CustomVideo,
  LearningSnapshot,
  ModuleProgress,
  ParkingQuestion,
  Preferences,
  TimestampNote,
  VideoProgress,
} from '../../types/learning';

/** 訪客（本機）與雲端（Supabase）共用的資料存取介面 */
export interface LearningRepository {
  readonly kind: 'local' | 'cloud';
  load(): Promise<LearningSnapshot>;
  savePreferences(p: Preferences): Promise<void>;
  saveModuleProgress(p: ModuleProgress): Promise<void>;
  saveVideoProgress(v: VideoProgress): Promise<void>;
  saveCustomVideo(v: CustomVideo): Promise<void>;
  deleteCustomVideo(id: string): Promise<void>;
  saveModuleNote(moduleId: number, markdown: string): Promise<void>;
  saveTimestampNote(n: TimestampNote): Promise<void>;
  deleteTimestampNote(id: string): Promise<void>;
  saveCardReview(r: CardReview): Promise<void>;
  saveParking(q: ParkingQuestion): Promise<void>;
  deleteParking(id: string): Promise<void>;
  /** 以 upsert 寫入整份快照（用於合併、匯入） */
  importSnapshot(s: LearningSnapshot): Promise<void>;
  /** 上傳（或本機儲存）圖片，回傳放進 Markdown 的 src */
  uploadImage(moduleId: number, blob: Blob): Promise<string>;
  /** 將 Markdown 內的圖片 src 解析為可顯示的 URL；無法解析回傳 null */
  resolveImage(src: string): Promise<string | null>;
}
