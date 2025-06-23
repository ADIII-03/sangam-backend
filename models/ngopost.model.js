import mongoose from "mongoose";


const actorRef = {
  id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "comments.actorModel"
  },
  actorModel: {
    type: String,
    required: true,
    enum: ["User", "NGO"]
  }
};

const commentSchema = new mongoose.Schema({
  ...actorRef,
  text: {
    type: String,
    required: true,
    maxlength: 300
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  author : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming author is a User, adjust if needed
    required: true,
    
  }
});


const flagSchema = new mongoose.Schema({
  ...actorRef,
  reason: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ngoPostSchema = new mongoose.Schema(
  {
    createdBy : {
     id : {
      type : mongoose.Schema.Types.ObjectId,
      ref : "NGO",
      required : true
     } ,
     actorModel : {
      type : String,
      required : true,
      enum : ["User", "NGO"]
     }
    } ,
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
    },

    caption: {
      type: String,
      maxlength: 1000,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    mediaPublicId: {
      type: String,
      required: true,
    },

  
  likes: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "likes.actorModel"
      },
      actorModel: {
        type: String,
        required: true,
        enum: ["User", "NGO"]
      }
    }
  ],

  comments: [commentSchema],
  flags: [flagSchema],

  sharedBy: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "sharedBy.actorModel"
      },
      actorModel: {
        type: String,
        required: true,
        enum: ["User", "NGO"]
      }
    }
  ]
}, {
  timestamps: true
});

export default mongoose.model("NGOPost", ngoPostSchema);
