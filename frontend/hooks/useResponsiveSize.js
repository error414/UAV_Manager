import { useState, useEffect } from 'react';

/**
 * Returns a responsive size based on the referenced element's width.
 * @param {object} ref - React ref to a DOM element
 * @param {number} defaultSize - Default size to use
 * @param {number} minSize - Minimum size allowed
 * @returns {number} - Calculated size
 */
const useResponsiveSize = (ref, defaultSize = 120, minSize = 32) => {
  const [size, setSize] = useState(defaultSize);

  useEffect(() => {
    const updateSize = () => {
      if (ref.current) {
        // Calculate size based on element width, with upper and lower bounds.
        const width = ref.current.offsetWidth;
        const newSize = Math.min(Math.floor((width - 16)), 220);
        setSize(newSize > minSize ? newSize : minSize);
      }
    };

    updateSize();
    requestAnimationFrame(updateSize);
    const timeout = setTimeout(updateSize, 250);
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeout);
    };
  }, [ref, minSize]);

  return size;
};

export default useResponsiveSize;
