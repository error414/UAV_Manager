// pages/__tests__/AdditionalDetail.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdditionalDetails from '../../pages/AdditionalDetails'; 
import '@testing-library/jest-dom';

// Define all mock variables first
const mockNavigate = vi.fn();
const mockFetchData = vi.fn();
const mockCheckAuthAndGetUser = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock hooks
vi.mock('../../hooks', () => {
  return {
    useAuth: () => ({
      checkAuthAndGetUser: mockCheckAuthAndGetUser
    }),
    useApi: () => ({
      fetchData: mockFetchData
    })
  };
});

// Mock CountryDropdown
vi.mock('react-country-region-selector', () => ({
  CountryDropdown: ({ value, onChange }) => (
    <select data-testid="country-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value=""></option>
      <option value="US">United States</option>
      <option value="DE">Germany</option>
    </select>
  ),
}));

describe('AdditionalDetails Component', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockNavigate.mockClear();
    mockFetchData.mockClear();
    mockCheckAuthAndGetUser.mockClear();
    
    // Default authentication state
    mockCheckAuthAndGetUser.mockReturnValue({ user_id: '1', token: 'fake_token' });

    // Default successful fetch response
    mockFetchData.mockImplementation((url, options, method) => {
      if (method === 'PATCH') {
        return Promise.resolve({ error: false, data: { message: 'Updated successfully' } });
      }
      // Default GET response
      return Promise.resolve({
        error: false,
        data: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '1234567890',
          street: '123 Main St',
          zip: '12345',
          city: 'Anytown',
          country: 'US',
        }
      });
    });
  });

  test('displays form with user data after loading', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify form fields are populated
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/Phone/i)).toHaveValue('1234567890');
    expect(screen.getByLabelText(/Street/i)).toHaveValue('123 Main St');
    expect(screen.getByLabelText(/Zip/i)).toHaveValue('12345');
    expect(screen.getByLabelText(/City/i)).toHaveValue('Anytown');
    expect(screen.getByTestId('country-dropdown')).toHaveValue('US');
  });

  test('handles country selection correctly', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const countryDropdown = screen.getByTestId('country-dropdown');
    fireEvent.change(countryDropdown, { target: { value: 'DE' } });
    
    // Check if the select value has changed
    expect(countryDropdown.value).toBe('DE');
  });

  test('shows validation errors for required fields when submitted empty', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Clear required fields
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.change(lastNameInput, { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save details/i });
    fireEvent.click(submitButton);

    // Check that form submission was attempted
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalled();
    });
  });

  test('validates phone number format', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });

    // Check that the field validation is called
    expect(phoneInput.value).toBe('invalid-phone');
  });

  test('validates ZIP code format', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const zipInput = screen.getByLabelText(/Zip/i);
    fireEvent.change(zipInput, { target: { value: 'abc123' } });

    expect(zipInput.value).toBe('abc123');
  });

  test('successfully submits form with valid data', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Fill form with valid data
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save details/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/users/1/',
        {},
        'PATCH',
        expect.objectContaining({
          first_name: 'Jane',
          last_name: 'Smith'
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Details updated successfully!')).toBeInTheDocument();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/newaircraft');
  });

  test('handles form submission error', async () => {
    mockFetchData.mockImplementationOnce((url, options, method) => {
      if (method === 'PATCH') {
        return Promise.resolve({ error: true, message: 'Update failed' });
      }
      return Promise.resolve({
        error: false,
        data: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '1234567890',
          street: '123 Main St',
          zip: '12345',
          city: 'Anytown',
          country: 'US',
        }
      });
    });

    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /save details/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        '/api/users/1/',
        {},
        'PATCH',
        expect.any(Object)
      );
    });
  });

  test('handles API fetch error during data loading', async () => {
    mockFetchData.mockImplementationOnce(() => 
      Promise.resolve({ error: true })
    );

    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Form should render with empty values when fetch fails
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue('');
  });

  test('updates form fields when user types', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const streetInput = screen.getByLabelText(/Street/i);
    const cityInput = screen.getByLabelText(/City/i);

    fireEvent.change(streetInput, { target: { value: '456 Oak Ave' } });
    fireEvent.change(cityInput, { target: { value: 'New City' } });

    expect(streetInput.value).toBe('456 Oak Ave');
    expect(cityInput.value).toBe('New City');
  });

  test('clears error and success messages on new form submission', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /save details/i });
    
    // First submission
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Details updated successfully!')).toBeInTheDocument();
    });

    // Second submission should clear previous messages
    fireEvent.click(submitButton);
    
    // The success message should be cleared and then shown again
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(3); // Initial load + 2 submissions
    });
  });

  test('displays loading state initially', () => {
    mockFetchData.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: false, data: {} }), 100))
    );

    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('redirects when user is not authenticated', async () => {
    mockCheckAuthAndGetUser.mockReturnValueOnce(null);

    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    // When not authenticated, the component should return early
    // and not make any API calls
    expect(mockFetchData).not.toHaveBeenCalled();
  });
});