import { useCallback } from 'react';

export function useUAVs(runAuthenticatedOperation, fetchData, setAvailableUAVs) {
  const fetchUAVs = useCallback(async () => {
    return runAuthenticatedOperation(async () => {
      const result = await fetchData('/api/uavs/');
      if (!result.error) {
        const uavArray = Array.isArray(result.data) ? result.data : (result.data.results || []);
        setAvailableUAVs(uavArray);
      }
      return result;
    });
  }, [runAuthenticatedOperation, fetchData, setAvailableUAVs]);
  return { fetchUAVs };
}
