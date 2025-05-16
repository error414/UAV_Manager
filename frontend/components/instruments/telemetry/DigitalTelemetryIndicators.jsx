import PropTypes from 'prop-types';

// Einzelne Indikatoren (unverändert)
export const ReceiverBatteryIndicator = ({ value = 0 }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-gray-500">RX Batt</span>
    <div className="text-lg font-mono font-bold text-blue-700">
      {value?.toFixed(2)} V
    </div>
  </div>
);

ReceiverBatteryIndicator.propTypes = {
  value: PropTypes.number
};

export const CapacityIndicator = ({ value = 0 }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-gray-500">Capacity</span>
    <div className="text-lg font-mono font-bold text-green-700">
      {value?.toFixed(0)} mAh
    </div>
  </div>
);

CapacityIndicator.propTypes = {
  value: PropTypes.number
};

export const CurrentIndicator = ({ value = 0 }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-gray-500">Current</span>
    <div className="text-lg font-mono font-bold text-red-700">
      {value?.toFixed(1)} A
    </div>
  </div>
);

CurrentIndicator.propTypes = {
  value: PropTypes.number
};

// Gruppierter Kasten im exakt gleichen Design wie SignalStrengthIndicator
export const DigitalTelemetryIndicatorsGroup = ({
  receiverBattery,
  capacity,
  current
}) => (
  <div className="flex flex-col items-center p-2 border border-gray-300 rounded">
    <span className="font-semibold text-gray-700 mb-2">Telemetry</span>
    <ReceiverBatteryIndicator value={receiverBattery} />
    <CapacityIndicator value={capacity} />
    <CurrentIndicator value={current} />
  </div>
);
DigitalTelemetryIndicatorsGroup.propTypes = {
  receiverBattery: PropTypes.number,
  capacity: PropTypes.number,
  current: PropTypes.number
};
