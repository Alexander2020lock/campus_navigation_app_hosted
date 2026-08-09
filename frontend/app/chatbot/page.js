"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";    
import { uploadAudio, sendChatMessage, getApiUrl } from "@/lib/api";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const [startFloorMap, setStartFloorMap] = useState("");
  const [endFloorMap, setEndFloorMap] = useState("");
  const [showStartMap, setShowStartMap] = useState(true);
  const [svgData, setSvgData] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  const toggleMap = () => {
    setShowStartMap((prev) => !prev);
  };

  // checks the message for /upload route
  function containsFromToAndNumber(sentence) {
    const fromToPattern = /\b(from\b.*\bto|to\b.*\bfrom)\b/i; // Matches 'from ... to' or 'to ... from'
    const numberPattern = /\b\d+\b/; // Check if a number exists

    return fromToPattern.test(sentence) && numberPattern.test(sentence);
  }

  const handleMapClose = () => {
    if (mapRef.current) {
      mapRef.current.style.display = 'none';
    }
    setEndFloorMap('')
    setStartFloorMap('')
    setSvgData('')
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const currentInput = input;
    const newMessage = { text: currentInput, sender: "user" };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInput("");

    if (containsFromToAndNumber(currentInput)) {
      // Create a FormData object for upload API
      const formData = new FormData();
      formData.append("text", currentInput);

      try {
        const response = await uploadAudio(formData);
        if (response.ok) {
          const contentType = response.headers.get("Content-Type") || "";

          if (contentType.includes("application/json")) {
            // Complex Path - JSON Response
            const data = await response.json();
            if (data.error) {
              alert(data.error);
              return;
            }
            const serverMessage = { text: "opening map!!", sender: "server" };
            setMessages((prevMessages) => [...prevMessages, serverMessage]);
            setStartFloorMap(data.files.start_floor);
            setEndFloorMap(data.files.end_floor);
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
      }

      if (mapRef.current) {
        mapRef.current.style.display = 'block';
      }
    } else {
      // Sending request to backend for /chat route
      try {
        const data = await sendChatMessage(currentInput);
        if (data.error) {
          alert(data.error);
          return;
        }

        const serverResponseText = data.response || data.message || JSON.stringify(data);
        const serverMessage = { text: serverResponseText, sender: "server" };
        setMessages((prevMessages) => [...prevMessages, serverMessage]);
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prevMessages) => [...prevMessages, { text: "Failed to get response from server.", sender: "server" }]);
      }
    }
  };

  const handleFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const router = useRouter();

  const handleClose = () => {
    router.push("/student"); // Redirect to "/student"
  };

  return (
    <div className="flex flex-col h-screen w-full mx-auto bg-white shadow-lg rounded-lg border">
      {/* Header */}
      <div className="bg-[#007BFF] h-[100px] text-white p-4 flex justify-between items-center rounded-t-lg">
        <div className="flex items-center">
          <Image src="/logoSend.png" width={100} height={100} alt="logo" />
          <h2 className="font-bold text-[35px] text-[#000000]">Campus Assistant</h2>
        </div>
        <div className="flex min-w-[8%] justify-between items-center">
        <Image src="/profile.png" width={50} height={50} alt="logo" />
        {/* Close button */}
      <button onClick={handleClose}>
        <Image src="/Close_White.png" width={50} height={50} alt="close" className="cursor-pointer" />
      </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-w-[100%] ml-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg w-fit max-w-[40%] ${msg.sender === "user"
              ? "bg-blue-500 text-white ml-auto text-right" // User messages align right
              : "bg-gray-300 text-black mr-auto text-left" // Server messages align left
              }`}
          >
            {msg.text.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        ))}
      </div>

      {/* Input & Buttons */}
      <div
        onClick={handleFocus}
        className="flex mx-auto mb-[5%] items-center p-2 bg-[rgba(217,217,217,0.5)] rounded-b-lg w-[80%] h-[100px] rounded-[10px] text-[#212529] cursor-text"
      >
        <Image
          src="/voice.png"
          width={50}
          height={50}
          alt="logo"
          className="cursor-pointer"
        />

        <input
          ref={inputRef}
          type="text"
          className="flex-1 p-2 outline-none rounded-lg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          focus='true'
        />

        <Image
          src="/send.png"
          width={50}
          height={50}
          alt="logo"
          className="cursor-pointer"
          onClick={handleSendMessage}
        />
      </div>
      <div className="flex gap-6 mt-6 absolute top-5 left-150 z-50 text-black">
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
              className="w-[500px] h-[500px] border rounded-lg"
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default Chatbot;
