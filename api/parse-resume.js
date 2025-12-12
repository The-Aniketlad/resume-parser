// api/parse-resume.js
import formidable from "formidable";

export const config = {
  api: { bodyParser: false }
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm({
    multiples: false,
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }

    const file = files.resume || files.file;
    if (!file) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    // IMPORTANT:
    // Do NOT save file to disk
    // Do NOT create folders
    // Just read from file.filepath

    return res.status(200).json({
      success: true,
      filename: file.originalFilename,
      size: file.size
    });
  });
}
