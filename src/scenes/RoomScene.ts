import Phaser from 'phaser';
import { createClueObject } from '../objects/createClueObject';
import { Keypad } from '../objects/Keypad';
import { CLUES } from '../data/clues';
import { gameState } from '../state/gameState';
import { addRoomAmbience } from '../effects/RoomAmbience';
import { audio } from '../audio';
import { VIEW, fitCamera } from '../visual/theme';

const GAVETA_CODE = '1991';
const COFRE_CODE = '081187';

const TAPE_TEXT =
  '(chiado) "Helena. A data do bilhete é mentira. Use a verdadeira, sem barras: dia, mês e ano, dois dígitos cada. O resto está atrás de tudo o que você prendeu com alfinetes."';

export class RoomScene extends Phaser.Scene {
  private gaveta!: ReturnType<typeof createClueObject>;
  private keypad!: Keypad;
  private door!: ReturnType<typeof createClueObject>;
  private changing = false;

  constructor() {
    super('RoomScene');
  }

  preload() {
    // SVGs rasterizados em 2x para ficarem nítidos em telas grandes
    this.load.svg('pasta', '/svg/pasta.svg', { scale: 2 });
    this.load.svg('sala', '/svg/sala.svg', { scale: 2 });
    this.load.svg('mesa', '/svg/mesa.svg', { scale: 2 });
    this.load.svg('prateleira', '/svg/prateleira.svg', { scale: 2 });
    this.load.svg('bilhete', '/svg/bilhete.svg', { scale: 2 });
    this.load.svg('foto', '/svg/foto.svg', { scale: 2 });
    this.load.svg('cachimbo', '/svg/cachimbo.svg', { scale: 2 });
    this.load.svg('gaveta', '/svg/gaveta.svg', { scale: 2 });
    this.load.svg('gaveta-aberta', '/svg/gaveta-aberta.svg', { scale: 2 });
    this.load.svg('porta', '/svg/porta.svg', { scale: 2 });
    this.load.svg('gravador', '/svg/gravador.svg', { scale: 2 });
    this.load.svg('calendario', '/svg/calendario.svg', { scale: 2 });
    this.load.svg('janela', '/svg/janela.svg', { scale: 2 });
    this.load.svg('quadro', '/svg/quadro.svg', { scale: 2 });
    this.load.svg('cracha', '/svg/cracha.svg', { scale: 2 });
  }

  create() {
    audio.playAmbient('/audio/rain-dark.wav', 2500, 0.4);
    const { w: width, h: height } = VIEW;
    this.changing = false;
    fitCamera(this);
    // A interface (mensagens e diário) roda em uma cena separada
    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.buildBackground(width, height);
    this.buildObjects();
    this.keypad = new Keypad(this);
    this.addAtmosphere(width, height);
    addRoomAmbience(this);
  }

  // ---------- helpers ----------

  private say(text: string) {
    this.game.events.emit('message', text);
  }

  private refreshUI() {
    this.game.events.emit('inventory-changed');
  }

  /** Registra a pista (se for nova) e mostra o texto. */
  private inspect(id: string, text: string) {
    const isNew = gameState.addClue(id);
    this.say(isNew ? `${text}\n[Nova pista: ${CLUES[id].title}]` : text);
    this.refreshUI();
  }

  // ---------- cenário ----------

  private buildBackground(width: number, height: number) {
    this.add.image(width / 2, height / 2, 'sala').setDisplaySize(width, height); // parede, rodapé e chão
    this.add.image(300, 375, 'mesa').setDisplaySize(330, 170); // mesa
    this.add.image(640, 436, 'prateleira').setDisplaySize(240, 90); // bancada
  }

  private buildObjects() {
    // parede
    createClueObject(this, {
      id: 'janela', x: 130, y: 120, w: 150, h: 130, color: 0x1a2433,
      label: 'Janela', done: () => false,
      sprite: 'janela',
      spriteSize: { w: 170, h: 150 }, // inclui moldura e peitoril; o vidro fica em x 55–205, y 55–185
      hover: 'A chuva não para desde o começo da madrugada.',
      onUse: () =>
        this.say(
          'O vidro está gelado. A chuva escorre sem pressa e a rua lá embaixo está vazia. Nenhuma janela acesa em prédio nenhum.'
        ),
    });

    createClueObject(this, {
      id: 'calendario', x: 330, y: 115, w: 90, h: 100, color: 0x3a3a2a,
      label: 'Calendário', fontSize: 12,
      sprite: 'calendario',
      spriteSize: { w: 71, h: 100 }, // mantém a proporção do SVG (150×210)
      hover: 'Outubro de 1994.',
      onUse: () =>
        this.inspect(
          'calendario',
          'Calendário de parede, parado em outubro de 1994. As folhas dos meses anteriores foram arrancadas com cuidado.'
        ),
    });

    createClueObject(this, {
      id: 'quadro', x: 520, y: 130, w: 170, h: 120, color: 0x2a3a3a,
      label: 'Quadro\nde avisos', done: () => gameState.hasFlag('cofreAberto'),
      sprite: 'quadro',
      hover: () =>
        gameState.hasFlag('cofreAberto')
          ? 'O quadro. O cofre atrás dele está aberto.'
          : 'Recortes sobre Vale Cinzento.',
      onUse: () => this.useQuadro(),
    });

    // crachá, pendurado ao lado da porta (clique só no cartão, não na fita)
    createClueObject(this, {
      id: 'cracha', x: 745, y: 132, w: 28, h: 40, color: 0x9a9aa8,
      label: 'Crachá', fontSize: 9,
      sprite: 'cracha',
      spriteSize: { w: 34, h: 57 },
      spriteOffset: { x: 0, y: -7 },
      hover: 'Meu crachá.',
      onUse: () =>
        this.inspect(
          'cracha',
          'Meu nome está certo. O número não é o meu. Eu sempre soube o meu de cor.'
        ),
    });

    // mesa
    createClueObject(this, {
      id: 'pasta', x: 235, y: 335, w: 70, h: 50, color: 0x4a4a52,
      label: 'Pasta\n000', fontSize: 12,
      sprite: 'pasta',
      hover: 'Pasta 000. Não consta em nenhum índice.',
      onUse: () =>
        this.inspect(
          'pasta',
          'Pasta 000. Meu nome na primeira página, na letra do Otávio. Embaixo, uma única linha: "Terceira vez."'
        ),
    });

    createClueObject(this, {
      id: 'bilhete', x: 320, y: 335, w: 58, h: 40, color: 0x6a6450,
      label: 'Bilhete', fontSize: 11,
      sprite: 'bilhete',
      hover: 'A letra dele. Inclinada para a esquerda.',
      onUse: () => this.useBilhete(),
    });

    createClueObject(this, {
      id: 'foto', x: 392, y: 330, w: 44, h: 54, color: 0x3a3a48,
      label: 'Foto', fontSize: 11,
      sprite: 'foto',
      hover: 'Uma foto minha com o Otávio.',
      onUse: () =>
        this.inspect(
          'foto',
          'Eu e Otávio, na entrada do DRA. Na foto ele não tem rosto, só o cachimbo. Eu me lembro do rosto. A foto, não.'
        ),
    });

    // cachimbo do Otávio, no canto esquerdo da mesa
    createClueObject(this, {
      id: 'cachimbo', x: 200, y: 392, w: 56, h: 22, color: 0x4a3626,
      label: 'Cachimbo', fontSize: 10,
      sprite: 'cachimbo',
      hover: 'O cachimbo do Otávio.',
      onUse: () =>
        this.inspect(
          'cachimbo',
          'O cachimbo do Otávio. Apagado, mas o fornilho ainda está morno. Ele não passa por aqui há três anos.'
        ),
    });

    // a gaveta é guardada em this.gaveta para trocar a imagem quando abrir
    this.gaveta = createClueObject(this, {
      id: 'gaveta', x: 300, y: 396, w: 130, h: 28, color: 0x2e2018,
      label: 'Gaveta', fontSize: 12, done: () => gameState.hasFlag('gavetaAberta'),
      sprite: gameState.hasFlag('gavetaAberta') ? 'gaveta-aberta' : 'gaveta',
      hover: () =>
        gameState.hasFlag('gavetaAberta') ? 'Minha gaveta. Vazia.' : 'Minha gaveta. Trancada.',
      onUse: () => this.useGaveta(),
    });

    // prateleira
    createClueObject(this, {
      id: 'gravador', x: 640, y: 378, w: 120, h: 56, color: 0x3a2030,
      label: 'Gravador', done: () => gameState.hasFlag('fitaOuvida'),
      sprite: 'gravador',
      hover: 'Um gravador do DRA.',
      onUse: () => this.useGravador(),
    });

    // porta
    this.add.ellipse(840, 251, 118, 9, 0x000000, 0.35);
    this.door = createClueObject(this, {
      id: 'porta', x: 840, y: 152, w: 118, h: 200, color: 0x2b1d14,
      label: 'Porta\n[trancada]', fontSize: 13,
      sprite: 'porta',
      done: () => gameState.hasFlag('portaAberta'),
      hover: () =>
        gameState.hasFlag('portaAberta')
          ? 'A porta do subsolo. Aberta.'
          : 'A porta. Leitor de cartão apagado.',
      onUse: () => this.useDoor(),
    });
  }

  private addAtmosphere(width: number, height: number) {
    // chuva no vidro da janela
    for (let i = 0; i < 16; i++) {
      const drop = this.add.rectangle(
        Phaser.Math.Between(58, 202),
        58,
        1,
        Phaser.Math.Between(8, 16),
        0x7f9fc0,
        0.55
      );
      this.tweens.add({
        targets: drop,
        y: 182,
        duration: Phaser.Math.Between(500, 900),
        delay: Phaser.Math.Between(0, 900),
        repeat: -1,
        onRepeat: () => {
          drop.x = Phaser.Math.Between(58, 202);
        },
      });
    }

    // luz piscando
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.2);
    this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: shade,
          alpha: 0.75,
          duration: 70,
          yoyo: true,
          repeat: 3,
        });
      },
    });
  }

  // ---------- interações ----------

  private useBilhete() {
    if (gameState.hasItem('lupa')) {
      gameState.addClue('bilhete');
      this.inspect(
        'bilhete-data',
        'Pela lupa, o "3" da data foi escrito por cima de um "8". A data original: 08/11/1987.'
      );
      return;
    }
    this.inspect(
      'bilhete',
      '"Não leia. Mas se já leu, vá até Vale Cinzento antes que esqueçam você também." Data no canto: 03/11/1987.'
    );
  }

  private useGaveta() {
    if (gameState.hasFlag('gavetaAberta')) {
      this.say('A gaveta está aberta e vazia. Já peguei o que havia dentro.');
      return;
    }

    this.inspect('gaveta', 'Uma gaveta com cadeado de quatro dígitos. Parece um ano.');

    this.keypad.open({
      title: 'GAVETA TRANCADA',
      code: GAVETA_CODE,
      onSuccess: () => {
        gameState.setFlag('gavetaAberta');
        this.gaveta.image?.setTexture('gaveta-aberta'); // troca para a gaveta puxada
        gameState.addItem('lupa');
        gameState.addItem('fita');
        this.refreshUI();
        this.say(
          'Clique. Dentro da gaveta: uma lupa de perito e uma fita cassete.\n[Novos itens: Lupa, Fita cassete]'
        );
      },
      onFail: () => this.say('Não abriu. Tem que ser um ano que importa.'),
    });
  }

  private useGravador() {
    if (gameState.hasFlag('fitaOuvida')) {
      this.say(TAPE_TEXT); // ouvir de novo
      return;
    }
    if (!gameState.hasItem('fita')) {
      this.inspect('gravador', 'Um gravador de fita antigo, do DRA. Está vazio.');
      return;
    }

    gameState.setFlag('fitaOuvida');
    gameState.addClue('fita');
    this.refreshUI();
    this.say(`${TAPE_TEXT}\n[Nova pista: Fita do Otávio]`);
  }

  private useQuadro() {
    if (gameState.hasFlag('cofreAberto')) {
      this.say('Atrás do quadro, o cofre aberto e vazio.');
      return;
    }

    if (!gameState.hasFlag('fitaOuvida')) {
      this.inspect(
        'quadro',
        'Recortes sobre Vale Cinzento, presos com alfinetes. Um foi riscado com tinta preta, mas por baixo ainda se lê: "desapareceram sem deixar registro".'
      );
      return;
    }

    gameState.addClue('quadro');
    this.refreshUI();
    this.say(
      'O quadro gira sobre uma dobradiça escondida. Atrás dele, preso à parede, um cofre com teclado de seis dígitos.'
    );

    this.keypad.open({
      title: 'COFRE',
      code: COFRE_CODE,
      onSuccess: () => {
        gameState.setFlag('cofreAberto');
        gameState.addItem('cartao');
        this.refreshUI();
        this.say(
          'Clique. O cofre guarda um único objeto: um cartão de acesso com a faixa vermelha do subsolo.\n[Novo item: Cartão de acesso]'
        );
      },
      onFail: () => this.say('Não é essa. A fita falou da data verdadeira do bilhete.'),
    });
  }

  private useDoor() {
    if (gameState.hasFlag('portaAberta')) {
      this.finishDemo();
      return;
    }

    if (!gameState.hasItem('cartao')) {
      this.say(
        'A porta tem um leitor de cartão apagado. Sem o cartão do subsolo, não saio daqui.'
      );
      return;
    }

    gameState.setFlag('portaAberta');
    this.door.text.setText('Porta\n[aberta]');
    this.refreshUI();
    this.say('O cartão passa. A luz do leitor fica verde. O caminho para o subsolo está aberto.');
    this.time.delayedCall(2800, () => this.finishDemo());
  }

  private finishDemo() {
    if (this.changing) return;
    this.changing = true;
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('EndScene');
    });
  }
}