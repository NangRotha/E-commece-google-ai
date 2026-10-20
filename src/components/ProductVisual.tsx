import React, { useState } from 'react';

interface ProductVisualProps {
  visualKey: string;
  imageUrl?: string;
  alt: string;
  className?: string;
}

export const ProductVisual: React.FC<ProductVisualProps> = ({
  visualKey,
  imageUrl,
  alt,
  className = 'w-full h-full',
}) => {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-[#F2EFE9] ${className}`}>
        <img
          src={imageUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#F3EFE6] via-[#EBE5D8] to-[#DFD7C6] flex items-center justify-center ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Subtle architectural travertine pedestal shadow */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#D5CBB8]/70 to-transparent" />

      {visualKey === 'hero' && (
        <svg
          viewBox="0 0 800 450"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full object-cover"
          fill="none"
        >
          <defs>
            <linearGradient id="heroBg" x1="0" y1="0" x2="800" y2="450" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#262320" />
              <stop offset="55%" stopColor="#1C1917" />
              <stop offset="100%" stopColor="#12100E" />
            </linearGradient>
            <linearGradient id="brassGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EAB308" />
              <stop offset="50%" stopColor="#CA8A04" />
              <stop offset="100%" stopColor="#854D0E" />
            </linearGradient>
            <radialGradient id="warmLampLight" cx="65%" cy="35%" r="45%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#D97706" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="450" fill="url(#heroBg)" />
          <rect width="800" height="450" fill="url(#warmLampLight)" />
          {/* Travertine architectural desk slab */}
          <path d="M0 330 L800 330 L800 450 L0 450 Z" fill="#2E2A25" />
          <line x1="0" y1="330" x2="800" y2="330" stroke="#57534E" strokeWidth="1.5" />

          {/* Architectural Brass Lamp on Right */}
          <rect x="540" y="314" width="90" height="16" rx="3" fill="#44403C" />
          <rect x="581" y="110" width="8" height="204" fill="url(#brassGlow)" />
          <rect x="440" y="104" width="210" height="12" rx="6" fill="url(#brassGlow)" />
          <rect x="455" y="116" width="170" height="4" fill="#FEF08A" opacity="0.85" />

          {/* CNC Mechanical Keyboard in Center */}
          <g transform="translate(230, 275)">
            <rect x="0" y="0" width="240" height="52" rx="8" fill="#D6D3D1" stroke="#A8A29E" strokeWidth="2" />
            <rect x="10" y="8" width="220" height="36" rx="4" fill="#292524" />
            {/* Keycap rows */}
            <g fill="#F5F5F4">
              <rect x="16" y="12" width="14" height="8" rx="1.5" fill="#D97706" />
              <rect x="34" y="12" width="14" height="8" rx="1.5" />
              <rect x="52" y="12" width="14" height="8" rx="1.5" />
              <rect x="70" y="12" width="14" height="8" rx="1.5" />
              <rect x="88" y="12" width="14" height="8" rx="1.5" />
              <rect x="106" y="12" width="14" height="8" rx="1.5" />
              <rect x="124" y="12" width="14" height="8" rx="1.5" />
              <rect x="142" y="12" width="14" height="8" rx="1.5" />
              <rect x="160" y="12" width="14" height="8" rx="1.5" />
              <rect x="178" y="12" width="14" height="8" rx="1.5" />
              <rect x="196" y="12" width="26" height="8" rx="1.5" fill="#78716C" />

              <rect x="16" y="23" width="20" height="8" rx="1.5" fill="#78716C" />
              <rect x="40" y="23" width="14" height="8" rx="1.5" />
              <rect x="58" y="23" width="14" height="8" rx="1.5" />
              <rect x="76" y="23" width="14" height="8" rx="1.5" />
              <rect x="94" y="23" width="14" height="8" rx="1.5" />
              <rect x="112" y="23" width="14" height="8" rx="1.5" />
              <rect x="130" y="23" width="14" height="8" rx="1.5" />
              <rect x="148" y="23" width="14" height="8" rx="1.5" />
              <rect x="166" y="23" width="14" height="8" rx="1.5" />
              <rect x="184" y="23" width="38" height="8" rx="1.5" fill="#D97706" />

              <rect x="16" y="34" width="26" height="7" rx="1.5" fill="#78716C" />
              <rect x="46" y="34" width="20" height="7" rx="1.5" fill="#78716C" />
              <rect x="70" y="34" width="88" height="7" rx="1.5" fill="#E7E5E4" />
              <rect x="162" y="34" width="26" height="7" rx="1.5" fill="#78716C" />
              <rect x="192" y="34" width="30" height="7" rx="1.5" fill="#78716C" />
            </g>
          </g>

          {/* Studio Headphones on Left Pedestal */}
          <g transform="translate(75, 155)">
            <rect x="15" y="145" width="90" height="30" rx="4" fill="#44403C" />
            <path d="M25 85 C25 25, 95 25, 95 85" stroke="#D6D3D1" strokeWidth="10" strokeLinecap="round" fill="none" />
            <rect x="14" y="72" width="22" height="48" rx="11" fill="#A8A29E" stroke="#57534E" strokeWidth="2" />
            <rect x="84" y="72" width="22" height="48" rx="11" fill="#A8A29E" stroke="#57534E" strokeWidth="2" />
            <rect x="57" y="120" width="6" height="25" fill="#78716C" />
          </g>
        </svg>
      )}

      {visualKey === 'headphones' && (
        <svg viewBox="0 0 320 240" className="w-4/5 h-4/5" fill="none">
          <ellipse cx="160" cy="204" rx="76" ry="12" fill="#C7B9A3" opacity="0.7" />
          {/* Headband arch */}
          <path
            d="M96 125 C96 42, 224 42, 224 125"
            stroke="#57534E"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M104 115 C104 52, 216 52, 216 115"
            stroke="#A8A29E"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Left & Right Brushed Titanium Ear Cups */}
          <rect x="76" y="108" width="36" height="72" rx="18" fill="#44403C" stroke="#292524" strokeWidth="2.5" />
          <rect x="102" y="114" width="14" height="60" rx="7" fill="#1C1917" />
          <rect x="208" y="108" width="36" height="72" rx="18" fill="#44403C" stroke="#292524" strokeWidth="2.5" />
          <rect x="204" y="114" width="14" height="60" rx="7" fill="#1C1917" />
          {/* Brass Accent Ring */}
          <circle cx="94" cy="144" r="6" stroke="#D97706" strokeWidth="2" />
          <circle cx="226" cy="144" r="6" stroke="#D97706" strokeWidth="2" />
        </svg>
      )}

      {visualKey === 'keyboard' && (
        <svg viewBox="0 0 320 240" className="w-4/5 h-4/5" fill="none">
          <ellipse cx="160" cy="195" rx="115" ry="12" fill="#C7B9A3" opacity="0.65" />
          <rect x="36" y="82" width="248" height="96" rx="12" fill="#44403C" stroke="#292524" strokeWidth="3" />
          <rect x="46" y="92" width="228" height="76" rx="6" fill="#1C1917" />
          {/* Keycaps */}
          <g fill="#E7E5E4">
            <rect x="54" y="100" width="18" height="14" rx="2.5" fill="#D97706" />
            <rect x="76" y="100" width="18" height="14" rx="2.5" />
            <rect x="98" y="100" width="18" height="14" rx="2.5" />
            <rect x="120" y="100" width="18" height="14" rx="2.5" />
            <rect x="142" y="100" width="18" height="14" rx="2.5" />
            <rect x="164" y="100" width="18" height="14" rx="2.5" />
            <rect x="186" y="100" width="18" height="14" rx="2.5" />
            <rect x="208" y="100" width="18" height="14" rx="2.5" />
            <rect x="230" y="100" width="36" height="14" rx="2.5" fill="#78716C" />

            <rect x="54" y="118" width="26" height="14" rx="2.5" fill="#78716C" />
            <rect x="84" y="118" width="18" height="14" rx="2.5" />
            <rect x="106" y="118" width="18" height="14" rx="2.5" />
            <rect x="128" y="118" width="18" height="14" rx="2.5" />
            <rect x="150" y="118" width="18" height="14" rx="2.5" />
            <rect x="172" y="118" width="18" height="14" rx="2.5" />
            <rect x="194" y="118" width="18" height="14" rx="2.5" />
            <rect x="216" y="118" width="50" height="14" rx="2.5" fill="#D97706" />

            <rect x="54" y="136" width="32" height="14" rx="2.5" fill="#78716C" />
            <rect x="90" y="136" width="18" height="14" rx="2.5" />
            <rect x="112" y="136" width="96" height="14" rx="2.5" fill="#F5F5F4" />
            <rect x="212" y="136" width="24" height="14" rx="2.5" fill="#78716C" />
            <rect x="240" y="136" width="26" height="14" rx="2.5" fill="#78716C" />
          </g>
        </svg>
      )}

      {visualKey === 'coffee' && (
        <svg viewBox="0 0 320 240" className="w-4/5 h-4/5" fill="none">
          <ellipse cx="160" cy="202" rx="75" ry="12" fill="#C7B9A3" opacity="0.7" />
          {/* Ceramic V60 Dripper on top */}
          <path d="M112 58 L208 58 L182 118 L138 118 Z" fill="#292524" stroke="#1C1917" strokeWidth="2.5" />
          <path d="M204 70 C224 70, 224 102, 188 102" stroke="#292524" strokeWidth="7" strokeLinecap="round" />
          {/* Dripper Base Ring */}
          <rect x="122" y="116" width="76" height="7" rx="3.5" fill="#78350F" />
          {/* Glass / Stoneware Carafe Server */}
          <path d="M128 123 L192 123 L206 194 L114 194 Z" fill="#44403C" stroke="#1C1917" strokeWidth="2.5" />
          <path d="M120 158 L200 158 L204 191 L116 191 Z" fill="#78350F" />
          <path d="M194 134 C220 134, 220 176, 198 176" stroke="#292524" strokeWidth="6" strokeLinecap="round" />
        </svg>
      )}

      {visualKey === 'lamp' && (
        <svg viewBox="0 0 320 240" className="w-4/5 h-4/5" fill="none">
          <ellipse cx="160" cy="204" rx="70" ry="11" fill="#C7B9A3" opacity="0.7" />
          {/* Light Cone */}
          <path d="M90 68 L230 68 L260 200 L60 200 Z" fill="#F59E0B" opacity="0.14" />
          {/* Obsidian Base */}
          <rect x="130" y="182" width="60" height="20" rx="4" fill="#1C1917" />
          {/* Brass Stem */}
          <rect x="156" y="54" width="8" height="128" fill="#B45309" />
          {/* Cantilever Light Bar */}
          <rect x="76" y="56" width="168" height="12" rx="6" fill="#D97706" stroke="#78350F" strokeWidth="2" />
          <rect x="88" y="68" width="144" height="3" fill="#FEF08A" />
        </svg>
      )}

      {visualKey === 'beans' && (
        <svg viewBox="0 0 320 240" className="w-4/5 h-4/5" fill="none">
          <ellipse cx="160" cy="204" rx="68" ry="11" fill="#C7B9A3" opacity="0.7" />
          {/* Matte Pouch Bag */}
          <path d="M108 54 L212 54 L220 196 L100 196 Z" fill="#292524" stroke="#1C1917" strokeWidth="2.5" />
          <rect x="108" y="44" width="104" height="12" rx="2" fill="#44403C" />
          {/* Artisanal Label */}
          <rect x="118" y="88" width="84" height="74" rx="3" fill="#F5F5F4" />
          <rect x="128" y="98" width="64" height="8" rx="1" fill="#B45309" />
          <rect x="128" y="114" width="48" height="5" rx="1" fill="#57534E" />
          <rect x="128" y="124" width="54" height="5" rx="1" fill="#78716C" />
          <circle cx="160" cy="72" r="5" fill="#78716C" />
          {/* Coffee Beans in foreground */}
          <ellipse cx="115" cy="196" rx="10" ry="7" fill="#451A03" />
          <ellipse cx="206" cy="197" rx="11" ry="7" fill="#451A03" />
        </svg>
      )}

      {visualKey === 'charger' && (
        <svg viewBox="0 0 320 240" className="w-4/5 h-4/5" fill="none">
          <ellipse cx="160" cy="202" rx="70" ry="11" fill="#C7B9A3" opacity="0.7" />
          {/* GaN Block */}
          <rect x="104" y="68" width="112" height="126" rx="14" fill="#292524" stroke="#1C1917" strokeWidth="3" />
          <rect x="118" y="82" width="84" height="36" rx="6" fill="#1C1917" />
          {/* Wattage Readout */}
          <text x="135" y="106" fill="#F59E0B" fontSize="16" fontFamily="monospace" fontWeight="bold">
            140W
          </text>
          {/* USB-C Ports */}
          <rect x="144" y="132" width="32" height="8" rx="4" fill="#D97706" />
          <rect x="144" y="148" width="32" height="8" rx="4" fill="#D97706" />
          <rect x="144" y="164" width="32" height="8" rx="4" fill="#78716C" />
        </svg>
      )}
    </div>
  );
};
