"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Trash2, UserX } from "lucide-react";
import { listUserEvents, getUserEventAttendees, deleteUserEvent, deleteUserEventAttendee } from "@/lib/api";

function Page() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const router = useRouter();

  const [attendeeError, setAttendeeError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await listUserEvents();
      console.log('Events data:', data);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch attendees for a specific event
  const fetchAttendees = async (eventId) => {
    if (selectedEvent === eventId) {
      setSelectedEvent(null);
      return;
    }
    setIsLoadingAttendees(true);
    setAttendeeError(null);
    try {
      const data = await getUserEventAttendees(eventId);
      console.log("Attendees data received:", data);
      const list = Array.isArray(data) ? data : (data?.attendees || data?.data || []);
      setAttendees(list);
      setSelectedEvent(eventId);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setAttendeeError(error.message);
      setSelectedEvent(eventId);
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const handleDelete = async (eventId) => {
    const eventToDelete = events.find(event => (event.id || event._id) === eventId);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the event "${eventToDelete?.title || 'Event'}"?\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteUserEvent(eventId);
      setEvents(events.filter(event => (event.id || event._id) !== eventId));
      alert(`Event has been successfully deleted.`);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(error.message);
    }
  };

  const handleDeleteAttendee = async (eventId, attendeeId) => {
    if (!window.confirm("Are you sure you want to remove this attendee?")) return;
    try {
      await deleteUserEventAttendee(eventId, attendeeId);
      setAttendees(attendees.filter(a => (a.id || a.attendee_id || a._id) !== attendeeId));
      alert("Attendee removed successfully.");
    } catch (error) {
      console.error('Error removing attendee:', error);
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="text-red-600 font-semibold">{error}</div>
      </div>
    );
  }

  return (
    <div className="text-black pl-20 p-4">
      <h1 className="text-2xl font-bold mb-6">User Registered Events</h1>
      
      {events.length === 0 ? (
        <div className="text-center text-gray-500">No events found</div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            const eventId = event.id || event._id;
            return (
              <div key={eventId} className="bg-white p-4 rounded-lg shadow-md relative border border-gray-100">
                <button
                  onClick={() => handleDelete(eventId)}
                  className="absolute top-4 right-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete event"
                >
                  <Trash2 size={20} />
                </button>
                <div 
                  className="cursor-pointer"
                  onClick={() => fetchAttendees(eventId)}
                >
                  <div className="flex items-center justify-between pr-10">
                    <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      Registered: {event.registered ?? 0} / {event.capacity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Date: {event.date}</p>
                      <p className="text-gray-600">Time: {event.time}</p>
                      <p className="text-gray-600">Location: {event.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Capacity: {event.capacity}</p>
                      <p className="text-gray-600">Start Time: {event.start_time}</p>
                      <p className="text-gray-600">End Time: {event.end_time}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-700">{event.description}</p>
                  <p className="text-xs text-blue-600 font-medium mt-2">
                    {selectedEvent === eventId ? "▲ Hide Attendees" : "▼ Click to View Attendees"}
                  </p>
                </div>

                {/* Attendees Section */}
                {selectedEvent === eventId && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="font-semibold mb-2">Attendees</h3>
                    {isLoadingAttendees ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                      </div>
                    ) : attendeeError ? (
                      <p className="text-red-500 text-sm font-semibold">{attendeeError}</p>
                    ) : attendees.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                              <th className="py-2 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendees.map((attendee, index) => {
                              const attendeeId = attendee.id || attendee.attendee_id || index;
                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="py-2 px-4 border-b font-medium">{attendee.attendee_name || attendee.name || 'N/A'}</td>
                                  <td className="py-2 px-4 border-b text-gray-600">{attendee.attendee_email || attendee.email || 'N/A'}</td>
                                  <td className="py-2 px-4 border-b text-gray-600">{attendee.registration_date ? new Date(attendee.registration_date).toLocaleDateString() : 'N/A'}</td>
                                  <td className="py-2 px-4 border-b text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAttendee(eventId, attendeeId);
                                      }}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                      title="Remove attendee"
                                    >
                                      <UserX size={18} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 py-2">No attendees registered for this event yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Page;
