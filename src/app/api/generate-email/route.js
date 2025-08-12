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
      subject: `Congratulations on Securing 2nd Runner-Up at The AI Hiring Show: Tech + Business Edition | New Delhi 🏅`,
      html: `
        <p>Hi ${name},</p>
        <p>A huge congratulations to you and your team for achieving the <strong>2nd Runner-Up position</strong> at <strong>The AI Hiring Show: Tech + Business Edition — Vibe Coding, Power Hiring</strong> held on 7th August 2025! 🎉</p>
        <p>Your creativity, problem-solving skills, and AI-powered approach stood out and earned well-deserved recognition from our panel of recruiters and industry experts.</p>
        <p>📜 <strong>Download your Winner's Certificate here:</strong> <a href="${certificateData.imageUrl}" target="_blank">Downlload your Certificate</a></p>
        <p>As a special gesture, we're giving you free access to our <strong>"Agentic AI"</strong> course — so you can keep learning, experimenting, and building impactful AI solutions.</p>
        <p>🎁 <strong>Your Free Course Coupon Code Link:</strong> <a href="https://www.udemy.com/course/agentic-ai-from-scratch-with-crew-ai-autogen/?couponCode=FREEAGENTICAICOURSE" target="_blank">https://www.udemy.com/course/agentic-ai-from-scratch-with-crew-ai-autogen/?couponCode=FREEAGENTICAICOURSE</a></p>
        <p>⏳ <strong>Redeem before:</strong> 15th August 2025</p>
        <p>We can't wait to see where your skills take you next. 🚀</p>
        <p>Best wishes,<br/>Team Rabbitt Learning</p>
        <p><strong>Vibe Coding. Power Hiring.</strong></p>
        <p><a href="https://learning.rabbitt.ai/hiring-show" target="_blank">https://learning.rabbitt.ai/hiring-show</a></p>
        <p><a href="https://www.linkedin.com/showcase/rabbitt-learning/" target="_blank">https://www.linkedin.com/showcase/rabbitt-learning/</a></p>
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