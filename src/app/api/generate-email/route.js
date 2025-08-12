import nodemailer from "nodemailer";
import { generateCertificate } from "@/utils/certificate";

export async function POST(req) {
  try {
    // Parse the request body
    const { name, email } = await req.json();

    // Validate input
    if (!name || !email) {
      console.error("Missing required fields");
      return Response.json({ success: false, error: "Name and Email are required" }, { status: 400 });
    }

    // Generate certificate (this will return both URL and buffer)
    let certificateData;
    try {
      certificateData = await generateCertificate(name);
    } catch (error) {
      console.error("Certificate generation error:", error);
      return Response.json({ success: false, error: "Failed to generate certificate" }, { status: 500 });
    }

    // Create the Nodemailer transport (Fixed: use createTransport, not createTransporter)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Set up email options with attachment
    const mailOptions = {
      from: `"Rabbitt Learning" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Congratulations on Winning The AI Hiring Show! 🏅`,
      html: `
        <p>Hi ${name},</p>
        <p>Congratulations once again for securing a spot among the <strong>Top 7 winning teams</strong> of <strong>The AI Hiring Show: Vibe Coding, Power Hiring</strong> held on 5th July 2025! 🥳</p>
        <p>We're proud to share your Winner's Certificate, acknowledging your outstanding solution, technical excellence, and real-world problem-solving skills.</p>
        <p>🔗 <strong>Download your certificate here:</strong> <a href="${certificateData.imageUrl}" target="_blank">${certificateData.imageUrl}</a></p>
        <p>Your performance set a high standard, and we can't wait to see where you go next.</p>
        <p>Keep building, keep leading!</p>
        <p>Team Rabbitt Learning</p>
      `,
      attachments: [
        {
          filename: `${name}_Winner_Certificate.png`,
          content: certificateData.buffer,
          contentType: 'image/png'
        }
      ]
    };

    // Send the email
    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending email:", error);
      return Response.json({ success: false, error: "Failed to send email" }, { status: 500 });
    }

    // Return success response
    return Response.json({ success: true, imageUrl: certificateData.imageUrl });
    
  } catch (error) {
    // Catch any unexpected errors and log them
    console.error("Unexpected error:", error);
    return Response.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
