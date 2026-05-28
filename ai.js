// ================================================================
// ai.js — AI Health Assistant
// ================================================================

function initAI() {
  const u = STATE.userData;
  if (u && STATE.userRole === 'doctor') {
    document.getElementById('aiSubtitle').textContent = 'AI Diagnosis Aid — Powered by clinical intelligence';
  }
}

async function sendAIMessage() {
  const inp = document.getElementById('aiInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  appendAIMessage('user', msg);
  await getAIResponse(msg);
}

function sendAIQuick(msg) {
  document.getElementById('aiInput').value = msg;
  sendAIMessage();
}

// Allow Enter key to send message
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('aiInput');
  if (inp) {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
    });
  }
});

function appendAIMessage(role, text) {
  const box = document.getElementById('aiChatBox');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = `<div class="ai-msg-label">${role === 'user' ? 'You' : 'E-SHR Health AI'}</div><div>${text}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function getAIResponse(userMsg) {
  const u = STATE.userData;
  const typing = document.createElement('div');
  typing.className = 'ai-msg assistant';
  typing.innerHTML = '<div class="ai-msg-label">E-SHR Health AI</div><div><span class="spinner"></span> Thinking...</div>';
  const box = document.getElementById('aiChatBox');
  box.appendChild(typing);
  box.scrollTop = box.scrollHeight;

  // Build patient context for the AI
  const ctx = u
    ? `Patient context: Name: ${u.firstName} ${u.lastName}, Age: ${u.age || 'unknown'}, Blood Group: ${u.bloodGroup || 'unknown'}, Allergies: ${(u.allergies || []).join(', ') || 'None'}, Role: ${STATE.userRole}.`
    : 'No patient context available.';

  // Build conversation history from existing chat messages
  const chatMsgs = Array.from(box.querySelectorAll('.ai-msg')).slice(0, -1).map(el => {
    const isUser = el.classList.contains('user');
    const text = el.querySelector('div:last-child')?.innerText || '';
    return { role: isUser ? 'user' : 'assistant', content: text };
  }).filter(m => m.content);

  // FIX: Use real Claude API instead of hardcoded responses
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are E-SHR Health AI, a medical assistant integrated into a hospital management system. ${ctx}

You help patients and doctors with medical questions, health tips, medication information, allergy guidance, and understanding health records. Be concise, clear, and helpful. Use bullet points where appropriate. Always remind users that your advice is informational only and not a substitute for professional medical care. For emergencies, always direct to call 112.`,
        messages: [...chatMsgs.slice(-8), { role: 'user', content: userMsg }],
      })
    });

    const data = await response.json();

    if (response.ok && data.content?.[0]?.text) {
      const aiText = data.content[0].text;
      typing.innerHTML = `<div class="ai-msg-label">E-SHR Health AI</div><div>${aiText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
    } else {
      // API error — fall back to local smart response
      const fallback = generateLocalAIResponse(userMsg, u);
      typing.innerHTML = `<div class="ai-msg-label">E-SHR Health AI</div><div>${fallback}</div>`;
    }
  } catch (e) {
    // Network error — fall back to local smart response
    const fallback = generateLocalAIResponse(userMsg, u);
    typing.innerHTML = `<div class="ai-msg-label">E-SHR Health AI</div><div>${fallback}</div>`;
  }

  box.scrollTop = box.scrollHeight;
}

// Local fallback when API unavailable (keeps existing logic)
function generateLocalAIResponse(msg, u) {
  return generateAIResponse(msg, '', u);
}

function generateAIResponse(msg, ctx, u) {
  const lower = msg.toLowerCase();
  const algs  = u?.allergies || [];
  const bg    = u?.bloodGroup || '';

  if (lower.includes('blood group') || lower.includes('blood type')) {
    const info = {
      'O+' : 'Universal donor for red cells. Can receive from O+ and O-. Common in India (~36% population).',
      'A+' : 'Can donate to A+ and AB+. Receive from A+, A-, O+, O-.',
      'B+' : 'Can donate to B+ and AB+. Receive from B+, B-, O+, O-.',
      'AB+': 'Universal recipient — can receive from all blood types. Rarest major group.',
      'O-' : 'Universal donor — can give to all blood types. Very valuable in emergencies.',
      'A-' : 'Can donate to A+, A-, AB+, AB-. Valuable type.',
      'B-' : 'Can donate to B+, B-, AB+, AB-. Relatively rare.',
      'AB-': 'Can donate to AB+ and AB-. Rarest blood type.',
    };
    return `🩸 <strong>Your Blood Group: ${bg || 'Not set'}</strong><br><br>${info[bg] || 'Update your blood group in Profile for personalized advice.'}<br><br>💡 <em>Tip: Always carry your blood group card in emergencies.</em>`;
  }

  if (lower.includes('allerg')) {
    if (!algs.length) return '✅ No allergies are recorded in your profile. If you have any known allergies, please add them in Profile → Edit → Allergies for your safety.';
    return `⚠️ <strong>Your Recorded Allergies:</strong><br><br>${algs.map(a => `• <strong>${a}</strong>`).join('<br>')}<br><br>🚨 <em>Always inform healthcare providers of these allergies before any treatment. Carry your E-SHR Emergency QR for instant access.</em>`;
  }

  if (lower.includes('health tip') || lower.includes('lifestyle')) {
    const tips = [
      '💧 Drink 8-10 glasses of water daily',
      '🏃 30 minutes of moderate exercise 5 days/week',
      '😴 Get 7-9 hours of quality sleep',
      '🥦 Eat 5 servings of fruits and vegetables daily',
      '🧘 Practice mindfulness or meditation for stress',
      '🚭 Avoid smoking and limit alcohol',
      '☀️ Get sunlight for Vitamin D (10-15 min/day)',
      '🩺 Annual health check-ups even if feeling well',
    ];
    return `💪 <strong>Personalized Health Tips:</strong><br><br>${tips.join('<br>')}<br><br><em>Based on your profile, maintaining healthy blood pressure and weight is key at age ${u?.age || 'your'}.</em>`;
  }

  if (lower.includes('cbc') || lower.includes('blood test')) {
    return `🔬 <strong>CBC (Complete Blood Count) Guide:</strong><br><br>
• <strong>Hemoglobin:</strong> Normal is 12-17 g/dL (women lower end, men higher end)<br>
• <strong>WBC:</strong> 4,000-11,000 cells/μL (elevated = possible infection)<br>
• <strong>Platelets:</strong> 150,000-400,000/μL<br>
• <strong>RBC:</strong> 4.5-5.5 million/μL<br><br>
📌 <em>Values outside normal range don't always indicate disease — context matters. Consult your doctor for interpretation.</em>`;
  }

  if (lower.includes('prescription') || lower.includes('medicine') || lower.includes('medication')) {
    const rxs = u?.prescriptions || [];
    if (!rxs.length) return '💊 No prescriptions found in your record. When your doctor issues one through E-SHR, it will appear in your Prescriptions section.';
    const latest = rxs[rxs.length - 1];
    return `💊 <strong>Your Latest Prescription (${formatDate(latest.date)}):</strong><br><br>
From: ${latest.doctor || 'Doctor'}<br>
${(latest.medicines || []).map(m => `• ${m.name} — ${m.dosage} ${m.frequency} for ${m.duration} (${m.timing})`).join('<br>')}
${latest.notes ? `<br><br>📝 Notes: ${latest.notes}` : ''}`;
  }

  if (lower.includes('emergency') || lower.includes('help')) {
    return `🚨 <strong>Emergency Guidance:</strong><br><br>
🔴 <strong>Call 112</strong> (National Emergency) immediately<br>
🏥 <strong>AIIMS Helpline:</strong> 011-26593308<br>
💊 <strong>Poison Control:</strong> 1800-180-1104<br><br>
Your <strong>Emergency QR Code</strong> in the app gives paramedics instant access to your blood group, allergies, and emergency contacts without needing login.<br><br>
<em>Always ensure your emergency contacts are updated in Profile.</em>`;
  }

  // Generic fallback responses
  const responses = [
    `I understand you're asking about "${msg}". Based on your health profile, I recommend consulting your doctor for personalized advice. I can help with blood group info, allergy management, medication guidance, and general health tips.`,
    `That's a great health question! For "${msg}" — in general medical practice, it's important to maintain regular check-ups and keep your health records updated. Your E-SHR profile helps doctors provide better care.`,
    `For accurate advice on "${msg}", I'd recommend discussing with your healthcare provider. I can see your health summary — would you like me to explain your blood group, allergies, or recent prescriptions?`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
