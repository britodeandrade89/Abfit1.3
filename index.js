
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD_C_yn_RyBSopY7Tb9aqLW8",
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
} catch (e) {
    console.warn("Firebase Init Skip");
}

// --- STATE & CONFIG ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database_v11',
    CURRENT_USER: 'abfit_current_user'
};

const defaultDatabase = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg' },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'https://via.placeholder.com/150/991b1b/FFFFFF?text=MB' }
    ],
    trainingPlans: { 
        treinosA: [
            { name: 'Agachamento Livre', sets: '3', reps: '12', carga: '20', img: 'https://via.placeholder.com/80/991b1b/FFFFFF?text=Treino' },
            { name: 'Supino Reto', sets: '3', reps: '10', carga: '15', img: 'https://via.placeholder.com/80/991b1b/FFFFFF?text=Treino' }
        ],
        treinosB: [
            { name: 'Levantamento Terra', sets: '3', reps: '10', carga: '30', img: 'https://via.placeholder.com/80/991b1b/FFFFFF?text=Treino' },
            { name: 'Remada Curvada', sets: '3', reps: '12', carga: '10', img: 'https://via.placeholder.com/80/991b1b/FFFFFF?text=Treino' }
        ]
    }
};

let currentCalendarDate = new Date();
let workoutTimerInterval = null;

// --- UTILS ---
function validateEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
}

// --- CORE FUNCTIONS ---
function getDatabase() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
        return saved ? JSON.parse(saved) : defaultDatabase;
    } catch (e) {
        console.error("Database corruption detected. Resetting to default.");
        return defaultDatabase;
    }
}

function saveDatabase(db) {
    localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db));
}

function getCurrentUser() { return localStorage.getItem(STORAGE_KEYS.CURRENT_USER); }
function setCurrentUser(email) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email); }

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => { 
        s.classList.add('hidden');
        s.style.display = 'none';
    });
    
    const target = document.getElementById(screenId);
    if (target) { 
        target.classList.remove('hidden');
        target.style.display = 'block';
    }
}

function renderCalendar(date) {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-year');
    if (!grid || !label) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    label.textContent = `${monthNames[month]} ${year}`;
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += '<div></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
        grid.innerHTML += `<div class="calendar-day ${isToday ? 'today' : ''}">${d}</div>`;
    }
}

function loadStudentProfile(email) {
    const db = getDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        showScreen('loginScreen');
        return;
    }

    const infoContainer = document.getElementById('student-profile-info');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-gray-700 border-2 border-red-600 overflow-hidden relative">
                <img src="${user.photo}" class="w-full h-full object-cover">
            </div>
            <div class="flex-grow">
                <h2 class="text-white font-black text-xl leading-none uppercase italic">${user.name}</h2>
                <div class="flex items-center gap-2 mt-1">
                     <span class="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded italic">ELITE ATLETA</span>
                </div>
            </div>
        `;
    }

    const buttonsContainer = document.getElementById('student-profile-buttons');
    if (buttonsContainer) {
        buttonsContainer.innerHTML = `
            <button onclick="window.loadTrainingScreen('A')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-dumbbell text-2xl text-gray-400"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Treino A</span>
            </button>
            <button onclick="window.loadTrainingScreen('B')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-dumbbell text-2xl text-gray-400"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Treino B</span>
            </button>
            <button onclick="window.showScreen('aiAnalysisScreen')" class="metal-btn-highlight p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-robot text-2xl text-red-500"></i>
                <span class="text-xs font-bold text-red-500 uppercase">AB Coach</span>
            </button>
            <button onclick="alert('GPS Outdoor Offline')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-map-marker-alt text-2xl text-gray-400"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Outdoor</span>
            </button>
        `;
    }

    renderCalendar(currentCalendarDate);
    showScreen('studentProfileScreen');
}

async function handleLogin(e) {
    e.preventDefault();
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const loginBtn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');
    
    const email = emailInput.value.trim().toLowerCase();
    const originalBtnText = loginBtn.textContent;

    // Reset UI
    errorDiv.textContent = "";
    emailInput.classList.remove('error-shake');

    // Basic Validation
    if (!email) {
        showLoginError("Por favor, informe seu e-mail.");
        return;
    }

    if (!validateEmail(email)) {
        showLoginError("Formato de e-mail inválido.");
        return;
    }

    // Set Loading State
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> VERIFICANDO...';
    loginBtn.classList.add('opacity-75');

    // Simulate Network/Processing Delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const db = getDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === email);

    if (user) {
        setCurrentUser(email);
        loadStudentProfile(email);
    } else {
        showLoginError("Acesso negado: aluno não registrado.");
        emailInput.classList.add('error-shake');
        
        // Reset Button
        loginBtn.disabled = false;
        loginBtn.textContent = originalBtnText;
        loginBtn.classList.remove('opacity-75');
    }
}

function showLoginError(msg) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = msg;
    errorDiv.classList.add('text-red-500', 'animate-pulse');
    setTimeout(() => {
        errorDiv.classList.remove('animate-pulse');
    }, 2000);
}

window.loadTrainingScreen = (type) => {
    const db = getDatabase();
    const plan = db.trainingPlans[`treinos${type}`];
    const container = document.getElementById('training-content-wrapper');
    const titleEl = document.getElementById('training-title');
    
    if (titleEl) titleEl.textContent = `WORKOUT ${type}`;

    if (container) {
        container.innerHTML = plan.map((ex, i) => `
            <div class="metal-card-exercise flex items-center gap-4">
                <img src="${ex.img}" class="w-20 h-20 rounded-lg object-cover border border-gray-400">
                <div class="flex-grow">
                    <h3 class="font-black text-sm uppercase text-black italic">${i + 1}. ${ex.name}</h3>
                    <div class="flex gap-3 mt-2 text-[10px] font-black text-gray-700">
                        <span class="bg-gray-300 px-2 py-1 rounded">SETS: ${ex.sets}</span>
                        <span class="bg-gray-300 px-2 py-1 rounded">REPS: ${ex.reps}</span>
                        <span class="bg-red-600 text-white px-2 py-1 rounded">LOAD: ${ex.carga}KG</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    const startTime = new Date();
    workoutTimerInterval = setInterval(() => {
        const diff = new Date(new Date() - startTime);
        const timerEl = document.getElementById('workout-timer');
        if (timerEl) timerEl.textContent = diff.toISOString().substr(11, 8);
    }, 1000);

    showScreen('trainingScreen');
};

// --- INITIALIZATION ---
function initApp() {
    console.log("Initializing ABFIT App...");
    
    if (!localStorage.getItem(STORAGE_KEYS.DATABASE)) {
        saveDatabase(defaultDatabase);
    }

    const email = getCurrentUser();
    if (email) {
        loadStudentProfile(email);
    } else {
        showScreen('loginScreen');
    }

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Month Navigation
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar(currentCalendarDate);
    });

    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar(currentCalendarDate);
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        location.reload();
    });

    window.isAppLoaded = true;
    if (typeof feather !== 'undefined') feather.replace();
}

window.showScreen = showScreen;

// Executa o init
initApp();
