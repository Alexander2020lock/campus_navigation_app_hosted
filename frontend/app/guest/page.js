"use client"
import React, { useRef, useState, useEffect } from 'react'
import style from './student.module.css'
import Image from 'next/image';
import Recent from '../../public/recent.png'
import Hamburger from '../../public/hamburger.png'
import Direction from '../../public/direction.png'
import Search from '../../public/search.png'
import { useRouter } from 'next/navigation';
import { Montserrat } from "next/font/google";
import FloorMap from '../Components/FloorMap';
import Link from 'next/link';
import { processPath, getApiUrl } from '@/lib/api';

const montserrat = Montserrat({
  subsets: ["latin"], 
  weight: ["100", "400", "700"], 
  variable: "--font-montserrat", 
});

function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false by default
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [startFloorMap, setStartFloorMap] = useState("");
  const [endFloorMap, setEndFloorMap] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStartMap, setShowStartMap] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [svgData, setSvgData] = useState(null);
  const mapRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showFloorDropdown2, setShowFloorDropdown2] = useState(false);
  const [showFloorDropdown3, setShowFloorDropdown3] = useState(false);
  const [showFloorDropdown4, setShowFloorDropdown4] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [isHomeSelected, setIsHomeSelected] = useState(true);
  const [showFloorMap, setShowFloorMap] = useState(false);
  const [showAcademicDropdown, setShowAcademicDropdown] = useState(false);

  // Effect for media loading - simplified
  useEffect(() => {
    // Simulate brief loading for UI consistency
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen)
  }

  const handleFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const swapFloors = () => {
    setStart(end);
    setEnd(start);
  };

  const buttonRef = useRef(null);

  const handleSearchClose = () => {
    if (buttonRef.current) {
      buttonRef.current.style.display = "none";
    }
  }
  
  const handleSearchOpen = (e) => {
    e.stopPropagation();
    if (buttonRef.current) {
      buttonRef.current.style.display = "block";
    }
  }

  const toggleMap = () => {
    setShowStartMap((prev) => !prev);
  };

  const handleMapClose = () => {
    if (mapRef.current) {
      mapRef.current.style.display = 'none';
    }
  }

  // Function to handle API request
  const handleSearch = async () => {
    if (mapRef.current) {
      mapRef.current.style.display = 'block';
    }

    if (!start || !end) {
      alert("Please enter both start and end floors.");
      return;
    }

    setLoading(true);

    try {
      const response = await processPath({
        start,
        end,
        preference: "Lift",
        building: "AB-01",
      });

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
        console.error("Error fetching path:", response.statusText);
      }
    } catch (error) {
      console.error("Request failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFloorSelect = (floorNumber, building) => {
    setSelectedFloor(floorNumber);
    setSelectedBuilding(building);
    // Close the appropriate dropdown based on the building
    if (building === 'Academic Block') {
      setShowAcademicDropdown(false);
    } else if (building === 'Academic Block 2') {
      setShowFloorDropdown2(false);
    } else if (building === 'Architecture Building') {
      setShowFloorDropdown3(false);
    } else if (building === 'Lab Complex') {
      setShowFloorDropdown4(false);
    }
    setShowFloorMap(true);
  };

  const handleHomeClick = () => {
    // Deselect all building and floor selections
    setSelectedBuilding(null);
    setSelectedFloor(null);
    // Close all dropdowns
    setShowFloorDropdown(false);
    setShowFloorDropdown2(false);
    setShowFloorDropdown3(false);
    setShowFloorDropdown4(false);
    // Select home
    setIsHomeSelected(true);
  };

  // Show loading spinner while initializing
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen select-none">
    <div className={style['container']}>

        <div ref={buttonRef} className="absolute hidden top-25 left-40 bg-white text-black shadow-lg rounded-lg p-4 w-96 z-50">
          {/* Close Button */}
          <div className="flex justify-end">
            <button className="text-gray-500 hover:text-black cursor-pointer text-2xl" onClick={handleSearchClose}>&times;</button>
          </div>

          {/* Input Section */}
          <div className="flex items-center gap-4">
            {/* Left Icons */}
            <div className="flex flex-col items-center gap-2">
              <Image src="/start.png" alt="Start" width={20} height={20} />
              <div className="h-6 border-l border-gray-400"></div>
              <Image src="/destination.png" alt="End" width={20} height={20} />
            </div>

            {/* Input Fields */}
            <div className="flex flex-col flex-grow">

              <input
                type="text"
                placeholder="Choose starting floor"
                className="border p-2 rounded-md w-full"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <input
                type="text"
                placeholder="Choose end floor"
                className="border mt-2 p-2 rounded-md w-full"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>

            {/* Swap Button */}
            <button onClick={swapFloors} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 cursor-pointer">
              <Image src="/Swap.png" alt="Swap" width={20} height={20}/>
            </button>
          </div>
          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="bg-blue-500 text-white p-3 rounded-md w-full mt-4 cursor-pointer"
            disabled={loading}
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        <div className="flex gap-6 mt-6 absolute top-5 left-150 z-50">
          {/* Map Container */}
          <div ref={mapRef} className="relative hidden bg-white p-4 shadow-md rounded-lg">
            <h2 className="font-bold mb-2">{showStartMap ? "Start Floor Map" : "End Floor Map"}</h2>

            {/* Swap Button Inside iFrame */}
            <button
              onClick={toggleMap}
              className="absolute top-2 right-16 bg-gray-300 p-2 rounded-md shadow-md z-10 cursor-pointer"
            >
              🔄 Swap Map
            </button>
            <button
              onClick={handleMapClose}
              className="absolute top-2 right-2 bg-gray-300 p-2 rounded-md shadow-md z-10 cursor-pointer"
            >
              <Image src='/Close.png' width={30} height={30} alt='close' />
            </button>

            {svgData ? (
              // Display SVG directly for same floor
              <div dangerouslySetInnerHTML={{ __html: svgData }} className="w-[500px] h-[500px] border rounded-lg" />
            ) : (
              // For different floor
              <iframe
                src={getApiUrl(showStartMap ? startFloorMap : endFloorMap)}
                className="w-150 h-150 border rounded-lg"
              />
            )}
          </div>
        </div>


        <div className={style['container-left']}>
            <div className={style['container-left-top']}>
            <div className={[style['hamburger-container'], isOpen ? (style.open) : (style.close), montserrat.variable].join(' ')}>
              <div className='flex justify-between items-center border-b-2'>
                <p className='inline-block font-bold text-2xl'>Campus Navigator</p>
                <span onClick={handleOpen} className='cursor-pointer hover:scale-115 duration-300 inline-block'><Image src='/Close.png' width={30} height={30} alt='close'/></span>
              </div>
              <div className='w-full mt-8 cursor-pointer flex items-center' onClick={handleHomeClick}>
                <span><Image src='/Home.png' width={30} height={30} alt='home'/></span>
                <span className={isHomeSelected ? 'text-blue-600' : ''}> Home</span>
              </div>
              <div className='relative'>
                <div 
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${
                    selectedBuilding === 'Academic Block' ? 'text-blue-600' : ''
                  }`}
                  onClick={() => {
                    setShowAcademicDropdown(!showAcademicDropdown);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown2(false);
                    setShowFloorDropdown3(false);
                    setShowFloorDropdown4(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block'/></span>
                  <span>&nbsp;</span>
                  Academic Block
                  <span className='absolute right-0'>
                    <Image 
                      src='/downArrow.png' 
                      width={30} 
                      height={30} 
                      alt='dropdown'
                      className={`transform transition-transform duration-200 ${showAcademicDropdown ? 'rotate-180' : ''}`}
                    />
                  </span>
                </div>
                
                {/* Floor Dropdown Menu */}
                {showAcademicDropdown && (
                  <div className="w-full bg-white border-l-2 border-blue-500 ml-4">
                    {[0, 1, 2, 3, 4, 5].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                          selectedFloor === floor && selectedBuilding === 'Academic Block' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                        onClick={() => handleFloorSelect(floor, 'Academic Block')}
                      >
                        <span>Floor {floor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Block 2 */}
              <div className='relative'>
                <div 
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${
                    selectedBuilding === 'Academic Block 2' ? 'text-blue-600' : ''
                  }`}
                  onClick={() => {
                    setShowFloorDropdown2(!showFloorDropdown2);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown3(false);
                    setShowFloorDropdown4(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block'/></span>
                  <span>&nbsp;</span>
                  Academic Block 2
                  <span className='absolute right-0'>
                    <Image 
                      src='/downArrow.png' 
                      width={30} 
                      height={30} 
                      alt='dropdown'
                      className={`transform transition-transform duration-200 ${showFloorDropdown2 ? 'rotate-180' : ''}`}
                    />
                  </span>
                </div>
                
                {/* Floor Dropdown Menu */}
                {showFloorDropdown2 && (
                  <div className="w-full bg-white border-l-2 border-blue-500 ml-4">
                    {[0, 1, 2, 3, 4, 5].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                          selectedFloor === floor && selectedBuilding === 'Academic Block 2' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                        onClick={() => handleFloorSelect(floor, 'Academic Block 2')}
                      >
                        <span>Floor {floor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Architecture Building */}
              <div className='relative'>
                <div 
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${
                    selectedBuilding === 'Architecture Building' ? 'text-blue-600' : ''
                  }`}
                  onClick={() => {
                    setShowFloorDropdown3(!showFloorDropdown3);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown2(false);
                    setShowFloorDropdown4(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block'/></span>
                  <span>&nbsp;</span>
                  Architecture Building
                  <span className='absolute right-0'>
                    <Image 
                      src='/downArrow.png' 
                      width={30} 
                      height={30} 
                      alt='dropdown'
                      className={`transform transition-transform duration-200 ${showFloorDropdown3 ? 'rotate-180' : ''}`}
                    />
                  </span>
                </div>
                
                {/* Floor Dropdown Menu */}
                {showFloorDropdown3 && (
                  <div className="w-full bg-white border-l-2 border-blue-500 ml-4">
                    {[0, 1, 2, 3, 4, 5].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                          selectedFloor === floor && selectedBuilding === 'Architecture Building' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                        onClick={() => handleFloorSelect(floor, 'Architecture Building')}
                      >
                        <span>Floor {floor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lab Complex */}
              <div className='relative'>
                <div 
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${
                    selectedBuilding === 'Lab Complex' ? 'text-blue-600' : ''
                  }`}
                  onClick={() => {
                    setShowFloorDropdown4(!showFloorDropdown4);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown2(false);
                    setShowFloorDropdown3(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block'/></span>
                  <span>&nbsp;</span>
                  Lab Complex
                  <span className='absolute right-0'>
                    <Image 
                      src='/downArrow.png' 
                      width={30} 
                      height={30} 
                      alt='dropdown'
                      className={`transform transition-transform duration-200 ${showFloorDropdown4 ? 'rotate-180' : ''}`}
                    />
                  </span>
                </div>
                
                {/* Floor Dropdown Menu */}
                {showFloorDropdown4 && (
                  <div className="w-full bg-white border-l-2 border-blue-500 ml-4">
                    {[0, 1, 2, 3, 4, 5].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                          selectedFloor === floor && selectedBuilding === 'Lab Complex' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                        onClick={() => handleFloorSelect(floor, 'Lab Complex')}
                      >
                        <span>Floor {floor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Image src={Hamburger} width={50} height={50} alt='logo' className='pb-10 pt-6 cursor-pointer hover:scale-115 duration-300' onClick={handleOpen} />
            </div>
          
        </div>
        <div className={style['container-right']}>
            <div className={style['sub-container-right']}>
            <div className={style['input-container']} onClick={handleFocus}>
              <input ref={inputRef} type="text" placeholder='Search any floor' />
                    <div className={style['input-logo-container']}>
                        <Image src={Search} width={50} height={50} alt='logo' />
                
              </div>
            </div>
            <div className="relative">
              <div 
                className="relative w-10 h-10 cursor-pointer"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <Image 
                  src="/profile.png"
                  fill
                  sizes="(max-width: 50px) 50vw, 50px"
                  alt='Guest profile'
                  className="rounded-full object-cover"
                  priority
                />
              </div>
              
              {/* Profile Dropdown - simplified to just show "Guest" */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700">
                    Guest Mode
                  </div>
                </div>
              )}
            </div>

           
          </div>

          {/* Floor Map Display */}
          <div className="w-full h-[calc(100%-4rem)] mt-4">
            {isLoading ? (
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            ) : showFloorMap && selectedFloor !== null ? (
              <div className="w-full h-[calc(100%-4rem)]">
                <div className="flex justify-center items-center mb-4">
                  <h2 className="text-xl font-bold text-center w-1/2">
                    {selectedBuilding} - Floor {selectedFloor}
                  </h2>
                  <button
                    onClick={() => {
                      setShowFloorMap(false);
                      setSelectedFloor(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <FloorMap 
                  floorNumber={selectedFloor} 
                  academicBlock={
                    selectedBuilding === 'Academic Block' ? 1 :
                    selectedBuilding === 'Academic Block 2' ? 2 :
                    selectedBuilding === 'Architecture Building' ? 3 :
                    selectedBuilding === 'Lab Complex' ? 4 : 1
                  }
                />
              </div>
            ) : (
              <div className='w-full h-full flex items-center justify-center'>
                <div className='text-2xl font-bold text-gray-500'>Select a building and floor to view the map</div>
              </div>
            )}
          </div>
            </div>
        </div>
    </div>
  )
}

export default Page;