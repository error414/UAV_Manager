import React from 'react';
import PropTypes from 'prop-types';

const TurnCoordinator = ({ 
  turnRate = 0, // degrees per second
  size = 300
}) => {
  // Constants for instrument rendering
  const center = size / 2;
  const radius = size * 0.45;
  
  // Calculate aircraft rotation based on turn rate
  // Standard rate turn is 3 degrees per second
  // Maximum display is typically ±6 degrees per second (showing ±60° on the instrument)
  const MAX_TURN_DISPLAY = 6; // ±6 degrees/second
  const MAX_ROTATION = 60;    // ±60 degrees display angle
  
  const aircraftRotation = Math.min(Math.max(turnRate / MAX_TURN_DISPLAY * MAX_ROTATION, -MAX_ROTATION), MAX_ROTATION);
  
  // Flugzeug-Design
  const fuselageRadius = size * 0.06;
  const wingLength = size * 0.48;
  const wingWidth = size * 0.025;
  const tailHeight = size * 0.09;
  const tailWidth = size * 0.018;
  const gearLength = size * 0.08;
  const gearWidth = size * 0.018;

  // Positionen für L und R (schräg, wie im Bild)
  // labelOffset etwas kleiner für "mehr nach innen"
  const labelOffset = radius * 0.72;
  const labelAngle = 25; // Grad von der Horizontalen
  const fontSize = size / 13;

  // Position für L
  const lAngleRad = ((180 - labelAngle) * Math.PI) / 180;
  const lX = center + labelOffset * Math.cos(lAngleRad);
  const lY = center + labelOffset * Math.sin(lAngleRad);

  // Position für R
  const rAngleRad = (labelAngle * Math.PI) / 180;
  const rX = center + labelOffset * Math.cos(rAngleRad);
  const rY = center + labelOffset * Math.sin(rAngleRad);

  // Strich-Längen
  const diagMarkLen = size * 0.09;
  const diagMarkWidth = size * 0.012;
  const horzMarkLen = size * 0.13;
  const horzMarkWidth = size * 0.012;

  // Schrägstriche bei L/R
  const diagAngle = 25;
  // Offset für Striche etwas mehr nach innen
  const diagOffset = radius * 0.92;
  // Links
  const lMarkX = center + diagOffset * Math.cos(lAngleRad);
  const lMarkY = center + diagOffset * Math.sin(lAngleRad);
  // Rechts
  const rMarkX = center + diagOffset * Math.cos(rAngleRad);
  const rMarkY = center + diagOffset * Math.sin(rAngleRad);

  // Waagrechte Striche außen auf Flügelebene
  const horzOffset = wingLength / 2 + size * 0.13;
  const horzY = center;
  const leftHorzX = center - horzOffset;
  const rightHorzX = center + horzOffset;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer bezel */}
      <circle cx={center} cy={center} r={size / 2} fill="Black" />
      
      {/* Instrument face */}
      <circle cx={center} cy={center} r={radius + 5} fill="#232323" stroke="#333" strokeWidth="1" />
      
      {/* Center point reference */}
      <circle cx={center} cy={center} r={2} fill="white" />
      
      {/* Turn rate indicator markings */}
      <g>
        {/* Minutenmarke (2 min turn = standard rate) */}
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

      {/* Schrägstriche bei L/R */}
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

      {/* Waagrechte Striche außen auf Flügelebene */}
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
      
      {/* Flugzeug-Silhouette */}
      <g transform={`rotate(${aircraftRotation}, ${center}, ${center})`}>
        {/* Tragflächen */}
        <rect
          x={center - wingLength / 2}
          y={center - wingWidth / 2}
          width={wingLength}
          height={wingWidth}
          fill="white"
          rx={wingWidth / 2}
        />
        {/* Rumpf-Kreis */}
        <circle
          cx={center}
          cy={center}
          r={fuselageRadius}
          fill="white"
          stroke="black"
          strokeWidth={size * 0.01}
        />
        {/* Seitenleitwerk */}
        <rect
          x={center - tailWidth / 2}
          y={center - fuselageRadius - tailHeight}
          width={tailWidth}
          height={tailHeight}
          fill="white"
          rx={tailWidth / 2}
        />
        {/* Fahrwerk */}
        <rect
          x={center - gearLength / 2}
          y={center + fuselageRadius + size * 0.01}
          width={gearLength}
          height={gearWidth}
          fill="white"
          rx={gearWidth / 2}
        />
      </g>

      {/* L und R schräg außen */}
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
    </svg>
  );
};

TurnCoordinator.propTypes = {
  turnRate: PropTypes.number,  // degrees per second
  size: PropTypes.number
};

export default TurnCoordinator;
