/** Lightweight, theme-aware artwork; no stock service availability is implied. */
export function HomeIllustration() {
  return (
    <svg viewBox="0 0 600 540" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="home-art-title" className="h-auto w-full">
      <title id="home-art-title">A welcoming home with a sofa, plants, and a service toolbox</title>
      <defs>
        <linearGradient id="room-wall" x1="80" y1="70" x2="500" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="hsl(var(--card))" /><stop offset="1" stopColor="hsl(var(--secondary))" /></linearGradient>
        <pattern id="room-lines" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" stroke="hsl(var(--brand-teal) / .07)" /></pattern>
        <filter id="room-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="hsl(var(--brand-teal-dark))" floodOpacity=".12" /></filter>
      </defs>
      <circle cx="309" cy="265" r="222" fill="hsl(var(--brand-teal) / .07)" />
      <circle cx="309" cy="265" r="254" stroke="hsl(var(--brand-teal) / .12)" strokeDasharray="3 9" />
      <path d="M84 404V121a22 22 0 0 1 22-22h385a22 22 0 0 1 22 22v283" fill="url(#room-wall)" />
      <path d="M84 404V121a22 22 0 0 1 22-22h385a22 22 0 0 1 22 22v283" fill="url(#room-lines)" />
      <path d="M56 404h485l-53 65H109z" fill="hsl(var(--brand-teal) / .13)" />
      <path d="M84 405h429M190 405l-22 63m128-63v63m101-63 24 63" stroke="hsl(var(--brand-teal) / .1)" strokeWidth="2" />
      <path d="M129 275V181a65 65 0 0 1 130 0v94z" fill="hsl(var(--card))" stroke="hsl(var(--brand-teal) / .2)" strokeWidth="7" />
      <path d="M194 120v151m-62-77h124" stroke="hsl(var(--brand-teal) / .17)" strokeWidth="5" />
      <path d="m136 251 56-43m16 56 45-34" stroke="hsl(var(--brand-teal) / .08)" strokeWidth="13" />
      <g filter="url(#room-shadow)">
        <rect x="341" y="142" width="126" height="52" rx="9" fill="hsl(var(--card))" />
        <rect x="351" y="177" width="106" height="7" rx="3.5" fill="hsl(var(--brand-teal) / .14)" />
        <circle cx="450" cy="155" r="2" fill="hsl(var(--brand-teal))" />
      </g>
      <path d="M380 204v18m24-18v25m24-25v18" stroke="hsl(var(--brand-teal) / .3)" strokeWidth="3" strokeLinecap="round" />
      <path d="M298 99v83" stroke="hsl(var(--foreground))" strokeWidth="3" />
      <path d="M269 192a29 29 0 0 1 58 0z" fill="hsl(var(--primary))" /><ellipse cx="298" cy="192" rx="29" ry="5" fill="hsl(var(--brand-coral-dark))" />
      <ellipse cx="282" cy="411" rx="149" ry="15" fill="hsl(var(--brand-teal-dark) / .1)" />
      <rect x="158" y="288" width="231" height="99" rx="23" fill="hsl(var(--brand-teal-dark))" />
      <rect x="167" y="295" width="105" height="61" rx="17" fill="hsl(var(--brand-teal))" />
      <rect x="278" y="295" width="103" height="61" rx="17" fill="hsl(var(--brand-teal))" />
      <rect x="143" y="340" width="262" height="53" rx="18" fill="hsl(var(--brand-teal-dark))" />
      <rect x="154" y="350" width="240" height="34" rx="12" fill="hsl(var(--brand-teal))" />
      <rect x="142" y="326" width="26" height="65" rx="11" fill="hsl(var(--brand-teal-dark))" />
      <rect x="379" y="326" width="26" height="65" rx="11" fill="hsl(var(--brand-teal-dark))" />
      <path d="m165 392-4 15m224-15 4 15" stroke="hsl(var(--foreground))" strokeWidth="8" strokeLinecap="round" />
      <rect x="189" y="306" width="46" height="44" rx="9" transform="rotate(-12 189 306)" fill="hsl(var(--card))" />
      <path d="m197 319 24 17m-20 5 22-24" stroke="hsl(var(--brand-coral) / .22)" strokeWidth="3" />
      <rect x="314" y="312" width="42" height="42" rx="9" transform="rotate(13 314 312)" fill="hsl(var(--brand-coral-light))" />
      <path d="M458 370v-91" stroke="hsl(var(--brand-teal-dark))" strokeWidth="4" />
      <path d="M458 327c-37 0-46-29-41-43 26 1 40 16 41 43m1-22c28-2 40-22 36-37-24-2-39 14-36 37m-1-20c-21-7-26-25-20-39 21 6 25 25 20 39" fill="hsl(var(--brand-teal))" />
      <path d="M435 361h46l-6 41h-34z" fill="hsl(var(--brand-coral-light))" /><path d="M433 362h50" stroke="hsl(var(--brand-coral-dark))" strokeWidth="5" strokeLinecap="round" />
      <g filter="url(#room-shadow)"><rect x="233" y="403" width="92" height="48" rx="9" fill="hsl(var(--primary))" /><path d="M259 403v-9a6 6 0 0 1 6-6h25a6 6 0 0 1 6 6v9" stroke="hsl(var(--brand-coral-dark))" strokeWidth="6" /><path d="M234 421h90" stroke="hsl(var(--brand-coral-dark))" strokeWidth="2" /><rect x="273" y="416" width="13" height="12" rx="2" fill="hsl(var(--card))" /></g>
      <g stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"><path d="M85 203v16m-8-8h16m412 114v16m-8-8h16" /></g>
      <circle cx="104" cy="355" r="5" fill="hsl(var(--primary) / .5)" /><circle cx="475" cy="90" r="6" fill="hsl(var(--brand-teal) / .5)" />
    </svg>
  );
}
