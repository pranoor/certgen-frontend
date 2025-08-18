export const emailTemplates = {
  default: {
    subject: "Congratulations! Your Certificate is Ready 🎉",
    content: `Hi {{name}},

Congratulations on your achievement! 🎉

We're excited to share your certificate with you. You can download it using the link below:

📜 Download your certificate: {{certificateLink}}

Keep up the great work!

Best regards,
The CertGen Team`
  },
  
  professional: {
    subject: "🏆 Achievement Unlocked - Your Certificate Awaits!",
    content: `Dear {{name}},

🎊 Fantastic news! You've successfully completed your certification!

Your dedication and hard work have paid off. We're thrilled to present you with your official certificate.

🔗 Access your certificate here: {{certificateLink}}

This achievement is a testament to your commitment to excellence. We're proud to have been part of your learning journey.

Congratulations once again!

Warm regards,
The Certification Team`
  },
  
  casual: {
    subject: "🎓 Your Certificate is Here - Well Done {{name}}!",
    content: `Hey {{name}}! 👋

Awesome job completing your certification! 🚀

You've put in the work, and now it's time to celebrate. Your certificate is ready and waiting for you.

👉 Grab your certificate: {{certificateLink}}

Share it with pride - you've earned it! 💪

Cheers to your success!
The Team 🎉`
  },
  
  formal: {
    subject: "Certificate of Completion - {{name}}",
    content: `Dear {{name}},

We are pleased to inform you that your certificate of completion has been generated and is now available for download.

Certificate Details:
- Recipient: {{name}}
- Date of Issue: ${new Date().toLocaleDateString()}

Please find your certificate at the following link: {{certificateLink}}

Should you have any questions or require assistance, please do not hesitate to contact us.

Sincerely,
The Certification Authority`
  }
};

export function replaceVariables(text, variables) {
  let result = text;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, variables[key]);
  });
  return result;
}