import React from 'react';
import PropTypes from 'prop-types';
import { BaseInstrument } from '../../../components';

const AltitudeIndicator = ({ 
  altitude = 0, 
  size = 300, 
  minAltitude = 0,  
  maxAltitude = 200,
}) => {
  // Calculate needle angle - clamped between min and max values
  const calculateNeedleAngle = (alt) => {
    // Clamp altitude to valid range
    const clampedAlt = Math.max(minAltitude, Math.min(alt, maxAltitude));
    // When altitude is 0, angle should be 0 (top)
    // As altitude increases, angle increases clockwise
    return ((clampedAlt / maxAltitude) * 300) + 0;
  };
  
  // Separate function for scale markings
  const calculateDialAngle = (alt) => {
    // 0m = -135 degrees (top), maxAltitude = +135 degrees
    return ((alt / maxAltitude) * 300) - 90;
  };

  const needleAngle = calculateNeedleAngle(altitude);
  const center = size / 2;
  const radius = size * 0.45;
  const textRadius = radius * 0.75;
  const tickTextRadius = radius * 0.65;
  const arcRadius = radius * 0.9;
  const arcWidth = radius * 0.18;
  const tickOuterRadius = radius;
  const majorTickInnerRadius = radius * 0.8;
  const minorTickInnerRadius = radius * 0.85;

  const generateTicks = () => {
    const ticks = [];
    const majorTickInterval = 20;
    const minorTickInterval = 10;

    // Generate tick marks from 0 to maxAltitude
    for (let displayAlt = 0; displayAlt <= maxAltitude; displayAlt += minorTickInterval) {
      // Use the dial-specific calculation for tick positions
      const angle = calculateDialAngle(displayAlt);
      const angleRad = angle * (Math.PI / 180);
      // Calculate position using standard trig
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);
      
      const isMajorTick = displayAlt % majorTickInterval === 0;
      const innerRadius = isMajorTick ? majorTickInnerRadius : minorTickInnerRadius;

      const outerX = center + tickOuterRadius * cosAngle;
      const outerY = center + tickOuterRadius * sinAngle;
      const innerX = center + innerRadius * cosAngle;
      const innerY = center + innerRadius * sinAngle;

      ticks.push(
        <line
          key={`tick-${displayAlt}`}
          x1={outerX}
          y1={outerY}
          x2={innerX}
          y2={innerY}
          stroke="white"
          strokeWidth={isMajorTick ? 2 : 1}
        />
      );

      if (isMajorTick) {
        const textX = center + tickTextRadius * cosAngle;
        const textY = center + tickTextRadius * sinAngle;
        
        ticks.push(
          <text
            key={`text-${displayAlt}`}
            x={textX}
            y={textY}
            fill="white"
            fontSize={size / 16}
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {displayAlt}
          </text>
        );
      }
    }
    return ticks;
  };

  return (
    <BaseInstrument size={size}>
      {generateTicks()}
      
      <text
        x={center}
        y={center - radius * 0.45}
        fill="white"
        fontSize={size / 18}
        fontWeight="bold"
        textAnchor="middle"
      >
        GPS
      </text>
      <text
        x={center}
        y={center - radius * 0.25}
        fill="white"
        fontSize={size / 18}
        fontWeight="bold"
        textAnchor="middle"
      >
        ALTITUDE
      </text>
      
      <text
        x={center}
        y={center + radius * 0.32}
        fill="white"
        fontSize={size / 22}
        textAnchor="middle"
      >
        M
      </text>
      
      <g transform={`rotate(${needleAngle}, ${center}, ${center})`}>
         <polygon 
           points={`${center},${center - radius * 0.95} ${center - size * 0.015},${center} ${center + size * 0.015},${center}`}
           fill="white" 
           stroke="black" 
           strokeWidth="0.5"
         />
         <line 
            x1={center} 
            y1={center} 
            x2={center} 
            y2={center + radius * 0.15}
            stroke="#333" 
            strokeWidth={size * 0.03}
            strokeLinecap="butt"
         />
         <circle cx={center} cy={center} r={size / 25} fill="#333" stroke="darkgrey" strokeWidth={1} /> 
      </g>
    </BaseInstrument>
  );
};

AltitudeIndicator.propTypes = {
  altitude: PropTypes.number,
  size: PropTypes.number,
  minAltitude: PropTypes.number,
  maxAltitude: PropTypes.number,
};

export default AltitudeIndicator;
