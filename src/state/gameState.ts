import { CLUES, type Clue } from '../data/clues';
import { ITEMS, type Item } from '../data/items';

class GameState {
  private clues = new Set<string>();
  private items = new Set<string>();
  private flags = new Set<string>();

  modalOpen = false;

  constructor() {
    this.reset();
  }

  /** Começa um jogo novo (já inclui as anotações iniciais da Helena). */
  reset(): void {
    this.clues = new Set(['notas']);
    this.items = new Set();
    this.flags = new Set();
    this.modalOpen = false;
  }

  // Retorna true se a pista era nova
  addClue(id: string): boolean {
    if (this.clues.has(id)) return false;
    this.clues.add(id);
    return true;
  }

  hasClue(id: string): boolean {
    return this.clues.has(id);
  }

  getClues(): Clue[] {
    return [...this.clues].map((id) => CLUES[id]);
  }

  addItem(id: string): boolean {
    if (this.items.has(id)) return false;
    this.items.add(id);
    return true;
  }

  hasItem(id: string): boolean {
    return this.items.has(id);
  }

  getItems(): Item[] {
    return [...this.items].map((id) => ITEMS[id]);
  }

  setFlag(flag: string): void {
    this.flags.add(flag);
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }
}

export const gameState = new GameState();