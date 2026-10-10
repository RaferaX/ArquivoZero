export interface Item {
  id: string;
  title: string;
  text: string;
}

export const ITEMS: Record<string, Item> = {
  lupa: {
    id: 'lupa',
    title: 'Lupa',
    text: 'Lupa de perito, pesada, de latão. Boa para ver o que alguém tentou esconder.',
  },
  fita: {
    id: 'fita',
    title: 'Fita cassete',
    text: 'Etiqueta à mão: "O. B. — não ouvir sozinha". Cabe no gravador da sala.',
  },
  cartao: {
    id: 'cartao',
    title: 'Cartão de acesso',
    text: 'Cartão magnético do DRA, com a faixa vermelha do subsolo.',
  },
};