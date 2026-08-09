"use client"
import React, { useState, useEffect } from 'react';
import { getTeachers, createTeacher } from '@/lib/api';
import { UserPlus, Search, Phone, DoorOpen, Building } from 'lucide-react';
import { withAdminAuth } from '@/app/Components/auth-protection';

function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState({ name: '', cabin_no: '', room_no: '' });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    cabin_no: '',
    room_no: '',
    phone_number: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async (query = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeachers(query);
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTeachers(searchQuery);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newTeacher.name || !newTeacher.cabin_no || !newTeacher.room_no) {
      alert('Name, Cabin No, and Room No are required!');
      return;
    }
    setSubmitting(true);
    try {
      await createTeacher(newTeacher);
      alert('Teacher created successfully!');
      setShowAddModal(false);
      setNewTeacher({ name: '', cabin_no: '', room_no: '', phone_number: '' });
      fetchTeachers();
    } catch (err) {
      console.error('Error creating teacher:', err);
      alert(err.message || 'Failed to create teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-black pl-20 p-6 min-h-[90vh]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Faculty & Teachers Directory</h1>
          <p className="text-gray-500 text-sm">Manage campus faculty members, cabins, and room locations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors cursor-pointer"
        >
          <UserPlus size={18} />
          Add Teacher
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl shadow-md mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
          <input
            type="text"
            placeholder="Search by name..."
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchQuery.name}
            onChange={(e) => setSearchQuery({ ...searchQuery, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Cabin No</label>
          <input
            type="text"
            placeholder="Search cabin..."
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchQuery.cabin_no}
            onChange={(e) => setSearchQuery({ ...searchQuery, cabin_no: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Room No</label>
          <input
            type="text"
            placeholder="Search room..."
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchQuery.room_no}
            onChange={(e) => setSearchQuery({ ...searchQuery, room_no: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-gray-800 hover:bg-black text-white p-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Search size={16} /> Search
          </button>
          <button
            type="button"
            onClick={() => {
              const reset = { name: '', cabin_no: '', room_no: '' };
              setSearchQuery(reset);
              fetchTeachers(reset);
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Teachers List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-center">
          {error}
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">
          No faculty members found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher, index) => (
            <div key={index} className="bg-white p-5 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-lg text-blue-950 mb-2">{teacher.name || teacher.Matched_Name}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <DoorOpen size={16} className="text-blue-500" />
                  <span><strong>Cabin:</strong> {teacher.cabin_no || teacher.Cabin || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-blue-500" />
                  <span><strong>Room No:</strong> {teacher.room_no || teacher.Room_No || 'N/A'}</span>
                </div>
                {teacher.phone_number || teacher['Phone Number'] ? (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-blue-500" />
                    <span><strong>Phone:</strong> {teacher.phone_number || teacher['Phone Number']}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Teacher</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John Doe"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cabin Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AB-102A"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTeacher.cabin_no}
                  onChange={(e) => setNewTeacher({ ...newTeacher, cabin_no: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 102"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTeacher.room_no}
                  onChange={(e) => setNewTeacher({ ...newTeacher, room_no: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTeacher.phone_number}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone_number: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(TeachersPage);
