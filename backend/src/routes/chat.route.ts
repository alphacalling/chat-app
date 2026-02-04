import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes (Login required)
router.post("/access-chat", authMiddleware, (req, res) =>
  chatController.accessChat(req, res)
);
router.get("/fetch-chat", authMiddleware, (req, res) =>
  chatController.fetchChats(req, res)
);

export default router;


