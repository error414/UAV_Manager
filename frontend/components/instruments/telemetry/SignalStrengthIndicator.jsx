import React from 'react';
import PropTypes from 'prop-types';

/**
 * Zeigt die Signalstärke für Empfänger- und Senderqualität als Balkenanzeige.
 * @param {number} receiver_quality - 0 bis 100
 * @param {number} transmitter_quality - 0 bis 100
 * @param {string} direction - 'horizontal' (nebeneinander) oder 'vertical' (übereinander)
 * @param {number} transmitter_power - Transmitter Power in mW
 */
const SignalStrengthIndicator = ({
  receiver_quality = 0,
  transmitter_quality = 0,
  transmitter_power = 0,
  size = 48,
  bars = 5,
  direction = 'horizontal'
}) => {
  // Hilfsfunktion: Wert auf Balkenanzahl mappen
  const getBars = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    const v = Math.max(0, Math.min(100, value));
    return Math.round((v / 100) * bars);
  };

  const rxBars = getBars(receiver_quality);
  const txBars = getBars(transmitter_quality);

  // Balken-Layout
  const barWidth = size / (bars * 2);
  const barSpacing = barWidth;
  const barMaxHeight = size * 0.8;
  const barMinHeight = size * 0.2;

  // Hilfsfunktion: Farbe basierend auf Balkenindex und aktivierten Balken bestimmen
  const getBarColor = (barIndex, activeBars) => {
    // Wenn der Balken nicht aktiv ist, graue Farbe anzeigen
    if (barIndex >= activeBars) return '#d1d5db';
    
    // Für aktive Balken, Farbe basierend auf Signalstärke wählen
    const signalStrength = activeBars / bars;
    
    if (signalStrength <= 0.33) return '#ef4444'; // Rot für schwaches Signal (0-33%)
    if (signalStrength <= 0.66) return '#eab308'; // Gelb für mittleres Signal (34-66%)
    return '#22c55e'; // Grün für starkes Signal (67-100%)
  };

  // Balken für ein Signal (Array von SVG-Rect)
  const renderBars = (activeBars) =>
    Array.from({ length: bars }).map((_, i) => {
      const height = barMinHeight + ((barMaxHeight - barMinHeight) * (i + 1) / bars);
      return (
        <rect
          key={i}
          x={i * (barWidth + barSpacing)}
          y={size - height}
          width={barWidth}
          height={height}
          rx={barWidth * 0.3}
          fill={getBarColor(i, activeBars)}
        />
      );
    });

  // Layout je nach Richtung
  const containerClass =
    direction === 'vertical'
      ? 'flex flex-col items-center gap-2 -ml-2'
      : 'flex flex-row items-end gap-4 -ml-2';

  return (
    <div className={containerClass} style={{ marginLeft: 0, paddingLeft: 0 }}>
      <div className="flex flex-col items-center p-2 border border-gray-300 rounded">
        <svg width={size} height={size} style={{ display: 'block' }}>
          {renderBars(rxBars)}
        </svg>
        <span className="text-xs text-gray-700 mt-1">RX</span>
      </div>
      <div className="flex flex-col items-center p-2 border border-gray-300 rounded">
        <svg width={size} height={size} style={{ display: 'block' }}>
          {renderBars(txBars)}
        </svg>
        <span className="text-xs text-gray-700 mt-1">TX</span>
        <span className="text-xs text-gray-700">{transmitter_power} mW</span>
      </div>
    </div>
  );
};

SignalStrengthIndicator.propTypes = {
  receiver_quality: PropTypes.number,
  transmitter_quality: PropTypes.number,
  transmitter_power: PropTypes.number,
  size: PropTypes.number,
  bars: PropTypes.number,
  direction: PropTypes.oneOf(['horizontal', 'vertical'])
};

export default SignalStrengthIndicator;
