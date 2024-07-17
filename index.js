// index.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const FormData = require("form-data");
const sharp = require("sharp");
const app = express();
const PORT = process.env.PORT || 4000;

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(bodyParser.json());

app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/images/generations",
            {
                prompt:
                    prompt +
                    "please provide the image as realistic as possible and dont give any animated images,If there is any query other than furnishing , interior designing, or producing furniture please reject that request and then please response with a no image found image.",
                n: 1, // Number of images to generate
                size: "512x512", // Adjust the size as needed
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const imageUrl = response.data.data[0].url;
        res.status(200).json({ imageUrl });
    } catch (error) {
        console.error(
            "Error generating image:",
            error.response ? error.response.data : error.message
        );
        res.status(500).json({
            error: "Failed to generate image" + error.message,
        });
    }
});

app.post("/api/inpaint-image", upload.single("image"), async (req, res) => {
    const { prompt } = req.body;
    const image = req.file;
    const maskBasePath = "";
    if (!image) {
        return res.status(400).json({ error: "Please upload an image file." });
    }

    const imageFilename = path.parse(image.originalname).name;
    const maskFilename = `./assets/${imageFilename}_mask.png`;
    const maskImagePath = path.join(maskBasePath, maskFilename);

    if (!fs.existsSync(maskImagePath)) {
        return res.status(400).json({
            error: ` Mask image not found for ${image.originalname}.`,
        });
    }

    try {
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("image", fs.createReadStream(image.path));
        formData.append("mask", fs.createReadStream(maskImagePath));
        formData.append("size", "512x512");
        formData.append("n", 1);

        const response = await axios.post(
            "https://api.openai.com/v1/images/edits",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders(),
                },
            }
        );

        const imageUrl = response.data.data[0].url;
        res.status(200).json({ imageUrl });
    } catch (error) {
        console.error(
            "Error generating edited image:",
            error.response ? error.response.data : error.message
        );
        res.status(500).json({
            error: "Failed to generate edited image. " + error.message,
        });
    } finally {
        fs.unlinkSync(image.path); // Clean up uploaded image
    }
});

app.post("/api/inpaint-image2", upload.single("image"), async (req, res) => {
    const { prompt } = req.body;
    const image = req.file;

    if (!image) {
        return res.status(400).json({ error: "Please upload an image file." });
    }

    const imageFilename = path.parse(image.originalname).name;
    const maskPath = `./uploads/${imageFilename}_mask.png`;

    try {
        // Create mask using Sharp
        const { width, height } = await sharp(image.path).metadata();
        await sharp({
            create: {
                width: width,
                height: height,
                channels: 4, // Use 4 channels for RGBA
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .png()
            .toFile(maskPath);

        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("image", fs.createReadStream(image.path));
        formData.append("mask", fs.createReadStream(maskPath));
        formData.append("size", "512x512");
        formData.append("n", 1);

        const response = await axios.post(
            "https://api.openai.com/v1/images/edits",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders(),
                },
            }
        );

        const imageUrl = response.data.data[0].url;
        res.status(200).json({ imageUrl });
    } catch (error) {
        console.error(
            "Error generating edited image:",
            error.response ? error.response.data : error.message
        );
        res.status(500).json({
            error: "Failed to generate edited image: " + error.message,
        });
    } finally {
        fs.unlinkSync(image.path); // Clean up uploaded image
        if (fs.existsSync(maskPath)) {
            fs.unlinkSync(maskPath); // Clean up generated mask
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
