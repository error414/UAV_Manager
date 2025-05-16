import { Button } from '../index';

// Add this new component for displaying GPS data
export const GpsDataPanel = ({ gpsPoint, gpsStats }) => {
  if (!gpsPoint) return null;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-full flex flex-col justify-between">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Live GPS Data</h3>
      <div className="flex-grow">
        <div className="mb-3">
          <div className="text-gray-600 font-medium mb-1">Coordinates</div>
          <div className="text-gray-800">Lat: {gpsPoint.latitude?.toFixed(6) || 'N/A'}</div>
          <div className="text-gray-800">Lng: {gpsPoint.longitude?.toFixed(6) || 'N/A'}</div>
        </div>
        <div className="flex mb-3 space-x-6">
          <div className="flex-1">
            <div className="text-gray-600 font-medium mb-1">Altitude</div>
            <div className="text-gray-800">{gpsPoint.altitude !== null && gpsPoint.altitude !== undefined ? `${gpsPoint.altitude.toFixed(1)} m` : '0.0 m'}</div>
          </div>
          <div className="flex-1">
            <div className="text-gray-600 font-medium mb-1">Vertical Speed</div>
            <div className="text-gray-800">{gpsPoint.vertical_speed ? `${gpsPoint.vertical_speed.toFixed(1)} m/s` : 'N/A'}</div>
          </div>
        </div>
        <div className="mb-3">
          <div className="text-gray-600 font-medium mb-1">Speed</div>
          <div className="text-gray-800">{gpsPoint.speed ? `${gpsPoint.speed.toFixed(1)} km/h` : 'N/A'}</div>
        </div>
        <div className="mb-3">
          <div className="text-gray-600 font-medium mb-1">Satellites</div>
          <div className="text-gray-800">{gpsPoint.num_sat || 'N/A'}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600 font-medium mb-1">Course</div>
          <div className="text-gray-800">{gpsPoint.ground_course ? `${gpsPoint.ground_course.toFixed(1)}°` : 'N/A'}</div>
        </div>
        
        {/* Statistics Box */}
        {gpsStats && (
          <div className="mt-2 border-t pt-3">
            <div className="text-gray-600 font-medium mb-2">Statistics</div>
            <div className="bg-gray-50 p-2 rounded-lg">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Min Altitude:</span> {gpsStats.minAltitude !== null && gpsStats.minAltitude !== undefined ? `${gpsStats.minAltitude.toFixed(1)} m` : '0.0 m'}
                </div>
                <div>
                  <span className="font-medium">Max Altitude:</span> {gpsStats.maxAltitude !== null && gpsStats.maxAltitude !== undefined ? `${gpsStats.maxAltitude.toFixed(1)} m` : '0.0 m'}
                </div>
                <div>
                  <span className="font-medium">Min Speed:</span> {gpsStats.minSpeed ? `${gpsStats.minSpeed.toFixed(1)} km/h` : 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Max Speed:</span> {gpsStats.maxSpeed ? `${gpsStats.maxSpeed.toFixed(1)} km/h` : 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Min Satellites:</span> {gpsStats.minSatellites || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Max Satellites:</span> {gpsStats.maxSatellites || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GpsAnimationControls = ({ 
  isPlaying, 
  startAnimation, 
  pauseAnimation, 
  resetAnimation,
  animationSpeed,
  changeSpeed,
  currentPointIndex,
  trackLength,
  onPositionChange
}) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-800 mb-3">GPS Track Animation</h3>
      <div className="flex flex-wrap gap-4 justify-center items-center">
        <div className="flex gap-2">
          {!isPlaying ? (
            <Button onClick={startAnimation} variant="success" size="md">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play
              </span>
            </Button>
          ) : (
            <Button onClick={pauseAnimation} variant="danger" size="md">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pause
              </span>
            </Button>
          )}
          <Button onClick={resetAnimation} variant="primary" size="md">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Reset
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Animation Speed:</span>
          <select 
            value={animationSpeed} 
            onChange={e => changeSpeed(Number(e.target.value))}
            className="border rounded px-3 py-2"
          >
            <option value={0.5}>0.5 Einträge pro Sekunde</option>
            <option value={1}>1 Eintrag pro Sekunde</option>
            <option value={2}>2 Einträge pro Sekunde</option>
            <option value={5}>5 Einträge pro Sekunde</option>
            <option value={10}>10 Einträge pro Sekunde</option>
            <option value={20}>20 Einträge pro Sekunde</option>
          </select>
        </div>
      </div>
      
      <div className="mt-4 w-full">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={trackLength ? trackLength - 1 : 0}
            value={currentPointIndex}
            onChange={(e) => onPositionChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${trackLength ? (currentPointIndex / (trackLength - 1)) * 100 : 0}%, #e5e7eb ${trackLength ? (currentPointIndex / (trackLength - 1)) * 100 : 0}%, #e5e7eb 100%)`,
              accentColor: '#3b82f6'
            }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>Start</span>
          <span>Position: {currentPointIndex} / {trackLength - 1}</span>
          <span>End</span>
        </div>
      </div>
    </div>
  );
};

/*
  WICHTIG:
  Die Animationslogik muss so implementiert sein, dass pro Sekunde maximal `animationSpeed` Einträge abgespielt werden.
  Beispiel: setInterval(() => { ...nächster Punkt... }, 1000 / animationSpeed)
  Aktuell wird vermutlich einfach zu schnell iteriert!
*/

export default GpsAnimationControls;
