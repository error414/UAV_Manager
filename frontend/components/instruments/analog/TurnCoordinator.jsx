import PropTypes from 'prop-types';
import { BaseInstrument } from '../../../components';

const TurnCoordinator = ({ 
  turnRate = 0, // degrees per second
  size = 300
}) => {
  // Instrument geometry
  const center = size / 2;
  const radius = size * 0.45;
  
  // Clamp aircraft rotation to ±MAX_ROTATION
  const MAX_TURN_DISPLAY = 6; // max turn rate shown (deg/s)
  const MAX_ROTATION = 60;    // max rotation angle (deg)
  const aircraftRotation = Math.min(Math.max(turnRate / MAX_TURN_DISPLAY * MAX_ROTATION, -MAX_ROTATION), MAX_ROTATION);
  
  // Aircraft silhouette dimensions
  const fuselageRadius = size * 0.06;
  const wingLength = size * 0.48;
  const wingWidth = size * 0.025;
  const tailHeight = size * 0.09;
  const tailWidth = size * 0.018;
  const gearLength = size * 0.08;
  const gearWidth = size * 0.018;

  // L/R label positioning (angled)
  const labelOffset = radius * 0.72;
  const labelAngle = 25; // degrees from horizontal
  const fontSize = size / 13;

  // Left label position
  const lAngleRad = ((180 - labelAngle) * Math.PI) / 180;
  const lX = center + labelOffset * Math.cos(lAngleRad);
  const lY = center + labelOffset * Math.sin(lAngleRad);

  // Right label position
  const rAngleRad = (labelAngle * Math.PI) / 180;
  const rX = center + labelOffset * Math.cos(rAngleRad);
  const rY = center + labelOffset * Math.sin(rAngleRad);

  // Mark dimensions
  const diagMarkLen = size * 0.09;
  const diagMarkWidth = size * 0.012;
  const horzMarkLen = size * 0.13;
  const horzMarkWidth = size * 0.012;

  // Diagonal marks at L/R
  const diagAngle = 25;
  // Slightly more inward offset for marks
  const diagOffset = radius * 0.92;
  // Left mark position
  const lMarkX = center + diagOffset * Math.cos(lAngleRad);
  const lMarkY = center + diagOffset * Math.sin(lAngleRad);
  // Right mark position
  const rMarkX = center + diagOffset * Math.cos(rAngleRad);
  const rMarkY = center + diagOffset * Math.sin(rAngleRad);

  // Horizontal marks at wing level (outer)
  const horzOffset = wingLength / 2 + size * 0.13;
  const horzY = center;
  const leftHorzX = center - horzOffset;
  const rightHorzX = center + horzOffset;
  
  return (
    <BaseInstrument size={size}>
      {/* Center reference point */}
      <circle cx={center} cy={center} r={2} fill="white" />
      
      {/* Turn rate indicator label */}
      <g>
        <text 
          x={center} 
          y={center - radius * 0.55} 
          fill="white" 
          fontSize={size / 20} 
          textAnchor="middle"
        >
          2 MIN
        </text>
      </g>

      {/* Diagonal marks at L/R */}
      <rect
        x={lMarkX - diagMarkLen / 2}
        y={lMarkY - diagMarkWidth / 2}
        width={diagMarkLen}
        height={diagMarkWidth}
        fill="white"
        rx={diagMarkWidth / 2}
        transform={`rotate(${-diagAngle},${lMarkX},${lMarkY})`}
      />
      <rect
        x={rMarkX - diagMarkLen / 2}
        y={rMarkY - diagMarkWidth / 2}
        width={diagMarkLen}
        height={diagMarkWidth}
        fill="white"
        rx={diagMarkWidth / 2}
        transform={`rotate(${diagAngle},${rMarkX},${rMarkY})`}
      />

      {/* Horizontal marks at wing level */}
      <rect
        x={leftHorzX - horzMarkLen / 2}
        y={horzY - horzMarkWidth / 2}
        width={horzMarkLen}
        height={horzMarkWidth}
        fill="white"
        rx={horzMarkWidth / 2}
      />
      <rect
        x={rightHorzX - horzMarkLen / 2}
        y={horzY - horzMarkWidth / 2}
        width={horzMarkLen}
        height={horzMarkWidth}
        fill="white"
        rx={horzMarkWidth / 2}
      />
      
      {/* Aircraft silhouette */}
      <g transform={`rotate(${aircraftRotation}, ${center}, ${center})`}>
        {/* Wings */}
        <rect
          x={center - wingLength / 2}
          y={center - wingWidth / 2}
          width={wingLength}
          height={wingWidth}
          fill="white"
          rx={wingWidth / 2}
        />
        {/* Fuselage */}
        <circle
          cx={center}
          cy={center}
          r={fuselageRadius}
          fill="white"
          stroke="black"
          strokeWidth={size * 0.01}
        />
        {/* Vertical stabilizer */}
        <rect
          x={center - tailWidth / 2}
          y={center - fuselageRadius - tailHeight}
          width={tailWidth}
          height={tailHeight}
          fill="white"
          rx={tailWidth / 2}
        />
        {/* Landing gear */}
        <rect
          x={center - gearLength / 2}
          y={center + fuselageRadius + size * 0.01}
          width={gearLength}
          height={gearWidth}
          fill="white"
          rx={gearWidth / 2}
        />
      </g>

      {/* L and R labels (angled) */}
      <text
        x={lX}
        y={lY}
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        textAnchor="middle"
        alignmentBaseline="middle"
        transform={`rotate(-25,${lX},${lY})`}
      >
        L
      </text>
      <text
        x={rX}
        y={rY}
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        textAnchor="middle"
        alignmentBaseline="middle"
        transform={`rotate(25,${rX},${rY})`}
      >
        R
      </text>
      
      {/* Instrument name */}
      <text
        x={center}
        y={center + radius * 0.50}
        fill="white"
        fontSize={size / 18}
        fontWeight="bold"
        textAnchor="middle"
      >
        TURN COORDINATOR
      </text>
      <text
        x={center}
        y={center + radius * 0.62}
        fill="white"
        fontSize={size / 22}
        textAnchor="middle"
      >
        NO PITCH
        INFORMATION
      </text>
    </BaseInstrument>
  );
};

TurnCoordinator.propTypes = {
  turnRate: PropTypes.number,  // degrees per second
  size: PropTypes.number
};

export default TurnCoordinator;
