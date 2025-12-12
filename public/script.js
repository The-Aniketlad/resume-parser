console.log("✅ script.js loaded");

const fileInput = document.getElementById("resume-file");
const parseButton = document.getElementById("parse-button");
const resultsContainer = document.getElementById("results");
const loadingIndicator = document.getElementById("loading");

fileInput.addEventListener("change", () => {
  parseButton.disabled = fileInput.files.length === 0;
  resultsContainer.innerHTML = "";
});

parseButton.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  resultsContainer.innerHTML = "";
  loadingIndicator.classList.remove("hidden");

  try {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await fetch("/api/parse-resume", {
      method: "POST",
      body: formData,
    });

    const rawData = await response.json();
    loadingIndicator.classList.add("hidden");

    if (!response.ok || rawData.error) {
      resultsContainer.innerHTML = `<p class="error">Error: ${rawData.error || "Failed to parse resume."}</p>`;
      return;
    }

    displayResults(rawData);
  } catch (err) {
    loadingIndicator.classList.add("hidden");
    resultsContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
});

// ---------------------------
// Date helpers
// ---------------------------
function parseToDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (/present/i.test(str)) return null;
  const normalized = str.replace(/\u2013|\u2014/g, "-").replace(/\s+/, " ").trim();
  const yearOnly = normalized.match(/^(\d{4})$/);
  if (yearOnly) return new Date(`${yearOnly[1]}-01-01`);
  const dateTry = new Date(normalized);
  if (!isNaN(dateTry.getTime())) return dateTry;
  const mY = normalized.match(/([A-Za-z]+)\s+(\d{4})/);
  if (mY) return new Date(`${mY[1]} 1, ${mY[2]}`);
  const dmy = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const mm = parseInt(dmy[2], 10);
    const dd = parseInt(dmy[1], 10);
    const yy = parseInt(dmy[3], 10);
    const year = yy < 100 ? 2000 + yy : yy;
    return new Date(year, mm - 1, dd);
  }
  const anyYear = normalized.match(/(\d{4})/);
  if (anyYear) return new Date(`${anyYear[1]}-01-01`);
  return null;
}

function calculateDuration(startDateStr, endDateStr) {
  const start = parseToDate(startDateStr);
  const end = endDateStr ? parseToDate(endDateStr) : null;
  if (!start || isNaN(start.getTime())) return "";
  const actualEnd = end && !isNaN(end.getTime()) ? end : new Date();
  let years = actualEnd.getFullYear() - start.getFullYear();
  let months = actualEnd.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  const yStr = years > 0 ? `${years} yr${years > 1 ? "s" : ""}` : "";
  const mStr = months > 0 ? `${months} mo${months > 1 ? "s" : ""}` : "";
  if (yStr && mStr) return `${yStr}, ${mStr}`;
  if (yStr) return yStr;
  if (mStr) return mStr;
  return "Less than a month";
}

// ---------------------------
// Main display function
// ---------------------------
function displayResults(inputData) {
  const data = inputData.data || inputData;
  console.log("🔍 API Parsed Data (Processed):", data);

  const safe = (v, fallback = "N/A") => (v === null || v === undefined || v === "" ? fallback : v);

  // Basic info
  const name = safe(data.name?.full_name || data.name);
  const email = safe(data.email?.[0]?.email || data.email);
  const phone = safe(data.phone?.[0]?.phone || data.phone);
  const addressObj = data.address || {};
  const address = safe([addressObj.city, addressObj.state, addressObj.country_code].filter(Boolean).join(", "));
  const profile = safe(data.profile_summary || data.summary || data.professional_summary || "");
  const skills = data.skills?.overall_skills || data.skills || data.profile_summary_details?.skills || [];
  const education = data.education || [];

  // Unwrap nested shapes
  if (data.experience && Array.isArray(data.experience.experience)) data.experience = data.experience.experience;
  if (data.WorkExperience && Array.isArray(data.WorkExperience.items)) data.work_experience = data.WorkExperience.items;
  if (data.experience_section && Array.isArray(data.experience_section.items)) data.work_experience = data.experience_section.items;
  if (data.sections && data.sections["Work Experience"] && Array.isArray(data.sections["Work Experience"].items)) data.work_experience = data.sections["Work Experience"].items;

  // Build combined experience list
  let experienceList = getExperienceList(data);

  // SECONDARY PASS: Split any items that still contain embedded "Role | Company" lines inside their description
  experienceList = splitEmbeddedFromDescriptions(experienceList);

  // Format experience: show every entry
  const experienceOutput = experienceList.length > 0
    ? experienceList.map(exp => {
        const role = safe(exp.role || exp.job_title || exp.title || "N/A");
        const company = safe(exp.company_name || exp.company || exp.organization || "N/A");

        // parse date_range or individual fields
        let start = exp.start_year || exp.from_year || exp.start_date || exp.start || null;
        let end = exp.end_year || exp.to_year || exp.end_date || exp.to || null;
        if (exp.date_range && typeof exp.date_range === "string") {
          const dr = exp.date_range.replace(/\u2013|\u2014/g, "-");
          const parts = dr.split("-");
          if (parts.length >= 1) start = parts[0].trim();
          if (parts.length >= 2) end = parts[1].trim();
        }

        const isCurrent = !!exp.is_current || (typeof end === "string" && /present/i.test(end));
        const startDisp = start || "Unknown";
        const endDisp = isCurrent ? "Present" : (end || "Unknown");
        const durationStr = start ? calculateDuration(start, isCurrent ? null : end) : "";

        const desc = exp.description ? String(exp.description).replace(/\s+/g, " ").trim() : "";

        return `• ${role}
  Company : ${company}
  Duration: ${durationStr || "N/A"}
  Years   : ${startDisp} - ${endDisp}
  Details : ${desc || "N/A"}`;
      }).join("\n\n")
    : "N/A";

  const techSkills = data.skills_heading ? data.skills_heading.replace("TECHNICAL SKILLS", "").trim().split("\n") : [];
  const others = data.others_heading || "";

  const textOutput = `
===========================================
              Resume Information
===========================================

Name     : ${name}
Email    : ${email}
Phone    : ${phone}
Address  : ${address}

-------------------------------------------
           Profile Summary
-------------------------------------------
${profile}

-------------------------------------------
               Skills
-------------------------------------------
${Array.isArray(skills) ? skills.join(", ") : safe(skills)}

-------------------------------------------
             Experience
-------------------------------------------
${experienceOutput}

-------------------------------------------
             Education
-------------------------------------------
${education.length > 0 ? education.map(e =>
    `${safe(e.degree || e.degree_major)} in ${safe(e.course || e.field)} — ${safe(e.institute || e.institution || e.university)} (${e.to_month || ""} ${e.to_year || ""})`
  ).join("\n") : "N/A"}

-------------------------------------------
          Technical Skills
-------------------------------------------
${techSkills.length > 0 ? techSkills.join(", ") : "N/A"}

-------------------------------------------
      Languages & Certifications
-------------------------------------------
${others.replace("ADDITIONAL INFORMATION", "").trim() || "N/A"}
`;

  document.getElementById("results").innerHTML = `<pre class="text-output">${textOutput}</pre>`;
  document.getElementById("results-container").classList.remove("hidden");
  document.getElementById("copy-btn").classList.remove("hidden");
}

// copy button
document.getElementById("copy-btn").addEventListener("click", () => {
  const text = document.getElementById("results").innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copy-btn");
    btn.innerText = "✅ Copied!";
    setTimeout(() => btn.innerText = "📋 Copy", 2000);
  });
});

// ---------------------------
// Robust extractor for free-text experience
// ---------------------------
function extractExperienceFromText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const experiences = [];
  let current = null;

  for (let rawLine of lines) {
    const line = rawLine.replace(/\u2013|\u2014/g, "-").trim();

    // Multisegment line like "Role | Company | Aug 2020 - May 2022"
    const multiSeg = line.match(/^(.+?)\s*\|\s*(.+?)\s*(?:\|\s*(.+))?$/);
    // Date-only line like "Aug 2020 - May 2022" or "Aug 2020 – Present"
    const dateOnly = line.match(/([A-Za-z]{3,}\s*\d{4}|\d{4})\s*[-–—]\s*(Present|[A-Za-z]{3,}\s*\d{4}|\d{4})/i);
    // Bullet line (- or •)
    const bullet = line.match(/^[\-\u2022]\s*(.+)$/);

    if (multiSeg) {
      const maybeRole = multiSeg[1].trim();
      const maybeCompany = multiSeg[2].trim();
      const maybeThird = multiSeg[3] ? multiSeg[3].trim() : "";

      // heuristic: treat as new experience if looks like role|company
      if (maybeRole && maybeCompany) {
        if (current) experiences.push(current);
        current = {
          role: maybeRole,
          company_name: maybeCompany,
          date_range: maybeThird || "",
          description: ""
        };
        continue;
      }
    }

    // Inline "Role | Company" anywhere in the line
    const inlineRoleCompany = line.match(/(.+?)\s*\|\s*([A-Za-z0-9 &,.()\'\-]+)(?:\s*\|\s*(.+))?$/);
    if (inlineRoleCompany) {
      const role = inlineRoleCompany[1].trim();
      const company = inlineRoleCompany[2].trim();
      const third = inlineRoleCompany[3] ? inlineRoleCompany[3].trim() : "";

      if (current) experiences.push(current);
      current = {
        role,
        company_name: company,
        date_range: third || "",
        description: ""
      };
      continue;
    }

    if (dateOnly && current) {
      current.date_range = dateOnly[0].trim();
      continue;
    }

    if (bullet && current) {
      current.description += bullet[1].trim() + " ";
      continue;
    }

    // If current exists and line itself looks like a full new job line, split
    const detectRoleCompanyAnywhere = line.match(/([A-Za-z0-9\s&\.\-]{2,120})\s*\|\s*([A-Za-z0-9\s&\.\-]{2,120})\s*(?:\|\s*(.+))?/);
    if (detectRoleCompanyAnywhere && current) {
      experiences.push(current);
      current = {
        role: detectRoleCompanyAnywhere[1].trim(),
        company_name: detectRoleCompanyAnywhere[2].trim(),
        date_range: detectRoleCompanyAnywhere[3] ? detectRoleCompanyAnywhere[3].trim() : "",
        description: ""
      };
      continue;
    }

    if (current) {
      current.description += line + " ";
    } else {
      // no current - try to detect a date-led header as a single-line job
      const possibleHeader = line.match(/^([A-Za-z].{1,120})\s*[-–—]\s*(Present|[A-Za-z]{3,}\s*\d{4}|\d{4})/i);
      if (possibleHeader) {
        current = { role: possibleHeader[1].trim(), company_name: "", date_range: possibleHeader[0].trim(), description: "" };
        continue;
      }
    }
  }

  if (current) experiences.push(current);
  return experiences;
}

// ---------------------------
// Split embedded role|company occurrences found inside item.description
// ---------------------------
function splitEmbeddedFromDescriptions(items) {
  const output = [];
  for (const it of items) {
    if (!it || !it.description) {
      output.push(it);
      continue;
    }
    const desc = String(it.description);
    // If description contains something that looks like "Role | Company", extract them
    if (/\|/.test(desc) && /[A-Za-z]{2,}\s*\|\s*[A-Za-z0-9&]/.test(desc)) {
      // Use text extractor on the description to get separate experiences
      const extracted = extractExperienceFromText(desc);
      if (extracted.length) {
        // preserve original item's role/company if it had them and include it first (if meaningful)
        if ((it.role || it.job_title || it.title) && (it.company || it.company_name || it.organization)) {
          output.push(it);
        }
        // add all extracted experiences
        for (const e of extracted) output.push(e);
        continue;
      }
    }
    // otherwise keep as-is
    output.push(it);
  }
  return output;
}

// ---------------------------
// Combine structured + text experiences
// ---------------------------
function getExperienceList(profile) {
  // Collect structured candidates safely
  const candidates = [];
  const tryFields = ["experience","work_experience","employer","jobs","positions","employment_history","WorkExperience"];
  for (const f of tryFields) {
    const v = profile[f];
    if (!v) continue;
    if (Array.isArray(v)) candidates.push(...v);
    else if (typeof v === "object" && Array.isArray(v.items)) candidates.push(...v.items);
  }

  // flatten unique structured
  const structured = candidates.filter(Boolean);

  // Collect text fields likely to contain experience blocks
  const textFields = [
    profile.raw_text, profile.text, profile.parsed_text, profile.description,
    profile.summary, profile.profile_summary, profile.bio
  ].filter(Boolean);

  if (Array.isArray(profile.pages)) textFields.push(profile.pages.join("\n"));

  const combinedText = textFields.join("\n\n");
  const textExperiences = extractExperienceFromText(combinedText);

  // Merge structured + text experiences
  const all = [...structured, ...textExperiences];

  // Normalize fields
  const normalized = all.map(item => {
    if (!item) return { role: "", company_name: "", date_range: "", description: "" };
    return {
      role: item.role || item.job_title || item.title || "",
      company_name: item.company_name || item.company || item.organization || "",
      date_range: item.date_range || (item.from && item.to ? `${item.from} - ${item.to}` : "") || "",
      description: (item.description || item.summary || item.responsibilities || "").toString(),
      is_current: item.is_current || (item.to && /present/i.test(item.to)) || false,
      start_year: item.from_year || item.start_year || item.from || item.start_date || "",
      end_year: item.to_year || item.end_year || item.to || item.end_date || ""
    };
  });

  // SECONDARY: split embedded role|company inside normalized descriptions
  const afterSplit = splitEmbeddedFromDescriptions(normalized);

  // Deduplicate by role|company|date_range (simple heuristic)
  const unique = [];
  const seen = new Set();
  for (const e of afterSplit) {
    const key = `${(e.role||"").toLowerCase().trim()}|${(e.company_name||"").toLowerCase().trim()}|${(e.date_range||"").toLowerCase().trim()}`;
    if (!seen.has(key) && (e.role || e.company_name || e.date_range)) {
      unique.push(e);
      seen.add(key);
    }
  }

  return unique;
}
