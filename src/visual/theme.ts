import Phaser from 'phaser';

/** Todas as cenas são escritas nesta resolução de design. */
export const VIEW = { w: 960, h: 540 };

/** Fator de renderização: o jogo é desenhado em VIEW × SCALE (2 → 1920×1080). */
export const SCALE = 2;
export const GAME = { w: VIEW.w * SCALE, h: VIEW.h * SCALE };

export const COLOR = {
  bg: 0x07080c,
  panel: 0x10131b,
  edge: 0x2a2e3d,
  accent: 0xd9b25f, // âmbar, a cor da lâmpada
  danger: 0xc0392b,
  ok: 0x4caf50,
};

export const TEXT = {
  text: '#e8e4da',
  soft: '#c4c0b6',
  dim: '#9a9aae',
  accent: '#d9b25f',
  danger: '#ff6b6b',
};

export const FONT = {
  ui: "'Inter', system-ui, sans-serif",
  story: "'Lora', Georgia, serif",
};

/** Faz a câmera da cena mostrar a área de design (VIEW) em tela cheia. */
export function fitCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(SCALE);
  cam.centerOn(VIEW.w / 2, VIEW.h / 2);
}

/** Texto nítido: o canvas do texto é gerado na densidade do jogo. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT.ui,
    resolution: SCALE,
    ...style,
  });
}

export interface PanelStyle {
  radius?: number;
  fill?: number;
  alpha?: number;
  stroke?: number;
  shadow?: boolean;
}

/** Painel de cantos arredondados com sombra suave e borda fina. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  s: PanelStyle = {}
): void {
  const r = s.radius ?? 12;

  if (s.shadow !== false) {
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(0x000000, 0.07);
      g.fillRoundedRect(x - i, y - i + 4, w + i * 2, h + i * 2, r + i);
    }
  }

  g.fillStyle(s.fill ?? COLOR.panel, s.alpha ?? 0.92);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(1, s.stroke ?? COLOR.edge, 1);
  g.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
}