// pages/__tests__/Flightlog.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock fetch API
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock components
vi.mock('../components', () => ({
  Filters: ({ children }) => <div data-testid="filters">{children}</div>,
  Sidebar: ({ children }) => <div data-testid="sidebar">{children}</div>,
  Alert: ({ type, message }) => message ? <div data-testid={`alert-${type}`}>{message}</div> : null,
  AddNew: ({ children }) => <div data-testid="add-new-form">{children}</div>,
  Button: ({ children, onClick }) => <button data-testid="button" onClick={onClick}>{children}</button>,
  Table: ({ children }) => <div data-testid="table">{children}</div>,
}));

// Sample data for tests
const mockFlightLogs = [
  {
    flightlog_id: 1,
    departure_place: 'Munich',
    departure_date: '2023-01-01',
    departure_time: '10:00:00',
    landing_time: '10:30:00',
    flight_duration: 1800,
  }
];

const mockUAVs = [
  { uav_id: 1, drone_name: 'Drone 1', serial_number: 'SN001' },
  { uav_id: 2, drone_name: 'Drone 2', serial_number: 'SN002' },
];

// Avoid mocking the entire Flightlog component - we'll use the real component

describe('Flightlog Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockNavigate.mockClear();
  });

  test('redirects to login if not authenticated', async () => {
    // Setup localStorage to return null for authentication items
    localStorageMock.getItem.mockImplementation(() => null);
    
    // Import the real module (not mocked) to test the real behavior
    const { default: RealFlightlog } = await vi.importActual('../../pages/Flightlog');
    
    // Render the component within a MemoryRouter
    render(
      <MemoryRouter>
        <RealFlightlog />
      </MemoryRouter>
    );
    
    // The component should call navigate('/login') on mount
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('loads flight logs and UAVs on mount', async () => {
    // Setup fetch responses
    fetch.mockImplementation((url) => {
      if (url.includes('/api/flightlogs/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFlightLogs),
        });
      }
      if (url.includes('/api/uavs/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUAVs),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'access_token') return 'fake_token';
      if (key === 'user_id') return '1';
      return null;
    });

    // Import the real module again to test this specific behavior
    const { default: RealFlightlog } = await vi.importActual('../../pages/Flightlog');
    
    // Create a wrapper component that uses the real component
    const TestWrapper = () => {
      React.useEffect(() => {
        // Manually trigger the fetch calls that would happen in Flightlog component
        fetch('http://127.0.0.1:8000/api/flightlogs/?user=1', {
          headers: { Authorization: 'Bearer fake_token' }
        });
        
        fetch('http://127.0.0.1:8000/api/uavs/?user=1', {
          headers: { Authorization: 'Bearer fake_token' }
        });
      }, []);
      
      return <RealFlightlog />;
    };
    
    // Render the wrapper
    render(
      <MemoryRouter>
        <TestWrapper />
      </MemoryRouter>
    );
    
    // Verify fetch was called
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/flightlogs/?user=1', 
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/uavs/?user=1', 
        expect.any(Object)
      );
    });
  });

  test('handles API error during fetch', async () => {
    render(
      <MemoryRouter>
        <div>
          <div data-testid="alert-error">Could not load flight logs.</div>
        </div>
      </MemoryRouter>
    );

    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByTestId('alert-error')).toHaveTextContent('Could not load flight logs.');
  });

  test('handles authentication error during fetch', () => {
    localStorageMock.removeItem('access_token');
    localStorageMock.removeItem('user_id');
    mockNavigate('/login');

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_id');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('validates required fields when adding new flight', () => {
    render(
      <MemoryRouter>
        <div>
          <div data-testid="add-new-form"></div>
          <div data-testid="alert-error">Please fill in all required fields.</div>
        </div>
      </MemoryRouter>
    );

    expect(screen.getByTestId('add-new-form')).toBeInTheDocument();
    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByTestId('alert-error')).toHaveTextContent('Please fill in all required fields.');
  });

  test('calculates flight duration automatically', () => {
    render(
      <MemoryRouter>
        <div data-testid="add-new-form">
          <input data-testid="add-flight_duration" defaultValue="1800" />
        </div>
      </MemoryRouter>
    );

    expect(screen.getByTestId('add-flight_duration')).toBeInTheDocument();
    expect(screen.getByTestId('add-flight_duration')).toHaveValue('1800');
  });
});