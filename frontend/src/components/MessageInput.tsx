import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  sendMessage: (content: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

const MessageInput = ({ 
  sendMessage, 
  onTyping, 
  onStopTyping,
  disabled = false 
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.length > 0) {
      // Start typing
      if (!isTypingRef.current && onTyping) {
        isTypingRef.current = true;
        onTyping();
      }

      // Reset stop typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) {
          onStopTyping();
          isTypingRef.current = false;
        }
      }, 2000);
    } else {
      // Empty input - stop typing immediately
      if (isTypingRef.current && onStopTyping) {
        onStopTyping();
        isTypingRef.current = false;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;
    
    sendMessage(message.trim());
    setMessage("");
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current && onStopTyping) {
      onStopTyping();
      isTypingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-whatsapp-panel flex items-center gap-3"
    >
      {/* Emoji Button */}
      <button 
        type="button" 
        className="text-gray-400 hover:text-white text-xl transition-colors"
        title="Emoji"
      >
        😊
      </button>

      {/* Attachment Button */}
      <button 
        type="button" 
        className="text-gray-400 hover:text-white text-xl transition-colors"
        title="Attach file"
      >
        📎
      </button>

      {/* Input Field */}
      <input
        type="text"
        className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 outline-none 
                   placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={disabled ? "Connecting..." : "Type a message"}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className={`text-2xl transition-colors ${
          message.trim() && !disabled
            ? "text-whatsapp-green hover:text-green-400 cursor-pointer" 
            : "text-gray-500 cursor-not-allowed"
        }`}
        title="Send message"
      >
        ➤
      </button>
    </form>
  );
};

export default MessageInput;