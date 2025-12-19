
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Globals defined by imported scripts
declare var feather: any;
declare var Chart: any;
declare var marked: any;
declare var L: any; 
declare var firebase: any;

// --- FIREBASE CONFIGURATION (Based on User Screenshots) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Note: API key was not visible in screenshot
    authDomain: "chaveunica-225e0.firebaseapp.com",
    projectId: "chaveunica-225e0",
    storageBucket: "chaveunica-225e0.appspot.com",
    messagingSenderId: "324211037832",
    appId: "1:324211037832:web:c1ad3855609fc4d285b13d"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

// Timer Variables (Indoor)
let workoutTimerInterval: number | null = null;
let workoutStartTime: Date | null = null;

// Outdoor Tracking Variables
let map: any = null;
let mapPolyline: any = null;
let trackingPath: any[] = [];
let trackingWatchId: number | null = null;
let trackingTimerInterval: number | null = null;
let trackingStartTime: number = 0;
let trackingElapsedTime: number = 0; // ms
let trackingDistance: number = 0; // meters
let isTrackingPaused: boolean = false;
let currentActivityType: string = "";

let currentCalendarDate = new Date(); // Track calendar state

// --- FINISH WORKOUT STATE ---
let tempWorkoutData: any = {};
let tempWorkoutImage: string | null = null;

// --- AI CHAT STATE ---
let chatSession: Chat | null = null;
const CHAT_SYSTEM_INSTRUCTION = `Você é o coach virtual da ABFIT, uma assessoria esportiva de alta performance fundada por André Brito.
Seu nome é AB Coach.
Seu objetivo é ajudar os alunos com dúvidas sobre:
1. Execução de exercícios (dê dicas técnicas).
2. Nutrição e suplementação (dicas gerais, não prescrição médica).
3. Motivação e disciplina.
4. Explicação sobre periodização de treino.

Personalidade:
- Energético, motivador e profissional.
- Use emojis relacionados a esporte (💪, 🏋️, 🔥).
- Respostas concisas e fáceis de ler no celular.
- Se não souber, diga que vai consultar o André Brito.`;

// --- FOOTER CONTENT ---
const footerContent: any = {
    'sobre': { title: 'Sobre a ABFIT', body: `<p><strong>Missão:</strong> Transformar vidas através do movimento consciente e da ciência do treinamento físico.</p>` },
    'carreiras': { title: 'Carreiras', body: `<p>Estamos sempre em busca de profissionais apaixonados por saúde e performance.</p>` },
    'imprensa': { title: 'Imprensa', body: `<p>Bem-vindo à sala de imprensa da ABFIT.</p>` },
    'fale': { title: 'Fale Conosco', body: `<p>Tem alguma dúvida? britodeandrade@gmail.com</p>` },
    'suporte': { title: 'Suporte Técnico', body: `<p>Encontrou algum problema no app?</p>` },
    'privacidade': { title: 'Política de Privacidade', body: `<p>A ABFIT leva sua privacidade a sério.</p>` },
    'termos': { title: 'Termos de Uso', body: `<p>Ao utilizar o aplicativo ABFIT, você concorda com os seguintes termos.</p>` }
};

// --- DATABASE ---
const defaultDatabase = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg' },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'marcelly.jpg' }
    ],
    trainingPlans: { treinosA: {}, treinosB: {}, periodizacao: {} },
    userRunningWorkouts: {},
    completedWorkouts: {}, 
    raceCalendar: []
};

const STORAGE_KEYS = { DATABASE: 'abfit_database_v8', CURRENT_USER: 'abfit_current_user' };

function getDatabase() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    return saved ? JSON.parse(saved) : defaultDatabase;
}

function saveDatabase(db: any) { localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db)); }
function getCurrentUser() { return localStorage.getItem(STORAGE_KEYS.CURRENT_USER); }
function setCurrentUser(email: string) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email); }

function formatDate(d: Date) { return d.toLocaleDateString('pt-BR'); }

function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function calculatePace(ms: number, meters: number) {
    if (meters === 0) return "--:--";
    const km = meters / 1000;
    const paceDec = (ms / 1000 / 60) / km;
    const paceMin = Math.floor(paceDec);
    const paceSec = Math.floor((paceDec - paceMin) * 60).toString().padStart(2, '0');
    return `${paceMin}:${paceSec}`;
}

function initializeDatabase() {
    try {
        const db = getDatabase();
        const usersToInit = ['britodeandrade@gmail.com', 'marcellybispo92@gmail.com'];
        
        usersToInit.forEach(email => {
            if (!db.trainingPlans.treinosA[email]) db.trainingPlans.treinosA[email] = [];
            if (!db.trainingPlans.treinosB[email]) db.trainingPlans.treinosB[email] = [];

            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            
            // Dynamic Dates calculation
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            const currentDay = today.getDay();
            const lastTuesday = new Date(today);
            const diffToTuesday = (currentDay >= 2) ? (currentDay - 2) : (currentDay + 5);
            lastTuesday.setDate(today.getDate() - diffToTuesday);

            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const tuesdayStr = lastTuesday.toISOString().split('T')[0];

            const historyData = [
                { date: `${y}-${m}-08`, type: 'Treino A', duration: '50 min', timestamp: new Date(`${y}-${m}-08T10:00:00`).getTime().toString() },
                { date: `${y}-${m}-09`, type: 'Treino B', duration: '50 min', timestamp: new Date(`${y}-${m}-09T10:00:00`).getTime().toString() },
                { date: `${y}-${m}-10`, type: 'Treino A', duration: '37 min', timestamp: new Date(`${y}-${m}-10T10:00:00`).getTime().toString() },
                { date: tuesdayStr, type: 'Treino B', duration: '50 min', timestamp: lastTuesday.getTime().toString() },
                { date: yesterdayStr, type: 'Treino A', duration: '40 min', timestamp: yesterday.getTime().toString() }
            ];

            if (!db.completedWorkouts[email]) db.completedWorkouts[email] = [];
            
            historyData.forEach(item => {
                const exists = db.completedWorkouts[email].some((w:any) => w.date === item.date && w.type === item.type);
                if (!exists) {
                    db.completedWorkouts[email].push(item);
                }
            });
        });
        
        saveDatabase(db);
    } catch (e) { console.error("Initialization error:", e); }
}

async function loadAIAnalysisScreen() {
    const screen = document.getElementById('aiAnalysisScreen');
    if (!screen) return;
    screen.innerHTML = `
        <div class="flex flex-col h-full bg-gray-900 relative">
            <div class="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur border-b border-gray-700 shadow-lg z-20">
                <button onclick="showScreen('studentProfileScreen')" class="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"><i data-feather="arrow-left"></i></button>
                <div class="flex flex-col items-center"><h2 class="text-lg font-black text-white italic tracking-wide flex items-center gap-2">ABFIT <span class="text-teal-400">AI</span></h2></div>
                <div class="w-8"></div>
            </div>
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 pb-32 scroll-smooth"></div>
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 z-20 pb-8">
                <form onsubmit="handleChatSubmit(event)" class="flex gap-2 items-end">
                    <input type="text" id="chat-input" class="flex-1 bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-teal-500" placeholder="Digite sua dúvida...">
                    <button type="submit" class="bg-teal-500 text-gray-900 font-bold p-3 rounded-xl"><i data-feather="send"></i></button>
                </form>
            </div>
        </div>
    `;
    if (typeof feather !== 'undefined') feather.replace();
    showScreen('aiAnalysisScreen');
    if (!chatSession) {
        // Initialize GoogleGenAI with API Key
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatSession = ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: CHAT_SYSTEM_INSTRUCTION } });
    }
}

(window as any).handleChatSubmit = async (e: Event) => {
    e.preventDefault();
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const msg = input.value.trim();
    if (!msg || !chatSession) return;
    input.value = '';
    const container = document.getElementById('chat-messages');
    if (container) {
        const userDiv = document.createElement('div');
        userDiv.className = 'flex justify-end';
        userDiv.innerHTML = `<div class="bg-teal-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-md"><p class="text-sm">${msg}</p></div>`;
        container.appendChild(userDiv);
        container.scrollTo(0, container.scrollHeight);
        
        // Use chatSession to send message and get response
        const response: GenerateContentResponse = await chatSession.sendMessage({ message: msg });
        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex justify-start';
        // Extract text from GenerateContentResponse
        aiDiv.innerHTML = `<div class="bg-gray-800 text-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm border border-gray-700">${marked.parse(response.text)}</div>`;
        container.appendChild(aiDiv);
        container.scrollTo(0, container.scrollHeight);
    }
};

function showScreen(screenId: string) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => { s.classList.remove('active'); (s as HTMLElement).style.display = 'none'; });
    const target = document.getElementById(screenId);
    if (target) { target.classList.add('active'); (target as HTMLElement).style.display = 'block'; }
    window.scrollTo(0, 0);
}

function renderTrainingHistory(email: string) {
    const historyContainer = document.getElementById('training-history-container');
    if (!historyContainer) return;
    const db = getDatabase();
    let history = db.completedWorkouts?.[email] || [];
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    // ORDENAÇÃO CRESCENTE (Do mais antigo para o mais novo)
    const monthlyHistory = history.filter((h: any) => h.date.startsWith(monthPrefix))
                                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (monthlyHistory.length === 0) {
        historyContainer.innerHTML = '<p class="text-gray-400 text-center text-sm mt-4">Nenhum histórico neste mês.</p>';
        return;
    }

    let html = '<h3 class="text-lg font-bold text-white mb-3 px-1">Histórico Recente</h3><div class="space-y-2">';
    monthlyHistory.forEach((item: any) => {
        const dateObj = new Date(item.date + 'T00:00:00');
        const day = String(dateObj.getDate()).padStart(2, '0');
        html += `<div onclick="openHistoryDetail('${item.timestamp}')" class="flex items-center justify-between bg-gray-800/80 p-3 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-700 transition"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-gray-700 rounded-lg flex flex-col items-center justify-center border border-gray-600 relative overflow-hidden">${item.photo ? `<img src="${item.photo}" class="absolute inset-0 w-full h-full object-cover opacity-60">` : ''}<span class="text-xs text-gray-400 uppercase font-bold z-10 drop-shadow-md">DIA</span><span class="text-lg font-bold text-white leading-none z-10 drop-shadow-md">${day}</span></div><div><p class="text-white font-bold text-sm">${item.type}</p><div class="flex items-center gap-1"><i data-feather="check-circle" class="w-3 h-3 text-green-500"></i><span class="text-xs text-green-400 font-medium">Concluído</span></div></div></div><div class="text-right"><p class="text-xs text-gray-400 font-bold uppercase mb-0.5">Tempo</p><p class="text-white font-bold font-mono bg-gray-900/50 px-2 py-1 rounded text-xs border border-gray-600">${item.duration}</p></div></div>`;
    });
    html += '</div>';
    historyContainer.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
}

// Add missing renderCalendar function to fix error
function renderCalendar(date: Date) {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-year');
    if (!grid || !label) return;
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    label.textContent = `${monthNames[month]} ${year}`;
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { 
        const empty = document.createElement('div'); 
        empty.className = 'calendar-day opacity-0 pointer-events-none'; 
        grid.appendChild(empty); 
    }
    const db = getDatabase();
    const email = getCurrentUser();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day transition-all hover:bg-gray-700 cursor-default';
        cell.textContent = d.toString();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) cell.classList.add('today');
        if (db.trainingPlans && email) {
            let hasA = db.trainingPlans.treinosA?.[email]?.some((ex: any) => ex.checkIns && ex.checkIns.includes(dateStr));
            let hasB = db.trainingPlans.treinosB?.[email]?.some((ex: any) => ex.checkIns && ex.checkIns.includes(dateStr));
            if (hasA && hasB) cell.classList.add('treino-A-B-completed');
            else if (hasA) cell.classList.add('treino-A-completed');
            else if (hasB) cell.classList.add('treino-B-completed');
        }
        grid.appendChild(cell);
    }
    if (email) renderTrainingHistory(email);
}

// Add missing openHistoryDetail function
(window as any).openHistoryDetail = (timestamp: string) => {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;
    const item = db.completedWorkouts?.[email]?.find((x: any) => x.timestamp === timestamp || x.date === timestamp);
    if (item) {
        const typeEl = document.getElementById('history-modal-type');
        const dateEl = document.getElementById('history-modal-date');
        const durationEl = document.getElementById('history-modal-duration');
        if (typeEl) typeEl.textContent = item.type;
        if (dateEl) dateEl.textContent = formatDate(new Date(item.date + 'T00:00:00'));
        if (durationEl) durationEl.textContent = item.duration;
        
        const imgEl = document.getElementById('history-modal-img') as HTMLImageElement;
        const noImgEl = document.getElementById('history-modal-no-img');
        if (item.photo) { 
            if (imgEl) { imgEl.src = item.photo; imgEl.classList.remove('hidden'); }
            noImgEl?.classList.add('hidden'); 
        } else { 
            imgEl?.classList.add('hidden'); 
            noImgEl?.classList.remove('hidden'); 
        }
        
        document.getElementById('workoutResultModal')?.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase();
    const appContainer = document.getElementById('appContainer');
    const user = getCurrentUser();
    if (user) {
        loadStudentProfile(user);
    } else {
        showScreen('loginScreen');
    }
    if (appContainer) appContainer.classList.remove('init-hidden');

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = (document.getElementById('login-email') as HTMLInputElement).value.trim().toLowerCase();
            const db = getDatabase();
            if (db.users.find((u:any) => u.email === email)) {
                setCurrentUser(email);
                loadStudentProfile(email);
            }
        });
    }

    // --- PWA INSTALL BANNER LOGIC (IMMEDIATE + IOS SUPPORT) ---
    const banner = document.getElementById('pwa-install-banner');
    const installBtn = document.getElementById('pwa-install-btn');
    const pwaDesc = document.getElementById('pwa-description');
    let deferredPrompt: any;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (!isStandalone && banner) {
        setTimeout(() => {
            banner.classList.remove('hidden');
            banner.style.transform = 'translateY(0)';
            
            if (isIOS && pwaDesc) {
                pwaDesc.innerHTML = "Toque no ícone de <i class='fas fa-share-square text-blue-500'></i> e selecione <b>Adicionar à Tela de Início</b>.";
                if (installBtn) installBtn.style.display = 'none';
            }
        }, 500);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (banner) banner.classList.remove('hidden');
    });

    installBtn?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            if (banner) banner.classList.add('hidden');
        } else if (!isIOS) {
            alert("Para instalar, procure 'Adicionar à tela inicial' no menu do seu navegador.");
        }
    });

    document.getElementById('pwa-close-btn')?.addEventListener('click', () => {
        if (banner) banner.classList.add('hidden');
    });
});

function loadStudentProfile(email: string) {
    const db = getDatabase();
    const user = db.users.find((u: any) => u.email === email);
    if (!user) return; 
    const profileInfo = document.getElementById('student-profile-info');
    if (profileInfo) {
        profileInfo.innerHTML = `<img src="${user.photo}" class="w-14 h-14 rounded-full border-2 border-red-600 object-cover"><div><h2 class="text-lg font-bold text-white">Olá, ${user.name.split(' ')[0]}</h2><p class="text-xs text-gray-400">Aluno(a) ABFIT</p></div>`;
    }
    const btnContainer = document.getElementById('student-profile-buttons');
    if (btnContainer) {
        btnContainer.innerHTML = `
            <button onclick="loadTrainingScreen('A')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-dumbbell text-2xl"></i><span class="text-sm font-bold">TREINO A</span></button>
            <button onclick="loadTrainingScreen('B')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-dumbbell text-2xl"></i><span class="text-sm font-bold">TREINO B</span></button>
            <button onclick="showScreen('runningScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-running text-orange-500 text-2xl"></i><span class="text-sm font-bold">CORRIDA</span></button>
            <button onclick="showScreen('periodizationScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-calendar-alt text-yellow-500 text-2xl"></i><span class="text-sm font-bold">PERIODIZAÇÃO</span></button>
            <button onclick="showScreen('outdoorSelectionScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-map-marked-alt text-green-500 text-2xl"></i><span class="text-sm font-bold">OUTDOOR</span></button>
            <button onclick="showScreen('raceCalendarScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-flag-checkered text-blue-500 text-2xl"></i><span class="text-sm font-bold">PROVAS</span></button>
             <button onclick="showScreen('physioAssessmentScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-clipboard-user text-red-400 text-2xl"></i><span class="text-sm font-bold">AVALIAÇÃO</span></button>
             <button onclick="loadAIAnalysisScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 h-28"><i class="fas fa-brain text-teal-400 text-2xl"></i><span class="text-sm font-bold">ANÁLISE IA</span></button>
        `;
    }
    renderCalendar(currentCalendarDate);
    showScreen('studentProfileScreen');
}

(window as any).loadTrainingScreen = (type: string) => { console.log("Carregando Treino", type); showScreen('trainingScreen'); };
(window as any).showScreen = showScreen;
(window as any).loadStudentProfile = loadStudentProfile;
(window as any).loadAIAnalysisScreen = loadAIAnalysisScreen;
(window as any).openInfoModal = (key: string) => { const data = footerContent[key]; if(data) { document.getElementById('info-modal-title')!.textContent = data.title; document.getElementById('info-modal-body')!.innerHTML = data.body; document.getElementById('infoModal')?.classList.remove('hidden'); } };
