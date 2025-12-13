console.log("✅ script.js loaded");

const fileInput = document.getElementById("resume-file");
const parseBtn = document.getElementById("parse-button");
const loading = document.getElementById("loading");
const resultsContainer = document.getElementById("results-container");
const resultsDiv = document.getElementById("results");

// Enable button when file selected
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    parseBtn.disabled = false;
  } else {
    parseBtn.disabled = true;
  }
});

// Click → POST resume
parseBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a resume first");
    return;
  }

  loading.classList.remove("hidden");
  resultsContainer.classList.add("hidden");
  resultsDiv.innerHTML = "";

  const formData = new FormData();
  formData.append("resume", file); // 🔑 MUST be "resume"

  try {
    const response = await fetch("/api/parse-resume", {
      method: "POST", // 🔥 REQUIRED
      body: formData,
    });

    const data = await response.json();

    loading.classList.add("hidden");

    if (!response.ok) {
      alert(data.error || "Failed to parse resume");
      return;
    }

    resultsDiv.textContent = data.text;
    resultsContainer.classList.remove("hidden");

  } catch (error) {
    loading.classList.add("hidden");
    console.error(error);
    alert("Something went wrong while parsing");
  }
});
