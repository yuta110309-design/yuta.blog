export type RecurrenceMode = 'weekly' | 'monthly' | 'once';

export interface Recurrence {
  mode: RecurrenceMode;
  weekday?: number; // 0=日, 1=月 ... 6=土
  nth?: number; // monthlyのみ 第n週
  time?: string; // 'HH:MM'
  dateISO?: string | null; // onceのみ
}

export interface EventConfig {
  id: string;
  emoji: string;
  title: string;
  location: string;
  description: string;
  recurrence: Recurrence;
  dateLabelOverride?: string;
  timeLabelOverride?: string;
  deadlineDaysBefore?: number | null;
  capacity?: number | null;
}

export type AttendanceStatus = 'go' | 'maybe' | 'no';

export interface ResponseRow {
  id?: string;
  event_id: string;
  occ_date: string;
  name: string;
  status: AttendanceStatus;
  updated_at: string;
}
