"use client"
import React, { useState } from 'react'
import { createUserEvent } from '@/lib/api';

const Page = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    capacity: "",
    location: "",
    start_time: "",
    end_time: ""
  });

  const isFormValid = () => {
    return Object.values(formData).every(value => value.trim() !== "");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleReset = (e) => {
    e.preventDefault();
    setFormData({
      title: "",
      description: "",
      date: "",
      time: "",
      capacity: "",
      location: "",
      start_time: "",
      end_time: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Format the date and time properly
    const formatDateTime = (date, time) => {
      const [hours, minutes] = time.split(':');
      const dateObj = new Date(date);
      dateObj.setHours(parseInt(hours), parseInt(minutes), 0);
      return dateObj.toISOString();
    };

    const eventData = {
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      capacity: parseInt(formData.capacity),
      location: formData.location,
      start_time: formatDateTime(formData.date, formData.start_time),
      end_time: formatDateTime(formData.date, formData.end_time)
    };

    try {
      const data = await createUserEvent(eventData);
      console.log("Form Data Submitted Successfully:", data);
      alert("Event successfully submitted!");
      handleReset(e); // Reset form after successful submission
    } catch (error) {
      console.error("Error occurred while submitting event:", error);
      alert(error.message || "Error occurred while submitting event. Please try again.");
    }
  };

  return (
    <div className='text-black pl-20'>
      <div className='mx-20 my-5 shadow-md shadow-black'>
        <form className='m-3 p-3' onSubmit={handleSubmit}>
          <div className='text-center mb-4 font-bold text-xl'>Event Details</div>

          <div className='mx-2'>Event Title <span className="text-red-500">*</span></div>
          <input 
            type="text" 
            name="title" 
            value={formData.title}
            onChange={handleChange}
            placeholder='Enter the event title' 
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>Event Description <span className="text-red-500">*</span></div>
          <input 
            type="text" 
            name="description" 
            value={formData.description}
            onChange={handleChange}
            placeholder='Enter event description' 
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>Event Date <span className="text-red-500">*</span></div>
          <input 
            type="date" 
            name="date" 
            value={formData.date}
            onChange={handleChange}
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>Event Time <span className="text-red-500">*</span></div>
          <input 
            type="time" 
            name="time" 
            value={formData.time}
            onChange={handleChange}
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>Capacity <span className="text-red-500">*</span></div>
          <input 
            type="number" 
            name="capacity" 
            value={formData.capacity}
            onChange={handleChange}
            placeholder='Enter event capacity' 
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>Location <span className="text-red-500">*</span></div>
          <input 
            type="text" 
            name="location" 
            value={formData.location}
            onChange={handleChange}
            placeholder='Enter event location' 
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>Start Time <span className="text-red-500">*</span></div>
          <input 
            type="time" 
            name="start_time" 
            value={formData.start_time}
            onChange={handleChange}
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='mx-2'>End Time <span className="text-red-500">*</span></div>
          <input 
            type="time" 
            name="end_time" 
            value={formData.end_time}
            onChange={handleChange}
            className="ml-2 mb-4 p-2 border border-gray-300 rounded-lg w-1/3"
            required
          />

          <div className='flex gap-5 justify-center items-center'>
            <button 
              type="button"
              onClick={handleReset}
              className='bg-blue-600 p-2 rounded-lg text-white cursor-pointer hover:bg-blue-700 active:bg-blue-800'
            >
              Reset
            </button>
            <button 
              type="submit"
              disabled={!isFormValid()}
              className={`p-2 rounded-lg text-white transition-all duration-200 ${
                isFormValid() 
                  ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 cursor-pointer' 
                  : 'bg-gray-400 opacity-50 cursor-not-allowed pointer-events-none'
              }`}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Page;
