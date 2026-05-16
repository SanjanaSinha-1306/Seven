const SYSTEM_PERSONAS = {
    nerd: "Persona: Passionate Tech Geek + Pop Culture Expert. Clean, intelligent modern Hinglish conversational tone. Slang: 'Bhai', 'System hang', 'Next level logic'. Talk tech intuitively with deep excitement. No forced dramatic language or cringey expressions. Keep responses brief.",
    smart: "Persona: Analytical intellectual topper. Pragmatic, highly logical, straightforward, and composed. Uses crisp modern tech terms mixed with direct, mature Hinglish. Straightforward, short, direct talk.",
    romantic: "Persona: Calm, deeply empathetic, poetic conversationalist. Uses smooth and comfortable modern Hinglish. Warm, expressive, protective, but mature and clean. Deep but highly concise.",
    sarcastic: "Persona: Witty, sharp, highly satirical realist. Roasts constructively with smart, fast-paced Hinglish. Sassy but deeply intelligent, clear, and entertaining without being overactive.",
    gamer: "Persona: Competitive E-sports Pro player. Ultra high-energy mindset. Slang: 'OP', 'Clutch', 'Choke', 'GG'. Casual developer chat style.",
    mystic: "Persona: Deep philosopher. Calm, observational, grounded cosmic logic. Words: 'Karma', 'Fate', 'Destiny'. Short, high-impact responses.",
    hype: "Persona: High energy street-smart catalyst. ALL CAPS responses. Slang: 'Bawa', 'Ek number', 'Hard check'. Maximum motivation and hype."
};

const PERSONA_LABELS = {
    nerd: "🤓 Nerd",
    smart: "🧠 Smart",
    romantic: "❤️ Romantic",
    sarcastic: "🙄 Sarcastic",
    gamer: "🎮 Gamer",
    mystic: "🔮 Mystic",
    hype: "🔥 Hype"
};

let state = { chats: [], activeChatId: null, activePersona: 'smart', editingIndex: null, searchTerm: '' };

const save = () => localStorage.setItem('seven_vibe_kfixed', JSON.stringify(state));
const load = () => { const raw = localStorage.getItem('seven_vibe_kfixed'); if (raw) state = JSON.parse(raw); };

document.addEventListener("DOMContentLoaded", () => {
    load(); renderThreads(); updateUI();
    if (window.lucide) lucide.createIcons();

    // Automated 2.5 second splash fade-out block
    setTimeout(() => {
        const splash = document.getElementById('app-splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 500);
        }
    }, 2500);
});

function toggleSidebar() { document.getElementById('main-sidebar').classList.toggle('open'); }
function handleSearch(q) { state.searchTerm = q.toLowerCase(); renderThreads(); }

async function handleMessageSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-message-payload');
    const val = input.value.trim();
    if (!val) return;

    if (!state.activeChatId) createNewChat();
    const chat = state.chats.find(c => c.id === state.activeChatId);

    // Securely tie the active persona selection to this chat session permanently
    if (!chat.personaUsed) {
        chat.personaUsed = state.activePersona;
    }

    if (state.editingIndex !== null) {
        chat.history[state.editingIndex].content = val;
        chat.history = chat.history.slice(0, state.editingIndex + 1);
        state.editingIndex = null;
    } else {
        if (chat.history.length === 0) chat.title = val.substring(0, 25);
        chat.history.push({ role: 'user', content: val });
    }

    input.value = '';
    updateUI(true);

    try {
        const targetPersona = chat.personaUsed || state.activePersona;
        const res = await fetch("/api/chat", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { 
                        role: "system", 
                        content: `${SYSTEM_PERSONAS[targetPersona]} STRICT RULE: Respond in full English by default. Only switch to natural Hinglish if the user asks a question in Hindi. Keep responses precise, short, and to the point.` 
                    }, 
                    ...chat.history
                ]
            })
        });
        const data = await res.json();
        chat.history.push({ role: 'model', content: data.choices[0].message.content });
    } catch (err) {
        chat.history.push({ role: 'model', content: "Connection reset. Let's try sending that response again! ⚡" });
    }

    updateUI(false); save(); renderThreads();
}

function updateUI(isTyping = false) {
    const v = document.getElementById('chat-messages-viewport');
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat || chat.history.length === 0) {
        v.innerHTML = `<div class="h-full w-full flex items-center justify-center opacity-10 my-auto select-none"><h2 class="text-4xl md:text-5xl font-black fused-text text-center tracking-wider">HOW YOU DOIN'?</h2></div>`;
        return;
    }
    v.innerHTML = chat.history.map((m, i) => `
        <div class="flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 group relative animate-fadeIn">
            <div class="p-4 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-neonPurple text-white' : 'bg-white/5 border border-white/10 text-slate-200'}">
                ${m.content}
            </div>
            ${m.role === 'user' ? `<button onclick="triggerEdit(${i})" class="absolute -bottom-5 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-neonSky transition-all">Edit</button>` : ''}
        </div>
    `).join('') + (isTyping ? `<div class="text-neonSky text-[10px] font-bold tracking-widest uppercase animate-pulse">Typing...</div>` : '');
    v.scrollTop = v.scrollHeight;
}

function renderThreads() {
    const container = document.getElementById('chat-threads-container');
    const filtered = state.chats.filter(c => (c.title || "").toLowerCase().includes(state.searchTerm));
    container.innerHTML = filtered.map(c => {
        const badge = PERSONA_LABELS[c.personaUsed || 'smart'];
        return `
            <div onclick="switchChat('${c.id}')" class="p-3 rounded-xl border mb-2 cursor-pointer transition-all ${c.id === state.activeChatId ? 'border-neonPurple bg-neonPurple/10' : 'border-white/5 hover:bg-white/5'}">
                <div class="flex justify-between items-center">
                    <div class="flex flex-col truncate pr-2">
                        <span class="text-[11px] truncate w-36 font-medium text-slate-200">${c.title || 'New Session'}</span>
                        <span class="text-[9px] text-neonSky font-semibold tracking-wider mt-0.5">${badge}</span>
                    </div>
                    <button onclick="deleteChat('${c.id}', event)" class="text-slate-600 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function setPersona(p) {
    state.activePersona = p;
    document.querySelectorAll('.persona-btn').forEach(b => b.className = "persona-btn p-2 border border-white/10 rounded-lg text-[9px] uppercase text-slate-400");
    document.getElementById(`btn-${p}`).className = "persona-btn p-2 border border-neonSky text-neonSky bg-white/5 rounded-lg text-[9px] uppercase font-bold";
}

function triggerEdit(i) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    document.getElementById('chat-message-payload').value = chat.history[i].content;
    state.editingIndex = i;
}

function createNewChat() {
    const id = Date.now().toString();
    state.chats.unshift({ id, title: "", history: [], personaUsed: state.activePersona });
    state.activeChatId = id;
    renderThreads(); updateUI();
}

function switchChat(id) { 
    state.activeChatId = id; 
    const chat = state.chats.find(c => c.id === id);
    if (chat && chat.personaUsed) setPersona(chat.personaUsed);
    updateUI(); 
    renderThreads(); 
    if (window.innerWidth < 768) toggleSidebar(); 
}

function deleteChat(id, e) { e.stopPropagation(); state.chats = state.chats.filter(c => c.id !== id); if (state.activeChatId === id) state.activeChatId = null; renderThreads(); updateUI(); save(); }