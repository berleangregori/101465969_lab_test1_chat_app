const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();


router.post("/signup", async (req, res) => {
    const { username, firstname, lastname, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: "Username already taken" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, firstname, lastname, password: hashedPassword });
        await user.save();
        
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error creating user" });
    }
});


router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, username });
    } catch (error) {
        res.status(500).json({ error: "Error logging in" });
    }
});

router.get("/users", async (req, res) => {
    try {
        const users = await User.find({}, "username"); // Fetch only usernames
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error fetching users" });
    }
});

router.get("/private-messages/:user1/:user2", async (req, res) => {
    const { user1, user2 } = req.params;
    
    try {
        const messages = await PrivateMessage.find({
            $or: [
                { from_user: user1, to_user: user2 },
                { from_user: user2, to_user: user1 }
            ]
        }).sort({ date_sent: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Error fetching private messages" });
    }
});


module.exports = router;
