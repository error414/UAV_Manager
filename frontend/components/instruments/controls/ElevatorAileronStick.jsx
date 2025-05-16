import PropTypes from 'prop-types';

const ElevatorAileronStick = ({ 
  elevator = 0, // -1024 to 1024 (backward/forward)
  aileron = 0,  // -1024 to 1024 (left/right)
  size = 200
}) => {
  // Werte direkt verwenden, keine Umrechnung/Parsing
  const elevatorValue = typeof elevator === 'number' ? elevator : 0;
  const aileronValue = typeof aileron === 'number' ? aileron : 0;

  // Normalize values to ensure they're within range
  const normalizedElevator = Math.min(1024, Math.max(-1024, elevatorValue));
  const normalizedAileron = Math.min(1024, Math.max(-1024, aileronValue));
  
  // Calculate dimensions
  const center = size / 2;
  const stickBaseRadius = size * 0.45;
  const stickSize = size * 0.12;
  
  // Calculate stick position ensuring 0 is centered
  const stickX = center + (normalizedAileron / 1024) * stickBaseRadius;
  const stickY = center - (normalizedElevator / 1024) * stickBaseRadius;
  
  // Ensure stick stays within the base circle
  const distance = Math.sqrt(Math.pow(stickX - center, 2) + Math.pow(stickY - center, 2));
  let adjustedX = stickX;
  let adjustedY = stickY;
  
  if (distance > stickBaseRadius) {
    const angle = Math.atan2(stickY - center, stickX - center);
    adjustedX = center + Math.cos(angle) * stickBaseRadius;
    adjustedY = center + Math.sin(angle) * stickBaseRadius;
  }
  
  // Format values to consistent width
  const formatValue = (value) => {
    return value.toString().padStart(5, ' ');
  };
  
  return (
    <div className="flex flex-col items-center" style={{ width: size, maxWidth: size }}>
      <svg width="100%" height="auto" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, maxHeight: size }}>
        {/* Outer casing */}
        <circle cx={center} cy={center} r={size / 2} fill="#333" />
        
        {/* Stick base */}
        <circle cx={center} cy={center} r={stickBaseRadius} fill="#222" stroke="#444" strokeWidth="2" />
        
        {/* Crosshairs */}
        <line x1={center} y1={center - stickBaseRadius} x2={center} y2={center + stickBaseRadius} 
              stroke="#444" strokeWidth="1" strokeDasharray="5,5" />
        <line x1={center - stickBaseRadius} y1={center} x2={center + stickBaseRadius} y2={center} 
              stroke="#444" strokeWidth="1" strokeDasharray="5,5" />
        
        {/* Connection line */}
        <line x1={center} y1={center} x2={adjustedX} y2={adjustedY} stroke="#666" strokeWidth="3" />
        
        {/* Joystick handle */}
        <circle cx={adjustedX} cy={adjustedY} r={stickSize} fill="#555" stroke="#888" strokeWidth="2" />
      </svg>
      <div className="text-xs text-gray-600 mt-1 font-mono w-full text-center whitespace-pre" style={{ height: '1.5rem' }}>
        E: {formatValue(elevatorValue)} A: {formatValue(aileronValue)}
      </div>
    </div>
  );
};

ElevatorAileronStick.propTypes = {
  elevator: PropTypes.number,
  aileron: PropTypes.number,
  size: PropTypes.number
};

export default ElevatorAileronStick;
