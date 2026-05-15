/**
 * SEVEN AI - Core Logic
 * Custom persona-driven AI chat interface
 */

const SYSTEM_PERSONAS = {
    nerd: "Persona: Indian Tech Geek. Language: Hinglish. Slang: 'Bhai', 'System hang', 'Sorted hai'. Tone: Helpful but slightly nerdy. Use 'Yaar' often.",
    smart: "Persona: The 'Topper' friend. Language: Smart Hinglish. Logical but talks like a local. Use phrases like 'Samajh gaya' or 'Bilkul'.",
    romantic: "Persona: Bollywood Lover. Language: Poetic Hinglish. Use 'Shayari' vibes. Words like 'Ishq', 'Dil se', 'Pyaar'. Very sweet and dramatic.",
    sarcastic: "Persona: Dilli/Mumbai Roaster. Language: Savage Hinglish. Slang: 'Chaman', 'Beta', 'Overacting mat kar'. Short, witty, and slightly rude.",
    gamer: "Persona: Indian Streamer. Language: Gamer Hinglish. Slang: 'OP bolte', 'Clutch god', 'Lag ho raha hai'. High energy, uses 'Bro' and 'Bhai'.",
    mystic: "Persona: Desi Guru. Language: Calm Hinglish. Spiritual but modern. Words like 'Shanti', 'Karma', 'Vibe check'.",
    hype: "Persona: The 'Gallly Boy' Hype Man. Language: Full energy Hinglish. Slang: 'Bawa', 'Ek number', 'Aag laga di'. ALL CAPS with fire emojis."
};

let state = {
    chats: [],
    activeChatId: null,
    activePersona: 'smart',
    editingMessageIndex: null
};

// Persistence Layer
const save = () => localStorage.setItem('seven_ultra_final', JSON.stringify(state));
const load = () => {
    const raw = localStorage.getItem('seven_ultra_final');
    if (raw) {
        state = JSON.parse(raw);
    }
};

// Application Initialization
document.addEventListener("DOMContentLoaded", () => {
    load();
    if (window.lucide) lucide.createIcons();
    
    // Splash Screen Transition
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) splash.style.opacity = '0';
        setTimeout(() => splash?.remove(), 1000);
        document.getElementById('app-dashboard').classList.replace('opacity-0', 'opacity-100');
    }, 1500);

    renderChatThreads();
    updateChatUIWindow();
});

function toggleSidebar() {
    const side = document.getElementById('main-sidebar');
    side.classList.toggle('-translate-x-full');
}

/**
 * Handle Message Submission
 * Calls the internal /api/chat endpoint to hide secrets
 */
async function handleMessageSubmit(event) {
    event.preventDefault();

    const input = document.getElementById('chat-message-payload');
    const content = input.value.trim();
    if (!content) return;
    
    if (!state.activeChatId) createNewChat();
    const chat = state.chats.find(c => c.id === state.activeChatId);

    // Handle message editing vs new message
    if (state.editingMessageIndex !== null) {
        chat.history[state.editingMessageIndex].content = content;
        chat.history = chat.history.slice(0, state.editingMessageIndex + 1);
        state.editingMessageIndex = null;
    } else {
        if (chat.history.length === 0) chat.title = content.substring(0, 20) + "...";
        chat.history.push({ role: 'user', content });
    }

    input.value = '';
    renderChatThreads();
    updateChatUIWindow(true); // Show typing indicator

    try {
        // PROXY CALL: The frontend calls your own API, which then calls Groq
        const res = await fetch("/api/chat", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                persona: chat.persona,
                messages: [
                    { 
                        role: "system", 
                        content: `${SYSTEM_PERSONAS[chat.persona]} RULE: Mirror user length. Ask a question backTalk like a real Indian person. Mix 70% English with 10-30% Hindi words. Keep it natural, like a WhatsApp chat with a friend.` 
                    },
                    ...chat.history.map(m => ({ 
                        role: m.role === 'model' ? 'assistant' : 'user', 
                        content: m.content 
                    }))
                ]
            })
        });

        if (!res.ok) throw new Error("Server responded with an error.");
        
        const data = await res.json();
        chat.history.push({ role: 'model', content: data.choices[0].message.content });
    } catch (e) {
        console.error("Vibe Error:", e);
        chat.history.push({ 
            role: 'model', 
            content: "The server is currently out of sync. Check your deployment environment variables. 💀" 
        });
    }
    
    updateChatUIWindow(false); 
    save();
}

function updateChatUIWindow(isTyping = false) {
    const v = document.getElementById('chat-messages-viewport');
    const chat = state.chats.find(c => c.id === state.activeChatId);
    
    // Empty State UI
    if (!chat || chat.history.length === 0) {
        v.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                <h2 class="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter fused-text">How's your day?</h2>
                <p class="text-xs uppercase tracking-[0.5em]">Pick a persona and start the flow</p>
            </div>`;
        return;
    }

    // Render Conversation
    v.innerHTML = chat.history.map((m, i) => `
        <div class="flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn mb-10 group">
            <div class="relative p-4 rounded-2xl max-w-[90%] md:max-w-[70%] text-sm ${
                m.role === 'user' 
                ? 'bg-neonPurple/20 border border-neonPurple/40 text-neonPurple shadow-purple-glow' 
                : 'bg-white/5 border border-white/10 text-slate-100'
            }">
                ${m.content}
                ${m.role === 'user' ? `<button onclick="editMessage(${i})" class="absolute -bottom-6 right-0 opacity-0 group-hover:opacity-100 transition-all text-[9px] font-bold text-slate-500 uppercase">Edit</button>` : ''}
            </div>
        </div>
    `).join('') + (isTyping ? `
        <div class="flex justify-start animate-pulse mb-20">
            <div class="p-3 bg-white/5 border border-neonSky/20 rounded-2xl text-[10px] text-neonSky font-bold uppercase tracking-widest">
                Seven is Typing...
            </div>
        </div>` : '<div class="h-32"></div>');

    v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' });
}

function renderChatThreads(filtered = state.chats) {
    const container = document.getElementById('chat-threads-container');
    container.innerHTML = filtered.map(chat => `
        <div onclick="switchChat('${chat.id}')" class="group p-4 rounded-xl border mb-3 cursor-pointer transition-all ${
            chat.id === state.activeChatId ? 'border-neonPurple bg-neonPurple/10 shadow-purple-glow' : 'border-white/5 hover:bg-white/5'
        }">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs truncate font-semibold text-slate-200">${chat.title}</span>
                <button onclick="deleteChat('${chat.id}', event)" class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
            <span class="text-[9px] text-neonPurple uppercase font-black tracking-widest">${chat.persona}</span>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

function deleteChat(id, event) {
    event.stopPropagation();
    state.chats = state.chats.filter(c => c.id !== id);
    if (state.activeChatId === id) state.activeChatId = state.chats[0]?.id || null;
    renderChatThreads();
    updateChatUIWindow();
    save();
}

function editMessage(index) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    document.getElementById('chat-message-payload').value = chat.history[index].content;
    document.getElementById('chat-message-payload').focus();
    state.editingMessageIndex = index;
}

function handleSearch(q) {
    renderChatThreads(state.chats.filter(c => c.title.toLowerCase().includes(q.toLowerCase())));
}

function createNewChat() {
    const id = Date.now().toString();
    state.chats.unshift({ id, title: "New Session", persona: state.activePersona, history: [] });
    state.activeChatId = id;
    renderChatThreads();
    updateChatUIWindow();
    if(window.innerWidth < 768) toggleSidebar(); 
    save();
}

function setPersona(p) {
    state.activePersona = p;
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.className = "persona-btn p-2 border border-white/10 rounded-lg text-[10px] transition-all";
    });
    const activeBtn = document.getElementById(`btn-${p}`);
    if(activeBtn) {
        activeBtn.className = "persona-btn p-2 border border-neonSky bg-white/5 shadow-sky-glow text-neonSky rounded-lg text-[10px]";
    }
}

function switchChat(id) { 
    state.activeChatId = id; 
    renderChatThreads(); 
    updateChatUIWindow(); 
    if(window.innerWidth < 768) toggleSidebar();
}