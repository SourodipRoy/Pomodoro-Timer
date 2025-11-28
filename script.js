document.addEventListener('DOMContentLoaded', () => {
    // --- Timer Defaults ---
    const DEFAULT_SETTINGS = {
        pomodoro: 25, 
        shortBreak: 5,  
        longBreak: 15, 
        pomodorosBeforeLong: 4,
    };

    // --- Audio Elements ---
    const alarm1 = new Audio('alarm.mp3');
    const alarm2 = new Audio('alarm2.mp3');

    // --- DOM Elements ---
    const goalInput = document.getElementById('goal-input');
    // FIX: Changed 'timer-buttondisplay' to 'timer-display' for correct DOM mapping
    const timerDisplay = document.getElementById('timer-display'); 
    const stateLabel = document.getElementById('state-label'); 
    const repsCountEl = document.getElementById('reps-count'); 
    const startPauseBtn = document.getElementById('start-pause-btn');

    // Greeting Elements
    const greetingTextEl = document.getElementById('greeting-text');
    const currentTimeEl = document.getElementById('current-time');
    const currentDateEl = document.getElementById('current-date');

    // --- Modals & Buttons ---
    const resetModal = document.getElementById('reset-modal');
    const confirmResetBtn = document.getElementById('confirm-reset');
    const cancelResetBtn = document.getElementById('cancel-reset');
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalContent = settingsModal.querySelector('.modal-content');
    const cancelSettingsBtn = document.getElementById('cancel-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings-btn'); 

    // --- Settings Inputs ---
    const pomodoroDurationInput = document.getElementById('pomodoro-duration');
    const smallBreakInput = document.getElementById('small-break');
    const pomodorosBeforeLongInput = document.getElementById('pomodoros-before-long');
    const longBreakInput = document.getElementById('long-break');

    // --- Timer State Variables ---
    let settings = {...DEFAULT_SETTINGS}; 
    let currentMode = 'pomodoro'; 
    let totalSeconds = 0; 
    let isRunning = false;
    let intervalId = null;
    let repsCompleted = 0; 
    let lastTickTime = Date.now(); 

    // --- Greeting & Time Logic ---
    /**
     * Updates the greeting based on the hour and displays the current local time/date.
     * This function uses the user's local device time.
     */
    function updateGreeting() {
        const now = new Date();
        const hour = now.getHours();
        let greeting = "";

        // 1. Determine Greeting based on time of day
        // 12am (0) till 4am (3)
        if (hour >= 0 && hour < 4) { 
            greeting = "Late night grind? 🌺";
        } 
        // 4am (4) till 11am (11)
        else if (hour >= 4 && hour < 12) { 
            greeting = "Good morninggg! 🌻";
        } 
        // 12pm (12) till 4pm (16)
        else if (hour >= 12 && hour < 17) { 
            greeting = "Good afternoonnn! 🌼";
        } 
        // 5pm (17) till 11pm (23)
        else { 
            greeting = "Good eveninggg! 🌸";
        }
        greetingTextEl.textContent = greeting;

        // 2. Update Current Time (e.g., 10:30 AM)
        currentTimeEl.textContent = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        });

        // 3. Update Date ({day, date month (in short 3 letters), year})
        // Example: Friday, 28 Nov, 2025
        const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        const dayNum = now.getDate();
        const monthShort = now.toLocaleDateString('en-US', { month: 'short' });
        const year = now.getFullYear();

        currentDateEl.textContent = `${dayName}, ${dayNum} ${monthShort}, ${year}`;
    }

    // Update greeting every second to refresh the clock display
    setInterval(updateGreeting, 1000);
    updateGreeting(); // Initial call


    // --- Goal Input Management ---
    function adjustGoalInputHeight() {
        goalInput.style.height = 'auto'; 
        goalInput.style.height = goalInput.scrollHeight + 'px'; 
    }

    // --- Persistence & Initial Load ---

    function saveState() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        localStorage.setItem('timerState', JSON.stringify({
            totalSeconds,
            currentMode,
            isRunning,
            repsCompleted,
        }));
        localStorage.setItem('goalText', goalInput.value);
    }

    function loadState() {
        goalInput.value = localStorage.getItem('goalText') || '';
        adjustGoalInputHeight();

        const storedSettings = localStorage.getItem('pomodoroSettings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
            pomodoroDurationInput.value = settings.pomodoro;
            smallBreakInput.value = settings.shortBreak;
            pomodorosBeforeLongInput.value = settings.pomodorosBeforeLong;
            longBreakInput.value = settings.longBreak;
        }

        const storedState = localStorage.getItem('timerState');
        if (storedState) {
            const state = JSON.parse(storedState);
            totalSeconds = state.totalSeconds;
            currentMode = state.currentMode;
            repsCompleted = state.repsCompleted;
            let shouldContinueRunning = state.isRunning; 

            if (totalSeconds <= 0 && currentMode === 'longBreak' && repsCompleted > 0 && repsCompleted % settings.pomodorosBeforeLong === 0) {
                 // Full cycle complete (long break ended), reset duration and pause
                 completeCycle(false); 
                 isRunning = false;
            } else if (totalSeconds <= 0) {
                 // Time ran out on a segment, reset duration and pause
                 initTimer(currentMode, false);
                 isRunning = false; 
            } else {
                // Timer was mid-segment when saved
                initTimer(currentMode, true);
                isRunning = shouldContinueRunning; 
            }
        } else {
            // No state saved, initialize default Pomodoro
            initTimer('pomodoro');
        }
    }

    function initTimer(mode, keepTime = false) {
        currentMode = mode;

        stateLabel.textContent = 
            mode === 'pomodoro' ? '🍅 POMODORO 🍅' :
            mode === 'shortBreak' ? '😛 SHORT BREAK 😛' :
            '🎀 LONG BREAK 🎀';

        if (!keepTime || totalSeconds <= 0) {
            let durationMinutes;
            if (mode === 'pomodoro') {
                durationMinutes = settings.pomodoro;
            } else if (mode === 'shortBreak') {
                durationMinutes = settings.shortBreak;
            } else { // longBreak
                durationMinutes = settings.longBreak;
            }
            totalSeconds = durationMinutes * 60;
        }

        updateDisplay();
        saveState(); 
    }

    // --- Utility Functions ---

    function formatTime(seconds) {
        const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
        const remainingSeconds = String(seconds % 60).padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    }

    function updateDisplay() {
        timerDisplay.textContent = formatTime(totalSeconds);
        const currentSetRep = repsCompleted % settings.pomodorosBeforeLong;
        repsCountEl.textContent = `${currentSetRep} / ${settings.pomodorosBeforeLong}`;
    }

    // --- Sound Logic ---

    function playAlarm(modeThatJustEnded) {
        if (modeThatJustEnded === 'pomodoro' || modeThatJustEnded === 'shortBreak') {
            alarm1.load(); 
            alarm1.play().catch(e => console.error("Alarm playback error:", e));

            setTimeout(() => { 
                 alarm1.load(); 
                 alarm1.play().catch(e => console.error("Alarm playback error:", e));
            }, 100); 

        } else if (modeThatJustEnded === 'longBreak') {
            alarm1.load();
            alarm1.play().catch(e => console.error("Alarm playback error:", e));

            setTimeout(() => { 
                alarm2.load(); 
                alarm2.play().catch(e => console.error("Alarm2 playback error:", e));
            }, 100); 
        }
    }

    function completeCycle(resetReps = true) {
        pauseTimer(); 
        totalSeconds = 0;
        if (resetReps) repsCompleted = 0;

        updateDisplay();
        stateLabel.textContent = 'CYCLE COMPLETE';

        if (resetReps) localStorage.removeItem('timerState');
    }

    // --- Main Timer Logic ---

    function timeUp() {
        totalSeconds = 0; 
        pauseTimer(); 
        playAlarm(currentMode); 

        if (currentMode === 'pomodoro') {
            repsCompleted++;
            if (repsCompleted % settings.pomodorosBeforeLong === 0) {
                initTimer('longBreak');
            } else {
                initTimer('shortBreak');
            }
        } else if (currentMode === 'longBreak') { 
            completeCycle();
            return; 
        } else { // shortBreak
            initTimer('pomodoro');
        }

        startTimer();
    }

    function tick() {
        const now = Date.now();
        const elapsedMs = now - lastTickTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (elapsedSeconds < 1) return;

        totalSeconds -= elapsedSeconds;
        lastTickTime += elapsedSeconds * 1000;

        if (totalSeconds > 0) {
            updateDisplay();
            saveState(); 
        } else {
            totalSeconds = 0; 
            timeUp();
        }
    }

    function startTimer() {
        if (isRunning) return; 
        isRunning = true;

        startPauseBtn.innerHTML = '<i class="fas fa-pause"></i> PAUSE';
        lastTickTime = Date.now(); 

        intervalId = setInterval(tick, 50); 
        saveState();
    }

    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;

        startPauseBtn.innerHTML = '<i class="fas fa-play"></i> START';

        clearInterval(intervalId);
        intervalId = null;
        saveState();
    }

    function resetTimer() {
        pauseTimer();
        repsCompleted = 0;
        localStorage.removeItem('timerState'); 
        initTimer('pomodoro'); 
    }

    // --- Modal Handlers (Helper functions) ---
    function showModal(modalEl) { modalEl.style.display = 'flex'; }
    function hideModal(modalEl) { modalEl.style.display = 'none'; }


    // --- Event Listeners ---

    goalInput.addEventListener('input', () => {
        adjustGoalInputHeight();
        saveState();
    });

    startPauseBtn.addEventListener('click', () => {
        isRunning ? pauseTimer() : startTimer();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        pauseTimer(); 
        showModal(resetModal);
    });

    confirmResetBtn.addEventListener('click', () => {
        resetTimer();
        hideModal(resetModal);
    });

    cancelResetBtn.addEventListener('click', () => {
        hideModal(resetModal);
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
        pauseTimer(); 
        showModal(settingsModal);
    });

    resetSettingsBtn.addEventListener('click', () => {
        pomodoroDurationInput.value = DEFAULT_SETTINGS.pomodoro;
        smallBreakInput.value = DEFAULT_SETTINGS.shortBreak;
        pomodorosBeforeLongInput.value = DEFAULT_SETTINGS.pomodorosBeforeLong;
        longBreakInput.value = DEFAULT_SETTINGS.longBreak;
    });

    settingsModalContent.addEventListener('click', (e) => {
        // Simple way to handle click on the close area (X is styled via CSS content)
        const rect = settingsModalContent.getBoundingClientRect();
        const padding = 20;
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (clickX > rect.width - padding*2 && clickY < padding*2) {
            // Restore input values 
            loadState(); 
            hideModal(settingsModal);
        }
    });

    cancelSettingsBtn.addEventListener('click', () => {
        // Restore input values
        loadState(); 
        hideModal(settingsModal);
    });

    saveSettingsBtn.addEventListener('click', () => {
        const newPomodoro = parseInt(pomodoroDurationInput.value, 10);
        const newShortBreak = parseInt(smallBreakInput.value, 10);
        const newPomodorosBeforeLong = parseInt(pomodorosBeforeLongInput.value, 10);
        const newLongBreak = parseInt(longBreakInput.value, 10);

        if (isNaN(newPomodoro) || newPomodoro < 1 ||
            isNaN(newShortBreak) || newShortBreak < 1 ||
            isNaN(newPomodorosBeforeLong) || newPomodorosBeforeLong < 1 ||
            isNaN(newLongBreak) || newLongBreak < 1) {

            console.error("Please enter valid, positive numbers for all fields."); 
            return;
        }

        settings.pomodoro = newPomodoro;
        settings.shortBreak = newShortBreak;
        settings.longBreak = newLongBreak;
        settings.pomodorosBeforeLong = newPomodorosBeforeLong;

        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));

        if (!isRunning) {
            initTimer(currentMode, false); 
        }

        hideModal(settingsModal);
    });

    // --- Initialization ---
    loadState(); 

    if (isRunning) {
        startTimer();
    }
});