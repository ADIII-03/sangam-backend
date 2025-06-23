import express from "express";
import {
  createUserPost,
  getAllUserPosts,
  getUserPostById,
  updateUserPost,
  deleteUserPost,
  likeUserPost,
  commentOnUserPost,
  flagUserPost,
  shareUserPost,
  getwhocomments,
} from "../controllers/userpost.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();
// Create a new user post
router.post(
  "/create",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 },
    { name: "documents", maxCount: 3 },
  ]),
  createUserPost
);
// Get all user posts
router.get("/", verifyToken, getAllUserPosts);
// Get a single user post by ID
router.get("/:postId", verifyToken, getUserPostById);
// Update a user post
router.put(
  "/:postId",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 },
    { name: "documents", maxCount: 3 },
  ]),
  updateUserPost
);
// Delete a user post
router.delete("/:postId", verifyToken, deleteUserPost);
// Like/Unlike a user post
router.patch("/:postId/like", verifyToken, likeUserPost);
// Comment on a post
router.post("/:postId/comment", verifyToken, commentOnUserPost);
// Flag a post
router.post("/:postId/flag", verifyToken, flagUserPost);
// Share a post
router.post("/:postId/share", verifyToken, shareUserPost);
router.get("/:postId/get-who-comment", verifyToken , getwhocomments)
export default router;

  