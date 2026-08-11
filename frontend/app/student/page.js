"use client"
import React, { useRef, useState, useEffect } from 'react'
import style from './Student.module.css'
import Image from 'next/image';
import Recent from '../../public/recent.png'
import Hamburger from '../../public/hamburger.png'
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { Montserrat } from "next/font/google";
import FloorMap from '../Components/FloorMap';
import Link from 'next/link';
import Teacher from '@/components/Teacher';
import ShowPath from '@/components/ShowPath';
import { listEvents, registerEvent, cancelRegistration } from '@/lib/api';


const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["100", "400", "700"],
  variable: "--font-montserrat",
});

function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const router = useRouter();
  const [showFloorDropdown2, setShowFloorDropdown2] = useState(false);
  const [showFloorDropdown3, setShowFloorDropdown3] = useState(false);
  const [showFloorDropdown4, setShowFloorDropdown4] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [isHomeSelected, setIsHomeSelected] = useState(true);
  const [showFloorMap, setShowFloorMap] = useState(false);
  const [showAcademicDropdown, setShowAcademicDropdown] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [registeredEvents, setRegisteredEvents] = useState(new Set());
  const [registeredEmails, setRegisteredEmails] = useState({});
  const buttonRef = useRef(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    attendee_name: '',
    attendee_email: ''
  });

  // Effect for authentication and initialization
  useEffect(() => {
    let authInitialized = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!authInitialized) {
          authInitialized = true;
          setIsInitialized(true);
        }

        if (user) {
          console.log("User is signed in:", user.email);
          setUserPhoto(user.photoURL);
          
          // Pre-fill registration form with account name & email
          const name = user.displayName || (user.email ? user.email.split('@')[0] : '');
          setRegistrationForm({
            attendee_name: name,
            attendee_email: user.email || ''
          });

          // Restore and sync stored event registrations with backend database
          if (user?.email) {
            try {
              const serverRegistrations = await getUserRegistrations(user.email);
              if (Array.isArray(serverRegistrations)) {
                const freshSet = new Set(serverRegistrations);
                setRegisteredEvents(freshSet);
                if (typeof window !== 'undefined') {
                  localStorage.setItem(`registered_events_${user.email}`, JSON.stringify(Array.from(freshSet)));
                }
              }
            } catch (err) {
              console.error("Error syncing registrations from database:", err);
            }
          }

          // Allow codernavank@gmail.com or @vitbhopal.ac.in emails
          if (!user.email.endsWith('@vitbhopal.ac.in') && user.email !== 'codernavank@gmail.com' && user.email !== 'dakshdugar890@gmail.com') {
            await signOut(auth);
            router.replace('/login');
            return;
          }
          setIsLoading(false); // Set loading to false only after successful auth
        } else {
          console.log("No user signed in, redirecting to login");
          router.replace('/login');
        }
      } catch (error) {
        console.error("Authentication error:", error);
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Effect for media loading
  useEffect(() => {
    if (!isInitialized) return; // Don't start media loading until auth is initialized

    const handleLoad = () => {
      setIsLoading(false);
    };

    const initializeMediaLoading = () => {
      const images = Array.from(document.querySelectorAll('Image'));
      const mediaElements = [...images];
      let loadedCount = 0;

      mediaElements.forEach((media) => {
        if (!media) return;

        if (media.complete || media.readyState >= 3) {
          loadedCount++;
        } else {
          media.addEventListener('load', () => {
            loadedCount++;
            if (loadedCount === mediaElements.length) handleLoad();
          });
        }
      });

      if (loadedCount === mediaElements.length) handleLoad();
    };

    initializeMediaLoading();
  }, [isInitialized]);

  // Effect for fetching events
  useEffect(() => {
    const fetchEvents = async () => {
      if (showEvents) {
        setIsLoadingEvents(true);
        try {
          const data = await listEvents();
          setEvents(data);

          // Sync student's live registration state from database
          const currentUser = auth.currentUser;
          if (currentUser?.email) {
            const serverRegistrations = await getUserRegistrations(currentUser.email);
            if (Array.isArray(serverRegistrations)) {
              const freshSet = new Set(serverRegistrations);
              setRegisteredEvents(freshSet);
              if (typeof window !== 'undefined') {
                localStorage.setItem(`registered_events_${currentUser.email}`, JSON.stringify(Array.from(freshSet)));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching events:', error);
        } finally {
          setIsLoadingEvents(false);
        }
      }
    };

    fetchEvents();
  }, [showEvents]);

  const handleOpen = () => {
    setIsOpen(!isOpen)
  }

  const handleSearchOpen = (e) => {
    e.stopPropagation();
    if (buttonRef.current) {
      buttonRef.current.style.display = "block";
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error("Error signing out:", error);
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

  // Function to handle registration form input changes
  const handleRegistrationInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to handle event registration
  const handleRegister = async (event) => {
    setSelectedEvent(event);
    const currentUser = auth.currentUser;
    const autoEmail = currentUser?.email || '';
    const autoName = currentUser?.displayName || (autoEmail ? autoEmail.split('@')[0] : '');
    
    setRegistrationForm({
      attendee_name: autoName,
      attendee_email: autoEmail
    });
    setShowRegistrationForm(true);
  };

  // Function to submit registration
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventId = selectedEvent.id || selectedEvent._id;
      const attendeeName = registrationForm.attendee_name.trim();
      const attendeeEmail = registrationForm.attendee_email.trim();

      const payload = {
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        name: attendeeName,
        email: attendeeEmail
      };

      await registerEvent(eventId, payload);

      const currentUser = auth.currentUser;
      const userEmail = attendeeEmail || currentUser?.email;

      setRegisteredEvents(prev => {
        const next = new Set([...prev, eventId]);
        if (typeof window !== 'undefined' && userEmail) {
          try {
            localStorage.setItem(`registered_events_${userEmail}`, JSON.stringify(Array.from(next)));
          } catch (err) {
            console.error("Error saving registered events to localStorage:", err);
          }
        }
        return next;
      });

      setRegisteredEmails(prev => {
        const next = { ...prev, [eventId]: attendeeEmail };
        if (typeof window !== 'undefined' && userEmail) {
          try {
            localStorage.setItem(`registered_emails_${userEmail}`, JSON.stringify(next));
          } catch (err) {
            console.error("Error saving registered emails to localStorage:", err);
          }
        }
        return next;
      });

      setShowRegistrationForm(false);
      alert('Successfully registered for the event!');
    } catch (error) {
      console.error('Error registering for event:', error);
      alert(error.message || 'Failed to register for the event. Please try again.');
    }
  };

  // Function to cancel registration
  const handleCancelRegistration = async (eventId) => {
    const currentUser = auth.currentUser;
    let emailToUse = registeredEmails[eventId] || currentUser?.email;
    if (!emailToUse) {
      emailToUse = window.prompt("Please enter the email address used during registration to cancel:");
    }
    if (!emailToUse) return;

    if (!window.confirm("Are you sure you want to cancel your registration for this event?")) return;
    try {
      await cancelRegistration(eventId, {
        attendee_email: emailToUse,
        email: emailToUse
      });

      setRegisteredEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        if (typeof window !== 'undefined' && emailToUse) {
          try {
            localStorage.setItem(`registered_events_${emailToUse}`, JSON.stringify(Array.from(next)));
          } catch (err) {
            console.error("Error updating localStorage after cancellation:", err);
          }
        }
        return next;
      });

      setRegisteredEmails(prev => {
        const next = { ...prev };
        delete next[eventId];
        if (typeof window !== 'undefined' && emailToUse) {
          try {
            localStorage.setItem(`registered_emails_${emailToUse}`, JSON.stringify(next));
          } catch (err) {
            console.error("Error updating localStorage after cancellation:", err);
          }
        }
        return next;
      });

      alert('Registration cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert(error.message || 'Failed to cancel registration.');
    }
  };

  // Show loading spinner while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }


  return (
    <div className="relative w-full h-screen select-none">
      <div className={style['container']}>

        <ShowPath buttonRef={buttonRef}/>

        <div className={style['container-left']}>
          <div className={style['container-left-top']}>
            <div className={[style['hamburger-container'], isOpen ? (style.open) : (style.close), montserrat.variable, 'shadow-[4px_0px_4px_2px_#00000040] hover:shadow-[6px_0px_6px_3px_#00000050]'].join(' ')}>
              <div className='flex justify-between items-center border-b-2'>
                <p className='inline-block font-bold text-2xl'>Campus Navigator</p>
                <span onClick={handleOpen} className='cursor-pointer hover:scale-115 duration-300 inline-block'><Image src='/Close.png' width={30} height={30} alt='close' /></span>
              </div>
              <div className='w-full mt-8 cursor-pointer flex items-center' onClick={handleHomeClick}>
                <span><Image src='/Home.png' width={30} height={30} alt='home' /></span>
                <span className={isHomeSelected ? 'text-blue-600' : ''}> Home</span>
              </div>
              <div className='w-full mt-4 cursor-pointer flex items-center' onClick={() => setShowEvents(!showEvents)}>
                <span className={showEvents ? 'text-blue-600' : ''}> Events</span>
              </div>
              <div className='relative'>
                <div
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${selectedBuilding === 'Academic Block' ? 'text-blue-600' : ''
                    }`}
                  onClick={() => {
                    setShowAcademicDropdown(!showAcademicDropdown);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown2(false);
                    setShowFloorDropdown3(false);
                    setShowFloorDropdown4(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block' /></span>
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
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${selectedFloor === floor && selectedBuilding === 'Academic Block' ? 'bg-blue-50 text-blue-600' : ''
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
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${selectedBuilding === 'Academic Block 2' ? 'text-blue-600' : ''
                    }`}
                  onClick={() => {
                    setShowFloorDropdown2(!showFloorDropdown2);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown3(false);
                    setShowFloorDropdown4(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block' /></span>
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
                    {[0, 1, 2].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${selectedFloor === floor && selectedBuilding === 'Academic Block 2' ? 'bg-blue-50 text-blue-600' : ''
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
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${selectedBuilding === 'Architecture Building' ? 'text-blue-600' : ''
                    }`}
                  onClick={() => {
                    setShowFloorDropdown3(!showFloorDropdown3);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown2(false);
                    setShowFloorDropdown4(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block' /></span>
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
                    {[0, 1, 2, 3].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${selectedFloor === floor && selectedBuilding === 'Architecture Building' ? 'bg-blue-50 text-blue-600' : ''
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
                  className={`w-full mt-4 relative cursor-pointer flex items-center ${selectedBuilding === 'Lab Complex' ? 'text-blue-600' : ''
                    }`}
                  onClick={() => {
                    setShowFloorDropdown4(!showFloorDropdown4);
                    setShowFloorDropdown(false);
                    setShowFloorDropdown2(false);
                    setShowFloorDropdown3(false);
                  }}
                >
                  <span><Image src='/block.png' width={20} height={20} alt='block' /></span>
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
                    {[0, 1, 2].map((floor) => (
                      <div
                        key={floor}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${selectedFloor === floor && selectedBuilding === 'Lab Complex' ? 'bg-blue-50 text-blue-600' : ''
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
            <Image src={Recent} width={50} height={50} alt='logo' />
          </div>

        </div>
        <div className={style['container-right']}>
          <div className={style['sub-container-right']}>
            <Teacher handleSearchOpen={handleSearchOpen} />
            <div className="relative">
              <div
                className="relative w-10 h-10 cursor-pointer"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <Image
                  src={userPhoto || '/profile.png'}
                  fill
                  sizes="(max-width: 50px) 50vw, 50px"
                  alt='User profile'
                  className="rounded-full object-cover"
                  priority
                />
              </div>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <div className={style['bot-container']}>
              <Link href="/chatbot"><Image src='/Chatbot.png' width={45} height={45} alt='logo' /></Link>
            </div>
          </div>

          {/* Floor Map Display */}
          <div className="w-full h-[calc(100%-4rem)] mt-4 overflow-hidden">
            {isLoading ? (
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            ) : showEvents ? (
              <div className="w-full h-full p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Upcoming Events</h2>
                  <button
                    onClick={() => setShowEvents(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                {isLoadingEvents ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                  </div>
                ) : events.length > 0 ? (
                  <div className="grid gap-4">
                    {events.map((event, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg">{event.title}</h3>
                        <p className="text-gray-600">Date: {event.date}</p>
                        <p className="text-gray-600">Time: {event.time}</p>
                        <p className="text-gray-600">Location: {event.location}</p>
                        {event.description && (
                          <p className="text-gray-600 mt-2">{event.description}</p>
                        )}
                        <div className="mt-4 flex gap-2 items-center">
                          {registeredEvents.has(event.id || event._id) ? (
                            <>
                              <button
                                className="bg-green-600 text-white px-4 py-2 rounded-md font-medium cursor-default"
                                disabled
                              >
                                Registered
                              </button>
                              <button
                                onClick={() => handleCancelRegistration(event.id || event._id)}
                                className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors text-sm"
                              >
                                Cancel Registration
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleRegister(event)}
                              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                            >
                              Register
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    No upcoming events found
                  </div>
                )}

                {/* Registration Form Modal */}
                {showRegistrationForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                      <h2 className="text-xl font-bold mb-4">Register for {selectedEvent?.title}</h2>
                      <form onSubmit={handleRegistrationSubmit}>
                        <div className="mb-4">
                          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="attendee_name">
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="attendee_name"
                            name="attendee_name"
                            value={registrationForm.attendee_name}
                            onChange={handleRegistrationInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="attendee_email">
                            College Email
                          </label>
                          <input
                            type="email"
                            id="attendee_email"
                            name="attendee_email"
                            value={registrationForm.attendee_email}
                            onChange={handleRegistrationInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowRegistrationForm(false);
                              setRegistrationForm({
                                attendee_name: '',
                                attendee_email: ''
                              });
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : showFloorMap && selectedFloor !== null ? (
              <div className="w-full h-full overflow-hidden">
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