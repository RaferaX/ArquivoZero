export interface Clue {
  id: string;
  title: string;
  text: string;
}

export const CLUES: Record<string, Clue> = {
  notas: {
    id: 'notas',
    title: 'Minhas anotações',
    text: 'Há quatro anos da minha vida de que não me lembro. Otávio Brandt desapareceu há três anos e ninguém mais se lembra dele.',
  },
  pasta: {
    id: 'pasta',
    title: 'Pasta 000',
    text: 'Capa cinza, só um número a lápis. Meu nome na primeira página, na letra do Otávio. Embaixo: "Terceira vez."',
  },
  bilhete: {
    id: 'bilhete',
    title: 'Bilhete do Otávio',
    text: '"Não leia. Mas se já leu, vá até Vale Cinzento antes que esqueçam você também." Data no canto: 03/11/1987.',
  },
  'bilhete-data': {
    id: 'bilhete-data',
    title: 'Data adulterada',
    text: 'Sob a lupa, o "3" foi escrito por cima de um "8". A data original do bilhete é 08/11/1987.',
  },
  foto: {
    id: 'foto',
    title: 'Foto sem rosto',
    text: 'Eu e Otávio, na entrada do DRA. Na foto ele não tem rosto, só o cachimbo. Eu me lembro do rosto. A foto, não.',
  },
  cachimbo: {
    id: 'cachimbo',
    title: 'Cachimbo',
    text: 'O cachimbo do Otávio. Apagado, mas o fornilho ainda está morno. Alguém esteve aqui há pouco.',
  },
  cracha: {
    id: 'cracha',
    title: 'Crachá',
    text: 'Meu nome está certo. O número não é o meu. Eu sempre soube o meu de cor.',
  },
  calendario: {
    id: 'calendario',
    title: 'Calendário',
    text: 'Parado em outubro de 1994. As folhas dos meses anteriores foram arrancadas com cuidado.',
  },
  quadro: {
    id: 'quadro',
    title: 'Quadro de avisos',
    text: 'Recortes sobre Vale Cinzento, presos com alfinetes. Um deles foi riscado com tinta preta: por baixo se lê "desapareceram sem deixar registro".',
  },
  gaveta: {
    id: 'gaveta',
    title: 'Gaveta trancada',
    text: 'Cadeado de quatro dígitos. Parece um ano.',
  },
  gravador: {
    id: 'gravador',
    title: 'Gravador',
    text: 'Um gravador de fita antigo, do DRA. Estava vazio.',
  },
  fita: {
    id: 'fita',
    title: 'Fita do Otávio',
    text: 'A data do bilhete é mentira. Usar a verdadeira, sem barras: dia, mês e ano, dois dígitos cada. O resto está atrás de tudo o que prendi com alfinetes.',
  },
};