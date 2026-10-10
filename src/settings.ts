export interface Settings {
  master: number; // 0 a 1
  music: number;
  sfx: number;
  textSpeed: 'lenta' | 'normal' | 'rapida';
}

const KEY = 'arquivo-zero:settings';

const defaults: Settings = {
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  textSpeed: 'normal',
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

let current: Settings = load();

export const getSettings = (): Settings => current;

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* sem localStorage, segue sem salvar */
  }
  window.dispatchEvent(new CustomEvent('azero:settings', { detail: current }));
}