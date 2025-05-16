/**
 * Extracts the UAV ID from either an object or string
 * @param {Object|string|number} uavValue - The value containing a UAV reference
 * @returns {number|null} The extracted UAV ID or null if invalid
 */
export const extractUavId = (uavValue) => {
  if (typeof uavValue === 'object' && uavValue !== null && uavValue.uav_id) {
    uavValue = uavValue.uav_id;
  }
  
  if (typeof uavValue === 'string' && !isNaN(uavValue)) {
    uavValue = parseInt(uavValue, 10);
  }
  
  return uavValue;
};
