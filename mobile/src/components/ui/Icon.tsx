/**
 * Icono SVG. Reproduce el objeto ICONS del prototipo (components.jsx) usando
 * react-native-svg. Por defecto dibuja con stroke; con `fill` rellena.
 */
import Svg, { Path } from 'react-native-svg';

export const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
  calendar:
    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5zM4 9.5h16M8 3.5v4M16 3.5v4',
  trophy:
    'M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9.5 13.5h5M10 13.5l-.5 4h5l-.5-4M8 20h8',
  chart: 'M4 20V5M4 20h16M8 17v-5M12 17V8M16 17v-8',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0',
  play: 'M7 4.5v15l13-7.5z',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
  share: 'M12 3v12M8 7l4-4 4 4M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  whistle: 'M14 8a5 5 0 1 0 0 8 5 5 0 0 0 0-8zM14 8h7l-1 3M3 9h6',
  info: 'M12 8h.01M11 12h1v4h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  dice: 'M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  pitch: 'M3 5h18v14H3zM12 5v14M12 9a3 3 0 0 0 0 6 3 3 0 0 0 0-6M3 9h3v6H3M18 9h3v6h-3',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.8-2.8.8-2.8S8 11 9 11.5C9 9 12 3 12 3z',
  arrowUp: 'M12 19V6M6 11l6-6 6 6',
  x: 'M6 6l12 12M18 6 6 18',
  sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a0.5 0.5 0 0 0-.7-.6A9 9 0 1 0 20.6 15.2a0.5 0.5 0 0 0-.6-.7z',
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: boolean;
}

export function Icon({ name, size = 22, color = 'currentColor', stroke = 2, fill = false }: Props) {
  const d = ICONS[name] ?? ICONS.info;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? color : 'none'}
      stroke={fill ? 'none' : color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={d} />
    </Svg>
  );
}
