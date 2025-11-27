document.addEventListener('DOMContentLoaded', () => {
    // --- Timer Defaults ---
    const DEFAULT_SETTINGS = {
        pomodoro: 25, 
        shortBreak: 5,  
        longBreak: 15, 
        pomodorosBeforeLong: 4,
    };

    const alarm1 = new Audio('alarm.mp3');
    const alarm2 = new Audio('alarm2.mp3');

    // --- DOM Elements ---
    const goalInput = document.getElementById('goal-input');
    const timerDisplay = document.getElementById('timer-display');
    const stateLabel = document.getElementById('state-label'); 
    const repsCountEl = document.getElementById('reps-count'); 
    const startPauseBtn = document.getElementById('start-pause-btn');

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

    function adjustGoalInputHeight() {
        
        goalInput.style.height = 'auto'; 
        goalInput.style.height = goalInput.scrollHeight + 'px'; 
    }

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
        let shouldContinueRunning = false;

        if (storedState) {
            const state = JSON.parse(storedState);
            totalSeconds = state.totalSeconds;
            currentMode = state.currentMode;
            repsCompleted = state.repsCompleted;
            shouldContinueRunning = state.isRunning;

            if (totalSeconds <= 0 && currentMode === 'longBreak' && repsCompleted > 0 && repsCompleted % settings.pomodorosBeforeLong === 0) {
                 completeCycle(false); 
                 isRunning = false;
            } else if (totalSeconds <= 0) {
                 initTimer(currentMode, false);
                 isRunning = false; 
            } else {
                initTimer(currentMode, true);
                isRunning = shouldContinueRunning;
            }
        } else {
            initTimer('pomodoro');
        }
    }

    function initTimer(mode, keepTime = false) {
        currentMode = mode;

        stateLabel.textContent = 
            mode === 'pomodoro' ? 'POMODORO' :
            mode === 'shortBreak' ? 'SHORT BREAK' :
            'LONG BREAK';

        if (!keepTime || totalSeconds <= 0) {
            let durationMinutes;
            if (mode === 'pomodoro') {
                durationMinutes = settings.pomodoro;
            } else if (mode === 'shortBreak') {
                durationMinutes = settings.shortBreak;
            } else {
                durationMinutes = settings.longBreak;
            }
            totalSeconds = durationMinutes * 60;
        }

        updateDisplay();
        saveState(); 
    }

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
        } else {
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

    function showModal(modalEl) { modalEl.style.display = 'flex'; }
    function hideModal(modalEl) { modalEl.style.display = 'none'; }
    function resetSettingsToDefaults() {
        pomodoroDurationInput.value = DEFAULT_SETTINGS.pomodoro;
        smallBreakInput.value = DEFAULT_SETTINGS.shortBreak;
        pomodorosBeforeLongInput.value = DEFAULT_SETTINGS.pomodorosBeforeLong;
        longBreakInput.value = DEFAULT_SETTINGS.longBreak;
    }


    // --- Event Listeners ---

    goalInput.addEventListener('input', () => {
        adjustGoalInputHeight();
        saveState();
    });

    // 1. Start/Pause Button
    startPauseBtn.addEventListener('click', () => {
        isRunning ? pauseTimer() : startTimer();
    });

    // 2. Reset Button (opens modal)
    document.getElementById('reset-btn').addEventListener('click', () => {
        pauseTimer(); 
        showModal(resetModal);
    });

    // 3. Confirm Reset
    confirmResetBtn.addEventListener('click', () => {
        resetTimer();
        hideModal(resetModal);
    });

    // 4. Cancel Reset
    cancelResetBtn.addEventListener('click', () => {
        hideModal(resetModal);
    });

    // 5. Settings Button (opens modal)
    document.getElementById('settings-btn').addEventListener('click', () => {
        pauseTimer(); 
        showModal(settingsModal);
    });

    // 6. Reset Settings Button (Icon)
    resetSettingsBtn.addEventListener('click', resetSettingsToDefaults);

    // 7. Settings Modal Cross (X) functionality & Cancel button
    settingsModalContent.addEventListener('click', (e) => {
        const rect = settingsModalContent.getBoundingClientRect();
        const padding = 20;
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (clickX > rect.width - padding*2 && clickY < padding*2) {
            loadState(); 
            hideModal(settingsModal);
        }
    });

    // 8. Cancel Settings (via 'Cancel' button)
    cancelSettingsBtn.addEventListener('click', () => {
        loadState(); 
        hideModal(settingsModal);
    });

    // 9. Save Settings
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

    loadState(); 
    
    if (isRunning) {
        startTimer();
    }
});