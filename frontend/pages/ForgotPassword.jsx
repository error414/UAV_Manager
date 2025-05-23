import { useState } from 'react';
import { AuthLayout, FormInput, Alert, Button, Loading } from '../components';

const ForgotPassword = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ error: null, success: null, loading: false });

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus({ error: null, success: null, loading: true });
    try {
      const resp = await fetch(`${API_URL}/auth/users/reset_password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!resp.ok) throw new Error('Error requesting password reset.');
      setStatus({ error: null, success: 'Link sent. Please check your email.', loading: false });
    } catch (err) {
      setStatus({ error: err.message, success: null, loading: false });
    }
  };

  if (status.loading) return <Loading message="Sending Email..." />;
  return (
    <AuthLayout title="Reset Password">
      <Alert type="error" message={status.error} />
      <Alert type="success" message={status.success} />
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          labelClassName="text-white"
        />
        <Button type="submit" variant="primary" fullWidth>Send Link</Button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
