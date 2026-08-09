"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  updateUserPassword,
  getLoginHistory,
  reloadKnowledge
} from '@/lib/api';
import { User, Mail, Phone, Briefcase, Award, Lock, History, Trash2, RefreshCw } from 'lucide-react';
import { withAdminAuth } from '@/app/Components/auth-protection';

function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [profile, setProfile] = useState({
    email: '',
    mobile_number: '',
    gender: '',
    title: '',
    position: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Login History State
  const [loginHistory, setLoginHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Knowledge reload state
  const [reloadingKnowledge, setReloadingKnowledge] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await getUserProfile();
      setProfile({
        email: data.email || '',
        mobile_number: data.mobile_number || '',
        gender: data.gender || '',
        title: data.title || '',
        position: data.position || ''
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getLoginHistory();
      setLoginHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching login history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await updateUserProfile(profile);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Profile update failed:', err);
      alert(err.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('New passwords do not match!');
      return;
    }
    setUpdatingPassword(true);
    try {
      await updateUserPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      alert('Password updated successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error('Password update failed:', err);
      alert(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteProfile = async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your profile account? This operation CANNOT be undone!'
    );
    if (!confirmDelete) return;

    try {
      await deleteUserProfile();
      alert('Account deleted successfully.');
      localStorage.removeItem('token');
      router.push('/admin');
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert(err.message || 'Failed to delete account.');
    }
  };

  const handleReloadKnowledgeBase = async () => {
    setReloadingKnowledge(true);
    try {
      await reloadKnowledge();
      alert('Knowledge base reloaded successfully!');
    } catch (err) {
      console.error('Error reloading knowledge:', err);
      alert(err.message || 'Failed to reload knowledge base.');
    } finally {
      setReloadingKnowledge(false);
    }
  };

  return (
    <div className="text-black pl-20 p-6 min-h-[90vh]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Account & Security Settings</h1>
          <p className="text-gray-500 text-sm">Manage profile information, password, login history, and AI knowledge base</p>
        </div>
        <button
          onClick={handleReloadKnowledgeBase}
          disabled={reloadingKnowledge}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors cursor-pointer"
        >
          <RefreshCw size={16} className={reloadingKnowledge ? 'animate-spin' : ''} />
          {reloadingKnowledge ? 'Reloading AI Knowledge...' : 'Reload Knowledge Base'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-4">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={16} /> User Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Lock size={16} /> Security & Password
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            fetchHistory();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={16} /> Login History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl">
          <h2 className="text-lg font-bold mb-4">Edit Profile Details</h2>
          {loadingProfile ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Mail size={14} /> Email
                </label>
                <input
                  type="email"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Phone size={14} /> Mobile Number
                </label>
                <input
                  type="tel"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.mobile_number}
                  onChange={(e) => setProfile({ ...profile, mobile_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Award size={14} /> Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Administrator / Professor"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.title}
                  onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Briefcase size={14} /> Position
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Coordinator"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.position}
                  onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
                >
                  <Trash2 size={16} /> Delete Account
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  {updatingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-md">
          <h2 className="text-lg font-bold mb-4">Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">New Password *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer mt-4"
            >
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-3xl">
          <h2 className="text-lg font-bold mb-4">Login Activity Logs</h2>
          {loadingHistory ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
          ) : loginHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No login history recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4">IP Address / Location</th>
                    <th className="py-2.5 px-4">Device / Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 px-4">{item.timestamp ? new Date(item.timestamp).toLocaleString() : (item.date || 'N/A')}</td>
                      <td className="py-2.5 px-4">{item.ip_address || item.ip || 'Local / Web'}</td>
                      <td className="py-2.5 px-4">{item.user_agent || item.device || 'Browser Session'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(ProfilePage);
