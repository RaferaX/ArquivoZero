import Phaser from 'phaser';
import { gameState } from '../state/gameState';

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

/** Teclado numérico reutilizável (gaveta, cofre...). */
export class Keypad {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private display: Phaser.GameObjects.Text;
  private typed = '';
  private cfg: KeypadConfig | null = null;
  private locked = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const cx = width / 2;

    const bg = scene.add
      .rectangle(cx, height / 2, width, height, 0x000000, 0.8)
      .setInteractive();
    bg.on('pointerdown', () => this.close());

    const box = scene.add
      .rectangle(cx, 235, 300, 380, 0x1a1a24)
      .setStrokeStyle(2, 0x8a8aa8)
      .setInteractive();

    this.title = scene.add
      .text(cx, 75, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e0c060',
      })
      .setOrigin(0.5);

    this.display = scene.add
      .text(cx, 125, '', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const hint = scene.add
      .text(cx, 417, 'clique fora para fechar', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#6a6a80',
      })
      .setOrigin(0.5);

    const items: Phaser.GameObjects.GameObject[] = [
      bg,
      box,
      this.title,
      this.display,
      hint,
    ];

    LAYOUT.forEach((row, r) => {
      row.forEach((label, c) => {
        items.push(...this.makeKey(cx - 80 + c * 80, 195 + r * 62, label));
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
    this.title.setText(cfg.title);
    this.display.setColor('#ffffff');
    this.render();
    this.container.setVisible(true);
    gameState.modalOpen = true;
  }

  close(): void {
    this.container.setVisible(false);
    gameState.modalOpen = false;
    this.typed = '';
    this.locked = false;
  }

  private makeKey(x: number, y: number, label: string) {
    const rect = this.scene.add
      .rectangle(x, y, 70, 54, 0x2a2a3a)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    rect.on('pointerover', () => rect.setFillStyle(0x3a3a50));
    rect.on('pointerout', () => rect.setFillStyle(0x2a2a3a));
    rect.on('pointerdown', () => this.press(label));

    return [rect, text];
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
    this.display.setColor('#ffffff');
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
    this.display.setColor('#ffffff');
    this.render();
  }

  private render(): void {
    const n = this.cfg?.code.length ?? 4;
    this.display.setText(this.typed.padEnd(n, '_').split('').join(' '));
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
    this.display.setColor('#ff5555');
    this.cfg.onFail?.();
    this.scene.time.delayedCall(500, () => {
      this.typed = '';
      this.locked = false;
      this.display.setColor('#ffffff');
      this.render();
    });
  }
}