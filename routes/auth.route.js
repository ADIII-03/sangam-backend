import express from "express";

import { login, logout, signup , verifyEmail , forgotPassword , resetPassword , checkAuth, getUserProfile, updateUserProfile, requestVolunteer, getUserVolunteeredNgos, getsuggestedUsers, getUserById , searchUsers, verifyFemale} from "../controllers/auth.controller.js";
import { verify } from "crypto";

import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

import {upload} from "../middleware/multer.middleware.js";
import { checkNgoProfile } from "../middleware/checkNgoProfile.js";

router.post("/signup", upload.single("profilepic") , signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/verify-email" , verifyEmail)
router.post("/forgot-password" , forgotPassword)
router.post("/reset-password/:token" , resetPassword)
router.get("/check-auth", verifyToken , checkAuth);

router.get("/get-user", verifyToken, getUserProfile);
router.post("/update-user", verifyToken, upload.single("profilepic"), updateUserProfile);
router.get("/get-other-users", verifyToken, getsuggestedUsers);
router.post("/:ngoId/request-volunteer", verifyToken, requestVolunteer);
router.get("/getuser-volunteered-ngo", verifyToken, getUserVolunteeredNgos);
// routes/ngo.routes.js
router.get("/my-profile", verifyToken, checkNgoProfile, (req, res) => {
  res.status(200).json({
    success: true,
    ngo: req.ngo,
  });
});

router.get("/search/accounts", verifyToken , searchUsers);
router.get("/user/:id", verifyToken, getUserById);

router.post("/verify-female" ,verifyToken,upload.single("idProof") , verifyFemale)
export default router;