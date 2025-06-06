/**
 * Returns UAV ID as number or null if invalid input
 * @param {Object|string|number} uavValue - The value containing a UAV reference
 * @returns {number|null} The extracted UAV ID or null if invalid
 */
export const extractUavId = (uavValue) => {
  // Accepts object with uav_id property
  if (typeof uavValue === 'object' && uavValue !== null && uavValue.uav_id) {
    uavValue = uavValue.uav_id;
  }
  
  // Converts numeric string to number
  if (typeof uavValue === 'string' && !isNaN(uavValue)) {
    uavValue = parseInt(uavValue, 10);
  }
  
  return uavValue;
};
