import Phaser from 'phaser';

const LINES = [
  'Guardei a fita. Peguei o cartão.',
  'O bilhete me manda para Vale Cinzento. Mas o caminho começa no subsolo, onde guardam o que não tem número.',
  'Eu já devia ter ido lá antes.',
];

export class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  create() {
    const { width, height } = this.scale;

    this.scene.stop('UIScene');
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    let y = 70;
    LINES.forEach((line, i) => {
      const t = this.add
        .text(width / 2, y, line, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#cfc9bd',
          align: 'center',
          wordWrap: { width: 720 },
          lineSpacing: 6,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0);
      y += t.height + 28;
      this.tweens.add({ targets: t, alpha: 1, duration: 1400, delay: 1500 + i * 2400 });
    });

    const base = 1500 + LINES.length * 2400;

    const title = this.add
      .text(width / 2, height - 150, 'VALE CINZENTO ESPERA', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#b3262e',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const end = this.add
      .text(width / 2, height - 110, 'fim da demo', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6a6a80',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const btn = this.add
      .text(width / 2, height - 60, '[ voltar ao menu ]', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#cfc9bd',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, duration: 2000, delay: base });
    this.tweens.add({ targets: [end, btn], alpha: 1, duration: 1500, delay: base + 1800 });

    this.time.delayedCall(base + 1800, () => {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#cfc9bd'));
      btn.on('pointerdown', () => window.dispatchEvent(new Event('azero:menu')));
    });
  }
}