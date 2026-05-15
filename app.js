const SYSTEM_PERSONAS = {
    nerd: "Persona: Indian Tech Geek. Language: Hinglish. Slang: 'Bhai', 'System hang', 'Sorted hai'. Tone: Helpful but slightly nerdy.",
    smart: "Persona: The 'Topper' friend. Language: Smart Hinglish. Logical but talks like a local. Phrases: 'Samajh gaya', 'Bilkul'.",
    romantic: "Persona: Bollywood Lover. Language: Poetic Hinglish. Shayari vibes. Words: 'Ishq', 'Dil se', 'Pyaar'.",
    sarcastic: "Persona: Dilli/Mumbai Roaster. Language: Savage Hinglish. Slang: 'Chaman', 'Beta', 'Overacting mat kar'.",
    gamer: "Persona: Indian Streamer. Language: Gamer Hinglish. Slang: 'OP bolte', 'Clutch god'.",
    mystic: "Persona: Desi Guru. Language: Calm Hinglish. Spiritual. Words: 'Shanti', 'Karma', 'Vibe check'.",
    hype: "Persona: Gally Boy Hype Man. Language: High energy Hinglish. Slang: 'Bawa', 'Ek number'. ALL CAPS."
};

let state = {
    chats: [],
    activeChatId: null,
    activePersona: 'smart',
    editingIndex: null
};

const save = () => localStorage.setItem('seven_final_vibe', JSON.stringify(state));
const load = () => {
    const raw = localStorage.getItem('seven_final_vibe');
    if (raw) state = JSON.parse(raw);
};

document.addEventListener("DOMContentLoaded", () => {
    load();
    renderThreads();
    updateUI();
    if (window.lucide) lucide.createIcons();
});

function toggleSidebar() {
    document.getElementById('main-sidebar').classList.toggle('-translate-x-full');
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-message-payload');
    const val = input.value.trim();
    if (!val) return;

    if (!state.activeChatId) createNewChat();
    const chat = state.chats.find(c => c.id === state.activeChatId);

    if (state.editingIndex !== null) {
        // Logic: Replace message and delete everything after it
        chat.history[state.editingIndex].content = val;
        chat.history = chat.history.slice(0, state.editingIndex + 1);
        state.editingIndex = null;
    } else {
        if (chat.history.length === 0) chat.title = val.substring(0, 20);
        chat.history.push({ role: 'user', content: val });
    }

    input.value = '';
    updateUI(true);

    try {
        const res = await fetch("/api/chat", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { 
                        role: "system", 
                        content: `${SYSTEM_PERSONAS[state.activePersona]} RULE: Talk like a real Indian friend. Mix English and Hindi. Keep it short. If user talks in Hindi, reply in Hindi, otherwise English.` 
                    },
                    ...chat.history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }))
                ]
            })
        });
        const data = await res.json();
        chat.history.push({ role: 'model', content: data.choices[0].message.content });
    } catch (err) {
        chat.history.push({ role: 'model', content: "Bhai, server down lag raha hai. Check kar." });
    }

    updateUI(false);
    save();
}

function updateUI(isTyping = false) {
    const v = document.getElementById('chat-messages-viewport');
    const chat = state.chats.find(c => c.id === state.activeChatId);

    if (!chat || chat.history.length === 0) {
        v.innerHTML = `<div class="h-full flex items-center justify-center opacity-20"><h2 class="text-4xl font-black fused-text uppercase">KYA HAAL HAI?</h2></div>`;
        return;
    }

    v.innerHTML = chat.history.map((m, i) => `
        <div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-8 group">
            <div class="relative p-4 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-neonPurple/10 border border-neonPurple/30 text-neonPurple' : 'bg-white/5 border border-white/10'}">
                ${m.content}
                <div class="flex gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${m.role === 'user' ? `<button onclick="triggerEdit(${i})" class="text-[9px] text-neonSky font-bold uppercase">Edit</button>` : ''}
                    <button onclick="deleteMsg(${i})" class="text-[9px] text-red-500 font-bold uppercase">Delete</button>
                </div>
            </div>
        </div>
    `).join('') + (isTyping ? `<div class="text-neonSky text-[10px] animate-pulse">VIBING...</div>` : '');

    v.scrollTop = v.scrollHeight;
}

function triggerEdit(i) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    document.getElementById('chat-message-payload').value = chat.history[i].content;
    document.getElementById('chat-message-payload').focus();
    state.editingIndex = i;
}

function deleteMsg(i) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    chat.history.splice(i, 1);
    save();
    updateUI();
}

function setPersona(p) {
    state.activePersona = p;
    document.querySelectorAll('.persona-btn').forEach(b => b.className = "persona-btn p-2 border border-white/10 rounded-lg text-[10px]");
    document.getElementById(`btn-${p}`).className = "persona-btn p-2 border border-neonSky text-neonSky bg-white/5 rounded-lg text-[10px]";
}

function renderThreads() {
    const container = document.getElementById('chat-threads-container');
    container.innerHTML = state.chats.map(c => `
        <div onclick="switchChat('${c.id}')" class="p-3 rounded-xl border mb-2 cursor-pointer ${c.id === state.activeChatId ? 'border-neonPurple bg-neonPurple/5' : 'border-white/5'} flex justify-between items-center">
            <span class="text-[11px] truncate w-40">${c.title}</span>
            <button onclick="deleteChat('${c.id}', event)"><i data-lucide="trash-2" class="w-3 h-3 text-red-500"></i></button>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

function createNewChat() {
    const id = Date.now().toString();
    state.chats.unshift({ id, title: "New Session", history: [] });
    state.activeChatId = id;
    renderThreads();
    updateUI();
    if(window.innerWidth < 768) toggleSidebar();
}

function switchChat(id) { state.activeChatId = id; updateUI(); renderThreads(); if(window.innerWidth < 768) toggleSidebar(); }

function deleteChat(id, e) {
    e.stopPropagation();
    state.chats = state.chats.filter(c => c.id !== id);
    if (state.activeChatId === id) state.activeChatId = null;
    renderThreads(); updateUI(); save();
}