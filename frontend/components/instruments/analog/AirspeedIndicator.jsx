import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const AirspeedIndicator = ({ 
  airspeed = 0, 
  size = 300, 
  minSpeed = 0,  
  maxSpeed = 200,
  redLineSpeed = 160,
}) => {
  useEffect(() => {
    // console.log("Current airspeed:", airspeed);
  }, [airspeed]);

  // Keep this calculation for the needle - it's correct now
  const calculateNeedleAngle = (speed) => {
    // Clamp speed to valid range
    const clampedSpeed = Math.max(0, Math.min(speed, maxSpeed));
    // When speed is 0, angle should be 0 (top)
    // As speed increases, angle increases clockwise
    return ((clampedSpeed / maxSpeed) * 300) + 30;
  };
  
  // Separate function for scale markings
  const calculateDialAngle = (speed) => {
    // 0 km/h = -135 Grad (oben), maxSpeed = +135 Grad (270 Grad weiter im Uhrzeigersinn)
    // SVG 0 Grad ist rechts, daher -135 Grad als Start
    return ((speed / maxSpeed) * 300) - 60;
  };

  const needleAngle = calculateNeedleAngle(airspeed);
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

    // Generate tick marks from 0 to maxSpeed
    for (let displaySpeed = 0; displaySpeed <= maxSpeed; displaySpeed += minorTickInterval) {
      // Use the dial-specific calculation for tick positions
      const angle = calculateDialAngle(displaySpeed);
      const angleRad = angle * (Math.PI / 180);
      // Calculate position using standard trig - note that sin/cos work in the correct direction for SVG
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);
      
      const isMajorTick = displaySpeed % majorTickInterval === 0;
      const innerRadius = isMajorTick ? majorTickInnerRadius : minorTickInnerRadius;

      const outerX = center + tickOuterRadius * cosAngle;
      const outerY = center + tickOuterRadius * sinAngle;
      const innerX = center + innerRadius * cosAngle;
      const innerY = center + innerRadius * sinAngle;

      ticks.push(
        <line
          key={`tick-${displaySpeed}`}
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
            key={`text-${displaySpeed}`}
            x={textX}
            y={textY}
            fill="white"
            fontSize={size / 16}
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {displaySpeed}
          </text>
        );
      }
    }
    return ticks;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={size / 2} fill="Black" /> 
      <circle cx={center} cy={center} r={radius + 5} fill="#232323" /> 

      {generateTicks()}
      
      <text
        x={center}
        y={center - radius * 0.55}
        fill="white"
        fontSize={size / 18}
        fontWeight="bold"
        textAnchor="middle"
      >
        GPS
      </text>
      <text
        x={center}
        y={center - radius * 0.35}
        fill="white"
        fontSize={size / 18}
        fontWeight="bold"
        textAnchor="middle"
      >
        SPEED
      </text>
      
      <text
        x={center}
        y={center + radius * 0.32}
        fill="white"
        fontSize={size / 22}
        textAnchor="middle"
      >
        KM/H
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
    </svg>
  );
};

AirspeedIndicator.propTypes = {
  airspeed: PropTypes.number,
  size: PropTypes.number,
  minSpeed: PropTypes.number,
  maxSpeed: PropTypes.number,
  redLineSpeed: PropTypes.number,
};

export default AirspeedIndicator;
