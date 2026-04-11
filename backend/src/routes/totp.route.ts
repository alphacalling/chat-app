import { Router } from "express";
import { totpController } from "../controllers/totp.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { totpLimiter } from "../middlewares/security.js";

const router = Router();

// Protected routes
router.post("/generate", authMiddleware, totpLimiter, (req, res) =>
  totpController.generateTOTP(req, res),
);

router.post("/enable", authMiddleware, totpLimiter, (req, res) =>
  totpController.verifyAndEnableTOTP(req, res),
);

router.post("/disable", authMiddleware, totpLimiter, (req, res) =>
  totpController.disableTOTP(req, res),
);

export default router;
