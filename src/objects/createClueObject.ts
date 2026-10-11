import Phaser from 'phaser';
import { gameState } from '../state/gameState';

export interface ClueObjectConfig {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  label: string;
  fontSize?: number;
  /** Chave da textura SVG carregada no preload. Se existir, substitui a cor do retângulo. */
  sprite?: string;
  /** Tamanho da imagem, quando diferente da área clicável (w × h). */
  spriteSize?: { w: number; h: number };
  /** Deslocamento da imagem em relação ao centro da área clicável. */
  spriteOffset?: { x: number; y: number };
  /** Texto do tooltip ao passar o mouse (ou função, se mudar conforme o estado). */
  hover?: string | (() => string);
  /** Mostra o nome fixo sobre o objeto. Útil só para depurar. */
  showLabel?: boolean;
  /** O que acontece ao clicar. */
  onUse: () => void;
  /** Quando devolve true, a borda fica verde. Padrão: já tem a pista de mesmo id. */
  done?: () => boolean;
}

export function createClueObject(scene: Phaser.Scene, cfg: ClueObjectConfig) {
  const { id, x, y, w, h, color, label, fontSize = 14, onUse } = cfg;
  const isDone = cfg.done ?? (() => gameState.hasClue(id));

  // A imagem fica por baixo; o retângulo vem por cima só como área clicável e borda.
  const image = cfg.sprite
    ? scene.add
        .image(
          x + (cfg.spriteOffset?.x ?? 0),
          y + (cfg.spriteOffset?.y ?? 0),
          cfg.sprite
        )
        .setDisplaySize(cfg.spriteSize?.w ?? w, cfg.spriteSize?.h ?? h)
    : undefined;

  const rect = scene.add
    .rectangle(x, y, w, h, color, cfg.sprite ? 0 : 1)
    .setInteractive({ useHandCursor: true });

  // O texto continua existindo (outros arquivos podem usar o .text retornado),
  // mas fica invisível. O que o jogador vê é o tooltip.
  const text = scene.add
    .text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      align: 'center',
    })
    .setOrigin(0.5)
    .setVisible(cfg.showLabel ?? false);

  // Sem `hover`, o tooltip usa o texto atual do rótulo (acompanha mudanças de estado).
  const tipText = () => {
    const h = cfg.hover;
    if (typeof h === 'function') return h();
    return h ?? text.text.replace(/\n/g, ' ');
  };

  const refresh = () => {
    if (isDone()) rect.setStrokeStyle(2, 0x4caf50);
    else rect.setStrokeStyle();
  };
  refresh();

  rect.on('pointerover', () => {
    rect.setStrokeStyle(2, 0xffffff);
    scene.game.events.emit('hover', tipText());
  });
  rect.on('pointerout', () => {
    refresh();
    scene.game.events.emit('hover', null);
  });
  rect.on('pointerdown', () => {
    if (gameState.modalOpen) return;
    scene.game.events.emit('hover', null); // esconde o tooltip ao clicar
    onUse();
    refresh();
  });

  // atualiza a borda quando algo muda (item pego, porta aberta etc.)
  scene.game.events.on('inventory-changed', refresh);
  scene.events.once('shutdown', () => {
    scene.game.events.off('inventory-changed', refresh);
    scene.game.events.emit('hover', null); // evita tooltip preso ao trocar de cena
  });

  return { rect, text, image, refresh };
}