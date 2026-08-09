'use client'
import React, { useEffect, useState } from 'react'
import { listEvents } from '@/lib/api';

const EventListClient = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await listEvents();
        setEvents(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className='text-black pl-20 h-[92vh] overflow-scroll'>
      <div className='font-bold text-center text-xl m-2'>
        Event List
      </div>
      {loading ? (
        <div className="text-center">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center">No events found</div>
      ) : (
        <div className="grid gap-4 p-4">
          {events.map((event, index) => (
            <div key={index} className="border p-4 rounded-lg shadow">
              {Object.entries(event).map(([key, value]) => (
                <p key={key} className="mb-2">
                  <span className="font-semibold">{key}:</span> {value}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventListClient; 