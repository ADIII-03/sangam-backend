import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
   participants: [{
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
       required: true
   }],
   messages: [{
       type : mongoose.Schema.Types.ObjectId,
       ref: "Message",
         required: true

   }]
})

export default mongoose.model("Conversation", conversationSchema);