const express = require("express");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const cors = require("cors");
const QRCode = require("qrcode");

const User = require("./MongooesSchema");

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("QR Code Generator Backend is Live");
});

app.post("/api/auth/registration", async (req, res) => {
    let { name, email, password } = req.body;

    try {
        let user_found = await User.findOne({ email });

        if (user_found) {
            return res.status(409).send({
                status: 409,
                message: "User already exists"
            });
        }

        let hashed_password = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashed_password });
        await newUser.save();

        res.status(200).send({
            status: 200,
            message: `${name} registered successfully`
        });
    } catch (err) {
        res.status(500).send({
            status: 500,
            message: "Registration failed",
            Error: err
        });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(401).send({
                status: 401,
                message: "Invalid credentials"
            });
        }

        let isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).send({
                status: 401,
                message: "Invalid credentials"
            });
        }

        res.status(200).send({
            status: 200,
            message: `Welcome, ${user.name}`
        });
    } catch (err) {
        res.status(500).send({
            status: 500,
            message: "Login failed",
            Error: err
        });
    }
});

app.post("/api/generate_qr", async (req, res) => {
    const { text, email } = req.body;

    if (!text || !email) {
        return res.status(400).send({
            status: 400,
            message: "Text and email are required"
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ status: 404, message: "User not found" });
        }

        const qrCodeURL = await QRCode.toDataURL(text);

        const newQR = new QR({
            userId: user._id,
            text,
            qrImage: qrCodeURL
        });
        await newQR.save();

        res.status(200).send({
            status: 200,
            qrCode: qrCodeURL
        });
    } catch (error) {
        res.status(500).send({
            status: 500,
            message: "QR Code generation failed",
            error
        });
    }
});

app.get("/api/qr-history", async (req, res) => {
    const { email } = req.query;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ status: 404, message: "User not found" });
        }

        const qrHistory = await QR.find({ userId: user._id });
        res.status(200).send({ status: 200, qrHistory });
    } catch (error) {
        res.status(500).send({ status: 500, message: "Failed to fetch history", error });
    }
});

mongoose.connect(process.env.MONGOOSE_CONNECTION)
    .then(() => {
        const port = process.env.PORT || 3021;
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
    });
