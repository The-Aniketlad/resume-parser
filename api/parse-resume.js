// api/parse-resume.js
import formidable from "formidable";
import fs from "fs";
import pdf from "pdf-parse";

export const config = {
  api: {
    bodyParser: false,
  },
};

function extractBasicInfo(text) {
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)?.[0] || null;
  const phone = text.match(/(\+?\d{1,3}[\s-]?)?\(?\d{10}\)?/)?.[0] || null;

  // Name heuristic: first non-empty line
  const name = text.split("\n").map(l => l.trim()).find(l => l.length > 2) || null;

  return { name, email, phone };
}

function extractSkills(text) {
  const skillKeywords = [
    "JavaScript", "Python", "Java", "C++", "Node", "React", "AWS",
    "Docker", "SQL", "MongoDB", "Git", "HTML", "CSS"
  ];

  return skillKeywords.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

function extractExperience(text) {
  const lines = text.split("\n");
  const experience = [];

  for (let line of lines) {
    if (
      /(engineer|developer|intern|analyst|manager)/i.test(line) &&
      /(20\d{2})/.test(line)
    ) {
      experience.push(line.trim());
    }
  }

  return experience;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable();
    const [, files] = await form.parse(req);

    const resume = files.resume;
    if (!resume) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    // Read PDF into memory
    const buffer = fs.readFileSync(resume.filepath);
    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    const { name, email, phone } = extractBasicInfo(text);
    const skills = extractSkills(text);
    const experience = extractExperience(text);

    return res.status(200).json({
      name,
      email,
      phone,
      skills,
      experience,
      raw_text_preview: text.slice(0, 500),
    });
  } catch (err) {
    console.error("Parse error:", err);
    return res.status(500).json({ error: "Resume parsing failed" });
  }
}
