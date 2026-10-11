import Phaser from 'phaser';
import { gameState } from '../state/gameState';
import { getSettings } from '../settings';
import { audio } from '../audio';
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

// Teclas de atalho (troque aqui se quiser outras)
const KEY_INVENTORY = 'I';
const KEY_DIARY = 'D';

// Sons
const SFX_ZIP_OPEN = '/audio/zip-open.mp3';
const SFX_PAGE = '/audio/page-turn.mp3';

// Grade do inventário: 4 colunas x 3 linhas = 12 slots
const INV = { cols: 4, rows: 3, slot: 84, gap: 14, left: 100, top: 110 };

// Diário: livro aberto (SVG de 820x480) centrado na tela
const BOOK = {
  x: 70, y: 32, w: 820, h: 480,        // onde o livro aparece
  leftX: 130, rightX: 532, colW: 298,  // colunas de texto das duas páginas
  textTop: 96, textH: 330,             // topo e altura útil do texto
  numY: 456,                           // linha do número da página
  flipMs: 170,                         // metade da duração da virada
};
const ENTRY_GAP = 18;

// Cores da "tinta" sobre o papel
const INK = { title: '#2d2218', body: '#44362a', dim: '#7d6a4f', red: '#8a2f33' };
const TITLE_STYLE = {
  fontFamily: FONT.story,
  fontSize: '17px',
  fontStyle: 'bold',
  color: INK.title,
};
const BODY_STYLE = {
  fontFamily: FONT.story,
  fontSize: '15px',
  fontStyle: 'italic',
  color: INK.body,
  lineSpacing: 5,
};

// Tempos do painel de mensagens (em milissegundos)
const HIDE = {
  base: 5500,    // quanto tempo fica na tela depois de terminar de digitar
  perChar: 30,   // tempo extra por caractere além de 120 (mensagens longas)
  max: 12000,    // limite máximo de espera
  fadeOut: 500,  // duração do fade ao sumir
  fadeIn: 180,   // duração do fade ao voltar
  retry: 1500,   // se o mouse estiver em cima, espera mais um pouco
};

// Os ícones dos itens são carregados aqui: public/svg/item-<id>.svg
const ITEM_ICONS = ['lupa', 'fita', 'cartao'];

interface Pill {
  gfx: Phaser.GameObjects.Graphics;
  chip: Phaser.GameObjects.Text;
  text: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class UIScene extends Phaser.Scene {
  private msgPanel!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private tagText!: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;
  private fadeTween?: Phaser.Tweens.Tween;
  private typing = false;

  private diaryPill!: Pill;
  private invPill!: Pill;

  private diary!: Phaser.GameObjects.Container;
  private bookContent!: Phaser.GameObjects.Container;
  private prevBtn!: Phaser.GameObjects.Text;
  private nextBtn!: Phaser.GameObjects.Text;
  private diaryPages: number[][] = []; // cada página guarda os índices das anotações
  private spread = 0;                  // qual par de páginas está aberto
  private flipping = false;

  private inventory!: Phaser.GameObjects.Container;
  private invSlots!: Phaser.GameObjects.Container;
  private invSel!: Phaser.GameObjects.Graphics;
  private invTitle!: Phaser.GameObjects.Text;
  private invBody!: Phaser.GameObjects.Text;
  private selectedSlot = -1;

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

  preload() {
    this.load.svg('diario', '/svg/diario.svg', { scale: 2 });
    ITEM_ICONS.forEach((id) =>
      this.load.svg(`item-${id}`, `/svg/item-${id}.svg`, { scale: 2 })
    );
  }

  create() {
    fitCamera(this);

    addText(this, 24, 18, 'ARQUIVO ZERO', {
      fontFamily: FONT.story,
      fontSize: '14px',
      color: TEXT.dim,
    }).setAlpha(0.8);

    this.createMessagePanel();
    this.createPills();
    this.createDiary();
    this.createInventory();
    this.createTooltip();

    this.input.keyboard?.on(`keydown-${KEY_INVENTORY}`, () => this.toggleInventory());
    this.input.keyboard?.on(`keydown-${KEY_DIARY}`, () => this.toggleDiary());

    // setas e roda do mouse viram as páginas do diário
    this.input.keyboard?.on('keydown-LEFT', () => {
      if (this.diary.visible) this.turnPage(-1);
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      if (this.diary.visible) this.turnPage(1);
    });
    this.input.on(
      'wheel',
      (
        _p: Phaser.Input.Pointer,
        _o: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number
      ) => {
        if (this.diary.visible) this.turnPage(dy > 0 ? 1 : -1);
      }
    );

    // M: mostra de novo a última mensagem depois que ela sumiu
    this.input.keyboard?.on('keydown-M', () => {
      this.showPanel();
      this.scheduleHide(HIDE.base);
    });

    // As salas se comunicam com a interface por eventos
    this.game.events.on('hover', (text: string | null) => this.setTooltip(text));
    this.game.events.on('message', (text: string) => this.showMessage(text));
    this.game.events.on('inventory-changed', () => this.refreshAll());

    this.refreshAll();
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

  // ---------- botões do canto (Diário e Inventário) ----------

  private createPills() {
    this.diaryPill = this.createPill(KEY_DIARY, () => this.toggleDiary());
    this.invPill = this.createPill(KEY_INVENTORY, () => this.toggleInventory());
  }

  private createPill(key: string, onClick: () => void): Pill {
    const gfx = this.add.graphics();
    const chip = addText(this, 0, 0, key, {
      fontFamily: FONT.ui,
      fontSize: '11px',
      fontStyle: '600',
      color: TEXT.dim,
    }).setOrigin(0.5);
    const text = addText(this, 0, 0, '', {
      fontFamily: FONT.ui,
      fontSize: '13px',
      fontStyle: '500',
      color: TEXT.text,
    }).setOrigin(0, 0.5);
    const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    return { gfx, chip, text, zone };
  }

  /** Desenha o botão com a borda direita em `right` e devolve a borda esquerda. */
  private drawPill(p: Pill, label: string, right: number): number {
    p.text.setText(label);

    const h = 28;
    const w = p.text.width + 52;
    const x = right - w;
    const y = 14;

    p.gfx.clear();
    drawPanel(p.gfx, x, y, w, h, { radius: 14, alpha: 0.7, shadow: false });
    p.gfx.fillStyle(0xffffff, 0.08);
    p.gfx.fillRoundedRect(x + 6, y + 5, 18, 18, 5);

    p.chip.setPosition(x + 15, y + h / 2);
    p.text.setPosition(x + 32, y + h / 2);
    p.zone.setPosition(x + w / 2, y + h / 2).setSize(w, h);
    return x;
  }

  // ---------- diário (livro aberto) ----------

  private createDiary() {
    // fundo escuro: clicar fora do livro fecha o diário
    const bg = this.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, COLOR.bg, 0.94)
      .setInteractive();
    bg.on('pointerdown', () => this.toggleDiary());

    const cx = BOOK.x + BOOK.w / 2;
    const cy = BOOK.y + BOOK.h / 2;
    const book = this.add.image(cx, cy, 'diario').setDisplaySize(BOOK.w, BOOK.h);

    // impede que clicar nas páginas feche o diário
    const block = this.add.zone(cx, cy, BOOK.w, BOOK.h).setInteractive();

    // as páginas são redesenhadas aqui a cada mudança ou virada
    this.bookContent = this.add.container(0, 0);

    const navStyle = {
      fontFamily: FONT.story,
      fontSize: '14px',
      fontStyle: 'italic',
      color: INK.dim,
    };
    this.prevBtn = addText(this, BOOK.leftX, BOOK.numY - 9, '‹ anterior', navStyle)
      .setInteractive({ useHandCursor: true });
    this.nextBtn = addText(this, BOOK.rightX + BOOK.colW, BOOK.numY - 9, 'próxima ›', navStyle)
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    for (const btn of [this.prevBtn, this.nextBtn]) {
      btn.on('pointerover', () => btn.setColor(INK.title));
      btn.on('pointerout', () => btn.setColor(INK.dim));
    }
    this.prevBtn.on('pointerdown', () => this.turnPage(-1));
    this.nextBtn.on('pointerdown', () => this.turnPage(1));

    const hint = addText(
      this,
      VIEW.w / 2,
      521,
      `${KEY_DIARY} ou clique fora para fechar  ·  ← → ou roda do mouse para virar a página`,
      { fontFamily: FONT.ui, fontSize: '11px', color: TEXT.dim }
    ).setOrigin(0.5, 0);

    this.diary = this.add.container(0, 0, [
      bg, book, block, this.bookContent, this.prevBtn, this.nextBtn, hint,
    ]);
    this.diary.setVisible(false);
  }

  private pageCount() {
    // página 0 = folha de rosto; depois, as páginas de anotações (mínimo 1)
    return 1 + Math.max(1, this.diaryPages.length);
  }

  private spreadCount() {
    return Math.ceil(this.pageCount() / 2);
  }

  /** Altura que uma anotação ocupa na página (título + texto + espaço). */
  private entryHeight(title: string, body: string): number {
    const t = addText(this, -3000, -3000, title, TITLE_STYLE);
    const b = addText(this, -3000, -3000, body, {
      ...BODY_STYLE,
      wordWrap: { width: BOOK.colW },
    });
    const h = t.height + 4 + b.height + ENTRY_GAP;
    t.destroy();
    b.destroy();
    return h;
  }

  /** Distribui as anotações pelas páginas sem cortar nenhuma ao meio. */
  private buildDiary() {
    const clues = gameState.getClues();
    this.diaryPages = [];

    let page: number[] = [];
    let used = 0;
    clues.forEach((c, i) => {
      const h = this.entryHeight(c.title, c.text);
      if (page.length && used + h > BOOK.textH) {
        this.diaryPages.push(page);
        page = [];
        used = 0;
      }
      page.push(i);
      used += h;
    });
    if (page.length) this.diaryPages.push(page);

    this.spread = Math.min(this.spread, this.spreadCount() - 1);
    this.renderSpread();
  }

  private renderSpread() {
    this.bookContent.removeAll(true);

    const left = this.spread * 2;
    this.drawPage(left, BOOK.leftX);
    this.drawPage(left + 1, BOOK.rightX);

    this.prevBtn.setVisible(this.spread > 0);
    this.nextBtn.setVisible(this.spread < this.spreadCount() - 1);
  }

  private drawPage(p: number, x: number) {
    if (p >= this.pageCount()) return; // folha em branco no fim do livro

    const cx = x + BOOK.colW / 2;
    if (p === 0) {
      this.drawFrontispiece(cx);
      return;
    }

    const clues = gameState.getClues();
    const idxs = this.diaryPages[p - 1] ?? [];
    let y = BOOK.textTop;

    if (!idxs.length) {
      this.bookContent.add(
        addText(this, x, y, 'Nenhuma anotação ainda.', {
          fontFamily: FONT.story,
          fontSize: '15px',
          fontStyle: 'italic',
          color: INK.dim,
        })
      );
    }

    idxs.forEach((i, k) => {
      const c = clues[i];

      const title = addText(this, x, y, c.title, TITLE_STYLE);
      y += title.height + 4;
      const body = addText(this, x, y, c.text, {
        ...BODY_STYLE,
        wordWrap: { width: BOOK.colW },
      });
      y += body.height;
      this.bookContent.add([title, body]);

      // traço sutil entre uma anotação e outra
      if (k < idxs.length - 1) {
        const sep = this.add.graphics();
        sep.lineStyle(1, 0x7d6a4f, 0.28);
        sep.lineBetween(x, y + ENTRY_GAP / 2, x + BOOK.colW, y + ENTRY_GAP / 2);
        this.bookContent.add(sep);
      }
      y += ENTRY_GAP;
    });

    // número da página
    this.bookContent.add(
      addText(this, cx, BOOK.numY, String(p), {
        fontFamily: FONT.story,
        fontSize: '13px',
        color: INK.dim,
      }).setOrigin(0.5)
    );
  }

  /** Folha de rosto do diário. */
  private drawFrontispiece(cx: number) {
    const line = (y: number, text: string, size: number, color: string, style = '') => {
      const t = addText(this, cx, y, text, {
        fontFamily: FONT.story,
        fontSize: `${size}px`,
        fontStyle: style,
        color,
      }).setOrigin(0.5);
      this.bookContent.add(t);
    };

    line(135, 'D I Á R I O', 13, INK.dim);
    line(175, 'Helena Vasques', 28, INK.title, 'bold');
    line(210, 'Perita documental', 16, INK.body, 'italic');
    line(242, 'Departamento de Registros Anômalos', 13, INK.dim);

    // carimbo inclinado
    const stamp = this.add.container(cx, 310);
    const box = this.add.graphics();
    box.lineStyle(3, 0x8a2f33, 1);
    box.strokeRoundedRect(-92, -21, 184, 42, 4);
    const label = addText(this, 0, 0, 'CONFIDENCIAL', {
      fontFamily: FONT.ui,
      fontSize: '20px',
      fontStyle: 'bold',
      color: INK.red,
    }).setOrigin(0.5);
    stamp.add([box, label]);
    stamp.setAngle(-8).setAlpha(0.72);
    this.bookContent.add(stamp);

    line(372, 'Se encontrado, devolver ao DRA.', 13, INK.dim, 'italic');
  }

  /** Vira a página: uma folha se fecha no meio e abre do outro lado. */
  private turnPage(dir: 1 | -1) {
    const target = this.spread + dir;
    if (this.flipping || target < 0 || target >= this.spreadCount()) return;
    this.flipping = true;
    audio.playSfx(SFX_PAGE, 0.6);

    const pageW = 382;
    const pageH = 434;
    const cy = BOOK.y + 16 + pageH / 2;
    const xLeft = BOOK.x + 402;  // borda interna da página esquerda
    const xRight = BOOK.x + 418; // borda interna da página direita

    // a folha nasce na página de onde sai
    const flip = this.add
      .rectangle(dir === 1 ? xRight : xLeft, cy, pageW, pageH, 0xe4d9bb)
      .setOrigin(dir === 1 ? 0 : 1, 0.5)
      .setStrokeStyle(1, 0x000000, 0.18);
    this.diary.add(flip);

    this.tweens.add({
      targets: flip,
      scaleX: 0,
      duration: BOOK.flipMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // no meio da virada, troca o conteúdo e passa a folha para o outro lado
        this.spread = target;
        this.renderSpread();
        flip
          .setPosition(dir === 1 ? xLeft : xRight, cy)
          .setOrigin(dir === 1 ? 1 : 0, 0.5);
        this.tweens.add({
          targets: flip,
          scaleX: 1,
          duration: BOOK.flipMs,
          ease: 'Sine.easeOut',
          onComplete: () => {
            flip.destroy();
            this.flipping = false;
          },
        });
      },
    });
  }

  private toggleDiary() {
    if (gameState.modalOpen) return; // teclado aberto: não abre o diário
    this.setTooltip(null); // evita tooltip preso ao abrir o diário
    const show = !this.diary.visible;
    if (show) {
      this.inventory.setVisible(false); // um painel de cada vez
      this.spread = this.spreadCount() - 1; // abre na última folha escrita
      this.renderSpread();
      audio.playSfx(SFX_PAGE, 0.7);
    }
    this.diary.setVisible(show);
  }

  // ---------- inventário (a bolsa da Helena) ----------

  private createInventory() {
    const bg = this.add
      .rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, COLOR.bg, 0.94)
      .setInteractive();
    bg.on('pointerdown', () => this.toggleInventory());

    // slots, ícones e detalhes: refeitos sempre que o inventário muda
    this.invSlots = this.add.container(0, 0);

    const header = this.add.graphics();
    header.fillStyle(COLOR.bg, 1);
    header.fillRect(0, 0, VIEW.w, HEADER_H);
    header.lineStyle(1, COLOR.edge, 1);
    header.lineBetween(0, HEADER_H, VIEW.w, HEADER_H);

    const title = addText(this, 100, 22, 'Bolsa de Helena', {
      fontFamily: FONT.story,
      fontSize: '26px',
      color: TEXT.accent,
    });
    const hint = addText(
      this,
      VIEW.w - 100,
      32,
      `${KEY_INVENTORY} ou clique fora para fechar`,
      { fontFamily: FONT.ui, fontSize: '12px', color: TEXT.dim }
    ).setOrigin(1, 0);

    this.inventory = this.add.container(0, 0, [bg, this.invSlots, header, title, hint]);
    this.inventory.setVisible(false);
  }

  private slotPos(n: number) {
    return {
      x: INV.left + (n % INV.cols) * (INV.slot + INV.gap),
      y: INV.top + Math.floor(n / INV.cols) * (INV.slot + INV.gap),
    };
  }

  private buildInventory() {
    this.invSlots.removeAll(true);

    const items = gameState.getItems();
    if (this.selectedSlot >= items.length) this.selectedSlot = -1;

    const gridW = INV.cols * INV.slot + (INV.cols - 1) * INV.gap;
    const gridH = INV.rows * INV.slot + (INV.rows - 1) * INV.gap;

    const frame = this.add.graphics();
    this.invSlots.add(frame);

    // slots
    for (let n = 0; n < INV.cols * INV.rows; n++) {
      const { x, y } = this.slotPos(n);
      const item = items[n];

      frame.fillStyle(0xffffff, item ? 0.07 : 0.03);
      frame.fillRoundedRect(x, y, INV.slot, INV.slot, 12);
      frame.lineStyle(1, COLOR.edge, 1);
      frame.strokeRoundedRect(x, y, INV.slot, INV.slot, 12);

      if (!item) continue;

      const cx = x + INV.slot / 2;
      const cy = y + INV.slot / 2;
      const id = (item as unknown as { id?: string }).id ?? '';
      const key = `item-${id}`;

      if (id && this.textures.exists(key)) {
        this.invSlots.add(this.add.image(cx, cy, key).setDisplaySize(56, 56));
      } else {
        // sem ícone: mostra a inicial do item
        this.invSlots.add(
          addText(this, cx, cy, item.title.charAt(0).toUpperCase(), {
            fontFamily: FONT.story,
            fontSize: '28px',
            color: TEXT.soft,
          }).setOrigin(0.5)
        );
      }

      const zone = this.add
        .zone(cx, cy, INV.slot, INV.slot)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedSlot = n;
        this.drawSelection();
      });
      zone.on('pointerover', () => this.setTooltip(item.title));
      zone.on('pointerout', () => this.setTooltip(null));
      this.invSlots.add(zone);
    }

    // painel de detalhes, ao lado da grade
    const dx = INV.left + gridW + 50;
    const dw = VIEW.w - 100 - dx;
    drawPanel(frame, dx, INV.top, dw, gridH, { radius: 14, alpha: 0.55, shadow: false });

    this.invTitle = addText(this, dx + 22, INV.top + 20, '', {
      fontFamily: FONT.story,
      fontSize: '21px',
      color: TEXT.accent,
      wordWrap: { width: dw - 44 },
    });
    this.invBody = addText(this, dx + 22, INV.top + 62, '', {
      fontFamily: FONT.story,
      fontSize: '15px',
      color: TEXT.soft,
      wordWrap: { width: dw - 44 },
      lineSpacing: 4,
    });
    this.invSel = this.add.graphics();
    this.invSlots.add([this.invTitle, this.invBody, this.invSel]);

    this.drawSelection();
  }

  /** Destaca o slot escolhido e mostra o nome e a descrição do item. */
  private drawSelection() {
    const items = gameState.getItems();
    const item = items[this.selectedSlot];

    this.invSel.clear();

    if (item) {
      const { x, y } = this.slotPos(this.selectedSlot);
      this.invSel.lineStyle(2, COLOR.accent, 1);
      this.invSel.strokeRoundedRect(x, y, INV.slot, INV.slot, 12);
      this.invTitle.setText(item.title);
      this.invBody.setText(item.text);
    } else {
      this.invTitle.setText('');
      this.invBody.setText(
        items.length ? 'Selecione um item para ver os detalhes.' : 'A bolsa está vazia.'
      );
    }
  }

  private toggleInventory() {
    if (gameState.modalOpen) return; // teclado aberto: não abre o inventário
    this.setTooltip(null);
    const show = !this.inventory.visible;
    if (show) {
      this.diary.setVisible(false); // um painel de cada vez
      audio.playSfx(SFX_ZIP_OPEN, 0.8); // zíper da bolsa
    }
    this.inventory.setVisible(show);
  }

  // ---------- atualização geral ----------

  private refreshAll() {
    const items = gameState.getItems().length;
    const clues = gameState.getClues().length;

    // Inventário na ponta direita, Diário logo à esquerda dele
    const left = this.drawPill(this.invPill, `Inventário  ${items}`, VIEW.w - 64);
    this.drawPill(this.diaryPill, `Diário  ${clues}`, left - 8);

    this.buildDiary();
    this.buildInventory();
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