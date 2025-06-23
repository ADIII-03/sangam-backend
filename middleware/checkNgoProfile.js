// middleware/checkNgoProfile.js
import NGO from "../models/ngo.model.js";

export const checkNgoProfile = async (req, res, next) => {
  try {
    const ngo = await NGO.findOne({ createdBy: req.userId }).populate("createdBy", "-password")
    .populate({
      path: "posts",
      populate: [ // if each post also references the NGO
        {
          path: "ngo", // if each post also references the NGO
          select: "name logoUrl"
        },
        {
          path: "comments.id",
          select: "name profilepic"
        },
        {
          path: "comments.author",  // <--- populate author as well
          select: "name profilepic"
        }
      ]
    });


    req.ngo = ngo; // attach for later use
    next();
  } catch (err) {
    console.error("checkNgoProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
