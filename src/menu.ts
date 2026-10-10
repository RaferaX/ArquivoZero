import { startGame, stopGame, pauseGame, resumeGame } from './game';
import { getSettings, updateSettings } from './settings';
import type { Settings } from './settings';
import { audio } from './audio';
import { playIntro, setIntroPaused, cancelIntro } from './intro';
import { gameState } from './state/gameState';

const MENU_MUSIC = encodeURI('/audio/Registro Apagado.mp3');
const SAVE_KEY = 'arquivo-zero:save'; // ajuste para a chave que o seu gameState usar
const SFX_CLICK = '/audio/click-dark.wav';
const SFX_HOVER = '/audio/hover-dark.mp3';
const RAIN = '/audio/rain-dark.wav';

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

type Panel = 'main' | 'settings' | 'credits';

let inGame = false;
let inIntro = false;
let paused = false;

/* ---------- save ---------- */

function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

function refreshContinue(): void {
  $('btn-continue').hidden = !hasSave();
}

/* ---------- painéis do menu ---------- */

function showPanel(name: Panel): void {
  document
    .querySelectorAll<HTMLElement>('.menu-panel')
    .forEach((p) => (p.hidden = p.dataset.panel !== name));
}

/* ---------- entrar / sair do jogo ---------- */

function enterGame(): void {
  audio.stopMusic();
  $('menu').classList.add('hidden');
  $('game').classList.remove('hidden');
  $('gear').classList.remove('hidden');
  inGame = true;
  paused = false;
  startGame();
}

export function showMenu(): void {
  inGame = false;
  inIntro = false;
  paused = false;
  cancelIntro();
  stopGame();
  $('pause').classList.add('hidden');
  $('gear').classList.add('hidden');
  $('game').classList.add('hidden');
  $('menu').classList.remove('hidden');
  showPanel('main');
  refreshContinue();
  audio.resetDuck();
  audio.playMusic(MENU_MUSIC);
  audio.stopAmbient();
}

/* ---------- pausa (jogo e abertura) ---------- */

function openPause(): void {
  if ((!inGame && !inIntro) || paused) return;
  paused = true;
  if (inGame) {
    pauseGame();
    audio.duck(0.4, 400);
  }
  if (inIntro) setIntroPaused(true);
  syncSettingsUI();
  $('pause').classList.remove('hidden');
}

function closePause(): void {
  if (!paused) return;
  paused = false;
  $('pause').classList.add('hidden');
  setIntroPaused(false);
  if (inGame) {
    resumeGame();
    audio.duck(1, 400);
  }
}

/* ---------- configurações (menu e pausa compartilham) ---------- */

const KEYS = ['master', 'music', 'sfx'] as const;

function syncSettingsUI(): void {
  const s = getSettings();
  for (const prefix of ['opt', 'pause']) {
    for (const key of KEYS) {
      const input = document.getElementById(
        `${prefix}-${key}`
      ) as HTMLInputElement | null;
      const label = document.getElementById(`${prefix}-${key}-val`);
      if (!input) continue;
      input.value = String(Math.round(s[key] * 100));
      if (label) label.textContent = `${input.value}%`;
    }
    const speed = document.getElementById(
      `${prefix}-text-speed`
    ) as HTMLSelectElement | null;
    if (speed) speed.value = s.textSpeed;
  }
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

function bindSettings(prefix: 'opt' | 'pause', fullscreenId: string): void {
  for (const key of KEYS) {
    const input = $<HTMLInputElement>(`${prefix}-${key}`);
    input.addEventListener('input', () => {
      updateSettings({ [key]: Number(input.value) / 100 });
    });
  }

  const speed = $<HTMLSelectElement>(`${prefix}-text-speed`);
  speed.addEventListener('change', () =>
    updateSettings({ textSpeed: speed.value as Settings['textSpeed'] })
  );

  $(fullscreenId).addEventListener('click', toggleFullscreen);
}

/* ---------- tela de carregamento ---------- */

function initSplash(): void {
  const splash = $('splash');
  const fill = $('bar-fill');
  const pctEl = $('splash-pct');
  const msg = $('splash-msg');
  const btn = $<HTMLButtonElement>('splash-btn');
  let started = false;
  let target = 0; // progresso real (0 a 100)
  let shown = 0; // progresso exibido (suaviza a subida)

  const setPct = (v: number) => {
    const p = Math.round(Math.min(100, Math.max(0, v)));
    fill.style.width = `${p}%`;
    pctEl.textContent = `${p}%`;
  };

  const loop = setInterval(() => {
    if (shown < target) {
      shown = Math.min(target, shown + 1.5);
      setPct(shown);
    }
    if (shown >= 100) {
      clearInterval(loop);
      msg.hidden = true;
      btn.hidden = false;
      btn.focus();
    }
  }, 40);

  async function preload(urls: string[]): Promise<void> {
    let finished = 0;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body?.getReader();
        if (!reader) {
          await res.blob();
        } else {
          let got = 0;
          for (;;) {
            const { done: end, value } = await reader.read();
            if (end) break;
            got += value.length;
            if (total) target = ((finished + got / total) / urls.length) * 100;
          }
        }
      } catch {
        /* segue sem o arquivo */
      }
      finished++;
      target = (finished / urls.length) * 100;
    }
    target = 100;
  }

  preload([MENU_MUSIC, SFX_CLICK, SFX_HOVER, RAIN]);
  setTimeout(() => (target = 100), 10000); // segurança: nunca trava

  btn.addEventListener('click', () => {
    if (started) return;
    started = true;
    audio.playMusic(MENU_MUSIC, 3000);
    splash.classList.add('fade');
    setTimeout(() => splash.remove(), 1000);
  });
}

/* ---------- init ---------- */

export function initMenu(): void {
  bindSettings('opt', 'btn-fullscreen');
  bindSettings('pause', 'pause-fullscreen');
  syncSettingsUI();
  window.addEventListener('azero:settings', syncSettingsUI);

  showPanel('main');
  refreshContinue();
  initSplash();

  // menu principal
  $('btn-new').addEventListener('click', async () => {
    if (hasSave() && !confirm('Isso apaga o progresso atual. Continuar?')) return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignora */
    }

    inIntro = true;
    $('gear').classList.remove('hidden');
    const completed = await playIntro();
    inIntro = false;
    if (!completed) return; // voltou ao menu durante a abertura
    enterGame();
    gameState.reset();
  });

  $('btn-continue').addEventListener('click', enterGame);
  $('btn-settings').addEventListener('click', () => showPanel('settings'));
  $('btn-credits').addEventListener('click', () => showPanel('credits'));
  document
    .querySelectorAll<HTMLElement>('[data-back]')
    .forEach((b) => b.addEventListener('click', () => showPanel('main')));

  // botão de configurações, ESC e painel de pausa (jogo e abertura)
  $('gear').addEventListener('click', openPause);
  $('pause-resume').addEventListener('click', closePause);
  $('pause-menu').addEventListener('click', () => {
    if (!confirm('Voltar ao menu? O progresso não salvo será perdido.')) return;
    showMenu();
  });
    // a tela final do capítulo volta ao menu por este evento
  window.addEventListener('azero:menu', showMenu);

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.repeat) return;
    if (!inGame && !inIntro) return;
    if (paused) closePause();
    else openPause();
  });

  // som em todos os botões (hover e clique)
  document.addEventListener('mouseover', (e) => {
    const btn = (e.target as HTMLElement).closest('.btn');
    if (btn && !btn.contains(e.relatedTarget as Node)) {
      audio.playSfx(SFX_HOVER, 0.5);
    }
  });

  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.btn')) audio.playSfx(SFX_CLICK);
  });
}