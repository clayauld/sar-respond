import React, { useState } from 'react';

function ChangePasswordModal({ user, onClose, pb, force = false }) {
  const [data, setData] = useState({ oldPassword: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (data.password !== data.passwordConfirm) {
        setError("Passwords do not match");
        setLoading(false);
        return;
    }

    try {
        const payload = {
            oldPassword: data.oldPassword,
            password: data.password,
            passwordConfirm: data.passwordConfirm
        };

        if (force) {
            payload.requirePasswordReset = false;
        }

        await pb.collection('users').update(user.id, payload);
        setSuccess("Password updated successfully!");
        setTimeout(onClose, 1500);
    } catch (err) {
        console.error(err);
        setError("Failed to update password. Please check your old password.");
    }
    setLoading(false);
  };

  return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={!force ? onClose : undefined}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{force ? 'Password Change Required' : 'Change Password'}</h3>
              
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
              {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm font-medium">{success}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                      <input 
                          type="password" 
                          required
                          autoComplete="current-password"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.oldPassword}
                          onChange={e => setData({...data, oldPassword: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                      <input 
                          type="password" 
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.password}
                          onChange={e => setData({...data, password: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                      <input 
                          type="password" 
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.passwordConfirm}
                          onChange={e => setData({...data, passwordConfirm: e.target.value})}
                      />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || success}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                      {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  {!force && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full text-slate-500 font-bold py-2 text-sm hover:text-slate-800"
                    >
                        Cancel
                    </button>
                  )}
              </form>
          </div>
      </div>
  );
}

export default ChangePasswordModal;
