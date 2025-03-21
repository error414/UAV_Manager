// pages/__tests__/Register.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../../pages/Register'; // Adjust path as needed
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

describe('Register Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockNavigate.mockClear();
  });

  test('renders registration form correctly', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });

  test('handles input changes correctly', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Password');
    const rePasswordInput = screen.getByLabelText('Repeat Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(rePasswordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
    expect(rePasswordInput.value).toBe('password123');
  });

  test('validates passwords match', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Fill form with mismatched passwords
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Repeat Password'), { target: { value: 'different_password' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      
      // Check if fetch was not called
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  test('submits form data and handles successful registration with login', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Mock successful registration response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          user_id: '1',
          // No access token in response
        }),
      })
    );

    // Mock successful login response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          access: 'fake_access_token',
        }),
      })
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Repeat Password'), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      // Check if registration fetch was called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/users/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            re_password: 'password123',
          }),
        })
      );

      // Check if login fetch was called
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/jwt/create/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );

      // Check if localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user_id', '1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'fake_access_token');

      // Check if navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/AdditionalDetails');
    });
  });

  test('handles successful registration with token in response', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Mock registration response with access token
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          user_id: '1',
          access: 'direct_access_token', // Token included in registration response
        }),
      })
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Repeat Password'), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      // Check if localStorage was updated with token from registration
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user_id', '1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'direct_access_token');

      // Check if navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/AdditionalDetails');
      
      // Login fetch should not be called since token was in registration response
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  test('handles registration failure correctly', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Mock failed registration response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          email: ['Email already exists.'],
        }),
      })
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Repeat Password'), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      // Check if error JSON is displayed
      expect(screen.getByText('{"email":["Email already exists."]}')).toBeInTheDocument();
      
      // Check if navigation didn't occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('handles login failure after successful registration', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Mock successful registration response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          user_id: '1',
          // No access token
        }),
      })
    );

    // Mock failed login response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          detail: 'Login failed.',
        }),
      })
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Repeat Password'), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Login failed after registration. Please try again.')).toBeInTheDocument();
      
      // Check if navigation didn't occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('handles API fetch error', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Mock network error
    fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    // Fill form
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Repeat Password'), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      // Check if generic error message is displayed
      expect(screen.getByText('An error occurred. Please try again later.')).toBeInTheDocument();
    });
  });
});