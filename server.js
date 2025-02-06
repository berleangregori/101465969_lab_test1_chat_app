require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

const User = require("./models/User");
const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");
const authRoutes = require("./routes/auth");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, "views")));


app.use("/api/auth", authRoutes);


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Connection Error:", err));


io.on("connection", (socket) => {
    console.log("⚡ A user connected");

    
    socket.on("joinRoom", async (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);

        
        const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
        messages.forEach(msg => {
            socket.emit("receiveMessage", { from_user: msg.from_user, message: msg.message });
        });
    });

    socket.on("leaveRoom", (room) => {
        socket.leave(room);
        socket.emit("roomLeft", room);
        console.log(`🚪 User left room: ${room}`);
    });

    socket.on("sendMessage", async ({ from_user, room, message }) => {
        const chatMessage = new GroupMessage({ from_user, room, message });
        await chatMessage.save();

        io.to(room).emit("receiveMessage", { from_user, message });
    });

    
    socket.on("sendPrivateMessage", async ({ from_user, to_user, message }) => {
        const privateMessage = new PrivateMessage({ from_user, to_user, message });
        await privateMessage.save();
    
        
        io.emit("receivePrivateMessage", { from_user, message });
    });

    
    socket.on("typing", (room) => {
        socket.to(room).emit("userTyping", "Someone is typing...");
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
