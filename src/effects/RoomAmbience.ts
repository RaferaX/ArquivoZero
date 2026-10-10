import Phaser from 'phaser';

interface AmbienceOptions {
  lamp?: { x: number; y: number };                         // onde a lâmpada pende
  coneHeight?: number;                                      // até onde a luz chega
  coneWidth?: number;                                       // largura da luz na base
  windowArea?: { x: number; y: number; w: number; h: number }; // posição da janela
  dim?: number;                                             // escuridão geral (0 = nenhuma)
  onThunder?: () => void;                                   // som do trovão (opcional)
}

function makeConeTexture(scene: Phaser.Scene, key: string, w: number, h: number) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 214, 140, 0.55)');
  grad.addColorStop(1, 'rgba(255, 214, 140, 0)');
  ctx.fillStyle = grad;

  // vários trapézios sobrepostos: as bordas ficam suaves
  for (let i = 0; i < 6; i++) {
    const s = 1 - i * 0.12;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 22 * s, 0);
    ctx.lineTo(w / 2 + 22 * s, 0);
    ctx.lineTo(w / 2 + (w / 2) * s, h);
    ctx.lineTo(w / 2 - (w / 2) * s, h);
    ctx.closePath();
    ctx.fill();
  }
  tex.refresh();
}

function makeGlowTexture(scene: Phaser.Scene, key: string, size: number) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 225, 160, 0.9)');
  g.addColorStop(0.3, 'rgba(255, 200, 120, 0.25)');
  g.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export function addRoomAmbience(scene: Phaser.Scene, opts: AmbienceOptions = {}) {
  const { width, height } = scene.scale;
  const lamp = opts.lamp ?? { x: 300, y: 45 };
  const coneH = opts.coneHeight ?? 360;
  const coneW = opts.coneWidth ?? 380;
  const win = opts.windowArea ?? { x: 130, y: 119, w: 150, h: 130 };
  const dimBase = opts.dim ?? 0.3;

  const coneKey = `lightcone-${coneW}x${coneH}`;
  const glowKey = 'lampglow';
  makeConeTexture(scene, coneKey, coneW, coneH);
  makeGlowTexture(scene, glowKey, 160);

  // ---- Penumbra geral: a sala escurece e a luz se destaca ----
  const dim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, dimBase)
    .setDepth(8);

  // ---- Lâmpada pendurada ----
  scene.add.rectangle(lamp.x, lamp.y / 2, 2, lamp.y, 0x222228).setDepth(9); // fio
  scene.add.ellipse(lamp.x, lamp.y, 44, 14, 0x2a2a30).setDepth(9);          // cúpula
  const bulb = scene.add.circle(lamp.x, lamp.y + 6, 5, 0xffe4a0).setDepth(9);

  const cone = scene.add
    .image(lamp.x, lamp.y + 8, coneKey)
    .setOrigin(0.5, 0)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(9);

  const glow = scene.add
    .image(lamp.x, lamp.y + 6, glowKey)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(9);

  // ---- Poeira flutuando dentro do cone ----
  for (let i = 0; i < 28; i++) {
    const t = Math.random(); // 0 = topo do cone, 1 = base
    const y = lamp.y + 20 + t * (coneH - 40);
    const half = 20 + t * (coneW / 2 - 20);
    const x = lamp.x + Phaser.Math.FloatBetween(-half, half) * 0.9;

    const mote = scene.add
      .circle(x, y, Phaser.Math.FloatBetween(0.8, 1.8), 0xfff0c8)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9);

    scene.tweens.add({
      targets: mote,
      x: x + Phaser.Math.Between(-18, 18),
      y: y + Phaser.Math.Between(-30, 20),
      alpha: Phaser.Math.FloatBetween(0.3, 0.7),
      duration: Phaser.Math.Between(4000, 9000),
      delay: Phaser.Math.Between(0, 6000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ---- Lâmpada oscilando (em rajadas irregulares) ----
  const flickerLamp = () => {
    const dur = Phaser.Math.Between(50, 110);
    const rep = Phaser.Math.Between(1, 3);
    const low = Phaser.Math.FloatBetween(0.2, 0.5);

    scene.tweens.add({
      targets: [cone, glow, bulb],
      alpha: { from: 1, to: low },
      duration: dur,
      yoyo: true,
      repeat: rep,
    });
    // quando a luz cai, a sala escurece junto
    scene.tweens.add({
      targets: dim,
      alpha: { from: dimBase, to: dimBase + 0.25 },
      duration: dur,
      yoyo: true,
      repeat: rep,
      onComplete: () => scene.time.delayedCall(Phaser.Math.Between(3000, 9000), flickerLamp),
    });
  };
  scene.time.delayedCall(2500, flickerLamp);

  // ---- Relâmpago: clarão azulado, mais forte na janela ----
  const sky = scene.add
    .rectangle(width / 2, height / 2, width, height, 0xaec6ff, 0)
    .setDepth(10);
  const windowGlow = scene.add
    .rectangle(win.x, win.y, win.w, win.h, 0xdbe8ff, 0)
    .setDepth(10);

  const flash = (roomPeak: number, windowPeak: number, duration: number) => {
    scene.tweens.add({ targets: sky, alpha: { from: roomPeak, to: 0 }, duration });
    scene.tweens.add({ targets: windowGlow, alpha: { from: windowPeak, to: 0 }, duration });
  };

  const strike = () => {
    flash(0.12, 0.6, 100);                                      // clarão curto
    scene.time.delayedCall(150, () => flash(0.22, 0.9, 380));   // clarão forte
    if (opts.onThunder) {
      // o trovão chega depois do clarão, como na vida real
      scene.time.delayedCall(Phaser.Math.Between(700, 2200), opts.onThunder);
    }
    scene.time.delayedCall(Phaser.Math.Between(9000, 20000), strike);
  };
  scene.time.delayedCall(Phaser.Math.Between(4000, 8000), strike);
}