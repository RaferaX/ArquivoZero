import { getSettings } from './settings';

class AudioManager {
  private music: HTMLAudioElement | null = null;
  private ambient: HTMLAudioElement | null = null;
  private ambientGain = 1;
  private duckFactor = 1;
  private sfxCache = new Map<string, HTMLAudioElement>();

  constructor() {
    window.addEventListener('azero:settings', () => {
      if (this.music) this.music.volume = this.musicVolume();
      if (this.ambient) this.ambient.volume = this.ambientVolume();
    });
  }

  private musicVolume(): number {
    const s = getSettings();
    return Math.min(1, s.master * s.music * this.duckFactor);
  }

  private ambientVolume(): number {
    const s = getSettings();
    return Math.min(1, s.master * s.sfx * this.ambientGain);
  }

  private fade(a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
    const steps = 20;
    const start = a.volume;
    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      a.volume = Math.min(1, Math.max(0, start + ((to - start) * i) / steps));
      if (i >= steps) {
        clearInterval(timer);
        done?.();
      }
    }, ms / steps);
  }

  private tryPlay(a: HTMLAudioElement, fadeMs: number): void {
    a.play()
      .then(() => this.fade(a, this.musicVolume(), fadeMs))
      .catch((err) => {
        console.warn('Música não iniciou:', err);
        const retry = () => {
          if (this.music === a && a.paused) this.tryPlay(a, fadeMs);
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
      });
  }

  /* ---------- música ---------- */

  playMusic(src: string, fadeMs = 1500): void {
    if (this.music && this.music.src.endsWith(src)) {
      if (this.music.paused) this.tryPlay(this.music, fadeMs);
      return;
    }
    this.stopMusic(fadeMs);
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0;
    this.music = a;
    this.tryPlay(a, fadeMs);
  }

  stopMusic(fadeMs = 800): void {
    const a = this.music;
    if (!a) return;
    this.music = null;
    this.fade(a, 0, fadeMs, () => a.pause());
  }

  /** Abaixa (ou restaura) a música. factor: 1 = normal, 0.3 = baixa. */
  duck(factor: number, ms = 1200): void {
    this.duckFactor = factor;
    if (this.music) this.fade(this.music, this.musicVolume(), ms);
  }

  /** Volta o fator ao normal sem mexer no volume atual. */
  resetDuck(): void {
    this.duckFactor = 1;
  }

  /* ---------- som ambiente (chuva etc.) ---------- */

  playAmbient(src: string, fadeMs = 2500, gain = 0.7): void {
    if (this.ambient) return;
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0;
    this.ambientGain = gain;
    this.ambient = a;
    a.play()
      .then(() => this.fade(a, this.ambientVolume(), fadeMs))
      .catch(() => {});
  }

  stopAmbient(fadeMs = 1500): void {
    const a = this.ambient;
    if (!a) return;
    this.ambient = null;
    this.fade(a, 0, fadeMs, () => a.pause());
  }

  /* ---------- efeitos curtos ---------- */

  /** Efeito curto. `gain` ajusta o volume relativo (0 a 1). */
  playSfx(src: string, gain = 1): void {
    const s = getSettings();
    const vol = Math.min(1, s.master * s.sfx * gain);
    if (vol <= 0) return;

    let base = this.sfxCache.get(src);
    if (!base) {
      base = new Audio(src);
      base.preload = 'auto';
      this.sfxCache.set(src, base);
    }
    const a = base.cloneNode() as HTMLAudioElement;
    a.volume = vol;
    a.play().catch(() => {});
  }
}

export const audio = new AudioManager();