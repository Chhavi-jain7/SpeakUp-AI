// Mochi, the companion. States: listening | thinking | speaking | happy | encouraging
export default function Cat({ state = 'listening' }) {
  return (
    <div className={`cat cat--${state}`} aria-hidden="true">
      <svg viewBox="0 0 170 150">
        <g className="cat-tail"><path d="M132 124c30-2 36-38 12-48" fill="none" stroke="#F0B676" strokeWidth="13" strokeLinecap="round" /></g>
        <ellipse cx="84" cy="124" rx="48" ry="24" fill="#F4C58B" />
        <ellipse cx="62" cy="142" rx="13" ry="7" fill="#F8D6A8" />
        <ellipse cx="106" cy="142" rx="13" ry="7" fill="#F8D6A8" />
        <g className="cat-head">
          <g className="ear ear-l"><path d="M38 66 L42 22 L70 46 Z" fill="#F4C58B" /><path d="M46 56 L48 33 L61 46 Z" fill="#F59DAA" /></g>
          <g className="ear ear-r"><path d="M130 66 L126 22 L98 46 Z" fill="#F4C58B" /><path d="M122 56 L120 33 L107 46 Z" fill="#F59DAA" /></g>
          <ellipse cx="84" cy="76" rx="48" ry="40" fill="#F4C58B" />
          <path d="M84 38v12M72 40l2 9M96 40l-2 9" stroke="#E3A765" strokeWidth="3.5" strokeLinecap="round" />
          <g className="eyes">
            <ellipse className="eye" cx="64" cy="74" rx="5.5" ry="7.5" fill="#2A2340" />
            <ellipse className="eye" cx="104" cy="74" rx="5.5" ry="7.5" fill="#2A2340" />
            <circle className="glint" cx="66" cy="71" r="2" fill="#fff" />
            <circle className="glint" cx="106" cy="71" r="2" fill="#fff" />
          </g>
          <g className="eyes-happy" fill="none" stroke="#2A2340" strokeWidth="3.5" strokeLinecap="round">
            <path d="M57 77q7-9 14 0" /><path d="M97 77q7-9 14 0" />
          </g>
          <ellipse cx="50" cy="88" rx="7" ry="4.5" fill="#F59DAA" opacity=".55" />
          <ellipse cx="118" cy="88" rx="7" ry="4.5" fill="#F59DAA" opacity=".55" />
          <path d="M80 86h8l-4 5z" fill="#E0768A" />
          <path className="smile" d="M84 91q-6 8-13 3M84 91q6 8 13 3" fill="none" stroke="#2A2340" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse className="mouth" cx="84" cy="98" rx="6" ry="5" fill="#7A2E45" />
          <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".8">
            <path d="M34 82l-16-4M34 88l-16 3M134 82l16-4M134 88l16 3" />
          </g>
        </g>
        <g className="think" fill="#CFC6F0"><circle cx="138" cy="34" r="4" /><circle cx="150" cy="22" r="5.5" /><circle cx="164" cy="8" r="7" /></g>
        <g className="spark" fill="#F4B942"><path d="M148 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /><path d="M20 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></g>
      </svg>
    </div>
  );
}
