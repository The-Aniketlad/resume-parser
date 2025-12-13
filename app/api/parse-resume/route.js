import pdf from "pdf-parse";
import mammoth from "mammoth";

// ✅ HANDLE GET (prevents 405 forever)
export async function GET() {
  return new Response(
    JSON.stringify({
      message: "Resume Parser API is running. Use POST to upload a resume."
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

// ✅ HANDLE POST (actual logic)
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No resume uploaded" }),
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop().toLowerCase();

    let text = "";

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

    return new Response(
      JSON.stringify({ success: true, text }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
