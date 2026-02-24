import { LessonBlock, LessonSection, Lesson } from '@/types/database';

export interface LessonDraft {
  lessonId: string;
  blocks: LessonBlock[];
  sections: LessonSection[];
  lesson: Partial<Lesson>;
  timestamp: number;
  version: number; // For future migration compatibility
}

const DRAFT_KEY_PREFIX = 'lesson-draft-';
const DRAFT_VERSION = 1;
const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Manages localStorage persistence for lesson drafts
 * - Auto-saves lesson data every 3-5 seconds
 * - Recovers drafts on page reload
 * - Expires old drafts automatically
 */
export class LessonDraftManager {
  private lessonId: string;
  private key: string;

  constructor(lessonId: string) {
    this.lessonId = lessonId;
    this.key = `${DRAFT_KEY_PREFIX}${lessonId}`;
  }

  /**
   * Save draft to localStorage
   */
  saveDraft(data: Omit<LessonDraft, 'lessonId' | 'timestamp' | 'version'>): void {
    try {
      const draft: LessonDraft = {
        ...data,
        lessonId: this.lessonId,
        timestamp: Date.now(),
        version: DRAFT_VERSION,
      };
      localStorage.setItem(this.key, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft to localStorage:', error);
      // localStorage might be full or disabled - fail silently
    }
  }

  /**
   * Load draft from localStorage
   */
  loadDraft(): LessonDraft | null {
    try {
      const stored = localStorage.getItem(this.key);
      if (!stored) return null;

      const draft: LessonDraft = JSON.parse(stored);

      // Check expiry
      if (Date.now() - draft.timestamp > DRAFT_EXPIRY_MS) {
        this.clearDraft();
        return null;
      }

      // Check version compatibility
      if (draft.version !== DRAFT_VERSION) {
        console.warn('Draft version mismatch, ignoring');
        this.clearDraft();
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error);
      return null;
    }
  }

  /**
   * Check if draft is newer than database data
   */
  isDraftNewer(dbTimestamp: string): boolean {
    const draft = this.loadDraft();
    if (!draft) return false;

    const dbTime = new Date(dbTimestamp).getTime();
    return draft.timestamp > dbTime;
  }

  /**
   * Clear draft from localStorage
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  /**
   * Get all draft keys (for cleanup)
   */
  static getAllDraftKeys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.error('Failed to get draft keys:', error);
    }
    return keys;
  }

  /**
   * Cleanup expired drafts
   */
  static cleanupExpiredDrafts(): void {
    const keys = LessonDraftManager.getAllDraftKeys();
    keys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;

        const draft: LessonDraft = JSON.parse(stored);
        if (Date.now() - draft.timestamp > DRAFT_EXPIRY_MS) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // Invalid draft, remove it
        localStorage.removeItem(key);
      }
    });
  }
}
