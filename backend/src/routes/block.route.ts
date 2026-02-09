import { Router } from "express";
import { blockController } from "../controllers/block.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.post("/block", authMiddleware, (req, res) =>
  blockController.blockUser(req, res)
);

router.post("/unblock", authMiddleware, (req, res) =>
  blockController.unblockUser(req, res)
);

router.get("/list", authMiddleware, (req, res) =>
  blockController.getBlockedUsers(req, res)
);

export default router;
