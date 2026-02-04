import { format } from "date-fns";
import { useAuth } from "../context/useAuth";

interface Message {
  id: string;
  content: string;
  type: string;
  status: string;
  senderId: string;
  chatId: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth();
  const fromMe = message.senderId === user?.id;

  // Status icons (WhatsApp style ticks)
  const StatusIcon = () => {
    if (!fromMe) return null;

    switch (message.status) {
      case "SENT":
        return <span className="text-gray-400">✓</span>;
      case "DELIVERED":
        return <span className="text-gray-400">✓✓</span>;
      case "READ":
        return <span className="text-blue-400">✓✓</span>;
      default:
        return <span className="text-gray-500">⏳</span>; // Pending
    }
  };

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 rounded-lg shadow-sm
          ${fromMe 
            ? "bg-outgoing-bg rounded-tr-none" 
            : "bg-incoming-bg rounded-tl-none"
          }`}
      >
        {/* Message content */}
        <p className="text-sm text-white break-words">{message.content}</p>
        
        {/* Timestamp and status */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-gray-400">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
          <StatusIcon />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;