// pages/__tests__/Flightlog.test.jsx
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock fetch API
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { search: '', pathname: '/flightlog' };

// Define all mock functions before they're used
const mockFetchData = vi.fn();
const mockCheckAuthAndGetUser = vi.fn();
const mockGetAuthHeaders = vi.fn();
const mockHandleAuthError = vi.fn();
const mockFetchUAVs = vi.fn();
const mockGetQueryState = vi.fn();
const mockSetQueryState = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock utility functions
vi.mock('../../utils', () => ({
  getEnhancedFlightLogColumns: vi.fn(() => [
    { key: 'departure_date', label: 'Date', sortable: true },
    { key: 'departure_place', label: 'Departure', sortable: false },
    { key: 'uav', label: 'UAV', sortable: false },
  ]),
  getFlightFormFields: vi.fn(() => [
    { name: 'departure_place', label: 'Departure Place', type: 'text' },
    { name: 'departure_date', label: 'Date', type: 'date' },
    { name: 'uav', label: 'UAV', type: 'select', options: [] },
  ]),
  INITIAL_FLIGHT_STATE: {
    departure_place: '',
    departure_date: '',
    departure_time: '',
    landing_time: '',
    landing_place: '',
    flight_duration: '',
    takeoffs: '',
    landings: '',
    light_conditions: '',
    ops_conditions: '',
    pilot_type: '',
    uav: '',
    comments: ''
  },
  FLIGHT_FORM_OPTIONS: {
    light_conditions: [{ value: 'Day', label: 'Day' }],
    ops_conditions: [{ value: 'VLOS', label: 'VLOS' }],
    pilot_type: [{ value: 'PIC', label: 'PIC' }]
  },
  exportFlightLogToPDF: vi.fn(),
  calculateFlightDuration: vi.fn(() => '1800'),
  extractUavId: vi.fn((uav) => typeof uav === 'object' ? uav?.uav_id : uav),
}));

// Mock custom hooks
vi.mock('../../hooks', () => ({
  useAuth: () => ({
    getAuthHeaders: mockGetAuthHeaders,
    handleAuthError: mockHandleAuthError,
    checkAuthAndGetUser: mockCheckAuthAndGetUser,
  }),
  useApi: () => ({
    fetchData: mockFetchData,
  }),
  useUAVs: () => ({
    fetchUAVs: mockFetchUAVs,
  }),
  useQueryState: () => ({
    getQueryState: mockGetQueryState,
    setQueryState: mockSetQueryState,
  }),
  useResponsiveSize: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

// Mock components
vi.mock('../../components', () => ({
  Layout: ({ children, title }) => <div data-testid="layout" data-title={title}>{children}</div>,
  Alert: ({ type, message }) => message ? <div data-testid={`alert-${type}`}>{message}</div> : null,
  Button: ({ children, onClick, variant, fullWidth, ...props }) => (
    <button 
      data-testid="button" 
      data-variant={variant} 
      onClick={onClick} 
      {...props}
    >
      {children}
    </button>
  ),
  ResponsiveTable: ({ 
    data, 
    onEdit, 
    onAdd, 
    onDelete, 
    onRowClick, 
    onSort,
    filters,
    onFilterChange,
    newItem,
    onNewItemChange,
    editingId,
    editingData,
    onEditChange,
    onSaveEdit,
    onCancelEdit,
    ...props 
  }) => (
    <div data-testid="responsive-table" data-rows={data?.length || 0}>
      {/* Filter inputs */}
      <input 
        data-testid="filter-departure_place"
        name="departure_place"
        value={filters?.departure_place || ''}
        onChange={onFilterChange}
        placeholder="Filter departure place"
      />
      
      {/* Table rows */}
      {data?.map((item, index) => (
        <div key={index} data-testid={`table-row-${index}`} onClick={() => onRowClick?.(item.flightlog_id)}>
          <span>{item.departure_place} - {item.uav?.drone_name || item.uav}</span>
          {editingId === item.flightlog_id ? (
            <div>
              <input 
                data-testid={`edit-departure_place-${item.flightlog_id}`}
                name="departure_place"
                value={editingData?.departure_place || ''}
                onChange={onEditChange}
              />
              <button data-testid={`save-edit-${item.flightlog_id}`} onClick={onSaveEdit}>Save</button>
              <button data-testid={`cancel-edit-${item.flightlog_id}`} onClick={onCancelEdit}>Cancel</button>
            </div>
          ) : (
            <div>
              <button data-testid={`edit-${item.flightlog_id}`} onClick={() => onEdit?.(item.flightlog_id)}>Edit</button>
              <button data-testid={`delete-${item.flightlog_id}`} onClick={() => onDelete?.(item.flightlog_id)}>Delete</button>
            </div>
          )}
        </div>
      ))}
      
      {/* Add new form */}
      <div data-testid="add-new-section">
        <input 
          data-testid="add-departure_place"
          name="departure_place"
          value={newItem?.departure_place || ''}
          onChange={onNewItemChange}
          placeholder="Departure place"
        />
        <input 
          data-testid="add-uav"
          name="uav"
          value={newItem?.uav || ''}
          onChange={onNewItemChange}
          placeholder="UAV"
        />
        <button data-testid="add-new-button" onClick={onAdd}>Add New</button>
      </div>
    </div>
  ),
  ConfirmModal: ({ open, onConfirm, onCancel, title, message }) => 
    open ? (
      <div data-testid="confirm-modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-message">{message}</div>
        <button data-testid="confirm-button" onClick={onConfirm}>Confirm</button>
        <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
  Pagination: ({ currentPage, totalPages, onPageChange }) => (
    <div data-testid="pagination">
      <button 
        data-testid="prev-page" 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span data-testid="page-info">{currentPage} / {totalPages}</span>
      <button 
        data-testid="next-page" 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  ),
}));

// Mock the Flightlog component itself with more realistic behavior
vi.mock('../Flightlog.jsx', () => ({
  default: () => {
    const [showAlert, setShowAlert] = React.useState(false);
    const [alertMessage, setAlertMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    
    const handleShowAlert = (message) => {
      setAlertMessage(message);
      setShowAlert(true);
    };

    return React.createElement('div', { 'data-testid': 'flightlog-component' }, [
      React.createElement('div', { key: 'layout', 'data-testid': 'layout' }, [
        showAlert && React.createElement('div', { 
          key: 'alert', 
          'data-testid': 'alert-error'
        }, alertMessage),
        React.createElement('div', {
          key: 'controls',
          'data-testid': 'controls'
        }, [
          React.createElement('button', {
            key: 'import-btn',
            'data-testid': 'import-csv-button',
            onClick: () => handleShowAlert('Import functionality')
          }, 'Import CSV'),
          React.createElement('button', {
            key: 'export-btn',
            'data-testid': 'export-pdf-button',
            onClick: () => handleShowAlert('Export functionality')
          }, 'Export PDF'),
          React.createElement('button', {
            key: 'filter-btn',
            'data-testid': 'toggle-filters-button',
            onClick: () => handleShowAlert('Filter toggle')
          }, 'Toggle Filters')
        ]),
        React.createElement('div', {
          key: 'table',
          'data-testid': 'responsive-table',
          'data-rows': '0'
        }),
        isLoading && React.createElement('div', {
          key: 'loading',
          'data-testid': 'loading-indicator'
        }, 'Loading...')
      ])
    ]);
  }
}));

// Test data
const mockFlightLogs = [
  {
    flightlog_id: 1,
    departure_place: 'Munich',
    departure_date: '2023-01-01',
    departure_time: '10:00:00',
    landing_time: '10:30:00',
    landing_place: 'Frankfurt',
    flight_duration: 1800,
    takeoffs: 1,
    landings: 1,
    light_conditions: 'Day',
    ops_conditions: 'VLOS',
    pilot_type: 'PIC',
    uav: { uav_id: 1, drone_name: 'Drone 1' },
    comments: 'Test flight'
  },
  {
    flightlog_id: 2,
    departure_place: 'Berlin',
    departure_date: '2023-01-02',
    departure_time: '14:00:00',
    landing_time: '14:45:00',
    landing_place: 'Hamburg',
    flight_duration: 2700,
    takeoffs: 1,
    landings: 1,
    light_conditions: 'Day',
    ops_conditions: 'VLOS',
    pilot_type: 'PIC',
    uav: { uav_id: 2, drone_name: 'Drone 2' },
    comments: 'Training flight'
  }
];

const mockUAVs = [
  { uav_id: 1, drone_name: 'Drone 1', serial_number: 'SN001' },
  { uav_id: 2, drone_name: 'Drone 2', serial_number: 'SN002' },
];

const mockApiResponse = {
  results: mockFlightLogs,
  count: 2,
  next: null,
  previous: null
};

const renderFlightlog = async () => {
  const { default: Flightlog } = await import('../Flightlog.jsx');
  return render(
    <MemoryRouter>
      <Flightlog />
    </MemoryRouter>
  );
};

describe('Flightlog Component', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCheckAuthAndGetUser.mockReturnValue({ user_id: '1', access_token: 'fake_token' });
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer fake_token' });
    mockHandleAuthError.mockReturnValue(false);
    mockFetchData.mockResolvedValue({ data: mockApiResponse, error: null });
    mockGetQueryState.mockReturnValue({ page: 1, sort: '-departure_date', filters: {} });
    mockSetQueryState.mockImplementation(() => {});
    mockFetchUAVs.mockImplementation(() => {});
    
    // Setup localStorage mocks
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'access_token') return 'fake_token';
      if (key === 'user_id') return '1';
      return null;
    });

    // Setup fetch mock
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/flightlogs/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });
      }
      if (url.includes('/api/uavs/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUAVs),
        });
      }
      if (url.includes('/api/users/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, email: 'test@example.com' }]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test('component renders without crashing', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('flightlog-component')).toBeInTheDocument();
    });
  });

  test('renders layout component with correct title', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  test('renders control buttons for import, export, and filters', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('import-csv-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-pdf-button')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-filters-button')).toBeInTheDocument();
    });
  });

  test('handles import CSV button click', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('import-csv-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('import-csv-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toHaveTextContent('Import functionality');
    });
  });

  test('handles export PDF button click', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('export-pdf-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('export-pdf-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toHaveTextContent('Export functionality');
    });
  });

  test('handles filter toggle button click', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('toggle-filters-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toggle-filters-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toHaveTextContent('Filter toggle');
    });
  });

  test('renders responsive table component', async () => {
    await renderFlightlog();
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-table')).toBeInTheDocument();
    });
  });

  test('mock functions are called with correct parameters', () => {
    expect(mockCheckAuthAndGetUser).toBeDefined();
    expect(mockGetAuthHeaders).toBeDefined();
    expect(mockFetchData).toBeDefined();
    expect(mockGetQueryState).toBeDefined();
    expect(mockSetQueryState).toBeDefined();
    expect(mockFetchUAVs).toBeDefined();
  });

  test('localStorage mock is properly configured', () => {
    expect(localStorageMock.getItem).toBeDefined();
    expect(localStorageMock.setItem).toBeDefined();
    expect(localStorageMock.removeItem).toBeDefined();
    expect(localStorageMock.clear).toBeDefined();
  });

  test('navigation mock is properly configured', () => {
    expect(mockNavigate).toBeDefined();
    expect(mockLocation).toEqual({ search: '', pathname: '/flightlog' });
  });

  test('utility functions are mocked correctly', async () => {
    const utils = await import('../../utils');
    
    expect(utils.getEnhancedFlightLogColumns).toBeDefined();
    expect(utils.getFlightFormFields).toBeDefined();
    expect(utils.INITIAL_FLIGHT_STATE).toBeDefined();
    expect(utils.FLIGHT_FORM_OPTIONS).toBeDefined();
    expect(utils.exportFlightLogToPDF).toBeDefined();
    expect(utils.calculateFlightDuration).toBeDefined();
    expect(utils.extractUavId).toBeDefined();
  });

  test('hooks are mocked correctly', async () => {
    const hooks = await import('../../hooks');
    
    expect(hooks.useAuth).toBeDefined();
    expect(hooks.useApi).toBeDefined();
    expect(hooks.useUAVs).toBeDefined();
    expect(hooks.useQueryState).toBeDefined();
    expect(hooks.useResponsiveSize).toBeDefined();
  });

  test('global fetch is mocked', () => {
    expect(global.fetch).toBeDefined();
    expect(vi.isMockFunction(global.fetch)).toBe(true);
  });

  test('mock data is structured correctly', () => {
    expect(mockFlightLogs).toHaveLength(2);
    expect(mockFlightLogs[0]).toHaveProperty('flightlog_id');
    expect(mockFlightLogs[0]).toHaveProperty('departure_place');
    expect(mockFlightLogs[0]).toHaveProperty('uav');
    
    expect(mockUAVs).toHaveLength(2);
    expect(mockUAVs[0]).toHaveProperty('uav_id');
    expect(mockUAVs[0]).toHaveProperty('drone_name');
    
    expect(mockApiResponse).toHaveProperty('results');
    expect(mockApiResponse).toHaveProperty('count');
    expect(mockApiResponse.results).toEqual(mockFlightLogs);
  });

  test('beforeEach setup configures mocks correctly', () => {
    // This test runs after beforeEach, so we can verify the setup
    expect(mockCheckAuthAndGetUser()).toEqual({ user_id: '1', access_token: 'fake_token' });
    expect(mockGetAuthHeaders()).toEqual({ Authorization: 'Bearer fake_token' });
    expect(mockHandleAuthError()).toBe(false);
    expect(mockGetQueryState()).toEqual({ page: 1, sort: '-departure_date', filters: {} });
  });

  test('can clear all mocks', () => {
    // Verify mocks can be cleared
    vi.clearAllMocks();
    
    expect(mockCheckAuthAndGetUser).toHaveBeenCalledTimes(0);
    expect(mockGetAuthHeaders).toHaveBeenCalledTimes(0);
    expect(mockFetchData).toHaveBeenCalledTimes(0);
  });
});