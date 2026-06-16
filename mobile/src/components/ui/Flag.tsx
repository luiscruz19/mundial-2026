/**
 * Bandera dibujada. Reproduce las banderas del prototipo (components.jsx):
 * bandas proporcionales (rects SVG) + un motivo encima (disco, cruz, estrella,
 * cantón, rombo, sol, hoja, damero). Soporta size, round, ring.
 *
 * Si el código no existe, cae a una caja con las 3 letras.
 */
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Polygon, Path, G, ClipPath, Defs } from 'react-native-svg';
import { FLAGS, type TeamCode, type Motif } from '@/lib/flags';
import { useTokens } from '@/theme/tokens';
import { fonts } from '@/theme/tokens';

interface Props {
  code: TeamCode;
  size?: number;
  round?: boolean;
  ring?: boolean;
  style?: ViewStyle;
}

export function Flag({ code, size = 28, round = false, ring = false, style }: Props) {
  const { t } = useTokens();
  const info = code ? FLAGS[code] : undefined;
  const h = round ? size : Math.round(size * 0.72);
  const r = round ? size / 2 : Math.max(3, size * 0.18);

  // Anillo doble: borde surface + line (como en el prototipo).
  const ringStyle: ViewStyle = ring
    ? { borderWidth: 2, borderColor: t.surface, padding: 0 }
    : {};

  if (!info) {
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
          ring && { borderWidth: 1, borderColor: t.line },
          style,
        ]}
      >
        <Text style={{ color: t.ink3, fontSize: size * 0.3, fontFamily: fonts.textBold }}>
          {code}
        </Text>
      </View>
    );
  }

  const bands = info.b;
  const isV = bands.d === 'v';
  const total = bands.c.reduce((acc, [, w]) => acc + w, 0);

  // Construye los rects de banda en coordenadas 0..size / 0..h.
  let acc = 0;
  const rects = bands.c.map(([col, w], i) => {
    const start = (acc / total) * (isV ? size : h);
    acc += w;
    const len = (w / total) * (isV ? size : h);
    return isV ? (
      <Rect key={i} x={start} y={0} width={len} height={h} fill={col} />
    ) : (
      <Rect key={i} x={0} y={start} width={size} height={len} fill={col} />
    );
  });

  return (
    <View
      style={[
        {
          width: size + (ring ? 4 : 0),
          height: h + (ring ? 4 : 0),
          borderRadius: r + (ring ? 2 : 0),
          backgroundColor: t.surface,
        },
        ring ? { borderWidth: 1.5, borderColor: t.line } : null,
        style,
      ]}
    >
      <View
        style={{
          width: size,
          height: h,
          borderRadius: r,
          overflow: 'hidden',
          margin: ring ? 1 : 0,
          ...ringStyle,
        }}
      >
        <Svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
          <Defs>
            <ClipPath id={`clip-${code}-${size}`}>
              <Rect x={0} y={0} width={size} height={h} rx={r} ry={r} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#clip-${code}-${size})`}>
            {rects}
            {info.m ? <FlagMotif m={info.m} size={size} h={h} /> : null}
          </G>
        </Svg>
      </View>
    </View>
  );
}

/** Motivo dibujado encima de las bandas. */
function FlagMotif({ m, size, h }: { m: Motif; size: number; h: number }) {
  const cx = size / 2;
  const cy = h / 2;
  switch (m.k) {
    case 'disc': {
      const d = size * 0.42;
      const left = m.pos != null ? m.pos * size : cx;
      return (
        <G>
          <Circle cx={left} cy={cy} r={d / 2} fill={m.col} />
          {m.col2 ? <Circle cx={left} cy={cy} r={d * 0.25} fill={m.col2} /> : null}
        </G>
      );
    }
    case 'cross': {
      const tk = size * 0.16;
      const offX = m.off ? size * 0.36 : cx;
      return (
        <G>
          <Rect x={0} y={cy - tk / 2} width={size} height={tk} fill={m.col} />
          <Rect x={offX - tk / 2} y={0} width={tk} height={h} fill={m.col} />
        </G>
      );
    }
    case 'star':
      return <Star cx={cx} cy={cy} r={h * 0.32} fill={m.col} />;
    case 'canton':
      return (
        <G>
          <Rect x={0} y={0} width={size * 0.5} height={h * 0.52} fill={m.col} />
          <Star cx={size * 0.25} cy={h * 0.26} r={h * 0.16} fill={m.col2 ?? '#fff'} />
        </G>
      );
    case 'diamond': {
      const dd = h * 0.92 * 0.7;
      return (
        <G>
          <Polygon
            points={`${cx},${cy - dd / 2} ${cx + dd / 2},${cy} ${cx},${cy + dd / 2} ${cx - dd / 2},${cy}`}
            fill={m.col}
          />
          {m.col2 ? <Circle cx={cx} cy={cy} r={dd * 0.18} fill={m.col2} /> : null}
        </G>
      );
    }
    case 'maple': {
      // Corazón/hoja estilizada (el prototipo usa el glifo ❤ como aproximación).
      const s = size * 0.32;
      return (
        <Path
          d={heartPath(cx, cy, s)}
          fill={m.col}
        />
      );
    }
    case 'sun': {
      const d = size * 0.16;
      return (
        <G>
          <Circle cx={cx} cy={cy} r={d + size * 0.03} fill="#fff" opacity={0.001} />
          <Circle cx={cx} cy={cy} r={d} fill={m.col} stroke="#fff" strokeWidth={size * 0.03} />
        </G>
      );
    }
    case 'check': {
      const s = size * 0.26;
      const half = s / 2;
      const x0 = cx - half;
      const y0 = h * 0.06;
      return (
        <G>
          <Rect x={x0} y={y0} width={half} height={half} fill={m.col} />
          <Rect x={x0 + half} y={y0} width={half} height={half} fill="#fff" />
          <Rect x={x0} y={y0 + half} width={half} height={half} fill="#fff" />
          <Rect x={x0 + half} y={y0 + half} width={half} height={half} fill={m.col} />
        </G>
      );
    }
    default:
      return null;
  }
}

/** Genera los puntos de una estrella de 5 puntas centrada en (cx,cy). */
function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`);
  }
  return <Polygon points={pts.join(' ')} fill={fill} />;
}

/** Path aproximado de un corazón (hoja de arce estilizada del proto). */
function heartPath(cx: number, cy: number, s: number): string {
  const top = cy - s * 0.35;
  return (
    `M ${cx} ${cy + s * 0.5}` +
    ` C ${cx - s} ${cy - s * 0.1}, ${cx - s * 0.6} ${top - s * 0.4}, ${cx} ${top}` +
    ` C ${cx + s * 0.6} ${top - s * 0.4}, ${cx + s} ${cy - s * 0.1}, ${cx} ${cy + s * 0.5} Z`
  );
}

// (StyleSheet reservado por si se necesitan estilos estáticos futuros)
StyleSheet.create({});
