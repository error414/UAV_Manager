import { useEffect, useRef } from 'react';

export const AttitudeIndicator = ({ pitch = 0, roll = 0, size = 300 }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get parent container width if available
    const container = canvas.parentElement;
    const containerWidth = container ? container.clientWidth : size;
    const canvasSize = Math.min(containerWidth, size);
    
    // Set canvas dimensions for proper rendering
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    // Increase the radius to match other instruments (from 0.45 to 0.49)
    const radius = size * 0.49;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw outer circle (instrument case) - make it fill more of the canvas
    ctx.beginPath();
    ctx.arc(centerX, centerY, size/2, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    
    // Draw the instrument face
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
    const rollDegrees = -roll * 60; // Negated roll value to reverse direction
    const pitchDegrees = pitch * 60;
    
    // Move to center and apply roll rotation
    ctx.translate(centerX, centerY);
    ctx.rotate(rollDegrees * Math.PI / 180);
    
    // Adjust for pitch (move horizon up/down)
    // Negate the pitch offset to reverse the direction
    const pitchOffset = -(pitchDegrees / 90) * radius * 3.0; // Increased from 2.0 to 3.0 to zoom in even closer
    ctx.translate(0, pitchOffset);
    
    // Draw sky and ground
    const horizonWidth = radius * 4; // Increased from 2.5 to ensure full coverage
    const horizonHeight = radius * 8; // Significantly increased to cover extreme pitch angles
    
    // Calculate the y-position for 0 degrees (horizon line)
    const horizonPos = 0;
    
    // Draw sky section (blue) - from 0 to +90 degrees (nose up)
    ctx.fillStyle = '#4287f5';
    ctx.fillRect(-horizonWidth/2, horizonPos, horizonWidth, -horizonHeight/2);
    
    // Draw ground section (brown) - from 0 to -90 degrees (nose down)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-horizonWidth/2, horizonPos, horizonWidth, horizonHeight/2);
    
    // Draw horizon line
    ctx.beginPath();
    ctx.moveTo(-horizonWidth/2, 0);
    ctx.lineTo(horizonWidth/2, 0);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4; // Increased from 2 to 4 to make the center horizon line thicker
    ctx.stroke();
    
    // Draw pitch lines with updated scale
    const majorPitchLines = [-90, -80, -70, -60, -50, -40, -30, -20, -10, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const minorPitchLines = [-85, -75, -65, -55, -45, -35, -25, -15, -5, 5, 15, 25, 35, 45, 55, 65, 75, 85];
    
    // Draw major pitch lines
    majorPitchLines.forEach(p => {
      const yOffset = (-p / 90) * radius * 3.0; // Match the zoom factor used above
      const lineWidth = radius * 0.6;
      
      ctx.beginPath();
      ctx.moveTo(-lineWidth/2, yOffset);
      ctx.lineTo(lineWidth/2, yOffset);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add pitch markers
      ctx.font = `${size/20}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.abs(p)}`, -lineWidth/2 - 20, yOffset);
      
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.abs(p)}`, lineWidth/2 + 20, yOffset);
    });
    
    // Draw minor pitch lines (5-degree increments) - without numbers
    minorPitchLines.forEach(p => {
      const yOffset = (-p / 90) * radius * 3.0; // Match the zoom factor used above
      const lineWidth = radius * 0.3;
      
      ctx.beginPath();
      ctx.moveTo(-lineWidth/2, yOffset);
      ctx.lineTo(lineWidth/2, yOffset);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Removed the numerical indicators for minor pitch lines
    });
    
    // Go back to center point, unaffected by pitch
    ctx.translate(0, -pitchOffset);
    
    // Add background ring for roll markers - solid black
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, 2 * Math.PI, false); // Complete circle
    ctx.lineWidth = 30;
    ctx.strokeStyle = '#1a1a1a'; // Black color matching instrument case
    ctx.stroke();
    
    // Draw roll markers - now inside the rotated context so they move with the horizon
    const rollMarkers = [0, 10, 20, 30, 45, 60, 90]; // Added 90 degree markers
    rollMarkers.forEach(angle => {
      for (let sign of [-1, 1]) {
        const angleRad = sign * angle * Math.PI / 180;
        
        // Determine marker length based on angle importance
        let markerLength = angle % 30 === 0 ? 10 : 5;
        let markerWidth = 2;
        
        // Make 90 degree markers more prominent
        if (angle === 90) {
          markerLength = 12; // Longer marker for 90 degrees
          markerWidth = 2.5; // Thicker marker for 90 degrees
        }
        
        const startX = (radius - 10) * Math.sin(angleRad);
        const startY = -(radius - 10) * Math.cos(angleRad);
        
        const endX = (radius - 10 - markerLength) * Math.sin(angleRad);
        const endY = -(radius - 10 - markerLength) * Math.cos(angleRad);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = markerWidth;
        ctx.stroke();
      }
    });
    
    // Restore context - this removes the rotation so we can draw fixed elements
    ctx.restore();
    
    // Draw the fixed aircraft symbol
    ctx.beginPath();
    ctx.moveTo(centerX - 30, centerY); // Increased from -20 to -30
    ctx.lineTo(centerX - 10, centerY); // Increased from -5 to -10
    ctx.moveTo(centerX + 10, centerY); // Increased from +5 to +10
    ctx.lineTo(centerX + 30, centerY); // Increased from +20 to +30
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 5; // Increased from 3 to 5
    ctx.stroke();
    
    // Draw orange dot in the middle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI); // Reduced from 3px to 1.5px radius dot
    ctx.fillStyle = 'orange';
    ctx.fill();
    
    // Draw the roll indicator triangle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 5);
    ctx.lineTo(centerX - 7, centerY - radius + 15);
    ctx.lineTo(centerX + 7, centerY - radius + 15);
    ctx.closePath();
    ctx.fillStyle = 'orange';
    ctx.fill();
  }, [pitch, roll, size]);

  return (
    <div className="attitude-indicator flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
        }}
      />
    </div>
  );
};
