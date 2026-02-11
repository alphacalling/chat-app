import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { fileUploadMiddleware } from "../middlewares/fileUpload.middleware.js";

const router = Router();

// Protected routes (Login required)
router.post("/access-chat", authMiddleware, (req, res) =>
  chatController.accessChat(req, res)
);
router.get("/fetch-chat", authMiddleware, (req, res) =>
  chatController.fetchChats(req, res)
);

// Group chat routes
router.post("/create-group", authMiddleware, (req, res) =>
  chatController.createGroup(req, res)
);
router.put("/rename-group", authMiddleware, (req, res) =>
  chatController.renameGroup(req, res)
);
router.put("/add-to-group", authMiddleware, (req, res) =>
  chatController.addToGroup(req, res)
);
router.put("/remove-from-group", authMiddleware, (req, res) =>
  chatController.removeFromGroup(req, res)
);
router.delete("/leave-group/:chatId", authMiddleware, (req, res) =>
  chatController.leaveGroup(req, res)
);

// Delete chat (per-user)
router.delete("/delete-chat/:chatId", authMiddleware, (req, res) =>
  chatController.deleteChat(req, res)
);

router.put("/update-description/:chatId", authMiddleware, (req, res) =>
  chatController.updateGroupDescription(req, res)
);

router.put("/update-avatar/:chatId", authMiddleware, fileUploadMiddleware, (req, res) =>
  chatController.updateGroupAvatar(req, res)
);

export default router;


