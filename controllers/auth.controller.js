import { asyncHandler } from "../utils/asyncHandler.utils.js"
import ErrorHandler from "../utils/errorHandler.util.js"
import User from "../models/user.model.js"
import bcryptjs from "bcryptjs"
import { generateTokenAndSaveCookie } from "../utils/generateTokenAndSaveCookie.js"
import { sendVerificationEmail , sendWelcomeEmail, sendPasswordResetEmail,sendResetSuccessEmail } from "../mailtrap/emails.js"
import crypto from "crypto"
import cloudinary from "../db/cloudinary.js"
import Ngo from "../models/ngo.model.js"
import Notification from "../models/Notification.model.js"
import fs from "fs"; // 👈 ADD THIS AT THE TOP
import path from "path";

import {io} from "../index.js"
import Tesseract from "tesseract.js"




export const signup = asyncHandler(async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    const profilepic = req.file;

    if (!name || !email || !password || !gender || !profilepic) {
      throw new ErrorHandler("Please fill all the fields & upload a valid picture", 400);
    }
   

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ErrorHandler("Please enter a valid email address", 400);
    }

    const userAlreadyExists = await User.findOne({ email });
    if (userAlreadyExists) {
      throw new ErrorHandler("User already exists", 400);
    }

    const hashPassword = await bcryptjs.hash(password, 10);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    const normalizedPath = path.resolve(profilepic.path);
   

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(normalizedPath, {
      folder: "user-profile-pics",
      transformation: [{ width: 300, height: 300, crop: "limit" }],
    });

    
    // Delete local file
    await fs.promises.unlink(normalizedPath);
   
const user = await User.create({
  email,
  password: hashPassword,
  name,
  gender,
  profilepic: result.secure_url,
  verificationToken,
  verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
});


await sendVerificationEmail(email, verificationToken);



generateTokenAndSaveCookie(res, user._id);



    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        profilepic: user.profilepic,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        femaleVerified : user.femaleVerified
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
});

export const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.body;

    const user = await User.findOne({ verificationToken });

    if(!user) {
        throw new ErrorHandler("Invalid verification token", 400);
    }

    if(user.verificationTokenExpiresAt < Date.now()) {
        throw new ErrorHandler("Verification token expired", 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;

    await user.save();

    await sendWelcomeEmail(user.email, user.name);
    res.status(200).json({
        success : true,
        message : "Email verified successfully"
    })
})

export const login = asyncHandler(async (req, res) => {
    const {email, password} = req.body ;

    const user = await User.findOne({email});

    if(!user) {
        throw new ErrorHandler("User not found", 404);
    }

    const isPasswordMatched = await bcryptjs.compare(password, user.password);

    if(!isPasswordMatched) {
        throw new ErrorHandler("Invalid password", 400);
    }

    if(!user.isVerified) {
        throw new ErrorHandler("Please verify your email", 400);
    }

    generateTokenAndSaveCookie(res, user._id);

    user.lastlogin = new Date();
    res.status(200).json({
        success : true,
        message : "Login successful",
        user : {
            ...user._doc,
            password : undefined
        }
    })


})

export const forgotPassword = asyncHandler(async (req, res) => {
    const {email} = req.body;   
    const user = await User.findOne({email});

    if(!user) {
        throw new ErrorHandler("User not found", 404);
    }

   const resetToken = crypto.randomBytes(20).toString("hex");

   user.resetPasswordToken = resetToken;
   user.resetPasswordExpiresAt = Date.now() + 15 * 60 * 1000;

   await user.save();

   await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

    res.status(200).json({
        success : true,
        message : "Reset password token sent successfully"
    })


})

export const resetPassword = asyncHandler(async (req, res) => {
    
    const {token} = req.params;
    const {password} = req.body;

    const user = await User.findOne({resetPasswordToken : token});

    if(!user) {
        throw new ErrorHandler("Invalid reset token", 400);
    }

    if(user.resetPasswordExpiresAt < Date.now()) {
        throw new ErrorHandler("Reset token expired", 400);
    }

    const hashPassword = await bcryptjs.hash(password, 10);

    user.password = hashPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();



    res.status(200).json({
        success : true,
        message : "Password reset successfully"
    })

    await sendResetSuccessEmail(user.email);
})

export const logout = asyncHandler(async (req, res) => {
   res.clearCookie("jwt")
   res.status(200).json({
    success : true,
    message : "Logged out successfully"
   })
})

export const checkAuth = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select("-password");

    if(!user) {
        throw new ErrorHandler("User not found", 404);
    }


    res.status(200).json({
        success : true,
        message : "User found",
        user : {
            ...user._doc,
            password : undefined
        }
    })

})

export const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select("-password");
    if(!user) {
        throw new ErrorHandler("User not found", 404);
    }   
    res.status(200).json({
        success : true,
        message : "User profile fetched successfully",
        user : {
            ...user._doc,
            password : undefined
        }
    })

}
)

export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if(!user) {
        throw new ErrorHandler("User not found", 404);
    }
    const { name}=req.body;
    const profilepic = req.file ; // Use existing profile pic if not update


if (profilepic) {
  try {
    const result = await cloudinary.uploader.upload(profilepic.path, {
      folder: "user-profile-pics",
    });
    user.profilepic = result.secure_url;

    

    if (profilepic.path) {
      await fs.promises.unlink(profilepic.path);

    }

  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new ErrorHandler("Error uploading profile picture", 500);
  }
}


    if (name) {
    user.name = name;
  }
 

    await user.save();
    res.status(200).json({
        success : true,
        message : "User profile updated successfully",
        user : {
            ...user._doc,
            password : undefined
        }

    })
}
)


export const getsuggestedUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ _id: { $ne: req.userId } })
        .limit(6)
        .select("-password -verificationToken -verificationTokenExpiresAt -resetPasswordToken -resetPasswordExpiresAt");

    // Optional shuffle
    users.sort(() => Math.random() - 0.5);

    res.status(200).json({
        success: true,
        message: users.length > 0 ? "Suggested users fetched successfully" : "No users found",
        users: users,
    });
});


export const requestVolunteer = asyncHandler(async (req, res) => {
  try {
    const { ngoId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
        throw new Error("User not found");
    }

    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
        throw new Error("NGO not found");
    }

    // Already volunteered?
    if (user.volunteeredAt.includes(ngoId)) {
        throw new Error("You have already volunteered for this NGO");
    }

    // Already requested?
    if (ngo.volunteersRequests.includes(user._id)) {
        throw new Error("You have already requested to volunteer for this NGO");
    }

    // Already accepted?
    if (ngo.volunteers.includes(user._id)) {
        throw new Error("You are already a volunteer of this NGO");
    }

    ngo.volunteersRequests.push(user._id);

    const notification = await Notification.create({
      type: 'volunteer_request',
      senderId: user._id,
      senderType: 'User',
      receiverId: ngo._id,
      receiverType: 'NGO',
      message: `User ${user.name} has requested to volunteer for NGO ${ngo.name}`,
      ngoId, 
    });

    
io.to(ngo.createdBy.toString()).emit('newNotification', notification);

    await ngo.save();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Volunteer request sent successfully",
      ngo: {
        ...ngo._doc,
        volunteers: undefined, // Exclude volunteers from response
      }
    });

  } catch (error) {
    console.error("Error in requestVolunteer:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
});

export const getUserVolunteeredNgos = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).populate("volunteeredAt");
    if (!user) {
        throw new ErrorHandler("User not found", 404);
    }
    if (user.volunteeredAt.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No NGOs volunteered at",
            ngos: []
        });
    }
    res.status(200).json({
        success: true,
        message: "Volunteered NGOs fetched successfully",
        ngos: user.volunteeredAt
    });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password")
  .populate({
    path: "posts",
    populate: [ // if each post also references the NGO
      {
        path: "createdBy.id", // if each post also references the NGO
        select: "name profilepic"
      },
     
      {
        path: "comments.author",  // <--- populate author as well
        select: "name profilepic"
      }
    ]
  });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  res.status(200).json({
    success: true,
    user
  });


});


export const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if(!query) {
    return res.status(400).json({
      success: false,
      message: "Please provide a search query"
    })
  }
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [users, ngos] = await Promise.all([
    User.find({ name: { $regex: query , $options: "i"} }).select("-password")
      .skip(skip)
      .limit(limit),
    Ngo.find({ name: { $regex: query , $options: "i" }}).select("-password").
      skip(skip)
      .limit(limit),
  ]);
  

  const accounts = [...users.map((u) => ({ ...u.toObject(), type: "user" })), ...ngos.map((n) => ({ ...n.toObject(), type: "ngo" }))];

  res.status(200).json({
    success: true,
    accounts
  })
})


export const verifyFemale = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user || user.gender !== "female") {
      throw new ErrorHandler("User not found", 404);
  }

  if (!req.file) {
    throw new ErrorHandler("Please upload a document", 400);
  }

   const localPath = req.file.path;

     const result = await Tesseract.recognize(localPath, 'eng', { logger: m => console.log(m) });
  const text = result.data.text.toLowerCase();


    if (!text.includes("female")) {
    // Cleanup
    fs.unlinkSync(localPath);
    throw new ErrorHandler("Document does not confirm gender as female", 400);
  }

  const upload = await cloudinary.uploader.upload(localPath, {
    folder: "female-verification",
    transformation: [{ width: 300, height: 300, crop: "limit" }],
  });

 fs.unlinkSync(localPath);
 user.femaleVerified = true;
  await user.save();


  res.status(200).json({
    success: true,
    message: "Gender verified successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      profilepic: user.profilepic,
      isAdmin: user.isAdmin,
    femaleVerified: user.femaleVerified


    },
  });

  
});
