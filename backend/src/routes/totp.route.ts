import { Router } from "express";
import { totpController } from "../controllers/totp.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.post("/generate", authMiddleware, (req, res) =>
  totpController.generateTOTP(req, res)
);

router.post("/enable", authMiddleware, (req, res) =>
  totpController.verifyAndEnableTOTP(req, res)
);

router.post("/disable", authMiddleware, (req, res) =>
  totpController.disableTOTP(req, res)
);

export default router;
