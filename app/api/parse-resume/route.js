import pdf from "pdf-parse";
import mammoth from "mammoth";

export async function POST(req) {
  try {
    console.log("✅ API HIT");

    const formData = await req.formData();
    console.log("📦 FormData keys:", [...formData.keys()]);

    const file = formData.get("resume");

    if (!file || typeof file.arrayBuffer !== "function") {
      return new Response(
        JSON.stringify({ error: "Resume file not received" }),
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop().toLowerCase();

    let text = "";

    if (ext === "pdf") {
      const data = await pdf(buffer); // ✅ BUFFER, not path
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
    console.error("🔥 FULL ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
