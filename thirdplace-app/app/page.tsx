'use client';

import { useEffect, useState, useCallback } from 'react';
import { EVENTS } from '@/lib/events';
import { ResponseRow } from '@/lib/types';
import EventCard from '@/components/EventCard';

const IG_URL = 'https://www.instagram.com/the.thirdplace.ebisu?igsh=MTFuY2RzZWJjZzlnZA==';
const LINE_URL =
  'https://line.me/ti/g2/qDymAJY28KLoy_T2bjAWbS3ZixI-SohbiUrRHQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default';

export default function Page() {
  const [mode, setMode] = useState<'organizer' | 'attendee'>('attendee');
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/responses', { cache: 'no-store' });
      const data = await res.json();
      setResponses(Array.isArray(data) ? data : []);
    } catch {
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-[600px] mx-auto px-6 pt-12 pb-[70px]">
      {/* エンブレム */}
      <div className="flex justify-center mb-7">
        <div className="w-[168px] h-[168px] rounded-full border border-gold flex items-center justify-center">
          <div className="w-[148px] h-[148px] rounded-full border border-gold/40 flex flex-col items-center justify-center text-center px-3.5">
            <div className="w-[3px] h-[3px] bg-gold rounded-full mb-2.5" />
            <div className="font-display font-medium text-[12px] tracking-wide uppercase whitespace-nowrap">The Third Place</div>
            <div className="font-display text-[9px] tracking-[0.4em] uppercase text-gold mt-2.5">Ebisu</div>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] tracking-[0.4em] text-sage uppercase mb-3 font-normal">Event Attendance</div>
      <h1 className="font-serif font-bold text-center text-[clamp(26px,7vw,32px)] tracking-wide mb-7">出欠確認</h1>

      <div className="flex items-center justify-center gap-3.5 mb-7 text-gold">
        <span className="h-px w-14 bg-gradient-to-r from-transparent to-gold/40" />
        <span className="text-[13px] opacity-90">❧</span>
        <span className="h-px w-14 bg-gradient-to-l from-transparent to-gold/40" />
      </div>

      {/* 操作の流れ */}
      <div className="flex items-center justify-center flex-wrap gap-2.5 mb-7">
        {['イベントを選ぶ', 'お名前を入力', '出欠を選んで送信'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/20 text-xs mr-1">→</span>}
            <span className="w-[22px] h-[22px] rounded-full border border-gold text-goldSoft font-serif text-[11px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-[12px] text-creamDim whitespace-nowrap">{step}</span>
          </div>
        ))}
      </div>

      {/* LINEオープンチャット導線 */}
      <div className="border border-gold/40 bg-panel px-5 py-4.5 mb-7 text-center">
        <p className="text-creamDim text-[12px] leading-loose mb-3.5">
          予約・出欠はこのページから。イベント情報や日々の交流は<b className="text-goldSoft font-medium">LINEオープンチャット</b>でも発信しています。
        </p>
        <a
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-gold text-goldSoft text-[12px] tracking-wide px-5 py-2.5 hover:bg-gold hover:text-[#1a1204] transition-colors"
        >
          オープンチャットに参加する ↗
        </a>
      </div>

      {/* タブ */}
      <div className="flex border border-gold/40 mb-7">
        <button
          type="button"
          onClick={() => setMode('organizer')}
          className={`flex-1 text-center py-4 font-serif text-[13px] font-bold tracking-wide ${
            mode === 'organizer' ? 'bg-panelRaised text-goldSoft' : 'bg-baseDeep text-creamDim'
          }`}
        >
          幹事
        </button>
        <button
          type="button"
          onClick={() => setMode('attendee')}
          className={`flex-1 text-center py-4 font-serif text-[13px] font-bold tracking-wide border-l border-gold/40 ${
            mode === 'attendee' ? 'bg-panelRaised text-goldSoft' : 'bg-baseDeep text-creamDim'
          }`}
        >
          参加者
        </button>
      </div>

      {mode === 'attendee' && (
        <div className="border border-white/10 border-l-2 border-l-gold px-5 py-4 mb-7 text-[11.5px] text-creamDim leading-loose bg-panel">
          <b className="text-goldSoft font-medium">回答について：</b>
          ここで送信した内容はスプレッドシートに保存され、幹事タブから確認できます。
        </div>
      )}

      {/* イベント一覧 */}
      {loading ? (
        <p className="text-center text-creamDim text-sm py-10">読み込み中…</p>
      ) : (
        EVENTS.map((ev) => (
          <EventCard key={ev.id} event={ev} mode={mode} allResponses={responses} onRefresh={refresh} />
        ))
      )}

      {/* 注意書き */}
      <div className="border border-danger/40 border-l-2 border-l-danger px-5 py-4 mt-10 text-left">
        <p className="font-serif text-[12px] font-bold text-[#e3ab90] tracking-wide mb-2">注意</p>
        <p className="text-[11px] text-creamDim leading-loose">
          リンクが開けない、内容が古く感じる場合はブラウザのキャッシュが原因のことがあります。再読み込みしてもなお改善しない場合はお知らせください。
        </p>
      </div>

      <div className="text-center text-creamDim text-[10px] mt-6 tracking-wide leading-loose opacity-60">
        THE THIRDPLACE EBISU 運営専用ツール
        <br />
        <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="text-goldSoft no-underline">
          @the.thirdplace.ebisu
        </a>{' '}
        ／{' '}
        <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="text-goldSoft no-underline">
          LINEオープンチャット
        </a>
      </div>
    </div>
  );
}
