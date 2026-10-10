import { getSettings } from './settings';
import { audio } from './audio';

const RAIN = '/audio/rain-dark.wav';

interface Line {
  t: string; // *itálico*, **negrito**, [[palavra que some]]
  cls?: 'head' | 'quote';
}

interface Screen {
  lines: Line[];
  flicker?: boolean;
  rain?: boolean;
  final?: boolean;
}

const SCREENS: Screen[] = [
  {
    lines: [
      { t: 'Vale Cinzento. Município. 1987.', cls: 'head' },
      {
        t: 'Em novembro daquele ano, a cidade foi rebaixada a distrito. Três semanas depois, deixou de constar nos mapas. Nenhum decreto explica. Nenhum jornal registrou. Nenhum morador foi encontrado para dizer o contrário.',
      },
      {
        t: 'Perguntei a dezenas de pessoas o que aconteceu ali. Todas me deram a mesma resposta, no mesmo tom, como se tivessem ensaiado:',
      },
      { t: '*“Nunca ouvi falar.”*', cls: 'quote' },
    ],
  },
  {
    lines: [
      { t: '**Helena Vasques.** Perita documental.' },
      {
        t: 'Cresci dentro de um arquivo municipal, ao lado da minha mãe. Não lembro de qual cidade. Lembro do cheiro de papel velho, do som do carimbo batendo no fim do dia, e de uma frase que ela repetia:',
      },
      { t: '*“O que não é registrado deixa de ter acontecido.”*', cls: 'quote' },
      {
        t: 'Existe um intervalo de quatro anos na minha vida de que não me lembro. Nunca me incomodou. Papel velho tem lacunas. Gente também.',
      },
    ],
  },
  {
    lines: [
      {
        t: 'Hoje trabalho no DRA, o Departamento de Registros Anômalos. Ninguém sabe ao certo quem nos criou. Catalogamos o que não deveria existir: fotos com pessoas a mais, certidões de gente que nunca nasceu, cartas que chegam antes de serem escritas.',
      },
      {
        t: 'Existe uma regra não escrita no subsolo: *não se abre o que não tem número.*',
      },
    ],
  },
  {
    lines: [
      { t: 'Quem me ensinou tudo foi [[Otávio]] Brandt.' },
      {
        t: 'Ele desapareceu há três anos. Fui até a sala dele: a mesa pertencia a outra pessoa, e a placa na porta tinha outro nome. Perguntei aos colegas. Ninguém sabia de quem eu falava.',
      },
      {
        t: 'Eu ainda lembro do rosto dele. Do cachimbo apagado. Da letra inclinada para a esquerda.',
      },
      { t: 'Eu ainda lembro. Por enquanto.' },
    ],
  },
  {
    flicker: true,
    rain: true,
    lines: [
      { t: 'Outubro de 1994. Madrugada. Estou sozinha no prédio.' },
      {
        t: 'Uma pasta apareceu na minha mesa. Capa de papelão cinza, sem etiqueta, só um número a lápis: **000**. Esse número não existe nos índices.',
      },
      { t: 'Dentro, um bilhete. A letra inclinada para a esquerda:' },
      {
        t: '*“Não leia. Mas se já leu, vá até Vale Cinzento antes que esqueçam você também.”*',
        cls: 'quote',
      },
      { t: 'No canto, a data: **03/11/1987.**' },
      { t: 'Deve ser engano dele.' },
    ],
  },
  {
    flicker: true,
    lines: [
      {
        t: 'Passei a mão no papel. Está frio. Cheira a gaveta fechada há muito tempo.',
      },
      { t: 'Eu não lembro de ter aberto a pasta.' },
      { t: 'Mas ela está aberta.' },
    ],
  },
  {
    flicker: true,
    final: true,
    lines: [
      { t: 'Meu nome está escrito na primeira página.' },
      { t: 'Não na minha letra. Na dele.' },
      { t: 'E embaixo, uma única linha:' },
      { t: '*“Terceira vez.”*', cls: 'quote' },
    ],
  },
];

interface Seg {
  text: string;
  cls: string;
}

function parse(text: string): Seg[] {
  const out: Seg[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\])/g;
  for (const part of text.split(re)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push({ text: part.slice(2, -2), cls: 'b' });
    else if (part.startsWith('*')) out.push({ text: part.slice(1, -1), cls: 'i' });
    else if (part.startsWith('[['))
      out.push({ text: part.slice(2, -2), cls: 'vanish' });
    else out.push({ text: part, cls: '' });
  }
  return out;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const CHAR_DELAY = { lenta: 55, normal: 28, rapida: 12 };

/* ---------- controle externo (pausa / cancelar) ---------- */

let introPaused = false;
let cancelCurrent: (() => void) | null = null;

/** Pausa ou retoma a abertura (usado pelo botão de configurações). */
export function setIntroPaused(v: boolean): void {
  introPaused = v;
  document.getElementById('intro')?.classList.toggle('paused', v);
}

/** Encerra a abertura sem entrar no jogo (ex.: voltar ao menu). */
export function cancelIntro(): void {
  cancelCurrent?.();
}

/** Resolve true se terminou (ou foi pulada) e false se foi cancelada. */
export function playIntro(): Promise<boolean> {
  return new Promise((resolve) => {
    introPaused = false;
    audio.duck(0.3, 1500); // música do menu fica baixa durante a abertura

    const root = document.createElement('div');
    root.id = 'intro';
    root.innerHTML = `
      <div id="intro-fx"></div>
      <button id="intro-skip" class="btn small">Pular</button>
      <div id="intro-content"></div>
      <p id="intro-hint">clique ou pressione uma tecla para continuar</p>
    `;
    document.body.appendChild(root);

    const content = root.querySelector<HTMLElement>('#intro-content')!;
    const hint = root.querySelector<HTMLElement>('#intro-hint')!;
    const skipBtn = root.querySelector<HTMLElement>('#intro-skip')!;

    let typing = false;
    let fastForward = false;
    let skipAll = false;
    let done = false;
    let advance: (() => void) | null = null;

    /** Espera `ms` e, se estiver pausada, continua esperando. */
    const wait = async (ms: number) => {
      await sleep(ms);
      while (introPaused && !skipAll) await sleep(100);
    };

    const finish = (completed = true) => {
      if (done) return;
      done = true;
      skipAll = true;
      introPaused = false;
      cancelCurrent = null;
      audio.stopAmbient(1500);
      if (completed) audio.resetDuck();
      else audio.duck(1, 800); // cancelou: devolve o volume da música do menu
      window.removeEventListener('keydown', onKey);
      root.classList.add('leave');
      setTimeout(() => root.remove(), 900);
      resolve(completed);
    };

    cancelCurrent = () => finish(false);

    const onAdvance = () => {
      if (introPaused) return;
      if (typing) fastForward = true;
      else advance?.();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || introPaused) return;
      if (e.key === 'Escape') return; // ESC abre a pausa (tratado no menu.ts)
      if (!['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) onAdvance();
    };

    root.addEventListener('click', onAdvance);
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      finish();
    });
    window.addEventListener('keydown', onKey);

    async function typeScreen(s: Screen): Promise<void> {
      content.className = '';
      content.innerHTML = '';
      root.classList.toggle('flicker', !!s.flicker);
      if (s.rain) audio.playAmbient(RAIN, 2500);
      typing = true;
      fastForward = false;
      const delay = CHAR_DELAY[getSettings().textSpeed] ?? 28;

      for (const line of s.lines) {
        if (skipAll) return;
        const p = document.createElement('p');
        if (line.cls) p.className = line.cls;
        content.appendChild(p);

        for (const seg of parse(line.t)) {
          const span = document.createElement('span');
          if (seg.cls) span.className = seg.cls;
          p.appendChild(span);
          for (const ch of seg.text) {
            if (skipAll) return;
            span.textContent += ch;
            if (!fastForward) await wait(delay);
            else if (introPaused) await wait(0);
          }
        }
        if (!fastForward) await wait(450);
      }

      typing = false;
      content
        .querySelectorAll('.vanish')
        .forEach((el) => el.classList.add('go'));
    }

    async function run(): Promise<void> {
      for (const s of SCREENS) {
        if (skipAll) return;
        await typeScreen(s);
        if (skipAll) return;

        if (s.final) {
          await wait(2500);
          content.classList.add('out');
          await wait(900);
          if (skipAll) return;
          content.className = '';
          content.innerHTML = '<h1 class="intro-title">Vale Cinzento</h1>';
          await wait(3800);
          break;
        }

        hint.classList.add('show');
        await new Promise<void>((res) => (advance = res));
        advance = null;
        hint.classList.remove('show');
        content.classList.add('out');
        await wait(700);
      }
      finish();
    }

    run();
  });
}