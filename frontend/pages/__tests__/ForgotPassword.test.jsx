import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPassword from '../ForgotPassword';
import '@testing-library/jest-dom';

// Mock fetch API
global.fetch = vi.fn();

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
  });

  test('renders forgot password form correctly', () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Find email input by empty value
    expect(screen.getByRole('button', { name: 'Send Link' })).toBeInTheDocument();
  });

  test('handles email input changes correctly', () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    const emailInput = screen.getByRole('textbox'); // Find input by role
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(emailInput.value).toBe('test@example.com');
  });

  test('submits form and handles successful password reset request', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    // Mock successful response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    // Fill form
    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'test@example.com' } 
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Send Link' }));

    await waitFor(() => {
      // Check if fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/users/reset_password/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );

      // Check if success message is displayed
      expect(screen.getByText('Link sent. Please check your email.')).toBeInTheDocument();
    });
  });

  test('handles password reset request failure', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    // Mock failed response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
      })
    );

    // Fill form
    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'nonexistent@example.com' } 
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Send Link' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Error requesting password reset.')).toBeInTheDocument();
    });
  });

  test('handles network error during password reset request', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    // Mock network error
    fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );

    // Fill form
    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'test@example.com' } 
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Send Link' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  test('shows loading state during form submission', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    // Mock slow response
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({})
      }), 100))
    );

    // Fill form
    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'test@example.com' } 
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Send Link' }));

    // Check if loading message is displayed
    expect(screen.getByText('Sending Email...')).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Link sent. Please check your email.')).toBeInTheDocument();
    });
  });

  test('form requires email input', () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    const emailInput = screen.getByRole('textbox');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('clears previous messages when submitting new request', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    // First request - success
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Link' }));

    await waitFor(() => {
      expect(screen.getByText('Link sent. Please check your email.')).toBeInTheDocument();
    });

    // Second request - failure
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
      })
    );

    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'invalid@example.com' } 
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Link' }));

    await waitFor(() => {
      // Success message should be cleared
      expect(screen.queryByText('Link sent. Please check your email.')).not.toBeInTheDocument();
      // Error message should be displayed
      expect(screen.getByText('Error requesting password reset.')).toBeInTheDocument();
    });
  });
});
