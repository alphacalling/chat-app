import { Router, type Response } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { fileUploadMiddleware } from "../middlewares/fileUpload.middleware.js";
import { authLimiter, uploadLimiter } from "../middlewares/security.js";
import type { AuthRequest } from "../types/type.js";
import { devLog } from "../utils/devLog.js";

const router = Router();

// Public routes
router.post("/auth/register", authLimiter, (req, res) =>
  authController.register(req, res),
);
router.post("/auth/login", authLimiter, (req, res) =>
  authController.login(req, res),
);
router.post("/auth/refresh", authLimiter, (req, res) =>
  authController.refreshToken(req, res),
);
router.post("/auth/forgot-password", authLimiter, (req, res) =>
  authController.forgotPassword(req, res),
);
router.post("/auth/reset-password", authLimiter, (req, res) =>
  authController.resetPassword(req, res),
);
router.post("/auth/reset-totp", authLimiter, (req, res) =>
  authController.resetTOTP(req, res),
);

// Protected routes
router.post("/logout", authMiddleware, (req, res) =>
  authController.logout(req, res),
);
router.get("/me/profile", authMiddleware, (req, res) =>
  authController.getProfile(req, res),
);
router.patch("/me/update-profile", authMiddleware, (req, res) =>
  authController.updateProfile(req, res),
);

router.get(
  "/user/:userId",
  authMiddleware,
  (req: AuthRequest, res: Response) => {
    devLog("✅✅✅ Route /user/:userId MATCHED! ✅✅✅");
    devLog("📍 Request path:", req.path);
    devLog("📍 Request originalUrl:", req.originalUrl);
    devLog("📍 Request params:", req.params);
    devLog("📍 User ID:", req.params.userId);
    devLog("📍 Authenticated user:", req.user?.id);
    return authController.getUserProfile(req, res);
  },
);

router.get("/auth/users", authMiddleware, (req, res) =>
  authController.searchUsers(req, res),
);

router.post(
  "/me/upload-avatar",
  authMiddleware,
  uploadLimiter,
  fileUploadMiddleware,
  (req, res) => authController.uploadAvatar(req, res),
);

export default router;
