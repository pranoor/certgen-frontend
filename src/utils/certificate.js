import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

try {
  registerFont(path.join(process.cwd(), "public/assets/ArchivoBlack-Regular.ttf"), {
    family: "ArchivoBlack",
  });
} catch (e) {
  console.error("Font registration failed", e);
}

export async function generateCertificate(name) {
  // Use higher resolution for better quality
  const width = 1600;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Enable anti-aliasing and better text rendering
  ctx.antialias = 'subpixel';
  ctx.textRenderingOptimization = 'optimizeQuality';

  const certificateId = uuidv4();

  try {
    // Load image from local assets folder
    const imagePath = path.join(process.cwd(), "public/assets/certificate.png");
    const image = await loadImage(imagePath);
    ctx.drawImage(image, 0, 0, width, height);

    // Scale font size proportionally for higher resolution
    ctx.font = "bold 80px ArchivoBlack, Arial, sans-serif";
    ctx.fillStyle = "#0072BC";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Position the name precisely in the center
    const nameY = height * 0.48;
    ctx.fillText(name, width / 2, nameY);
    
    // Scale font size for certificate ID
    ctx.font = "24px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`ID: ${certificateId}`, width - 50, height - 30);

    // Use higher quality PNG settings
    const buffer = canvas.toBuffer("image/png", { 
      compressionLevel: 3,
      filters: canvas.PNG_FILTER_NONE 
    });

    const params = {
      Bucket: "tcx-certificate",
      Key: `certificate_${name}_${Date.now()}.png`,
      Body: buffer,
      ContentType: "image/png",
      ACL: "public-read",
    };

    const uploadResult = await s3.upload(params).promise();
    
    // Return both the URL and buffer for email attachment
    return {
      imageUrl: uploadResult.Location,
      buffer: buffer
    };
  } catch (err) {
    console.error(err);
    throw new Error("Certificate generation failed");
  }
}
