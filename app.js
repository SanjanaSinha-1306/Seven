const SYSTEM_PERSONAS = {
    nerd: "Persona: Tech Geek + K-Drama Fanboy. Mode: Encoded. Hinglish. Slang: 'Bhai', 'Aigoo', 'System hang'. Mix tech with 'Daebak'. Short talk default.",
    smart: "Persona: Cold Sunbae (Topper). Mode: Encoded. Smart Hinglish. Direct, logical, slightly arrogant like a K-Drama lead. Phrases: 'Arasso?', 'Logic'.",
    romantic: "Persona: Soft Oppa. Mode: Encoded. Poetic Hinglish. Emojis ❤️. Uses 'Saranghae', 'Ishq'. Romantic but protective tone.",
    sarcastic: "Persona: Savage Chaebol Heir. Mode: Encoded. Roast in Hinglish. Slang: 'Chaman', 'Yah!', 'Overacting'. Be witty and rich-coded.",
    gamer: "Persona: E-sports Pro. Mode: Encoded. High energy. Slang: 'OP', 'Clutch', 'Fighting!'. English default, Hinglish switch.",
    mystic: "Persona: Wise Ajusshi. Mode: Encoded. Spiritual & Calm. Words: 'Shanti', 'Karma', 'Fate'. Deep but short wisdom.",
    hype: "Persona: Gally Boy + Idol energy. ALL CAPS. Slang: 'Bawa', 'Ek number', 'Chincha?!'. High energy."
};

let state = { chats: [], activeChatId: null, activePersona: 'smart', editingIndex: null, searchTerm: '' };

const save = () => localStorage.setItem('seven_vibe_kfixed', JSON.stringify(state));
const load = () => { const raw = localStorage.getItem('seven_vibe_kfixed'); if (raw) state = JSON.parse(raw); };

document.addEventListener("DOMContentLoaded", () => {
    load(); renderThreads(); updateUI();
    if (window.lucide) lucide.createIcons();
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
        const res = await fetch("/api/chat", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "system", content: `${SYSTEM_PERSONAS[state.activePersona]} Rule: English default.and keep english as not asked or they talked Hinglish if user uses Hindi. Short talk. Long only for deep talk use emoji little sometime.` }, ...chat.history]
            })
        });
        const data = await res.json();
        chat.history.push({ role: 'model', content: data.choices[0].message.content });
    } catch (err) {
        chat.history.push({ role: 'model', content: "Mianhae, server hang ho gaya! 💀" });
    }

    updateUI(false); save(); renderThreads();
}

function updateUI(isTyping = false) {
    const v = document.getElementById('chat-messages-viewport');
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat || chat.history.length === 0) {
        v.innerHTML = `<div class="h-full flex items-center justify-center opacity-10"><h2 class="text-5xl font-black fused-text">HOW YOU DOIN'?</h2></div>`;
        return;
    }
    v.innerHTML = chat.history.map((m, i) => `
        <div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 group relative">
            <div class="p-4 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-neonPurple text-white' : 'bg-white/5 border border-white/10'}">
                ${m.content}
            </div>
            ${m.role === 'user' ? `<button onclick="triggerEdit(${i})" class="absolute -bottom-5 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-neonSky">Edit</button>` : ''}
        </div>
    `).join('') + (isTyping ? `<div class="text-neonSky text-[10px] animate-pulse">WRITING...</div>` : '');
    v.scrollTop = v.scrollHeight;
}

function renderThreads() {
    const container = document.getElementById('chat-threads-container');
    const filtered = state.chats.filter(c => (c.title || "").toLowerCase().includes(state.searchTerm));
    container.innerHTML = filtered.map(c => `
        <div onclick="switchChat('${c.id}')" class="p-3 rounded-xl border mb-2 cursor-pointer transition-all ${c.id === state.activeChatId ? 'border-neonPurple bg-neonPurple/10' : 'border-white/5 hover:bg-white/5'}">
            <div class="flex justify-between items-center"><span class="text-[11px] truncate w-40">${c.title || 'New Session'}</span>
            <button onclick="deleteChat('${c.id}', event)" class="text-slate-600 hover:text-red-500"><i data-lucide="trash-2" class="w-3 h-3"></i></button></div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

function setPersona(p) {
    state.activePersona = p;
    document.querySelectorAll('.persona-btn').forEach(b => b.className = "persona-btn p-2 border border-white/10 rounded-lg text-[9px] uppercase");
    document.getElementById(`btn-${p}`).className = "persona-btn p-2 border border-neonSky text-neonSky bg-white/5 rounded-lg text-[9px] uppercase";
}

function triggerEdit(i) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    document.getElementById('chat-message-payload').value = chat.history[i].content;
    state.editingIndex = i;
}

function createNewChat() {
    const id = Date.now().toString();
    state.chats.unshift({ id, title: "", history: [] });
    state.activeChatId = id;
    renderThreads(); updateUI();
}

function switchChat(id) { state.activeChatId = id; updateUI(); renderThreads(); if(window.innerWidth < 768) toggleSidebar(); }
function deleteChat(id, e) { e.stopPropagation(); state.chats = state.chats.filter(c => c.id !== id); if (state.activeChatId === id) state.activeChatId = null; renderThreads(); updateUI(); save(); }