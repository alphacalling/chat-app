import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

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

router.get("/auth/users", authMiddleware, (req, res) => authController.searchUsers(req, res));

export default router;
