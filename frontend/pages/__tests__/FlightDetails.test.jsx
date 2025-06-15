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
const mockParams = { flightId: '1' };
const mockLocation = { search: '' };

// Define all mock functions before they're used
const mockFetchData = vi.fn();
const mockCheckAuthAndGetUser = vi.fn();
const mockGetAuthHeaders = vi.fn();
const mockHandleAuthError = vi.fn();

// Mock GPS animation hooks
const mockUseGpsAnimation = {
  isPlaying: false,
  currentPointIndex: 0,
  animationSpeed: 1,
  resetTrigger: 0,
  startAnimation: vi.fn(),
  pauseAnimation: vi.fn(),
  resetAnimation: vi.fn(),
  changeSpeed: vi.fn(),
  handlePositionChange: vi.fn(),
  setCurrentPointIndex: vi.fn(),
};

const mockUseResponsiveSize = vi.fn().mockReturnValue(200);
const mockUseAccordionState = {
  state: { instruments: false, signal: false, sticks: false, telemetry: false },
  toggle: vi.fn(),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useLocation: () => mockLocation,
  };
});

// Mock Leaflet and react-leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: { _getIconUrl: undefined },
        mergeOptions: vi.fn(),
      },
    },
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => (
    <div data-testid="map-container" {...props}>{children}</div>
  ),
  TileLayer: (props) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, ...props }) => (
    <div data-testid="marker" {...props}>{children}</div>
  ),
  Popup: ({ children, ...props }) => (
    <div data-testid="popup" {...props}>{children}</div>
  ),
  Polyline: (props) => <div data-testid="polyline" {...props} />,
}));

// Mock utility functions
vi.mock('../../utils', () => ({
  takeoffIcon: { iconUrl: 'takeoff.png' },
  landingIcon: { iconUrl: 'landing.png' },
  getFlightCoordinates: vi.fn(() => ({ 
    departureCoords: [47.3769, 8.5417], 
    landingCoords: [47.3769, 8.5417] 
  })),
  getMapBounds: vi.fn(() => [[47.3769, 8.5417], [47.3769, 8.5417]]),
  parseGPSFile: vi.fn(() => Promise.resolve({
    trackPoints: [[47.3769, 8.5417], [47.3780, 8.5420]],
    gpsData: [
      { latitude: 47.3769, longitude: 8.5417, altitude: 100, speed: 10 },
      { latitude: 47.3780, longitude: 8.5420, altitude: 105, speed: 12 }
    ]
  })),
  calculateGpsStatistics: vi.fn(() => ({
    maxAltitude: 105,
    minAltitude: 100,
    maxSpeed: 12,
    minSpeed: 10,
    maxVerticalSpeed: 5,
    minVerticalSpeed: -2,
    maxSatellites: 12,
    minSatellites: 8
  })),
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
  useGpsAnimation: () => mockUseGpsAnimation,
  useResponsiveSize: mockUseResponsiveSize,
  useAccordionState: () => mockUseAccordionState,
}));

// Mock components
vi.mock('../../components', () => ({
  Layout: ({ children }) => <div data-testid="layout">{children}</div>,
  Loading: ({ message }) => <div data-testid="loading">{message}</div>,
  ConfirmModal: ({ open, onConfirm, onCancel, title, message }) => 
    open ? (
      <div data-testid="confirm-modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-message">{message}</div>
        <button data-testid="confirm-button" onClick={onConfirm}>Delete</button>
        <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
  Button: ({ children, onClick, variant, disabled, ...props }) => (
    <button 
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  Alert: ({ type, message }) => (
    <div data-testid="alert" data-type={type}>{message}</div>
  ),
  FlightInfoCard: ({ flight, hasGpsTrack }) => (
    <div data-testid="flight-info-card" data-has-gps={hasGpsTrack}>
      {flight?.uav?.drone_name || 'Unknown'}
    </div>
  ),
  AnimatedMarker: (props) => <div data-testid="animated-marker" {...props} />,
  GpsAnimationControls: ({ 
    isPlaying, 
    startAnimation, 
    pauseAnimation, 
    resetAnimation,
    onPositionChange 
  }) => (
    <div data-testid="gps-animation-controls">
      <button data-testid="play-button" onClick={startAnimation}>Play</button>
      <button data-testid="pause-button" onClick={pauseAnimation}>Pause</button>
      <button data-testid="reset-button" onClick={resetAnimation}>Reset</button>
      <input data-testid="position-slider" onChange={onPositionChange} />
    </div>
  ),
  ArrowButton: ({ direction, onClick, title, disabled }) => (
    <button 
      data-testid={`arrow-${direction}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {direction === 'left' ? '←' : '→'}
    </button>
  ),
  AirspeedIndicator: ({ airspeed }) => (
    <div data-testid="airspeed-indicator">{airspeed}</div>
  ),
  AttitudeIndicator: ({ pitch, roll }) => (
    <div data-testid="attitude-indicator">{pitch},{roll}</div>
  ),
  AltitudeIndicator: ({ altitude }) => (
    <div data-testid="altitude-indicator">{altitude}</div>
  ),
  VerticalSpeedIndicator: ({ verticalSpeed }) => (
    <div data-testid="vertical-speed-indicator">{verticalSpeed}</div>
  ),
  CompassIndicator: ({ heading }) => (
    <div data-testid="compass-indicator">{heading}</div>
  ),
  TurnCoordinator: ({ turnRate }) => (
    <div data-testid="turn-coordinator">{turnRate}</div>
  ),
  ThrottleYawStick: ({ throttle, yaw }) => (
    <div data-testid="throttle-yaw-stick">{throttle},{yaw}</div>
  ),
  ElevatorAileronStick: ({ elevator, aileron }) => (
    <div data-testid="elevator-aileron-stick">{elevator},{aileron}</div>
  ),
  SignalStrengthIndicator: ({ receiver_quality, transmitter_quality }) => (
    <div data-testid="signal-strength-indicator">{receiver_quality},{transmitter_quality}</div>
  ),
  ReceiverBatteryIndicator: ({ value }) => (
    <div data-testid="receiver-battery-indicator">{value}</div>
  ),
  CapacityIndicator: ({ value }) => (
    <div data-testid="capacity-indicator">{value}</div>
  ),
  CurrentIndicator: ({ value }) => (
    <div data-testid="current-indicator">{value}</div>
  ),
  DataPanel: ({ title, items }) => (
    <div data-testid="data-panel">
      <h4>{title}</h4>
      {items?.map((item, index) => (
        <div key={index}>{item.label}: {item.value}</div>
      ))}
    </div>
  ),
  AccordionPanel: ({ title, isOpen, toggleOpen, children }) => (
    <div data-testid="accordion-panel">
      <button data-testid="accordion-toggle" onClick={toggleOpen}>
        {title} {isOpen ? '↑' : '↓'}
      </button>
      {isOpen && <div data-testid="accordion-content">{children}</div>}
    </div>
  ),
}));

// Test data
const mockFlight = {
  flightlog_id: 1,
  departure_place: 'Zurich Airport',
  departure_date: '2024-01-15',
  departure_time: '10:30:00',
  landing_place: 'Zurich Airport',
  landing_time: '11:15:00',
  flight_duration: 2700, // 45 minutes in seconds
  takeoffs: 1,
  landings: 1,
  light_conditions: 'Day',
  ops_conditions: 'VLOS',
  pilot_type: 'PIC',
  comments: 'Test flight',
  uav: {
    uav_id: 1,
    drone_name: 'Test Drone',
    manufacturer: 'DJI',
    type: 'Quad'
  }
};

const mockGpsData = [
  {
    latitude: 47.3769,
    longitude: 8.5417,
    altitude: 100,
    speed: 10,
    pitch: 5,
    roll: -2,
    yaw: 180,
    throttle: 512,
    aileron: 100,
    elevator: -50,
    rudder: 25,
    receiver_battery: 7.4,
    current: 2.5,
    capacity: 1200,
    receiver_quality: 85,
    transmitter_quality: 90,
    num_sat: 10,
    vertical_speed: 1.5,
    ground_course: 90,
    timestamp: 1642248600
  },
  {
    latitude: 47.3780,
    longitude: 8.5420,
    altitude: 105,
    speed: 12,
    pitch: 3,
    roll: 1,
    yaw: 185,
    throttle: 600,
    aileron: 150,
    elevator: -25,
    rudder: 0,
    receiver_battery: 7.3,
    current: 3.0,
    capacity: 1180,
    receiver_quality: 88,
    transmitter_quality: 92,
    num_sat: 11,
    vertical_speed: 2.0,
    ground_course: 95,
    timestamp: 1642248601
  }
];

// orderedIds: [3,2,1] => flightId=1 is the last (Index 2), flightId=2 is middle (Index 1), flightId=3 is first (Index 0)
const mockFlightMeta = {
  minId: 1,
  maxId: 3,
  orderedIds: [3, 2, 1]
};

const renderFlightDetails = async () => {
  const { default: FlightDetails } = await import('../FlightDetails.jsx');
  let renderResult;
  await act(async () => {
    renderResult = render(
      <MemoryRouter>
        <FlightDetails />
      </MemoryRouter>
    );
  });
  return renderResult;
};

describe('FlightDetails Component', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCheckAuthAndGetUser.mockReturnValue({ user_id: '1', access_token: 'fake_token' });
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer fake_token' });
    mockHandleAuthError.mockReturnValue(false);
    
    // Setup mock fetch responses
    mockFetchData.mockImplementation((endpoint) => {
      if (endpoint.includes('/api/flightlogs/1/')) {
        return Promise.resolve({ data: mockFlight, error: null });
      }
      if (endpoint.includes('/api/uavs/1/')) {
        return Promise.resolve({ data: mockFlight.uav, error: null });
      }
      if (endpoint.includes('/api/flightlogs/1/gps/')) {
        return Promise.resolve({ data: [], error: null }); // Default to no GPS data
      }
      if (endpoint.includes('/api/flightlogs/meta/')) {
        return Promise.resolve({ data: mockFlightMeta, error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });
    
    // Setup localStorage mocks
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'access_token') return 'fake_token';
      if (key === 'user_id') return '1';
      return null;
    });

    // Setup fetch mock for GPS operations
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/flightlogs/1/gps/') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url.includes('/api/flightlogs/1/gps/') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
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
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', async () => {
    mockFetchData.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    await act(async () => {
      await renderFlightDetails();
    });
    
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByText('Loading flight details...')).toBeInTheDocument();
  });

  test('fetches and displays flight data', async () => {
    await act(async () => {
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith('/api/flightlogs/1/', expect.any(Object));
      expect(mockFetchData).toHaveBeenCalledWith('/api/uavs/1/', expect.any(Object));
      expect(mockFetchData).toHaveBeenCalledWith('/api/flightlogs/1/gps/', expect.any(Object));
      expect(mockFetchData).toHaveBeenCalledWith('/api/flightlogs/meta/');
    });
  });

  test('displays flight title without aircraft name when no UAV data', async () => {
    // Set mockFlight without uav data
    const flightWithoutUav = { ...mockFlight, uav: null };
    mockFetchData.mockImplementation((endpoint) => {
      if (endpoint.includes('/api/flightlogs/1/')) {
        return Promise.resolve({ data: flightWithoutUav, error: null });
      }
      if (endpoint.includes('/api/flightlogs/meta/')) {
        return Promise.resolve({ data: mockFlightMeta, error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });
    
    await act(async () => {
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Flight Details')).toBeInTheDocument();
    });
  });

  test('displays navigation arrows', async () => {
    await act(async () => {
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('arrow-left')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-right')).toBeInTheDocument();
    });
  });

  test('handles next flight navigation', async () => {
    // orderedIds: [3,2,1], flightId=2 (Index 1), left arrow navigates to orderedIds[0]=3
    mockParams.flightId = '2';
    await act(async () => {
      await renderFlightDetails();
    });

    await waitFor(() => {
      const nextButton = screen.getByTestId('arrow-left'); // left arrow = next flight
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('arrow-left'));
    });

    // next flight from index 1 is index 0 (flightId=3)
    expect(mockNavigate).toHaveBeenCalledWith('/flightdetails/3');
  });

  test('handles previous flight navigation', async () => {
    // orderedIds: [3,2,1], flightId=2 (Index 1), right arrow navigates to orderedIds[2]=1
    mockParams.flightId = '2';
    await act(async () => {
      await renderFlightDetails();
    });

    await waitFor(() => {
      const prevButton = screen.getByTestId('arrow-right'); // right arrow = previous flight
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('arrow-right'));
    });

    // previous flight from index 1 is index 2 (flightId=1)
    expect(mockNavigate).toHaveBeenCalledWith('/flightdetails/1');
  });

  test('displays flight info card', async () => {
    await act(async () => {
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('flight-info-card')).toBeInTheDocument();
    });
  });

  test('displays import GPS button when no GPS track exists', async () => {
    await act(async () => {
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Import GPS Track')).toBeInTheDocument();
    });
  });

  test('displays back to flight log button', async () => {
    await act(async () => {
      await renderFlightDetails();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Back to Flight Log')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Back to Flight Log'));
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/flightlog');
  });

  test('handles API errors gracefully', async () => {
    mockFetchData.mockResolvedValue({ data: null, error: 'API Error' });
    
    await act(async () => {
      await renderFlightDetails();
    });
    
    // Component should handle error without crashing
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  test('navigation arrows are disabled appropriately', async () => {
    // Test with flightId=1 (last in orderedIds, Index 2)
    mockParams.flightId = '1';
    await act(async () => {
      await renderFlightDetails();
    });

    await waitFor(() => {
      const prevButtons = screen.getAllByTestId('arrow-right'); // previous flight (right)
      const nextButtons = screen.getAllByTestId('arrow-left'); // next flight (left)
      const prevButton = prevButtons[prevButtons.length - 1];
      const nextButton = nextButtons[nextButtons.length - 1];

      // previous (right) should be disabled (Index 2 >= orderedIds.length-1)
      expect(prevButton).toBeDisabled();
      // next (left) should be enabled (Index 2 > 0)
      expect(nextButton).not.toBeDisabled();
    });

    // Test with flightId=3 (first in orderedIds, Index 0)
    mockParams.flightId = '3';
    await act(async () => {
      await renderFlightDetails();
    });

    await waitFor(() => {
      const prevButtons = screen.getAllByTestId('arrow-right'); // previous flight (right)
      const nextButtons = screen.getAllByTestId('arrow-left'); // next flight (left)
      const prevButton = prevButtons[prevButtons.length - 1];
      const nextButton = nextButtons[nextButtons.length - 1];

      // previous (right) should be enabled (Index 0 < orderedIds.length-1)
      expect(prevButton).not.toBeDisabled();
      // next (left) should be disabled (Index 0 <= 0)
      expect(nextButton).toBeDisabled();
    });
  });
});
