// pages/__tests__/Login.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login'; // Adjust path as needed
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

describe('Login Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockNavigate.mockClear();
  });

  test('renders login form correctly', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  test('handles input changes correctly', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('submits form data and handles successful login', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
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
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      // Check if fetch was called with correct data
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

      // Check if localStorage was updated with access token only
      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'fake_access_token');

      // Check if navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/flightlog');
    });
  });

  test('handles login failure correctly', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Mock failed login response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          detail: 'Invalid credentials',
        }),
      })
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong_password' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      
      // Check if navigation didn't occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});