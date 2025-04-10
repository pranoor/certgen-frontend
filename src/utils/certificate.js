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
    family: "Archivo Black",
  });
} catch (e) {
  console.error("Font registration failed", e);
}

export async function generateCertificate(name, testName) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const certificateId = uuidv4();

  try {
    const image = await loadImage("https://i.ibb.co/j9xDtFq1/Certificate.png");
    ctx.drawImage(image, 0, 0, width, height);

    ctx.font = "40px Archivo Black";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.fillText(name, width / 2, height - height / 2.5 - 50);
    
    ctx.font = "30px Arial";
    ctx.fillText(testName, width / 2, height - height / 2.7 + 80);
    
    ctx.font = "12px Arial";
    ctx.fillText(`ID: ${certificateId}`, width - 205, height - 50);
    

    const buffer = canvas.toBuffer("image/png");

    const params = {
      Bucket: "tcx-certificate",
      Key: `certificate_${name}_${testName}.png`,
      Body: buffer,
      ContentType: "image/png",
      ACL: "public-read",
    };

    const uploadResult = await s3.upload(params).promise();
    return uploadResult.Location;
  } catch (err) {
    console.error(err);
    throw new Error("Certificate generation failed");
  }
}
