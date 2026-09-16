import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon, G, Ellipse } from 'react-native-svg';

export type IconName =
  | 'home' | 'pill' | 'alert' | 'leaf' | 'chart' | 'chat' | 'gear' | 'shield'
  | 'bell' | 'check' | 'clock' | 'close' | 'plus' | 'chevronRight' | 'chevronLeft'
  | 'chevronDown' | 'sparkle' | 'flame' | 'lock' | 'mail' | 'upload' | 'camera'
  | 'file' | 'download' | 'trash' | 'arrowRight' | 'speaker' | 'phone' | 'people'
  | 'bulb' | 'send' | 'dots' | 'droplet' | 'moon' | 'sun' | 'edit' | 'battery';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** Solid-fill icons (sparkle, flame) ignore stroke. */
  filled?: boolean;
}

export function Icon({ name, size = 20, color = '#2D2438', filled = false }: Props) {
  const s = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 11.5 12 4l8 7.5" {...s} />
          <Path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" {...s} />
        </Svg>
      );
    case 'pill':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G rotation={45} origin="12, 12">
            <Rect x="3" y="9" width="18" height="6" rx="3" {...s} />
            <Line x1="12" y1="9" x2="12" y2="15" {...s} />
          </G>
        </Svg>
      );
    case 'alert':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 4 2 20h20L12 4z" {...s} />
          <Line x1="12" y1="10" x2="12" y2="14.5" {...s} />
        </Svg>
      );
    case 'leaf':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 21c9 0 14-5 14-14a1 1 0 0 0-1-1C9 6 5 11 5 20a1 1 0 0 0 0 1z" {...s} />
          <Path d="M5 21c3-6 6-9 12-12" {...s} />
        </Svg>
      );
    case 'chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="5" y1="20" x2="5" y2="12" {...s} />
          <Line x1="12" y1="20" x2="12" y2="6" {...s} />
          <Line x1="19" y1="20" x2="19" y2="15" {...s} />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4H6a2 2 0 0 1-2-2V6z" {...s} />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3" {...s} />
          <Path d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.9 3h-4l-.4 2.9a8 8 0 0 0-1.7 1l-2.5-1-2 3.4L6.4 11a8 8 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1c.5.4 1.1.8 1.7 1l.4 2.9h4l.4-2.9c.6-.2 1.2-.6 1.7-1l2.5 1 2-3.4L19.4 13z" {...s} />
        </Svg>
      );
    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" {...s} />
          <Path d="M9 12l2 2 4-4" {...s} />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...s} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...s} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="4 12 9 17 20 6" {...s} strokeWidth={2.6} />
        </Svg>
      );
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...s} />
          <Polyline points="12 7 12 12 16 14" {...s} />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="5" y1="5" x2="19" y2="19" {...s} strokeWidth={2.2} />
          <Line x1="19" y1="5" x2="5" y2="19" {...s} strokeWidth={2.2} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="5" x2="12" y2="19" {...s} strokeWidth={2.6} />
          <Line x1="5" y1="12" x2="19" y2="12" {...s} strokeWidth={2.6} />
        </Svg>
      );
    case 'chevronRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="9 5 16 12 9 19" {...s} strokeWidth={2.4} />
        </Svg>
      );
    case 'chevronLeft':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="15 18 9 12 15 6" {...s} strokeWidth={2.4} />
        </Svg>
      );
    case 'chevronDown':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="6 9 12 15 18 9" {...s} strokeWidth={2.4} />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8 12 3z" fill={color} />
        </Svg>
      );
    case 'flame':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2c1 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-1-2-1-3 2 1 3 3 3 5a6 6 0 0 1-12 0C6 8 9 6 12 2z" fill={color} />
        </Svg>
      );
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="5" y="11" width="14" height="9" rx="2" {...s} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...s} />
        </Svg>
      );
    case 'mail':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="5" width="18" height="14" rx="2" {...s} />
          <Polyline points="3 7 12 13 21 7" {...s} />
        </Svg>
      );
    case 'upload':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 16 9a4.5 4.5 0 0 1 1 8.9" {...s} />
          <Path d="M12 12v7" {...s} />
          <Polyline points="9 15 12 12 15 15" {...s} />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z" {...s} />
          <Circle cx="12" cy="13" r="4" {...s} />
        </Svg>
      );
    case 'file':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
          <Polyline points="14 2 14 8 20 8" {...s} />
        </Svg>
      );
    case 'download':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3v12" {...s} />
          <Polyline points="7 10 12 15 17 10" {...s} />
          <Path d="M5 21h14" {...s} />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="3 6 5 6 21 6" {...s} />
          <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" {...s} />
        </Svg>
      );
    case 'arrowRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="5" y1="12" x2="19" y2="12" {...s} strokeWidth={2.4} />
          <Polyline points="13 6 19 12 13 18" {...s} strokeWidth={2.4} />
        </Svg>
      );
    case 'speaker':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M11 5 6 9H2v6h4l5 4z" {...s} />
          <Path d="M15.5 8.5a5 5 0 0 1 0 7" {...s} />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 3h4l1 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 1v4a2 2 0 0 1-2 2C10.5 20 4 13.5 4 5a2 2 0 0 1 2-2z" {...s} />
        </Svg>
      );
    case 'people':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="9" cy="7" r="3" {...s} />
          <Path d="M2 21c0-4 3-6 7-6s7 2 7 6" {...s} />
          <Circle cx="17" cy="8" r="2.4" {...s} />
        </Svg>
      );
    case 'bulb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11.2c.6.4 1 1 1 1.8h4c0-.8.4-1.4 1-1.8A6 6 0 0 0 12 3z" {...s} />
        </Svg>
      );
    case 'send':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="22" y1="2" x2="11" y2="13" {...s} strokeWidth={2.2} />
          <Polygon points="22 2 15 22 11 13 2 9 22 2" {...s} strokeWidth={2.2} />
        </Svg>
      );
    case 'dots':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="5" cy="12" r="1.6" fill={color} />
          <Circle cx="12" cy="12" r="1.6" fill={color} />
          <Circle cx="19" cy="12" r="1.6" fill={color} />
        </Svg>
      );
    case 'droplet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3c4 5 7 8 7 12a7 7 0 0 1-14 0c0-4 3-7 7-12z" {...s} />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" {...s} />
        </Svg>
      );
    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="4" {...s} />
          <Line x1="12" y1="2" x2="12" y2="4" {...s} />
          <Line x1="12" y1="20" x2="12" y2="22" {...s} />
          <Line x1="2" y1="12" x2="4" y2="12" {...s} />
          <Line x1="20" y1="12" x2="22" y2="12" {...s} />
        </Svg>
      );
    case 'edit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 20h9" {...s} />
          <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" {...s} />
        </Svg>
      );
    case 'battery':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="2" y="8" width="17" height="8" rx="2" {...s} />
          <Line x1="22" y1="10" x2="22" y2="14" {...s} />
        </Svg>
      );
    default:
      return null;
  }
}

/** The MediBloom flower-and-capsule mark. */
export function Logo({ size = 32 }: { size?: number }) {
  const petals = [
    { rot: 0, fill: '#E85D8A', o: 0.9 },
    { rot: 60, fill: '#F4A6C1', o: 0.85 },
    { rot: 120, fill: '#8B5FBF', o: 0.9 },
    { rot: 180, fill: '#C9B6E4', o: 0.85 },
    { rot: 240, fill: '#D4A574', o: 0.85 },
    { rot: 300, fill: '#E85D8A', o: 0.8 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G x={20} y={20}>
        {petals.map((p) => (
          <Ellipse
            key={p.rot}
            cx={0}
            cy={-10}
            rx={5.5}
            ry={10}
            fill={p.fill}
            opacity={p.o}
            rotation={p.rot}
            origin="0, 0"
          />
        ))}
        <Circle cx={0} cy={0} r={6.5} fill="#FFFFFF" />
        <Rect x={-4} y={-1.4} width={8} height={2.8} rx={1.4} fill="#8B5FBF" rotation={45} origin="0, 0" />
      </G>
    </Svg>
  );
}
