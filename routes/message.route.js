import express from "express";

import { sendMessage, getMessage , partners , getSinglePartner , markMessagesAsSeen, getPartnersWithLastMessages  } from "../controllers/message.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post('/send/:receiverId', verifyToken, sendMessage);
router.get('/get/:otherId', verifyToken, getMessage);
router.get('/partners/:currentUserId', verifyToken, partners);
router.get('/partner/:id', getSinglePartner); //
router.post('/seen/:partnerId', verifyToken, markMessagesAsSeen);
router.get("/partnersWithLastMessages/:currentUserId", verifyToken, getPartnersWithLastMessages);

export default router;