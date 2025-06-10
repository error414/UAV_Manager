import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthLayout, FormInput, Alert, Button, Loading } from '../components';

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [form, setForm] = useState({ new_password: '', re_new_password: '' });
  const [status, setStatus] = useState({ error:null, success:null, loading:false });

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus({ error:null, success:null, loading:true });
    try {
      const resp = await fetch(`${API_URL}/auth/users/reset_password_confirm/`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ uid, token, ...form })
      });
      if (!resp.ok) throw new Error('Error setting password.');
      setStatus({ error: null, success: 'Password set.', loading: false });
      navigate('/login');
    } catch(err) {
      setStatus({ error:err.message, success:null, loading:false });
    }
  };

  if (status.loading) return <Loading message="Saving Password..." />;
  return (
    <AuthLayout title="New Password">
      <Alert type="error" message={status.error} />
      <Alert type="success" message={status.success} />
      <form onSubmit={handleSubmit}>
        {['new_password','re_new_password'].map(f=>(
          <FormInput
            key={f}
            label={f==='new_password'?'New Password':'Repeat Password'}
            type="password"
            name={f}
            value={form[f]}
            onChange={e=>setForm(prev=>({...prev,[f]:e.target.value}))}
            required
            className="mb-6"
            labelClassName="text-white"
          />
        ))}
        <Button type="submit" variant="primary" fullWidth>Save Password</Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
