import Phaser from 'phaser';
import { RoomScene } from './scenes/RoomScene';
import { EndScene } from './scenes/EndScene';
import { UIScene } from './scenes/UIScene';
import { GAME } from './visual/theme';

let game: Phaser.Game | null = null;
let pausedScenes: Phaser.Scene[] = [];

export function startGame(): void {
  if (game) return;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME.w,
    height: GAME.h,
    parent: 'game',
    backgroundColor: '#0b0b10',
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [RoomScene, EndScene, UIScene],
  });
}

export function stopGame(): void {
  pausedScenes = [];
  game?.destroy(true);
  game = null;
}

/** Pausa todas as cenas ativas (movimento, timers, física, sons do Phaser). */
export function pauseGame(): void {
  if (!game) return;
  pausedScenes = game.scene.getScenes(true);
  pausedScenes.forEach((s) => s.scene.pause());
  game.sound.pauseAll();
}

export function resumeGame(): void {
  pausedScenes.forEach((s) => s.scene.resume());
  pausedScenes = [];
  game?.sound.resumeAll();
}