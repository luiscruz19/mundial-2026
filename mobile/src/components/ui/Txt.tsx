/**
 * Helpers de texto tipográficos. Centralizan las familias de fuente (Bricolage
 * Grotesque para display/números, Hanken Grotesk para texto) para no repetir
 * fontFamily en cada pantalla.
 */
import { Text, type TextProps, type TextStyle } from 'react-native';
import { fonts, displayTracking } from '@/theme/tokens';

type Props = TextProps & { style?: TextStyle | TextStyle[] };

/** Texto display (Bricolage 800, tracking negativo). */
export function Display({ style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.display, letterSpacing: displayTracking }, style]}
    />
  );
}

/** Número/marcador (Bricolage 800, tracking negativo, tabular). */
export function Num({ style, ...rest }: Props) {
  return (
    <Text {...rest} style={[{ fontFamily: fonts.display, letterSpacing: displayTracking }, style]} />
  );
}
