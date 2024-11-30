import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; 
import axios from "axios"; 
import Navbar from "./Navbar";


// speech recognition
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const Chatbot = () => {
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); 
  const [isListening, setIsListening] = useState(false); 
  const chatEndRef = useRef(null); 

  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  const handleStartVoiceInput = () => {
    if (!recognition) {
      addChatMessage("bot", "Voice recognition is not supported on this browser.");
      return;
    }

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      addChatMessage("user", transcript);
      sendMessage(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      console.error("Voice recognition error:", event.error);
      addChatMessage("bot", "Sorry, I couldn't understand. Please try again.");
    };
  };

  const displayBills = () => {
    addChatMessage("bot", "To view latest bills say \"display bills\" or \"Show me bills\" or anything similar.");
  };

  const addCustomer = () => {
    addChatMessage("bot", "Format: \"Add a new customer: [CustomerName], [Phone]\"");
  }

  const displayCustomers = () => {
    addChatMessage("bot", "Format: \"get customer details of [name]\"");
  }

  const updatePhone = () => {
    addChatMessage("bot", "Format: \"update phone for [CustomerName], [NewPhone]\"");
  }

  const addBill = () =>{
    addChatMessage("bot", "Format: \"Add a bill for [CustomerName], [TotalAmount], [PaymentStatus]\"");
  }

  const viewOldBills = () => {
    addChatMessage("bot", "To view bills of a particular date you can select a day from the calender on the left.");
  }

  const deleteBill = ()=>{
    addChatMessage("bot", "Format: \"delete bill with id [BillID]\"");
  }

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (chatInput.trim() === "") return;

    addChatMessage("user", chatInput);
    await sendMessage(chatInput);

    setChatInput("");
  };

  const sendMessage = async (message) => {
    try {
      const response = await axios.post("http://localhost:5000/chat", {
        message,
      });

      const botMessage = response.data.message;
      addChatMessage("bot", botMessage);
    } catch (error) {
      console.error("Error sending message to backend:", error);
      addChatMessage("bot", "Sorry, something went wrong.");
    }
  };

  const addChatMessage = (sender, message) => {
    setChatLog((prevLog) => [...prevLog, { sender, message }]);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    const formattedDate = date ? date.toLocaleDateString() : "";
    const message = `Show me bills of ${formattedDate}`;
    addChatMessage("user", message);
    sendMessage(message);
  };

  return (
    <div className="chatbot">
      <Navbar />
      <header className="chatbot-header">
        <h1>Chat with conversoDB</h1>
      </header>

      <div className="chatbot-body">
        <div className="buttons-container">
          <div className="options-panel">
            <h3>Need Help?</h3>
            <button onClick={displayBills}>Display Bills</button>
            <button onClick={addCustomer}>Add Customer</button>
            <button onClick={displayCustomers}>Display Customer</button>
            <button onClick={updatePhone}>Update Phone</button>
            <button onClick={addBill}>Add a New Bill</button>
            <button onClick={deleteBill}>Delete Bill</button>
            <button onClick={viewOldBills}>View Old Bills</button>
          </div>

          {/* Calendar Section */}
          <div className="calendar-section">
            <h3>Select a date to view older bills:</h3>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select a day"
              className="calendar-input"
            />
          </div>
        </div>

        <div className="chat-display-container">
          <div className="chat-display">
            {chatLog.map((chat, index) => (
              <div
                key={index}
                className={`chat-message ${chat.sender === "user" ? "user" : "bot"}`}
                dangerouslySetInnerHTML={{ __html: chat.message }}
              />
            ))}
            <div ref={chatEndRef}></div> {/* Invisible element to scroll into view */}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Type your message here..."
            />
            <button onClick={handleSendMessage}>Send</button>
            <button
              onClick={handleStartVoiceInput}
              disabled={isListening}
              className="voice-input-button"
            >
              <i className={`fa-solid fa-microphone ${isListening ? "listening" : ""}`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
