import { useState } from 'react';
import { motion } from 'motion/react';
import { Tooltip } from './Tooltip';
import type { ValidationResult } from '../engine/types';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  validation?: ValidationResult;
  disabled?: boolean;
  isPercent?: boolean;
}

export function NumberInput({
  label, value, onChange, tooltip, prefix, suffix,
  min, max, step = 1, validation, disabled, isPercent,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = isPercent ? Math.round(value * 100) : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) return;
    const v = isPercent ? raw / 100 : raw;
    onChange(v);
  };

  const borderColor = validation
    ? validation.severity === 'error' ? 'border-red-500 focus:ring-red-500'
    : validation.severity === 'warning' ? 'border-amber-500 focus:ring-amber-500'
    : 'border-gray-700 focus:ring-[#1de2c4]'
    : 'border-gray-700 focus:ring-[#1de2c4]';

  return (
    <div className="space-y-1">
      <label className="flex items-center text-xs font-medium text-gray-300">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <motion.div
        className="relative"
        animate={{
          boxShadow: isFocused
            ? '0 0 0 2px rgba(29, 226, 196, 0.15), 0 0 8px rgba(29, 226, 196, 0.1)'
            : '0 0 0 0px rgba(29, 226, 196, 0), 0 0 0px rgba(29, 226, 196, 0)',
        }}
        transition={{ duration: 0.2 }}
        style={{ borderRadius: '0.375rem' }}
      >
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
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
          step={isPercent ? (step * 100) : step}
          disabled={disabled}
          className={`w-full h-8 text-xs text-white rounded-md border ${borderColor} bg-gray-800
            ${prefix ? 'pl-6' : 'pl-2.5'} ${suffix ? 'pr-8' : 'pr-2.5'}
            focus:outline-none focus:ring-1 transition-colors
            disabled:bg-gray-900 disabled:text-gray-500`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </motion.div>
      {validation && (
        <p className={`text-xs ${validation.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
          {validation.message}
        </p>
      )}
    </div>
  );
}
