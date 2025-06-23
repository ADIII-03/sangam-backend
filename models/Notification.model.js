import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['volunteer_request','volunteer_rejection', 'volunteer_acceptance', 'like', 'comment'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderType',
  },
  senderType: {
    type: String,
    enum: ['User', 'NGO'],
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverType',
  },
  receiverType: {
    type: String,
    enum: ['User', 'NGO'],
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post', // optional, for likes/comments
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO', // optional, for volunteer context
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'seen'],
    default: 'pending',
  },
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

 const Notification = mongoose.model('Notification', notificationSchema);

 export default Notification