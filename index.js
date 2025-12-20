import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD_C_yn_RyBSopY7Tb9aqLW8", // Partially recovered from screenshot, ensure it's correct
  authDomain: "chaveunica-225e0.firebaseapp.com",
  projectId: "chaveunica-225e0",
  storageBucket: "chaveunica-225e0.firebasestorage.app",
  messagingSenderId: "324211037832",
  appId: "1:324211037832:web:c1ad3855609fc4d285b13d",
  measurementId: "G-KYSFBWSS1Y"
};

try {
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    console.log("Firebase initialized");
} catch (e) {
    console.warn("Firebase Init Error (Check API Key):", e);
}

// Globals defined by imported scripts
// In pure JS modules, declarations aren't needed, but we assume these exist globally.

// --- CONFIGURATION ---
const GRAVITY = 9.81;

// Timer Variables (Indoor)
let workoutTimerInterval = null;
let workoutStartTime = null;

// Outdoor Tracking Variables
let map = null;
let mapPolyline = null;
let trackingPath = [];
let trackingWatchId = null;
let trackingTimerInterval = null;
let trackingStartTime = 0;
let trackingElapsedTime = 0; // ms
let trackingDistance = 0; // meters
let isTrackingPaused = false;
let currentActivityType = "";

// Config Vars
let currentConfigExerciseIdx = null;
let currentConfigWorkoutType = null;

let currentCalendarDate = new Date(); // Track calendar state

// --- FINISH WORKOUT STATE ---
let tempWorkoutData = {};
let tempWorkoutImage = null;

// --- AI CHAT STATE ---
let chatSession = null;
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

// --- FOOTER CONTENT (AI Generated Responses) ---
const footerContent = {
    'sobre': {
        title: 'Sobre a ABFIT',
        body: `
            <p><strong>Missão:</strong> Transformar vidas através do movimento consciente e da ciência do treinamento físico.</p>
            <p>A ABFIT, fundada pelo treinador André Brito, não é apenas uma assessoria esportiva, é uma filosofia de vida. Acreditamos que o corpo humano é uma máquina perfeita que precisa de manutenção adequada, desafio constante e respeito aos seus limites.</p>
            <p>Nossa metodologia combina periodização baseada em evidências científicas com um acompanhamento humano e personalizado. Seja para alta performance, estética ou saúde, nosso compromisso é entregar resultados reais e duradouros, longe de promessas milagrosas.</p>
            <p>Junte-se à nossa comunidade e descubra sua melhor versão.</p>
        `
    },
    'carreiras': {
        title: 'Carreiras',
        body: `
            <p>Estamos sempre em busca de profissionais apaixonados por saúde e performance.</p>
            <p>Se você é Personal Trainer, Nutricionista ou Fisioterapeuta e se identifica com uma metodologia séria e baseada em dados, queremos conhecer você.</p>
            <p class="mt-4"><strong>Vagas Abertas:</strong></p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Estagiário em Educação Física (Remoto/Híbrido)</li>
                <li>Treinador Assistente (Foco em Correção de Movimento)</li>
                <li>Desenvolvedor Full Stack (Foco em React/PWA)</li>
            </ul>
            <p class="mt-4">Envie seu currículo e portfólio para: <strong>carreiras@abfit.com.br</strong></p>
        `
    },
    'imprensa': {
        title: 'Imprensa',
        body: `
            <p>Bem-vindo à sala de imprensa da ABFIT.</p>
            <p>Aqui você encontra nossos releases oficiais, kit de mídia e contatos para solicitações de entrevistas com André Brito.</p>
            <p class="mt-2">André Brito está disponível para comentar sobre:</p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Tendências do Fitness em 2025</li>
                <li>Periodização e Hipertrofia</li>
                <li>Tecnologia aplicada ao esporte</li>
            </ul>
            <p class="mt-4">Contato para jornalistas: <strong>imprensa@abfit.com.br</strong></p>
        `
    },
    'fale': {
        title: 'Fale Conosco',
        body: `
            <p>Tem alguma dúvida, sugestão ou feedback? Nossa equipe está pronta para te ouvir.</p>
            <p class="mt-4"><strong>Canais de Atendimento:</strong></p>
            <div class="mt-2 space-y-2">
                <div class="flex items-center gap-2"><i data-feather="mail" class="text-red-500"></i> britodeandrade@gmail.com</div>
                <div class="flex items-center gap-2"><i data-feather="phone" class="text-red-500"></i> +55 21 994 527 694</div>
                <div class="flex items-center gap-2"><i data-feather="instagram" class="text-red-500"></i> @andrebrito.personal</div>
            </div>
            <p class="mt-4 text-xs text-gray-500">Horário de atendimento: Seg a Sex, das 08h às 20h.</p>
        `
    },
    'suporte': {
        title: 'Suporte Técnico',
        body: `
            <p>Encontrou algum problema no app? Não se preocupe, vamos resolver.</p>
            <p class="mt-2">Antes de abrir um chamado, verifique:</p>
            <ul class="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                <li>Sua conexão com a internet está ativa?</li>
                <li>Você está usando a versão mais recente do app (v1.3)?</li>
                <li>Tente limpar o cache do navegador.</li>
            </ul>
            <p class="mt-4">Se o problema persistir, envie um print do erro para o nosso WhatsApp de suporte.</p>
            <button class="mt-4 w-full bg-green-600 text-white py-2 rounded font-bold">Abrir Chat no WhatsApp</button>
        `
    },
    'privacidade': {
        title: 'Política de Privacidade',
        body: `
            <p><strong>Última atualização: Janeiro de 2025</strong></p>
            <p class="mt-2">A ABFIT leva sua privacidade a sério. Esta política descreve como coletamos e usamos seus dados.</p>
            <p class="mt-2"><strong>1. Coleta de Dados:</strong> Coletamos informações como nome, e-mail, dados de saúde (peso, medidas) e localização (apenas durante o uso do rastreamento outdoor) para fornecer nossos serviços.</p>
            <p class="mt-2"><strong>2. Uso das Informações:</strong> Seus dados são usados exclusivamente para personalizar seus treinos e gerar relatórios de progresso. Não vendemos seus dados para terceiros.</p>
            <p class="mt-2"><strong>3. Segurança:</strong> Utilizamos criptografia de ponta a ponta e servidores seguros para proteger suas informações.</p>
            <p class="mt-2"><strong>4. LGPD:</strong> Você tem o direito de solicitar a exclusão ou cópia dos seus dados a qualquer momento através do canal de suporte.</p>
        `
    },
    'termos': {
        title: 'Termos e Condições',
        body: `
            <p>Ao utilizar o aplicativo ABFIT, você concorda com os seguintes termos:</p>
            <ol class="list-decimal pl-5 mt-2 space-y-2">
                <li><strong>Responsabilidade Médica:</strong> O usuário declara estar apto fisicamente para a prática de exercícios. A ABFIT recomenda consultar um médico antes de iniciar qualquer programa.</li>
                <li><strong>Uso Pessoal:</strong> O plano de treino é individual e intransferível. O compartilhamento de conta pode resultar em documento.</li>
                <li><strong>Propriedade Intelectual:</strong> Todo o conteúdo (vídeos, textos, métodos) é propriedade exclusiva da ABFIT.</li>
                <li><strong>Cancelamento:</strong> O serviço pode ser cancelado a qualquer momento, respeitando as regras do plano contratado.</li>
            </ol>
            <p class="mt-4 text-xs text-gray-500">Ao clicar em "Aceitar" no cadastro, você confirmou a leitura destes termos.</p>
        `
    }
};

// --- DATABASE ---
const defaultDatabase = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'marcelly.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } }
    ],
    trainingPlans: { treinosA: {}, treinosB: {}, periodizacao: {} },
    userRunningWorkouts: {},
    completedWorkouts: {}, 
    activeSessions: {},
    raceCalendar: []
};

// --- STORAGE ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database_v8', 
    CURRENT_USER: 'abfit_current_user'
};

function getDatabase() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    return saved ? JSON.parse(saved) : defaultDatabase;
}

function saveDatabase(db) {
    localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db));
}

function getCurrentUser() { return localStorage.getItem(STORAGE_KEYS.CURRENT_USER); }
function setCurrentUser(email) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email); }

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1); 
  return new Date(d.setDate(diff));
}

function formatDate(d) {
    return d.toLocaleDateString('pt-BR');
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function calculatePace(ms, meters) {
    if (meters === 0) return "--:--";
    const km = meters / 1000;
    const minutes = ms / 1000 / 60;
    const paceDec = minutes / km;
    const paceMin = Math.floor(paceDec);
    const paceSec = Math.floor((paceDec - paceMin) * 60).toString().padStart(2, '0');
    return `${paceMin}:${paceSec}`;
}

function parseNumeric(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const match = val.toString().match(/\d+/);
    return match ? parseInt(match[0]) : 0;
}

// --- INITIALIZATION ---
function initializeDatabase() {
    try {
        const db = getDatabase();
        const usersToInit = ['britodeandrade@gmail.com', 'marcellybispo92@gmail.com'];
        
        const marcelly = db.users.find((u) => u.email === 'marcellybispo92@gmail.com');
        if (!marcelly) {
            db.users.push({ id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'marcelly.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } });
        }

        const treinosA = [
            { name: 'Agachamento livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/77Uth2fQUxtPXvqu1UCb.png', sets: '3', reps: '10', carga: '12', obs: 'Método Simples' },
            { name: 'Leg press horizontal', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '40', obs: 'Método Simples' },
            { name: 'Leg press horizontal unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '20', obs: 'Método Simples' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '10', carga: '10', obs: 'Método Simples' },
            { name: 'Cadeira extensora unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '10', carga: '5', obs: 'Método Simples' },
            { name: 'Supino aberto com HBC no banco inclinado', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '10', carga: '12', obs: 'Método Simples' },
            { name: 'Crucifixo aberto com HBC no banco inclinado', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '10', carga: '8', obs: 'Método Simples' },
            { name: 'Desenvolvimento aberto com HBC no banco 75 graus', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '10', carga: '8', obs: 'Método Simples' },
            { name: 'Extensão de cotovelos aberto no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples' },
            { name: 'Extensão de cotovelos fechado no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples' },
            { name: 'Abdominal remador no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples' }
        ];

        const treinosB = [
            { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '12', carga: '16', obs: 'Método Simples' },
            { name: 'Extensão de quadril com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '12', carga: '5', obs: 'Método Simples' },
            { name: 'Flexão de joelho em pé com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '12', carga: '5', obs: 'Método Simples' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '12', carga: '15', obs: 'Método Simples' },
            { name: 'Cadeira abdutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '12', carga: '20', obs: 'Método Simples' },
            { name: 'Remada declinado no smith', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '10', obs: 'Método Simples' },
            { name: 'Remada curvada supinada no cross', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '15', obs: 'Método Simples' },
            { name: 'Bíceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '12', carga: '10', obs: 'Método Simples' },
            { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '25', obs: 'Método Simples' },
            { name: 'Puxada supinada no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '25', obs: 'Método Simples' },
            { name: 'Abdominal remador no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples' }
        ];

        usersToInit.forEach(email => {
            if (!db.trainingPlans.treinosA[email]) db.trainingPlans.treinosA[email] = treinosA;
            if (!db.trainingPlans.treinosB[email]) db.trainingPlans.treinosB[email] = treinosB;
            
            // --- CALCULO DE DATAS ---
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const currentDay = today.getDay(); 
            const daysToSubtractForTuesday = (currentDay < 2) ? (currentDay + 5) : (currentDay - 2);
            const tuesdayDate = new Date(today);
            tuesdayDate.setDate(today.getDate() - daysToSubtractForTuesday);
            const tuesdayStr = tuesdayDate.toISOString().split('T')[0];

            const yesterdayDate = new Date(today);
            yesterdayDate.setDate(today.getDate() - 1);
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

            // --- HISTÓRICO COMPLETO MESCLADO ---
            const historyData = [
                // Histórico Antigo (Ordem de Data Crescente)
                { date: `${yearMonth}-08`, type: 'Treino A', duration: '50 min', timestamp: new Date(`${yearMonth}-08T10:00:00`).toISOString(), totalVolumeKg: 6800 },
                { date: `${yearMonth}-09`, type: 'Treino B', duration: '50 min', timestamp: new Date(`${yearMonth}-09T10:00:00`).toISOString(), totalVolumeKg: 7500 },
                { date: `${yearMonth}-10`, type: 'Treino A', duration: '37 min', timestamp: new Date(`${yearMonth}-10T10:00:00`).toISOString(), totalVolumeKg: 5200 },
                // Novos Registros (Terça e Ontem)
                { date: tuesdayStr, type: 'Treino B', duration: '50 min', timestamp: tuesdayDate.toISOString(), totalVolumeKg: 8500 },
                { date: yesterdayStr, type: 'Treino A', duration: '40 min', timestamp: yesterdayDate.toISOString(), totalVolumeKg: 7200 }
            ];

            if (!db.completedWorkouts[email]) db.completedWorkouts[email] = [];
            
            historyData.forEach(item => {
                const exists = db.completedWorkouts[email].some((w) => w.date === item.date && w.type === item.type);
                if (!exists) {
                    db.completedWorkouts[email].push(item);
                    const planKey = item.type === 'Treino A' ? 'treinosA' : 'treinosB';
                    const plan = db.trainingPlans[planKey][email];
                    if(plan) {
                        plan.forEach(ex => {
                            if(!ex.checkIns) ex.checkIns = [];
                            if(!ex.checkIns.includes(item.date)) ex.checkIns.push(item.date);
                        });
                    }
                }
            });
        });
        
        saveDatabase(db);
    } catch (e) { console.error("Initialization error:", e); }
}

// --- AI CHAT LOGIC ---
async function loadAIAnalysisScreen() {
    const screen = document.getElementById('aiAnalysisScreen');
    if (!screen) return;

    screen.innerHTML = `
        <div class="flex flex-col h-full bg-gray-900 relative">
            <div class="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur border-b border-gray-700 shadow-lg z-20">
                <button onclick="showScreen('studentProfileScreen')" class="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <i data-feather="arrow-left"></i>
                </button>
                <div class="flex flex-col items-center">
                    <h2 class="text-lg font-black text-white italic tracking-wide flex items-center gap-2">
                        ABFIT <span class="text-teal-400">AI</span>
                    </h2>
                </div>
                <div class="w-8"></div>
            </div>
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 pb-32 scroll-smooth">
                <div class="flex justify-start animate-fadeIn">
                    <div class="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mr-2 border border-teal-500/50 flex-shrink-0">
                        <i class="fas fa-robot text-teal-400 text-xs"></i>
                    </div>
                    <div class="bg-gray-800 text-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm border border-gray-700">
                        <p class="text-sm">Fala! Sou a inteligência artificial da ABFIT. 💪<br>Tem alguma dúvida sobre seu treino ou dieta hoje?</p>
                    </div>
                </div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 z-20 pb-8">
                <form onsubmit="handleChatSubmit(event)" class="flex gap-2 items-end">
                    <div class="flex-1 relative">
                        <input type="text" id="chat-input" class="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-3 pr-4 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-gray-500 max-h-32" placeholder="Digite sua dúvida..." autocomplete="off">
                    </div>
                    <button type="submit" class="bg-teal-500 hover:bg-teal-600 active:scale-95 text-gray-900 font-bold p-3 rounded-xl transition-all shadow-lg shadow-teal-500/20 flex-shrink-0">
                        <i data-feather="send" class="w-5 h-5"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    if (typeof feather !== 'undefined') feather.replace();
    showScreen('aiAnalysisScreen');

    if (!chatSession) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            chatSession = ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: CHAT_SYSTEM_INSTRUCTION } });
        } catch (e) { console.error("AI Init Error:", e); }
    }
}

window.handleChatSubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const container = document.getElementById('chat-messages');
    const msg = input.value.trim();
    if (!msg || !chatSession) return;

    input.value = '';
    const userDiv = document.createElement('div');
    userDiv.className = 'flex justify-end animate-fadeIn';
    userDiv.innerHTML = `<div class="bg-teal-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-md"><p class="text-sm">${msg.replace(/\n/g, '<br>')}</p></div>`;
    container?.appendChild(userDiv);
    container?.scrollTo(0, container.scrollHeight);

    const loaderId = 'chat-loader-' + Date.now();
    const loaderDiv = document.createElement('div');
    loaderDiv.id = loaderId;
    loaderDiv.className = 'flex justify-start animate-fadeIn';
    loaderDiv.innerHTML = `<div class="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mr-2 border border-teal-500/50 flex-shrink-0"><i class="fas fa-robot text-teal-400 text-xs"></i></div><div class="bg-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-700 flex gap-1.5 items-center"><div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div><div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div><div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div></div>`;
    container?.appendChild(loaderDiv);
    container?.scrollTo(0, container.scrollHeight);

    try {
        const response = await chatSession.sendMessage({ message: msg });
        document.getElementById(loaderId)?.remove();
        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex justify-start animate-fadeIn';
        const contentHtml = (typeof marked !== 'undefined') ? marked.parse(response.text) : response.text;
        aiDiv.innerHTML = `<div class="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mr-2 border border-teal-500/50 flex-shrink-0 mt-1"><i class="fas fa-robot text-teal-400 text-xs"></i></div><div class="bg-gray-800 text-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm border border-gray-700 prose prose-invert prose-sm leading-snug">${contentHtml}</div>`;
        container?.appendChild(aiDiv);
        container?.scrollTo(0, container.scrollHeight);
    } catch (err) {
        document.getElementById(loaderId)?.remove();
        console.error(err);
    }
};

// --- NAVIGATION ---
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => { 
        s.classList.remove('active'); 
        s.classList.add('hidden'); 
        s.style.display = ''; 
    });
    
    const target = document.getElementById(screenId);
    if (target) { 
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active'), 10);
    }
    window.scrollTo(0, 0);
}

// --- SCREEN LOADERS (Newly Implemented to Fix References) ---
function loadStudentProfile(email) {
    const db = getDatabase();
    const user = db.users.find(u => u.email === email);
    if (!user) return;

    // 1. Update Profile Header
    const infoContainer = document.getElementById('student-profile-info');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-gray-700 border-2 border-red-600 overflow-hidden relative">
                <img src="${user.photo || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
            </div>
            <div>
                <h2 class="text-white font-bold text-xl leading-none">${user.name}</h2>
                <p class="text-gray-400 text-xs">Atleta de Alta Performance</p>
                <div class="flex items-center gap-2 mt-1">
                     <span class="bg-red-600/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-600/30">PRO</span>
                     <span class="bg-blue-600/20 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-600/30">NÍVEL 3</span>
                </div>
            </div>
        `;
    }

    // 2. Render Main Action Buttons
    const buttonsContainer = document.getElementById('student-profile-buttons');
    if (buttonsContainer) {
        buttonsContainer.innerHTML = `
            <button onclick="loadTrainingScreen('A')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-dumbbell text-2xl text-gray-400 group-hover:text-red-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Treino A</span>
            </button>
            <button onclick="loadTrainingScreen('B')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-dumbbell text-2xl text-gray-400 group-hover:text-red-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Treino B</span>
            </button>
            <button onclick="showScreen('outdoorSelectionScreen')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-person-running text-2xl text-gray-400 group-hover:text-green-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Outdoor</span>
            </button>
             <button onclick="loadPeriodizationScreen()" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-calendar-alt text-2xl text-gray-400 group-hover:text-yellow-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Periodização</span>
            </button>
             <button onclick="showScreen('physioAssessmentScreen')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-heartbeat text-2xl text-gray-400 group-hover:text-pink-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Physio</span>
            </button>
             <button onclick="loadRunningScreen()" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-stopwatch text-2xl text-gray-400 group-hover:text-orange-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Corrida</span>
            </button>
            <button onclick="loadRaceCalendarScreen()" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all">
                <i class="fas fa-flag-checkered text-2xl text-gray-400 group-hover:text-purple-500 transition-colors"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Provas</span>
            </button>
             <button onclick="loadAIAnalysisScreen()" class="metal-btn-highlight p-4 flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all shadow-lg shadow-red-900/20">
                <i class="fas fa-robot text-2xl text-red-500 group-hover:text-white transition-colors"></i>
                <span class="text-xs font-bold text-red-500 group-hover:text-white uppercase">AB Coach</span>
            </button>
        `;
    }

    renderCalendar(currentCalendarDate);
    showScreen('studentProfileScreen');
}

function loadRunningScreen() {
    const list = document.getElementById('running-workouts-list');
    if (list) {
        list.innerHTML = `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
                <i class="fas fa-road text-4xl text-gray-600 mb-2"></i>
                <p class="text-gray-400 text-sm">Nenhum treino de corrida prescrito.</p>
                <button onclick="showScreen('outdoorSelectionScreen')" class="mt-4 text-blue-400 text-xs font-bold hover:underline">Ir para Outdoor Tracking</button>
            </div>
        `;
    }
    showScreen('runningScreen');
}

function loadPeriodizationScreen() {
    const container = document.getElementById('periodization-content-wrapper');
    if (container) {
         container.innerHTML = `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                <h3 class="text-lg font-bold text-white mb-1">Mesociclo 1: Base</h3>
                <p class="text-xs text-gray-400 mb-2">01/01/2025 - 28/02/2025</p>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-yellow-500 h-2 rounded-full" style="width: 45%"></div>
                </div>
                <p class="text-[10px] text-right text-gray-500 mt-1">45% Concluído</p>
            </div>
         `;
    }
    showScreen('periodizationScreen');
}

function loadRaceCalendarScreen() {
    const list = document.getElementById('race-calendar-list');
    if (list) {
        list.innerHTML = `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="bg-purple-600/20 p-3 rounded-lg text-purple-500"><i class="fas fa-flag-checkered"></i></div>
                    <div>
                        <h4 class="text-white font-bold">Maratona do Rio</h4>
                        <p class="text-xs text-gray-400">02 Junho 2025</p>
                    </div>
                </div>
            </div>
        `;
    }
    showScreen('raceCalendarScreen');
}

// --- MODAL FUNCTIONS ---
function openFinishWorkoutModal(type, { totalVolumeKg } = {}) {
    window.tempWorkoutData = {
        type: `Treino ${type}`,
        duration: document.getElementById('workout-timer')?.textContent || "00:00:00",
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        totalVolumeKg: totalVolumeKg || 0
    };
    
    const summary = document.getElementById('finish-modal-summary');
    if (summary) {
        summary.innerHTML = `
            <div class="flex justify-between mb-2">
                <span class="text-gray-400 text-xs uppercase">Duração</span>
                <span class="text-white font-mono font-bold">${tempWorkoutData.duration}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-400 text-xs uppercase">Volume Total</span>
                <span class="text-white font-mono font-bold">${(tempWorkoutData.totalVolumeKg).toLocaleString('pt-BR')} kg</span>
            </div>
        `;
    }
    document.getElementById('finish-photo-preview').classList.add('hidden');
    document.getElementById('finish-photo-placeholder').classList.remove('hidden');
    document.getElementById('finishWorkoutModal').classList.remove('hidden');
}

function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            tempWorkoutImage = e.target.result;
            const img = document.getElementById('finish-photo-preview');
            img.src = tempWorkoutImage;
            img.classList.remove('hidden');
            document.getElementById('finish-photo-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function saveFinishedWorkout() {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;

    if (!db.completedWorkouts[email]) db.completedWorkouts[email] = [];
    
    const workout = {
        ...tempWorkoutData,
        photo: tempWorkoutImage
    };
    
    db.completedWorkouts[email].push(workout);
    
    // Reset temporary data
    tempWorkoutData = {};
    tempWorkoutImage = null;
    
    saveDatabase(db);
    document.getElementById('finishWorkoutModal').classList.add('hidden');
    
    // Refresh history if on profile screen
    loadStudentProfile(email);
}


// --- RENDER HISTORY LIST ---
function renderTrainingHistory(email) {
    const historyContainer = document.getElementById('training-history-container');
    if (!historyContainer) return;

    const db = getDatabase();
    let history = db.completedWorkouts?.[email] || [];
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const monthlyHistory = history.filter((h) => h.date.startsWith(monthPrefix))
                                  .sort((a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime());

    if (monthlyHistory.length === 0) {
        historyContainer.innerHTML = '<p class="text-gray-400 text-center text-sm mt-4">Nenhum histórico neste mês.</p>';
        return;
    }

    let html = '<h3 class="text-lg font-bold text-white mb-3 px-1">Seu Progresso</h3><div class="space-y-2">';
    monthlyHistory.forEach((item) => {
        const dateObj = new Date(item.date + 'T00:00:00');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hasPhoto = item.photo ? true : false;
        html += `<div onclick="openHistoryDetail('${item.timestamp}')" class="flex items-center justify-between bg-gray-800/80 p-3 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-700 transition"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-gray-700 rounded-lg flex flex-col items-center justify-center border border-gray-600 relative overflow-hidden">${hasPhoto ? `<img src="${item.photo}" class="absolute inset-0 w-full h-full object-cover opacity-60">` : ''}<span class="text-xs text-gray-400 uppercase font-bold z-10 drop-shadow-md">DIA</span><span class="text-lg font-bold text-white leading-none z-10 drop-shadow-md">${day}</span></div><div><div class="flex items-center gap-2"><p class="text-white font-bold text-sm">${item.type}</p>${hasPhoto ? '<i class="fas fa-camera text-xs text-blue-400"></i>' : ''}</div><div class="flex items-center gap-1"><i data-feather="check-circle" class="w-3 h-3 text-green-500"></i><span class="text-xs text-green-400 font-medium">Concluído</span></div></div></div><div class="text-right"><p class="text-xs text-gray-400 font-bold uppercase mb-0.5">Tempo</p><p class="text-white font-bold font-mono bg-gray-900/50 px-2 py-1 rounded text-xs border border-gray-600">${item.duration}</p></div></div>`;
    });
    html += '</div>';
    historyContainer.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
}

// ... (Rest of history/modal functions remain same, ensuring window exports are correct) ...

window.openHistoryDetail = (timestamp) => {
    const db = getDatabase();
    const email = getCurrentUser();
    const item = db.completedWorkouts?.[email]?.find((x) => x.timestamp === timestamp || x.date === timestamp);
    if (item) {
        document.getElementById('history-modal-type').textContent = item.type;
        document.getElementById('history-modal-date').textContent = formatDate(new Date(item.date + 'T00:00:00'));
        document.getElementById('history-modal-duration').textContent = item.duration;
        const imgEl = document.getElementById('history-modal-img');
        const noImgEl = document.getElementById('history-modal-no-img');
        if (item.photo) { imgEl.src = item.photo; imgEl.classList.remove('hidden'); noImgEl?.classList.add('hidden'); }
        else { imgEl.classList.add('hidden'); noImgEl?.classList.remove('hidden'); }
        
        const volBox = document.getElementById('history-modal-volume-box');
        if (item.totalVolumeKg) {
            document.getElementById('history-modal-volume-kg').textContent = item.totalVolumeKg.toLocaleString('pt-BR') + ' kg';
            document.getElementById('history-modal-volume-n').textContent = (item.totalVolumeKg * GRAVITY).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' N';
            volBox.classList.remove('hidden');
        } else {
            volBox.classList.add('hidden');
        }

        document.getElementById('workoutResultModal')?.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
};

window.openInfoModal = (key) => {
    const data = footerContent[key];
    if(data) {
        document.getElementById('info-modal-title').textContent = data.title;
        document.getElementById('info-modal-body').innerHTML = data.body;
        document.getElementById('infoModal')?.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
};

// --- CALENDAR LOGIC ---
function renderCalendar(date) {
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
    for (let i = 0; i < firstDay; i++) { const empty = document.createElement('div'); empty.className = 'calendar-day opacity-0 pointer-events-none'; grid.appendChild(empty); }
    const db = getDatabase();
    const email = getCurrentUser();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day transition-all hover:bg-gray-700 cursor-default';
        cell.textContent = d.toString();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) cell.classList.add('today');
        if (db.trainingPlans && email) {
            let hasA = db.trainingPlans.treinosA?.[email]?.some((ex) => ex.checkIns && ex.checkIns.includes(dateStr));
            let hasB = db.trainingPlans.treinosB?.[email]?.some((ex) => ex.checkIns && ex.checkIns.includes(dateStr));
            if (hasA && hasB) cell.classList.add('treino-A-B-completed');
            else if (hasA) cell.classList.add('treino-A-completed');
            else if (hasB) cell.classList.add('treino-B-completed');
        }
        grid.appendChild(cell);
    }
    if (email) renderTrainingHistory(email);
}

window.toggleSet = (idx, type, setNum) => {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;
    const exercise = db.trainingPlans[`treinos${type}`][email][idx];
    const todayStr = new Date().toISOString().split('T')[0];
    if (!exercise.doneSets) exercise.doneSets = [];
    if (exercise.doneSets.includes(setNum)) exercise.doneSets = exercise.doneSets.filter((s) => s !== setNum);
    else exercise.doneSets.push(setNum);
    const totalSets = parseNumeric(exercise.sets) || 3;
    if (exercise.doneSets.length >= totalSets) {
        if (!exercise.checkIns) exercise.checkIns = [];
        if (!exercise.checkIns.includes(todayStr)) exercise.checkIns.push(todayStr);
    }
    saveDatabase(db);
    window.loadTrainingScreen(type);
    if (window.event) window.event.stopPropagation();
};

window.updateCarga = (idx, type, val) => {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;
    const cargaNum = parseFloat(val) || 0;
    db.trainingPlans[`treinos${type}`][email][idx].carga = cargaNum;
    saveDatabase(db);
    window.loadTrainingScreen(type); 
};

window.openMachineConfig = (idx, type) => {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;
    currentConfigExerciseIdx = idx;
    currentConfigWorkoutType = type;
    const exercise = db.trainingPlans[`treinos${type}`][email][idx];
    const config = exercise.machineConfig || { type: 'fixed' };
    
    document.getElementById('machine-type').value = config.type;
    document.getElementById('plate-weight-1').value = config.plateWeight1 || '';
    document.getElementById('plate-weight-2').value = config.plateWeight2 || '';
    document.getElementById('plate-threshold').value = config.plateThreshold || '';
    document.getElementById('total-plates').value = config.totalPlates || '';
    
    const fields = document.getElementById('machine-plates-config');
    if (config.type === 'progressive') fields.classList.remove('hidden');
    else fields.classList.add('hidden');
    
    document.getElementById('machineConfigModal').classList.remove('hidden');
};

document.getElementById('machine-type')?.addEventListener('change', (e) => {
    const fields = document.getElementById('machine-plates-config');
    if (e.target.value === 'progressive') fields.classList.remove('hidden');
    else fields.classList.add('hidden');
});

document.getElementById('machine-config-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email || currentConfigExerciseIdx === null) return;
    
    const config = {
        type: document.getElementById('machine-type').value,
        plateWeight1: parseFloat(document.getElementById('plate-weight-1').value) || 0,
        plateWeight2: parseFloat(document.getElementById('plate-weight-2').value) || 0,
        plateThreshold: parseInt(document.getElementById('plate-threshold').value) || 0,
        totalPlates: parseInt(document.getElementById('total-plates').value) || 0
    };
    
    db.trainingPlans[`treinos${currentConfigWorkoutType}`][email][currentConfigExerciseIdx].machineConfig = config;
    saveDatabase(db);
    document.getElementById('machineConfigModal').classList.add('hidden');
    window.loadTrainingScreen(currentConfigWorkoutType);
});

document.getElementById('closeMachineConfigBtn')?.addEventListener('click', () => {
    document.getElementById('machineConfigModal').classList.add('hidden');
});

const calculateMachineMax = (config) => {
    if (!config || config.type === 'fixed') return 0;
    const w1 = config.plateWeight1;
    const w2 = config.plateWeight2 || w1;
    const thresh = config.plateThreshold || config.totalPlates;
    const total = config.totalPlates;
    
    let max = 0;
    if (total <= thresh) {
        max = total * w1;
    } else {
        max = (thresh * w1) + ((total - thresh) * w2);
    }
    return max;
};

// --- LOAD TRAINING SCREEN (With Volume & Progress) ---
function loadTrainingScreen(type, email) {
    const userEmail = email || getCurrentUser();
    if (!userEmail) return;
    const db = getDatabase();
    const plan = db.trainingPlans[`treinos${type}`]?.[userEmail] || [];
    
    const saveBtn = document.getElementById('save-training-btn');
    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode?.replaceChild(newBtn, saveBtn);
        // Recalculate volume for passing to finish modal
        let currentVol = 0;
        plan.forEach(ex => currentVol += (parseFloat(ex.carga)||0) * parseNumeric(ex.sets) * parseNumeric(ex.reps));
        newBtn.addEventListener('click', () => window.openFinishWorkoutModal(type, { totalVolumeKg: currentVol }));
    }
    document.getElementById('training-title').textContent = `TREINO ${type}`;
    const navContainer = document.getElementById('workout-nav-bar');
    if (navContainer) {
        if (type === 'A') navContainer.innerHTML = `<div></div><button onclick="loadTrainingScreen('B')" class="flex items-center justify-end gap-2 text-xs font-bold text-gray-400 hover:text-white transition group text-right"><span class="group-hover:text-red-500 transition">Treino B</span> <i data-feather="chevron-right"></i></button>`;
        else if (type === 'B') navContainer.innerHTML = `<button onclick="loadTrainingScreen('A')" class="flex items-center justify-start gap-2 text-xs font-bold text-gray-400 hover:text-white transition group text-left"><i data-feather="chevron-left"></i> <span class="group-hover:text-red-500 transition">Treino A</span></button><div></div>`;
    }

    let totalVolumeKg = 0;
    plan.forEach(ex => {
        const c = parseFloat(ex.carga) || 0;
        const s = parseNumeric(ex.sets);
        const r = parseNumeric(ex.reps);
        totalVolumeKg += (c * s * r);
    });
    const totalVolumeN = totalVolumeKg * GRAVITY;

    const history = db.completedWorkouts[userEmail] || [];
    const lastWorkout = history
        .filter(h => h.type === `Treino ${type}` || h.type === type)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    let progressHtml = '';
    if (lastWorkout && lastWorkout.totalVolumeKg) {
        const lastVol = lastWorkout.totalVolumeKg;
        const diff = totalVolumeKg - lastVol;
        const percent = ((diff / lastVol) * 100).toFixed(1);
        const color = diff >= 0 ? 'text-green-400' : 'text-red-400';
        const icon = diff >= 0 ? 'trending-up' : 'trending-down';
        progressHtml = `<div class="text-[10px] font-bold ${color} flex items-center gap-1 bg-gray-800 px-2 py-1 rounded ml-2 border border-gray-700"><i data-feather="${icon}" class="w-3 h-3"></i> ${percent}% vs anterior</div>`;
    }

    const timerEl = document.getElementById('workout-timer');
    if (timerEl) {
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        workoutStartTime = new Date();
        timerEl.textContent = "00:00:00";
        workoutTimerInterval = window.setInterval(() => {
            if (!workoutStartTime) return;
            const diff = new Date().getTime() - workoutStartTime.getTime();
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            timerEl.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    const listContainer = document.getElementById('training-content-wrapper');
    if (listContainer) {
        listContainer.innerHTML = `
            <div class="flex flex-col gap-2 mb-2">
                <div class="volume-tracker-bar">
                    <div class="volume-stat-box"><span class="volume-stat-label">Volume Total (kg)</span><span class="volume-stat-value text-xl">${totalVolumeKg.toLocaleString('pt-BR')} kg</span></div>
                    <div class="volume-stat-box border-l border-gray-600 pl-4"><span class="volume-stat-label">Força (N)</span><span class="volume-stat-value text-red-500">${totalVolumeN.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} N</span></div>
                </div>
                ${progressHtml ? `<div class="flex justify-center">${progressHtml}</div>` : ''}
            </div>
        `;
        const todayStr = new Date().toISOString().split('T')[0];
        plan.forEach((ex, i, arr) => {
            const conjugadoMatch = ex.name.match(/\(CONJUGADO\s+(\d+)\)/i);
            const conjugadoId = conjugadoMatch ? conjugadoMatch[1] : null;
            let lineType = null;
            if (conjugadoId) {
                const prevId = arr[i - 1]?.name.match(/\(CONJUGADO\s+(\d+)\)/i)?.[1];
                const nextId = arr[i + 1]?.name.match(/\(CONJUGADO\s+(\d+)\)/i)?.[1];
                if (prevId !== conjugadoId && nextId === conjugadoId) lineType = 'start';
                else if (prevId === conjugadoId && nextId === conjugadoId) lineType = 'middle';
                else if (prevId === conjugadoId && nextId !== conjugadoId) lineType = 'end';
            }
            const cleanName = ex.name.replace(/\(CONJUGADO\s+\d+\)/i, '').trim();
            const label = conjugadoId ? `(CONJUGADO ${conjugadoId})` : '';
            const isChecked = ex.checkIns && ex.checkIns.includes(todayStr);
            const totalSets = parseNumeric(ex.sets);
            const doneSets = ex.doneSets || [];
            let setsHtml = '';
            for (let s = 1; s <= totalSets; s++) {
                const isDone = doneSets.includes(s);
                const bgClass = isDone ? 'bg-green-500 border-green-600 text-white' : 'bg-gray-400/50 border-gray-400 text-gray-700 hover:bg-gray-400';
                setsHtml += `<div onclick="toggleSet(${i}, '${type}', ${s})" class="w-6 h-6 rounded-full border ${bgClass} flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm transition-all active:scale-95 shrink-0">${s}</div>`;
            }
            
            const currentLoad = parseFloat(ex.carga) || 0;
            const exVolumeKg = currentLoad * totalSets * parseNumeric(ex.reps);
            
            let machineStatHtml = '';
            if (ex.machineConfig && ex.machineConfig.type === 'progressive') {
                const maxLoad = calculateMachineMax(ex.machineConfig);
                if (maxLoad > 0) {
                    const percent = Math.round((currentLoad / maxLoad) * 100);
                    machineStatHtml = `<span class="text-[9px] font-bold text-orange-400 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">${percent}% da Máq.</span>`;
                }
            }

            const wrapper = document.createElement('div');
            if (conjugadoId) wrapper.className = 'superset-wrapper';
            wrapper.innerHTML = `
                ${lineType ? `<div class="superset-line ${lineType}"></div>` : ''}
                <div class="metal-card-exercise flex-col !items-stretch !gap-3 h-auto" onclick="openExerciseModal(${i}, '${type}')">
                    <div class="flex items-start gap-3 relative">
                        <div class="relative shrink-0"><img src="${ex.img}" class="exercise-thumbnail w-16 h-16 object-cover rounded-lg shadow-sm border border-gray-400"><div class="absolute inset-0 flex items-center justify-center"><i data-feather="play-circle" class="text-white w-6 h-6 drop-shadow-md opacity-80"></i></div></div>
                        <div class="flex-grow min-w-0 pt-0.5">
                            <h3 class="font-black text-gray-900 text-sm leading-tight pr-10 uppercase tracking-tight">${i + 1}. ${cleanName}</h3>
                            ${label ? `<p class="text-[10px] font-bold text-red-600 mt-0.5 tracking-wider">${label}</p>` : ''}
                            <div class="flex items-center gap-2 mt-1">
                                <p class="text-[10px] font-black text-blue-600 uppercase">Vol: ${exVolumeKg.toLocaleString('pt-BR')} kg</p>
                                ${machineStatHtml}
                            </div>
                        </div>
                        <div class="toggle-switch absolute top-0 right-0" onclick="event.stopPropagation()"><label><input type="checkbox" class="exercise-check" data-idx="${i}" ${isChecked ? 'checked' : ''}><span class="slider"></span></label></div>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col justify-between shadow-inner h-20" onclick="event.stopPropagation()"><div class="flex flex-col items-center justify-center border-b border-gray-400/30 pb-1"><span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Séries</span><span class="text-xl font-black text-blue-800 leading-none">${ex.sets}</span></div><div class="flex justify-evenly items-center w-full h-full pt-1 px-0.5 overflow-hidden">${setsHtml}</div></div>
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner h-20"><span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Reps</span><span class="text-2xl font-black text-orange-700 leading-none">${ex.reps}</span></div>
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner h-20 relative group" onclick="event.stopPropagation()">
                            <button onclick="event.stopPropagation(); openMachineConfig(${i}, '${type}')" class="absolute top-1 right-1 text-gray-500 hover:text-blue-600"><i class="fas fa-cog text-xs"></i></button>
                            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Carga (kg)</span>
                            <input type="number" value="${ex.carga}" onchange="updateCarga(${i}, '${type}', this.value)" class="carga-input" inputmode="numeric">
                         </div>
                    </div>
                </div>
            `;
            listContainer.appendChild(wrapper);
        });
        document.querySelectorAll('.exercise-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx || '0');
                const exercise = plan[idx];
                if (!exercise.checkIns) exercise.checkIns = [];
                if (e.target.checked) { if (!exercise.checkIns.includes(todayStr)) exercise.checkIns.push(todayStr); }
                else { exercise.checkIns = exercise.checkIns.filter((d) => d !== todayStr); }
                saveDatabase(db);
                if (document.getElementById('studentProfileScreen')?.style.display === 'block') renderCalendar(currentCalendarDate);
                loadTrainingScreen(type); 
            });
        });
        if (typeof feather !== 'undefined') feather.replace();
    }
    showScreen('trainingScreen');
}

// --- BOOTSTRAP (INITIALIZATION) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initial Data Setup
    initializeDatabase();
    
    // 2. Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('SW registered'))
                .catch(err => console.log('SW failed', err));
        });
    }

    // 3. User Session Check
    const user = getCurrentUser();
    
    // 4. Initial Screen Load
    if (user) {
        const db = getDatabase();
        if (db.users.find((u) => u.email.toLowerCase() === user.toLowerCase())) {
            loadStudentProfile(user);
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            showScreen('loginScreen');
        }
    } else {
        showScreen('loginScreen');
    }
    
    // 5. Flag App as Loaded (for fallback script in HTML)
    window.isAppLoaded = true;
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.style.opacity = '1';

    // 6. Login Form Logic
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        if (getDatabase().users.find(u => u.email === email)) { 
            setCurrentUser(email); 
            loadStudentProfile(email); 
        } else {
            const err = document.getElementById('login-error');
            if(err) err.textContent = "E-mail não encontrado.";
        }
    });

    // 7. Global Event Listeners
    document.getElementById('logout-btn')?.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); location.reload(); });
    document.getElementById('prev-month-btn')?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(currentCalendarDate); });
    document.getElementById('next-month-btn')?.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(currentCalendarDate); });

    // Handle Outdoor Activity Buttons
    document.querySelectorAll('.outdoor-activity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentActivityType = btn.dataset.activity;
            document.getElementById('tracking-activity-title').textContent = currentActivityType;
            showScreen('outdoorTrackingScreen');
            if(typeof window.initMap === 'function') window.initMap(); 
        });
    });

    document.querySelector('.outdoor-back-btn')?.addEventListener('click', () => showScreen('outdoorSelectionScreen'));

    // --- PWA INSTALL LOGIC (Enhanced for immediate display) ---
    const pwaBanner = document.getElementById('pwa-install-banner');
    const installBtn = document.getElementById('pwa-install-btn');
    const pwaText = pwaBanner.querySelector('h4');
    const pwaDesc = pwaBanner.querySelector('p');
    let deferredPrompt;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator.standalone === true);

    const showInstallBanner = () => {
        if (isStandalone) return; 
        
        // Ensure prompt is visible by removing hidden class AND checking opacity/transform
        pwaBanner.classList.remove('hidden');
        pwaBanner.style.transform = "translateY(0)"; 
        
        if (isIOS) {
            pwaText.textContent = "Instalar no iPhone";
            pwaDesc.innerHTML = "Toque em <i class='fas fa-share-square'></i> e depois em <strong>Adicionar à Tela de Início</strong>.";
            installBtn.style.display = 'none';
        } else {
            pwaText.textContent = "Instalar ABFIT";
            pwaDesc.textContent = "Acesse offline e mais rápido.";
            installBtn.style.display = 'block';
        }
    };

    // Attempt to show banner very quickly after load
    setTimeout(showInstallBanner, 500);

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    installBtn?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            pwaBanner.classList.add('hidden');
        } else {
            alert("Para instalar, procure a opção 'Instalar App' ou 'Adicionar à Tela Inicial' no menu do seu navegador.");
        }
    });

    document.getElementById('pwa-close-btn')?.addEventListener('click', () => {
        pwaBanner.classList.add('hidden');
    });

    // Init icons
    if (typeof feather !== 'undefined') feather.replace();
});

// Exports for global usage
window.loadTrainingScreen = loadTrainingScreen;
window.showScreen = showScreen;
window.loadRunningScreen = loadRunningScreen;
window.loadRaceCalendarScreen = loadRaceCalendarScreen;
window.loadPeriodizationScreen = loadPeriodizationScreen;
window.loadAIAnalysisScreen = loadAIAnalysisScreen;
window.openMachineConfig = openMachineConfig;
window.loadStudentProfile = loadStudentProfile;
window.openFinishWorkoutModal = openFinishWorkoutModal;
window.handlePhotoSelect = handlePhotoSelect;
window.saveFinishedWorkout = saveFinishedWorkout;