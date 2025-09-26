import { useState, useRef, useEffect, useCallback } from 'react';

// Handles GPS track animation state and controls
const useGpsAnimation = (gpsTrack, fullGpsData) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(20);
  const [resetTrigger, setResetTrigger] = useState(false);
  const intervalRef = useRef(null);

  // Start playback from current or reset if at end
  const startAnimation = useCallback(() => {
    if (!gpsTrack?.length) return;
    if (!fullGpsData?.length) return;

    if (currentPointIndex >= gpsTrack.length - 1) setCurrentPointIndex(0);
    setIsPlaying(true);

    var currentAnimationSpeed = animationSpeed;
    if(animationSpeed == -1 && fullGpsData.length > 1){
      currentAnimationSpeed = Math.round(100 / (( fullGpsData[1].timestamp - fullGpsData[0].timestamp) / 10000) * 100) / 100;
    }

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
    }, 1000 / currentAnimationSpeed);
  }, [gpsTrack, animationSpeed, fullGpsData,  currentPointIndex]);

  // Pause playback
  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Reset to start and trigger rerender
  const resetAnimation = useCallback(() => {
    pauseAnimation();
    setCurrentPointIndex(0);
    setResetTrigger(prev => !prev);
  }, [pauseAnimation]);

  // Update speed and restart if playing
  const changeSpeed = useCallback((newSpeed) => {
    setAnimationSpeed(newSpeed);
  }, []);
  
  //react to animationSpeedChange
  useEffect(() => {
    if (isPlaying) {
      pauseAnimation();
      startAnimation();
    }
  }, [animationSpeed]);

  // Set position manually, pause if playing
  const handlePositionChange = useCallback((newPosition) => {
    if (isPlaying) pauseAnimation();
    setCurrentPointIndex(newPosition);
  }, [isPlaying, pauseAnimation]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Reset state when track changes
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
