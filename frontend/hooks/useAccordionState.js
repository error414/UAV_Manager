import { useState } from 'react';

/**
 * Custom hook to manage multiple accordion open/close states.
 * @param {Array<string>} keys - Array of panel keys
 * @returns {Object} - { state, toggle }
 */
const useAccordionState = (keys = []) => {
  const initial = {};
  keys.forEach(k => { initial[k] = false; });
  const [state, setState] = useState(initial);

  const toggle = key => setState(prev => ({ ...prev, [key]: !prev[key] }));

  return { state, toggle };
};

export default useAccordionState;
