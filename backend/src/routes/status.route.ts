import { Router } from "express";
import { statusController } from "../controllers/status.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { fileUploadMiddleware } from "../middlewares/fileUpload.middleware.js";

const router = Router();

// Protected routes
router.post("/create", authMiddleware, fileUploadMiddleware, (req, res) =>
  statusController.createStatus(req, res)
);

router.get("/all", authMiddleware, (req, res) =>
  statusController.getStatuses(req, res)
);

router.get("/my", authMiddleware, (req, res) =>
  statusController.getMyStatuses(req, res)
);

router.post("/view/:statusId", authMiddleware, (req, res) =>
  statusController.viewStatus(req, res)
);

router.post("/reaction/:statusId", authMiddleware, (req, res) =>
  statusController.addReaction(req, res)
);

router.delete("/reaction/:statusId", authMiddleware, (req, res) =>
  statusController.removeReaction(req, res)
);

router.delete("/delete/:statusId", authMiddleware, (req, res) =>
  statusController.deleteStatus(req, res)
);

export default router;
