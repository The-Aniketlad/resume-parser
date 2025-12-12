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
    const form = formidable({ multiples: false });

    const [fields, files] = await form.parse(req);

    const file = files.resume || files.file;

    if (!file) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    return res.status(200).json({
      success: true,
      filename: file.originalFilename,
      size: file.size,
      message: "Resume uploaded successfully",
    });
  } catch (err) {
    console.error("Parse error:", err);
    return res.status(500).json({ error: "Resume parsing failed" });
  }
}
