import { generateCertificate } from "@/utils/certificate";

export async function POST(req) {
  try {
    // Step 1: Parse and validate incoming request
    const { name, testName } = await req.json();

    if (!name) {
      console.error("Missing required field: name.");
      return Response.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    // Step 2: Generate certificate and handle errors
    let certificateData;
    try {
      certificateData = await generateCertificate(name, testName);
    } catch (generateError) {
      console.error("Certificate generation failed:", generateError);
      return Response.json(
        { success: false, error: "Failed to generate certificate" },
        { status: 500 }
      );
    }

    // Step 3: Return success with certificate URL
    return Response.json({ success: true, imageUrl: certificateData.imageUrl || certificateData });
  } catch (error) {
    // General error handling for any unforeseen issues
    console.error("API Error:", error);
    return Response.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
