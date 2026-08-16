'use client';

import { useEffect, useState } from 'react';
import { AttendanceStatus, EventConfig, ResponseRow } from '@/lib/types';
import { getDeviceId } from '@/lib/deviceId';

export default function AttendeeForm({
  event,
  occDate,
  list,
  full,
  onSubmitted
}: {
  event: EventConfig;
  occDate: string;
  list: ResponseRow[];
  full: boolean;
  onSubmitted: () => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 同姓同名の別人を誤って同一回答者として扱わないよう、端末ごとのIDで判定する
  // （名前の文字列一致ではない）。SSRとの不一致を避けるためマウント後に取得する。
  const [deviceId, setDeviceId] = useState('');
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);
  const alreadyGoing = list.some((x) => x.device_id === deviceId && x.status === 'go');

  async function handleSubmit() {
    if (!name.trim() || !status) {
      setMessage('お名前と出欠を選んでください');
      setTimeout(() => setMessage(null), 1800);
      return;
    }

    if (status === 'go' && !alreadyGoing && full) {
      setMessage('定員に達しました');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          occDate,
          name: name.trim(),
          status,
          deviceId,
          email: email.trim() || undefined
        })
      });
      if (!res.ok) throw new Error('failed');
      setSaved(true);
      await onSubmitted();
    } catch {
      setMessage('送信に失敗しました。もう一度お試しください');
    } finally {
      setSaving(false);
    }
  }

  const options: { value: AttendanceStatus; label: string; activeClass: string }[] = [
    { value: 'go', label: '参加', activeClass: 'bg-sage border-sage text-baseDeep' },
    { value: 'maybe', label: '未定', activeClass: 'bg-gold border-gold text-[#1a1204]' },
    { value: 'no', label: '不参加', activeClass: 'bg-danger border-danger text-[#1a0f0a]' }
  ];

  return (
    <div>
      <label className="block text-[10.5px] text-sage mb-2 font-medium tracking-widest uppercase" htmlFor={`name-${event.id}`}>
        お名前
      </label>
      <input
        id={`name-${event.id}`}
        type="text"
        placeholder="山田 太郎"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        className="w-full bg-baseDeep border border-gold/40 px-4 py-3 text-cream text-[14.5px] mb-4.5 placeholder:text-cream/30"
      />

      <label className="block text-[10.5px] text-sage mb-2 font-medium tracking-widest uppercase" htmlFor={`email-${event.id}`}>
        メールアドレス（任意・確認メールを送ります）
      </label>
      <input
        id={`email-${event.id}`}
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-baseDeep border border-gold/40 px-4 py-3 text-cream text-[14.5px] mb-4.5 placeholder:text-cream/30"
      />

      <label className="block text-[10.5px] text-sage mb-2 font-medium tracking-widest uppercase">出欠</label>
      {full && !alreadyGoing && (
        <p className="text-[11px] text-[#e3ab90] mb-2.5 tracking-wide">定員に達しているため「参加」は選択できません</p>
      )}
      <div className="flex gap-2 mb-5">
        {options.map((opt) => {
          const disabled = opt.value === 'go' && full && !alreadyGoing;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                setStatus(opt.value);
                setSaved(false);
              }}
              className={`flex-1 text-center py-3 border text-[12.5px] font-medium tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                status === opt.value ? opt.activeClass : 'bg-baseDeep border-gold/40 text-creamDim'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSubmit}
        className={`w-full border py-3.5 text-[13px] font-medium tracking-widest uppercase transition-all disabled:opacity-40 ${
          saved ? 'bg-panelRaised border-sage text-sage' : 'bg-transparent border-gold text-goldSoft hover:bg-gold hover:text-[#1a1204]'
        }`}
      >
        {saving ? '送信中…' : saved ? '✓ 送信しました' : message ?? '回答を送信'}
      </button>

      {event.capacity != null && (
        <p className="text-[11px] text-creamDim mt-4 text-center tracking-wide">定員 {event.capacity}名（先着順）</p>
      )}
    </div>
  );
}
