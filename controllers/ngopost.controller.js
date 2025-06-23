import Post from '../models/ngopost.model.js';
import { uploadImage, uploadVideo } from '../utils/cloudinaryHandler.js';
import fs from 'fs';
import path from 'path';
import Ngo from '../models/ngo.model.js';
import  Notification  from '../models/Notification.model.js';
import {io} from "../index.js"

export const createNGOPost = async (req, res) => {

  try {
  
    let file = null;
    let type = null;

    if (req.files.images && req.files.images.length > 0) {
      file = req.files.images[0];
      type = 'image';
    } else if (req.files.videos && req.files.videos.length > 0) {
      file = req.files.videos[0];
      type = 'video';
    } else if (req.files.documents && req.files.documents.length > 0) {
      file = req.files.documents[0];
      // Assuming documents are treated as images or videos for now, or you might need a separate handler
      // For simplicity, let's assume they are images if not explicitly handled otherwise.
      if (file.mimetype.startsWith('image/')) {
        type = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        type = 'video';
      } else {
        // Handle other document types if necessary, or return an error
        await fs.promises.unlink(file.path);
        return res.status(400).json({ success: false, message: "Unsupported document type" });
      }
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { caption } = req.body;

    let result;

    if (type === 'image') {
      if (!file.mimetype.startsWith('image/')) {
        await fs.promises.unlink(file.path);
        return res.status(400).json({ success: false, message: "Invalid image file" });
      }
      result = await uploadImage(file.path);
    } else if (type === 'video') {
      if (!file.mimetype.startsWith('video/')) {
        await fs.promises.unlink(file.path);
        return res.status(400).json({ success: false, message: "Invalid video file" });
      }
      result = await uploadVideo(file.path);
    }

    if (!result || !result.url) {
      console.error("Cloudinary upload failed");
      await fs.promises.unlink(file.path);
      return res.status(500).json({ success: false, message: "Cloud upload failed" });
    }

    await fs.promises.unlink(file.path); // ✅ async

 const ngo = await Ngo.findOne({ createdBy: req.userId });
    const post = await Post.create({
      ngo: ngo._id,
      caption,
      mediaUrl: result.url,
      mediaPublicId: result.public_id,
      mediaType: type,
      createdBy: { id: ngo._id, actorModel: 'NGO' }

    });

if (!ngo) {
  return res.status(404).json({ success: false, message: "NGO not found" });
}
ngo.posts.push(post._id);
await ngo.save();


    res.status(201).json({ success: true, post });

  } catch (error) {
    console.error("Error creating post:", error);
    if (req.file?.path) await fs.promises.unlink(req.file.path);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getNgoPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.userId }).populate("createdBy.id", "name email profilepic").populate('ngo', 'name email logo').sort({ createdAt: -1 });

    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteNGOPost = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (post.ngo.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await Post.findByIdAndDelete(postId);
    res.status(200).json({ success: true, message: "Post deleted successfully" });
    }
    catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ success: false, message: "Server error" });
    }

}

export const updateNGOPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { caption } = req.body;
    
        if (!postId) {
        return res.status(400).json({ success: false, message: "Post ID is required" });
        }
    
        const post = await Post.findById(postId);
        if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
        }
    
        if (post.ngo.toString() !== req.userId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
        }
    
        post.caption = caption || post.caption;
        await post.save();
    
        res.status(200).json({ success: true, post });
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
    }


// likeNgoPost.js
export const likeNgoPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    // Find post to confirm existence and get necessary data
    const postToUpdate = await Post.findById(postId)
      .populate("ngo", "name logoUrl")
      .populate("createdBy.id", "name email logoUrl")
      .populate("comments.author", "name profilepic email");

    if (!postToUpdate) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const actorModel = req.user.isNGO ? "NGO" : "User";

    // Check if user has already liked the post
    const hasLiked = postToUpdate.likes.some(
      (like) => like.id.toString() === userId && like.actorModel === actorModel
    );

    let updatedPost;

    if (hasLiked) {
      // User unlikes the post
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { likes: { id: userId, actorModel } } },
        { new: true }
      )
        .populate("ngo", "name logoUrl")
        .populate("createdBy.id", "name email logoUrl")
        .populate("comments.author", "name profilepic email");
      
      // No notification on unlike
    } else {
      // User likes the post
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $addToSet: { likes: { id: userId, actorModel } } },
        { new: true }
      )
        .populate("ngo", "name logoUrl")
        .populate("createdBy.id", "name email logoUrl")
        .populate("comments.author", "name profilepic email");

      // Create notification
      const notification = await Notification.create({
        senderId: userId,
        senderType: actorModel, // "User" or "NGO"
        receiverId: updatedPost.ngo._id,
        receiverType: "NGO",
        type: "like",
        postId: updatedPost._id,
        message: `${req.user.name} liked your post`,
      });

const ngo = await Ngo.findById(updatedPost.createdBy.id); // ✅

      const receiverId = ngo.createdBy.toString(); // ✅


      // Emit notification to receiver's socket room
      io.to(receiverId).emit("newNotification", notification);
    }

    return res.status(200).json({ success: true, post: updatedPost });
  } catch (error) {
    console.error("Error liking/unliking post:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



// commentOnNgoPost.js
export const commentOnNgoPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!postId || !text) {
      return res.status(400).json({
        success: false,
        message: "Post ID and comment text are required",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const actorModel = req.user.isNGO ? "NGO" : "User";

    // Add comment to post
    const comment = {
      id: req.userId,
      actorModel,
      text,
      createdAt: new Date(),
      author: req.userId,
    };

    post.comments.push(comment);
    await post.save();

    // Re-fetch post with populated fields
    const updatedPost = await Post.findById(postId)
      .populate("comments.author", "name email profilepic")
      .populate("ngo", "name email logoUrl");

    // Create notification
    const notification = await Notification.create({
      senderId: req.userId,
      senderType: actorModel,
      receiverId: updatedPost.ngo._id,
      receiverType: "NGO",
      type: "comment",
      postId: updatedPost._id,
      message: `${req.user.name} commented on your post`,
    });

    const ngo = await Ngo.findById(updatedPost.createdBy.id); // ✅

      const receiverId = ngo.createdBy.toString(); // ✅



    // Emit notification to receiver's socket room
    io.to(receiverId).emit("newNotification", notification);

    return res.status(200).json({
      success: true,
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error commenting on post:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const getNGOPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    const post = await Post.findById(postId).populate("likes.id", "name email logo");
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllNGOPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("ngo", "name email logoUrl")
      .populate("comments.author", "name email profilepic");
;

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching all posts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const flagNgoPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    if (!postId || !reason) {
      return res.status(400).json({ success: false, message: "Post ID and reason are required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const flag = {
      id: req.userId,
      actorModel: "User",
      reason,
      createdAt: new Date(),
    };

    post.flags.push(flag);
    await post.save();

    res.status(200).json({ success: true, flags: post.flags });
  } catch (error) {
    console.error("Error flagging post:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const shareNgoPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ success: false, message: "Post ID is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const share = {
      id: req.userId,
      actorModel: "User",
      createdAt: new Date(),
    };

    post.sharedBy.push(share);
    await post.save();

    res.status(200).json({ success: true, sharedBy: post.sharedBy });
  } catch (error) {
    console.error("Error sharing post:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getWhoCommentedOnNGOPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const ngoPost = await   Post.findById(postId).populate("comments.author", "name email profilepic");
        if (!ngoPost) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        const commenters = ngoPost.comments.map(comment => ({
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



