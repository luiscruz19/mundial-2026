/**
 * Bandera = imagen oficial bundleada (assets/flags, vía src/lib/flags.ts).
 * Mantiene la API previa (code, size, round, ring, style) y el look "Estadio"
 * (recorte redondo/rectangular + anillo). Si no hay imagen para el código,
 * cae a una caja con las 3 letras.
 */
import { View, Text, Image, type ViewStyle } from 'react-native';
import { FLAGS, type TeamCode } from '@/lib/flags';
import { useTokens, fonts } from '@/theme/tokens';

interface Props {
  code: TeamCode;
  size?: number;
  round?: boolean;
  ring?: boolean;
  style?: ViewStyle;
}

export function Flag({ code, size = 28, round = false, ring = false, style }: Props) {
  const { t } = useTokens();
  const src = code ? FLAGS[code] : undefined;
  const h = round ? size : Math.round(size * 0.72);
  const r = round ? size / 2 : Math.max(3, size * 0.18);

  // Fallback: caja con el código cuando no hay imagen.
  if (!src) {
    return (
      <View
        style={[
          {
            width: size,
            height: h,
            borderRadius: r,
            backgroundColor: t.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          },
          ring ? { borderWidth: 1, borderColor: t.line } : null,
          style,
        ]}
      >
        <Text style={{ color: t.ink3, fontSize: size * 0.3, fontFamily: fonts.textBold }}>
          {code}
        </Text>
      </View>
    );
  }

  const image = (
    <Image
      source={src}
      resizeMode="cover"
      style={{ width: size, height: h, borderRadius: r }}
    />
  );

  // Sin anillo: imagen recortada directa.
  if (!ring) {
    return <View style={[{ borderRadius: r, overflow: 'hidden' }, style]}>{image}</View>;
  }

  // Con anillo: marco surface + línea alrededor (como en el prototipo).
  return (
    <View
      style={[
        {
          padding: 1.5,
          borderRadius: r + 2,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.line,
        },
        style,
      ]}
    >
      <View style={{ borderRadius: r, overflow: 'hidden' }}>{image}</View>
    </View>
  );
}
