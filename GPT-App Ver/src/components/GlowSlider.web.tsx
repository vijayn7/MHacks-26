import React, { useId } from 'react';
import { colors, palettes } from '../design/tokens';

// Use a native range input on the web for keyboard and screen-reader semantics.
export function GlowSlider({
  label,
  value,
  onChange,
  glow = false,
  tint = palettes.Violet.body,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  glow?: boolean;
  tint?: string;
}) {
  const id = 'range' + useId().replace(/[^a-z0-9]/gi, '');
  return (
    <div
      style={{
        position: 'relative',
        height: glow ? 62 : 44,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <style>{`
      #${id} { appearance: none; -webkit-appearance: none; width: 100%; height: 44px; margin: 0; padding: 0; background: transparent; position: relative; z-index: 1; cursor: pointer; touch-action: pan-y; }
      #${id}::-webkit-slider-runnable-track { height: 4px; border-radius: 9px; background: ${glow ? 'transparent' : '#FFFFFF1C'}; }
      #${id}::-moz-range-track { height: 4px; border-radius: 9px; background: ${glow ? 'transparent' : '#FFFFFF1C'}; }
      #${id}::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 20px; height: 20px; border: 0; border-radius: 50%; background: ${glow ? 'transparent' : tint}; margin-top: -8px; }
      #${id}::-moz-range-thumb { width: 20px; height: 20px; border: 0; border-radius: 50%; background: ${glow ? 'transparent' : tint}; }
      #${id}:focus-visible { outline: 1px solid ${tint}; outline-offset: 3px; border-radius: 12px; }
    `}</style>
      {glow && (
        <div
          aria-hidden="true"
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            right: 0,
            height: 38,
            border: '1px solid #FFFFFF12',
            borderRadius: 99,
            overflow: 'hidden',
            background: '#FFFFFF06',
          }}
        >
          <div style={{ width: `${value}%`, height: '100%', background: '#FFFFFF0C' }} />
        </div>
      )}
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
      {glow && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: `calc(${value}% + ${10 - value / 5}px)`,
            transform: 'translateX(-50%)',
            width: 62,
            height: 62,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.text} 0%, ${palettes.Ember.core}EB 14%, ${tint}70 34%, ${tint}00 70%)`,
          }}
        />
      )}
    </div>
  );
}
