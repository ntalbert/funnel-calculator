import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';
import { Tooltip } from './Tooltip';

interface Props {
  label: string;
  value: number;
  isLocked: boolean;
  isBounded: boolean;
  onToggleLock: () => void;
  onChange: (value: number) => void;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  isPercent?: boolean;
  format?: (n: number) => string;
}

function defaultFormat(n: number, prefix?: string, suffix?: string, isPercent?: boolean): string {
  if (isPercent) {
    return `${(n * 100).toFixed(1)}%`;
  }
  const formatted = n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${Math.round(n).toLocaleString()}`
      : n < 1
        ? n.toFixed(2)
        : n.toFixed(1);
  return `${prefix || ''}${formatted}${suffix || ''}`;
}

export function LockableInput({
  label,
  value,
  isLocked,
  isBounded,
  onToggleLock,
  onChange,
  tooltip,
  prefix,
  suffix,
  min,
  max,
  step = 1,
  isPercent,
  format,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
  const prevValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Detect value changes for flash animation on unlocked values
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (!isLocked) {
        setJustChanged(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setJustChanged(false), 600);
      }
    }
  }, [value, isLocked]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const displayValue = isPercent ? parseFloat((value * 100).toFixed(1)) : value;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) return;
    const v = isPercent ? raw / 100 : raw;
    onChange(v);
  }, [isPercent, onChange]);

  const formatFn = format || ((n: number) => defaultFormat(n, prefix, suffix, isPercent));

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      {/* Lock toggle */}
      <button
        onClick={onToggleLock}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-gray-700/50"
        title={isLocked ? 'Locked (click to unlock)' : 'Unlocked (click to lock)'}
      >
        {isLocked ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#1de2c4]">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-500">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* Label */}
      <span className="flex-1 text-xs text-gray-400 truncate flex items-center gap-1">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
        {isBounded && (
          <span className="text-amber-400" title="Value hit its bound">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M3.27 17l7.73-13.4a1.15 1.15 0 012 0L20.73 17a1.15 1.15 0 01-1 1.73H4.27a1.15 1.15 0 01-1-1.73z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </span>

      {/* Value */}
      <div className="w-28 flex-shrink-0">
        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <motion.div
                className="relative"
                animate={{
                  boxShadow: isFocused
                    ? '0 0 0 2px rgba(29, 226, 196, 0.15)'
                    : '0 0 0 0px rgba(29, 226, 196, 0)',
                }}
                transition={{ duration: 0.2 }}
                style={{ borderRadius: '0.375rem' }}
              >
                {prefix && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
                    {prefix}
                  </span>
                )}
                <input
                  type="number"
                  value={displayValue}
                  onChange={handleChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  min={isPercent && min !== undefined ? min * 100 : min}
                  max={isPercent && max !== undefined ? max * 100 : max}
                  step={isPercent ? step * 100 : step}
                  className={`w-full h-7 text-xs text-white text-right rounded-md border border-gray-700 bg-gray-800
                    ${prefix ? 'pl-5' : 'pl-2'} ${suffix ? 'pr-6' : 'pr-2'}
                    focus:outline-none focus:ring-1 focus:ring-[#1de2c4] transition-colors`}
                />
                {suffix && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
                    {suffix}
                  </span>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative h-7 flex items-center justify-end px-2"
            >
              {justChanged && (
                <motion.div
                  className="absolute inset-0 rounded-md bg-[#1de2c4]/10"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
              <AnimatedNumber
                value={value}
                format={formatFn}
                className="text-xs text-gray-300 tabular-nums"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
