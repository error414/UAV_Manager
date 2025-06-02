import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

// Parses query string into { page, sort, filters }
export function parseQuery(search, defaultSort = '-departure_date,-departure_time') {
  const params = new URLSearchParams(search);
  const filters = {};
  for (const [key, value] of params.entries()) {
    if (key === 'page' || key === 'sort') continue;
    filters[key] = value;
  }
  return {
    page: parseInt(params.get('page'), 10) || 1,
    sort: params.get('sort') || defaultSort,
    filters
  };
}

// Builds query string from { page, sort, filters }
export function buildQuery(page, sort, filters, defaultSort = '-departure_date,-departure_time') {
  const params = new URLSearchParams();
  if (page && page > 1) params.set('page', page);
  if (sort && sort !== defaultSort) params.set('sort', sort);
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return params.toString();
}

// React hook for query state
export function useQueryState(defaultSort = '-departure_date,-departure_time') {
  const location = useLocation();
  const navigate = useNavigate();

  const getQueryState = useCallback(() => parseQuery(location.search, defaultSort), [location.search, defaultSort]);

  const setQueryState = useCallback((page, sort, filters) => {
    const query = buildQuery(page, sort, filters, defaultSort);
    navigate({ search: query ? `?${query}` : '' }, { replace: true });
  }, [navigate, defaultSort]);

  return { getQueryState, setQueryState };
}
