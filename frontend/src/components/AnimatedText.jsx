import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable bottom-to-top letter animation.
 * Each letter exits upward and a fresh copy enters from below.
 * totalDuration normalises stagger so all words finish in the same time window.
 *
 * Props:
 *  text        – string to animate
 *  className   – classes applied to the outer wrapper span
 *  letterClass – classes applied to each letter (default: inherit)
 *  hoverClass  – classes applied to the incoming (hover) letter
 *  totalMs     – total animation window in seconds (default 0.38)
 *  ease        – cubic-bezier array (default snappy ease-out)
 */
const AnimatedText = ({
  text,
  className = '',
  letterClass = '',
  hoverClass = 'text-white',
  totalMs = 0.38,
  ease = [0.22, 1, 0.36, 1],
}) => {
  const [hovered, setHovered] = useState(false);
  const letters = text.split('');
  const count = letters.length;
  const stagger = count > 1 ? totalMs / count / 2 : 0;
  const dur = 0.28;

  return (
    <span
      className={`relative inline-flex flex-col items-start cursor-pointer select-none ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Letter row */}
      <span className="flex">
        {letters.map((char, i) => {
          const delay = i * stagger;
          return (
            <span
              key={i}
              className="relative inline-block overflow-hidden"
              style={{
                minWidth: char === ' ' ? '0.28em' : undefined,
                lineHeight: 1.15,
              }}
            >
              {/* Original letter — slides up and out */}
              <motion.span
                className={`inline-block ${letterClass}`}
                animate={
                  hovered
                    ? { y: '-115%', opacity: 0, scale: 0.85 }
                    : { y: '0%', opacity: 1, scale: 1 }
                }
                transition={{ duration: dur, ease, delay }}
              >
                {char}
              </motion.span>

              {/* Incoming letter — rises from below with a tiny scale pop */}
              <motion.span
                className={`absolute inset-0 inline-block ${hoverClass}`}
                animate={
                  hovered
                    ? { y: '0%', opacity: 1, scale: 1 }
                    : { y: '115%', opacity: 0, scale: 1.1 }
                }
                transition={{ duration: dur, ease, delay }}
              >
                {char}
              </motion.span>
            </span>
          );
        })}
      </span>

      {/* Red underline — grows left-to-right */}
      <motion.span
        className="absolute -bottom-1 left-0 h-[2px] bg-f1red rounded-full"
        animate={{ width: hovered ? '100%' : '0%' }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: hovered ? 0.05 : 0 }}
      />
    </span>
  );
};

export default AnimatedText;
