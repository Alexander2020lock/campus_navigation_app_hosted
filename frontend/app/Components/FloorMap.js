"use client"
import React, { useEffect, useRef, useState } from 'react';
import { getTeacherDetails } from '../utils/excelData';

const FloorMap = ({ floorNumber, academicBlock = 1 }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [roomDetails, setRoomDetails] = useState(null);
  const [floorData, setFloorData] = useState(null);
  const [teacherDetailsHtml, setTeacherDetailsHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);
  const [svgError, setSvgError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Function to get the correct SVG path
  const getSvgPath = (floor, block) => {
    if (block === 1) {
      return `/Floor${floor}.svg`;
    } else if (block === 2) {
      return `/Block2/Floor${floor}.svg`;
    } else if (block === 3) {
      return `/arch/Floor${floor}.svg`;
    } else if (block === 4) {
      return `/lab/Floor${floor}.svg`;
    }
    return null;
  };

  // Load floor data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setSvgError(false);
      try {
        // Load data for Academic Block 1, 2, Architecture Building, and Lab Complex
        if (academicBlock === 1 || academicBlock === 2 || academicBlock === 3) {
          const floorModule = await import(`@/app/data/Floor${floorNumber}.js`);
          setFloorData(floorModule.default);
        } else if (academicBlock === 4) {
          const floorModule = await import(`@/app/data/lab/Floor${floorNumber}.js`);
          setFloorData(floorModule.default);
        } else {
          setFloorData(null);
        }
      } catch (error) {
        console.error(`Error loading data for floor ${floorNumber}:`, error);
        setFloorData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [floorNumber, academicBlock]);

  useEffect(() => {
    const handleSvgLoad = () => {
      if (svgRef.current) {
        const svgDoc = svgRef.current.contentDocument;
        if (svgDoc) {
          // Add styles to make SVG responsive and centered
          const svgElement = svgDoc.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '110%';
            svgElement.style.height = '110%';
            svgElement.style.maxHeight = '110vh';
            svgElement.style.transform = 'scale(1.0)';
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Add style tag to override cls-7 and set background
            const styleTag = document.createElement('style');
            styleTag.textContent = `
              .cls-7 {
                fill: #fff !important;
                stroke: #000 !important;
                stroke-width: 1px !important;
              }
              svg {
                background-color: white !important;
              }
            `;
            svgElement.appendChild(styleTag);
          }

          const rooms = svgDoc.querySelectorAll("[id^='room'], [id^='rect']");
          rooms.forEach((room) => {
            room.addEventListener("click", (e) => {
              const roomId = e.target.id;
              
              // Remove active class from all rooms first
              rooms.forEach(r => r.classList.remove("active"));
              
              if (floorData && floorData[roomId]) {
                // Set new selection
                e.target.classList.add("active");
                setSelectedRoom(e.target);
                setRoomDetails(floorData[roomId]);
                setShowDetails(true);
                setShowTeacherDetails(false);
                setTeacherDetailsHtml('');
              }
            });
          });
        }
      }
    };

    const handleSvgError = () => {
      console.error(`Failed to load SVG for Block ${academicBlock}, Floor ${floorNumber}`);
      setSvgError(true);
      setIsLoading(false);
    };

    if (svgRef.current) {
      svgRef.current.addEventListener('load', handleSvgLoad);
      svgRef.current.addEventListener('error', handleSvgError);
    }

    return () => {
      if (svgRef.current) {
        svgRef.current.removeEventListener('load', handleSvgLoad);
        svgRef.current.removeEventListener('error', handleSvgError);
      }
    };
  }, [selectedRoom, floorNumber, floorData, academicBlock]);

  const handleCloseDetails = () => {
    if (selectedRoom) {
      selectedRoom.classList.remove("active");
      setSelectedRoom(null);
    }
    setShowDetails(false);
    setShowTeacherDetails(false);
    setRoomDetails(null);
    setTeacherDetailsHtml('');
  };

  const handleViewTeacherDetails = async () => {
    if (!selectedRoom) return;

    setTeacherDetailsHtml('Loading teacher details...');
    setShowTeacherDetails(true);

    try {
      const teacherHtml = await getTeacherDetails(selectedRoom.id);
      setTeacherDetailsHtml(teacherHtml);
    } catch (error) {
      setTeacherDetailsHtml(`<p class='text-red-500'>Error loading teacher details: ${error.message}</p>`);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3)); // Max zoom 3x
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 0.5x
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const moveMap = (direction) => {
    const step = 50; // Pixels to move per click
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const maxX = (containerWidth * (zoomLevel - 1)) / 2;
    const maxY = (containerHeight * (zoomLevel - 1)) / 2;

    let newX = position.x;
    let newY = position.y;

    switch (direction) {
      case 'up':
        newY = Math.min(position.y + step, maxY);
        break;
      case 'down':
        newY = Math.max(position.y - step, -maxY);
        break;
      case 'left':
        newX = Math.min(position.x + step, maxX);
        break;
      case 'right':
        newX = Math.max(position.x - step, -maxX);
        break;
      default:
        break;
    }

    setPosition({ x: newX, y: newY });
  };

  const handleResetPosition = () => {
    setPosition({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  // Show "Map not available" message for all buildings except Academic Block 1, 2, Architecture Building, and Lab Complex
  if (academicBlock !== 1 && academicBlock !== 2 && academicBlock !== 3 && academicBlock !== 4) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700 mb-2">Map Not Available</p>
          <p className="text-gray-600">Floor maps for this building are currently under development.</p>
        </div>
      </div>
    );
  }

  if (svgError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Unable to load floor map</p>
          <p className="text-gray-600 mb-4">SVG file for Block {academicBlock}, Floor {floorNumber} may be missing or inaccessible</p>
          <button 
            onClick={() => {
              setSvgError(false);
              setIsLoading(true);
              window.location.reload();
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
          <button
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleResetZoom}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
            title="Reset Zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
        <div className="text-center text-sm text-gray-600 bg-white rounded-lg shadow-lg p-1">
          {Math.round(zoomLevel * 100)}%
        </div>
      </div>

      {/* Navigation Controls */}
      {zoomLevel > 1 && (
        <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-10">
          <div className="flex flex-col items-center gap-2 bg-white rounded-lg shadow-lg p-2">
            <button
              onClick={() => moveMap('up')}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
              title="Move Up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => moveMap('left')}
                className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
                title="Move Left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleResetPosition}
                className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
                title="Reset Position"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button
                onClick={() => moveMap('right')}
                className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
                title="Move Right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => moveMap('down')}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
              title="Move Down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* SVG Container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-0 overflow-hidden"
      >
        <object
          ref={svgRef}
          data={getSvgPath(floorNumber, academicBlock)}
          type="image/svg+xml"
          className="w-full h-full max-h-[180vh] object-contain"
          style={{ 
            maxWidth: '130%', 
            transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          <div className="text-center">
            <p className="text-red-500 mb-2">Unable to load floor map</p>
            <p className="text-gray-600 mb-4">SVG file for Block {academicBlock}, Floor {floorNumber} may be missing or inaccessible</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Try Reloading
            </button>
          </div>
        </object>

        {/* Room Details Panel */}
        {showDetails && roomDetails && (
          <div className="absolute left-4 top-4 bg-white rounded-lg shadow-lg p-3 w-80 z-10 max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-bold">Room Details</h2>
              <button
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {!showTeacherDetails ? (
              <>
                <div 
                  className="prose prose-sm overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: roomDetails.details }}
                />
                {roomDetails.hasTeachers && (
                  <button
                    className="mt-3 bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm"
                    onClick={handleViewTeacherDetails}
                  >
                    View Teacher Details
                  </button>
                )}
              </>
            ) : (
              <div className="teacher-details flex flex-col min-h-0">
                <h3 className="text-base font-semibold mb-2">Teacher Information</h3>
                <div 
                  className="overflow-y-auto flex-grow pr-2 custom-scrollbar mb-3"
                  style={{
                    maxHeight: 'calc(70vh - 9rem)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E0 #EDF2F7'
                  }}
                  dangerouslySetInnerHTML={{ __html: teacherDetailsHtml }}
                />
                <div className="bg-white pt-1">
                  <button
                    className="w-full bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 text-sm"
                    onClick={() => {
                      setShowTeacherDetails(false);
                      setTeacherDetailsHtml('');
                    }}
                  >
                    Back to Room Details
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloorMap; 