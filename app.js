const SYSTEM_PERSONAS = {
    nerd: "Persona: Tech Geek. Mix Hinglish. Slang: 'Bhai', 'Sorted'. Use emojis. Friendly.",
    smart: "Persona: Logical Topper. Mix Hinglish. Short replies. English default.",
    romantic: "Persona: Bollywood lover. Poetic. Use Shayari vibes. Emojis ❤️.",
    sarcastic: "Persona: Savage Roaster. Slang: 'Beta', 'Chaman'. Be witty.",
    gamer: "Persona: Streamer. Slang: 'OP', 'Clutch'. High energy.",
    mystic: "Persona: Calm Guru. Spiritual. Peace vibes.",
    hype: "Persona: Hype Man. Energy 100%. ALL CAPS."
};

let state = {
    chats: [],
    activeChatId: null,
    activePersona: 'smart',
    editingIndex: null
};

const save = () => localStorage.setItem('seven_final_pro', JSON.stringify(state));
const load = () => {
    const raw = localStorage.getItem('seven_final_pro');
    if (raw) state = JSON.parse(raw);
};

document.addEventListener("DOMContentLoaded", () => {
    load();
    renderThreads();
    updateUI();
    if (window.lucide) lucide.createIcons();
});

function toggleSidebar() {
    document.getElementById('main-sidebar').classList.toggle('open');
}

async function handleMessageSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-message-payload');
    const val = input.value.trim();
    if (!val) return;

    if (!state.activeChatId) createNewChat();
    const chat = state.chats.find(c => c.id === state.activeChatId);

    if (state.editingIndex !== null) {
        // Logic: Replace message and delete subsequent history
        chat.history[state.editingIndex].content = val;
        chat.history = chat.history.slice(0, state.editingIndex + 1);
        state.editingIndex = null;
    } else {
        if (chat.history.length === 0) {
            chat.title = val.substring(0, 25);
            chat.personaLabel = state.activePersona;
        }
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
                        content: `${SYSTEM_PERSONAS[state.activePersona]} RULE: Speak English by default. If user speaks Hindi, switch to Hindi. Keep it short. Mix in a few emojis.` 
                    },
                    ...chat.history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }))
                ]
            })
        });
        const data = await res.json();
        chat.history.push({ role: 'model', content: data.choices[0].message.content });
    } catch (err) {
        chat.history.push({ role: 'model', content: "Server down hai bhai, try again. 💀" });
    }

    updateUI(false);
    save();
    renderThreads();
}

function updateUI(isTyping = false) {
    const v = document.getElementById('chat-messages-viewport');
    const chat = state.chats.find(c => c.id === state.activeChatId);

    if (!chat || chat.history.length === 0) {
        v.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center opacity-20 select-none">
                <h2 class="text-4xl md:text-5xl font-black fused-text mb-2">HOW YOU DOIN?</h2>
                <p class="text-[9px] tracking-[0.3em] uppercase">Choose a vibe and start the flow</p>
            </div>`;
        return;
    }

    v.innerHTML = chat.history.map((m, i) => `
        <div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-8 group relative">
            <div class="p-4 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-neonPurple border border-neonPurple/40 text-white' : 'bg-white/5 border border-white/10'}">
                ${m.content}
            </div>
            ${m.role === 'user' ? `
                <button onclick="triggerEdit(${i})" class="absolute -bottom-6 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-500 hover:text-white flex items-center gap-1">
                    <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
                </button>` : ''}
        </div>
    `).join('') + (isTyping ? `<div class="text-neonSky text-[10px] animate-pulse font-bold tracking-widest">THINKING...</div>` : '');

    v.scrollTop = v.scrollHeight;
    if (window.lucide) lucide.createIcons();
}

function renderThreads() {
    const container = document.getElementById('chat-threads-container');
    container.innerHTML = state.chats.map(c => `
        <div onclick="switchChat('${c.id}')" class="group p-3 rounded-xl border transition-all cursor-pointer ${c.id === state.activeChatId ? 'border-neonPurple bg-neonPurple/10' : 'border-white/5 hover:bg-white/5'}">
            <div class="flex justify-between items-start">
                <span class="text-[11px] font-medium truncate w-40">${c.title || 'New Session'}</span>
                <button onclick="deleteChat('${c.id}', event)" class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-opacity">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
            </div>
            <span class="text-[9px] uppercase tracking-widest text-neonSky font-bold mt-1 block">${c.personaLabel || state.activePersona}</span>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

function triggerEdit(i) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    document.getElementById('chat-message-payload').value = chat.history[i].content;
    document.getElementById('chat-message-payload').focus();
    state.editingIndex = i;
}

function setPersona(p) {
    state.activePersona = p;
    document.querySelectorAll('.persona-btn').forEach(b => b.className = "persona-btn p-2 border border-white/10 rounded-lg text-[10px]");
    document.getElementById(`btn-${p}`).className = "persona-btn p-2 border border-neonSky text-neonSky bg-white/5 rounded-lg text-[10px]";
}

function createNewChat() {
    const id = Date.now().toString();
    state.chats.unshift({ id, title: "", personaLabel: state.activePersona, history: [] });
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