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
  { keys: ['hermanos rodriguez', 'mexico'],                     file: 'HermanosRodriguez' },
  { keys: ['hockenheim', 'germany'],                            file: 'Hockenheim'        },
  { keys: ['hungaroring', 'hungary', 'budapest'],               file: 'hungaroring'       },
  { keys: ['imola', 'enzo', 'dino', 'emilia'],                  file: 'Imola'             },
  { keys: ['interlagos', 'brazil', 'são paulo', 'sao paulo'],   file: 'Interlagos'        },
  { keys: ['istanbul', 'turkey'],                               file: 'Istanbul'          },
  { keys: ['jeddah', 'saudi'],                                  file: 'Jeddah'            },
  { keys: ['kyalami', 'south africa'],                          file: 'Kyalami'           },
  { keys: ['las vegas', 'lasvegas'],                            file: 'LasVegas'          },
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
  { keys: ['silverstone', 'british', 'uk'],                     file: 'silverstone'       },
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

// Unique ID counter for SVG filter isolation
let _uid = 0;

const CircuitSVG = ({ circuitName, animate = false, className = '' }) => {
  const [svgData, setSvgData]   = useState(null); // { viewBox, paths[] }
  const [error, setError]       = useState(false);
  const svgRef                  = useRef(null);
  const animRef                 = useRef(null);
  const uidRef                  = useRef(`csf-${++_uid}`);

  // Fetch SVG on mount / name change
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
        // Parse viewBox
        const vbMatch = text.match(/viewBox="([^"]+)"/);
        const viewBox = vbMatch ? vbMatch[1] : '0 0 500 400';

        // Extract all path d attributes
        const pathMatches = [...text.matchAll(/\sd="([^"]+)"/g)];
        const paths = pathMatches.map(m => m[1]);

        if (paths.length === 0) { setError(true); return; }
        setSvgData({ viewBox, paths });
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [circuitName]);

  // Racing line animation
  useEffect(() => {
    if (!animate || !svgData || !svgRef.current) return;

    const svg = svgRef.current;
    // Animate all track paths
    const trackPaths = svg.querySelectorAll('.circuit-track');
    const racingLines = svg.querySelectorAll('.circuit-racing-line');

    // Kill previous
    if (animRef.current) {
      animRef.current.forEach(id => cancelAnimationFrame(id));
    }

    const animations = [];

    racingLines.forEach((line, i) => {
      try {
        const length = line.getTotalLength();
        line.style.strokeDasharray = `${length}`;
        line.style.strokeDashoffset = `${length}`;

        // Stagger multi-path circuits (Suzuka)
        const delay = i * 800;
        const duration = 3000 + i * 500;
        let start = null;

        const step = (ts) => {
          if (!start) start = ts + delay;
          if (ts < start) { const id = requestAnimationFrame(step); animations.push(id); return; }
          const elapsed = (ts - start) % (duration * 2);
          const t = elapsed < duration
            ? elapsed / duration
            : 1 - (elapsed - duration) / duration;
          line.style.strokeDashoffset = `${length * (1 - t)}`;
          const id = requestAnimationFrame(step);
          animations.push(id);
        };
        const id = requestAnimationFrame(step);
        animations.push(id);
      } catch (_) {}
    });

    animRef.current = animations;
    return () => animations.forEach(id => cancelAnimationFrame(id));
  }, [animate, svgData]);

  // Stop animation when not active
  useEffect(() => {
    if (!animate && svgRef.current) {
      const lines = svgRef.current.querySelectorAll('.circuit-racing-line');
      lines.forEach(line => {
        try {
          const length = line.getTotalLength();
          line.style.strokeDashoffset = `${length}`;
        } catch (_) {}
      });
      if (animRef.current) {
        animRef.current.forEach(id => cancelAnimationFrame(id));
        animRef.current = [];
      }
    }
  }, [animate]);

  const uid = uidRef.current;

  if (error) {
    return (
      <div className={`flex items-center justify-center text-gray-600 text-xs ${className}`}>
        <span>No layout available</span>
      </div>
    );
  }

  if (!svgData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-6 h-6 border-2 border-f1red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={svgData.viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Glow filter — unique ID per instance to avoid conflicts */}
        <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`glow-strong-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {svgData.paths.map((d, i) => (
        <g key={i}>
          {/* Outer glow halo */}
          <path
            d={d}
            fill="none"
            stroke="rgba(225,6,0,0.15)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Track surface — dark asphalt */}
          <path
            className="circuit-track"
            d={d}
            fill="none"
            stroke="#1e1e1e"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Track edge — subtle white kerb line */}
          <path
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 12"
          />
          {/* Racing line — animated red */}
          <path
            className="circuit-racing-line"
            d={d}
            fill="none"
            stroke="#E10600"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${uid})`}
            style={{ willChange: 'stroke-dashoffset' }}
          />
        </g>
      ))}
    </svg>
  );
};

export default CircuitSVG;
