'use client';
import React, { useRef, useState } from 'react'
import style from '@/app/student/Student.module.css'
import Image from 'next/image';
import { processPath, multiBuildingProcessPath, customProcessPath, getApiUrl } from '@/lib/api';

function ShowPath({ buttonRef }) {

    const preferenceRef = useRef('Stairs');

    const [startFloorMap, setStartFloorMap] = useState("");
    const [endFloorMap, setEndFloorMap] = useState("");
    const [startFloorMapBuilding2, setStartFloorMapBuilding2] = useState("")
    const [endFloorMapBuilding2, setEndFloorMapBuilding2] = useState("")
    const [showBuilding1Maps, setShowBuilding1Maps] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showStartMap, setShowStartMap] = useState(true);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [svgData, setSvgData] = useState(null);
    const mapRef = useRef(null);

    const [navType, setNavType] = useState(""); // "single" or "multi" or "custom"
    const [building1, setBuilding1] = useState("");
    const [building2, setBuilding2] = useState("");


    // Function to handle API request
    const handleSearch = async () => {
        setStartFloorMap('')
        setEndFloorMap('')
        setShowBuilding1Maps(true)

        if (!start || !end) {
            alert("Please enter both start and end floors.");
            return;
        }

        setLoading(true);

        try {
            const preference = preferenceRef.current ? preferenceRef.current.value : "Stairs";
            const response = navType === 'custom' 
              ? await customProcessPath({ type: "custom", start, end, preference, building: building1 || "AB-01" })
              : await processPath({ start, end, preference, building: "AB-01" });

            if (response.ok) {
                const contentType = response.headers.get("Content-Type") || "";

                if (contentType.includes("application/json")) {
                    // Complex Path - JSON Response
                    const data = await response.json();
                    if (data.error) {
                        alert(data.error);
                        return;
                    }

                    setStartFloorMap(data.files?.start_floor || "");
                    setEndFloorMap(data.files?.end_floor || "");
                    setSvgData(null); // Reset SVG data
                } else if (contentType.includes("image/svg+xml")) {
                    // Same Floor - SVG Response
                    const svgText = await response.text();
                    setSvgData(svgText); // Store the SVG text
                    setStartFloorMap(null);
                    setEndFloorMap(null);
                } else {
                    console.error("Unexpected response format");
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                const detailMsg = errData.detail || errData.message || errData.error || response.statusText;
                alert(`Backend Server Error (${response.status}): ${detailMsg}\n\nPlease check if room/floor "${start}" and "${end}" exist in the backend graph.`);
                return;
            }
        } catch (error) {
            alert("Request failed: " + error.message);
            return;
        } finally {
            setLoading(false);
        }
        if (mapRef.current) {
            mapRef.current.style.display = 'block';
            handleSearchClose();
        }
    };

    const handleSearchMulti = async () => {
        setLoading(true);
        try {
            const response = await multiBuildingProcessPath({
                "Start Location": start,
                "End Location": end,
                "building_name_1": building1,
                "building_name_2": building2
            });

            if (response.ok) {
                const data = await response.json();

                if (data.files && data.files[building1]) {
                    setStartFloorMap(data.files[building1].start_floor);
                    setEndFloorMap(data.files[building1].end_floor);
                }

                if (data.files && data.files[building2]) {
                    setStartFloorMapBuilding2(data.files[building2].start_floor);
                    setEndFloorMapBuilding2(data.files[building2].end_floor);
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                const detailMsg = errData.detail || errData.message || errData.error || response.statusText;
                alert(`Backend Server Error (${response.status}): ${detailMsg}\n\nTroubleshooting: Please check if the room numbers ("${start}" in ${building1} and "${end}" in ${building2}) exist in the backend database.`);
                return;
            }
        } catch (error) {
            alert("Request failed: " + error.message);
            return;
        } finally {
            setLoading(false);
        }
        if (mapRef.current) {
            mapRef.current.style.display = 'block';
            handleSearchClose();
        }
    }



    const swapBuilding = () => {
        if (navType == 'single') {
            return
        }
        setShowBuilding1Maps(prev => !prev);
    };



    const handleSearchClose = () => {
        if (buttonRef.current) {
            buttonRef.current.style.display = "none";
        }
    }


    const handleMapClose = () => {
        if (mapRef.current) {
            mapRef.current.style.display = 'none';
        }
        setEndFloorMap('')
        setStartFloorMap('')
        setSvgData('')
    }

    return (
        <div>
            <div ref={buttonRef} className="absolute hidden top-0 left-[7%] bg-white text-black shadow-[0px_4px_4px_0px_#00000040] rounded-lg p-4 w-96 z-50">
                {/* Close Button */}
                <div className="flex justify-end mb-2">
                    <button className="text-gray-500 hover:text-black cursor-pointer text-2xl" onClick={handleSearchClose}>&times;</button>
                </div>

                {/* Input Section */}
                <select
                    className="border p-2 rounded-md w-full text-black mb-2"
                    value={navType}
                    onChange={(e) => setNavType(e.target.value)}
                >
                    <option value="" disabled>Select navigation type</option>
                    <option value="single">Same Building</option>
                    <option value="multi">Multi-Building</option>
                </select>

                {/* Input with Start Icon */}
                <div className="flex items-center border p-2 rounded-md mb-2 bg-white">
                    <Image src="/start.png" alt="Start" width={20} height={20} className="mr-2" />
                    <input
                        type="text"
                        placeholder="Choose starting location"
                        className="w-full outline-none text-black"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                    />
                </div>

                {/* Input with End Icon */}
                <div className="flex items-center border p-2 rounded-md mb-2 bg-white">
                    <Image src="/destination.png" alt="End" width={20} height={20} className="mr-2" />
                    <input
                        type="text"
                        placeholder="Choose end location"
                        className="w-full outline-none text-black"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>

                {/* Conditional Building Inputs for Multi-Building */}
                {navType === "multi" && (
                    <>
                        <select
                            className="border p-2 rounded-md w-full text-black mb-2"
                            value={building1}
                            onChange={(e) => setBuilding1(e.target.value)}
                        >
                            <option value="" disabled>Building Name 1</option>
                            <option value="AB-01">AB-01</option>
                            <option value="Lab-Complex">Lab-Complex</option>
                        </select>
                        <select
                            className="border p-2 rounded-md w-full text-black mb-2"
                            value={building2}
                            onChange={(e) => setBuilding2(e.target.value)}
                        >
                            <option value="" disabled>Building Name 2</option>
                            <option value="AB-01">AB-01</option>
                            <option value="Lab-Complex">Lab-Complex</option>
                        </select>
                    </>
                )}

                {/* Preference Selector */}
                {navType === 'single' && (
                    <select
                        type="text"
                        className="border mt-2 p-2 rounded-md w-full text-black"
                        ref={preferenceRef}
                    >
                        <option value="Stairs" hidden defaultChecked>Select preference</option>
                        <option value="Stairs">Stairs</option>
                        <option value="Lift">Lift</option>
                    </select>
                )}

                {/* Search Button */}
                <button
                    onClick={navType === 'single' ? handleSearch : handleSearchMulti}
                    className="bg-blue-500 text-white p-3 rounded-md w-full mt-4 cursor-pointer"
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Search"}
                </button>
            </div>


            <div className="flex gap-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                {/* Map Container */}
                <div ref={mapRef} className="relative hidden bg-white rounded-lg border-3">
                    <div className='flex justify-between items-center w-[100%] p-4 h-[50px]' style={{ borderBottom: '3px solid #000' }}>
                        <button
                            onClick={swapBuilding}
                            className=" p-2 rounded-md z-10 cursor-pointer"
                        >
                            <Image src='/prev.png' width={25} height={25} alt='previous' style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <h2 className="font-bold text-xl mb-2">
                            {
                                navType === 'single'
                                    ? 'Academic Block'
                                    : navType === 'multi'
                                        ? showBuilding1Maps
                                            ? (building1 === 'Lab-Complex' ? 'Lab Complex' : 'Academic Block')
                                            : (building2 === 'Lab-Complex' ? 'Lab Complex' : 'Academic Block')
                                        : 'Select Navigation Type'
                            }
                        </h2>

                        {/* Swap Button Inside iFrame */}
                        <div className='flex items-center'>
                            <button
                                className=" p-2 rounded-md z-10 cursor-pointer"
                                onClick={swapBuilding}
                            >
                                <Image src='/next.png' width={25} height={25} alt='next' />
                            </button>
                            <button
                                onClick={handleMapClose}
                                className="p-2 rounded-md z-10 cursor-pointer"
                            >
                                <Image src='/Close.png' width={30} height={30} alt='close' />
                            </button>
                        </div>
                    </div>

                    <div className='flex'>
                        {/* Start floor */}
                        <div style={{ borderRight: '3px solid #000' }}>
                            <h1 style={{ borderBottom: '3px solid #000' }} className='text-center font-bold text-xl'>Start Location</h1>

                            {svgData ? (
                                // Display SVG directly for same floor
                                <div dangerouslySetInnerHTML={{ __html: svgData }} className="w-[400px] h-[400px]" />
                            ) : (
                                // For different floor
                                <iframe
                                    src={getApiUrl(showBuilding1Maps ? startFloorMap : startFloorMapBuilding2)}
                                    className="w-[400px] h-[400px]"
                                />

                            )}
                        </div>

                        {/* End floor */}

                        <div>
                            {!svgData && (
                                <>
                                    <h1 style={{ borderBottom: '3px solid #000' }} className='text-center font-bold text-xl'>End Location</h1>
                                    <iframe
                                        src={getApiUrl(showBuilding1Maps ? endFloorMap : endFloorMapBuilding2)}
                                        className="w-[400px] h-[400px]"
                                    />

                                </>
                            )}



                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default ShowPath