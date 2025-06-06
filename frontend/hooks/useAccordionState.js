import { useState } from 'react';

/**
 * Manages open/close state for multiple accordions
 * @param {Array<string>} keys - Array of panel keys
 * @returns {Object} - { state, toggle }
 */
const useAccordionState = (keys = []) => {
  const initial = {};
  keys.forEach(k => { initial[k] = false; });
  const [state, setState] = useState(initial);

  /**
   * Toggles the state for a given key
   * @param {string} key - The key of the panel to toggle
   */
  const toggle = key => setState(prev => ({ ...prev, [key]: !prev[key] }));

  return { state, toggle };
};

export default useAccordionState;
