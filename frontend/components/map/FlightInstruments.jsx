import React, { useEffect, useRef } from 'react';

export const ArtificialHorizon = ({ pitch = 0, roll = 0, size = 200 }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.45;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw outer circle (instrument case)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Save the current state
    ctx.save();
    
    // Create clipping circle for the horizon
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.95, 0, 2 * Math.PI);
    ctx.clip();
    
    // Convert from -1.5 to 1.5 range to degrees
    // Using 60 degrees per unit (so -1.5 to 1.5 maps to -90 to 90 degrees)
    const rollDegrees = roll * 60;
    const pitchDegrees = pitch * 60;
    
    // Move to center and apply roll rotation
    ctx.translate(centerX, centerY);
    ctx.rotate(rollDegrees * Math.PI / 180);
    
    // Adjust for pitch (move horizon up/down)
    // Negate the pitch offset to reverse the direction
    const pitchOffset = -(pitchDegrees / 90) * radius * 1.4; // Scale pitch movement for full 90 degree range
    ctx.translate(0, pitchOffset);
    
    // Draw sky and ground
    const horizonWidth = radius * 2.5;
    const horizonHeight = radius * 2.5;
    
    // Sky (upper half)
    ctx.fillStyle = '#4287f5';
    ctx.fillRect(-horizonWidth/2, -horizonHeight/2, horizonWidth, horizonHeight/2);
    
    // Ground (lower half)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-horizonWidth/2, 0, horizonWidth, horizonHeight/2);
    
    // Draw horizon line
    ctx.beginPath();
    ctx.moveTo(-horizonWidth/2, 0);
    ctx.lineTo(horizonWidth/2, 0);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw pitch lines
    const pitchLines = [-30, -20, -10, 10, 20, 30];
    pitchLines.forEach(p => {
      const yOffset = (-p / 90) * radius * 1.4;
      const lineWidth = p % 10 === 0 ? radius * 0.6 : radius * 0.3;
      
      ctx.beginPath();
      ctx.moveTo(-lineWidth/2, yOffset);
      ctx.lineTo(lineWidth/2, yOffset);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = p % 10 === 0 ? 2 : 1;
      ctx.stroke();
      
      // Add pitch markers
      if (p % 10 === 0 && p !== 0) {
        ctx.font = `${size/20}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.abs(p)}`, -lineWidth/2 - 20, yOffset);
        
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.abs(p)}`, lineWidth/2 + 20, yOffset);
      }
    });
    
    // Restore context
    ctx.restore();
    
    // Draw the fixed aircraft symbol
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX - 5, centerY);
    ctx.moveTo(centerX + 5, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw the roll indicator triangle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 5);
    ctx.lineTo(centerX - 7, centerY - radius + 15);
    ctx.lineTo(centerX + 7, centerY - radius + 15);
    ctx.closePath();
    ctx.fillStyle = 'orange';
    ctx.fill();
    
    // Draw roll markers
    const rollMarkers = [0, 10, 20, 30, 45, 60];
    rollMarkers.forEach(angle => {
      for (let sign of [-1, 1]) {
        const angleRad = sign * angle * Math.PI / 180;
        const markerLength = angle % 30 === 0 ? 10 : 5;
        
        const startX = centerX + (radius - 10) * Math.sin(angleRad);
        const startY = centerY - (radius - 10) * Math.cos(angleRad);
        
        const endX = centerX + (radius - 10 - markerLength) * Math.sin(angleRad);
        const endY = centerY - (radius - 10 - markerLength) * Math.cos(angleRad);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [pitch, roll, size]);

  return (
    <div className="artificial-horizon flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    </div>
  );
};
