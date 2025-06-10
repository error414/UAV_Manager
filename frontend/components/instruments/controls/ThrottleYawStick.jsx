import PropTypes from 'prop-types';

const ThrottleYawStick = ({ 
  throttle = 0, // Range: -1024 to 1024
  yaw = 0,      // Range: -1024 to 1024
  size = 200
}) => {
  // Use raw values if valid, else fallback to 0
  const throttleValue = typeof throttle === 'number' ? throttle : 0;
  const yawValue = typeof yaw === 'number' ? yaw : 0;

  // Clamp values to valid range
  const normalizedThrottle = Math.min(1024, Math.max(-1024, throttleValue));
  const normalizedYaw = Math.min(1024, Math.max(-1024, yawValue));
  
  // Geometry calculations
  const center = size / 2;
  const stickBaseRadius = size * 0.45;
  const stickSize = size * 0.12;
  
  // Calculate stick position (centered at 0)
  const stickX = center + (normalizedYaw / 1024) * stickBaseRadius;
  const stickY = center - (normalizedThrottle / 1024) * stickBaseRadius;
  
  // Keep stick inside base circle
  const distance = Math.sqrt(Math.pow(stickX - center, 2) + Math.pow(stickY - center, 2));
  let adjustedX = stickX;
  let adjustedY = stickY;
  
  if (distance > stickBaseRadius) {
    const angle = Math.atan2(stickY - center, stickX - center);
    adjustedX = center + Math.cos(angle) * stickBaseRadius;
    adjustedY = center + Math.sin(angle) * stickBaseRadius;
  }
  
  // Pad value for display
  const formatValue = (value) => {
    return value.toString().padStart(5, ' ');
  };
  
  return (
    <div className="flex flex-col items-center" style={{ width: size, maxWidth: size }}>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, maxHeight: size }}>
        {/* Outer ring */}
        <circle cx={center} cy={center} r={size / 2} fill="#333" />
        
        {/* Stick base */}
        <circle cx={center} cy={center} r={stickBaseRadius} fill="#222" stroke="#444" strokeWidth="2" />
        
        {/* Crosshairs */}
        <line x1={center} y1={center - stickBaseRadius} x2={center} y2={center + stickBaseRadius} 
              stroke="#444" strokeWidth="1" strokeDasharray="5,5" />
        <line x1={center - stickBaseRadius} y1={center} x2={center + stickBaseRadius} y2={center} 
              stroke="#444" strokeWidth="1" strokeDasharray="5,5" />
        
        {/* Stick connector */}
        <line x1={center} y1={center} x2={adjustedX} y2={adjustedY} stroke="#666" strokeWidth="3" />
        
        {/* Stick handle */}
        <circle cx={adjustedX} cy={adjustedY} r={stickSize} fill="#555" stroke="#888" strokeWidth="2" />
      </svg>
      <div className="text-xs text-gray-600 mt-1 font-mono w-full text-center whitespace-pre" style={{ height: '1.5rem' }}>
        T: {formatValue(throttleValue)} Y: {formatValue(yawValue)}
      </div>
    </div>
  );
};

ThrottleYawStick.propTypes = {
  throttle: PropTypes.number,
  yaw: PropTypes.number,
  size: PropTypes.number
};

export default ThrottleYawStick;
