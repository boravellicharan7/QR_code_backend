const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const QRCode = require("qrcode");

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    qrCodes: [
        {
            text: String,
            qrImage: String,
            createdAt: { type: Date, default: Date.now }
        }
    ]
});

const User = mongoose.model("User", userSchema);

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("QR Code Generator Backend is Live");
});

app.post("/api/generate_qr", async (req, res) => {
    const { text, email, name } = req.body;

    if (!text || !email || !name) {
        return res.status(400).send({
            status: 400,
            message: "Text, email, and name are required"
        });
    }

    try {
        let user = await User.findOne({ email });
        
        if (!user) {
            user = new User({ 
                name, 
                email, 
                password: "default" 
            });
            await user.save();
        }

        const qrCodeURL = await QRCode.toDataURL(text);

        const newQR = {
            text,
            qrImage: qrCodeURL,
            createdAt: new Date()
        };

        user.qrCodes.push(newQR);
        await user.save();

        res.status(200).send({
            status: 200,
            qrCode: qrCodeURL,
            name: user.name,
            email: user.email,
            text,
            createdAt: newQR.createdAt
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

    if (!email) {
        return res.status(400).send({
            status: 400,
            message: "Email is required"
        });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).send({ 
                status: 404, 
                message: "User not found" 
            });
        }

        res.status(200).send({
            status: 200,
            qrHistory: user.qrCodes
        });
    } catch (error) {
        res.status(500).send({
            status: 500,
            message: "Failed to fetch history",
            error
        });
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