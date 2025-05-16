import PropTypes from 'prop-types';

const BaseInstrument = ({ 
  size,
  children,
  backgroundColor = "#232323",
  outerColor = "Black" 
}) => {
  const center = size / 2;
  const radius = size * 0.45;

  return (
    <div className="instrument-container flex flex-col items-center">
      <svg 
        width="100%" 
        height="auto" 
        viewBox={`0 0 ${size} ${size}`} 
        style={{ maxWidth: size, maxHeight: size }}
      >
        <circle cx={center} cy={center} r={size / 2} fill={outerColor} /> 
        <circle cx={center} cy={center} r={radius + 5} fill={backgroundColor} /> 
        {children}
      </svg>
    </div>
  );
};

BaseInstrument.propTypes = {
  size: PropTypes.number.isRequired,
  children: PropTypes.node,
  backgroundColor: PropTypes.string,
  outerColor: PropTypes.string
};

export default BaseInstrument;
