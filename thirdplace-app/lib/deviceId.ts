const STORAGE_KEY = 'thirdplaceDeviceId';

/** 同姓同名の別回答者を区別するため、端末ごとにランダムなIDを割り当てて永続化する。 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}
