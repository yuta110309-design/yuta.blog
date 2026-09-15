'use client';

import { useState } from 'react';
import { EventConfig, ResponseRow } from '@/lib/types';
import {
  computeOccurrence,
  computeUpcomingOccurrences,
  dateKey,
  formatLabel,
  occurrenceDeadline,
  recurrenceLabel
} from '@/lib/events';
import AttendeeForm from './AttendeeForm';
import OrganizerPanel from './OrganizerPanel';

const IG_URL = 'https://www.instagram.com/the.thirdplace.ebisu?igsh=MTFuY2RzZWJjZzlnZA==';

export default function EventCard({
  event,
  mode,
  allResponses,
  onRefresh
}: {
  event: EventConfig;
  mode: 'organizer' | 'attendee';
  allResponses: ResponseRow[];
  onRefresh: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  // 「来週は無理だが再来週は行きたい」に対応するため、定例イベントは直近5回分から
  // 開催日を選べるようにする（単発イベントは従来通り1回だけ）。
  const [selectedOccDate, setSelectedOccDate] = useState<string | null>(null);

  const isWeekly = event.recurrence?.mode === 'weekly';
  const now = new Date();
  const occurrenceOptions = isWeekly
    ? computeUpcomingOccurrences(event.recurrence, now, 5)
    : [computeOccurrence(event.recurrence, now)].filter((d): d is Date => d !== null);
  const nextOccurrence = occurrenceOptions[0] ?? null;

  // カード上部のバッジ類は常に直近開催分（＝申し込みのデフォルト）を表示する
  const occDate = nextOccurrence ? dateKey(nextOccurrence) : '';
  const dateLabel = event.dateLabelOverride || (nextOccurrence ? formatLabel(nextOccurrence) : '日程未定');
  const timeLabel = event.timeLabelOverride || (event.recurrence?.time ? `${event.recurrence.time}〜` : '');

  const deadline = occurrenceDeadline(nextOccurrence, event.deadlineDaysBefore);
  const deadlineLabel = deadline ? `${formatLabel(deadline)}締切` : '日程確定後に設定';
  const pastDeadline = deadline ? now > deadline : false;

  const list = allResponses.filter((r) => r.event_id === event.id && (r.occ_date || '') === occDate);
  const goCount = list.filter((x) => x.status === 'go').length;
  const full = event.capacity != null && goCount >= event.capacity;
  const locked = full || pastDeadline;

  // フォーム内で選択中の開催日（未選択、または選び直しで無効になった場合は
  // 締切前の一番近い回にフォールバックする）
  const selected =
    occurrenceOptions.find((o) => dateKey(o) === selectedOccDate) ??
    occurrenceOptions.find((o) => !(occurrenceDeadline(o, event.deadlineDaysBefore) && now > occurrenceDeadline(o, event.deadlineDaysBefore)!)) ??
    nextOccurrence;
  const selectedOccDateKey = selected ? dateKey(selected) : '';
  const selectedDeadline = occurrenceDeadline(selected, event.deadlineDaysBefore);
  const selectedPastDeadline = selectedDeadline ? now > selectedDeadline : false;
  const selectedList = allResponses.filter((r) => r.event_id === event.id && (r.occ_date || '') === selectedOccDateKey);
  const selectedGoCount = selectedList.filter((x) => x.status === 'go').length;
  const selectedFull = event.capacity != null && selectedGoCount >= event.capacity;

  return (
    <div className={`bg-panel border border-white/10 border-t-gold/40 p-6 mb-4.5 transition-colors ${open ? 'border-gold' : ''} ${locked ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div>
          <p className="font-serif text-[19px] font-bold mb-2.5 flex items-center gap-2">
            {event.emoji} {event.title}
          </p>
          <p className="text-creamDim text-[12.5px] leading-loose">
            {dateLabel}・<span className="text-goldSoft">{timeLabel}</span>
            <br />
            {event.location}
          </p>
          <div className="text-[10.5px] text-sage mt-1.5 font-medium">{recurrenceLabel(event.recurrence)}</div>
          {event.description && (
            <p className="text-creamDim text-[12.5px] leading-relaxed mt-3 pt-3 border-t border-white/10">
              {event.description}
            </p>
          )}
          <span className="inline-block text-[10px] font-medium tracking-wide px-3 py-1.5 mt-3.5 mr-1.5 border border-[#c1745680] text-[#e3ab90]">
            {deadlineLabel}
          </span>
          <span className="inline-block text-[10px] font-medium tracking-wide px-3 py-1.5 mt-3.5 mr-1.5 border border-sage/50 text-sage">
            {list.length}人が回答済み
          </span>
          {event.capacity != null && (
            <span
              className={`inline-block text-[10px] font-medium tracking-wide px-3 py-1.5 mt-3.5 mr-1.5 border ${
                full ? 'border-gold text-goldSoft bg-gold/10' : 'border-white/20 text-creamDim'
              }`}
            >
              定員 {goCount}/{event.capacity}
            </span>
          )}
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-[10px] font-medium tracking-wide px-3 py-1.5 mt-3.5 border border-gold text-goldSoft hover:bg-gold hover:text-[#1a1204] transition-colors"
          >
            Instagramを見る ↗
          </a>
        </div>
        <div className={`font-display text-gold text-2xl leading-none ml-3.5 transition-transform ${open ? 'rotate-45' : ''}`}>＋</div>
      </div>

      {open && (
        <div className="pt-5 mt-5 border-t border-white/10">
          {mode === 'attendee' ? (
            <div>
              {isWeekly && occurrenceOptions.length > 1 && (
                <div className="mb-4.5">
                  <label className="block text-[10.5px] text-sage mb-2 font-medium tracking-widest uppercase">開催日</label>
                  <div className="flex flex-wrap gap-2">
                    {occurrenceOptions.map((o) => {
                      const key = dateKey(o);
                      const d = occurrenceDeadline(o, event.deadlineDaysBefore);
                      const closed = d ? now > d : false;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={closed}
                          onClick={() => setSelectedOccDate(key)}
                          className={`px-3 py-2 border text-[12px] font-mono transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:line-through ${
                            key === selectedOccDateKey
                              ? 'bg-sage border-sage text-baseDeep'
                              : 'bg-baseDeep border-gold/40 text-creamDim'
                          }`}
                        >
                          {formatLabel(o)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedPastDeadline ? (
                <div className="text-center text-creamDim text-[12.5px] py-4.5 border border-dashed border-gold/40">
                  {occurrenceOptions.length > 1 ? 'この日程の募集は締め切りました。別の日程を選んでください。' : '募集を締め切りました'}
                </div>
              ) : (
                <AttendeeForm
                  event={event}
                  occDate={selectedOccDateKey}
                  list={selectedList}
                  full={selectedFull}
                  onSubmitted={onRefresh}
                />
              )}
            </div>
          ) : (
            <OrganizerPanel eventId={event.id} list={list} allResponses={allResponses} />
          )}
        </div>
      )}
    </div>
  );
}
