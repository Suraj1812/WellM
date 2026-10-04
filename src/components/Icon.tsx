import React from 'react';
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';
export type IconName =
  | 'moon'
  | 'sun'
  | 'chart'
  | 'shield'
  | 'mic'
  | 'arrow'
  | 'check'
  | 'info'
  | 'play'
  | 'pause'
  | 'stop'
  | 'close'
  | 'trash'
  | 'volume'
  | 'leaf'
  | 'phone'
  | 'chevron'
  | 'sparkles';
export function Icon({
  name,
  size = 20,
  color = '#3D604B',
  stroke = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const shared = {
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...shared}>
      {name === 'moon' && <Path d="M20.5 13.4A8.7 8.7 0 0 1 10.6 3.5 8.7 8.7 0 1 0 20.5 13.4Z" />}
      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" />
          <Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </>
      )}
      {name === 'chart' && (
        <>
          <Rect x="4" y="13" width="3" height="7" rx="1" />
          <Rect x="10.5" y="7" width="3" height="13" rx="1" />
          <Rect x="17" y="3" width="3" height="17" rx="1" />
        </>
      )}
      {name === 'shield' && (
        <>
          <Path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
          <Path d="m8.5 12 2.5 2.5 4.5-5" />
        </>
      )}
      {name === 'mic' && (
        <>
          <Rect x="9" y="2.5" width="6" height="12" rx="3" />
          <Path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18v3m-4 0h8" />
        </>
      )}
      {name === 'arrow' && <Path d="M4 12h15m-6-6 6 6-6 6" />}
      {name === 'check' && <Polyline points="5,12 10,17 19,7" />}
      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Line x1="12" y1="11" x2="12" y2="17" />
          <Circle cx="12" cy="7" r=".5" fill={color} />
        </>
      )}
      {name === 'play' && <Path fill={color} stroke="none" d="m8 4 12 8-12 8V4Z" />}
      {name === 'pause' && (
        <>
          <Rect x="6" y="4" width="4" height="16" rx="1" fill={color} />
          <Rect x="14" y="4" width="4" height="16" rx="1" fill={color} />
        </>
      )}
      {name === 'stop' && <Rect x="6" y="6" width="12" height="12" rx="2" fill={color} />}
      {name === 'close' && <Path d="m6 6 12 12M6 18 18 6" />}
      {name === 'trash' && <Path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />}
      {name === 'volume' && (
        <>
          <Path d="m11 4-6 5H2v6h3l6 5V4Z" />
          <Path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      )}
      {name === 'leaf' && (
        <>
          <Path d="M20 3C7 2 2 10 5 16s13 7 15-13Z" />
          <Path d="M4 21c0-6 5-11 10-13" />
        </>
      )}
      {name === 'phone' && (
        <>
          <Rect x="6" y="2" width="12" height="20" rx="3" />
          <Path d="M10 5h4m-3 14h2" />
        </>
      )}
      {name === 'chevron' && <Path d="m9 5 7 7-7 7" />}
      {name === 'sparkles' && (
        <Path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3ZM20 2v4m-2-2h4" />
      )}
    </Svg>
  );
}
