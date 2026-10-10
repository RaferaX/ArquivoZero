const FONTS = [
  '400 16px Inter',
  '500 16px Inter',
  '600 16px Inter',
  '400 16px Lora',
  '500 16px Lora',
  'italic 400 16px Lora',
];

/** Espera as fontes carregarem (com limite de tempo, para nunca travar). */
export function loadFonts(timeoutMs = 4000): Promise<void> {
  const load = Promise.all(FONTS.map((f) => document.fonts.load(f)))
    .then(() => undefined)
    .catch(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([load, timeout]);
}