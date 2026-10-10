import Phaser from 'phaser';
import { gameState } from '../state/gameState';
import { VIEW, COLOR, TEXT, FONT, addText, drawPanel } from '../visual/theme';

export interface KeypadConfig {
  title: string;
  code: string;
  onSuccess: () => void;
  onFail?: () => void;
}

const LAYOUT = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', 'OK'],
];

const PANEL = { w: 320, h: 360, y: 28 };

/** Teclado numérico reutilizável (gaveta, cofre...). */
export class Keypad {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private cellsGfx: Phaser.GameObjects.Graphics;
  private digitTexts: Phaser.GameObjects.Text[] = [];
  private typed = '';
  private cfg: KeypadConfig | null = null;
  private locked = false;
  private error = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cx = VIEW.w / 2;
    const px = cx - PANEL.w / 2;

    // fundo escuro: clicar fora fecha
    const dim = scene.add
      .rectangle(cx, VIEW.h / 2, VIEW.w, VIEW.h, 0x000000, 0.72)
      .setInteractive();
    dim.on('pointerdown', () => this.close());

    const panel = scene.add.graphics();
    drawPanel(panel, px, PANEL.y, PANEL.w, PANEL.h, { radius: 20, alpha: 0.97 });

    // impede que clicar no painel feche o teclado
    const block = scene.add
      .zone(cx, PANEL.y + PANEL.h / 2, PANEL.w, PANEL.h)
      .setInteractive();

    this.title = addText(scene, cx, PANEL.y + 26, '', {
      fontFamily: FONT.ui,
      fontSize: '12px',
      fontStyle: '600',
      color: TEXT.accent,
    }).setOrigin(0.5);

    this.cellsGfx = scene.add.graphics();

    const hint = addText(scene, cx, PANEL.y + PANEL.h - 18, 'clique fora para fechar', {
      fontFamily: FONT.ui,
      fontSize: '11px',
      color: TEXT.dim,
    }).setOrigin(0.5);

    const items: Phaser.GameObjects.GameObject[] = [
      dim,
      panel,
      block,
      this.title,
      this.cellsGfx,
      hint,
    ];

    LAYOUT.forEach((row, r) => {
      row.forEach((label, c) => {
        items.push(...this.makeKey(cx - 76 + c * 76, PANEL.y + 150 + r * 56, label));
      });
    });

    this.container = scene.add.container(0, 0, items);
    this.container.setDepth(20);
    this.container.setVisible(false);

    const onKey = (e: KeyboardEvent) => {
      if (!this.container.visible) return;
      if (/^[0-9]$/.test(e.key)) this.add(e.key);
      else if (e.key === 'Backspace') this.back();
      else if (e.key === 'Enter') this.submit();
    };
    scene.input.keyboard?.on('keydown', onKey);
    scene.events.once('shutdown', () =>
      scene.input.keyboard?.off('keydown', onKey)
    );
  }

  open(cfg: KeypadConfig): void {
    this.cfg = cfg;
    this.typed = '';
    this.locked = false;
    this.error = false;
    this.title.setText(cfg.title);
    this.buildDigits(cfg.code.length);
    this.render();
    this.container.setVisible(true);
    gameState.modalOpen = true;
  }

  close(): void {
    this.container.setVisible(false);
    gameState.modalOpen = false;
    this.typed = '';
    this.locked = false;
    this.error = false;
  }

  private buildDigits(n: number): void {
    this.digitTexts.forEach((t) => this.container.remove(t, true));
    this.digitTexts = [];
    for (let i = 0; i < n; i++) {
      const t = addText(this.scene, 0, 0, '', {
        fontFamily: FONT.ui,
        fontSize: '26px',
        fontStyle: '500',
        color: TEXT.text,
      }).setOrigin(0.5);
      this.container.add(t);
      this.digitTexts.push(t);
    }
  }

  private makeKey(x: number, y: number, label: string): Phaser.GameObjects.GameObject[] {
    const g = this.scene.add.graphics();
    const isOk = label === 'OK';

    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(isOk ? 0x3a2f14 : hover ? 0x1f2535 : 0x151923, 1);
      g.fillRoundedRect(x - 32, y - 23, 64, 46, 10);
      const lit = hover || isOk;
      g.lineStyle(1, lit ? COLOR.accent : COLOR.edge, lit ? 0.9 : 1);
      g.strokeRoundedRect(x - 31.5, y - 22.5, 63, 45, 10);
    };
    draw(false);

    const text = addText(this.scene, x, y, label, {
      fontFamily: FONT.ui,
      fontSize: label.length > 1 ? '15px' : '20px',
      fontStyle: '500',
      color: label === 'C' ? '#c98a8a' : isOk ? TEXT.accent : TEXT.text,
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(x, y, 64, 46).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerdown', () => this.press(label));

    return [g, text, zone];
  }

  private press(label: string): void {
    if (label === 'C') this.clear();
    else if (label === 'OK') this.submit();
    else this.add(label);
  }

  private add(d: string): void {
    if (!this.cfg || this.locked) return;
    if (this.typed.length >= this.cfg.code.length) return;
    this.typed += d;
    this.render();
  }

  private back(): void {
    if (this.locked) return;
    this.typed = this.typed.slice(0, -1);
    this.render();
  }

  private clear(): void {
    if (this.locked) return;
    this.typed = '';
    this.render();
  }

  /** Desenha as casinhas do código (uma por dígito). */
  private render(): void {
    const n = this.cfg?.code.length ?? 4;
    const cw = 38;
    const ch = 50;
    const gap = 8;
    const total = n * cw + (n - 1) * gap;
    const x0 = VIEW.w / 2 - total / 2;
    const y0 = PANEL.y + 54;

    const g = this.cellsGfx;
    g.clear();

    for (let i = 0; i < n; i++) {
      const x = x0 + i * (cw + gap);
      const active = i === this.typed.length && !this.error;

      g.fillStyle(0x0a0c12, 1);
      g.fillRoundedRect(x, y0, cw, ch, 9);
      g.lineStyle(1.5, this.error ? COLOR.danger : active ? COLOR.accent : COLOR.edge, 1);
      g.strokeRoundedRect(x, y0, cw, ch, 9);

      const t = this.digitTexts[i];
      if (t) {
        t.setPosition(x + cw / 2, y0 + ch / 2)
          .setText(this.typed[i] ?? '')
          .setColor(this.error ? TEXT.danger : TEXT.text);
      }
    }
  }

  private submit(): void {
    if (!this.cfg || this.locked) return;

    if (this.typed === this.cfg.code) {
      const { onSuccess } = this.cfg;
      this.close();
      onSuccess();
      return;
    }

    this.locked = true;
    this.error = true;
    this.render();
    this.cfg.onFail?.();
    this.scene.time.delayedCall(500, () => {
      this.typed = '';
      this.locked = false;
      this.error = false;
      this.render();
    });
  }
}