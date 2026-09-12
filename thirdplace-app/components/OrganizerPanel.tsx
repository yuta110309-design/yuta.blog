'use client';

import { useState } from 'react';
import { ResponseRow } from '@/lib/types';

function statusLabel(s: string) {
  return s === 'go' ? '参加' : s === 'no' ? '不参加' : '未定';
}

export default function OrganizerPanel({
  eventId,
  list,
  allResponses
}: {
  eventId: string;
  list: ResponseRow[];
  allResponses: ResponseRow[];
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const goCount = list.filter((x) => x.status === 'go').length;
  const maybeCount = list.filter((x) => x.status === 'maybe').length;
  const noCount = list.filter((x) => x.status === 'no').length;

  const todayKey = new Date().toISOString().slice(0, 10);
  const history = Object.values(
    allResponses
      .filter((r) => r.event_id === eventId && r.occ_date && r.occ_date < todayKey)
      .reduce<Record<string, ResponseRow[]>>((acc, r) => {
        acc[r.occ_date] = acc[r.occ_date] || [];
        acc[r.occ_date].push(r);
        return acc;
      }, {})
  )
    .map((rows) => ({ dateStr: rows[0].occ_date, rows }))
    .sort((a, b) => (a.dateStr < b.dateStr ? 1 : -1));

  return (
    <div>
      <div className="flex gap-2.5 mb-4">
        <div className="flex-1 text-center bg-baseDeep border border-gold/40 py-3.5">
          <span className="font-serif text-xl font-bold text-goldSoft block">{goCount}</span>
          <span className="text-[9.5px] text-creamDim tracking-wide">参加</span>
        </div>
        <div className="flex-1 text-center bg-baseDeep border border-gold/40 py-3.5">
          <span className="font-serif text-xl font-bold text-goldSoft block">{maybeCount}</span>
          <span className="text-[9.5px] text-creamDim tracking-wide">未定</span>
        </div>
        <div className="flex-1 text-center bg-baseDeep border border-gold/40 py-3.5">
          <span className="font-serif text-xl font-bold text-goldSoft block">{noCount}</span>
          <span className="text-[9.5px] text-creamDim tracking-wide">不参加</span>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="italic font-display text-[15px] text-creamDim py-2.5">まだ回答がありません</p>
      ) : (
        <div>
          {[...list]
            .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
            .map((r) => (
              <div
                key={`${r.event_id}-${r.occ_date}-${r.device_id || r.name}`}
                className="py-2.5 border-b border-white/10 text-[13px] last:border-none"
              >
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        r.status === 'go' ? 'bg-sage' : r.status === 'no' ? 'bg-danger' : 'bg-gold'
                      }`}
                    />
                    {r.name}
                  </span>
                  <span>{statusLabel(r.status)}</span>
                </div>
                {r.extra && Object.keys(r.extra).length > 0 && (
                  <p className="text-[11px] text-creamDim mt-1 pl-3.5">
                    {Object.values(r.extra).filter(Boolean).join(' / ')}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      <div
        className="text-[10.5px] tracking-wide text-sage cursor-pointer mt-5 pt-4 border-t border-white/10 select-none hover:text-goldSoft"
        onClick={() => setHistoryOpen((v) => !v)}
      >
        過去の開催履歴を見る {historyOpen ? '－' : '＋'}
      </div>

      {historyOpen && (
        <div className="mt-4">
          {history.length === 0 ? (
            <p className="italic font-display text-[15px] text-creamDim py-2.5">まだ過去の開催履歴がありません</p>
          ) : (
            history.map(({ dateStr, rows }) => {
              const [, m, d] = dateStr.split('-').map(Number);
              const go = rows.filter((x) => x.status === 'go').length;
              const maybe = rows.filter((x) => x.status === 'maybe').length;
              const no = rows.filter((x) => x.status === 'no').length;
              return (
                <div
                  key={dateStr}
                  className="flex justify-between items-center py-2.5 border-b border-white/10 text-[12.5px] last:border-none"
                >
                  <span className="font-serif text-goldSoft font-bold">
                    {m}/{d}
                  </span>
                  <span className="text-creamDim">
                    参加 {go}・未定 {maybe}・不参加 {no}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
