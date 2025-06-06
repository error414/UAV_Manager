/**
 * Flight telemetry panel displaying control surfaces and system data
 * @param {Object} gpsPoint - GPS data point with telemetry
 * @returns {JSX.Element}
 */
const TelemetryPanel = ({ gpsPoint }) => {
  if (!gpsPoint) return null;
  
  // Convert control values from -1024/+1024 range to percentage
  const normalizeControlValue = (value) => {
    if (value == null) return 0;
    return (Math.abs(value) / 1024) * 100;
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-full">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Flight Telemetry</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 md:border-r md:pr-4">
          <h4 className="font-medium text-gray-700">Flight Controls</h4>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Aileron:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${normalizeControlValue(gpsPoint.aileron)}%` }}
                  ></div>
                </div>
                <span className="text-sm">{gpsPoint.aileron != null ? Number(gpsPoint.aileron).toFixed(0) : 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Elevator:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: `${normalizeControlValue(gpsPoint.elevator)}%` }}
                  ></div>
                </div>
                <span className="text-sm">{gpsPoint.elevator != null ? Number(gpsPoint.elevator).toFixed(0) : 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Throttle:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-red-600 h-2.5 rounded-full" 
                    style={{ width: `${gpsPoint.throttle != null ? (gpsPoint.throttle / 1024) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm">{gpsPoint.throttle != null ? Number(gpsPoint.throttle).toFixed(0) : 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rudder:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-yellow-600 h-2.5 rounded-full" 
                    style={{ width: `${normalizeControlValue(gpsPoint.rudder)}%` }}
                  ></div>
                </div>
                <span className="text-sm">{gpsPoint.rudder != null ? Number(gpsPoint.rudder).toFixed(0) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">System Data</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-gray-600 text-sm">Battery</div>
              <div className="text-gray-800">{gpsPoint.receiver_battery != null ? `${Number(gpsPoint.receiver_battery).toFixed(1)}V` : 'N/A'}</div>
            </div>
            
            <div>
              <div className="text-gray-600 text-sm">Current</div>
              <div className="text-gray-800">{gpsPoint.current != null ? `${Number(gpsPoint.current).toFixed(1)}A` : 'N/A'}</div>
            </div>
            
            <div>
              <div className="text-gray-600 text-sm">Capacity</div>
              <div className="text-gray-800">{gpsPoint.capacity != null ? `${Number(gpsPoint.capacity).toFixed(0)}mAh` : 'N/A'}</div>
            </div>
            
            <div>
              <div className="text-gray-600 text-sm">Tx Power</div>
              <div className="text-gray-800">{gpsPoint.transmitter_power != null ? `${gpsPoint.transmitter_power}mW` : 'N/A'}</div>
            </div>
          </div>
          
          <h4 className="font-medium text-gray-700 mt-2">Radio Quality</h4>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-gray-600 text-sm">Receiver</div>
              <div className="flex items-center gap-1">
                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${(gpsPoint.receiver_quality || 0) > 70 ? 'bg-green-600' : (gpsPoint.receiver_quality || 0) > 40 ? 'bg-yellow-500' : 'bg-red-600'}`} 
                    style={{ width: `${gpsPoint.receiver_quality || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm">{gpsPoint.receiver_quality || 0}%</span>
              </div>
            </div>
            
            <div>
              <div className="text-gray-600 text-sm">Transmitter</div>
              <div className="flex items-center gap-1">
                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${(gpsPoint.transmitter_quality || 0) > 70 ? 'bg-green-600' : (gpsPoint.transmitter_quality || 0) > 40 ? 'bg-yellow-500' : 'bg-red-600'}`} 
                    style={{ width: `${gpsPoint.transmitter_quality || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm">{gpsPoint.transmitter_quality || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;
