/**
 * Banderas oficiales como imágenes bundleadas (offline). Mapa código FIFA → asset PNG.
 * Las imágenes viven en assets/flags/ (descargadas de flagcdn). RN exige require estático,
 * por eso es un mapa explícito. Para agregar/corregir: poné el PNG y agregá la línea.
 */
import type { ImageSourcePropType } from 'react-native';

export const FLAGS: Record<string, ImageSourcePropType> = {
  ARG: require('../../assets/flags/ARG.png'),
  ALG: require('../../assets/flags/ALG.png'),
  AUS: require('../../assets/flags/AUS.png'),
  AUT: require('../../assets/flags/AUT.png'),
  BEL: require('../../assets/flags/BEL.png'),
  BIH: require('../../assets/flags/BIH.png'),
  BRA: require('../../assets/flags/BRA.png'),
  CAN: require('../../assets/flags/CAN.png'),
  CIV: require('../../assets/flags/CIV.png'),
  COD: require('../../assets/flags/COD.png'),
  COL: require('../../assets/flags/COL.png'),
  CPV: require('../../assets/flags/CPV.png'),
  CRO: require('../../assets/flags/CRO.png'),
  CUW: require('../../assets/flags/CUW.png'),
  CZE: require('../../assets/flags/CZE.png'),
  ECU: require('../../assets/flags/ECU.png'),
  EGY: require('../../assets/flags/EGY.png'),
  ENG: require('../../assets/flags/ENG.png'),
  ESP: require('../../assets/flags/ESP.png'),
  FRA: require('../../assets/flags/FRA.png'),
  GER: require('../../assets/flags/GER.png'),
  GHA: require('../../assets/flags/GHA.png'),
  HAI: require('../../assets/flags/HAI.png'),
  IRN: require('../../assets/flags/IRN.png'),
  IRQ: require('../../assets/flags/IRQ.png'),
  JOR: require('../../assets/flags/JOR.png'),
  JPN: require('../../assets/flags/JPN.png'),
  KOR: require('../../assets/flags/KOR.png'),
  KSA: require('../../assets/flags/KSA.png'),
  MAR: require('../../assets/flags/MAR.png'),
  MEX: require('../../assets/flags/MEX.png'),
  NED: require('../../assets/flags/NED.png'),
  NOR: require('../../assets/flags/NOR.png'),
  NZL: require('../../assets/flags/NZL.png'),
  PAN: require('../../assets/flags/PAN.png'),
  PAR: require('../../assets/flags/PAR.png'),
  POR: require('../../assets/flags/POR.png'),
  QAT: require('../../assets/flags/QAT.png'),
  RSA: require('../../assets/flags/RSA.png'),
  SCO: require('../../assets/flags/SCO.png'),
  SEN: require('../../assets/flags/SEN.png'),
  SUI: require('../../assets/flags/SUI.png'),
  SWE: require('../../assets/flags/SWE.png'),
  TUN: require('../../assets/flags/TUN.png'),
  TUR: require('../../assets/flags/TUR.png'),
  URU: require('../../assets/flags/URU.png'),
  USA: require('../../assets/flags/USA.png'),
  UZB: require('../../assets/flags/UZB.png'),
};

export type TeamCode = string;

/** ¿Tenemos imagen para este código? */
export const hasFlag = (code?: string | null): boolean => !!code && code in FLAGS;
