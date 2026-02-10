import { useState, useRef } from "react";
import { Button } from "./ui/button";
import EmojiPicker from "./EmojiPicker";
import {
  Paperclip,
  Send,
  Smile,
  Mic,
  Image,
  FileText,
  Film,
} from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia?: (file: File) => void;
  replyingTo?: any;
  onCancelReply?: () => void;
}

const MessageInput = ({
  onSendMessage,
  onSendMedia,
  replyingTo,
  onCancelReply,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSendMessage(message.trim());
    setMessage("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendMedia) {
      onSendMedia(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
    setShowAttachMenu(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    const ta = inputRef.current;
    if (ta) {
      const start = ta.selectionStart ?? message.length;
      const end = ta.selectionEnd ?? message.length;
      const newText = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newText);
      ta.focus();
      requestAnimationFrame(() => {
        const pos = start + emoji.length;
        ta.setSelectionRange(pos, pos);
      });
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  return (
    <div className="relative z-0">
      {/* Attachment Menu */}
      {showAttachMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowAttachMenu(false)}
          />
          <div className="absolute bottom-full left-0 mb-3 bg-white rounded-2xl shadow-2xl border-2 border-stone-200 p-3 z-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex gap-2">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-stone-100 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Image className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-stone-600">
                  Photo
                </span>
              </button>

              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-stone-100 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Film className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-stone-600">
                  Video
                </span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-stone-100 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-stone-600">
                  Document
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
      />
      <input
        ref={imageInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
      />
      <input
        ref={videoInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="video/*"
      />

      {/* Main Input Form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 bg-white rounded-2xl p-2 border-2 border-stone-200 shadow-sm focus-within:border-teal-400 focus-within:shadow-lg focus-within:shadow-teal-500/5 transition-all duration-300"
      >
        {/* Attachment Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`h-11 w-11 rounded-xl transition-all duration-300 flex-shrink-0 ${
            showAttachMenu
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "hover:bg-stone-100 text-stone-500 hover:text-teal-600"
          }`}
          title="Attach file"
        >
          <Paperclip
            className={`h-5 w-5 transition-transform duration-300 ${showAttachMenu ? "rotate-45" : ""}`}
          />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full bg-stone-50 text-stone-800 px-4 py-3 rounded-xl outline-none text-sm placeholder-stone-400 resize-none max-h-[120px] overflow-y-auto transition-all duration-300 focus:bg-stone-100 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent"
          />
        </div>

        {/* Emoji Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAttachMenu(false);
            setShowEmojiPicker((prev) => !prev);
          }}
          className={`h-11 w-11 flex-shrink-0 rounded-xl transition-all duration-300 inline-flex items-center justify-center relative z-10 ${
            showEmojiPicker
              ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
              : "hover:bg-stone-100 text-stone-500 hover:text-amber-500"
          }`}
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Send / Voice Button */}
        {message.trim() ? (
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0 shadow-lg shadow-teal-600/30 transition-all duration-300 rounded-xl hover:scale-105 hover:shadow-xl hover:shadow-teal-600/40"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0 shadow-lg shadow-teal-600/30 transition-all duration-300 rounded-xl hover:scale-105"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </form>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          position={{
            x: Math.max(
              16,
              Math.min(window.innerWidth - 376, window.innerWidth / 2 - 180),
            ),
            y: Math.max(16, window.innerHeight - 480),
          }}
          showQuickReactions={true}
        />
      )}
    </div>
  );
};

export default MessageInput;
