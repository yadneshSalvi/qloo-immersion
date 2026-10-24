import { useId } from 'react';
import type { Cluster } from '@/domain/types';
const palettes: Record<string, [string, string, string, string]> = {
  market: ['#eac58a', '#d5764d', '#446550', '#f0dcc1'],
  citrus: ['#baca9c', '#e69a57', '#49664a', '#e9ead1'],
  cinema: ['#b1a2c5', '#edcb8b', '#594871', '#e1c7b4'],
  nocturne: ['#5c6683', '#b3bec9', '#d5a970', '#312e4d'],
  record: ['#d49d85', '#743c4c', '#ded49f', '#f1d6ac'],
  bridge: ['#b3c3bc', '#546c6b', '#d8af7f', '#e5d8c0'],
  books: ['#c4b28e', '#46635a', '#a87b65', '#eadfc8'],
  letters: ['#bdadcb', '#5a4269', '#c49d73', '#e5d9de'],
  chair: ['#b0bba0', '#e1ad4e', '#5a715b', '#e2d8b9'],
  poster: ['#cbbcc6', '#bb5f49', '#4f6262', '#e8d3a8'],
  plaza: ['#b9c6c2', '#d7aa73', '#4a6561', '#e3ded0'],
  map: ['#d6c4a3', '#637a80', '#b27960', '#eddfbc'],
};
export function Artwork({
  cluster,
  palette = 'market',
  className = '',
  decorative = true,
}: {
  cluster: Cluster;
  palette?: string;
  className?: string;
  decorative?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const [bg, accent, dark, light] = palettes[palette] ?? palettes.market;
  return (
    <svg
      className={`artwork ${className}`}
      viewBox="0 0 800 620"
      preserveAspectRatio="xMidYMid slice"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Original geometric illustration inspired by ${cluster}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={`${id}-grain`} width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r=".6" fill="#17151b" opacity=".14" />
          <circle cx="10" cy="10" r=".5" fill="#fff" opacity=".2" />
        </pattern>
        <pattern id={`${id}-lines`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 19.5h20" stroke={dark} strokeWidth="1" opacity=".1" />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <rect width="800" height="620" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="800" height="620" fill={bg} />
        <rect x="40" y="40" width="720" height="540" fill={`url(#${id}-lines)`} />
        {cluster === 'food' && (
          <>
            <circle cx="650" cy="105" r="145" fill={accent} opacity=".65" />
            <path d="M115 475V228a178 178 0 0 1 356 0v247" fill={dark} />
            <path d="M147 460V230a146 146 0 0 1 292 0v230" fill={light} />
            <path d="M147 312h292M292 86v374" stroke={bg} strokeWidth="13" />
            <path d="M60 500l650-65 120 185H0Z" fill={accent} />
            <ellipse cx="423" cy="485" rx="230" ry="43" fill="#422e30" opacity=".15" />
            <ellipse cx="381" cy="460" rx="137" ry="56" fill={light} />
            <ellipse cx="381" cy="450" rx="111" ry="38" fill={bg} />
            <ellipse cx="381" cy="448" rx="94" ry="29" fill={accent} />
            <path d="M575 416l-18-120h102l-18 120Q607 445 575 416" fill={dark} />
            <path
              d="M608 301v-92m0 40q-70-26-62-70 65-7 62 70m0 19q65-5 72-55-63-17-72 55"
              fill={dark}
              stroke={dark}
              strokeWidth="7"
            />
            <circle cx="170" cy="505" r="33" fill={bg} />
            <circle cx="223" cy="532" r="28" fill={light} />
            <path d="M165 477l8-13m44 42 11-10" stroke={dark} strokeWidth="5" />
            <path d="M620 510l69-8" stroke={light} strokeWidth="8" strokeLinecap="round" />
          </>
        )}
        {cluster === 'cinema' && (
          <>
            <circle cx="590" cy="155" r="170" fill={light} />
            <path d="M117 171l520-75v320l-520 43Z" fill={dark} />
            <path d="M139 190l472-69v270l-472 39Z" fill={accent} />
            <path d="M228 351V240a70 70 0 0 1 140 0v111" fill={bg} />
            <path d="M219 352h195l97-156v189H219Z" fill={dark} opacity=".45" />
            <circle cx="468" cy="207" r="27" fill={light} />
            <path d="M0 565 800 449v171H0Z" fill={dark} />
            {[120, 290, 460, 630].map((x, i) => (
              <g key={x} transform={`translate(${x} ${478 - i * 13})`}>
                <rect x="-40" y="0" width="90" height="105" rx="33" fill={i % 2 ? accent : bg} />
                <path
                  d="M-43 56v45m97-45v45"
                  stroke={light}
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              </g>
            ))}
            <path d="m635 393 110 40v65l-110-28Z" fill={light} />
            <circle cx="677" cy="405" r="27" fill={accent} />
            <circle cx="731" cy="416" r="19" fill={accent} />
          </>
        )}
        {cluster === 'music' && (
          <>
            <rect
              x="72"
              y="109"
              width="404"
              height="404"
              transform="rotate(-10 275 311)"
              fill={light}
            />
            <path d="m55 144 398-70 70 398-398 70Z" fill={accent} />
            <path d="M135 420c130-55 85-220 245-238" stroke={bg} strokeWidth="33" fill="none" />
            <circle cx="496" cy="305" r="212" fill={dark} />
            {[188, 174, 160, 146, 132, 118].map((r) => (
              <circle
                key={r}
                cx="496"
                cy="305"
                r={r}
                fill="none"
                stroke={bg}
                strokeWidth="1"
                opacity=".28"
              />
            ))}
            <circle cx="496" cy="305" r="74" fill={bg} />
            <circle cx="496" cy="305" r="11" fill={light} />
            <path d="M488 259h16m-16 92h16" stroke={dark} strokeWidth="3" />
            <path d="m718 216-37 238-61 45" fill="none" stroke={light} strokeWidth="13" />
            <rect
              x="590"
              y="485"
              width="54"
              height="19"
              rx="4"
              fill={accent}
              transform="rotate(-35 617 495)"
            />
            <circle cx="720" cy="201" r="24" fill={light} />
            <path d="M113 561h292" stroke={dark} strokeWidth="2" />
            <circle cx="113" cy="561" r="6" fill={dark} />
          </>
        )}
        {cluster === 'literature' && (
          <>
            <circle cx="190" cy="100" r="145" fill={accent} opacity=".5" />
            <path d="M0 493 800 438v182H0Z" fill={dark} />
            <path d="m92 175 253-54 92 353-254 57Z" fill={accent} />
            <path d="m105 187 229-47 85 317-230 49Z" fill={light} />
            <path d="m345 121 293 63-67 339-134-49Z" fill={bg} />
            <path d="m361 143 259 56-61 307-129-43Z" fill={light} />
            <path d="m345 123 91 350" stroke={dark} strokeWidth="4" />
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <g key={n}>
                <path
                  d={`m150 ${245 + n * 27} 145-31`}
                  stroke={accent}
                  strokeWidth="4"
                  opacity=".7"
                />
                <path
                  d={`m422 ${239 + n * 27} 135 28`}
                  stroke={accent}
                  strokeWidth="4"
                  opacity=".7"
                />
              </g>
            ))}
            <path d="m516 180 29 6-28 136-12-19-19 12Z" fill={dark} />
            <path d="m76 560 487-37 99 37-490 36Z" fill={light} />
            <path d="m76 560v20l100 37 490-37v-20l-490 36Z" fill={accent} />
            <path
              d="M699 191v184m-1-69q-64-42-37-77 47 7 37 77m1 6q50-62 79-19-14 45-79 19"
              fill={dark}
              stroke={dark}
              strokeWidth="7"
            />
            <path d="M657 369h87l-13 99h-60Z" fill={accent} />
          </>
        )}
        {cluster === 'design' && (
          <>
            <path d="M510 0h290v620H510Z" fill={light} />
            <path d="M508 0v620M0 485h800" stroke={dark} strokeWidth="2" opacity=".4" />
            <circle cx="173" cy="140" r="80" fill={accent} opacity=".5" />
            <path d="m177 448 237-40 130 76-241 45Z" fill={dark} opacity=".15" />
            <path d="M259 170q0-42 44-42h166q44 0 44 42v171H259Z" fill={accent} />
            <path d="M279 336v-146m214 146v-146" stroke={dark} strokeWidth="5" opacity=".3" />
            <path d="m249 341 263-16 61 56-276 18Z" fill={accent} />
            <path
              d="m297 397-22 150m263-163 24 143M275 342l-38 125m277-140 30 144"
              stroke={dark}
              strokeWidth="17"
            />
            <path
              d="M638 352v128m-1-99q-71-42-51-83 65 0 51 83m1-35q67-43 83-9-9 47-83 9"
              fill={dark}
              stroke={dark}
              strokeWidth="7"
            />
            <path d="m597 453 84-5-10 92-54 3Z" fill={bg} />
            <path d="M40 590h153" stroke={dark} strokeWidth="3" />
          </>
        )}
        {cluster === 'places' && (
          <>
            <circle cx="639" cy="125" r="87" fill={accent} />
            <path d="M0 423 800 379v241H0Z" fill={light} />
            <path d="m55 202 234-57v277l-234 28Z" fill={accent} />
            <path d="m289 145 152 72v223l-152-18Z" fill={bg} />
            <path d="M129 429V306a43 43 0 0 1 86 0v113Z" fill={dark} />
            <path d="m87 221 55-13v52l-55 11Zm111-27 51-12v52l-51 12Z" fill={light} />
            <path d="m329 230 61 28v59l-61-26Z" fill={light} />
            <path d="M573 435V220" stroke={dark} strokeWidth="18" />
            <ellipse cx="573" cy="209" rx="97" ry="125" fill={dark} />
            <path
              d="M573 279v-137m0 80-42-45m42 81 49-66"
              stroke={bg}
              strokeWidth="3"
              opacity=".4"
            />
            <path
              d="m101 517 240-29m-240 5 240-29m-216 48v54m191-75v52"
              stroke={dark}
              strokeWidth="11"
              strokeLinecap="round"
            />
            <ellipse cx="637" cy="476" rx="102" ry="27" fill={bg} />
            <ellipse cx="637" cy="467" rx="94" ry="21" fill={dark} />
            <path d="M637 468v-89m-51 24q50-58 102-4" stroke={light} strokeWidth="6" fill="none" />
            <path d="m390 620 99-154m-39 154 85-153" stroke={bg} strokeWidth="2" />
          </>
        )}
        <rect width="800" height="620" fill={`url(#${id}-grain)`} />
        <path
          d="M24 24h33M24 24v33M776 596h-33M776 596v-33"
          stroke={dark}
          strokeWidth="1"
          opacity=".35"
        />
      </g>
    </svg>
  );
}
