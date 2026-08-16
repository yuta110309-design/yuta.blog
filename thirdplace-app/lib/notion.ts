const NOTION_VERSION = '2022-06-28';

/** NOTION_API_KEYが未設定の環境（ローカル開発など）では何もせずnullを返す。 */
export async function notionRequest(path: string, init: RequestInit): Promise<Response | null> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return null;

  return fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
}

/**
 * Notion側のデータベース列はすべて「テキスト」型で統一している
 * （セレクト・日付型だと列の型を手動で選ぶ手間が増えるため）。
 * 日時もテキストとして書き込むので、読みやすい文字列に整形する。
 */
export function formatJst(d: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}
