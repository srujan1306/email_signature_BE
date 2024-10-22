import AWS from "@aws-sdk/client-s3";
import aws from "aws-sdk";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import multer from "multer";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config(); // Load environment variables
const app = express();
app.use(cors());
const port = 3000;

// Check for required environment variables
if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION ||
  !process.env.AWS_S3_BUCKET ||
  !process.env.DYNAMODB_TABLE_NAME
) {
  throw new Error("Missing required environment variables");
}

// AWS S3 configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Set up multer to use S3
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for multer
});
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // Generate a unique ID for the file
    const id = uuidv4();
    // Determine the content type based on the file's mime type
    const contentType = req.file.mimetype; // e.g., 'image/jpeg', 'image/png'

    // Prepare the upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `${Date.now().toString()}-${req.file.originalname}`,
      Body: req.file.buffer, // Buffer from multer.memoryStorage
      // ACL: "public-read", // Adjust according to your needs
      ContentType: contentType, // Set the Content-Type header
      ContentDisposition: "inline", // Ensure the file is displayed inline
    };

    // Upload the file to S3
    const command = new PutObjectCommand(uploadParams);
    const data = await s3.send(command);

    // File URL
    const profile_imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${uploadParams.Key}`;

    // DynamoDB configuration
    const dynamoDB = new aws.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION,
    });

    const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

    // Prepare item to save in DynamoDB
    const item = {
      TableName: TABLE_NAME,
      Item: {
        pk: id,
        sk: profile_imageUrl,
        full_name: "Srujan Pothu",
        designation: "GET",
        phone_number: 7997037993,
        email_address: "srujan.pothu@proclink.com",
        facebook_link: "",
        linkedIn_link: "",
        twitter_link: "",
        instagram_link: "",
      },
    };

    // Save the file URL in DynamoDB
    await dynamoDB.put(item).promise();

    res.status(200).json({ profile_imageUrl: profile_imageUrl });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
