import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '../ResetPassword';
import '@testing-library/jest-dom';

// Mock fetch API
global.fetch = vi.fn();

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
const mockParams = { uid: 'test-uid', token: 'test-token' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

describe('ResetPassword Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
  });

  test('renders reset password form correctly', () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Check for page title in AuthLayout
    expect(screen.getByRole('heading', { name: 'New Password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Password' })).toBeInTheDocument();
    // Check that both password fields exist
    const passwordInputs = screen.getAllByDisplayValue('');
    expect(passwordInputs).toHaveLength(2);
  });

  test('handles input changes correctly', () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInputs = screen.getAllByDisplayValue('');
    const newPasswordInput = passwordInputs[0];
    const repeatPasswordInput = passwordInputs[1];

    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(repeatPasswordInput, { target: { value: 'newpassword123' } });

    expect(newPasswordInput.value).toBe('newpassword123');
    expect(repeatPasswordInput.value).toBe('newpassword123');
  });

  test('submits form data and handles successful password reset', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
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
    const passwordInputs = screen.getAllByDisplayValue('');
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Save Password' }));

    await waitFor(() => {
      // Check if fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/users/reset_password_confirm/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: 'test-uid',
            token: 'test-token',
            new_password: 'newpassword123',
            re_new_password: 'newpassword123',
          }),
        })
      );

      // Check if success message is displayed
      expect(screen.getByText('Password set.')).toBeInTheDocument();

      // Check if navigation occurred
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('handles password reset failure correctly', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Mock failed response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          detail: 'Invalid token or uid.',
        }),
      })
    );

    // Fill form
    const passwordInputs = screen.getAllByDisplayValue('');
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Save Password' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Error setting password.')).toBeInTheDocument();
      
      // Check if navigation didn't occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('handles network error correctly', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Mock network error
    fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    // Fill form
    const passwordInputs = screen.getAllByDisplayValue('');
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Save Password' }));

    await waitFor(() => {
      // Check if error message is displayed
      expect(screen.getByText('Network error')).toBeInTheDocument();
      
      // Check if navigation didn't occur
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('shows loading state during form submission', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Mock delayed response
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({})
        }), 100)
      )
    );

    // Fill form
    const passwordInputs = screen.getAllByDisplayValue('');
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Save Password' }));

    // Check if loading message appears
    expect(screen.getByText('Saving Password...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Saving Password...')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('uses correct uid and token from URL params', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    // Fill and submit form
    const passwordInputs = screen.getAllByDisplayValue('');
    fireEvent.change(passwordInputs[0], { target: { value: 'test123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'test123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Password' }));

    await waitFor(() => {
      // Verify that the mocked uid and token are used in the request
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/users/reset_password_confirm/',
        expect.objectContaining({
          body: JSON.stringify({
            uid: 'test-uid',
            token: 'test-token',
            new_password: 'test123',
            re_new_password: 'test123',
          }),
        })
      );
    });
  });

  test('form fields are required', () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInputs = screen.getAllByDisplayValue('');
    const newPasswordInput = passwordInputs[0];
    const repeatPasswordInput = passwordInputs[1];

    expect(newPasswordInput).toBeRequired();
    expect(repeatPasswordInput).toBeRequired();
  });

  test('form has correct input types', () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInputs = screen.getAllByDisplayValue('');
    const newPasswordInput = passwordInputs[0];
    const repeatPasswordInput = passwordInputs[1];

    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(repeatPasswordInput).toHaveAttribute('type', 'password');
  });
});
