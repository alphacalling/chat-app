import { Router } from "express";
import { inviteController } from "../controllers/invite.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.post("/create/:chatId", authMiddleware, (req, res) =>
  inviteController.createInviteLink(req, res)
);

router.get("/list/:chatId", authMiddleware, (req, res) =>
  inviteController.getInviteLinks(req, res)
);

router.post("/join", authMiddleware, (req, res) =>
  inviteController.joinViaInviteLink(req, res)
);

router.delete("/revoke/:linkId", authMiddleware, (req, res) =>
  inviteController.revokeInviteLink(req, res)
);

export default router;
