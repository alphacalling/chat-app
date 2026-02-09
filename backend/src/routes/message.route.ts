import { Router } from "express";
import { messageController } from "../controllers/message.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { fileUploadMiddleware } from "../middlewares/fileUpload.middleware.js";

const router = Router();

// Protected routes (Login required)
router.get("/get-messages/:chatId", authMiddleware, (req, res) =>
  messageController.getMessages(req, res)
);

router.post("/send-message", authMiddleware, (req, res) =>
  messageController.sendMessage(req, res)
);

router.post("/send-media", authMiddleware, fileUploadMiddleware, (req, res) =>
  messageController.sendMedia(req, res)
);

router.delete("/delete-message/:messageId", authMiddleware, (req, res) =>
  messageController.deleteMessage(req, res)
);

router.put("/mark-read/:chatId", authMiddleware, (req, res) =>
  messageController.markChatAsRead(req, res)
);

router.get("/unread-count/:chatId", authMiddleware, (req, res) =>
  messageController.getUnreadCount(req, res)
);

router.get("/unread-counts", authMiddleware, (req, res) =>
  messageController.getAllUnreadCounts(req, res)
);

router.put("/edit/:messageId", authMiddleware, (req, res) =>
  messageController.editMessage(req, res)
);

router.post("/reaction/:messageId", authMiddleware, (req, res) =>
  messageController.addReaction(req, res)
);

router.delete("/reaction/:messageId", authMiddleware, (req, res) =>
  messageController.removeReaction(req, res)
);

router.post("/pin/:messageId", authMiddleware, (req, res) =>
  messageController.pinMessage(req, res)
);

router.post("/unpin/:messageId", authMiddleware, (req, res) =>
  messageController.unpinMessage(req, res)
);

router.get("/pinned/:chatId", authMiddleware, (req, res) =>
  messageController.getPinnedMessage(req, res)
);

export default router;
