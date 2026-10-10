import Phaser from 'phaser';
import { gameState } from '../state/gameState';
import { getSettings } from '../settings';

const MSG_DELAY = { lenta: 40, normal: 20, rapida: 8 };

export class UIScene extends Phaser.Scene {
  private messageText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelList!: Phaser.GameObjects.Text;
  private tooltip!: Phaser.GameObjects.Text;
  private typeTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('UIScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(24, 20, 'ARQUIVO ZERO', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#8a8aa8',
    });

    // faixa escura atrás das mensagens
    this.add.rectangle(width / 2, height - 58, width, 116, 0x000000, 0.55);

    this.messageText = this.add
      .text(40, height - 110, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#d0d0e0',
        align: 'left',
        wordWrap: { width: width - 80 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    this.createCounter();
    this.createPanel();

    // tooltip que segue o mouse (nome/descrição curta do objeto em foco)
    this.tooltip = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#d0d0e0',
        backgroundColor: 'rgba(0,0,0,0.75)',
        padding: { x: 8, y: 4 },
      })
      .setDepth(100)
      .setVisible(false);

    this.game.events.on('hover', (text: string | null) => {
      if (text) this.tooltip.setText(text).setVisible(true);
      else this.tooltip.setVisible(false);
    });

    this.input.keyboard?.on('keydown-I', () => this.togglePanel());
    this.input.on(
      'wheel',
      (
        _p: Phaser.Input.Pointer,
        _o: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number
      ) => {
        if (this.panel.visible) this.scrollList(dy);
      }
    );

    // As salas se comunicam com a interface por eventos
    this.game.events.on('message', (text: string) => this.showMessage(text));
    this.game.events.on('inventory-changed', () => this.refreshInventory());

    this.refreshInventory();
    this.showMessage(
      'Madrugada. Estou sozinha no prédio. A pasta continua aberta sobre a mesa.'
    );
  }

  /** Faz o tooltip acompanhar o mouse, sem sair da tela. */
  update() {
    if (!this.tooltip.visible) return;
    const p = this.input.activePointer;
    const { width, height } = this.scale;
    const x = Phaser.Math.Clamp(p.x + 16, 8, width - this.tooltip.width - 8);
    const y = Phaser.Math.Clamp(p.y + 22, 8, height - this.tooltip.height - 8);
    this.tooltip.setPosition(x, y);
  }

  /** Mostra a mensagem digitando, na velocidade das configurações. */
  private showMessage(text: string) {
    this.typeTimer?.remove();
    const delay = MSG_DELAY[getSettings().textSpeed] ?? 20;
    const wrapped = this.messageText.getWrappedText(text).join('\n');

    this.messageText.setText('');
    let i = 0;
    this.typeTimer = this.time.addEvent({
      delay,
      repeat: Math.max(0, wrapped.length - 1),
      callback: () => {
        i++;
        this.messageText.setText(wrapped.slice(0, i));
      },
    });
  }

  private createCounter() {
    const { width } = this.scale;
    this.counterText = this.add
      .text(width - 64, 20, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e0c060',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.counterText.on('pointerdown', () => this.togglePanel());
  }

  private createPanel() {
    const { width, height } = this.scale;

    const bg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.92)
      .setInteractive();
    bg.on('pointerdown', () => this.togglePanel());

    this.panelList = this.add.text(60, 90, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d0d0e0',
      wordWrap: { width: width - 120 },
      lineSpacing: 4,
    });

    // barra do topo: cobre o texto quando ele rola para cima
    const titleBar = this.add.rectangle(width / 2, 35, width, 70, 0x000000, 1);
    const title = this.add.text(
      60,
      28,
      'DIÁRIO DE HELENA   (I ou clique para fechar · roda do mouse rola)',
      { fontFamily: 'monospace', fontSize: '16px', color: '#e0c060' }
    );

    this.panel = this.add.container(0, 0, [bg, this.panelList, titleBar, title]);
    this.panel.setVisible(false);
  }

  private scrollList(dy: number) {
    const top = 90;
    const viewH = this.scale.height - top - 30;
    const minY = Math.min(top, top - (this.panelList.height - viewH));
    this.panelList.y = Phaser.Math.Clamp(this.panelList.y - dy, minY, top);
  }

  private togglePanel() {
    if (gameState.modalOpen) return; // teclado aberto: não abre o diário
    this.tooltip.setVisible(false);  // evita tooltip preso ao abrir o diário
    const show = !this.panel.visible;
    if (show) this.panelList.y = 90;
    this.panel.setVisible(show);
  }

  private refreshInventory() {
    const items = gameState.getItems();
    const clues = gameState.getClues();

    this.counterText.setText(`[I] DIÁRIO (${items.length + clues.length})`);

    const itemsBlock = items.length
      ? items.map((i) => `• ${i.title}: ${i.text}`).join('\n')
      : '  (nenhum)';
    const cluesBlock = clues.map((c) => `• ${c.title}\n  ${c.text}`).join('\n\n');

    this.panelList.setText(`ITENS\n${itemsBlock}\n\nANOTAÇÕES\n${cluesBlock}`);
  }
}