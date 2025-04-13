export interface SupabaseEntry {
  id: string;
  created_at: string;
  date: string;
  content: string;
  summary?: string | null;
  tags?: string[] | null;
  meta_tag?: string | null;
  intent_tag?: string | null;
}

export interface Entry extends SupabaseEntry {
  user_id: string;
  updated_at: string;
  entry_type?: 'voice' | 'text';
}

export interface MacroSummary {
  mood: string;
  moodEmoji: string;
  focusAreas: {
    category: string;
    icon: string;
    highlight: string;
  }[];
  keyTakeaway: string;
}

export type TagType = 'meta' | 'intent' | 'content'; 