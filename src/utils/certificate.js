import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import AWS from "aws-sdk";
import QRCode from "qrcode";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// We'll use system fonts directly instead of registering custom fonts
console.log("Using system fonts directly without registration");

// Note: We're not registering fonts from files anymore, relying on system installed fonts

export async function generateCertificate(name) {
  // Use higher resolution for better quality
  const width = 1414;
  const height = 2000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Enable anti-aliasing and better text rendering
  ctx.antialias = "subpixel";
  ctx.textRenderingOptimization = "optimizeQuality";

  const certificateId = uuidv4();

  // No need to verify font files as we're using system fonts
  console.log("Using system installed fonts");

  try {
    // Load image from local assets folder
    const imagePath = path.join(process.cwd(), "public/assets/2.png");
    const image = await loadImage(imagePath);
    ctx.drawImage(image, 0, 0, width, height);

    // Use the system-installed "Playlist Script" font directly
    // Set text properties
    ctx.fillStyle = "#D7B669";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const nameY = height * 0.48 - 35;

    // Try to use the exact font name as it appears in the system
    ctx.font = "110px 'Playlist Script'";

    // Draw the text
    ctx.fillText(name, width / 2, nameY);

    console.log("Name rendered with system font: Playlist Script");

    // Scale font size for certificate ID
    ctx.font = "24px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`ID: ${certificateId}`, width - 50, height - 30);

    // Generate a unique S3 key for this certificate
    const s3Key = `certificate_HR_${name}_${Date.now()}.png`;

    // Create URL for the certificate that will be used in the QR code
    const certificateUrl = `http://theaiworld.org/certificate?link=https://tcx-certificate.s3.amazonaws.com/${encodeURIComponent(
      s3Key
    )}`;

    // Generate QR code
    const qrCanvas = createCanvas(200, 200);
    await QRCode.toCanvas(qrCanvas, certificateUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 4,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Draw QR code on the certificate (bottom right)
    ctx.drawImage(qrCanvas, width - 407, height - 430, 275, 275);

    // Use higher quality PNG settings
    const buffer = canvas.toBuffer("image/png", {
      compressionLevel: 3,
      filters: canvas.PNG_FILTER_NONE,
    });

    const params = {
      Bucket: "tcx-certificate",
      Key: s3Key,
      Body: buffer,
      ContentType: "image/png",
      ACL: "public-read",
    };

    const uploadResult = await s3.upload(params).promise();

    // Return both the URL and buffer for email attachment
    console.log("Certificate generated successfully:", uploadResult.Location);
    return {
      imageUrl: uploadResult.Location,
      buffer: buffer,
      qrCodeUrl: certificateUrl,
    };
  } catch (err) {
    console.error(err);
    throw new Error("Certificate generation failed");
  }
}
