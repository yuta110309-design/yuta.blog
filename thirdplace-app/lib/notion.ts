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
