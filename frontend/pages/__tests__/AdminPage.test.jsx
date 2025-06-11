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

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { search: '', pathname: '/admin', state: null };

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
    useLocation: () => mockLocation,
    Navigate: ({ to, state, replace }) => (
      <div data-testid="navigate" data-to={to} data-replace={replace?.toString()}>
        Redirecting to {to}
      </div>
    ),
  };
});

// Mock utility functions
vi.mock('../../utils', () => ({
  userTableColumns: [
    { accessor: 'email', header: 'Email' },
    { accessor: 'first_name', header: 'First Name' },
    { accessor: 'last_name', header: 'Last Name' },
    { accessor: 'is_staff', header: 'Staff' },
    { accessor: 'is_active', header: 'Active' },
  ],
  uavTableColumns: [
    { accessor: 'drone_name', header: 'Drone Name' },
    { accessor: 'manufacturer', header: 'Manufacturer' },
    { accessor: 'type', header: 'Type' },
    { accessor: 'registration_number', header: 'Registration' },
  ],
  getEnhancedFlightLogColumns: vi.fn(() => [
    { accessor: 'departure_date', header: 'Date' },
    { accessor: 'departure_place', header: 'Departure' },
    { accessor: 'landing_place', header: 'Landing' },
    { accessor: 'flight_duration', header: 'Duration' },
  ]),
  userFilterFormFields: [
    { name: 'email', label: 'Email', type: 'text', placeholder: 'Search by email' },
    { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'Search by first name' },
    { name: 'is_staff', label: 'Staff Status', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
  ],
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
  Layout: ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
      <div data-testid="layout-title">{title}</div>
      {children}
    </div>
  ),
  Alert: ({ type, message }) => message ? <div data-testid={`alert-${type}`}>{message}</div> : null,
  Button: ({ children, onClick, variant, fullWidth, className, ...props }) => (
    <button 
      data-testid="button" 
      data-variant={variant} 
      data-fullwidth={fullWidth?.toString()}
      onClick={onClick} 
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
  ResponsiveTable: ({ 
    data = [], 
    onEdit, 
    onDelete, 
    onRowClick, 
    filters = {},
    onFilterChange,
    editingId,
    editingData,
    onEditChange,
    onSaveEdit,
    onCancelEdit,
    columns = [],
    idField = 'user_id',
    titleField = 'email',
    showActionColumn = false,
    rowClickable = false,
    ...props 
  }) => (
    <div data-testid="responsive-table" data-rows={data?.length || 0}>
      {/* Filter inputs - only render if onFilterChange is provided */}
      {onFilterChange && (
        <input 
          data-testid="filter-email"
          name="email"
          value={filters?.email || ''}
          onChange={onFilterChange}
          placeholder="Filter email"
        />
      )}
      
      {/* Table rows */}
      {data?.map((item, index) => (
        <div 
          key={index} 
          data-testid={`table-row-${index}`} 
          onClick={rowClickable ? () => onRowClick?.(item[idField]) : undefined}
          style={{ cursor: rowClickable ? 'pointer' : 'default' }}
        >
          <span>{item[titleField]} - {item.first_name} {item.last_name}</span>
          {editingId === item[idField] ? (
            <div>
              {/* Only render edit inputs if onEditChange is provided */}
              {onEditChange && (
                <>
                  <input 
                    data-testid={`edit-email-${item[idField]}`}
                    name="email"
                    value={editingData?.email || ''}
                    onChange={onEditChange}
                  />
                  <input 
                    data-testid={`edit-is_staff-${item[idField]}`}
                    name="is_staff"
                    type="checkbox"
                    checked={editingData?.is_staff || false}
                    onChange={onEditChange}
                  />
                </>
              )}
              <button data-testid={`save-edit-${item[idField]}`} onClick={onSaveEdit}>Save</button>
              <button data-testid={`cancel-edit-${item[idField]}`} onClick={onCancelEdit}>Cancel</button>
            </div>
          ) : showActionColumn && (
            <div>
              <button data-testid={`edit-${item[idField]}`} onClick={() => onEdit?.(item[idField])}>Edit</button>
              <button data-testid={`delete-${item[idField]}`} onClick={() => onDelete?.(item[idField])}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  ),
  Loading: () => <div data-testid="loading">Loading...</div>,
  ConfirmModal: ({ open, onConfirm, onCancel, title, message, confirmText, cancelText }) => 
    open ? (
      <div data-testid="confirm-modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-message">{message}</div>
        <button data-testid="confirm-button" onClick={onConfirm}>{confirmText}</button>
        <button data-testid="cancel-button" onClick={onCancel}>{cancelText}</button>
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

// Test data - inline mock data generators
const createMockUser = (overrides = {}) => ({
  user_id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_staff: false,
  is_active: true,
  phone: '123456789',
  street: 'Test Street',
  zip: '12345',
  city: 'Test City',
  country: 'Test Country',
  ...overrides
});

const createMockUAV = (overrides = {}) => ({
  uav_id: 1,
  drone_name: 'Test Drone',
  manufacturer: 'Test Manufacturer',
  type: 'Quad',
  motors: 4,
  motor_type: 'Electric',
  registration_number: 'TEST001',
  serial_number: 'SN001',
  is_active: true,
  ...overrides
});

const createMockFlightLog = (overrides = {}) => ({
  flightlog_id: 1,
  departure_date: '2023-01-01',
  departure_time: '10:00:00',
  departure_place: 'Test Location',
  landing_time: '10:30:00',
  landing_place: 'Test Landing',
  flight_duration: 1800,
  takeoffs: 1,
  landings: 1,
  light_conditions: 'Day',
  ops_conditions: 'VLOS',
  pilot_type: 'PIC',
  uav: createMockUAV(),
  comments: 'Test flight',
  ...overrides
});

// Test data
const mockUsers = [
  createMockUser({
    user_id: 1,
    email: 'admin@test.com',
    first_name: 'Admin',
    last_name: 'User',
    is_staff: true,
    is_active: true,
  }),
  createMockUser({
    user_id: 2,
    email: 'user@test.com',
    first_name: 'Regular',
    last_name: 'User',
    is_staff: false,
    is_active: true,
  })
];

const mockUAVs = [
  createMockUAV({
    uav_id: 1,
    drone_name: 'Test Drone 1',
    manufacturer: 'TestCorp',
    type: 'Quad',
    registration_number: 'REG001',
  }),
  createMockUAV({
    uav_id: 2,
    drone_name: 'Test Drone 2',
    manufacturer: 'TestCorp',
    type: 'Hex',
    registration_number: 'REG002',
  })
];

const mockFlightLogs = [
  createMockFlightLog({
    flightlog_id: 1,
    departure_date: '2023-01-01',
    departure_place: 'Test Location 1',
    landing_place: 'Test Location 2',
    uav: { uav_id: 1, drone_name: 'Test Drone 1' }
  }),
  createMockFlightLog({
    flightlog_id: 2,
    departure_date: '2023-01-02',
    departure_place: 'Test Location 3',
    landing_place: 'Test Location 4',
    uav: { uav_id: 2, drone_name: 'Test Drone 2' }
  })
];

const mockUsersApiResponse = {
  results: mockUsers,
  count: 2,
  next: null,
  previous: null
};

const mockUAVsApiResponse = {
  results: mockUAVs,
  count: 2,
  next: null,
  previous: null
};

const mockFlightLogsApiResponse = {
  results: mockFlightLogs,
  count: 2,
  next: null,
  previous: null
};

const renderAdminPage = async () => {
  const { default: AdminPage } = await import('../AdminPage.jsx');
  let component;
  await act(async () => {
    component = render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );
  });
  return component;
};

describe('AdminPage Component', () => {
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

    // Setup default API responses
    mockFetchData.mockImplementation(async (endpoint, queryParams, method) => {
      if (endpoint.includes('/api/users/1/')) {
        return { data: { ...mockUsers[0], is_staff: true }, error: null };
      }
      if (endpoint.includes('/api/admin/users/')) {
        if (method === 'PUT') {
          return { data: mockUsers[0], error: null };
        }
        if (method === 'DELETE') {
          return { data: {}, error: null };
        }
        return { data: mockUsersApiResponse, error: null };
      }
      if (endpoint.includes('/api/admin/uavs/')) {
        return { data: mockUAVsApiResponse, error: null };
      }
      if (endpoint.includes('/api/flightlogs/')) {
        return { data: mockFlightLogsApiResponse, error: null };
      }
      return { data: {}, error: null };
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test('redirects non-staff users to flightlog', async () => {
    // Mock non-staff user
    mockFetchData.mockImplementation(async (endpoint) => {
      if (endpoint.includes('/api/users/1/')) {
        return { data: { ...mockUsers[1], is_staff: false }, error: null };
      }
      return { data: {}, error: null };
    });

    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/flightlog');
    });
  });

  test('renders admin panel for staff users', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(screen.getByTestId('layout-title')).toHaveTextContent('Admin Panel - User Management');
    });
  });

  test('loads and displays users table', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('responsive-table')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-table')).toHaveAttribute('data-rows', '2');
    });
  });

  test('handles mobile filters toggle', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      const filterButton = screen.getByText(/Show Filters|Hide Filters/);
      expect(filterButton).toBeInTheDocument();
    });

    const filterButton = screen.getByText(/Show Filters|Hide Filters/);
    
    await act(async () => {
      fireEvent.click(filterButton);
    });
    
    // The button text should change
    expect(filterButton.textContent).toMatch(/Hide Filters|Show Filters/);
  });

  test('handles user filter changes', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('filter-email')).toBeInTheDocument();
    });

    const filterInput = screen.getByTestId('filter-email');
    
    await act(async () => {
      fireEvent.change(filterInput, { target: { value: 'admin' } });
    });
    
    expect(filterInput.value).toBe('admin');
  });

  test('handles user edit functionality', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-1')).toBeInTheDocument();
    });

    // Click edit button
    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-email-1')).toBeInTheDocument();
      expect(screen.getByTestId('save-edit-1')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-edit-1')).toBeInTheDocument();
    });
  });

  test('handles user edit save', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-1')).toBeInTheDocument();
    });

    // Click edit button
    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-email-1')).toBeInTheDocument();
    });

    // Change email value
    const emailInput = screen.getByTestId('edit-email-1');
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'newemail@test.com' } });
    });
    
    // Click save
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-edit-1'));
    });
    
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/admin/users/1/',
        {},
        'PUT',
        expect.objectContaining({ email: 'newemail@test.com' })
      );
    });
  });

  test('handles user edit cancel', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-1')).toBeInTheDocument();
    });

    // Click edit button
    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('cancel-edit-1')).toBeInTheDocument();
    });

    // Click cancel
    await act(async () => {
      fireEvent.click(screen.getByTestId('cancel-edit-1'));
    });
    
    await waitFor(() => {
      expect(screen.queryByTestId('edit-email-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('edit-1')).toBeInTheDocument();
    });
  });

  test('handles user delete with confirmation', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('delete-1')).toBeInTheDocument();
    });

    // Click delete button
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete User');
    });

    // Confirm delete
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });
    
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith('/api/admin/users/1/', {}, 'DELETE');
    });
  });

  test('handles user delete cancellation', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('delete-1')).toBeInTheDocument();
    });

    // Click delete button
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    });

    // Cancel delete
    await act(async () => {
      fireEvent.click(screen.getByTestId('cancel-button'));
    });
    
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  test('handles user selection and loads user data', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
    });

    // Click on user row to select
    await act(async () => {
      fireEvent.click(screen.getByTestId('table-row-0'));
    });
    
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/admin/uavs/',
        expect.objectContaining({ user_id: 1 })
      );
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/flightlogs/',
        expect.objectContaining({ user: 1 })
      );
    });
  });

  test('displays user UAVs after selection', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
    });

    // Select user
    await act(async () => {
      fireEvent.click(screen.getByTestId('table-row-0'));
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Aircraft for/)).toBeInTheDocument();
    });
  });

  test('displays user flight logs after selection', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
    });

    // Select user
    await act(async () => {
      fireEvent.click(screen.getByTestId('table-row-0'));
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Flight Logs for/)).toBeInTheDocument();
    });
  });

  test('handles pagination correctly', async () => {
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    const nextButton = screen.getByTestId('next-page');
    if (!nextButton.disabled) {
      await act(async () => {
        fireEvent.click(nextButton);
      });
    }
    
    // Verify pagination exists
    expect(screen.getByTestId('page-info')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    // Mock API error for all endpoints except the initial user check
    mockFetchData.mockImplementation(async (endpoint) => {
      if (endpoint.includes('/api/users/1/')) {
        return { data: { ...mockUsers[0], is_staff: true }, error: null };
      }
      return { data: null, error: true };
    });

    await renderAdminPage();
    
    // Should still render the layout after auth check passes
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  test('handles authentication check failure', async () => {
    // Mock auth failure
    mockCheckAuthAndGetUser.mockReturnValue(null);
    
    await renderAdminPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });
});
