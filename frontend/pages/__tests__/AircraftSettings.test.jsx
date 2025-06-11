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
const mockParams = { uavId: '1' };

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

// Mock utility functions
vi.mock('../../utils', () => ({
  maintenanceLogTableColumns: [
    { header: 'Date', accessor: 'event_date' },
    { header: 'Description', accessor: 'description' },
    { header: 'File', accessor: 'file' },
  ],
  compareConfigFiles: vi.fn(),
  na: vi.fn((value) => value || 'N/A'),
  formatFlightHours: vi.fn((value) => value ? `${value}h` : 'N/A'),
  formatDate: vi.fn((value) => value || 'N/A'),
  extractUavId: vi.fn((uav) => typeof uav === 'object' ? uav?.uav_id : parseInt(uav)),
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
}));

// Mock components
vi.mock('../../components', () => ({
  Layout: ({ children }) => <div data-testid="layout">{children}</div>,
  Button: ({ children, onClick, variant, className, ...props }) => (
    <button 
      data-testid="button" 
      data-variant={variant}
      className={className}
      onClick={onClick} 
      {...props}
    >
      {children}
    </button>
  ),
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
  CompareModal: ({ show, onClose, data }) => 
    show ? (
      <div data-testid="compare-modal">
        <button data-testid="close-compare" onClick={onClose}>Close</button>
        {data && <div data-testid="comparison-data">{JSON.stringify(data)}</div>}
      </div>
    ) : null,
  ArrowButton: ({ direction, onClick, title, disabled, ...props }) => (
    <button 
      data-testid={`arrow-${direction}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      {...props}
    >
      {direction === 'left' ? '←' : '→'}
    </button>
  ),
  ConfigFileTable: ({ 
    tableType, 
    configFiles = [], 
    logs = [],
    selectedConfigs = [],
    onConfigSelection,
    onDeleteConfig,
    configFile,
    configFormErrors,
    onConfigChange,
    onAddConfig,
    onEditLog,
    onSaveEdit,
    onCancelEdit,
    onDeleteLog,
    onAddLog,
    onCompareFiles,
    ...props 
  }) => (
    <div data-testid={`config-file-table-${tableType}`}>
      {tableType === 'config' ? (
        <div>
          <h3>Configuration Files</h3>
          {configFiles.map((config, index) => (
            <div key={index} data-testid={`config-${config.config_id}`}>
              <input 
                type="checkbox"
                checked={selectedConfigs.includes(config.config_id)}
                onChange={() => onConfigSelection(config.config_id)}
                data-testid={`select-config-${config.config_id}`}
              />
              <span>{config.name}</span>
              <button 
                onClick={() => onDeleteConfig(config.config_id)}
                data-testid={`delete-config-${config.config_id}`}
              >
                Delete
              </button>
            </div>
          ))}
          <input 
            name="name"
            value={configFile?.name || ''}
            onChange={onConfigChange}
            data-testid="config-name-input"
            placeholder="Configuration name"
          />
          <input 
            name="file"
            type="file"
            onChange={onConfigChange}
            data-testid="config-file-input"
          />
          <button onClick={onAddConfig} data-testid="add-config">Add Config</button>
          {selectedConfigs.length === 2 && (
            <button onClick={onCompareFiles} data-testid="compare-files">Compare Files</button>
          )}
        </div>
      ) : (
        <div>
          <h3>Maintenance Logs</h3>
          {logs.map((log, index) => (
            <div key={index} data-testid={`log-${log.maintenance_id}`}>
              <span>{log.description}</span>
              <button 
                onClick={() => onEditLog(log.maintenance_id)}
                data-testid={`edit-log-${log.maintenance_id}`}
              >
                Edit
              </button>
              <button 
                onClick={() => onDeleteLog(log.maintenance_id)}
                data-testid={`delete-log-${log.maintenance_id}`}
              >
                Delete
              </button>
            </div>
          ))}
          <button onClick={onAddLog} data-testid="add-log">Add Log</button>
        </div>
      )}
    </div>
  ),
  InfoRow: ({ label, value }) => (
    <div data-testid="info-row">
      <span data-testid="info-label">{label}</span>
      <span data-testid="info-value">{value}</span>
    </div>
  ),
  GridInfo: ({ label, value }) => (
    <div data-testid="grid-info">
      <span>{label}: {value}</span>
    </div>
  ),
  InfoSection: ({ title, children, className }) => (
    <div data-testid="info-section" className={className}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

// Test data
const mockAircraft = {
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
  total_flights: 10,
  total_flight_time: 120,
  total_takeoffs: 10,
  total_landings: 10,
  props_maint_date: '2024-01-01',
  motor_maint_date: '2024-01-01',
  frame_maint_date: '2024-01-01',
  next_props_maint_date: '2024-06-01',
  next_motor_maint_date: '2024-06-01',
  next_frame_maint_date: '2024-06-01',
  maintenance_logs: [
    {
      maintenance_id: 1,
      event_date: '2024-01-01',
      description: 'Test maintenance',
      file: 'test.pdf'
    }
  ]
};

const mockConfigFiles = [
  {
    config_id: 1,
    name: 'Config 1',
    file: 'config1.txt',
    upload_date: '2024-01-01'
  },
  {
    config_id: 2,
    name: 'Config 2',
    file: 'config2.txt',
    upload_date: '2024-01-02'
  }
];

const mockUavMeta = {
  minId: 1,
  maxId: 5
};

const mockReminders = [
  {
    uav: 1,
    component: 'props',
    next_maintenance: '2024-06-01'
  }
];

const renderAircraftSettings = async () => {
  const { default: AircraftSettings } = await import('../AircraftSettings.jsx');
  let renderResult;
  await act(async () => {
    renderResult = render(
      <MemoryRouter>
        <AircraftSettings />
      </MemoryRouter>
    );
  });
  return renderResult;
};

describe('AircraftSettings Component', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCheckAuthAndGetUser.mockReturnValue({ user_id: '1', access_token: 'fake_token' });
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer fake_token' });
    mockHandleAuthError.mockReturnValue(false);
    
    // Setup mock fetch responses
    mockFetchData.mockImplementation((endpoint) => {
      if (endpoint.includes('/api/uavs/1/')) {
        return Promise.resolve({ data: mockAircraft, error: null });
      }
      if (endpoint.includes('/api/maintenance/?uav=1')) {
        return Promise.resolve({ data: mockAircraft.maintenance_logs, error: null });
      }
      if (endpoint.includes('/api/maintenance-reminders/')) {
        return Promise.resolve({ data: mockReminders, error: null });
      }
      if (endpoint.includes('/api/uav-configs/?uav=1')) {
        return Promise.resolve({ data: mockConfigFiles, error: null });
      }
      if (endpoint.includes('/api/uavs/meta/')) {
        return Promise.resolve({ data: mockUavMeta, error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });
    
    // Setup localStorage mocks
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'access_token') return 'fake_token';
      if (key === 'user_id') return '1';
      return null;
    });

    // Setup fetch mock
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/uav-configs/') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ config_id: 3, name: 'New Config' }),
        });
      }
      if (url.includes('/api/maintenance/') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ maintenance_id: 2 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Set environment variable
    import.meta.env = { VITE_API_URL: 'http://localhost:8000' };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test('component renders without crashing', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', async () => {
    mockFetchData.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    await act(async () => {
      await renderAircraftSettings();
    });
    
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('fetches and displays aircraft data', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith('/api/uavs/1/');
      expect(mockFetchData).toHaveBeenCalledWith('/api/maintenance/?uav=1');
      expect(mockFetchData).toHaveBeenCalledWith('/api/maintenance-reminders/');
      expect(mockFetchData).toHaveBeenCalledWith('/api/uav-configs/?uav=1');
      expect(mockFetchData).toHaveBeenCalledWith('/api/uavs/meta/');
    });
  });

  test('displays aircraft information sections', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByText('General Information')).toBeInTheDocument();
      expect(screen.getByText('Motors')).toBeInTheDocument();
      expect(screen.getByText('Video Information')).toBeInTheDocument();
      expect(screen.getByText('Firmware and Components')).toBeInTheDocument();
      expect(screen.getByText('Registration and Serial')).toBeInTheDocument();
      expect(screen.getByText('Sensors')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Information')).toBeInTheDocument();
    });
  });

  test('displays navigation arrows', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('arrow-left')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-right')).toBeInTheDocument();
    });
  });

  test('handles next aircraft navigation', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      const nextButton = screen.getByTestId('arrow-right');
      expect(nextButton).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('arrow-right'));
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/aircraftsettings/2');
  });

  test('displays modify aircraft button', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Modify Aircraft')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Modify Aircraft'));
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/editaircraft/1');
  });

  test('displays configuration files table', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('config-file-table-config')).toBeInTheDocument();
      expect(screen.getByText('Configuration Files')).toBeInTheDocument();
    });
  });

  test('displays maintenance logs table', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('config-file-table-logs')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Logs')).toBeInTheDocument();
    });
  });

  test('handles config file selection for comparison', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('select-config-1')).toBeInTheDocument();
      expect(screen.getByTestId('select-config-2')).toBeInTheDocument();
    });

    await act(async () => {
      // Select first config
      fireEvent.click(screen.getByTestId('select-config-1'));
      
      // Select second config
      fireEvent.click(screen.getByTestId('select-config-2'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('compare-files')).toBeInTheDocument();
    });
  });

  test('handles adding new config file', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('config-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('config-file-input')).toBeInTheDocument();
      expect(screen.getByTestId('add-config')).toBeInTheDocument();
    });

    await act(async () => {
      // Fill in form
      fireEvent.change(screen.getByTestId('config-name-input'), { target: { value: 'New Config', name: 'name' } });
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(screen.getByTestId('config-file-input'), { target: { files: [file], name: 'file' } });

      fireEvent.click(screen.getByTestId('add-config'));
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/uav-configs/'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  test('handles editing maintenance log', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-log-1')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-log-1'));
    });
    
    // Edit mode should be triggered
    // This would show edit form in real component
  });

  test('handles deleting maintenance log', async () => {
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('delete-log-1')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-log-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      expect(screen.getByText('Confirm Delete Log')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });
    
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith('/api/maintenance/1/', {}, 'DELETE');
    });
  });

  test('handles API errors gracefully', async () => {
    mockFetchData.mockResolvedValue({ data: null, error: 'API Error' });
    
    await act(async () => {
      await renderAircraftSettings();
    });
    
    // Component should handle error without crashing
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  test('utility functions are called correctly', async () => {
    const utils = await import('../../utils');
    
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      expect(utils.extractUavId).toHaveBeenCalledWith('1');
      expect(utils.na).toHaveBeenCalled();
      expect(utils.formatFlightHours).toHaveBeenCalled();
      expect(utils.formatDate).toHaveBeenCalled();
    });
  });

  test('navigation arrows are disabled appropriately', async () => {
    // Test with uavId at minimum
    mockParams.uavId = '1';
    
    await act(async () => {
      await renderAircraftSettings();
    });
    
    await waitFor(() => {
      const prevButton = screen.getByTestId('arrow-left');
      const nextButton = screen.getByTestId('arrow-right');
      
      // Previous should be disabled at minimum ID
      expect(prevButton).toBeDisabled();
      // Next should be enabled (maxId = 5)
      expect(nextButton).not.toBeDisabled();
    });
  });
});
