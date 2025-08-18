import React, { useState, useEffect, useRef } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceOrder({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      onCommand(spokenText);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert("Speech recognition error: " + event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onCommand]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    }
  };

  return (
    <div>
      <button onClick={startListening} disabled={isListening}>
        {isListening ? "Listening..." : "Speak your order"}
      </button>
      <p>Recognized: {transcript}</p>
    </div>
  );
}
