import Phaser from 'phaser';
import { VIEW, COLOR, TEXT, FONT, addText, fitCamera } from '../visual/theme';

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
    fitCamera(this);

    this.scene.stop('UIScene');
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    const cx = VIEW.w / 2;

    let y = 70;
    LINES.forEach((line, i) => {
      const t = addText(this, cx, y, line, {
        fontFamily: FONT.story,
        fontSize: '20px',
        fontStyle: 'italic',
        color: TEXT.text,
        align: 'center',
        wordWrap: { width: 640 },
        lineSpacing: 8,
      })
        .setOrigin(0.5, 0)
        .setAlpha(0);
      y += t.height + 30;
      this.tweens.add({ targets: t, alpha: 1, duration: 1400, delay: 1500 + i * 2400 });
    });

    const base = 1500 + LINES.length * 2400;

    const title = addText(this, cx, VIEW.h - 150, 'Vale Cinzento espera', {
      fontFamily: FONT.story,
      fontSize: '34px',
      color: '#b3262e',
    })
      .setOrigin(0.5)
      .setAlpha(0);

    const end = addText(this, cx, VIEW.h - 112, 'fim da demo', {
      fontFamily: FONT.ui,
      fontSize: '12px',
      color: TEXT.dim,
    })
      .setOrigin(0.5)
      .setAlpha(0);

    // botão em forma de pílula
    const bw = 200;
    const bh = 42;
    const by = VIEW.h - 62;
    const btnGfx = this.add.graphics().setAlpha(0);
    const drawBtn = (hover: boolean) => {
      btnGfx.clear();
      btnGfx.fillStyle(hover ? 0x2a1114 : 0x000000, hover ? 0.9 : 0.4);
      btnGfx.fillRoundedRect(cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
      btnGfx.lineStyle(1.5, hover ? 0xb3262e : COLOR.edge, 1);
      btnGfx.strokeRoundedRect(cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    };
    drawBtn(false);

    const btnText = addText(this, cx, by, 'Voltar ao menu', {
      fontFamily: FONT.ui,
      fontSize: '14px',
      fontStyle: '500',
      color: TEXT.text,
    })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, duration: 2000, delay: base });
    this.tweens.add({
      targets: [end, btnGfx, btnText],
      alpha: 1,
      duration: 1500,
      delay: base + 1800,
    });

    this.time.delayedCall(base + 1800, () => {
      const zone = this.add.zone(cx, by, bw, bh).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => drawBtn(true));
      zone.on('pointerout', () => drawBtn(false));
      zone.on('pointerdown', () => window.dispatchEvent(new Event('azero:menu')));
    });
  }
}