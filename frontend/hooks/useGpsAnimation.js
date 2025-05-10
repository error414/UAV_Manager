import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for handling GPS track animation/playback logic.
 * @param {Array} gpsTrack - Array of GPS points (can be null/empty)
 * @returns {Object} Animation state and control functions
 */
const useGpsAnimation = (gpsTrack) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(20);
  const [resetTrigger, setResetTrigger] = useState(false);
  const intervalRef = useRef(null);

  // Start animation
  const startAnimation = useCallback(() => {
    if (!gpsTrack?.length) return;
    if (currentPointIndex >= gpsTrack.length - 1) setCurrentPointIndex(0);
    setIsPlaying(true);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCurrentPointIndex(prevIndex => {
        if (prevIndex >= gpsTrack.length - 1) {
          setIsPlaying(false);
          clearInterval(intervalRef.current);
          return gpsTrack.length - 1;
        }
        return prevIndex + 1;
      });
    }, 1000 / animationSpeed);
  }, [gpsTrack, animationSpeed, currentPointIndex]);

  // Pause animation
  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Reset animation
  const resetAnimation = useCallback(() => {
    pauseAnimation();
    setCurrentPointIndex(0);
    setResetTrigger(prev => !prev);
  }, [pauseAnimation]);

  // Change speed
  const changeSpeed = useCallback((newSpeed) => {
    setAnimationSpeed(newSpeed);
    if (isPlaying) {
      pauseAnimation();
      startAnimation();
    }
  }, [isPlaying, pauseAnimation, startAnimation]);

  // Set position manually
  const handlePositionChange = useCallback((newPosition) => {
    if (isPlaying) pauseAnimation();
    setCurrentPointIndex(newPosition);
  }, [isPlaying, pauseAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Reset index if gpsTrack changes
  useEffect(() => {
    setCurrentPointIndex(0);
    setIsPlaying(false);
    setResetTrigger(prev => !prev);
  }, [gpsTrack]);

  return {
    isPlaying,
    currentPointIndex,
    animationSpeed,
    resetTrigger,
    startAnimation,
    pauseAnimation,
    resetAnimation,
    changeSpeed,
    handlePositionChange,
    setCurrentPointIndex
  };
};

export default useGpsAnimation;
