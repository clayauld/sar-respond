import React, { useState, useEffect, useRef } from 'react';
import PocketBase from 'pocketbase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  AlertCircle, Map, Navigation, Users, CheckCircle2, 
  XCircle, Clock, Radio, LogOut, ShieldAlert, 
  ChevronRight, Upload, QrCode, Trash2, Lock, 
  Archive, RefreshCw, Key, UserCog, Pencil, FileDown
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeUsernameModal from './ChangeUsernameModal';
import EditMissionModal from './EditMissionModal';

// --- PocketBase Setup ---
// In the Docker setup, the frontend is served from the same origin as the API,
// so we can just pass the relative path or window.location.origin
const pb = new PocketBase(window.location.origin);

// --- Constants ---
const STATUS_OPTIONS = [
  { id: 'responding', label: 'Responding', color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle2 },
  { id: 'standby', label: 'Standby', color: 'bg-yellow-500 hover:bg-yellow-600', icon: Clock },
  { id: 'unavailable', label: 'Not Available', color: 'bg-red-600 hover:bg-red-700', icon: XCircle },
];

const ETA_PRESETS = [
  { label: '10m', minutes: 10 },
  { label: '20m', minutes: 20 },
  { label: '30m', minutes: 30 },
  { label: '40m', minutes: 40 },
  { label: '50m', minutes: 50 },
  { label: '60m', minutes: 60 },
];

// --- Helpers ---
const getFutureTime = (minutes) => {
  const now = new Date();
  const future = new Date(now.getTime() + minutes * 60000);
  return future.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDisplayTime = (timeStr, format) => {
    if (!timeStr || format === '24h') return timeStr;
    // Convert 24h "HH:MM" to 12h "h:MM PM"
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);

    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes.padStart(2, '0')} ${suffix}`;
};

// --- Coordinate Parser ---
const parseCoordinate = (input) => {
    if (!input || !input.trim()) return null;
    const clean = input.trim();

    // 1. DD: "61.10478, -149.79553"
    // Allow space or comma separator
    const ddMatch = clean.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (ddMatch) {
        return [parseFloat(ddMatch[1]), parseFloat(ddMatch[3])];
    }

    // 2. DDM: "61°06.287', -149°47.732'" or "61 06.287 -149 47.732"
    const parseDDMComponent = (str) => {
        // Matches: 61°06.287' or 61 06.287 or -149...
        // Support standard and smart quotes
        const match = str.match(/(-?\d+)[°\s]+(\d+(\.\d+)?)['’]?\s*([NSEW])?/i);
        if (!match) return null;
        let deg = parseFloat(match[1]);
        let min = parseFloat(match[2]);
        let dir = match[4];

        let val = Math.abs(deg) + (min / 60);
        if (deg < 0 || (dir && (dir.toUpperCase() === 'S' || dir.toUpperCase() === 'W'))) {
            val = -val;
        }
        return val;
    };

    // Try to split by comma first, as it's a more reliable separator
    let parts = clean.split(',');
    if (parts.length === 2) {
        const lat = parseDDMComponent(parts[0]);
        const lon = parseDDMComponent(parts[1]);
        if (lat !== null && lon !== null) return [lat, lon];
    }

    // If comma split fails, try splitting by space and check for 4 parts (DDM DDM)
    parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 4) {
        const lat = parseDDMComponent(`${parts[0]} ${parts[1]}`);
        const lon = parseDDMComponent(`${parts[2]} ${parts[3]}`);
        if (lat !== null && lon !== null) return [lat, lon];
    }

    return null;
};

// --- Main Component ---
export default function RescueRespond() {
  const [user, setUser] = useState(pb.authStore.model);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [showChangePw, setShowChangePw] = useState(pb.authStore.model?.requirePasswordReset || false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [timeFormat, setTimeFormat] = useState(localStorage.getItem('timeFormat') || '12h');

  // Persist time format preference
  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    // Listen to auth changes
    return pb.authStore.onChange((token, model) => {
      setUser(model);
      if (model?.requirePasswordReset) {
         setShowChangePw(true);
      }
    });
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
  };

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-2 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <img src="/sar-icon.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight hidden sm:block">{window._env_?.ORG_NAME || import.meta.env.ORG_NAME || 'SAR Group'}</h1>
              <h1 className="font-bold text-lg leading-tight sm:hidden">{window._env_?.ORG_ABBR || import.meta.env.ORG_ABBR || 'SAR'}</h1>
              <p className="text-xs text-slate-400">Response System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm">{user.name || user.username}</p>
              <div className="flex items-center justify-end gap-1">
                 <span className="text-xs text-slate-400 uppercase tracking-wider">{user.role || 'Member'}</span>
                 <span className="text-xs bg-slate-800 px-1 rounded text-slate-500 font-mono">#{user.memberId}</span>
              </div>
            </div>
            <button 
                onClick={() => setTimeFormat(prev => prev === '24h' ? '12h' : '24h')}
                className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition-colors flex items-center justify-center font-bold text-xs w-9 h-9 border border-slate-700"
                title={`Switch to ${timeFormat === '24h' ? '12h' : '24h'} time`}
            >
                {timeFormat === '24h' ? '24h' : '12h'}
            </button>
            <button 
                onClick={() => setShowChangeUsername(true)}
                className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                title="Change Username"
            >
                <UserCog className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setShowChangePw(true)}
                className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                title="Change Password"
            >
                <Key className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
        {user.role === 'Admin' ? (
            <AdminDashboard user={user} timeFormat={timeFormat} />
        ) : (
            <MissionControl user={user} timeFormat={timeFormat} />
        )}
      </main>

      {showChangePw && (
          <ChangePasswordModal 
            user={user} 
            pb={pb} 
            onClose={() => setShowChangePw(false)} 
            force={user && user.requirePasswordReset}
          />
      )}

      {showChangeUsername && (
          <ChangeUsernameModal 
            user={user} 
            pb={pb} 
            onClose={() => setShowChangeUsername(false)}
            onUpdate={(updatedUser) => setUser(updatedUser)} 
          />
      )}
    </div>
  );
}

// --- Screens ---

function LoginScreen() {
  const [memberId, setMemberId] = useState(() => {
      // Auto-fill from URL for QR codes
      const params = new URLSearchParams(window.location.search);
      return params.get('u') || '';
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In PocketBase, we authenticate with username (which we set to memberId) or email
      // We assume username = memberId
      await pb.collection('users').authWithPassword(memberId, password);
    } catch (err) {
      console.error(err);
      setError("Invalid ID or Password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden z-10">
        <div className="bg-red-600 p-6 text-center flex flex-col items-center">
          <img src="/sar-icon.png" alt="Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-md" />
          <h1 className="text-2xl font-bold text-white">{window._env_?.ORG_ABBR || import.meta.env.ORG_ABBR || 'SAR'} Login</h1>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-800 text-sm rounded border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email or Username</label>
            <div className="relative">
              <input 
                type="text" 
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                autoComplete="username"
                className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="user@example.com"
              />
              <Users className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="••••••"
              />
              <Key className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
            <p className="text-xs text-slate-400 mt-2">Default password is your mobile phone number (digits only).</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-transform active:scale-95 shadow-lg"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ user, timeFormat }) {
  const [activeTab, setActiveTab] = useState('missions');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('missions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'missions' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Radio className="w-4 h-4" />
          Mission Control
        </button>
        <button 
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'roster' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Users className="w-4 h-4" />
          Member Roster
        </button>
      </div>

      {activeTab === 'missions' ? (
         <MissionControl user={user} timeFormat={timeFormat} />
      ) : (
         <RosterManager />
      )}
    </div>
  );
}

function RosterManager() {
  const [members, setMembers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const fileInputRef = useRef(null);

  const fetchMembers = async () => {
    try {
      // In PocketBase 'users' is the collection name
      const records = await pb.collection('users').getFullList({ sort: 'name', requestKey: null });
      setMembers(records);
    } catch (err) {
      console.error("Error fetching members", err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);





  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    let usersToImport = [];

    try {
      const text = await file.text();
      
      // Robust CSV Parser handling multiline quotes
      const parseCSV = (input) => {
          const rows = [];
          let currentRow = [];
          let currentField = '';
          let insideQuotes = false;
          
          for (let i = 0; i < input.length; i++) {
              const char = input[i];
              const nextChar = input[i + 1];

              if (char === '"') {
                  if (insideQuotes && nextChar === '"') {
                      // Escaped quote ("") -> literal quote
                      currentField += '"';
                      i++;
                  } else {
                      // Toggle quote state
                      insideQuotes = !insideQuotes;
                  }
              } else if (char === ',' && !insideQuotes) {
                  // Field separator
                  currentRow.push(currentField.trim());
                  currentField = '';
              } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                  // Row separator
                  // Handle potential \r\n
                  if (char === '\r' && nextChar === '\n') i++;
                  
                  if (currentField || currentRow.length > 0) {
                      currentRow.push(currentField.trim());
                      rows.push(currentRow);
                  }
                  currentRow = [];
                  currentField = '';
              } else {
                  currentField += char;
              }
          }
          // Push last row
          if (currentField || currentRow.length > 0) {
              currentRow.push(currentField.trim());
              rows.push(currentRow);
          }
          return rows;
      };

      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("File too short");

      // 1. Headers
      const headers = rows[0];
      const idxName = headers.findIndex(h => h === 'Name');
      const idxPos = headers.findIndex(h => h === 'Position');
      const idxRef = headers.findIndex(h => h === 'Reference');
      const idxStatus = headers.findIndex(h => h === 'Status');
      const idxEmail = headers.findIndex(h => h === 'Email');
      const idxMobile = headers.findIndex(h => h === 'Mobile Phone');
      const idxHome = headers.findIndex(h => h === 'Home Phone'); 

      // Fallback: Check if "Status" is actually "MemberCategory" or something else if needed
      // based on file provided, Headers are "Name","Position","Reference","Email"..."Status"
      
      if (idxName === -1 || idxPos === -1 || idxRef === -1 || idxStatus === -1) {
          throw new Error("Missing required columns: Name, Position, Reference, Status");
      }

      for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (cols.length < headers.length) continue; // Skip empty/malformed rows

          const status = cols[idxStatus] || '';
          const position = cols[idxPos] || '';
          let memberId = cols[idxRef] || '';
          const name = cols[idxName] || '';
          const email = (cols[idxEmail] || '').trim();
          
          let phone = (cols[idxMobile] || cols[idxHome] || '').replace(/\D/g, ''); // Extract digits only
          if (phone.length > 10 && phone.startsWith('1')) {
              phone = phone.substring(1);
          }

          // 2. Filter: Only "Operational..." or "Prospective"
          // AND must have a valid Member ID
          // if (!memberId) continue;
          
          // // Fix: PocketBase requires min 3 chars for username
          // if (memberId.length < 3) {
          //     memberId = memberId.padStart(3, '0');
          // }
          
          // Password Strategy: Phone (min 8 chars) -> Fallback: "password" + memberId
          let password = phone && phone.length >= 8 ? phone : ("password" + memberId);
          
          // Username Strategy: First Initial + Last Name (lowercase)
          // Exception: Jose Ramos-Leon -> "kakiko"
          let username = '';
          
          if (name === "Jose Ramos-Leon") {
              username = "kakiko";
          } else if (name) {
              const parts = name.trim().split(' ');
              if (parts.length > 0) {
                  const first = parts[0].replace(/[^a-zA-Z]/g, '').toLowerCase();
                  const last = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '').toLowerCase();
                  if (first && last) {
                      username = (first[0] + last);
                  }
              }
          }
          
          // Fallback if no email or prefix too short
          if (!username) {
              username = memberId;
          }
          
          const isOperational = status.startsWith('Operational');
          const isProspective = status.startsWith('Prospective');

          if (isOperational || isProspective) {
             // 3. Determine Role
             // Admin if "AR" or "Board" in Position
             const isAdmin = position.includes('AR') || position.includes('Board');
             const role = isAdmin ? 'Admin' : 'Responder';

             usersToImport.push({
                 name,
                 memberId,
                 role,
                 email,
                 password,
                 username
             });
          }
      }

      let count = 0;
      let errors = 0;
      let lastError = "";
      
          for (let user of usersToImport) {
         try {
           await pb.collection('users').create({
             username: user.username, 
             email: user.email,
             emailVisibility: false,
             password: user.password,
             passwordConfirm: user.password,
             name: user.name,
             memberId: user.memberId,
             role: user.role,
             requirePasswordReset: true
           });
           count++;
         } catch (err) {
           // Handle Username duplicates (common with "jsmith")
           if (err.data?.data?.username?.code === 'validation_is_unique') {
               try {
                   // Retry with ID appended
                   const newUsername = user.username + user.memberId;
                   await pb.collection('users').create({
                        ...user, 
                        username: newUsername,
                        email: user.email,
                        emailVisibility: false,
                        password: user.password,
                        passwordConfirm: user.password,
                        name: user.name,
                        memberId: user.memberId,
                        role: user.role,
                        requirePasswordReset: true
                   });
                   count++;
                   console.log(`Resolved duplicate username for ${user.name}: ${newUsername}`);
                   continue; // Success on retry
               } catch (retryErr) {
                   console.error(`Failed retry for ${user.name}`, retryErr);
                   lastError = retryErr.message;
                   errors++;
               }
           } else {
               console.error(`Failed to import ${user.name}:`, err, err.data);
               // Handle specific unique constraint error
               if (err.data?.data?.username?.code === 'validation_is_unique') {
                   // Duplicate, ignore (or count as existing)
                   errors++; 
               } else {
                   lastError = (err.message || JSON.stringify(err)) + (err.data ? " " + JSON.stringify(err.data) : "");
                   errors++;
               }
           }
         }
      }

      let msg = `Import complete.\nSuccess: ${count}\nFailed/Duplicate: ${errors}`;
      if (lastError) msg += `\n\nLast Error: ${lastError}`;
      alert(msg);
    } catch (err) {
      console.error("Import error:", err);
      alert("Error parsing file: " + err.message);
    }

    setUploading(false);
    fetchMembers();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteMember = async (id) => {
    if(!confirm('Delete this user?')) return;
    await pb.collection('users').delete(id);
    fetchMembers();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Team Roster</h2>
        <div className="flex gap-2">
            <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
                {uploading ? <Radio className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>}
                Import CSV
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-bold uppercase text-xs">
                <tr>
                    <th className="p-3 rounded-tl-lg">Name</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 rounded-tr-lg text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {members.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-900">{member.name}</td>
                        <td className="p-3 font-mono">{member.memberId}</td>
                        <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${member.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                {member.role}
                            </span>
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                            <button 
                                onClick={() => setSelectedMember(member)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900" 
                            >
                                <QrCode className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => deleteMember(member.id)}
                                className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {selectedMember && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedMember.name}</h3>
                  <p className="text-slate-500 mb-6 font-mono text-sm">ID: {selectedMember.memberId}</p>
                  
                  <div className="bg-white border-2 border-slate-900 p-2 rounded-lg inline-block mb-6">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?u=${selectedMember.memberId}`)}`}
                        alt="Login QR"
                        className="w-48 h-48"
                      />
                  </div>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-xl transition-colors"
                  >
                      Done
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}

function MissionControl({ user, timeFormat }) {
  const [activeMission, setActiveMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showEditMission, setShowEditMission] = useState(false);

  // Realtime Active Mission Listener
  useEffect(() => {
    // 1. Initial Fetch
    const fetchMission = async () => {
      try {
        // Find the most recent active mission
        const result = await pb.collection('missions').getList(1, 1, {
          filter: 'status = "active"',
          sort: '-created',
          requestKey: null
        });
        setActiveMission(result.items[0] || null);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchMission();

    // 2. Subscribe to changes
    pb.collection('missions').subscribe('*', function (e) {
      setActiveMission(prev => {
        if (e.action === 'create' && e.record.status === 'active') {
          return e.record;
        }
        if (e.action === 'update') {
          if (e.record.status === 'closed' && prev?.id === e.record.id) {
            return null;
          } else if (e.record.status === 'active') {
             // If we already have an active mission, usually we only update it if ID matches, 
             // but here we seem to allow switching or updating the current one.
             // Match original logic: always set.
             return e.record;
          }
        }
        if (e.action === 'delete' && prev?.id === e.record.id) {
          return null;
        }
        return prev;
      });
    });

    return () => {
      pb.collection('missions').unsubscribe('*');
    };
  }, []);

  const handleEndMission = async () => {
    if (!window.confirm("Close ALL active missions?")) return;
    setClosing(true);
    try {
      // Find ALL active missions to ensure no ghosts
      const actives = await pb.collection('missions').getFullList({ filter: 'status = "active"' });
      for (let m of actives) {
        await pb.collection('missions').update(m.id, { status: 'closed' });
      }
    } catch {
      alert("Error closing missions");
    }
    setClosing(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Syncing...</div>;

  if (!activeMission) {
    return (
      <div className="space-y-6">
        {user.role === 'Admin' ? (
          <CreateMissionForm user={user} />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">All Clear</h2>
            <p className="text-slate-500 max-w-md">No active callouts.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mission Details Header */}
      <div className="bg-white rounded-2xl shadow-sm border-l-8 border-red-600 overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse mb-1">
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                  ACTIVE CALLOUT
                </span>
                <h2 className="text-xl sm:text-3xl font-bold text-slate-900">{activeMission.title}</h2>
              </div>
              <div className="flex gap-2">
                  {user.role === 'Admin' && (
                    <button 
                      onClick={() => setShowEditMission(true)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors border border-slate-200"
                      title="Edit Mission Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {user.role === 'Admin' && (
                    <button 
                      onClick={handleEndMission}
                      disabled={closing}
                      className="text-xs bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-3 py-2 rounded font-medium transition-colors border border-slate-200"
                    >
                      {closing ? "Closing..." : "End Mission"}
                    </button>
                  )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex-grow">
                    <Navigation className="w-6 h-6 text-slate-400 mt-1 shrink-0" />
                    <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Location</p>
                    <p className="text-base font-medium text-slate-800">{activeMission.location}</p>
                    </div>
                </div>

                {activeMission.mapUrl && (
                    <a
                    href={activeMission.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 font-bold hover:bg-blue-100 transition-colors text-sm whitespace-nowrap self-start sm:self-auto"
                    >
                    <Map className="w-4 h-4" />
                    CalTopo Map
                    </a>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Roster (Priority) */}
        <div className="lg:col-span-2 order-1">
             <LiveRoster activeMission={activeMission} timeFormat={timeFormat} />
        </div>

        {/* Right: Actions */}
        <div className="lg:col-span-1 order-2">
             <ResponderActions activeMission={activeMission} user={user} />
        </div>
      </div>

      {showEditMission && (
          <EditMissionModal 
            mission={activeMission}
            pb={pb}
            onClose={() => setShowEditMission(false)}
            onUpdate={(updated) => setActiveMission(updated)}
          />
      )}
    </div>
  );
}

function CreateMissionForm() {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [mapUrl, setMapUrl] = useState('');

  // Unified inputs
  const [lkpInput, setLkpInput] = useState('');
  const [icpInput, setIcpInput] = useState('');

  // Validation state
  const [inputErrors, setInputErrors] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleStart = async (e) => {
    e.preventDefault();
    if (!title || !location) return;
    
    // Clear previous errors
    setInputErrors({});
    
    setIsSubmitting(true);
    setStatusMsg('');
    
    let finalMapUrl = mapUrl;

    // Auto-create map if URL is empty
    if (!finalMapUrl) {
        setStatusMsg("Parsing coordinates...");

        const lkp = parseCoordinate(lkpInput);
        const icp = parseCoordinate(icpInput);
        
        let errors = {};

        if (lkpInput && !lkp) {
            errors.lkp = "Invalid format. Try DDM (61°06.28 -149°47.73) or DD.";
        }
        if (icpInput && !icp) {
            errors.icp = "Invalid format. Try DDM (61°06.28 -149°47.73) or DD.";
        }
        
        if (Object.keys(errors).length > 0) {
            setInputErrors(errors);
            setIsSubmitting(false);
            return;
        }

        setStatusMsg("Creating CalTopo Map...");
        try {
            // Use relative path to leverage Vite proxy (dev) or Nginx (prod)
            const res = await fetch('/api/caltopo/create-map', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({
                    title,
                    location,
                    lkp, // [lat, lon]
                    icp  // [lat, lon]
                })
            });


            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Map creation failed");
            }
            
            const data = await res.json();
            finalMapUrl = data.map_url;
            setStatusMsg("Map created! Launching mission...");
        } catch (err) {
            console.error("Map creation error", err);
            const proceed = window.confirm(`Failed to auto-create map: ${err.message}\n\nProceed without a map?`);
            if (!proceed) {
                setIsSubmitting(false);
                setStatusMsg("Cancelled.");
                return;
            }
        }
    }

    try {
      await pb.collection('missions').create({
        title,
        location,
        mapUrl: finalMapUrl,
        status: 'active'
      });
      setTitle(''); setLocation(''); setMapUrl('');
      setLkpInput(''); setIcpInput('');
      setStatusMsg('');
    } catch (err) {
      console.error(err);
      alert(`Error creating mission: ${err.message || JSON.stringify(err)}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-red-600" />
        Initiate New Callout
      </h2>
      <form onSubmit={handleStart} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Mission Title</label>
          <input 
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400" 
            placeholder={window._env_?.MISSION_TITLE_PLACEHOLDER || "e.g. Overdue Hiker - Lost Mountain"}
            value={title} onChange={e => setTitle(e.target.value)} required
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Response Location (ICP)</label>
          <input 
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400" 
            placeholder={window._env_?.MISSION_LOCATION_PLACEHOLDER || "e.g. Trailhead Parking Lot"}
            value={location} onChange={e => setLocation(e.target.value)} required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ICP Coordinate (Optional)</label>
              <input
                className={`w-full p-3 border rounded-xl outline-none transition-all font-mono text-sm ${inputErrors.icp ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'}`}
                placeholder="DDM or DD (e.g. 61°06.28' ...)"
                value={icpInput} onChange={e => {
                    setIcpInput(e.target.value);
                    if (inputErrors.icp) setInputErrors({...inputErrors, icp: null});
                }}
              />
              {inputErrors.icp && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">{inputErrors.icp}</p>
              )}
              {!inputErrors.icp && (
                  <p className="text-xs text-slate-400 mt-1">
                      Point will be added to the map if provided
                  </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">LKP Coordinate (Optional)</label>
              <input
                className={`w-full p-3 border rounded-xl outline-none transition-all font-mono text-sm ${inputErrors.lkp ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'}`}
                placeholder="DDM or DD (e.g. 61°06.28' -149°47.73')"
                value={lkpInput} onChange={e => {
                    setLkpInput(e.target.value);
                    if (inputErrors.lkp) setInputErrors({...inputErrors, lkp: null});
                }}
              />
              {inputErrors.lkp && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">{inputErrors.lkp}</p>
              )}
              {!inputErrors.lkp && (
                  <p className="text-xs text-slate-400 mt-1">
                      Preferred: DDM (61°06.28 -149°47.73)
                  </p>
              )}
            </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Map URL <span className="text-slate-400 font-normal ml-1">(Optional override)</span>
          </label>
          <input 
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400" 
            placeholder="Leave empty to auto-create CalTopo map..."
            value={mapUrl} onChange={e => setMapUrl(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
              If left blank, a new map will be generated in the Team Account.
          </p>
        </div>
        
        <button 
          disabled={isSubmitting} 
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-200 active:scale-[0.99] flex items-center justify-center gap-2"
        >
            {isSubmitting ? (
                <span>{statusMsg || 'Processing...'}</span>
            ) : (
                <>
                    <Radio className="w-5 h-5 animate-pulse" />
                    BROADCAST ALERT
                </>
            )}
        </button>
      </form>
    </div>
  );
}

function ResponderActions({ activeMission, user }) {
  const [myResponse, setMyResponse] = useState(null);
  const [eta, setEta] = useState(''); 

  useEffect(() => {
    // 1. Initial Fetch
    const fetchMyResponse = async () => {
        try {
            // Robust Fetch: Get ALL responses for mission, find mine in memory
            // Avoids complex filter strings that might be failing on some devices
            const list = await pb.collection('responses').getFullList({
                filter: `mission = "${activeMission.id}"`,
                sort: '-created',
                requestKey: null // Disable auto-cancellation
            });
            const myRec = list.find(r => r.user === user.id);
            
            if (myRec) {
                setMyResponse(myRec);
                if (myRec.eta) setEta(myRec.eta);
            } else {
                setMyResponse(null);
            }
        } catch {
            console.log("No previous response found");
        }
    };
    fetchMyResponse();

    // 2. Realtime Subscription for MY response (Sync across devices)
    pb.collection('responses').subscribe('*', function (e) {
        // Only care about records related to ME and this MISSION
        if (e.record.user === user.id && e.record.mission === activeMission.id) {
            if (e.action === 'delete') {
                setMyResponse(null);
            } else {
                setMyResponse(e.record);
                if (e.record.eta) setEta(e.record.eta);
            }
        }
    });

    return () => {
        pb.collection('responses').unsubscribe('*');
    };
  }, [activeMission, user]);

  const updateStatus = async (statusId, specificEta = null) => {
    let finalEta = '';
    if (statusId === 'responding') {
        finalEta = specificEta !== null ? specificEta : eta;
        if (!finalEta.trim()) finalEta = 'TBD';
    }

    // --- Optimistic UI Update ---
    // 1. Snapshot previous state in case we need to rollback
    const previousResponse = myResponse;
    const previousEta = eta;

    // 2. Update UI *immediately*
    // Construct a temporary "fake" record to show in the UI instantly
    const optimisticRecord = {
        ...(myResponse || {}), // Keep existing ID/fields if we have them
        id: myResponse?.id || 'optimistic_temp_id', // Temp ID if creating new
        user: user.id,
        mission: activeMission.id,
        status: statusId,
        eta: finalEta,
        updated: new Date().toISOString(), // Valid date for sorting
        created: myResponse?.created || new Date().toISOString()
    };
    
    setMyResponse(optimisticRecord);
    if (finalEta) setEta(finalEta);
    // -----------------------------

    try {
        // "Upsert" Pattern: Always fetch latest state from DB before writing
        let recordToUpdate = previousResponse; // Use the *real* previous state, not the optimistic one

        // Robust Re-check if we didn't have a record before
        if (!recordToUpdate || recordToUpdate.id === 'optimistic_temp_id') {
             const list = await pb.collection('responses').getFullList({
                filter: `mission = "${activeMission.id}"`,
                requestKey: null // Disable auto-cancellation
            });
            recordToUpdate = list.find(r => r.user === user.id);
        }

        if (recordToUpdate) {
            // Update existing
            const rec = await pb.collection('responses').update(recordToUpdate.id, {
                status: statusId,
                eta: finalEta
            }, { requestKey: null });
            // Update state with the *real* server response
            setMyResponse(rec); 
        } else {
            // Create new
            try {
                const rec = await pb.collection('responses').create({
                    mission: activeMission.id,
                    user: user.id,
                    status: statusId,
                    eta: finalEta
                }, { requestKey: null });
                setMyResponse(rec);
            } catch (err) {
                console.log("Create failed, trying update (race condition handling)...");
                
                // FALLBACK: Robust memory check
                const list = await pb.collection('responses').getFullList({
                    filter: `mission = "${activeMission.id}"`,
                    requestKey: null
                });
                const existing = list.find(r => r.user === user.id);

                if (existing) {
                    const rec = await pb.collection('responses').update(existing.id, {
                        status: statusId,
                        eta: finalEta
                    }, { requestKey: null });
                    setMyResponse(rec);
                } else {
                    throw err; // Genuine error
                }
            }
        }
    } catch (err) {
        console.error("Error updating status", err);
        
        // --- Rollback on Error ---
        setMyResponse(previousResponse);
        setEta(previousEta);
        // -------------------------

        // Clean error message if it is an autocancel (though we tried to prevent it)
        const msg = err.isAbort ? "Request cancelled (clicked too fast?). Try again." : err.message;
        alert(`Failed to update status. Error: ${msg}`);
    }
  };

  const handleEtaClick = (minutes) => {
    const time = getFutureTime(minutes);
    setEta(time);
    if (myResponse?.status === 'responding') updateStatus('responding', time);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Update Status</h3>
      
      <div className="mb-3 flex gap-2 flex-wrap">
        {ETA_PRESETS.map(p => (
            <button key={p.label} onClick={() => handleEtaClick(p.minutes)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-bold">
                {p.label}
            </button>
        ))}
        <input value={eta} onChange={e=>setEta(e.target.value)} placeholder="Manual ETA" className="px-3 py-2 border rounded w-24 text-sm" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STATUS_OPTIONS.map((opt, index) => {
            const isSelected = myResponse?.status === opt.id;
            const Icon = opt.icon;
            // Make the first item (Responding) full width on mobile (col-span-2) to avoid holes
            const mobileColSpan = index === 0 ? 'col-span-2' : 'col-span-1';
            
            return (
                <button
                    key={opt.id}
                    onClick={() => updateStatus(opt.id)}
                    className={`${mobileColSpan} sm:col-span-1 p-3 rounded-lg border flex flex-row sm:flex-col items-center justify-center gap-2 ${isSelected ? `${opt.color} text-white border-transparent` : 'bg-white text-slate-600'}`}
                >
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                    <span className="font-bold text-sm sm:text-base">{opt.label}</span>
                </button>
            )
        })}
      </div>
    </div>
  );
}

function LiveRoster({ activeMission, timeFormat }) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const fetchResponses = async () => {
        try {
            // "expand" param lets us get the User details (name, role) in the same query
            const list = await pb.collection('responses').getFullList({
                filter: `mission = "${activeMission.id}"`,
                expand: 'user',
                requestKey: null
            });
            setResponses(list);
        } catch (e) { console.error(e) }
    };
    fetchResponses();

    pb.collection('responses').subscribe('*', async (e) => {
        // Simple strategy: Reload list on any change to this mission's responses.
        // Checking if the event relates to this mission requires checking e.record.mission
        if (e.record.mission === activeMission.id) {
            fetchResponses();
        }
    });

    return () => pb.collection('responses').unsubscribe('*');
  }, [activeMission]);

  // Sort: Responding -> Standby -> Unavailable
  // Helper to parse "HH:MM" (24h) into minutes from midnight
  const parseTime = (timeStr) => {
    if (!timeStr) return 99999;
    const [hours, minutes] = timeStr.split(':');
    return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  };

  const getMinutesFromNow = (targetMinutes) => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Calculate difference
      let diff = targetMinutes - currentMinutes;
      
      // If result is negative (e.g. target 00:30, now 23:00 -> -1350), 
      // AND the difference is large (more than 12 hours ago), assume it's tomorrow (+1440).
      // If it's small negative (e.g. -5), it might just be someone physically late, 
      // but simpler to treat all "past" times as "tomorrow" if they are responding? 
      // Actually, standard logic: "Next occurrence of this time".
      if (diff < -600) { // If time is > 10 hours ago, treat as next day
          diff += 1440;
      }
      // If time appears to be in the past but close (e.g. 5 mins ago), keep it as is (negative or small positive after modulo).
      // Better robust logic:
      // (target - current + 1440) % 1440 gives minutes until next occurrence.
      // But we want "00:30" (tomorrow) to be > "23:45" (tonight).
      // So:
      let distance = (targetMinutes - currentMinutes + 1440) % 1440;
      // Edge case: If user enters a time that was 5 min ago, this formula says it's in 23h 55m.
      // We probably want to respect "past" times as "immediate". 
      // Let's assume users enter future times.
      return distance;
  };

  const sorted = [...responses].sort((a,b) => {
    const statusOrder = { responding: 0, standby: 1, unavailable: 2 };
    
    const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    if (a.status === 'responding' && b.status === 'responding') {
        const distA = getMinutesFromNow(parseTime(a.eta));
        const distB = getMinutesFromNow(parseTime(b.eta));
        return distA - distB;
    }
    
    return 0;
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(activeMission.title, 14, 20);
    doc.setFontSize(12);
    doc.text(`Location: ${activeMission.location}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 34);

    // Table Data
    const tableData = sorted.map(res => {
        const user = res.expand?.user || { name: 'Unknown', role: '?', memberId: '?' };
        const statusConfig = STATUS_OPTIONS.find(o => o.id === res.status) || STATUS_OPTIONS[0];

        return [
            user.name,
            user.role,
            user.memberId,
            statusConfig.label,
            res.status === 'responding' ? formatDisplayTime(res.eta, timeFormat) : '-'
        ];
    });

    autoTable(doc, {
        startY: 40,
        head: [['Name', 'Role', 'ID', 'Status', 'ETA']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }, // Red header
    });

    doc.save(`Roster_${activeMission.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
       <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold flex justify-between items-center">
         <span>Roster ({sorted.length})</span>
         <button
           onClick={handleExportPDF}
           className="flex items-center gap-1 text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1.5 rounded font-bold text-slate-700 transition-colors"
           title="Export as PDF"
         >
           <FileDown className="w-3 h-3" />
           PDF
         </button>
       </div>
       <div className="flex-grow overflow-y-auto p-2 space-y-2 max-h-[500px]">
         {sorted.map(res => {
             const user = res.expand?.user || { name: 'Unknown', role: '?' };
             const statusConfig = STATUS_OPTIONS.find(o => o.id === res.status) || STATUS_OPTIONS[0];
             const StatusIcon = statusConfig.icon;
             return (
                 <div key={res.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3">
                        <StatusIcon className={`w-5 h-5 ${res.status === 'responding' ? 'text-green-600' : 'text-slate-400'}`} />
                        <div>
                            <div className="font-bold text-sm">{user.name}</div>
                            <div className="text-xs text-slate-500">{user.role} #{user.memberId}</div>
                        </div>
                    </div>
                    {res.status === 'responding' && <div className="font-mono font-bold text-slate-700">{formatDisplayTime(res.eta, timeFormat)}</div>}
                 </div>
             )
         })}
       </div>
    </div>
  );
}