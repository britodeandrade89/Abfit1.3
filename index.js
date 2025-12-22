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
    console.log("Firebase initialized");
} catch (e) {
    console.warn("Firebase Init Error (Check API Key):", e);
}

// --- CONFIGURATION ---
const GRAVITY = 9.81;

// Timer Variables
let workoutTimerInterval = null;
let workoutStartTime = null;

// Tracking
let currentActivityType = "";
let currentCalendarDate = new Date();

// --- DATABASE ---
const defaultDatabase = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', completedWorkouts: [] },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'marcelly.jpg', completedWorkouts: [] }
    ],
    trainingPlans: { treinosA: {}, treinosB: {} },
    completedWorkouts: {}
};

const STORAGE_KEYS = {
    DATABASE: 'abfit_database_v9',
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

// --- UI FUNCTIONS ---
function showScreen(screenId) {
    console.log(`Navigating to: ${screenId}`);
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => { 
        s.classList.add('hidden');
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    const target = document.getElementById(screenId);
    if (target) { 
        target.classList.remove('hidden');
        target.classList.add('active');
        target.style.display = 'block';
    }
    window.scrollTo(0, 0);
}

function loadStudentProfile(email) {
    const db = getDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        console.error("User not found for profile load:", email);
        return;
    }

    const infoContainer = document.getElementById('student-profile-info');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-gray-700 border-2 border-red-600 overflow-hidden relative">
                <img src="${user.photo || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
            </div>
            <div>
                <h2 class="text-white font-bold text-xl leading-none">${user.name}</h2>
                <p class="text-gray-400 text-xs mt-1">Atleta de Alta Performance</p>
                <div class="flex items-center gap-2 mt-1">
                     <span class="bg-red-600/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-600/30">PRO</span>
                </div>
            </div>
        `;
    }

    const buttonsContainer = document.getElementById('student-profile-buttons');
    if (buttonsContainer) {
        buttonsContainer.innerHTML = `
            <button onclick="loadTrainingScreen('A')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-dumbbell text-2xl text-gray-400"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Treino A</span>
            </button>
            <button onclick="loadTrainingScreen('B')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-dumbbell text-2xl text-gray-400"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Treino B</span>
            </button>
            <button onclick="showScreen('outdoorSelectionScreen')" class="metal-btn p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-person-running text-2xl text-gray-400"></i>
                <span class="text-xs font-bold text-gray-300 uppercase">Outdoor</span>
            </button>
             <button onclick="loadAIAnalysisScreen()" class="metal-btn-highlight p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                <i class="fas fa-robot text-2xl text-red-500"></i>
                <span class="text-xs font-bold text-red-500 uppercase">AB Coach</span>
            </button>
        `;
    }

    renderCalendar(currentCalendarDate);
    showScreen('studentProfileScreen');
}

// Placeholder for remaining logic (Calendar, Training, etc.)
function renderCalendar(date) { /* Logic remains similar to previous version */ }
window.loadTrainingScreen = (type) => { console.log("Loading Training", type); /* Implementation logic */ };

// --- BOOTSTRAP ---
// Initialize Database on load
if (!localStorage.getItem(STORAGE_KEYS.DATABASE)) {
    saveDatabase(defaultDatabase);
}

// User Session Check
const userEmail = getCurrentUser();
if (userEmail) {
    const db = getDatabase();
    if (db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase())) {
        loadStudentProfile(userEmail);
    } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        showScreen('loginScreen');
    }
} else {
    showScreen('loginScreen');
}

// Login Form Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email');
        const errorDiv = document.getElementById('login-error');
        const email = emailInput.value.trim().toLowerCase();
        
        console.log("Login attempt with:", email);
        const db = getDatabase();
        const user = db.users.find(u => u.email.toLowerCase() === email);

        if (user) {
            setCurrentUser(email);
            loadStudentProfile(email);
        } else {
            errorDiv.textContent = "E-mail não encontrado na base de alunos.";
            setTimeout(() => { errorDiv.textContent = ""; }, 3000);
        }
    });
}

// Global Event Listeners
document.getElementById('logout-btn')?.addEventListener('click', () => { 
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); 
    location.reload(); 
});

window.showScreen = showScreen;
window.loadStudentProfile = loadStudentProfile;
window.isAppLoaded = true;

if (typeof feather !== 'undefined') feather.replace();