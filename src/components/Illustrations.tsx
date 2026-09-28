import type { ReactNode } from 'react'

const SKIN = '#f6cdb8'
const HAIR = '#5b2a44'

export type Scene = 'beach' | 'laptop' | 'dance' | 'cozy' | 'victory' | 'bloom'

function Frame({ children, bg, label, className }: { children: ReactNode; bg: string; label: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 150" role="img" aria-label={label} className={className}>
      <rect width="200" height="150" rx="24" fill={bg} />
      {children}
    </svg>
  )
}

function Sparkle({ x, y, s = 1, c = '#fff' }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-6 1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6Z" fill={c} />
}

function HeartShape({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 3C-6-2-6-7-2.5-7-1-7 0-6 0-5 0-6 1-7 2.5-7 6-7 6-2 0 3Z" fill={c} />
}

const scenes: Record<Scene, { label: string; bg: string; art: ReactNode }> = {
  beach: {
    label: 'A woman relaxing at the beach',
    bg: '#fde3ee',
    art: (
      <>
        <circle cx="160" cy="38" r="16" fill="#ffd1a6" />
        <path d="M0 96c25-8 45 6 70 0s45-10 70-2 45 4 60 0v56H0Z" fill="#f9b8d2" />
        <path d="M0 112c30-6 60 6 100 0s70-4 100 0v38H0Z" fill="#fcd9c4" />
        <path d="M52 112 60 50" stroke="#c9557f" strokeWidth="2.5" />
        <path d="M28 58c10-16 54-16 64 0Z" fill="#e14f8e" />
        <path d="M28 58c5-4 11-4 16 0 5-4 11-4 16 0 5-4 11-4 16 0 5-4 11-4 16 0" fill="#fbd7e6" />
        <ellipse cx="118" cy="118" rx="34" ry="5" fill="#f28db5" />
        <path d="M92 114c10-9 34-9 52-3" stroke={SKIN} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M100 110c6-6 20-6 26-2l-4 8H98Z" fill="#b8336f" />
        <path d="M139 101c2-7 13-8 16 0 2 6-3 12-7 13" fill={HAIR} />
        <circle cx="146" cy="104" r="7" fill={SKIN} />
        <path d="M139 102c1-7 12-9 14 -1c-3 -2 -7 -2 -14 1Z" fill={HAIR} />
        <ellipse cx="147" cy="97" rx="13" ry="3" fill="#ffe2a8" />
        <path d="M141 97c1-6 11-6 12 0" fill="#ffe2a8" />
        <Sparkle x={112} y={30} c="#fff" />
        <Sparkle x={30} y={30} s={0.7} c="#fff" />
      </>
    ),
  },
  laptop: {
    label: 'A woman working happily on her laptop',
    bg: '#f3e6f6',
    art: (
      <>
        <rect x="20" y="104" width="160" height="6" rx="3" fill="#c79bc9" />
        <path d="M100 104h52l8-30h-52Z" fill="#8d3f86" />
        <circle cx="130" cy="89" r="4" fill="#ecd8ee" />
        <path d="M60 104c0-22 8-34 22-34s22 12 22 34Z" fill="#e14f8e" />
        <path d="M84 84c8 6 18 12 26 16" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <path d="M68 60c-4-20 22-26 28-10 3 8 2 20-4 26 2-10 0-14-4-18-6 4-14 4-20 2Z" fill={HAIR} />
        <circle cx="82" cy="56" r="12" fill={SKIN} />
        <path d="M70 54c1-12 22-14 24 -1c-6 -4 -12 -4 -24 1Z" fill={HAIR} />
        <path d="M78 60q4 3 8 0" stroke="#b8336f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <rect x="36" y="88" width="12" height="16" rx="3" fill="#fff" />
        <path d="M48 92c5 0 5 7 0 7" stroke="#fff" strokeWidth="2" fill="none" />
        <path d="M40 84c0-4 3-4 3-8M44 84c0-4 3-4 3-8" stroke="#c79bc9" strokeWidth="1.5" fill="none" />
        <path d="M160 104v-14" stroke="#6ea77d" strokeWidth="2" />
        <ellipse cx="156" cy="92" rx="5" ry="3" fill="#8cc49b" transform="rotate(-30 156 92)" />
        <ellipse cx="164" cy="88" rx="5" ry="3" fill="#8cc49b" transform="rotate(30 164 88)" />
        <rect x="153" y="98" width="14" height="8" rx="2" fill="#f9b8d2" />
        <HeartShape x={112} y={40} s={1.2} c="#e14f8e" />
        <Sparkle x={140} y={30} s={0.8} c="#fff" />
      </>
    ),
  },
  dance: {
    label: 'A woman dancing and having fun',
    bg: '#ffe4ec',
    art: (
      <>
        <circle cx="100" cy="80" r="46" fill="#fbd0df" />
        <path d="M88 64 70 38M112 64l20-24" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <path d="M84 62h32l14 52H70Z" fill="#e14f8e" />
        <path d="M70 114c10 6 50 6 60 0" stroke="#b8336f" strokeWidth="3" fill="none" />
        <path d="M92 116 86 136M108 116l8 20" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <path d="M88 50c-2-16 24-18 24-2 6 4 8 14 2 20 0-8-4-12-6-16-6 2-14 2-20-2Z" fill={HAIR} />
        <circle cx="100" cy="48" r="11" fill={SKIN} />
        <path d="M89 46c1-11 20-13 22 -1c-5 -3 -11 -3 -22 1Z" fill={HAIR} />
        <path d="M96 51q4 3 8 0" stroke="#b8336f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <rect x="36" y="30" width="6" height="6" rx="1" fill="#8d3f86" transform="rotate(20 39 33)" />
        <rect x="156" y="52" width="6" height="6" rx="1" fill="#ffb86b" transform="rotate(-20 159 55)" />
        <circle cx="150" cy="28" r="3" fill="#8d3f86" />
        <circle cx="46" cy="100" r="3" fill="#ffb86b" />
        <path d="M150 90v-14l8-2v14" stroke="#b8336f" strokeWidth="2" fill="none" />
        <circle cx="148" cy="90" r="3" fill="#b8336f" />
        <circle cx="156" cy="88" r="3" fill="#b8336f" />
        <Sparkle x={52} y={60} c="#fff" />
        <Sparkle x={160} y={120} s={0.7} c="#fff" />
      </>
    ),
  },
  cozy: {
    label: 'A woman curled up cosy with tea',
    bg: '#efe2f1',
    art: (
      <>
        <circle cx="160" cy="34" r="12" fill="#fff6e8" />
        <circle cx="166" cy="30" r="11" fill="#efe2f1" />
        <rect x="30" y="92" width="140" height="30" rx="14" fill="#c79bc9" />
        <rect x="24" y="80" width="24" height="42" rx="12" fill="#b07fb3" />
        <rect x="152" y="80" width="24" height="42" rx="12" fill="#b07fb3" />
        <path d="M56 104c0-24 12-36 30-36s28 12 30 36Z" fill="#fbd7e6" />
        <path d="M60 104c10-10 40-14 60-6l4 14H58Z" fill="#f28db5" />
        <path d="M72 58c-2-20 28-22 28-4-4-2-8-4-10-8-6 6-12 10-18 12Z" fill={HAIR} />
        <circle cx="86" cy="56" r="12" fill={SKIN} />
        <path d="M74 54c1-12 22-14 24 -1c-6 -4 -12 -4 -24 1Z" fill={HAIR} />
        <path d="M81 58q2 2 4 0M89 58q2 2 4 0" stroke="#5b2a44" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <rect x="100" y="80" width="12" height="12" rx="3" fill="#fff" />
        <path d="M104 76c0-4 3-4 3-8" stroke="#fff" strokeWidth="1.5" fill="none" />
        <rect x="140" y="64" width="8" height="16" rx="2" fill="#fff6e8" />
        <path d="M144 64c-3-4 0-8 0-10 2 3 4 6 0 10Z" fill="#ffb86b" />
        <HeartShape x={126} y={46} s={1} c="#e14f8e" />
        <HeartShape x={46} y={52} s={0.7} c="#b8336f" />
      </>
    ),
  },
  victory: {
    label: 'A woman celebrating a victory with a crown',
    bg: '#fde3ee',
    art: (
      <>
        <path d="M100 150 60 40h80Z" fill="#fff" opacity=".45" />
        <path d="M88 70 72 34M112 70l16-36" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <path d="M84 68h32l10 50H74Z" fill="#b8336f" />
        <path d="M74 118c12 6 40 6 52 0" stroke="#e14f8e" strokeWidth="3" fill="none" />
        <path d="M88 56c-2-16 24-18 24-2 5 4 6 14 1 18 0-8-3-12-5-14-6 2-14 2-20-2Z" fill={HAIR} />
        <circle cx="100" cy="54" r="11" fill={SKIN} />
        <path d="M89 52c1-11 20-13 22 -1c-5 -3 -11 -3 -22 1Z" fill={HAIR} />
        <path d="M96 57q4 3 8 0" stroke="#b8336f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M90 42 92 32l5 6 3-8 3 8 5-6 2 10Z" fill="#ffc94d" />
        <circle cx="100" cy="30" r="1.8" fill="#e14f8e" />
        <Sparkle x={58} y={30} s={1.2} c="#ffc94d" />
        <Sparkle x={146} y={36} c="#ffc94d" />
        <Sparkle x={150} y={100} s={0.8} c="#e14f8e" />
        <Sparkle x={46} y={96} s={0.8} c="#e14f8e" />
        <rect x="40" y="60" width="6" height="6" rx="1" fill="#8d3f86" transform="rotate(20 43 63)" />
        <rect x="156" y="66" width="6" height="6" rx="1" fill="#f28db5" transform="rotate(-20 159 69)" />
        <circle cx="130" cy="20" r="3" fill="#f28db5" />
        <circle cx="66" cy="126" r="3" fill="#8d3f86" />
      </>
    ),
  },
  bloom: {
    label: 'A woman smelling flowers in bloom',
    bg: '#fdeef4',
    art: (
      <>
        <path d="M0 118c40-10 80 4 120-2s60-6 80-2v36H0Z" fill="#f9c6da" />
        {[40, 58, 150, 168].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 118v-24`} stroke="#6ea77d" strokeWidth="2" />
            <circle cx={x} cy={90} r="7" fill={i % 2 ? '#e14f8e' : '#f28db5'} />
            <circle cx={x} cy={90} r="2.5" fill="#ffc94d" />
          </g>
        ))}
        <path d="M86 118c0-26 6-44 18-44s18 18 18 44Z" fill="#f28db5" />
        <path d="M96 84c-4 6-8 10-14 12" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />
        <circle cx="80" cy="94" r="6" fill="#e14f8e" />
        <path d="M92 64c-4-22 26-24 26-6 6 8 4 22-2 28 2-10-2-16-4-20-6 2-14 2-20-2Z" fill={HAIR} />
        <circle cx="104" cy="60" r="12" fill={SKIN} />
        <path d="M92 58c1-12 22-14 24 -1c-6 -4 -12 -4 -24 1Z" fill={HAIR} />
        <path d="M98 64q2 2 4 0" stroke="#5b2a44" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <circle cx="114" cy="50" r="4" fill="#e14f8e" />
        <Sparkle x={150} y={40} c="#fff" />
        <Sparkle x={50} y={40} s={0.8} c="#fff" />
      </>
    ),
  },
}

export function Illustration({ scene, className }: { scene: Scene; className?: string }) {
  const s = scenes[scene]
  return (
    <Frame bg={s.bg} label={s.label} className={className}>
      {s.art}
    </Frame>
  )
}
