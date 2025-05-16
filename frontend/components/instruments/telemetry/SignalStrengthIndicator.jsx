import { useEffect, useRef, useState } from 'react';
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
  direction = 'horizontal',
  maxSize = 120
}) => {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Berechne die optimale Größe basierend auf Container-Dimensionen
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Bestimme die optimale Größe basierend auf Containerabmessungen und Richtung
  const calcEffectiveSize = () => {
    if (!containerSize.width || !containerSize.height) return Math.min(size, maxSize);
    
    if (direction === 'vertical') {
      // Bei vertikaler Ausrichtung ist die Breite begrenzt
      const availableHeight = containerSize.height - 20; // Platz für Labels
      const availableWidth = containerSize.width - 10;
      const heightPerItem = availableHeight / 2; // Zwei Elemente (RX, TX)
      const minDim = Math.min(availableWidth, heightPerItem);
      return Math.min(minDim, maxSize);
    } else {
      // Bei horizontaler Ausrichtung ist die Höhe begrenzt
      const availableWidth = containerSize.width - 10;
      const widthPerItem = availableWidth / 2; // Zwei Elemente (RX, TX) 
      return Math.min(widthPerItem, maxSize);
    }
  };
  
  const effectiveSize = calcEffectiveSize();
  
  // Hilfsfunktion: Wert auf Balkenanzahl mappen
  const getBars = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    const v = Math.max(0, Math.min(100, value));
    return Math.round((v / 100) * bars);
  };

  const rxBars = getBars(receiver_quality);
  const txBars = getBars(transmitter_quality);

  // Optimiertes Balken-Layout
  const barWidth = effectiveSize / (bars * 2.2);
  const barSpacing = barWidth * 0.8;
  const barMaxHeight = effectiveSize * 0.75;
  const barMinHeight = effectiveSize * 0.15;

  // Hilfsfunktion: Farbe basierend auf Balkenindex und aktivierten Balken bestimmen
  const getBarColor = (barIndex, activeBars) => {
    if (barIndex >= activeBars) return '#d1d5db';
    
    const signalStrength = activeBars / bars;
    
    if (signalStrength <= 0.33) return '#ef4444';
    if (signalStrength <= 0.66) return '#eab308';
    return '#22c55e';
  };

  // Balken für ein Signal (Array von SVG-Rect)
  const renderBars = (activeBars) =>
    Array.from({ length: bars }).map((_, i) => {
      const height = barMinHeight + ((barMaxHeight - barMinHeight) * (i + 1) / bars);
      return (
        <rect
          key={i}
          x={i * (barWidth + barSpacing)}
          y={effectiveSize - height}
          width={barWidth}
          height={height}
          rx={barWidth * 0.3}
          fill={getBarColor(i, activeBars)}
        />
      );
    });

  // Festlegen der Container-Stile basierend auf Ausrichtung
  const containerClass = 
    direction === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  
  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: direction === 'vertical' ? '2px' : '4px'
  };

  // Stil für die einzelnen Anzeigeboxen
  const boxStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '2px',
    backgroundColor: 'white'
  };

  const textStyle = {
    fontSize: Math.max(8, effectiveSize / 8),
    marginTop: '1px',
    lineHeight: '1'
  };

  return (
    <div ref={containerRef} className={containerClass} style={containerStyle}>
      <div style={boxStyle}>
        <svg 
          width={effectiveSize} 
          height={effectiveSize} 
          viewBox={`0 0 ${effectiveSize} ${effectiveSize}`}
          style={{ display: 'block' }}
        >
          {renderBars(rxBars)}
        </svg>
        <span style={textStyle}>RX</span>
      </div>
      <div style={boxStyle}>
        <svg 
          width={effectiveSize} 
          height={effectiveSize} 
          viewBox={`0 0 ${effectiveSize} ${effectiveSize}`}
          style={{ display: 'block' }}
        >
          {renderBars(txBars)}
        </svg>
        <span style={textStyle}>TX</span>
        <span style={textStyle}>{transmitter_power} mW</span>
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
  direction: PropTypes.oneOf(['horizontal', 'vertical']),
  maxSize: PropTypes.number
};

export default SignalStrengthIndicator;
