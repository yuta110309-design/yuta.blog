'use client';

import { useState } from 'react';
import { EventConfig, ResponseRow } from '@/lib/types';
import { computeOccurrence, dateKey, formatLabel, recurrenceLabel } from '@/lib/events';
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

  const occurrence = computeOccurrence(event.recurrence, new Date());
  const occDate = occurrence ? dateKey(occurrence) : '';
  const dateLabel = event.dateLabelOverride || (occurrence ? formatLabel(occurrence) : '日程未定');
  const timeLabel = event.timeLabelOverride || (event.recurrence?.time ? `${event.recurrence.time}〜` : '');

  const deadline =
    occurrence && event.deadlineDaysBefore != null
      ? new Date(occurrence.getTime() - event.deadlineDaysBefore * 86400000)
      : null;
  if (deadline) deadline.setHours(23, 59, 59, 999);
  const deadlineLabel = deadline ? `${formatLabel(deadline)}締切` : '日程確定後に設定';
  const pastDeadline = deadline ? new Date() > deadline : false;

  const list = allResponses.filter((r) => r.event_id === event.id && (r.occ_date || '') === occDate);
  const goCount = list.filter((x) => x.status === 'go').length;
  const full = event.capacity != null && goCount >= event.capacity;
  const locked = full || pastDeadline;

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
            pastDeadline ? (
              <div className="text-center text-creamDim text-[12.5px] py-4.5 border border-dashed border-gold/40">募集を締め切りました</div>
            ) : (
              <AttendeeForm event={event} occDate={occDate} list={list} full={full} onSubmitted={onRefresh} />
            )
          ) : (
            <OrganizerPanel eventId={event.id} list={list} allResponses={allResponses} />
          )}
        </div>
      )}
    </div>
  );
}
