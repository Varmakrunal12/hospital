// ============================================================
// ai.js  —  E-SHR Health AI  (Claude via Anthropic API)
// ============================================================
// This file replaces the demo/stub AI with a real Claude-powered
// health assistant. The Anthropic API is called from the browser
// using a proxy pattern (see note below).
//
// NOTE ON API KEY:
//   Never expose your Anthropic API key in client-side code in
//   production. Use a lightweight backend proxy (Node/Express,
//   Cloudflare Worker, Firebase Function, etc.) that forwards
//   requests. For local development / demo you may set the key
//   directly — the DEMO_MODE flag below lets you test without
//   any key at all.
// ============================================================

const AI_CONFIG = {
  // Set to false once you have a working proxy / API key
  DEMO_MODE : false,

  // Your proxy endpoint that forwards to Anthropic, OR the
  // Anthropic API directly (not recommended for production).
  // Example proxy: "https://my-worker.username.workers.dev/ai"
  ENDPOINT  : "https://api.anthropic.com/v1/messages",

  // Only used when calling Anthropic directly (dev only)
  API_KEY   : "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",

  MODEL     : "claude-opus-4-20250514",
  MAX_TOKENS: 800,
};

// ── Build system prompt from patient profile ────────────────
function buildSystemPrompt() {
  const user = window._currentUser || {};
  const parts = [
    "You are E-SHR Health AI, a friendly and knowledgeable medical assistant",
    "embedded in the E-SHR Emergency Smart Health Record system.",
    "Always be concise, empathetic, and evidence-based.",
    "Never diagnose definitively — recommend consulting a doctor for serious concerns.",
    "Format responses in plain text without markdown symbols.",
  ];

  if (user.bloodGroup)  parts.push(`Patient blood group: ${user.bloodGroup}.`);
  if (user.age)         parts.push(`Patient age: ${user.age} years.`);
  if (user.allergies && user.allergies.length)
    parts.push(`Known allergies: ${user.allergies.join(", ")}.`);
  if (user.weight)      parts.push(`Weight: ${user.weight} kg.`);
  if (user.height)      parts.push(`Height: ${user.height} cm.`);

  return parts.join(" ");
}

// ── Conversation history (cleared on page reload) ───────────
let _aiHistory = [];

// ── Call the AI ─────────────────────────────────────────────
async function callAI(userMessage) {
  if (AI_CONFIG.DEMO_MODE) {
    return demoAIResponse(userMessage);
  }

  _aiHistory.push({ role: "user", content: userMessage });

  // Keep last 10 turns to stay within token limits
  const messages = _aiHistory.slice(-10);

  try {
    const headers = {
      "Content-Type"      : "application/json",
      "anthropic-version" : "2023-06-01",
    };

    // Only add API key header when calling Anthropic directly
    if (AI_CONFIG.API_KEY !== "YOUR_ANTHROPIC_API_KEY") {
      headers["x-api-key"] = AI_CONFIG.API_KEY;
      // Required CORS bypass header for direct browser calls (dev only)
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    }

    const res = await fetch(AI_CONFIG.ENDPOINT, {
      method : "POST",
      headers,
      body   : JSON.stringify({
        model      : AI_CONFIG.MODEL,
        max_tokens : AI_CONFIG.MAX_TOKENS,
        system     : buildSystemPrompt(),
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text || "I could not generate a response.";
    _aiHistory.push({ role: "assistant", content: reply });
    return reply;

  } catch (e) {
    console.error("AI error:", e);
    _aiHistory.pop(); // remove last user msg on failure
    return `Sorry, I encountered an error: ${e.message}. Please try again.`;
  }
}

// ── Demo responses (when DEMO_MODE = true) ─────────────────
function demoAIResponse(msg) {
  const m = msg.toLowerCase();
  if (m.includes("blood group") || m.includes("blood type")) {
    const user = window._currentUser || {};
    const bg   = user.bloodGroup || "unknown";
    return `Your blood group is ${bg}. ${bg.includes("+") ? "Positive blood groups can receive from both positive and negative of the same type." : "Negative blood groups can donate to both positive and negative of the same type."} Always carry this information in emergencies.`;
  }
  if (m.includes("allerg")) {
    const user = window._currentUser || {};
    const al   = (user.allergies || []).join(", ") || "none on record";
    return `Your known allergies: ${al}. Always inform healthcare providers of these before any treatment or prescription. Carry an allergy card with you.`;
  }
  if (m.includes("cbc") || m.includes("blood test")) {
    return "A CBC (Complete Blood Count) measures red blood cells (RBC), white blood cells (WBC), hemoglobin, hematocrit, and platelets. Normal ranges: RBC 4.5–5.5 M/uL, WBC 4,500–11,000/uL, Hemoglobin 13.5–17.5 g/dL (men) or 12–15.5 g/dL (women). Always discuss results with your doctor.";
  }
  if (m.includes("fever") || m.includes("temperature")) {
    return "Normal body temperature is 37°C (98.6°F). A fever is 38°C (100.4°F) or above. Stay hydrated, rest, and take paracetamol if above 38.5°C. Seek immediate care if temperature exceeds 40°C, or if accompanied by rash, severe headache, or difficulty breathing.";
  }
  if (m.includes("emergency") || m.includes("heart attack") || m.includes("stroke")) {
    return "⚠️ EMERGENCY SIGNS: chest pain radiating to arm/jaw, sudden slurred speech, face drooping, sudden severe headache, difficulty breathing. Call 112 immediately. Do not drive yourself to the hospital. Share your E-SHR QR code with paramedics for instant medical history access.";
  }
  if (m.includes("medicine") || m.includes("medication") || m.includes("side effect")) {
    return "Common side effects vary by drug class. Antibiotics may cause nausea, diarrhea, or rash. Pain relievers (NSAIDs) can irritate the stomach — take with food. Always complete your full antibiotic course. Never mix medications without consulting your doctor or pharmacist.";
  }
  if (m.includes("health tip") || m.includes("fitness") || m.includes("diet")) {
    return "Daily health tips: drink 8+ glasses of water, sleep 7–9 hours, walk at least 30 minutes, eat plenty of vegetables and fruits. Limit processed sugar and salt. Monitor your blood pressure and sugar if you have a family history of diabetes or hypertension. Regular check-ups save lives.";
  }
  return "I'm your E-SHR Health AI. I can help with understanding your reports, medications, symptoms, and general health guidance. Could you please be more specific about what you'd like to know? (Note: AI mode is currently in demo — set AI_CONFIG.DEMO_MODE = false with a valid API key to enable full AI.)";
}

// ── UI: Send message ─────────────────────────────────────────
async function sendAIMessage() {
  const input = document.getElementById("aiInput");
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = "";
  appendAIMessage("user", msg);

  const typingEl = appendAITyping();

  const reply = await callAI(msg);

  typingEl.remove();
  appendAIMessage("assistant", reply);
}

// ── UI: Quick chip ───────────────────────────────────────────
async function sendAIQuick(msg) {
  document.getElementById("aiInput").value = msg;
  await sendAIMessage();
}

// ── UI: Append message bubble ────────────────────────────────
function appendAIMessage(role, text) {
  const box = document.getElementById("aiChatBox");
  const div = document.createElement("div");
  div.className = `ai-msg ${role}`;
  div.innerHTML  = role === "user"
    ? `<div class="ai-msg-label">You</div><div>${escapeHtml(text)}</div>`
    : `<div class="ai-msg-label">E-SHR Health AI</div><div>${escapeHtml(text)}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ── UI: Typing indicator ─────────────────────────────────────
function appendAITyping() {
  const box = document.getElementById("aiChatBox");
  const div = document.createElement("div");
  div.className = "ai-msg assistant";
  div.innerHTML = `<div class="ai-msg-label">E-SHR Health AI</div>
    <div class="ai-typing">
      <span></span><span></span><span></span>
    </div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

// ── Utility: escape HTML ─────────────────────────────────────
function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
           .replace(/"/g,"&quot;").replace(/\n/g,"<br>");
}

// ── Enter key to send ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("aiInput");
  if (inp) {
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }
});
