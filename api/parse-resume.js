import fetch from "node-fetch";
import FormData from "form-data";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    console.log("📥 API key present?", !!process.env.API_KEY);
    console.log("📥 Body length:", event.body?.length);

    const bodyBuffer = Buffer.from(event.body, "base64");

    const formData = new FormData();
    formData.append("file", bodyBuffer, {
      filename: "resume.pdf",
      contentType: event.headers["content-type"] || "application/pdf",
    });

    const apiResponse = await fetch("https://api.superparser.com/parse", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.API_KEY,
      },
      body: formData,
    });

    console.log("📤 Superparser status:", apiResponse.status);

    const result = await apiResponse.json();
    console.log("📤 Superparser result:", result);

    return {
      statusCode: apiResponse.status,
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error("❌ Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

