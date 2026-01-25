import React, { useState } from 'react';

function ChangeUsernameModal({ user, onClose, pb, onUpdate }) {
  const [data, setData] = useState({ username: '', usernameConfirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (data.username !== data.usernameConfirm) {
        setError("Usernames do not match");
        setLoading(false);
        return;
    }

    if (data.username.length < 3) {
        setError("Username must be at least 3 characters");
        setLoading(false);
        return;
    }

    try {
        const updatedUser = await pb.collection('users').update(user.id, {
            username: data.username
        });
        setSuccess("Username updated successfully!");
        if (onUpdate) onUpdate(updatedUser);
        setTimeout(onClose, 1500);
    } catch (err) {
        console.error(err);
        if (err.data?.data?.username?.code === 'validation_is_unique') {
            setError("Username is already taken.");
        } else {
            setError(err.message || "Failed to update username.");
        }
    }
    setLoading(false);
  };

  return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Change Username</h3>
              
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
              {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm font-medium">{success}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Username</label>
                      <input 
                          type="text" 
                          required
                          minLength={3}
                          autoComplete="username"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.username}
                          onChange={e => setData({...data, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                          placeholder="jdoe"
                      />
                      <p className="text-xs text-slate-400 mt-1">Lowercase alphanumeric only, min 3 chars.</p>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Username</label>
                      <input 
                          type="text" 
                          required
                          minLength={3}
                          autoComplete="off"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.usernameConfirm}
                          onChange={e => setData({...data, usernameConfirm: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                          placeholder="jdoe"
                      />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || success}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                      {loading ? 'Updating...' : 'Update Username'}
                  </button>
                  <button 
                    type="button"
                    onClick={onClose}
                    className="w-full text-slate-500 font-bold py-2 text-sm hover:text-slate-800"
                  >
                      Cancel
                  </button>
              </form>
          </div>
      </div>
  );
}

export default ChangeUsernameModal;
