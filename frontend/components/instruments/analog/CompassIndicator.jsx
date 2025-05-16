import PropTypes from 'prop-types';
import { BaseInstrument } from '../../../components';

const CompassIndicator = ({ 
  heading = 0, 
  size = 300,
}) => {
  // Calculate needle angle
  const calculateNeedleAngle = (hdg) => {
    // Convert heading to a valid range (0-360)
    const normalizedHeading = ((hdg % 360) + 360) % 360;
    // For compass, needle is fixed and the dial rotates in the opposite direction
    return -normalizedHeading;
  };

  const calculateDialAngle = (deg) => {
    return deg - 90; // Adjust to make 0/360 (North) at the top
  };

  const dialAngle = calculateNeedleAngle(heading);
  const center = size / 2;
  const radius = size * 0.45;
  const tickTextRadius = radius * 0.7;
  const tickOuterRadius = radius;
  const majorTickInnerRadius = radius * 0.8;
  const minorTickInnerRadius = radius * 0.85;
  const cardinalTextRadius = tickTextRadius; // Buchstaben gleich nah wie Zahlen

  // Define compass cardinal points
  const cardinalPoints = [
    { deg: 0, text: 'N' }, 
    { deg: 90, text: 'E' }, 
    { deg: 180, text: 'S' }, 
    { deg: 270, text: 'W' }
  ];

  // Map degrees to the requested number labels
  const degreeToNumberMap = {
    30: '3',
    60: '6',
    120: '12',
    150: '15',
    210: '21',
    240: '24',
    300: '30',
    330: '33'
  };

  const generateTicks = () => {
    const ticks = [];
    const majorTickInterval = 30;
    const minorTickInterval = 10;

    // Generate tick marks from 0 to 360
    for (let deg = 0; deg < 360; deg += minorTickInterval) {
      const angle = calculateDialAngle(deg);
      const angleRad = angle * (Math.PI / 180);
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);
      
      const isMajorTick = deg % majorTickInterval === 0;
      const innerRadius = isMajorTick ? majorTickInnerRadius : minorTickInnerRadius;

      const outerX = center + tickOuterRadius * cosAngle;
      const outerY = center + tickOuterRadius * sinAngle;
      const innerX = center + innerRadius * cosAngle;
      const innerY = center + innerRadius * sinAngle;

      ticks.push(
        <line
          key={`tick-${deg}`}
          x1={outerX}
          y1={outerY}
          x2={innerX}
          y2={innerY}
          stroke="white"
          strokeWidth={isMajorTick ? 2 : 1}
        />
      );

      if (isMajorTick && deg % 90 !== 0) {
        const textX = center + tickTextRadius * cosAngle;
        const textY = center + tickTextRadius * sinAngle;
        
        ticks.push(
          <text
            key={`text-${deg}`}
            x={textX}
            y={textY}
            fill="white"
            fontSize={size / 15}
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${-dialAngle}, ${textX}, ${textY})`}
          >
            {degreeToNumberMap[deg] || deg}
          </text>
        );
      }
    }

    // Add cardinal points
    cardinalPoints.forEach(({ deg, text }) => {
      const angle = calculateDialAngle(deg);
      const angleRad = angle * (Math.PI / 180);
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);

      const textX = center + cardinalTextRadius * cosAngle;
      const textY = center + cardinalTextRadius * sinAngle;
      
      ticks.push(
        <text
          key={`cardinal-${text}`}
          x={textX}
          y={textY}
          fill="white"
          fontSize={size / 10}
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
          transform={`rotate(${-dialAngle}, ${textX}, ${textY})`}
        >
          {text}
        </text>
      );
    });

    return ticks;
  };

  return (
    <div className="compass-indicator flex flex-col items-center">
      <BaseInstrument size={size}>
        <g transform={`rotate(${dialAngle}, ${center}, ${center})`}>
          {generateTicks()}
        </g>

        <path
          d={`
            M ${center} ${center - size * 0.24}
            L ${center - size * 0.015} ${center - size * 0.11}
            L ${center - size * 0.24} ${center - size * 0.015}
            L ${center - size * 0.24} ${center + size * 0.015}
            L ${center - size * 0.015} ${center + size * 0.015}
            L ${center - size * 0.015} ${center + size * 0.15}
            L ${center - size * 0.05} ${center + size * 0.18}
            L ${center - size * 0.05} ${center + size * 0.20}
            L ${center + size * 0.05} ${center + size * 0.20}
            L ${center + size * 0.05} ${center + size * 0.18}
            L ${center + size * 0.015} ${center + size * 0.15}
            L ${center + size * 0.015} ${center + size * 0.015}
            L ${center + size * 0.24} ${center + size * 0.015}
            L ${center + size * 0.24} ${center - size * 0.015}
            L ${center + size * 0.015} ${center - size * 0.11}
            L ${center} ${center - size * 0.24}
            Z
          `}
          fill="none"
          stroke="#FFD600"
          strokeWidth={size * 0.01}
          strokeLinejoin="miter"
        />

        <text
          x={center}
          y={center - size * 0.025}
          fill="white"
          fontSize={size / 14}
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {Math.round(((heading % 360) + 360) % 360)}°
        </text>

        <path 
          d={`M${center},${center - radius - 2} L${center - size * 0.025},${center - radius * 0.8} L${center + size * 0.025},${center - radius * 0.8} Z`}
          fill="red" 
        />
      </BaseInstrument>
    </div>
  );
};

CompassIndicator.propTypes = {
  heading: PropTypes.number,
  size: PropTypes.number,
};

export default CompassIndicator;
