import Phaser from 'phaser';
import { gameState } from '../state/gameState';
import { getSettings } from '../settings';
import {
  VIEW,
  COLOR,
  TEXT,
  FONT,
  addText,
  drawPanel,
  fitCamera,
} from '../visual/theme';

const MSG_DELAY = { lenta: 40, normal: 20, rapida: 8 };
const MSG = { x: 40, y: 398, w: 880, h: 128 };
const HEADER_H = 74;

// Tempos do painel de mensagens (em milissegundos)
const HIDE = {
  base: 5500,    // quanto tempo fica na tela depois de terminar de digitar
  perChar: 30,   // tempo extra por caractere além de 120 (mensagens longas)
  max: 12000,    // limite máximo de espera
  fadeOut: 500,  // duração do fade ao sumir
  fadeIn: 180,   // duração do fade ao voltar
  retry: 1500,   // se o mouse estiver em cima, espera mais um pouco
};

export class UIScene extends Phaser.Scene {
  private msgPanel!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private tagText!: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;
  private fadeTween?: Phaser.Tweens.Tween;
  private typing = false;

  private counterGfx!: Phaser.GameObjects.Graphics;
  private counterText!: Phaser.GameObjects.Text;
  private keyChip!: Phaser.GameObjects.Text;
  private counterZone!: Phaser.GameObjects.Zone;

  private diary!: Phaser.GameObjects.Container;
  private diaryList!: Phaser.GameObjects.Container;
  private diaryHeight = 0;

  private tooltip!: Phaser.GameObjects.Container;
  private tipGfx!: Phaser.GameObjects.Graphics;
  private tipText!: Phaser.GameObjects.Text;
  private tipW = 0;
  private tipH = 0;
  private pointerWorld = new Phaser.Math.Vector2();

  private typeTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('UIScene');
  }

  create() {
    fitCamera(this);

    addText(this, 24, 18, 'ARQUIVO ZERO', {
      fontFamily: FONT.story,
      fontSize: '14px',
      color: TEXT.dim,
    }).setAlpha(0.8);

    this.createMessagePanel();
    this.createCounter();
    this.createDiary();
    this.createTooltip();

    this.input.keyboard?.on('keydown-I', () => this.togglePanel());

    // M: mostra de novo a última mensagem depois que ela sumiu
    this.input.keyboard?.on('keydown-M', () => {
      this.showPanel();
      this.scheduleHide(HIDE.base);
    });

    this.input.on(
      'wheel',
      (
        _p: Phaser.Input.Pointer,
        _o: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number
      ) => {
        if (this.diary.visible) this.scrollList(dy);
      }
    );

    // As salas se comunicam com a interface por eventos
    this.game.events.on('hover', (text: string | null) => this.setTooltip(text));
    this.game.events.on('message', (text: string) => this.showMessage(text));
    this.game.events.on('inventory-changed', () => this.refreshInventory());

    this.refreshInventory();
    this.showMessage(
      'Madrugada. Estou sozinha no prédio. A pasta continua aberta sobre a mesa.'
    );
  }

  /** O tooltip acompanha o mouse, sem sair da tela. */
  update() {
    if (!this.tooltip.visible) return;
    const p = this.input.activePointer;
    const w = this.cameras.main.getWorldPoint(p.x, p.y, this.pointerWorld);
    const x = Phaser.Math.Clamp(w.x + 16, 8, VIEW.w - this.tipW - 8);
    const y = Phaser.Math.Clamp(w.y + 22, 8, VIEW.h - this.tipH - 8);
    this.tooltip.setPosition(x, y);
  }

  // ---------- mensagens ----------

  private createMessagePanel() {
    const g = this.add.graphics();
    drawPanel(g, MSG.x, MSG.y, MSG.w, MSG.h, { radius: 16, alpha: 0.82 });
    g.fillStyle(COLOR.accent, 1);
    g.fillRoundedRect(MSG.x + 16, MSG.y + 18, 3, MSG.h - 36, 1.5);

    this.messageText = addText(this, MSG.x + 34, MSG.y + 16, '', {
      fontFamily: FONT.story,
      fontSize: '17px',
      color: TEXT.text,
      lineSpacing: 5,
      wordWrap: { width: MSG.w - 70 },
    });

    this.tagText = addText(this, MSG.x + 34, MSG.y + MSG.h - 30, '', {
      fontFamily: FONT.ui,
      fontSize: '12px',
      fontStyle: '600',
      color: TEXT.accent,
    });

    // As três peças viram um só objeto, para o fade valer para todas
    this.msgPanel = this.add.container(0, 0, [g, this.messageText, this.tagText]);
  }

  /** Mostra a mensagem digitando; "[Nova pista: ...]" vira uma etiqueta à parte. */
  private showMessage(raw: string) {
    this.typeTimer?.remove();
    this.showPanel(); // traz o painel de volta e cancela a contagem anterior
    this.typing = true;

    const m = raw.match(/^([\s\S]*?)\n\[(.+)\]$/);
    const body = m ? m[1] : raw;
    const tag = m ? m[2] : '';

    const delay = MSG_DELAY[getSettings().textSpeed] ?? 20;
    const wrapped = this.messageText.getWrappedText(body).join('\n');

    this.messageText.setText('');
    this.tagText.setText('');

    let i = 0;
    this.typeTimer = this.time.addEvent({
      delay,
      repeat: Math.max(0, wrapped.length - 1),
      callback: () => {
        i++;
        this.messageText.setText(wrapped.slice(0, i));
        if (i >= wrapped.length) {
          if (tag) this.tagText.setText(tag.toUpperCase());
          this.typing = false;
          // mensagens longas ganham mais tempo de leitura
          const hold = Math.min(
            HIDE.max,
            HIDE.base + Math.max(0, body.length - 120) * HIDE.perChar
          );
          this.scheduleHide(hold);
        }
      },
    });
  }

  /** Painel visível de novo (fade rápido) e sem contagem para sumir. */
  private showPanel() {
    this.hideTimer?.remove();
    this.fadeTween?.stop();
    this.fadeTween = this.tweens.add({
      targets: this.msgPanel,
      alpha: 1,
      duration: HIDE.fadeIn,
    });
  }

  private scheduleHide(delay: number) {
    this.hideTimer?.remove();
    this.hideTimer = this.time.delayedCall(delay, () => this.hidePanel());
  }

  private hidePanel() {
    // ainda digitando, ou mouse em cima do painel: espera mais um pouco
    if (this.typing || this.pointerOverPanel()) {
      this.scheduleHide(HIDE.retry);
      return;
    }
    this.fadeTween?.stop();
    this.fadeTween = this.tweens.add({
      targets: this.msgPanel,
      alpha: 0,
      duration: HIDE.fadeOut,
    });
  }

  private pointerOverPanel(): boolean {
    const p = this.input.activePointer;
    if (p.wasTouch) return false; // no toque não existe "mouse em cima"
    const w = this.cameras.main.getWorldPoint(p.x, p.y, this.pointerWorld);
    return (
      w.x >= MSG.x && w.x <= MSG.x + MSG.w && w.y >= MSG.y && w.y <= MSG.y + MSG.h
    );
  }

  // ---------- contador do diário ----------

  private createCounter() {
    this.counterGfx = this.add.graphics();
    this.keyChip = addText(this, 0, 0, 'I', {
      fontFamily: FONT.ui,
      fontSize: '11px',
      fontStyle: '600',
      color: TEXT.dim,
    }).setOrigin(0.5);
    this.counterText = addText(this, 0, 0, '', {
      fontFamily: FONT.ui,
      fontSize: '13px',
      fontStyle: '500',
      color: TEXT.text,
    }).setOrigin(0, 0.5);
    this.counterZone = this.add
      .zone(0, 0, 10, 10)
      .setInteractive({ useHandCursor: true });
    this.counterZone.on('pointerdown', () => this.togglePanel());
  }

  private redrawCounter(count: number) {
    this.counterText.setText(`Diário  ${count}`);

    const h = 28;
    const w = this.counterText.width + 52;
    const x = VIEW.w - 64 - w;
    const y = 14;

    this.counterGfx.clear();
    drawPanel(this.counterGfx, x, y, w, h, { radius: 14, alpha: 0.7, shadow: false });
    this.counterGfx.fillStyle(0xffffff, 0.08);
    this.counterGfx.fillRoundedRect(x + 6, y + 5, 18, 18, 5);

    this.keyChip.setPosition(x + 15, y + h / 2);
    this.counterText.setPosition(x + 32, y + h / 2);
    this.counterZone.setPosition(x + w / 2, y + h / 2).setSize(w, h);
  }

  // ---------- diário ----------

  private createDiary() {
    const bg = this.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, COLOR.bg, 0.94)
      .setInteractive();
    bg.on('pointerdown', () => this.togglePanel());

    this.diaryList = this.add.container(0, 0);

    // barra do topo: opaca, cobre o texto quando ele rola para cima
    const header = this.add.graphics();
    header.fillStyle(COLOR.bg, 1);
    header.fillRect(0, 0, VIEW.w, HEADER_H);
    header.lineStyle(1, COLOR.edge, 1);
    header.lineBetween(0, HEADER_H, VIEW.w, HEADER_H);

    const title = addText(this, 100, 22, 'Diário de Helena', {
      fontFamily: FONT.story,
      fontSize: '26px',
      color: TEXT.accent,
    });
    const hint = addText(
      this,
      VIEW.w - 100,
      32,
      'I ou clique para fechar  ·  role para ver mais',
      { fontFamily: FONT.ui, fontSize: '12px', color: TEXT.dim }
    ).setOrigin(1, 0);

    this.diary = this.add.container(0, 0, [bg, this.diaryList, header, title, hint]);
    this.diary.setVisible(false);
  }

  private buildDiary() {
    this.diaryList.removeAll(true);

    const left = 100;
    const width = VIEW.w - 200;
    let y = 98;

    const heading = (label: string) => {
      const t = addText(this, left, y, label.toUpperCase(), {
        fontFamily: FONT.ui,
        fontSize: '11px',
        fontStyle: '600',
        color: TEXT.dim,
      });
      this.diaryList.add(t);
      y += 26;
    };

    const entry = (title: string, body: string) => {
      const a = addText(this, left, y, title, {
        fontFamily: FONT.ui,
        fontSize: '15px',
        fontStyle: '600',
        color: TEXT.text,
      });
      this.diaryList.add(a);
      y += a.height + 4;

      const b = addText(this, left, y, body, {
        fontFamily: FONT.story,
        fontSize: '15px',
        color: TEXT.soft,
        wordWrap: { width },
        lineSpacing: 4,
      });
      this.diaryList.add(b);
      y += b.height + 18;
    };

    const items = gameState.getItems();
    const clues = gameState.getClues();

    heading('Itens');
    if (items.length) {
      items.forEach((i) => entry(i.title, i.text));
    } else {
      const none = addText(this, left, y, 'Nenhum item ainda.', {
        fontFamily: FONT.story,
        fontSize: '15px',
        fontStyle: 'italic',
        color: TEXT.dim,
      });
      this.diaryList.add(none);
      y += none.height + 18;
    }

    y += 8;
    heading('Anotações');
    clues.forEach((c) => entry(c.title, c.text));

    this.diaryHeight = y;
  }

  private scrollList(dy: number) {
    const maxScroll = Math.max(0, this.diaryHeight - (VIEW.h - 24));
    this.diaryList.y = Phaser.Math.Clamp(this.diaryList.y - dy * 0.6, -maxScroll, 0);
  }

  private togglePanel() {
    if (gameState.modalOpen) return; // teclado aberto: não abre o diário
    this.setTooltip(null); // evita tooltip preso ao abrir o diário
    const show = !this.diary.visible;
    if (show) this.diaryList.y = 0;
    this.diary.setVisible(show);
  }

  private refreshInventory() {
    const total = gameState.getItems().length + gameState.getClues().length;
    this.redrawCounter(total);
    this.buildDiary();
  }

  // ---------- tooltip ----------

  private createTooltip() {
    this.tipGfx = this.add.graphics();
    this.tipText = addText(this, 12, 7, '', {
      fontFamily: FONT.ui,
      fontSize: '13px',
      fontStyle: '500',
      color: TEXT.text,
    });
    this.tooltip = this.add
      .container(0, 0, [this.tipGfx, this.tipText])
      .setDepth(100)
      .setVisible(false);
  }

  private setTooltip(text: string | null) {
    if (!text) {
      this.tooltip.setVisible(false);
      return;
    }
    this.tipText.setText(text);
    this.tipW = this.tipText.width + 24;
    this.tipH = this.tipText.height + 14;

    this.tipGfx.clear();
    drawPanel(this.tipGfx, 0, 0, this.tipW, this.tipH, { radius: 10, alpha: 0.92 });
    this.tooltip.setVisible(true);
  }
}