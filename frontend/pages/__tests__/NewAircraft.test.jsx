import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
const mockParams = {};

// Define all mock functions before they're used
const mockFetchData = vi.fn();
const mockCheckAuthAndGetUser = vi.fn();
const mockGetAuthHeaders = vi.fn();
const mockHandleAuthError = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

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
}));

// Mock components
vi.mock('../../components', () => ({
  Layout: ({ children, title }) => <div data-testid="layout" data-title={title}>{children}</div>,
  Alert: ({ type, message }) => <div data-testid={`alert-${type}`}>{message}</div>,
  Loading: ({ message }) => <div data-testid="loading">{message}</div>,
  ConfirmModal: ({ open, onConfirm, onCancel, title, message, confirmText, cancelText }) => 
    open ? (
      <div data-testid="confirm-modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-message">{message}</div>
        <button data-testid="confirm-button" onClick={onConfirm}>{confirmText}</button>
        {cancelText && <button data-testid="cancel-button" onClick={onCancel}>{cancelText}</button>}
      </div>
    ) : null,
  AircraftForm: ({ 
    formData, 
    handleChange, 
    handleSubmit, 
    handleDelete, 
    handleSetInactive, 
    handleToggleActive,
    handleSetTodayMaintDates,
    isEditMode,
    canDelete,
    handleBackToSettings
  }) => (
    <form data-testid="aircraft-form" onSubmit={handleSubmit}>
      <input 
        data-testid="drone-name-input"
        name="drone_name"
        value={formData.drone_name}
        onChange={handleChange}
        placeholder="Drone Name"
      />
      <input 
        data-testid="type-input"
        name="type"
        value={formData.type}
        onChange={handleChange}
        placeholder="Type"
      />
      <input 
        data-testid="motors-input"
        name="motors"
        type="number"
        value={formData.motors}
        onChange={handleChange}
        placeholder="Motors"
      />
      <select 
        data-testid="motor-type-select"
        name="motor_type"
        value={formData.motor_type}
        onChange={handleChange}
      >
        <option value="Electric">Electric</option>
        <option value="Piston">Piston</option>
      </select>
      <button type="submit" data-testid="submit-button">
        {isEditMode ? 'Update Aircraft' : 'Save Aircraft'}
      </button>
      {isEditMode && (
        <>
          <button type="button" onClick={handleBackToSettings} data-testid="back-button">
            Back to Aircraft Settings
          </button>
          {canDelete && (
            <button type="button" onClick={handleDelete} data-testid="delete-button">
              Delete Aircraft
            </button>
          )}
          {!canDelete && (
            <button type="button" onClick={handleSetInactive} data-testid="set-inactive-button">
              Set Inactive
            </button>
          )}
          {formData.is_active === false && (
            <button type="button" onClick={handleToggleActive} data-testid="reactivate-button">
              Reactivate Aircraft
            </button>
          )}
        </>
      )}
      <button type="button" onClick={handleSetTodayMaintDates} data-testid="set-today-button">
        Set Today
      </button>
    </form>
  ),
}));

// Test data
const mockAircraftData = {
  uav_id: 1,
  drone_name: 'Test Drone',
  manufacturer: 'DJI',
  type: 'Quad',
  motors: 4,
  motor_type: 'Electric',
  video: 'Digital',
  video_system: 'DJI O3',
  firmware: 'Betaflight',
  firmware_version: '4.5.0',
  esc: 'Test ESC',
  esc_firmware: 'Test ESC FW',
  receiver: 'Test RX',
  receiver_firmware: 'Test RX FW',
  flight_controller: 'Test FC',
  registration_number: 'REG001',
  serial_number: 'SN001',
  gps: 1,
  mag: 1,
  baro: 1,
  gyro: 1,
  acc: 1,
  props_maint_date: '2024-01-01',
  motor_maint_date: '2024-01-01',
  frame_maint_date: '2024-01-01',
  props_reminder_date: '2025-01-01',
  motor_reminder_date: '2025-01-01',
  frame_reminder_date: '2025-01-01',
  props_reminder_active: true,
  motor_reminder_active: true,
  frame_reminder_active: true,
  is_active: true
};

const mockUserSettings = {
  reminder_months_before: 3
};

const renderNewAircraft = async (routePath = '/newaircraft') => {
  const { default: NewAircraft } = await import('../NewAircraft.jsx');
  let renderResult;
  await act(async () => {
    renderResult = render(
      <MemoryRouter initialEntries={[routePath]}>
        <NewAircraft />
      </MemoryRouter>
    );
  });
  return renderResult;
};

describe('NewAircraft Component', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCheckAuthAndGetUser.mockReturnValue({ user_id: '1', access_token: 'fake_token' });
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer fake_token' });
    mockHandleAuthError.mockReturnValue(false);
    
    // Setup localStorage mocks
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'access_token') return 'fake_token';
      if (key === 'user_id') return '1';
      return null;
    });

    // Set environment variable
    import.meta.env = { VITE_API_URL: 'http://localhost:8000' };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      mockParams.uavId = undefined;
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });
    });

    test('renders create mode without crashing', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'New Aircraft');
      });
    });

    test('displays aircraft form with default values', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('aircraft-form')).toBeInTheDocument();
        expect(screen.getByTestId('drone-name-input')).toHaveValue('');
        expect(screen.getByTestId('type-input')).toHaveValue('Quad');
        expect(screen.getByTestId('motors-input')).toHaveValue(4);
        expect(screen.getByTestId('motor-type-select')).toHaveValue('Electric');
      });
    });

    test('handles form input changes', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('drone-name-input')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.change(screen.getByTestId('drone-name-input'), {
          target: { name: 'drone_name', value: 'New Test Drone' }
        });
      });

      expect(screen.getByTestId('drone-name-input')).toHaveValue('New Test Drone');
    });

    test('handles successful aircraft creation', async () => {
      mockFetchData.mockImplementation((endpoint, options, method, payload) => {
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        if (endpoint === '/api/uavs/' && method === 'POST') {
          return Promise.resolve({ 
            data: { uav_id: 123, ...payload }, 
            error: null 
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('aircraft-form')).toBeInTheDocument();
      });

      // Fill required fields
      await act(async () => {
        fireEvent.change(screen.getByTestId('drone-name-input'), {
          target: { name: 'drone_name', value: 'Test Drone' }
        });
        fireEvent.change(screen.getByTestId('type-input'), {
          target: { name: 'type', value: 'Quad' }
        });
        fireEvent.change(screen.getByTestId('motors-input'), {
          target: { name: 'motors', value: '4' }
        });
      });

      await act(async () => {
        fireEvent.submit(screen.getByTestId('aircraft-form'));
      });

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          '/api/uavs/',
          {},
          'POST',
          expect.objectContaining({
            drone_name: 'Test Drone',
            type: 'Quad',
            motors: 4,
            motor_type: 'Electric',
            user: '1'
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('alert-success')).toBeInTheDocument();
        expect(screen.getByText(/Aircraft successfully registered/)).toBeInTheDocument();
      });
    });

    test('handles form validation errors', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('aircraft-form')).toBeInTheDocument();
      });

      // Submit without required fields
      await act(async () => {
        fireEvent.submit(screen.getByTestId('aircraft-form'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('alert-error')).toBeInTheDocument();
        expect(screen.getByText(/Please fill in all required fields/)).toBeInTheDocument();
      });
    });

    test('handles API errors during creation', async () => {
      mockFetchData.mockImplementation((endpoint, options, method) => {
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        if (endpoint === '/api/uavs/' && method === 'POST') {
          return Promise.resolve({ 
            data: { drone_name: ['Aircraft with this name already exists.'] }, 
            error: 'Validation failed' 
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      // Fill and submit form
      await act(async () => {
        fireEvent.change(screen.getByTestId('drone-name-input'), {
          target: { name: 'drone_name', value: 'Duplicate Name' }
        });
        fireEvent.submit(screen.getByTestId('aircraft-form'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('alert-error')).toBeInTheDocument();
        expect(screen.getByText(/drone_name: Aircraft with this name already exists/)).toBeInTheDocument();
      });
    });

    test('handles setting today maintenance dates', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('set-today-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('set-today-button'));
      });

      // Maintenance dates should be set to today (tested through form data changes)
      // This is handled by the AircraftForm component mock
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockParams.uavId = '1';
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ data: mockAircraftData, error: null });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });
    });

    test('renders edit mode with loading state', async () => {
      // Mock to never resolve to keep loading state
      mockFetchData.mockImplementation(() => new Promise(() => {}));
      
      await act(async () => {
        await renderNewAircraft();
      });
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading aircraft data...')).toBeInTheDocument();
    });

    test('loads and displays existing aircraft data', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith('/api/uavs/1/');
        expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'Edit Aircraft');
        expect(screen.getByTestId('aircraft-form')).toBeInTheDocument();
      });
    });

    test('handles successful aircraft update', async () => {
      mockFetchData.mockImplementation((endpoint, options, method, payload) => {
        if (endpoint.includes('/api/uavs/1/') && method === 'PUT') {
          return Promise.resolve({ data: { ...mockAircraftData, ...payload }, error: null });
        }
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ data: mockAircraftData, error: null });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('aircraft-form')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.change(screen.getByTestId('drone-name-input'), {
          target: { name: 'drone_name', value: 'Updated Drone Name' }
        });
        fireEvent.submit(screen.getByTestId('aircraft-form'));
      });

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          '/api/uavs/1/',
          {},
          'PUT',
          expect.objectContaining({
            drone_name: 'Updated Drone Name'
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('alert-success')).toBeInTheDocument();
        expect(screen.getByText('Aircraft successfully updated!')).toBeInTheDocument();
      });
    });

    test('displays delete button when aircraft can be deleted', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });
    });

    test('displays set inactive button when aircraft cannot be deleted', async () => {
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ data: mockAircraftData, error: null });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [{ flightlog_id: 1 }] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('set-inactive-button')).toBeInTheDocument();
        expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
      });
    });

    test('handles delete confirmation', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Aircraft');
      });

      mockFetchData.mockImplementation((endpoint, options, method) => {
        if (endpoint.includes('/api/uavs/1/') && method === 'DELETE') {
          return Promise.resolve({ data: {}, error: null });
        }
        return Promise.resolve({ data: mockAircraftData, error: null });
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-button'));
      });

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith('/api/uavs/1/', {}, 'DELETE');
      });
    });

    test('handles set inactive confirmation', async () => {
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ data: mockAircraftData, error: null });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [{ flightlog_id: 1 }] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('set-inactive-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('set-inactive-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Mark Aircraft as Inactive');
      });
    });

    test('displays reactivate button for inactive aircraft', async () => {
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ 
            data: { ...mockAircraftData, is_active: false }, 
            error: null 
          });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
      });
    });

    test('handles back to settings navigation', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('back-button'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/aircraftsettings/1');
    });

    test('displays inactive aircraft warning', async () => {
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ 
            data: { ...mockAircraftData, is_active: false }, 
            error: null 
          });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByText(/This aircraft is inactive/)).toBeInTheDocument();
        expect(screen.getByText(/You must reactivate it to make changes/)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication', () => {
    test('handles authentication failure', async () => {
      mockCheckAuthAndGetUser.mockReturnValue(null);

      await act(async () => {
        await renderNewAircraft();
      });
      
      // Component should handle auth failure gracefully
      expect(mockCheckAuthAndGetUser).toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    beforeEach(() => {
      mockParams.uavId = '1';
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/uavs/1/')) {
          return Promise.resolve({ data: mockAircraftData, error: null });
        }
        if (endpoint.includes('/api/flightlogs/?uav=1')) {
          return Promise.resolve({ data: { results: [] }, error: null });
        }
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [mockUserSettings], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });
    });

    test('handles modal cancellation', async () => {
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('cancel-button'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Settings', () => {
    test('loads user settings for reminder months', async () => {
      mockParams.uavId = undefined;
      
      await act(async () => {
        await renderNewAircraft();
      });
      
      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith('/api/user-settings/');
      });
    });

    test('handles missing user settings gracefully', async () => {
      mockParams.uavId = undefined;
      mockFetchData.mockImplementation((endpoint) => {
        if (endpoint.includes('/api/user-settings/')) {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      });
      
      await act(async () => {
        await renderNewAircraft();
      });
      
      // Should not crash and use default values
      await waitFor(() => {
        expect(screen.getByTestId('aircraft-form')).toBeInTheDocument();
      });
    });
  });
});
