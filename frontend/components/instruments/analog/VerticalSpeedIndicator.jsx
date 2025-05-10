import React from 'react';
import PropTypes from 'prop-types';
import { BaseInstrument } from '../../../components';

const VerticalSpeedIndicator = ({ 
  verticalSpeed = 0, 
  size = 300, 
  minSpeed = -15,  
  maxSpeed = 15,
}) => {
  // Calculate needle angle - 0 m/s is at 0 deg (top), negative down, positive up
  const calculateNeedleAngle = (speed) => {
    // Clamp speed to valid range
    const clampedSpeed = Math.max(minSpeed, Math.min(speed, maxSpeed));
    // Map speed to angle: 0 m/s = 0 deg (top), minSpeed = +90 deg (down), maxSpeed = -90 deg (up)
    // Korrigiert: minSpeed -> +90deg, 0 -> 0deg, maxSpeed -> -90deg
    return (clampedSpeed / (maxSpeed - minSpeed)) * 180 * 2;
  };
  
  const needleAngle = calculateNeedleAngle(verticalSpeed);
  const center = size / 2;
  const radius = size * 0.45;
  const textRadius = radius * 0.75;
  const tickTextRadius = radius * 0.65;
  const tickOuterRadius = radius;
  const majorTickInnerRadius = radius * 0.8;
  const minorTickInnerRadius = radius * 0.85;

  const generateTicks = () => {
    const ticks = [];
    const majorTickInterval = 5;
    const minorTickInterval = 1;

    // Generate tick marks from minSpeed to maxSpeed
    for (let speed = minSpeed; speed <= maxSpeed; speed += minorTickInterval) {
      const angle = calculateNeedleAngle(speed);
      const angleRad = (angle - 180) * (Math.PI / 180); // -90 to rotate 0deg to top
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);
      
      const isMajorTick = speed % majorTickInterval === 0;
      const innerRadius = isMajorTick ? majorTickInnerRadius : minorTickInnerRadius;

      const outerX = center + tickOuterRadius * cosAngle;
      const outerY = center + tickOuterRadius * sinAngle;
      const innerX = center + innerRadius * cosAngle;
      const innerY = center + innerRadius * sinAngle;

      ticks.push(
        <line
          key={`tick-${speed}`}
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

        // Korrektur: Kein Tausch mehr von -5 und 5
        let displayValue = speed;

        // Skip -15 and 15 labels
        if (speed !== -15 && speed !== 15) {
          ticks.push(
            <text
              key={`text-${speed}`}
              x={textX}
              y={textY}
              fill="white"
              fontSize={size / 16}
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {displayValue}
            </text>
          );
        }
      }
    }
    return ticks;
  };

  return (
    <BaseInstrument size={size}>
      {generateTicks()}
      
      <text
        x={center}
        y={center - radius * 0.40}
        fill="white"
        fontSize={size / 18}
        fontWeight="bold"
        textAnchor="middle"
      >
        VERTICAL
      </text>
      <text
        x={center}
        y={center - radius * 0.25}
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
        M/S
      </text>
      
      {/* Climb indicator */}
      <text
        x={center}
        y={center - radius * 0.65}
        fill="white"
        fontSize={size / 22}
        textAnchor="middle"
      >
        UP
      </text>
      
      {/* Descent indicator */}
      <text
        x={center}
        y={center + radius * 0.65}
        fill="white"
        fontSize={size / 22}
        textAnchor="middle"
      >
        DOWN
      </text>
      
      <g transform={`rotate(${needleAngle - 90}, ${center}, ${center})`}>
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

VerticalSpeedIndicator.propTypes = {
  verticalSpeed: PropTypes.number,
  size: PropTypes.number,
  minSpeed: PropTypes.number,
  maxSpeed: PropTypes.number,
};

export default VerticalSpeedIndicator;
