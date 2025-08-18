import nodemailer from "nodemailer";
import { generateCertificate } from "@/utils/certificate";
import { emailTemplates, replaceVariables } from "@/utils/emailTemplates";

export async function POST(req) {
  try {
    // Parse the request body
    const { name, email, emailSubject, emailContent } = await req.json();

    // Validate input
    if (!name || !email) {
      console.error("Missing required fields");
      return Response.json({ success: false, error: "Name and Email are required" }, { status: 400 });
    }

    // Use default values if custom email content is not provided
    const finalSubject = emailSubject || emailTemplates.default.subject;
    const finalContent = emailContent || emailTemplates.default.content;

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

    // Replace variables in email content
    const variables = {
      name: name,
      certificateLink: certificateData.imageUrl,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };
    
    const processedSubject = replaceVariables(finalSubject, variables);
    const processedContent = replaceVariables(finalContent, variables);

    // Convert plain text to HTML (preserve line breaks and make links clickable)
    let htmlContent = processedContent.replace(/\n/g, '<br>');
    
    // Make certificate links clickable
    htmlContent = htmlContent.replace(
      /\{\{certificateLink\}\}/g, 
      `<a href="${certificateData.imageUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">Download Certificate</a>`
    );
    
    // Make any other URLs clickable
    htmlContent = htmlContent.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" style="color: #2563eb; text-decoration: underline;">$1</a>'
    );

    // Set up email options with attachment
    const mailOptions = {
      from: `"CertGen" <${process.env.MAIL_USER}>`,
      to: email,
      subject: processedSubject,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${htmlContent}</div>`,
      attachments: [
        {
          filename: `${name}_Certificate.png`,
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