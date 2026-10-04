import React, { useId } from 'react';
import { useSliderCompanion } from '../hooks/useSliderCompanion';
import { sliderGlow } from '../design/slider';
import { colors, palettes } from '../design/tokens';

// Use a native range input on the web for keyboard and screen-reader semantics.
export function GlowSlider({
  label,
  value,
  onChange,
  glow = false,
  tint = palettes.Violet.body,
  startTint = tint,
  endTint = tint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  glow?: boolean;
  tint?: string;
  startTint?: string;
  endTint?: string;
}) {
  const id = 'range' + useId().replace(/[^a-z0-9]/gi, '');
  const companion = useSliderCompanion();
  const light = sliderGlow(value);
  const track = glow ? '#ffffff12' : `linear-gradient(90deg, ${startTint}, ${endTint})`;
  return (
    <div
      style={{
        position: 'relative',
        height: glow ? 62 : 44,
        width: glow ? 'calc(100% - 24px)' : '100%',
        margin: glow ? '0 12px' : 0,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <style>{`
      #${id} { appearance: none; -webkit-appearance: none; width: 100%; height: 44px; margin: 0; padding: 0; background: transparent; position: relative; z-index: 1; cursor: pointer; touch-action: pan-y; }
      #${id}::-webkit-slider-runnable-track { height: 3px; border-radius: 9px; background: ${track}; }
      #${id}::-moz-range-track { height: 3px; border-radius: 9px; background: ${track}; }
      #${id}::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border: 2px solid ${glow ? 'transparent' : '#17110e'}; border-radius: 50%; background: ${glow ? 'transparent' : colors.text}; margin-top: -7.5px; }
      #${id}::-moz-range-thumb { width: 18px; height: 18px; border: 2px solid ${glow ? 'transparent' : '#17110e'}; border-radius: 50%; background: ${glow ? 'transparent' : colors.text}; }
      #${id}:focus-visible { outline: 1px solid ${tint}; outline-offset: 3px; border-radius: 12px; }
    `}</style>
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
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          companion.start();
        }}
        onPointerUp={companion.end}
        onPointerCancel={companion.end}
        onLostPointerCapture={companion.end}
        onBlur={companion.end}
        onChange={(e) => {
          companion.change();
          onChange(Number(e.currentTarget.value));
        }}
      />
      {glow && (
        <div
          data-testid="slider-glow"
          aria-hidden="true"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: `calc(${value}% + ${10 - value / 5}px)`,
            transform: 'translateX(-50%)',
            width: light.size,
            height: light.size,
            opacity: light.opacity,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.text} 0%, ${palettes.Ember.core}EB 14%, ${tint}70 34%, ${tint}00 70%)`,
          }}
        />
      )}
    </div>
  );
}
