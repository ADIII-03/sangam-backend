import mongoose from "mongoose";

const ngoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    maxlength: 500,
  },

  logoUrl: {
    type: String,
  },

  establishedYear: {
    type: Number,
    required: true,
  },

  govtVerification: {
    idType: { type: String },
    docUrl: { type: String },
  },

  address: {
    type: String,
    required: true,
  },

location: {
  type: {
    type: String,
    enum: ["Point"],
    default: "Point"
  },
  coordinates: {
    type: [Number], 
    required: true
  },
  address: {
    type: String,
    required: true
  }
}
,

  phone: {
    type: String,
  },

  website: {
    type: String,
  },

  socialLinks: {
    instagram: String,
    facebook: String,
    twitter: String,
  },
volunteers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  volunteersRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  posts : [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "NGOPost",
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, {
  timestamps: true
});
ngoSchema.index({ location: "2dsphere" });

export default mongoose.model("NGO", ngoSchema);
