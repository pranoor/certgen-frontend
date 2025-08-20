'use client';
import { useState } from "react";
import Papa from "papaparse";
import toast, { Toaster } from "react-hot-toast";
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  
  // Email customization states
  const [emailSubject, setEmailSubject] = useState("Congratulations! Your Certificate is Ready 🎉");
  const [emailContent, setEmailContent] = useState(`Hi {{name}},

Congratulations on your achievement! 🎉

We're excited to share your certificate with you. You can download it using the link below:

📜 Download your certificate: {{certificateLink}}

Keep up the great work!

Best regards,
The CertGen Team`);
  const [showEmailCustomization, setShowEmailCustomization] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setImageUrl("");

    // Validation for missing inputs
    if (!name) {
      toast.error("Name is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (data.success) {
        setImageUrl(data.imageUrl);
        toast.success("Certificate generated!");
      } else {
        toast.error("Certificate generation failed.");
      }
    } catch (error) {
      console.error("Error during certificate generation:", error);
      toast.error("Failed to generate certificate. Please try again.");
    }

    setLoading(false);
  }

  async function handleSendEmail() {
    if (!name || !email) {
      toast.error("Name and email are required to send certificate.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          emailSubject: emailSubject,
          emailContent: emailContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Certificate sent to ${email}!`);
        setImageUrl(data.imageUrl);
      } else {
        toast.error("Failed to send certificate email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send certificate email.");
    }
    setLoading(false);
  }

  async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setBulkLoading(true);
    setBulkResults([]);

    // Validate CSV file
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a valid CSV file.");
      setBulkLoading(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newResults = [];

        for (const row of results.data) {
          const { Name, Email } = row;

          // Validate each row of CSV
          if (!Name || !Email) {
            toast.error("One or more rows are missing required fields.");
            continue;
          }

          try {
            const res = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: Name.trim(),
                email: Email.trim(),
                emailSubject: emailSubject,
                emailContent: emailContent,
              }),
            });

            const data = await res.json();
            if (data.success) {
              newResults.push({
                name: Name.trim(),
                email: Email.trim(),
                url: data.imageUrl,
              });
              toast.success(`Certificate sent to ${Email}`);
            } else {
              toast.error(`Failed to send certificate to ${Email}`);
            }
          } catch (err) {
            console.error("Error generating certificate for", Email, err);
            toast.error(`Error generating certificate for ${Email}`);
          }
        }

        if (newResults.length === 0) {
          toast.error("No certificates were successfully generated.");
        } else {
          setBulkResults(newResults);
          toast.success("Bulk certificate generation complete!");
        }
        setBulkLoading(false);
      },
      error: (err) => {
        toast.error("Failed to parse CSV. Please check the file format.");
        setBulkLoading(false);
      },
    });
  }

  function downloadCertificatesAsCSV(results) {
    const header = "Name,Email,CertificateLink\n";
    const rows = results
      .map(({ name, email, url }) => `"${name}","${email}","${url}"`)
      .join("\n");

    try {
      const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "generated_certificates.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV file.");
    }
  }

  // Add this new function to download all certificates as ZIP
  async function downloadAllCertificatesAsZip(results) {
    if (results.length === 0) {
      toast.error("No certificates to download");
      return;
    }

    toast.loading("Preparing ZIP file...");
    
    try {
      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Create a folder in the ZIP
      const folder = zip.folder("certificates");
      
      // Download each certificate and add to ZIP
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        try {
          const response = await fetch(result.url);
          const blob = await response.blob();
          
          // Clean filename by removing special characters
          const cleanName = result.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
          const filename = `${cleanName}_certificate.png`;
          
          folder.file(filename, blob);
          
          // Update progress
          toast.loading(`Adding certificate ${i + 1}/${results.length} to ZIP...`);
        } catch (error) {
          console.error(`Failed to download certificate for ${result.name}:`, error);
          toast.error(`Failed to add ${result.name}'s certificate to ZIP`);
        }
      }
      
      // Generate and download ZIP file
      toast.loading("Generating ZIP file...");
      const content = await zip.generateAsync({ type: "blob" });
      
      // Create download link
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `certificates_${new Date().toISOString().slice(0, 10)}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success("All certificates downloaded successfully!");
      
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      toast.dismiss();
      toast.error("Failed to create ZIP file. Please try again.");
    }
  }

  return (
    <main className={`${darkMode ? "bg-gray-950 text-white" : "bg-gradient-to-br from-gray-100 to-white text-gray-900"} min-h-screen px-4 py-10 transition-all`}>
      <Toaster />

      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight">🎓 CertGen</h1>
        <div className="flex items-center gap-3">
          {darkMode ? <MoonIcon className="w-5 h-5 text-white" /> : <SunIcon className="w-5 h-5 text-yellow-500" />}
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full transition duration-300">
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transform transition-transform duration-300" />
            </div>
          </label>
        </div>
      </div>

      {/* Single Form */}
      <section className="max-w-xl mx-auto bg-white/70 dark:bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl transition-all">
        <h2 className="text-xl font-semibold text-center mb-5">Generate Single Certificate</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-4 rounded-lg border border-gray-300 text-black shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
          <input
            placeholder="Email (required for email sending)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-4 rounded-lg border border-gray-300 text-black shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            type="email"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition ease-in-out"
            >
              {loading ? "Generating..." : "Generate Certificate"}
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={loading || !email}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition ease-in-out disabled:bg-gray-400"
            >
              {loading ? "Sending..." : "Generate & Email"}
            </button>
          </div>
        </form>
        {loading && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full" />
          </div>
        )}
      </section>

      {/* Single Preview */}
      {imageUrl && !loading && (
        <div className="text-center mt-10">
          <h3 className="text-lg font-semibold mb-3">Preview</h3>
          <img src={imageUrl} alt="Certificate" className="max-w-lg w-full rounded-lg shadow-lg transform transition-transform hover:scale-105" />
        </div>
      )}

      {/* Email Customization Section */}
      <section className="max-w-4xl mx-auto mt-16 p-6 bg-white/70 dark:bg-white/10 backdrop-blur-md rounded-2xl shadow-xl transition-all">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">📧 Email Customization</h2>
          <button
            onClick={() => setShowEmailCustomization(!showEmailCustomization)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {showEmailCustomization ? "Hide" : "Customize Email"}
          </button>
        </div>
        
        {showEmailCustomization && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm font-medium">Quick Templates:</span>
              <button
                onClick={() => {
                  setEmailSubject("Congratulations! Your Certificate is Ready 🎉");
                  setEmailContent(`Hi {{name}},

Congratulations on your achievement! 🎉

We're excited to share your certificate with you. You can download it using the link below:

📜 Download your certificate: {{certificateLink}}

Keep up the great work!

Best regards,
The CertGen Team`);
                }}
                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Default
              </button>
              <button
                onClick={() => {
                  setEmailSubject("🏆 Achievement Unlocked - Your Certificate Awaits!");
                  setEmailContent(`Dear {{name}},

🎊 Fantastic news! You've successfully completed your certification!

Your dedication and hard work have paid off. We're thrilled to present you with your official certificate.

🔗 Access your certificate here: {{certificateLink}}

This achievement is a testament to your commitment to excellence. We're proud to have been part of your learning journey.

Congratulations once again!

Warm regards,
The Certification Team`);
                }}
                className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800"
              >
                Professional
              </button>
              <button
                onClick={() => {
                  setEmailSubject("🎓 Your Certificate is Here - Well Done {{name}}!");
                  setEmailContent(`Hey {{name}}! 👋

Awesome job completing your certification! 🚀

You've put in the work, and now it's time to celebrate. Your certificate is ready and waiting for you.

👉 Grab your certificate: {{certificateLink}}

Share it with pride - you've earned it! 💪

Cheers to your success!
The Team 🎉`);
                }}
                className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                Casual
              </button>
              <button
                onClick={() => {
                  setEmailSubject("Certificate of Completion - {{name}}");
                  setEmailContent(`Dear {{name}},

We are pleased to inform you that your certificate of completion has been generated and is now available for download.

Certificate Details:
- Recipient: {{name}}
- Date of Issue: ${new Date().toLocaleDateString()}

Please find your certificate at the following link: {{certificateLink}}

Should you have any questions or require assistance, please do not hesitate to contact us.

Sincerely,
The Certification Authority`);
                }}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Formal
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Email Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 text-black shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Enter email subject..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Email Content</label>
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                <p>Available variables: 
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1">{"{{name}}"}</code>
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1">{"{{certificateLink}}"}</code>
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1">{"{{date}}"}</code>
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded mx-1">{"{{time}}"}</code>
                </p>
              </div>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={12}
                className="w-full p-3 rounded-lg border border-gray-300 text-black shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm"
                placeholder="Enter email content with variables..."
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Preview for "John Doe":</h4>
              <div className="text-sm bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="font-medium mb-2">Subject: {emailSubject}</div>
                <div className="whitespace-pre-wrap">
                  {emailContent
                    .replace(/\{\{name\}\}/g, "John Doe")
                    .replace(/\{\{certificateLink\}\}/g, "[Certificate Download Link]")
                    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
                    .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString())}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bulk Upload */}
      <section className="max-w-6xl mx-auto mt-20 p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:bg-gray-800 rounded-2xl shadow-xl transition-all">
        <h2 className="text-xl font-semibold text-center mb-6 text-black">Generate Bulk Certificates</h2>
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          <p>CSV format: <strong>Name, Email</strong></p>
          <p className="mt-1">📧 Will use the email template configured above for all recipients</p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="mb-6 block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
        {bulkLoading && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full" />
          </div>
        )}

        {bulkResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Generated Certificates</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCertificatesAsCSV(bulkResults)}
                  className="text-sm px-3 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => downloadAllCertificatesAsZip(bulkResults)}
                  className="text-sm px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-1"
                >
                  📦 Download All as ZIP
                </button>
              </div>
            </div>

            {/* Table with Thumbnails */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm text-left">
                <thead className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Email</th>
                    <th className="px-4 py-2 border">Preview</th>
                    <th className="px-4 py-2 border">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((res, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 border">{res.name}</td>
                      <td className="px-4 py-2 border">{res.email}</td>
                      <td className="px-4 py-2 border">
                        <a href={res.url} target="_blank" rel="noreferrer">
                          <img
                            src={res.url}
                            alt="certificate"
                            className="w-32 h-auto rounded-lg shadow-lg hover:scale-105 transition-transform"
                          />
                        </a>
                      </td>
                      <td className="px-4 py-2 border">
                        <a href={res.url} download className="text-blue-600 hover:underline dark:text-blue-400">
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
