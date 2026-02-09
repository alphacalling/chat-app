import { Reply, Edit, Trash2, Pin, Smile, X, PinOff } from "lucide-react";

interface MessageContextMenuProps {
  x: number;
  y: number;
  onDelete?: () => void;
  onReply?: () => void;
  onEdit?: () => void;
  onReact?: () => void;
  onPin?: () => void;
  onClose: () => void;
  isOwn: boolean;
  isPinned?: boolean;
}

const MessageContextMenu = ({
  x,
  y,
  onDelete,
  onReply,
  onEdit,
  onReact,
  onPin,
  onClose,
  isOwn,
  isPinned,
}: MessageContextMenuProps) => {
  const menuItems = [
    {
      icon: Reply,
      label: "Reply",
      onClick: onReply,
      show: true,
      color: "text-blue-600 hover:bg-blue-50",
    },
    {
      icon: Smile,
      label: "React",
      onClick: onReact,
      show: true,
      color: "text-amber-600 hover:bg-amber-50",
    },
    {
      icon: isPinned ? PinOff : Pin,
      label: isPinned ? "Unpin" : "Pin",
      onClick: onPin,
      show: true,
      color: "text-purple-600 hover:bg-purple-50",
    },
    {
      icon: Edit,
      label: "Edit",
      onClick: onEdit,
      show: isOwn,
      color: "text-whatsapp-green hover:bg-green-50",
    },
    {
      icon: Trash2,
      label: "Delete",
      onClick: onDelete,
      show: isOwn,
      danger: true,
      color: "text-red-600 hover:bg-red-50",
    },
  ].filter((item) => item.show && item.onClick);

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        className="fixed z-50 bg-white border-2 border-whatsapp-border rounded-2xl shadow-2xl py-2 min-w-[200px] animate-in fade-in zoom-in duration-200 origin-top-left"
        style={{
          left: `${Math.min(x, window.innerWidth - 220)}px`,
          top: `${Math.min(y, window.innerHeight - 300)}px`,
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 border-b-2 border-whatsapp-border mb-1">
          <p className="text-xs font-bold text-whatsapp-secondary uppercase tracking-wider">
            Actions
          </p>
        </div>

        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className={`w-full px-4 py-3 text-left text-sm transition-all duration-300 flex items-center gap-3 ${item.color} group`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  item.danger
                    ? "bg-red-100 group-hover:bg-red-200"
                    : "bg-whatsapp-light group-hover:bg-opacity-80"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="font-semibold">{item.label}</span>
            </button>
          );
        })}

        <div className="border-t-2 border-whatsapp-border my-1" />

        <button
          onClick={onClose}
          className="w-full px-4 py-3 text-left text-sm text-whatsapp-secondary hover:bg-whatsapp-light hover:text-whatsapp-text transition-all duration-300 flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-whatsapp-light group-hover:bg-gray-200 flex items-center justify-center transition-all duration-300">
            <X className="h-4 w-4" />
          </div>
          <span className="font-semibold">Cancel</span>
        </button>
      </div>
    </>
  );
};

export default MessageContextMenu;
