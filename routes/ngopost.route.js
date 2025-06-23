import express from "express";
import {
  createNGOPost,
  getAllNGOPosts,
  getNGOPostById,
  updateNGOPost,
  deleteNGOPost,
  likeNgoPost,
  commentOnNgoPost,
  flagNgoPost,
  shareNgoPost,
  getWhoCommentedOnNGOPost,
} from "../controllers/ngopost.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { upload } from "../middleware/multer.middleware.js";
import { checkNgoProfile } from "../middleware/checkNgoProfile.js";
const router = express.Router();

// Create a new NGO post
router.post(
  "/create",
  verifyToken,
  checkNgoProfile, 
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 },
    { name: "documents", maxCount: 3 },
  ]),
  createNGOPost
);

// Get all NGO posts
router.get("/", verifyToken,  getAllNGOPosts);

// Get a single NGO post by ID
router.get("/:postId", verifyToken, getNGOPostById);
// Update an NGO post
router.put(
  "/:postId",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 },
    { name: "documents", maxCount: 3 },
  ]),
  updateNGOPost
);

// Delete an NGO post

router.delete("/:postId", verifyToken, deleteNGOPost);

// Like/Unlike an NGO post
router.patch("/:postId/like", verifyToken, likeNgoPost);

// Comment on a post
router.post("/:postId/comment", verifyToken, commentOnNgoPost);

// Flag a post
router.post("/:postId/flag", verifyToken, flagNgoPost);

// Share a post
router.post("/:postId/share", verifyToken, shareNgoPost);

router.get("/:postId/commenters", verifyToken, getWhoCommentedOnNGOPost);
export default router;
