import React, { useState } from 'react';

function EditMissionModal({ mission, onClose, pb, onUpdate }) {
  const [data, setData] = useState({ 
      title: mission.title || '', 
      location: mission.location || '', 
      mapUrl: mission.mapUrl || '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const updatedMission = await pb.collection('missions').update(mission.id, data);
        if (onUpdate) onUpdate(updatedMission);
        onClose();
    } catch (err) {
        console.error(err);
        setError("Failed to update mission.");
    }
    setLoading(false);
  };

  return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Edit Mission Details</h3>
              
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mission Title</label>
                      <input 
                          type="text" 
                          required
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.title}
                          onChange={e => setData({...data, title: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                      <input 
                          type="text" 
                          required
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.location}
                          onChange={e => setData({...data, location: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Map URL (Optional)</label>
                      <input 
                          type="url" 
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                          value={data.mapUrl}
                          onChange={e => setData({...data, mapUrl: e.target.value})}
                          placeholder="https://caltopo.com/m/..."
                      />
                  </div>

                  <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                          {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                  </div>
              </form>
          </div>
      </div>
  );
}

export default EditMissionModal;
