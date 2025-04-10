import nodemailer from "nodemailer";
import { generateCertificate } from "@/utils/certificate";

export async function POST(req) {
  try {
    // Parse the request body
    const { name, testName, email } = await req.json();

    // Validate input
    if (!name || !testName || !email) {
      console.error("Missing required fields");
      return Response.json({ success: false, error: "Name, Test Name, and Email are required" }, { status: 400 });
    }

    // Generate certificate (this could fail if something goes wrong in the certificate generation)
    let imageUrl;
    try {
      imageUrl = await generateCertificate(name, testName);
    } catch (error) {
      console.error("Certificate generation error:", error);
      return Response.json({ success: false, error: "Failed to generate certificate" }, { status: 500 });
    }

    // Create the Nodemailer transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Set up email options
    const mailOptions = {
      from: `"Certificate Bot" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Certificate for ${testName}`,
      html: `
        <p>Hi ${name},</p>
        <p>Congratulations on completing <strong>${testName}</strong>!</p>
        <p>Your certificate is ready:</p>
        <p><a href="${imageUrl}" target="_blank">Download Certificate</a></p>
        <p>Thanks,<br />Team</p>
      `,
    };

    // Send the email
    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending email:", error);
      return Response.json({ success: false, error: "Failed to send email" }, { status: 500 });
    }

    // Return success response
    return Response.json({ success: true, imageUrl });
    
  } catch (error) {
    // Catch any unexpected errors and log them
    console.error("Unexpected error:", error);
    return Response.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
