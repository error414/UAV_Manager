import { useEffect, useRef } from 'react';

export const AttitudeIndicator = ({ pitch = 0, roll = 0, size = 300 }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size for crisp rendering
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.49;
    
    // Define horizon and pitch line variables
    const horizonWidth = radius * 4;
    const horizonHeight = radius * 8;
    const horizonPos = 0;
    const majorPitchLines = [-90, -60, -45, -30, -20, -10, 10, 20, 30, 45, 60, 90];
    const minorPitchLines = [-80, -70, -50, -40, -25, -15, -5, 5, 15, 25, 40, 50, 70, 80];
    
    ctx.clearRect(0, 0, size, size);
    
    // Draw instrument outer case
    ctx.beginPath();
    ctx.arc(centerX, centerY, size/2, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    
    // Draw instrument face
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.save();
    
    // Clip drawing to instrument face
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.95, 0, 2 * Math.PI);
    ctx.clip();
    
    // Map roll and pitch to degrees
    const rollDegrees = -roll * 60;
    const pitchDegrees = pitch * 60;
    
    // Move origin and rotate for roll
    ctx.translate(centerX, centerY);
    ctx.rotate(rollDegrees * Math.PI / 180);
    
    // Move for pitch
    const pitchOffset = -(pitchDegrees / 90) * radius * 3.0;
    ctx.translate(0, pitchOffset);
    
    // Draw sky
    ctx.fillStyle = '#4287f5';
    ctx.fillRect(-horizonWidth/2, horizonPos, horizonWidth, -horizonHeight/2);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-horizonWidth/2, horizonPos, horizonWidth, horizonHeight/2);
    
    // Draw horizon line
    ctx.beginPath();
    ctx.moveTo(-horizonWidth/2, 0);
    ctx.lineTo(horizonWidth/2, 0);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Major pitch lines (with labels)
    majorPitchLines.forEach(p => {
      const yOffset = (-p / 90) * radius * 3.0;
      const lineWidth = radius * 0.6;
      
      ctx.beginPath();
      ctx.moveTo(-lineWidth/2, yOffset);
      ctx.lineTo(lineWidth/2, yOffset);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Pitch value labels
      ctx.font = `${size/20}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.abs(p)}`, -lineWidth/2 - 20, yOffset);
      
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.abs(p)}`, lineWidth/2 + 20, yOffset);
    });
    
    // Minor pitch lines (no labels)
    minorPitchLines.forEach(p => {
      const yOffset = (-p / 90) * radius * 3.0;
      const lineWidth = radius * 0.3;
      
      ctx.beginPath();
      ctx.moveTo(-lineWidth/2, yOffset);
      ctx.lineTo(lineWidth/2, yOffset);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    // Undo pitch translation
    ctx.translate(0, -pitchOffset);
    
    // Draw roll marker ring
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, 2 * Math.PI, false);
    ctx.lineWidth = 30;
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();
    
    // Roll markers (move with horizon)
    const rollMarkers = [0, 10, 20, 30, 45, 60, 90];
    rollMarkers.forEach(angle => {
      for (let sign of [-1, 1]) {
        const angleRad = sign * angle * Math.PI / 180;
        
        // Longer/thicker marker for 90°
        let markerLength = angle % 30 === 0 ? 10 : 5;
        let markerWidth = 2;
        if (angle === 90) {
          markerLength = 12;
          markerWidth = 2.5;
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
    
    ctx.restore();
    
    // Draw fixed aircraft symbol
    ctx.beginPath();
    ctx.moveTo(centerX - 30, centerY);
    ctx.lineTo(centerX - 10, centerY);
    ctx.moveTo(centerX + 10, centerY);
    ctx.lineTo(centerX + 30, centerY);
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 5;
    ctx.stroke();
    
    // Draw center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'orange';
    ctx.fill();
    
    // Draw roll indicator triangle
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
