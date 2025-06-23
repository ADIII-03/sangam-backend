import express from "express";
import {
  acceptVolunteers,
 createNGO,
 getallVolunteerRequests,
 getngodetails,
 getVolunteers,
 updateNgo ,
  getposts ,
  rejectVolunteers
 
} from "../controllers/ngo.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { checkNgoProfile } from "../middleware/checkNgoProfile.js";
const router = express.Router();

import { upload } from "../middleware/multer.middleware.js";


router.post(
  "/create",
  verifyToken,

  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "doc", maxCount: 1 },
  ]),
  createNGO
);

router.get("/:ngoId", verifyToken, getngodetails);
router.post("/:ngoId/accept-volunteer", verifyToken, acceptVolunteers);
router.post("/:ngoId/reject-volunteer", verifyToken, rejectVolunteers);
router.get("/:ngoId/get-volunteers", verifyToken ,getVolunteers);
router.get("/:ngoId/volunteer-requests", verifyToken, getallVolunteerRequests );
router.post("/:ngoId/update-ngo", verifyToken, checkNgoProfile , upload.single("logo"), updateNgo);
router.get("/:ngoId/ngo-posts" , verifyToken, getposts);

export default router;