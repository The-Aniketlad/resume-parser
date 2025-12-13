import pdf from "pdf-parse";
import mammoth from "mammoth";

console.log("✅ parse-resume API HIT");

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("resume");

  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), {
      status: 400,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop().toLowerCase();

  let text = "";

  try {
    if (ext === "pdf") {
      const data = await pdf(buffer);
      text = data.text;
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return new Response(
        JSON.stringify({ error: "Only PDF or DOCX allowed" }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify({ success: true, text }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Failed to parse resume" }),
      { status: 500 }
    );
  }
}
