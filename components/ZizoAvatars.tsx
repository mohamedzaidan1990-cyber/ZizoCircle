import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

const SKIN_TONES = {
  light: '#FDDBB4',
  medium: '#E8A87C',
  tan: '#C68642',
  dark: '#8D5524',
  deep: '#4A2912',
};

// Male Avatar 1 — Short hair, light skin
export function MaleAvatar1({ size = 80 }: { size?: number }) {
  const s = size / 80;
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      {/* Background */}
      <Circle cx="40" cy="40" r="40" fill="#3D2478"/>
      {/* Neck */}
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.light}/>
      {/* Face */}
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.light}/>
      {/* Hair */}
      <Path d="M22 38 Q22 22 40 20 Q58 22 58 38 L56 35 Q50 24 40 24 Q30 24 24 35 Z" fill="#2C1810"/>
      {/* Eyes */}
      <Ellipse cx="33" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.5" fill="#2C1810"/>
      <Circle cx="48" cy="43" r="2.5" fill="#2C1810"/>
      <Circle cx="35" cy="42" r="1" fill="#fff"/>
      <Circle cx="49" cy="42" r="1" fill="#fff"/>
      {/* Eyebrows */}
      <Path d="M29 37 Q33 35 37 37" stroke="#2C1810" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 35 51 37" stroke="#2C1810" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Nose */}
      <Path d="M39 46 Q40 49 41 46" stroke="#C4956A" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Smile */}
      <Path d="M33 53 Q40 58 47 53" stroke="#C4956A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Ears */}
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.light}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.light}/>
      {/* Shirt */}
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#7B5CF6"/>
    </Svg>
  );
}

// Male Avatar 2 — Curly hair, medium skin
export function MaleAvatar2({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#1A3A5C"/>
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.medium}/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.medium}/>
      {/* Curly hair */}
      <Circle cx="28" cy="35" r="7" fill="#1A0A00"/>
      <Circle cx="35" cy="28" r="7" fill="#1A0A00"/>
      <Circle cx="45" cy="27" r="7" fill="#1A0A00"/>
      <Circle cx="52" cy="32" r="7" fill="#1A0A00"/>
      <Circle cx="55" cy="40" r="6" fill="#1A0A00"/>
      <Circle cx="25" cy="42" r="6" fill="#1A0A00"/>
      <Ellipse cx="33" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.5" fill="#1A0A00"/>
      <Circle cx="48" cy="43" r="2.5" fill="#1A0A00"/>
      <Circle cx="35" cy="42" r="1" fill="#fff"/>
      <Circle cx="49" cy="42" r="1" fill="#fff"/>
      <Path d="M29 37 Q33 35 37 37" stroke="#1A0A00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 35 51 37" stroke="#1A0A00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#B07040" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 58 47 53" stroke="#B07040" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.medium}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.medium}/>
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#3BF5C8"/>
    </Svg>
  );
}

// Male Avatar 3 — Fade/clean cut, dark skin
export function MaleAvatar3({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#2C4A1A"/>
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.dark}/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.dark}/>
      {/* Fade/clean cut */}
      <Path d="M22 42 Q22 24 40 22 Q58 24 58 42 L58 38 Q54 26 40 26 Q26 26 22 38 Z" fill="#0A0A0A"/>
      <Path d="M22 38 L24 42 Q26 30 40 28 Q54 30 56 42 L58 38 Q54 24 40 22 Q26 22 22 38 Z" fill="#1A1A1A"/>
      <Ellipse cx="33" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.5" fill="#0A0A0A"/>
      <Circle cx="48" cy="43" r="2.5" fill="#0A0A0A"/>
      <Circle cx="35" cy="42" r="1" fill="#fff"/>
      <Circle cx="49" cy="42" r="1" fill="#fff"/>
      <Path d="M29 37 Q33 35 37 37" stroke="#0A0A0A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 35 51 37" stroke="#0A0A0A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#7A4020" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 58 47 53" stroke="#7A4020" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.dark}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.dark}/>
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#C8F53B"/>
    </Svg>
  );
}

// Female Avatar 1 — Long hair, light skin
export function FemaleAvatar1({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#5C1A4A"/>
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.light}/>
      {/* Long hair back */}
      <Path d="M22 38 Q20 55 24 68 L32 65 Q28 52 28 38 Z" fill="#8B4513"/>
      <Path d="M58 38 Q60 55 56 68 L48 65 Q52 52 52 38 Z" fill="#8B4513"/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.light}/>
      {/* Hair top */}
      <Path d="M22 38 Q22 22 40 20 Q58 22 58 38 Q54 30 40 28 Q26 30 22 38 Z" fill="#8B4513"/>
      <Ellipse cx="33" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.2" fill="#4A2C8B"/>
      <Circle cx="48" cy="43" r="2.2" fill="#4A2C8B"/>
      <Circle cx="35" cy="42" r="0.8" fill="#fff"/>
      <Circle cx="49" cy="42" r="0.8" fill="#fff"/>
      <Path d="M29 37 Q33 34 37 37" stroke="#8B4513" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 34 51 37" stroke="#8B4513" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#C4956A" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 59 47 53" stroke="#E87090" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Cheeks */}
      <Ellipse cx="28" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.5"/>
      <Ellipse cx="52" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.5"/>
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.light}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.light}/>
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#F53B8F"/>
    </Svg>
  );
}

// Female Avatar 2 — Hijab, medium skin
export function FemaleAvatar2({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#2C1A5C"/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.medium}/>
      {/* Hijab */}
      <Path d="M18 42 Q18 22 40 20 Q62 22 62 42 Q62 56 50 62 L40 64 L30 62 Q18 56 18 42 Z" fill="#7B5CF6"/>
      <Path d="M22 42 Q22 34 40 32 Q58 34 58 42" fill="#9B7CF6"/>
      <Ellipse cx="33" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.2" fill="#2C1A00"/>
      <Circle cx="48" cy="43" r="2.2" fill="#2C1A00"/>
      <Circle cx="35" cy="42" r="0.8" fill="#fff"/>
      <Circle cx="49" cy="42" r="0.8" fill="#fff"/>
      <Path d="M29 37 Q33 35 37 37" stroke="#2C1A00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 35 51 37" stroke="#2C1A00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#B07040" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 59 47 53" stroke="#E87090" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="28" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.4"/>
      <Ellipse cx="52" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.4"/>
    </Svg>
  );
}

// Female Avatar 3 — Afro, dark skin
export function FemaleAvatar3({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#1A2C4A"/>
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.deep}/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.deep}/>
      {/* Afro */}
      <Circle cx="40" cy="30" r="20" fill="#1A0A00"/>
      <Circle cx="25" cy="35" r="13" fill="#1A0A00"/>
      <Circle cx="55" cy="35" r="13" fill="#1A0A00"/>
      <Circle cx="32" cy="22" r="11" fill="#1A0A00"/>
      <Circle cx="48" cy="22" r="11" fill="#1A0A00"/>
      <Ellipse cx="33" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.2" fill="#1A0A00"/>
      <Circle cx="48" cy="43" r="2.2" fill="#1A0A00"/>
      <Circle cx="35" cy="42" r="0.8" fill="#fff"/>
      <Circle cx="49" cy="42" r="0.8" fill="#fff"/>
      <Path d="M29 37 Q33 35 37 37" stroke="#1A0A00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 35 51 37" stroke="#1A0A00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#5A2A10" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 59 47 53" stroke="#E87090" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="28" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.3"/>
      <Ellipse cx="52" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.3"/>
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.deep}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.deep}/>
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#F5A53B"/>
    </Svg>
  );
}

// Male Avatar 4 — Spiky anime hair, tan skin
export function MaleAvatar4({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#1A1A2E"/>
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.tan}/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.tan}/>
      {/* Spiky anime hair */}
      <Path d="M22 36 L18 20 L26 30 L24 18 L32 28 L30 16 L40 26 L50 16 L48 28 L56 18 L54 30 L62 20 L58 36 Q54 24 40 22 Q26 24 22 36 Z" fill="#FFD700"/>
      <Ellipse cx="33" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="4" ry="4.5" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.5" fill="#1A1A2E"/>
      <Circle cx="48" cy="43" r="2.5" fill="#1A1A2E"/>
      <Circle cx="35" cy="42" r="1" fill="#fff"/>
      <Circle cx="49" cy="42" r="1" fill="#fff"/>
      <Path d="M29 37 Q33 34 37 37" stroke="#8B6914" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 37 Q47 34 51 37" stroke="#8B6914" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#A07040" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 58 47 53" stroke="#A07040" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.tan}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.tan}/>
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#F53B8F"/>
    </Svg>
  );
}

// Female Avatar 4 — Ponytail, light skin, glasses
export function FemaleAvatar4({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r="40" fill="#1A4A3A"/>
      <Rect x="33" y="52" width="14" height="12" rx="4" fill={SKIN_TONES.light}/>
      {/* Ponytail */}
      <Path d="M52 28 Q62 24 64 35 Q60 32 56 36" fill="#4A2C8B"/>
      <Ellipse cx="40" cy="44" rx="18" ry="20" fill={SKIN_TONES.light}/>
      <Path d="M22 38 Q22 22 40 20 Q58 22 58 38 Q54 28 40 26 Q26 28 22 38 Z" fill="#4A2C8B"/>
      <Ellipse cx="33" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Ellipse cx="47" cy="42" rx="3.5" ry="4" fill="#fff"/>
      <Circle cx="34" cy="43" r="2.2" fill="#1A4A3A"/>
      <Circle cx="48" cy="43" r="2.2" fill="#1A4A3A"/>
      <Circle cx="35" cy="42" r="0.8" fill="#fff"/>
      <Circle cx="49" cy="42" r="0.8" fill="#fff"/>
      {/* Glasses */}
      <Rect x="28" y="38" width="10" height="8" rx="3" fill="none" stroke="#3BF5C8" strokeWidth="1.5"/>
      <Rect x="42" y="38" width="10" height="8" rx="3" fill="none" stroke="#3BF5C8" strokeWidth="1.5"/>
      <Path d="M38 42 L42 42" stroke="#3BF5C8" strokeWidth="1.5"/>
      <Path d="M28 42 L25 41" stroke="#3BF5C8" strokeWidth="1.5"/>
      <Path d="M52 42 L55 41" stroke="#3BF5C8" strokeWidth="1.5"/>
      <Path d="M29 36 Q33 34 37 36" stroke="#4A2C8B" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M43 36 Q47 34 51 36" stroke="#4A2C8B" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Path d="M39 46 Q40 49 41 46" stroke="#C4956A" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <Path d="M33 53 Q40 59 47 53" stroke="#E87090" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="28" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.5"/>
      <Ellipse cx="52" cy="50" rx="4" ry="2.5" fill="#FFB5C5" opacity="0.5"/>
      <Ellipse cx="22" cy="44" rx="3" ry="4" fill={SKIN_TONES.light}/>
      <Ellipse cx="58" cy="44" rx="3" ry="4" fill={SKIN_TONES.light}/>
      <Path d="M20 72 Q20 62 40 62 Q60 62 60 72" fill="#3BF5C8"/>
    </Svg>
  );
}

export const ZIZO_AVATARS = [
  { id: 'male1', component: MaleAvatar1, label: 'Cool Guy' },
  { id: 'male2', component: MaleAvatar2, label: 'Curly' },
  { id: 'male3', component: MaleAvatar3, label: 'Sharp' },
  { id: 'male4', component: MaleAvatar4, label: 'Anime' },
  { id: 'female1', component: FemaleAvatar1, label: 'Flowing' },
  { id: 'female2', component: FemaleAvatar2, label: 'Elegant' },
  { id: 'female3', component: FemaleAvatar3, label: 'Bold' },
  { id: 'female4', component: FemaleAvatar4, label: 'Smart' },
];