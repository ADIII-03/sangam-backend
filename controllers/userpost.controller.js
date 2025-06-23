import post from "../models/userpost.model.js";
import { uploadImage, uploadVideo } from "../utils/cloudinaryHandler.js";
import fs from "fs";
import { userInfo } from "os";
import path from "path";
import  escape  from 'validator';
import user from "../models/user.model.js";
import Notification from "../models/Notification.model.js";
import {io} from "../index.js"


export const createUserPost = async (req, res) => {
    try {
        let file = null;
        let type = null;

        if (req.files.images && req.files.images.length > 0) {
            file = req.files.images[0];
            type = "image";
        }
        else if (req.files.videos && req.files.videos.length > 0) {
            file = req.files.videos[0];
            type = "video";
        } else if (req.files.documents && req.files.documents.length > 0) {
            file = req.files.documents[0];
            if (file.mimetype.startsWith("image/")) {
                type = "image";
            } else if (file.mimetype.startsWith("video/")) {
                type = "video";
            } else {
                await fs.promises.unlink(file.path);
                return res.status(400).json({ success: false, message: "Unsupported document type" });
            }
        }
        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const { caption, category, location } = req.body;
        let result;
        if (type === "image") {
            if (!file.mimetype.startsWith("image/")) {
                return res.status(400).json({ success: false, message: "File is not an image" });
            }
            result = await uploadImage(file.path);
        }
        else if (type === "video") {
            if (!file.mimetype.startsWith("video/")) {
                return res.status(400).json({ success: false, message: "File is not a video" });
            }
            result = await uploadVideo(file.path);
        }
        if (!result || !result.url) {
            console.error("Cloudinary upload failed");
            await fs.promises.unlink(file.path);
            return res.status(500).json({ success: false, message: "Cloud upload failed" });
        }

        const newPost = new post({
            caption,
               mediaUrl: result.url,         // renamed
    mediaType: type, 
            category,
            location: {
                address: location.address,
                coordinates: location.coordinates
            },
            createdBy: {
                id: req.userId,
                actorModel: "User"
            }
        });

        await newPost.save();
        const existingUser = await user.findById(req.userId);
if (!existingUser) {
    return res.status(404).json({ success: false, message: "User not found" });
}
existingUser.posts.push(newPost._id);
await existingUser.save();

        await fs.promises.unlink(file.path);
        return res.status(201).json({ success: true, message: "Post created successfully", post: newPost });
    }
    catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAllUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userId = req.query.userId;  // get userId from query

    const filter = {};
    if (userId) {
      filter["createdBy.id"] = userId;  // adjust this according to your schema
    }

    const posts = await post
      .find(filter)
      .populate("createdBy.id", "name email profilepic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await post.countDocuments(filter);

    return res.status(200).json({
      success: true,
      posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getUserPostById = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userPost = await post.findById(postId).populate("createdBy.id", "name email profilepic");
        if (!userPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        return res.status(200).json({ success: true, post: userPost });
    } catch (error) {
        console.error("Error fetching post:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateUserPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const { caption, category, location } = req.body;

        const updatedPost = await post.findByIdAndUpdate(
            postId,
            { caption, category, location },
            { new: true }
        ).populate("createdBy.id", "name email");

        if (!updatedPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        return res.status(200).json({ success: true, post: updatedPost });
    } catch (error) {
        console.error("Error updating post:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteUserPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const deletedPost = await post.findByIdAndDelete(postId);

        if (!deletedPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        return res.status(200).json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const likeUserPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const postToUpdate = await post
      .findById(postId)
      .populate("createdBy.id", "name email profilepic");

    if (!postToUpdate) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const likeIndex = postToUpdate.likes.findIndex(
      (like) => like.id.toString() === req.userId && like.actorModel === "User"
    );

    const isLiking = likeIndex === -1;

    let notification = null;

    if (!isLiking) {
      // DISLIKE
      postToUpdate.likes.splice(likeIndex, 1);
    } else {
      // LIKE
      postToUpdate.likes.push({
        id: req.userId,
        actorModel: "User",
      });

      // ✅ Send notification only if not self-like
      if (req.userId !== postToUpdate.createdBy.id.toString()) {
        notification = await Notification.create({
          senderId: req.userId,
          senderType: "User",
          receiverId:  postToUpdate.createdBy.id._id.toString(),
          receiverType: "User",
          postId,
          type: "like",
          message: `${req.user.name} liked your post`,
        });
     
const receiverRoom = postToUpdate.createdBy.id._id.toString();
        // Only emit if notification is created
        io.to(receiverRoom).emit("newNotification", notification);
      }
    }

    await postToUpdate.save();

    return res.status(200).json({ success: true, post: postToUpdate });
  } catch (error) {
    console.error("Error liking/unliking post:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



export const commentOnUserPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const comment = req.body.comment || req.body.text;

    if (!comment || comment.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
    }

    const postToUpdate = await post.findById(postId).populate("createdBy.id", "name email profilepic");
    if (!postToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const newComment = {
      id: req.userId,
      actorModel: "User",
      text: comment.trim(),
      author: req.userId,
      createdAt: new Date(),
    };

    postToUpdate.comments.push(newComment);
    await postToUpdate.save();

    // Create a notification for the post creator
    const receiverId = postToUpdate?.createdBy?.id?._id;
    const senderName = req.user?.name || "Someone";

    const notification = await Notification.create({
      senderId: req.userId,
      senderType: "User",
      receiverId :postToUpdate.createdBy.id._id.toString(),
      receiverType: "User",
      postId,
      type: "comment",
      message: `${senderName} commented on your post`,
    });

    // Real-time notification emit using Socket.IO
        
const receiverRoom = postToUpdate.createdBy.id._id.toString();
        // Only emit if notification is created

        io.to(receiverRoom).emit("newNotification", notification);

    return res.status(200).json({
      success: true,
      post: postToUpdate,
    });
  } catch (error) {
    console.error("Error commenting on post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const flagUserPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const { reason } = req.body;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({ success: false, message: "Flag reason cannot be empty" });
        }

        const postToUpdate = await post.findById(postId);
        if (!postToUpdate) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        postToUpdate.flags.push({
            id: req.userId,
            actorModel: "User",
            reason
        });

        await postToUpdate.save();
        return res.status(200).json({ success: true, post: postToUpdate });
    } catch (error) {
        console.error("Error flagging post:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const shareUserPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const postToShare = await post.findById(postId);
        if (!postToShare) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        postToShare.sharedBy.push({
            id: req.userId,
            actorModel: "User"
        });

        await postToShare.save();
        return res.status(200).json({ success: true, message: "Post shared successfully", post: postToShare });
    } catch (error) {
        console.error("Error sharing post:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
   

export const getCommentsByPostId = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userPost = await post.findById(postId).populate("comments.id", "name email profilepic");
        if (!userPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        return res.status(200).json({ success: true, comments: userPost.comments });
    } catch (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}



export const getwhocomments = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userPost = await post.findById(postId).populate("comments.author", "name email profilepic");
        if (!userPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        const commenters = userPost.comments.map(comment => ({
            id: comment.author._id,
            name: comment.author.name,
            email: comment.author.email,
            profilepic: comment.author.profilepic || null // Handle case where profilepic might be null
        }));
        return res.status(200).json({ success: true, commenters });
    } catch (error) {
        console.error("Error fetching commenters:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}