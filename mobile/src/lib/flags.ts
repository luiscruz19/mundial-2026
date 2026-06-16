/**
 * Definiciones de bandera dibujada (bandas + motivo), keyed por código FIFA.
 * Portadas del prototipo (.design-reference) y ampliadas con los códigos que
 * usa el backend. El componente `Flag` resuelve la definición desde acá por
 * `code`; si no existe, cae a una caja con las 3 letras.
 *
 * El NOMBRE de la selección NO sale de acá: viene de la API (`team.name`).
 */

/** Una banda de bandera: tupla [color, peso]. */
export type Band = [string, number];

/** Definición de bandas: dirección horizontal/vertical + lista de bandas. */
export interface Bands {
  d: 'h' | 'v';
  c: Band[];
}

/** Motivo dibujado encima de las bandas. */
export interface Motif {
  k: 'disc' | 'cross' | 'star' | 'canton' | 'diamond' | 'sun' | 'maple' | 'check';
  col: string;
  col2?: string;
  pos?: number; // posición horizontal del disco (0..1)
  off?: boolean; // cruz desplazada (estilo nórdico)
}

export interface FlagDef {
  b: Bands;
  m?: Motif;
}

export type TeamCode = string;

export const FLAGS: Record<TeamCode, FlagDef> = {
  // --- portadas del prototipo ---
  ARG: { b: { d: 'h', c: [['#75AADB', 1], ['#fff', 1], ['#75AADB', 1]] }, m: { k: 'sun', col: '#F6B40E' } },
  BRA: { b: { d: 'h', c: [['#009C3B', 1]] }, m: { k: 'diamond', col: '#FFDF00', col2: '#002776' } },
  FRA: { b: { d: 'v', c: [['#0055A4', 1], ['#fff', 1], ['#EF4135', 1]] } },
  ENG: { b: { d: 'h', c: [['#fff', 1]] }, m: { k: 'cross', col: '#CF142B' } },
  ESP: { b: { d: 'h', c: [['#AA151B', 1], ['#F1BF00', 1.4], ['#AA151B', 1]] } },
  GER: { b: { d: 'h', c: [['#111', 1], ['#DD0000', 1], ['#FFCE00', 1]] } },
  POR: { b: { d: 'v', c: [['#006600', 0.4], ['#FF0000', 0.6]] }, m: { k: 'disc', col: '#FFE400', pos: 0.4 } },
  NED: { b: { d: 'h', c: [['#AE1C28', 1], ['#fff', 1], ['#21468B', 1]] } },
  BEL: { b: { d: 'v', c: [['#111', 1], ['#FAE042', 1], ['#ED2939', 1]] } },
  CRO: { b: { d: 'h', c: [['#FF0000', 1], ['#fff', 1], ['#171796', 1]] }, m: { k: 'check', col: '#FF0000' } },
  URU: { b: { d: 'h', c: [['#fff', 1], ['#0038A8', 1], ['#fff', 1], ['#0038A8', 1]] }, m: { k: 'canton', col: '#fff', col2: '#F6B40E' } },
  MEX: { b: { d: 'v', c: [['#006847', 1], ['#fff', 1], ['#CE1126', 1]] }, m: { k: 'disc', col: '#9D7B41' } },
  USA: { b: { d: 'h', c: [['#B22234', 1], ['#fff', 1], ['#B22234', 1], ['#fff', 1], ['#B22234', 1]] }, m: { k: 'canton', col: '#3C3B6E', col2: '#fff' } },
  CAN: { b: { d: 'v', c: [['#FF0000', 0.5], ['#fff', 1], ['#FF0000', 0.5]] }, m: { k: 'maple', col: '#FF0000' } },
  JPN: { b: { d: 'h', c: [['#fff', 1]] }, m: { k: 'disc', col: '#BC002D' } },
  KOR: { b: { d: 'h', c: [['#fff', 1]] }, m: { k: 'disc', col: '#CD2E3A', col2: '#0047A0' } },
  MAR: { b: { d: 'h', c: [['#C1272D', 1]] }, m: { k: 'star', col: '#006233' } },
  SEN: { b: { d: 'v', c: [['#00853F', 1], ['#FDEF42', 1], ['#E31B23', 1]] }, m: { k: 'star', col: '#00853F' } },
  COL: { b: { d: 'h', c: [['#FCD116', 2], ['#003893', 1], ['#CE1126', 1]] } },
  SUI: { b: { d: 'h', c: [['#D52B1E', 1]] }, m: { k: 'cross', col: '#fff' } },
  DEN: { b: { d: 'h', c: [['#C60C30', 1]] }, m: { k: 'cross', col: '#fff', off: true } },
  SRB: { b: { d: 'h', c: [['#C6363C', 1], ['#0C4076', 1], ['#fff', 1]] } },
  GHA: { b: { d: 'h', c: [['#CE1126', 1], ['#FCD116', 1], ['#006B3F', 1]] }, m: { k: 'star', col: '#111' } },
  NGA: { b: { d: 'v', c: [['#008751', 1], ['#fff', 1], ['#008751', 1]] } },
  AUS: { b: { d: 'h', c: [['#00247D', 1]] }, m: { k: 'canton', col: '#00247D', col2: '#fff' } },
  ECU: { b: { d: 'h', c: [['#FFDD00', 2], ['#034EA2', 1], ['#ED1C24', 1]] } },
  POL: { b: { d: 'h', c: [['#fff', 1], ['#DC143C', 1]] } },
  EGY: { b: { d: 'h', c: [['#CE1126', 1], ['#fff', 1], ['#111', 1]] } },
  CRC: { b: { d: 'h', c: [['#002B7F', 1], ['#fff', 1], ['#CE1126', 1.6], ['#fff', 1], ['#002B7F', 1]] } },
  KSA: { b: { d: 'h', c: [['#006C35', 1]] }, m: { k: 'star', col: '#fff' } },
  QAT: { b: { d: 'v', c: [['#fff', 0.3], ['#8D1B3D', 1]] } },
  CIV: { b: { d: 'v', c: [['#FF8200', 1], ['#fff', 1], ['#009A44', 1]] } },

  // --- agregados para los códigos del backend ---
  ITA: { b: { d: 'v', c: [['#008C45', 1], ['#fff', 1], ['#CD212A', 1]] } },
  IRN: { b: { d: 'h', c: [['#239F40', 1], ['#fff', 1], ['#DA0000', 1]] } },
  AUT: { b: { d: 'h', c: [['#ED2939', 1], ['#fff', 1], ['#ED2939', 1]] } },
  UKR: { b: { d: 'h', c: [['#0057B7', 1], ['#FFD700', 1]] } },
  TUR: { b: { d: 'h', c: [['#E30A17', 1]] }, m: { k: 'disc', col: '#E30A17', col2: '#fff', pos: 0.38 } },
  WAL: { b: { d: 'h', c: [['#fff', 1], ['#00AD3A', 1]] }, m: { k: 'disc', col: '#C8102E' } },
  ALG: { b: { d: 'v', c: [['#006233', 1], ['#fff', 1]] }, m: { k: 'star', col: '#D21034' } },
  SCO: { b: { d: 'h', c: [['#0065BF', 1]] }, m: { k: 'cross', col: '#fff' } },
  NOR: { b: { d: 'h', c: [['#BA0C2F', 1]] }, m: { k: 'cross', col: '#fff', off: true, col2: '#00205B' } },
  TUN: { b: { d: 'h', c: [['#E70013', 1]] }, m: { k: 'disc', col: '#fff', col2: '#E70013' } },
  PAR: { b: { d: 'h', c: [['#D52B1E', 1], ['#fff', 1], ['#0038A8', 1]] }, m: { k: 'disc', col: '#fff' } },
  RSA: { b: { d: 'h', c: [['#007749', 1], ['#FFB81C', 1], ['#001489', 1]] }, m: { k: 'canton', col: '#000', col2: '#fff' } },
  PAN: { b: { d: 'h', c: [['#fff', 1], ['#DA121A', 1]] }, m: { k: 'canton', col: '#fff', col2: '#072357' } },
  UZB: { b: { d: 'h', c: [['#0099B5', 1], ['#fff', 1], ['#1EB53A', 1]] } },
  JOR: { b: { d: 'h', c: [['#000', 1], ['#fff', 1], ['#007A3D', 1]] }, m: { k: 'star', col: '#CE1126' } },
  NZL: { b: { d: 'h', c: [['#00247D', 1]] }, m: { k: 'canton', col: '#00247D', col2: '#fff' } },
  CPV: { b: { d: 'h', c: [['#003893', 0.6], ['#fff', 0.2], ['#CF2027', 0.1], ['#fff', 0.2], ['#003893', 0.5]] }, m: { k: 'star', col: '#F7D116' } },
};
