'use client';
import { useState } from "react";
import Papa from "papaparse";
import toast, { Toaster } from "react-hot-toast";
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [name, setName] = useState("");
  const [testName, setTestName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setImageUrl("");

    // Validation for missing inputs
    if (!name || !testName) {
      toast.error("Both Name and Test Name are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ name, testName }),
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
          const { Name, TestName, Email } = row;

          // Validate each row of CSV
          if (!Name || !TestName || !Email) {
            toast.error("One or more rows are missing required fields.");
            continue;
          }

          try {
            const res = await fetch("/api/generate-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: Name.trim(),
                testName: TestName.trim(),
                email: Email.trim(),
              }),
            });

            const data = await res.json();
            if (data.success) {
              newResults.push({
                name: Name.trim(),
                testName: TestName.trim(),
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
    const header = "Name,TestName,Email,CertificateLink\n";
    const rows = results
      .map(({ name, testName, email, url }) => `"${name}","${testName}","${email}","${url}"`)
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
            placeholder="Test Name"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="p-4 rounded-lg border border-gray-300 text-black shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition ease-in-out"
          >
            {loading ? "Generating..." : "Generate Certificate"}
          </button>
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

      {/* Bulk Upload */}
      <section className="max-w-6xl mx-auto mt-20 p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:bg-gray-800 rounded-2xl shadow-xl transition-all">
        <h2 className="text-xl font-semibold text-center mb-6 text-black">Generate Bulk Certificates</h2>
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
              <button
                onClick={() => downloadCertificatesAsCSV(bulkResults)}
                className="text-sm px-3 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition"
              >
                Download CSV
              </button>
            </div>

            {/* Table with Thumbnails */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm text-left">
                <thead className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Test</th>
                    <th className="px-4 py-2 border">Email</th>
                    <th className="px-4 py-2 border">Preview</th>
                    <th className="px-4 py-2 border">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((res, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 border">{res.name}</td>
                      <td className="px-4 py-2 border">{res.testName}</td>
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
