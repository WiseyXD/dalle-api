// index.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());

app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/images/generations",
            {
                prompt: prompt,
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
