import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { fileUploadMiddleware } from "../middlewares/fileUpload.middleware.js";

const router = Router();

// Public routes
router.post("/auth/register", (req, res) => authController.register(req, res));
router.post("/auth/login", (req, res) => authController.login(req, res));
router.post("/auth/refresh", (req, res) =>
  authController.refreshToken(req, res)
);

// Protected routes
router.post("/logout", authMiddleware, (req, res) =>
  authController.logout(req, res)
);
router.get("/me/profile", authMiddleware, (req, res) =>
  authController.getProfile(req, res)
);
router.patch("/me/update-profile", authMiddleware, (req, res) =>
  authController.updateProfile(req, res)
);

// Get user profile by ID - MUST be before /auth/users to avoid route conflicts
router.get("/user/:userId", authMiddleware, (req, res) => {
  console.log("✅✅✅ Route /user/:userId MATCHED! ✅✅✅");
  console.log("📍 Request path:", req.path);
  console.log("📍 Request originalUrl:", req.originalUrl);
  console.log("📍 Request params:", req.params);
  console.log("📍 User ID:", req.params.userId);
  console.log("📍 Authenticated user:", req.user?.id);
  return authController.getUserProfile(req, res);
});

router.get("/auth/users", authMiddleware, (req, res) => authController.searchUsers(req, res));

router.post("/me/upload-avatar", authMiddleware, fileUploadMiddleware, (req, res) =>
  authController.uploadAvatar(req, res)
);

export default router;
