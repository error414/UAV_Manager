// pages/__tests__/AdditionalDetail.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdditionalDetails from '../../pages/AdditionalDetails'; // Adjust path as needed
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
// Fixed mock setup using async/await pattern suggested in the error message
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock CountryDropdown component
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
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockNavigate.mockClear();

    // Setup default localStorage returns
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'access_token') return 'fake_token';
      if (key === 'user_id') return '1';
      return null;
    });

    // Setup default fetch mock response for user data
    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          first_name: 'John',
          last_name: 'Doe',
          phone: '1234567890',
          street: '123 Main St',
          zip: '12345',
          city: 'Anytown',
          country: 'US',
        }),
      })
    );
  });

  test('redirects to login if not authenticated', async () => {
    localStorageMock.getItem.mockImplementation(() => null);

    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('loads user data on mount', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/users/1/', expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    });
  });

  test('handles input changes correctly', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText('First Name');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    expect(firstNameInput.value).toBe('Jane');
  });

  test('handles numeric input correctly', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText('Phone');
    
    // Should strip non-numeric characters
    fireEvent.change(phoneInput, { target: { value: '123-456-abc7890' } });
    expect(phoneInput.value).toBe('1234567890');
  });

  test('handles country selection correctly', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
    });

    const countryDropdown = screen.getByTestId('country-dropdown');
    fireEvent.change(countryDropdown, { target: { value: 'DE' } });
    
    // Check if the select value has changed to Germany (DE)
    expect(countryDropdown.value).toBe('DE');
  });

  test('submits form data correctly', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    // Update user details
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });

    // Mock the PATCH request success response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          first_name: 'Jane',
          last_name: 'Smith',
        }),
      })
    );

    // Submit the form
    fireEvent.click(screen.getByText('Save Details'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/users/1/',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Jane'),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/flightlog');
    });
  });

  test('handles API errors during submission', async () => {
    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    // Mock API error response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid input' }),
      })
    );

    // Submit the form
    fireEvent.click(screen.getByText('Save Details'));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText(/{"error":"Invalid input"}/)).toBeInTheDocument();
    });
  });

  test('redirects to login if token is expired during fetch', async () => {
    // Setup response to indicate expired token
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Token expired' }),
      })
    );

    render(
      <MemoryRouter>
        <AdditionalDetails />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_id');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});