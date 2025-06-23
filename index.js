import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { connectDB } from './db/connectDB.js';
import authRoutes from './routes/auth.route.js';
import ngoRoutes from './routes/ngo.route.js';
import ngoPostRoutes from './routes/ngopost.route.js';
import userPostRoutes from './routes/userpost.route.js';
import messageRoutes from './routes/message.route.js';
import notificationRoutes from './routes/notification.route.js';
import { errorMiddleware } from './middleware/error.middleware.js';

import { configDotenv } from 'dotenv';
configDotenv();

connectDB();

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app

// Setup Socket.IO on the same server
const io = new Server(server, {
  cors: {
    origin: 'https://sangam-frontend-rust.vercel.app',
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: 'https://sangam-frontend-rust.vercel.app',
  credentials: true,
};
app.use(cors(corsOptions));

// Your routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ngo', ngoRoutes);
app.use('/api/v1/ngopost', ngoPostRoutes);
app.use('/api/v1/userpost', userPostRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Error middleware
app.use(errorMiddleware);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

   socket.on('joinUserRoom', (userId) => {
      const roomId = userId.toString(); // ensure it's string
  socket.join(roomId);
    console.log(`Socket ${socket.id} joined room for user ${userId}`);
  });



    socket.on('newComment', (comment) => {
    // sab clients ko bhejo except sender
    socket.broadcast.emit('receiveComment', comment);
  });

  socket.on('newLike', (like) => {
    socket.broadcast.emit('receiveLike', like);
  });

  socket.on('postUnliked', (like) => {
    socket.broadcast.emit('postUnliked', like);
  })


  socket.on('sendNotification', (notificationData) => {
  const { receiverId } = notificationData;
  if (receiverId) {
    io.to(receiverId).emit('newNotification', notificationData);
    console.log(`🔔 Notification sent to user room ${receiverId}`);
  }
});
socket.on("sendMessage", (message) => {
  const { receiverId } = message;
  io.to(receiverId).emit("receiveMessage", message);
});

socket.on("typing", ({ to, from }) => {
  io.to(to).emit("typing", { from });
});

socket.on("stopTyping", ({ to, from }) => {
  io.to(to).emit("stopTyping", { from });
});

 


  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });

  // Add your socket event listeners here
  // e.g. socket.on('newComment', (data) => { ... });
});





const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


export { io };
