import React, { Component, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  serverTimestamp, 
  updateDoc,
  addDoc,
  FirebaseUser
} from './firebase';
import { UserProfile, UserRole, UserStatus, Job, JobStatus, Locomotive, TractionMotor, InventoryItem } from './types';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  History, 
  UserCheck, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Train, 
  Settings,
  Menu,
  X,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Components ---

const Login = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-12 rounded-[2rem] shadow-2xl max-w-md w-full text-center relative z-10"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <Train className="w-10 h-10 text-emerald-500" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Loco Shed GZB</h1>
        <p className="text-zinc-400 mb-10 text-lg">E-3 Traction Motor Section Management</p>
        
        <button 
          onClick={handleLogin}
          className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/5"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-zinc-500 text-sm">
          Authorized personnel only. Northern Railway.
        </p>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ role, activeTab, setActiveTab, user }: { role: UserRole, activeTab: string, setActiveTab: (tab: string) => void, user: UserProfile }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['supervisor', 'store', 'staff'] },
    { id: 'attendance', label: 'Attendance', icon: UserCheck, roles: ['supervisor', 'staff'] },
    { id: 'booking', label: 'Job Booking', icon: ClipboardList, roles: ['supervisor', 'staff'] },
    { id: 'inventory', label: 'Store & Scrap', icon: Package, roles: ['supervisor', 'store'] },
    { id: 'history', label: 'Loco History', icon: History, roles: ['supervisor', 'staff'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['supervisor'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="w-72 bg-zinc-950 border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-8 flex items-center gap-4 border-b border-white/5">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
          <Train className="w-6 h-6 text-emerald-500" />
        </div>
        <span className="font-bold text-white text-xl tracking-tight">Loco Shed</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
              activeTab === item.id 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{user.name}</p>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-4 px-6 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Create default profile for new users (default to staff)
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Unknown',
            email: firebaseUser.email || '',
            role: 'staff',
            status: 'pending_approval',
            lastStatusUpdate: new Date().toISOString()
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/40"
        >
          <Train className="w-8 h-8 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500/30">
      <Sidebar 
        role={profile.role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={profile}
      />
      
      <main className="flex-1 p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <Dashboard profile={profile} />}
            {activeTab === 'attendance' && <Attendance profile={profile} />}
            {activeTab === 'booking' && <Booking profile={profile} />}
            {activeTab === 'inventory' && <Inventory profile={profile} />}
            {activeTab === 'history' && <HistoryView profile={profile} />}
            {activeTab === 'settings' && <SettingsView profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Views ---

const Dashboard = ({ profile }: { profile: UserProfile }) => {
  const [stats, setStats] = useState({
    locos: 0,
    activeJobs: 0,
    presentStaff: 0,
    lowStock: 0
  });

  useEffect(() => {
    // Real-time stats
    const unsubLocos = onSnapshot(collection(db, 'locomotives'), (snap) => {
      setStats(prev => ({ ...prev, locos: snap.size }));
    });
    const unsubJobs = onSnapshot(query(collection(db, 'jobs'), where('status', '!=', 'approved')), (snap) => {
      setStats(prev => ({ ...prev, activeJobs: snap.size }));
    });
    const unsubStaff = onSnapshot(query(collection(db, 'users'), where('status', '==', 'duty')), (snap) => {
      setStats(prev => ({ ...prev, presentStaff: snap.size }));
    });

    return () => {
      unsubLocos();
      unsubJobs();
      unsubStaff();
    };
  }, []);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, {profile.name.split(' ')[0]}</h1>
        <p className="text-zinc-500 text-lg">Here's what's happening in the shed today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Locos', value: stats.locos, icon: Train, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Active Jobs', value: stats.activeJobs, icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Staff on Duty', value: stats.presentStaff, icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Low Stock Items', value: stats.lowStock, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-6`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-zinc-500 font-medium mb-1">{stat.label}</p>
            <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-500" />
            Recent Activity
          </h2>
          <div className="space-y-6">
            {/* Mock recent activity for now */}
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                <div>
                  <p className="text-zinc-300">Loco 35042 IA Schedule started</p>
                  <p className="text-zinc-500 text-sm">2 hours ago by SSE Sharma</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Pending Approvals
          </h2>
          <div className="space-y-4">
            <p className="text-zinc-500 italic">No pending approvals at the moment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Attendance = ({ profile }: { profile: UserProfile }) => {
  const [status, setStatus] = useState<UserStatus>(profile.status);
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (profile.role === 'supervisor') {
      const unsub = onSnapshot(query(collection(db, 'users'), where('status', '==', 'pending_approval')), (snap) => {
        setPendingRequests(snap.docs.map(d => d.data() as UserProfile));
      });
      return () => unsub();
    }
  }, [profile.role]);

  const updateStatus = async (newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        status: newStatus,
        lastStatusUpdate: new Date().toISOString()
      });
      setStatus(newStatus);
    } catch (error) {
      console.error("Status update failed", error);
    }
  };

  const approveStatus = async (uid: string, approvedStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: approvedStatus,
        lastStatusUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Approval failed", error);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Attendance</h1>
        <p className="text-zinc-500 text-lg">Manage your daily duty status.</p>
      </header>

      <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl max-w-2xl">
        <h2 className="text-xl font-bold mb-8">Your Current Status: <span className="text-emerald-500 capitalize">{status.replace('_', ' ')}</span></h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'duty', label: 'Coming on Duty', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
            { id: 'leave', label: 'On Leave', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
            { id: 'sick', label: 'On Sick', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
            { id: 'absent', label: 'Absent', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => updateStatus(opt.id as UserStatus)}
              className={`p-6 rounded-2xl border transition-all text-left ${
                status === opt.id ? opt.color : 'bg-zinc-800/50 text-zinc-400 border-white/5 hover:bg-zinc-800'
              }`}
            >
              <span className="font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {profile.role === 'supervisor' && pendingRequests.length > 0 && (
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
          <h2 className="text-xl font-bold mb-6">Pending Status Approvals</h2>
          <div className="space-y-4">
            {pendingRequests.map(req => (
              <div key={req.uid} className="flex items-center justify-between p-6 bg-zinc-800/50 rounded-2xl border border-white/5">
                <div>
                  <p className="font-bold text-lg">{req.name}</p>
                  <p className="text-zinc-500">Token: {req.tokenNumber || 'N/A'}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => approveStatus(req.uid, 'duty')}
                    className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-emerald-400 transition-colors"
                  >
                    Approve Duty
                  </button>
                  <button 
                    onClick={() => approveStatus(req.uid, 'absent')}
                    className="bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-600 transition-colors"
                  >
                    Mark Absent
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Booking = ({ profile }: { profile: UserProfile }) => {
  const [locos, setLocos] = useState<Locomotive[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [selectedLoco, setSelectedLoco] = useState('');
  const [taskType, setTaskType] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [place, setPlace] = useState('');

  useEffect(() => {
    const unsubLocos = onSnapshot(collection(db, 'locomotives'), (snap) => {
      setLocos(snap.docs.map(d => d.data() as Locomotive));
    });
    const unsubStaff = onSnapshot(query(collection(db, 'users'), where('status', '==', 'duty')), (snap) => {
      setStaff(snap.docs.map(d => d.data() as UserProfile));
    });
    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Job));
    });

    return () => {
      unsubLocos();
      unsubStaff();
      unsubJobs();
    };
  }, []);

  const handleBook = async () => {
    if (!selectedLoco || !taskType || selectedStaff.length === 0) return;
    
    try {
      await addDoc(collection(db, 'jobs'), {
        locoId: selectedLoco,
        taskType,
        staffIds: selectedStaff,
        place,
        status: 'booked',
        bookedBy: profile.uid,
        timestamp: new Date().toISOString()
      });
      setShowAdd(false);
      setSelectedStaff([]);
      setTaskType('');
    } catch (error) {
      console.error("Booking failed", error);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: JobStatus) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: newStatus,
        approvedBy: newStatus === 'approved' ? profile.uid : undefined
      });
    } catch (error) {
      console.error("Job update failed", error);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Job Booking</h1>
          <p className="text-zinc-500 text-lg">Assign and monitor daily maintenance tasks.</p>
        </div>
        {profile.role === 'supervisor' && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            New Booking
          </button>
        )}
      </header>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Locomotive</label>
              <select 
                value={selectedLoco}
                onChange={(e) => setSelectedLoco(e.target.value)}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Loco</option>
                {locos.map(l => <option key={l.locoNumber} value={l.locoNumber}>{l.locoNumber} ({l.type})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Task Type</label>
              <select 
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Task</option>
                <option value="IA Schedule">IA Schedule</option>
                <option value="IB Schedule">IB Schedule</option>
                <option value="IC Schedule">IC Schedule</option>
                <option value="MOH">MOH</option>
                <option value="IOH">IOH</option>
                <option value="Connection Work">Connection Work</option>
                <option value="Motor Overhauling">Motor Overhauling</option>
                <option value="Unscheduled Repair">Unscheduled Repair</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Place</label>
              <input 
                type="text"
                placeholder="e.g. Pit 1, Floor"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Staff</label>
              <div className="max-h-32 overflow-y-auto bg-zinc-800 border border-white/5 rounded-xl p-2">
                {staff.map(s => (
                  <label key={s.uid} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedStaff.includes(s.uid)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedStaff([...selectedStaff, s.uid]);
                        else setSelectedStaff(selectedStaff.filter(id => id !== s.uid));
                      }}
                      className="accent-emerald-500"
                    />
                    <span className="text-sm">{s.name} ({s.tokenNumber})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button onClick={() => setShowAdd(false)} className="px-6 py-3 text-zinc-400 font-bold hover:text-white transition-colors">Cancel</button>
            <button onClick={handleBook} className="bg-emerald-500 text-black px-10 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-colors">Confirm Booking</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Active Jobs</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {jobs.filter(j => j.status !== 'approved').map(job => (
            <div key={job.id} className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl flex justify-between items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 text-emerald-500 font-bold text-sm">
                    {job.locoId}
                  </div>
                  <h3 className="text-xl font-bold">{job.taskType}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.staffIds.map(id => {
                    const s = staff.find(st => st.uid === id);
                    return (
                      <span key={id} className="bg-zinc-800 px-3 py-1 rounded-full text-xs text-zinc-400 border border-white/5">
                        {s ? s.name : 'Staff Member'}
                      </span>
                    );
                  })}
                </div>
                <p className="text-zinc-500 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Place: {job.place || 'Section Floor'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-4">
                <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  job.status === 'booked' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                }`}>
                  {job.status}
                </span>
                
                {profile.role === 'staff' && job.status === 'booked' && (
                  <button 
                    onClick={() => updateJobStatus(job.id, 'done')}
                    className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-emerald-400 transition-colors"
                  >
                    Mark Done
                  </button>
                )}

                {profile.role === 'supervisor' && job.status === 'done' && (
                  <button 
                    onClick={() => updateJobStatus(job.id, 'approved')}
                    className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Inventory = ({ profile }: { profile: UserProfile }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inventory'), (snap) => {
      setItems(snap.docs.map(d => d.data() as InventoryItem));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Store & Scrap</h1>
          <p className="text-zinc-500 text-lg">Track parts, stock levels, and scrap disposal.</p>
        </div>
        {profile.role !== 'staff' && (
          <button className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-400 transition-all">
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        )}
      </header>

      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-zinc-500 text-sm font-bold uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6">Part Name</th>
              <th className="px-8 py-6">New Stock</th>
              <th className="px-8 py-6">Healthy (OH)</th>
              <th className="px-8 py-6">Scrap</th>
              <th className="px-8 py-6">Status</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-12 text-center text-zinc-500 italic">No inventory items found.</td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.partId} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 font-bold">{item.name}</td>
                  <td className="px-8 py-6">{item.quantityNew}</td>
                  <td className="px-8 py-6">{item.quantityHealthy}</td>
                  <td className="px-8 py-6 text-red-400">{item.quantityScrap}</td>
                  <td className="px-8 py-6">
                    {item.quantityNew <= item.minStockLevel ? (
                      <span className="text-orange-500 flex items-center gap-2 text-sm font-bold">
                        <AlertCircle className="w-4 h-4" /> Low Stock
                      </span>
                    ) : (
                      <span className="text-emerald-500 text-sm font-bold">Optimal</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-zinc-500 hover:text-white transition-colors">Update</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const HistoryView = ({ profile }: { profile: UserProfile }) => {
  const [locos, setLocos] = useState<Locomotive[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locomotives'), (snap) => {
      setLocos(snap.docs.map(d => d.data() as Locomotive));
    });
    return () => unsub();
  }, []);

  const filteredLocos = locos.filter(l => l.locoNumber.includes(search));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Locomotive History</h1>
        <p className="text-zinc-500 text-lg">Detailed records of maintenance and TM assignments.</p>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
        <input 
          type="text"
          placeholder="Search by Loco Number (e.g. 35042)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-16 pr-8 py-5 text-white focus:outline-none focus:border-emerald-500 text-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLocos.map(loco => (
          <motion.div 
            key={loco.locoNumber}
            whileHover={{ y: -5 }}
            className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl space-y-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-bold tracking-tight">{loco.locoNumber}</h3>
                <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm">{loco.type}</p>
              </div>
              <div className="bg-zinc-800 p-3 rounded-2xl">
                <Train className="w-6 h-6 text-zinc-400" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Last Maintenance</span>
                <span className="text-zinc-300">{loco.lastMaintenanceDate ? new Date(loco.lastMaintenanceDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Current Status</span>
                <span className="text-blue-400 font-bold">{loco.currentStatus}</span>
              </div>
            </div>

            <button className="w-full bg-white/5 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              View Full History
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SettingsView = ({ profile }: { profile: UserProfile }) => {
  const handleSeedData = async () => {
    try {
      // Seed Locomotives
      const locos = [
        { locoNumber: '35042', type: 'WAP-5', currentStatus: 'Healthy' },
        { locoNumber: '36543', type: 'WAP-7', currentStatus: 'IA Schedule' },
        { locoNumber: '45310', type: 'WAG-9', currentStatus: 'Healthy' },
      ];
      for (const l of locos) {
        await setDoc(doc(db, 'locomotives', l.locoNumber), l);
      }

      // Seed Inventory
      const items = [
        { partId: 'tm-bearing', name: 'TM Bearing (NU224)', quantityNew: 20, quantityHealthy: 5, quantityScrap: 2, minStockLevel: 10 },
        { partId: 'tm-grease', name: 'TM Grease (SKF)', quantityNew: 50, quantityHealthy: 0, quantityScrap: 0, minStockLevel: 15 },
        { partId: 'speed-sensor', name: 'Speed Sensor', quantityNew: 10, quantityHealthy: 2, quantityScrap: 1, minStockLevel: 5 },
      ];
      for (const i of items) {
        await setDoc(doc(db, 'inventory', i.partId), i);
      }
      alert("Initial data seeded successfully!");
    } catch (error) {
      console.error("Seeding failed", error);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-zinc-500 text-lg">System configuration and user management.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
          <h2 className="text-xl font-bold mb-6">User Profile</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Name</label>
                <p className="text-lg font-bold">{profile.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Role</label>
                <p className="text-lg font-bold capitalize">{profile.role}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Email</label>
              <p className="text-lg font-bold">{profile.email}</p>
            </div>
          </div>
        </div>

        {profile.role === 'supervisor' && (
          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-6">Admin Tools</h2>
            <div className="space-y-4">
              <p className="text-zinc-500 mb-4 text-sm">Populate the database with initial locomotives and inventory items for testing.</p>
              <button 
                onClick={handleSeedData}
                className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Seed Initial Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
