// api/parse-resume.js
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable();

    const [fields, files] = await form.parse(req);

    console.log("FIELDS:", fields);
    console.log("FILES:", files);

    const resume = files.resume;

    if (!resume) {
      return res.status(400).json({
        error: "Resume file not received",
        receivedFiles: Object.keys(files),
      });
    }

    return res.status(200).json({
      success: true,
      name: resume.originalFilename,
      size: resume.size,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  }
}
