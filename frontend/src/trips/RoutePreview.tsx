import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTripUi } from './tripUi';

/** The original template artwork, rendered locally without loading a map. */
export default function RoutePreview() {
  const { c } = useTripUi();
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:${c.pale}}svg{display:block;width:100%;height:100%}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 270">
    <path d="M0 220L0 270H150L90 170L65 0H0Z" fill="#dce9f5"/>
    <path d="M65 0H360V210L150 245L95 150Z" fill="#e8eddf"/>
    <path d="M65 55H240C315 55 315 125 230 125H150C70 125 70 200 170 200H280" fill="none" stroke="#0066cc" stroke-width="6" stroke-linecap="round"/>
    ${[{ x: 65, y: 55, t: 'S' }, { x: 230, y: 55, t: '1' }, { x: 150, y: 125, t: '2' }, { x: 280, y: 200, t: '✓' }].map(p => `<circle cx="${p.x}" cy="${p.y}" r="17" fill="white" stroke="#0066cc" stroke-width="3"/><text x="${p.x}" y="${p.y + 5}" text-anchor="middle" fill="#0066cc" font-size="16" font-family="system-ui">${p.t}</text>`).join('')}
    <rect x="234" y="84" width="110" height="32" rx="8" fill="${c.white}"/><text x="289" y="104" text-anchor="middle" fill="${c.ink}" font-size="12" font-family="system-ui">Điểm tham quan</text>
    <rect x="16" y="154" width="123" height="32" rx="8" fill="${c.white}"/><text x="77.5" y="174" text-anchor="middle" fill="${c.ink}" font-size="12" font-family="system-ui">Nơi bạn yêu thích</text>
  </svg></body></html>`;
  return <View accessible accessibilityRole="image" accessibilityLabel="Minh họa hành trình từ điểm xuất phát qua hai địa điểm đến điểm kết thúc" style={{ width: '100%', maxWidth: 360, aspectRatio: 4 / 3, alignSelf: 'center', borderRadius: 18, overflow: 'hidden', backgroundColor: c.pale }}>
    <WebView accessible={false} pointerEvents="none" source={{ html }} javaScriptEnabled={false} scrollEnabled={false} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{ backgroundColor: c.pale }} />
  </View>;
}
