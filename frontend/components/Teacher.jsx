"use client";
import React, { useRef, useState } from 'react'
import Search from '@/public/search.png'
import Direction from '@/public/direction.png'
import style from '@/app/student/Student.module.css'
import Image from 'next/image';
import { searchTeacher } from '@/lib/api';

function Teacher({ handleSearchOpen }) {
    const [teacherName, setTeacherName] = useState('');
    const [teacherDetails, setTeacherDetails] = useState({});
    const [isTeacherDetailPopupOpen, setIsTeacherDetailPopupOpen] = useState(false);
    const inputRef = useRef(null);
    function teacherChangeHandler(e) {
        setTeacherName(e.target.value)
    }
    const handleFocus = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    async function handleSearchTeacher() {
        if (!teacherName.trim()) return;
        try {
            const data = await searchTeacher(teacherName.trim());
            if (data.error) {
                alert(data.error);
                return;
            }

            // save value for pop-up to show teacher details
            setTeacherDetails(data)
            setIsTeacherDetailPopupOpen(true)
            console.log(data.Cabin)
            setTeacherName('')
        } catch (error) {
            console.error('Error searching teacher:', error);
            alert(error.message || 'Teacher not found');
        }
    }

    function teacherSearchHandler(e) {
        e.key === "Enter" && handleSearchTeacher()
    }
    return (
        <div className={style['sub-container-right']}>
            <div className={[style['input-container'], 'shadow-[0px_4px_4px_0px_#00000040]'].join(' ')} onClick={handleFocus}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder='Search any Professor'
                    value={teacherName}
                    onChange={teacherChangeHandler}
                    onKeyDown={teacherSearchHandler}
                />
                <div className={style['input-logo-container']}>
                    <Image src={Search} width={50} height={50} alt='logo' onClick={handleSearchTeacher} className='cursor-pointer hover:scale-110 duration-300' />
                    <Image onClick={handleSearchOpen} className='cursor-pointer hover:scale-110 duration-300' src={Direction} width={50} height={50} alt='logo' />
                </div>
            </div>
            {isTeacherDetailPopupOpen && teacherDetails && (
                <div className="absolute top-20 left-30 flex items-center justify-center bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4">Professor Details</h2>
                        <p><strong>Cabin:</strong> {teacherDetails.Cabin || "N/A"}</p>
                        <p><strong>Matched Name:</strong> {teacherDetails.Matched_Name || "N/A"}</p>
                        <p><strong>Phone Number:</strong> {teacherDetails["Phone Number"] || "N/A"}</p>
                        <p><strong>Room No:</strong> {teacherDetails.Room_No || "N/A"}</p>

                        <button
                            onClick={() => setIsTeacherDetailPopupOpen(false)}
                            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>)}
        </div>
    )
}

export default Teacher