import NGO from "../models/ngo.model.js"; // Your NGO model
import fs from "fs";
import {
  uploadImage,
  uploadFile,
} from "../utils/cloudinaryHandler.js"; // Your Cloudinary utility functions
import User from "../models/user.model.js"; // Your User model
import post from  "../models/ngopost.model.js";
import Notification from "../models/Notification.model.js";
import {io} from "../index.js"

export const createNGO = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      description,
      establishedYear,
      idType,
      address,
      phone,
      website,
      instagram,
      facebook,
      twitter,
      coordinates, // e.g., "77.216721,28.644800"
    } = req.body;

    // Default empty strings
    let logoUrl = "";
    let docUrl = "";

    // ✅ Upload logo image if provided
    if (req.files?.logo?.[0]) {
      const logoPath = req.files.logo[0].path;
      logoUrl = (await uploadImage(logoPath)).url;
      try {
        fs.unlinkSync(logoPath); // clean up local temp file
      } catch (unlinkError) {
        console.error(`Error deleting local logo file ${logoPath}:`, unlinkError);
      }
    }

    // ✅ Upload verification doc if provided
    if (req.files?.doc?.[0]) {
      const docPath = req.files.doc[0].path;
      docUrl = (await uploadFile(docPath)).url;
      try {
        fs.unlinkSync(docPath); // clean up local temp file
      } catch (unlinkError) {
        console.error(`Error deleting local doc file ${docPath}:`, unlinkError);
      }
    }

    // ✅ Parse coordinates into [lng, lat] array
    const coords = coordinates?.split(",").map(Number); // e.g., [77.216721, 28.644800]

    // ✅ Create NGO
    const newNgo = await NGO.create({
      name,
      email,
      password, // Hash this in real production setup
      description,
      establishedYear,
      address,
      phone,
      website,
      socialLinks: { instagram, facebook, twitter },
      logoUrl,
      govtVerification: {
        idType,
        docUrl,
      },
      location: {
        type: "Point",
        coordinates: coords,
        address,
      },
      createdBy: req.userId, // Set by verifyToken middleware
    });

    res.status(201).json({
      success: true,
      message: "NGO created successfully",
      ngo: newNgo,
       
    });
  } catch (error) {
    console.error("Error creating NGO:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

export const acceptVolunteers = async (req, res) => {
  try {
    const ngoId = req.params.ngoId;
    const { volunteerId } = req.body;

    
    if (!volunteerId) {
      return res.status(400).json({
        success: false,
        message: "Volunteer ID is required",
      });
    }

    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    const user = await User.findById(volunteerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    // Check if volunteerId is in requests
    if (!ngo.volunteersRequests.includes(volunteerId)) {
      return res.status(400).json({
        success: false,
        message: "This user has not requested to volunteer",
      });
    }

    // Move from requests to accepted
  ngo.volunteersRequests = ngo.volunteersRequests.filter(
  (id) => id.toString() !== volunteerId.toString()
);

    ngo.volunteers.push(volunteerId);
    user.volunteeredAt.push(ngo._id);

    ngo.volunteersRequests = ngo.volunteersRequests.filter(
      (id) => id.toString() !== volunteerId
    );

    await ngo.save();
    await user.save();
    await Notification.findOneAndUpdate(
  {
    type: "volunteer_request",
    senderId: user._id,
    senderType: "User",
    receiverId: ngo._id,
    receiverType: "NGO",
  },
  {
    $set: { status: "accepted" },
  }
);

   const notification = await Notification.create({
      senderId: ngo._id,
      senderType: "NGO",
      receiverId: user._id,
      receiverType: "User",
      type: "volunteer_acceptance",
      message: `${ngo.name} accepted your volunteer request`,
    });

io.to(user._id.toString()).emit('newNotification', notification);

    res.status(200).json({
      success: true,
      message: "Volunteer accepted successfully",
      ngo,
    });
  } catch (error) {
    console.error("Error accepting volunteer:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


export const getallVolunteerRequests = async (req, res) => {
  try {
    const ngoId = req.params.ngoId; // Get NGO ID from request params
    const ngo = await NGO.findById(ngoId).populate("volunteersRequests", "-password");

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }


    res.status(200).json({
      success: true,
      message: "Pending volunteer requests fetched successfully",
      volunteers: ngo.volunteersRequests ,
    });
  } catch (error) {
    console.error("Error fetching volunteer requests:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
}

export const getVolunteers = async (req, res) => {
  try {
    const ngoId = req.params.ngoId; // Get NGO ID from request params
    const ngo = await NGO.findById(ngoId).populate("volunteers", "-password");

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Volunteers fetched successfully",
      volunteers: ngo.volunteers,
    });
  } catch (error) {
    console.error("Error fetching volunteers:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
}

export const updateNgo = async (req, res) => {
  try {
    const ngoId = req.params.ngoId; // Get NGO ID from request params
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }
    const {
      name,
      email,
      description,
      idType,
      address,
      phone,
      website,
      instagram,
      facebook,
      twitter,
      coordinates, // e.g., "77.216721,28.644800"
    } = req.body;
    // Default empty strings
    let logoUrl = ngo.logoUrl; // Keep existing logo if not updated
    let docUrl = ngo.govtVerification.docUrl; // Keep existing doc if not updated
  
    // ✅ Upload logo image if provided
if (req.file) {
  const logoPath = req.file.path;
  logoUrl = (await uploadImage(logoPath)).url;
  try {
    fs.unlinkSync(logoPath);
  } catch (unlinkError) {
    console.error(`Error deleting local logo file ${logoPath}:`, unlinkError);
  }
}

    // ✅ Parse coordinates into [lng, lat] array
    const coords = coordinates?.split(",").map(Number); // e.g., [77.216721, 28.644800]
    // ✅ Update NGO
    ngo.name = name || ngo.name;
    ngo.email = email || ngo.email;
    ngo.description = description || ngo.description;
    ngo.address = address || ngo.address;
    ngo.phone = phone || ngo.phone;
    ngo.website = website || ngo.website;
    ngo.socialLinks.instagram = instagram || ngo.socialLinks.instagram;
    ngo.socialLinks.facebook = facebook || ngo.socialLinks.facebook;
    ngo.socialLinks.twitter = twitter || ngo.socialLinks.twitter;

    ngo.logoUrl = logoUrl;
    ngo.govtVerification.idType = idType || ngo.govtVerification.idType;
    ngo.govtVerification.docUrl = docUrl;
    ngo.location = {
      type: "Point",
      coordinates: coords || ngo.location.coordinates,
      address: address || ngo.location.address,
    };
    ngo.updatedBy = req.userId; // Set by verifyToken middleware
    await ngo.save();
    res.status(200).json({
      success: true,
      message: "NGO updated successfully",
      ngo,
    });
  }
  catch (error) {
    console.error("Error updating NGO:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  } 
}


export const getngodetails = async (req, res) => {
  try {
    const ngoId = req.params.ngoId; // Get NGO ID from request params
    const ngo = await NGO.findById(ngoId).populate("createdBy", "-password")
    .populate({
    path: "posts",
    populate: [{
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
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "NGO details fetched successfully",
      ngo,
    });
  }

  catch (error) {
    console.error("Error fetching NGO details:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


export const getposts = async (req, res) => {
  try {
    const ngoId = req.params.ngoId;

    const posts = await post.find({ ngo: ngoId })
      .populate({
        path: "createdBy.id",
        select: "name email logoUrl",
      })
      .populate({
        path: "comments.author",
        select: "name email profilepic",
      })
       .populate("likes.id")
  .populate("sharedBy.id");

    if (!posts || posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No posts found for this NGO",
        posts: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      posts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


export const rejectVolunteers = async (req, res) => {
  try {
    const { ngoId } = req.params;
    const { volunteerId, notificationId } = req.body;

       
    const ngo = await NGO.findById(ngoId);
    const user = await User.findById(volunteerId);

    if (!ngo || !user) {
      return res.status(404).json({ success: false, message: "NGO or User not found" });
    }

    // Remove from request list
    ngo.volunteersRequests = ngo.volunteersRequests.filter(
      (id) => id.toString() !== volunteerId
    );
    await ngo.save();

    // Update notification status
    await Notification.findByIdAndUpdate(notificationId, {
      status: "rejected",
    });

    // Create rejection notification
  const notification =  await Notification.create({
      senderId: ngo._id,
      senderType: "NGO",
      receiverId: user._id,
      receiverType: "User",
      type: "volunteer_rejection",
      message: `${ngo.name} has rejected your volunteer request`,
    });

    io.to(user._id.toString()).emit('newNotification', notification);

    res.status(200).json({ success: true, message: "Volunteer rejected" });
  } catch (error) {
    console.error("❌ Error rejecting volunteer:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};




