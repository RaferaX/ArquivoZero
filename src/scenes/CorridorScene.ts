import Phaser from 'phaser';
import { createClueObject } from '../objects/createClueObject';

export class CorridorScene extends Phaser.Scene {
  private changing = false;

  constructor() {
    super('CorridorScene');
  }

  create() {
    const { width, height } = this.scale;
    this.changing = false;

    this.cameras.main.fadeIn(600, 0, 0, 0);

    // Chão e parede
    this.add.rectangle(width / 2, height / 2, width, height, 0x101018);
    this.add.rectangle(width / 2, 120, width, 240, 0x181824);

    // Porta de volta para a sala
    const back = this.add
      .rectangle(90, 150, 90, 150, 0x2b1d14)
      .setStrokeStyle(2, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(90, 150, 'Voltar', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);
    back.on('pointerdown', () => this.changeScene('RoomScene'));

    // Pistas do corredor
    createClueObject(this, {
      id: 'arquivo', x: 300, y: 340, w: 110, h: 150, color: 0x2a2f3a, label: 'Arquivo',
      description: 'Um arquivo de metal com a gaveta entreaberta. Dentro, as fichas de seis investigadores. A ficha número 6 está em branco: sem nome, sem foto.',
    });
    createClueObject(this, {
      id: 'pegadas', x: 640, y: 370, w: 200, h: 60, color: 0x2a1f1f, label: 'Pegadas',
      description: 'Pegadas úmidas atravessam o corredor e terminam na parede, como se quem as deixou tivesse atravessado.',
    });

    // Porta do laboratório (trancada, vai ser usada em um próximo passo)
    const lab = this.add
      .rectangle(840, 140, 100, 170, 0x1f2a2f)
      .setStrokeStyle(2, 0x8a3030)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(840, 140, 'Laboratório\n[trancado]', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    lab.on('pointerdown', () =>
      this.game.events.emit('message', 'A porta de metal está trancada. Não há teclado, só uma fechadura antiga.')
    );

    // Luz piscando: sombra que escurece de tempos em tempos
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25);
    this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        this.tweens.add({ targets: shade, alpha: 0.75, duration: 70, yoyo: true, repeat: 3 });
      },
    });

    this.game.events.emit('message', 'Um corredor longo e frio. Uma lâmpada pisca no teto...');
  }

  private changeScene(key: string) {
    if (this.changing) return;
    this.changing = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key);
    });
  }
}