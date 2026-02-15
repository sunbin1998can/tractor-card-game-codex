export type Suit = 'S' | 'H' | 'D' | 'C' | 'N';
export type SuitGroup = Suit | 'TRUMP';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | 'SJ'
  | 'BJ';

export interface Card {
  id: string;
  suit: Suit | 'J';
  rank: Rank;
  deck: 1 | 2;
}

export type PatternKind = 'SINGLE' | 'PAIR' | 'TRACTOR' | 'THROW' | 'INVALID';

export interface Pattern {
  kind: PatternKind;
  suitGroup: SuitGroup | null;
  size: number;
  cards: Card[];
  topKey?: number;
  length?: number;
  parts?: Pattern[];
  reason?: string;
}
