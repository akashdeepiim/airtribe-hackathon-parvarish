import { useId } from 'react';
import type { StageId } from '../../content/marketing/journey';

export function SproutMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M25 39V23M25 28C10 28 6 18 8 9c13 0 19 7 17 19ZM25 23C24 11 31 5 41 7c0 11-6 17-16 16Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 40c5-4 16-4 21 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 0c2 17 7 22 24 24-17 2-22 7-24 24C22 31 17 26 0 24 17 22 22 17 24 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Original vector characters. Gradients and dimensional shadows stay crisp at every size. */
export function Person({ stage, className = '' }: { stage: StageId; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const skin = `skin-${uid}`,
    cloth = `cloth-${uid}`,
    hair = `hair-${uid}`,
    shadow = `shadow-${uid}`;
  const parent = stage === 'planning' || stage === 'expecting';
  const pregnant = stage === 'expecting';
  const baby = stage === 'baby';
  const big = stage === 'preschool';
  return (
    <svg
      className={className}
      viewBox="0 0 300 360"
      fill="none"
      role="img"
      aria-label={
        parent
          ? pregnant
            ? 'Sculpted illustration of an expecting parent'
            : 'Sculpted illustration of a woman with a small sprout'
          : baby
            ? 'Sculpted illustration of a baby wrapped in a blanket'
            : 'Sculpted illustration of a young child'
      }
    >
      <defs>
        <radialGradient id={skin} cx=".32" cy=".25" r=".85">
          <stop stopColor="#F4C3A1" />
          <stop offset=".64" stopColor="#DFA07B" />
          <stop offset="1" stopColor="#BD785A" />
        </radialGradient>
        <linearGradient
          id={cloth}
          x1="50"
          y1="130"
          x2="235"
          y2="320"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={parent ? '#B5C8AC' : '#F1B24D'} />
          <stop offset=".5" stopColor={parent ? '#7E9F84' : '#DE8D32'} />
          <stop offset="1" stopColor={parent ? '#4C725C' : '#B76529'} />
        </linearGradient>
        <linearGradient id={hair} x1="80" y1="45" x2="205" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#62483E" />
          <stop offset="1" stopColor="#302A27" />
        </linearGradient>
        <filter id={shadow} x="-50%" y="-40%" width="200%" height="200%">
          <feDropShadow dx="1" dy="7" stdDeviation="5" floodColor="#463C2D" floodOpacity=".15" />
        </filter>
      </defs>
      <ellipse cx="151" cy="329" rx={parent ? 67 : 70} ry="12" fill="#554B31" opacity=".12" />
      {parent ? (
        <g filter={`url(#${shadow})`}>
          <path
            d="M117 266v50c-20 0-25 12-14 15h36l6-67M159 263l9 54c-11 2-14 12-4 14h36c8-6-4-15-14-17l-3-48"
            fill={`url(#${skin})`}
          />
          <path
            d="M106 141c-17 18-23 67-26 116-1 20 24 26 71 25 53 1 72-11 63-31-10-26-13-80-31-106Z"
            fill={`url(#${cloth})`}
          />
          {pregnant && <ellipse cx="175" cy="210" rx="48" ry="47" fill={`url(#${cloth})`} />}
          <path d="M129 124v23c0 19 34 19 34 0v-24" fill={`url(#${skin})`} />
          <path
            d="M102 128C77 99 86 48 123 41c34-19 80 6 79 49 0 32-3 54-32 59Z"
            fill={`url(#${hair})`}
          />
          <ellipse cx="147" cy="98" rx="40" ry="48" fill={`url(#${skin})`} />
          <path
            d="M106 101c-11-4-15-16-12-29 5-24 29-34 54-30 33-1 50 23 48 47-20 1-40-13-49-29-5 22-22 32-41 35Z"
            fill={`url(#${hair})`}
          />
          <path d="M131 105v3m29-3v3" stroke="#49392D" strokeWidth="3" strokeLinecap="round" />
          <path d="M138 123q9 7 17-1" stroke="#A56753" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="118" cy="117" rx="7" ry="4" fill="#D98A77" opacity=".55" />
          <path
            d={pregnant ? 'M107 161c-16 30-8 60 19 67l29 6' : 'M106 161c-17 30-4 61 26 53l26-9'}
            stroke={`url(#${skin})`}
            strokeWidth="19"
            strokeLinecap="round"
          />
          <path
            d={pregnant ? 'M187 163c28 22 30 36 10 45l-20 7' : 'M186 161c26 36 8 53-20 45'}
            stroke={`url(#${skin})`}
            strokeWidth="18"
            strokeLinecap="round"
          />
          {!pregnant && (
            <g>
              <path d="m143 199 5 32h27l5-32Z" fill="#F0C69F" />
              <path d="M161 200v-29" stroke="#3F6651" strokeWidth="4" />
              <path
                d="M160 190c-20 1-24-10-21-20 15-2 24 8 21 20M162 182c1-16 9-23 21-18 0 14-8 20-21 18"
                fill="#446E53"
              />
            </g>
          )}
        </g>
      ) : baby ? (
        <g transform="rotate(-12 150 190)" filter={`url(#${shadow})`}>
          <rect x="82" y="98" width="140" height="220" rx="70" fill="#F2E7C9" />
          <path d="M88 193q79 12 128 57c-10 69-109 91-133 13Z" fill="#E9DAB2" />
          <path d="M210 184q-77 28-116 89" stroke="#CFBB8C" strokeWidth="3" opacity=".7" />
          <ellipse cx="152" cy="147" rx="51" ry="52" fill={`url(#${skin})`} />
          <path
            d="M143 97c-3-17 18-13 12 0"
            stroke="#68503D"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M126 145q6 5 12 0m26 0q6 5 12 0"
            stroke="#654738"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M148 168q6 4 12-1" stroke="#A76A54" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="119" cy="160" rx="8" ry="5" fill="#D68A77" opacity=".6" />
          <ellipse cx="181" cy="160" rx="8" ry="5" fill="#D68A77" opacity=".6" />
          <path d="m146 247 10 6 10-6-2 12 7 9-13 2-7 10-5-12-11-5 10-6Z" fill="#FCF5DE" />
        </g>
      ) : (
        <g
          filter={`url(#${shadow})`}
          transform={big ? 'translate(0 -13) scale(1 1.04)' : undefined}
        >
          <path
            d="m118 256-11 53m55-53 18 52"
            stroke={`url(#${skin})`}
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M105 301c-18 2-34 14-26 23 13 10 44 1 44-8l-2-14M175 301c-1 21 18 29 34 21 14-9-2-18-17-20"
            fill="#466757"
          />
          <path
            d={
              big
                ? 'M108 166C96 140 83 141 75 124m112 45c30-15 38-32 41-50'
                : 'M111 174c-25-13-37-8-51-21m126 23c26-12 35-28 45-33'
            }
            stroke={`url(#${skin})`}
            strokeWidth="22"
            strokeLinecap="round"
          />
          <path
            d="M109 153c-19 20-19 68-12 102 18 18 76 20 90 0 9-38 4-80-15-102Z"
            fill="#EFE8D5"
          />
          <path
            d="M105 171v42l-12 22 5 29 38 9 7-34 7 34 36-11 5-31-15-19v-42h-17v25h-37v-25Z"
            fill={`url(#${cloth})`}
          />
          <path d="M129 215h29v20q-15 10-29 0Z" fill="#F4BC5E" />
          <circle cx="115" cy="202" r="4" fill="#F8E4B0" />
          <circle cx="166" cy="202" r="4" fill="#F8E4B0" />
          <path d="M130 139v23q13 14 25 0v-23" fill={`url(#${skin})`} />
          <circle cx="94" cy="109" r="13" fill={`url(#${skin})`} />
          <circle cx="190" cy="109" r="13" fill={`url(#${skin})`} />
          <ellipse cx="142" cy="103" rx="53" ry="57" fill={`url(#${skin})`} />
          <path
            d="M90 96c-12-51 27-67 53-60 31-13 66 19 52 56-8-6-13-13-17-26-8 14-22 20-35 15l10-17c-9 14-32 21-52 17l-6 16Z"
            fill={`url(#${hair})`}
          />
          <path d="M122 110v4m38-4v4" stroke="#513B2D" strokeWidth="4" strokeLinecap="round" />
          <path d="M132 132q12 9 23-2" stroke="#A6684E" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="110" cy="126" rx="9" ry="5" fill="#D68A77" opacity=".55" />
          <ellipse cx="175" cy="126" rx="9" ry="5" fill="#D68A77" opacity=".55" />
          {big && (
            <g transform="translate(224 90) rotate(12)">
              <path d="M0 0v35" stroke="#90794F" strokeWidth="4" />
              <path d="m0-28 7 17 18 2-14 12 3 18L-1 11l-16 9 4-18-14-12 19-1Z" fill="#F0BD4D" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

export function GrowthBranch() {
  return (
    <svg viewBox="0 0 230 200" fill="none" aria-hidden="true">
      <path
        className="branch-line"
        d="M114 184C108 137 120 70 115 26"
        stroke="#45664E"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M115 140C67 145 31 121 34 82c47-4 76 22 81 58Z" fill="#8CA783" />
      <path d="M114 108c48 1 81-26 76-65-47 0-74 27-76 65Z" fill="#ABC19C" />
      <path d="M114 69C89 63 76 37 88 14c27 4 36 27 26 55Z" fill="#D0DCC1" />
      <ellipse cx="114" cy="190" rx="70" ry="9" fill="#243F33" opacity=".09" />
    </svg>
  );
}
