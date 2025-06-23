import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true ,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    gender : {
        type: String,
        enum : ["male" , "female"],
        required : true
    },
    profilepic : {
        type: String,
        default : ' '
    },
    profilepicPublicId: {   // <-- add this to store Cloudinary public_id
        type: String,
        default: null
    },
    posts : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    }],
    lastlogin : {
        type: Date,
        default : Date.now
    },
    isVerified : {
        type: Boolean,
        default : false
    },
    volunteeredAt : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "NGO"
    }] ,

    isAdmin : {
        type: Boolean,
        default : false
    },
    femaleVerified: {
  type: Boolean,
  default: false,
    },

    resetPasswordToken : String,
    resetPasswordExpiresAt : Date,
    verificationToken : String,
    verificationTokenExpiresAt : Date,

} , { timestamps: true })

const User = mongoose.model("User" , userSchema);
export default User;
