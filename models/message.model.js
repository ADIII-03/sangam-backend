import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'ngo'],
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  receiverType: {
    type: String,
    enum: ['user', 'ngo'],
    required: true
  },
  message: {
    type: String,
    required: true
  } ,
   seen: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
