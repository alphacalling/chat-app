import { Reply, Edit, Trash2, Pin, Smile, X, PinOff } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const menuItems = [
    {
      icon: Reply,
      label: "Reply",
      onClick: onReply,
      show: true,
      color: "text-blue-600",
      hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
      iconBg:
        "bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40",
    },
    {
      icon: Smile,
      label: "React",
      onClick: onReact,
      show: true,
      color: "text-amber-600",
      hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
      iconBg:
        "bg-amber-50 dark:bg-amber-900/30 group-hover:bg-amber-100 dark:group-hover:bg-amber-800/40",
    },
    {
      icon: isPinned ? PinOff : Pin,
      label: isPinned ? "Unpin" : "Pin",
      onClick: onPin,
      show: true,
      color: "text-purple-600",
      hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
      iconBg:
        "bg-purple-50 dark:bg-purple-900/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-800/40",
    },
    {
      icon: Edit,
      label: "Edit",
      onClick: onEdit,
      show: isOwn,
      color: "text-teal-600",
      hoverBg: "hover:bg-teal-50 dark:hover:bg-teal-900/20",
      iconBg:
        "bg-teal-50 dark:bg-teal-900/30 group-hover:bg-teal-100 dark:group-hover:bg-teal-800/40",
    },
    {
      icon: Trash2,
      label: "Delete",
      onClick: onDelete,
      show: isOwn,
      danger: true,
      color: "text-red-600",
      hoverBg: "hover:bg-red-50 dark:hover:bg-red-900/20",
      iconBg:
        "bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-800/40",
    },
  ].filter((item) => item.show && item.onClick);

  // Calculate safe position after mount
  const calculatePosition = useCallback(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const padding = 8;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newX = x;
    let newY = y;

    // Horizontal bounds
    if (newX + menuWidth + padding > vw) {
      newX = vw - menuWidth - padding;
    }
    if (newX < padding) {
      newX = padding;
    }

    // Vertical bounds
    if (newY + menuHeight + padding > vh) {
      newY = vh - menuHeight - padding;
    }
    if (newY < padding) {
      newY = padding;
    }

    setPosition({ x: newX, y: newY });
    setVisible(true);
  }, [x, y]);

  useEffect(() => {
    // Small delay to let menu render and get dimensions
    requestAnimationFrame(calculatePosition);
  }, [calculatePosition]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);

  // Close on resize
  useEffect(() => {
    const handleResize = () => onClose();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        role="menu"
        aria-label="Message actions"
        className={`fixed z-50 
    bg-white dark:bg-gray-50 
    border border-gray-200 dark:border-gray-300 
    rounded-xl shadow-xl 
    dark:shadow-black/40
    py-1 
    min-w-[160px] max-w-[200px]
    ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}
  `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Menu Items */}
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isBeforeDanger = !item.danger && menuItems[index + 1]?.danger;

          return (
            <div key={index}>
              <button
                role="menuitem"
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
                className={`w-full px-2.5 py-[7px] text-left text-[13px] 
                  transition-colors duration-150 
                  flex items-center gap-2.5 
                  group outline-none
                  cursor-pointer
                  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400
                  ${item.hoverBg} ${item.color}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center 
                    transition-colors duration-150 shrink-0
                    ${item.iconBg}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium truncate">{item.label}</span>
              </button>

              {/* Separator before danger zone */}
              {isBeforeDanger && (
                <div className="my-0.5 mx-2 border-t border-gray-100 dark:border-gray-700" />
              )}
            </div>
          );
        })}

        {/* Cancel Separator + Button */}
        <div className="my-0.5 mx-2.5 border-t border-gray-100 dark:border-gray-700" />
        <button
          role="menuitem"
          onClick={onClose}
          className="w-full px-2.5 py-[7px] text-left text-[13px] 
            text-gray-800 
            hover:bg-gray-50 dark:hover:bg-gray-500/50
            hover:text-gray-700
            transition-colors duration-150 
            flex items-center gap-2.5 
            group outline-none
            focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center 
              bg-gray-50 dark:bg-gray-700/50 
              group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 
              transition-colors duration-150 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium">Cancel</span>
        </button>
      </div>
    </>
  );
};

export default MessageContextMenu;
