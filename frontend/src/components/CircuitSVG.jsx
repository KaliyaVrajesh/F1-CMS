import { useEffect, useRef, useState } from 'react';

// Maps circuit name keywords → SVG filename in /public/circuits/
const CIRCUIT_FILE_MAP = [
  { keys: ['abu dhabi', 'yas', 'yas marina'],                   file: 'AbuDhabi'          },
  { keys: ['albert park', 'australia', 'melbourne'],            file: 'AlbertPark'        },
  { keys: ['americas', 'cota', 'austin'],                       file: 'Americas'          },
  { keys: ['austria', 'red bull ring', 'spielberg'],            file: 'austria'           },
  { keys: ['bahrain', 'sakhir'],                                file: 'bahrain'           },
  { keys: ['baku', 'azerbaijan'],                               file: 'baku'              },
  { keys: ['catalunya', 'barcelona', 'spain'],                  file: 'Catalunya'         },
  { keys: ['gilles villeneuve', 'canada', 'montreal'],          file: 'GillesVilleneuve'  },
  { keys: ['hermanos rodriguez', 'mexico', 'mexico city', 'autodromo hermanos', 'gran premio de mexico'], file: 'HermanosRodriguez' },
  { keys: ['hockenheim', 'germany'],                            file: 'Hockenheim'        },
  { keys: ['hungaroring', 'hungary', 'budapest'],               file: 'hungaroring'       },
  { keys: ['imola', 'enzo', 'dino', 'emilia'],                  file: 'Imola'             },
  { keys: ['interlagos', 'brazil', 'são paulo', 'sao paulo', 'brasil', 'grand prix of brazil', 'autodromo jose carlos pace'], file: 'Interlagos' },
  { keys: ['istanbul', 'turkey'],                               file: 'Istanbul'          },
  { keys: ['jeddah', 'saudi'],                                  file: 'Jeddah'            },
  { keys: ['kyalami', 'south africa'],                          file: 'Kyalami'           },
  { keys: ['las vegas', 'lasvegas', 'las vegas street', 'nevada'], file: 'LasVegas'       },
  { keys: ['lusail', 'qatar'],                                  file: 'Lusail'            },
  { keys: ['marina bay', 'singapore'],                          file: 'marinabay'         },
  { keys: ['miami'],                                            file: 'Miami'             },
  { keys: ['monaco', 'monte carlo'],                            file: 'monaco'            },
  { keys: ['monza', 'italy'],                                   file: 'monza'             },
  { keys: ['mugello'],                                          file: 'Mugello'           },
  { keys: ['nurburgring', 'nürburgring', 'eifel'],              file: 'Nurburgring'       },
  { keys: ['paul ricard', 'france', 'le castellet'],            file: 'PaulRicard'        },
  { keys: ['portimao', 'portimão', 'algarve', 'portugal'],      file: 'Portimao'          },
  { keys: ['sepang', 'malaysia', 'kuala lumpur'],               file: 'Sepang'            },
  { keys: ['shanghai', 'china'],                                file: 'Shanghai'          },
  { keys: ['silverstone', 'british grand prix', 'british gp'],  file: 'silverstone'       },
  { keys: ['sochi', 'russia'],                                  file: 'SochiAutodrom'     },
  { keys: ['spa', 'belgium', 'francorchamps'],                  file: 'Spa'               },
  { keys: ['suzuka', 'japan'],                                  file: 'Suzuka'            },
  { keys: ['zandvoort', 'netherlands', 'dutch'],                file: 'Zandvoort'         },
];

function resolveFile(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const entry of CIRCUIT_FILE_MAP) {
    if (entry.keys.some(k => lower.includes(k))) return entry.file;
  }
  return null;
}

let _uid = 0;

const CircuitSVG = ({ circuitName, animate = false, className = '' }) => {
  const [svgData, setSvgData] = useState(null);
  const [error, setError]     = useState(false);
  const svgRef                = useRef(null);
  const animRef               = useRef([]);
  const uidRef                = useRef(`csf-${++_uid}`);

  // Fetch SVG
  useEffect(() => {
    setSvgData(null);
    setError(false);
    const file = resolveFile(circuitName);
    if (!file) { setError(true); return; }

    let cancelled = false;
    fetch(`/circuits/${file}.svg`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then(text => {
        if (cancelled) return;
        const vbMatch = text.match(/viewBox="([^"]+)"/);
        const viewBox = vbMatch ? vbMatch[1] : '0 0 500 400';
        const pathMatches = [...text.matchAll(/\sd="([^"]+)"/g)];
        const paths = pathMatches.map(m => m[1]).filter(d => d.length > 50);
        if (paths.length === 0) { setError(true); return; }
        setSvgData({ viewBox, paths });
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [circuitName]);

  // Animation using pathLength="1" — works regardless of coordinate space
  useEffect(() => {
    animRef.current.forEach(id => cancelAnimationFrame(id));
    animRef.current = [];

    if (!animate || !svgData || !svgRef.current) return;

    const lines = svgRef.current.querySelectorAll('.rl');
    const ids = [];

    lines.forEach((line, i) => {
      // pathLength="1" means dasharray/dashoffset are in 0..1 range
      line.style.strokeDasharray = '1';
      line.style.strokeDashoffset = '1';

      const delay    = i * 600;
      const duration = 2800;
      let start = null;

      const step = (ts) => {
        if (!start) start = ts + delay;
        if (ts < start) { ids.push(requestAnimationFrame(step)); return; }
        const elapsed = (ts - start) % (duration * 2);
        const t = elapsed < duration
          ? elapsed / duration
          : 1 - (elapsed - duration) / duration;
        // Ease in-out
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        line.style.strokeDashoffset = `${1 - eased}`;
        ids.push(requestAnimationFrame(step));
      };
      ids.push(requestAnimationFrame(step));
    });

    animRef.current = ids;
    return () => ids.forEach(id => cancelAnimationFrame(id));
  }, [animate, svgData]);

  // Reset when not animating
  useEffect(() => {
    if (!animate && svgRef.current) {
      svgRef.current.querySelectorAll('.rl').forEach(l => {
        l.style.strokeDashoffset = '1';
      });
      animRef.current.forEach(id => cancelAnimationFrame(id));
      animRef.current = [];
    }
  }, [animate]);

  const uid = uidRef.current;

  if (error) {
    return (
      <div className={`flex items-center justify-center text-gray-600 text-xs ${className}`}>
        No layout available
      </div>
    );
  }

  if (!svgData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-f1red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Compute a stroke width that's proportional to the viewBox size
  // so it looks consistent regardless of coordinate space
  const [, , vbW, vbH] = svgData.viewBox.split(' ').map(Number);
  const vbSize   = Math.max(vbW || 500, vbH || 400);
  const trackW   = vbSize * 0.022;   // ~2.2% of viewBox — asphalt
  const glowW    = vbSize * 0.038;   // outer glow halo
  const racingW  = vbSize * 0.008;   // thin red racing line

  return (
    // overflow:hidden on wrapper prevents glow from bleeding outside card
    <div className={`${className}`} style={{ overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={svgData.viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          <filter id={`glow-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation={vbSize * 0.004} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {svgData.paths.map((d, i) => (
          <g key={i}>
            {/* Outer red glow */}
            <path d={d} fill="none"
              stroke="rgba(225,6,0,0.18)"
              strokeWidth={glowW}
              strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Dark asphalt track */}
            <path d={d} fill="none"
              stroke="#222"
              strokeWidth={trackW}
              strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Subtle kerb dashes */}
            <path d={d} fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={trackW}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${vbSize * 0.006} ${vbSize * 0.018}`}
            />
            {/* Animated racing line — pathLength="1" normalises dashoffset */}
            <path
              className="rl"
              d={d}
              fill="none"
              stroke="#E10600"
              strokeWidth={racingW}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              filter={`url(#glow-${uid})`}
              style={{ willChange: 'stroke-dashoffset' }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default CircuitSVG;
