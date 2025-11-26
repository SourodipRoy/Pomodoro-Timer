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
    let lastTickTime = Date.now(); // Used for background timing robustness

    // --- Persistence & Initial Load ---

    /**
     * Saves the current timer state to localStorage.
     */
    function saveState() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        localStorage.setItem('timerState', JSON.stringify({
            totalSeconds,
            currentMode,
            isRunning,
            repsCompleted,
        }));
    }

    /**
     * Loads settings and state from localStorage.
     */
    function loadState() {
        const storedSettings = localStorage.getItem('pomodoroSettings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
            // Apply loaded settings to inputs
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
            isRunning = state.isRunning; 

            if (totalSeconds <= 0 && currentMode === 'longBreak' && repsCompleted > 0 && repsCompleted % settings.pomodorosBeforeLong === 0) {
                 // Special case: Timer was completed and saved at 00:00 after long break
                 completeCycle(false); // Initialize UI to completed state without resetting reps
                 isRunning = false;
            } else if (totalSeconds <= 0) {
                 // Time ran out on a segment, reset duration and pause
                 initTimer(currentMode, false);
                 isRunning = false; 
            } else {
                initTimer(currentMode, true);
            }
        } else {
            // No state saved, initialize default Pomodoro
            initTimer('pomodoro');
        }
    }

    /**
     * Initializes the timer for a new cycle mode and updates the label.
     * @param {string} mode - 'pomodoro', 'shortBreak', or 'longBreak'
     * @param {boolean} keepTime - If true, keeps existing totalSeconds; otherwise resets to full duration.
     */
    function initTimer(mode, keepTime = false) {
        currentMode = mode;

        // Update the state label
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
            } else { // longBreak
                durationMinutes = settings.longBreak;
            }
            totalSeconds = durationMinutes * 60;
        }

        updateDisplay();
        saveState(); 
    }

    // --- Utility Functions ---

    /**
     * Formats total seconds into MM:SS string.
     */
    function formatTime(seconds) {
        const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
        const remainingSeconds = String(seconds % 60).padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    }

    /**
     * Updates the timer display and rep count display (X/N).
     */
    function updateDisplay() {
        timerDisplay.textContent = formatTime(totalSeconds);

        // Calculate reps completed in the current set (0 to N-1)
        const currentSetRep = repsCompleted % settings.pomodorosBeforeLong;

        repsCountEl.textContent = `${currentSetRep} / ${settings.pomodorosBeforeLong}`;
    }

    // --- Sound Logic ---

    /**
     * Plays the alarm sound(s) based on the completed cycle with no delay.
     * @param {string} modeThatJustEnded - 'pomodoro', 'shortBreak', or 'longBreak'
     */
    function playAlarm(modeThatJustEnded) {
        if (modeThatJustEnded === 'pomodoro' || modeThatJustEnded === 'shortBreak') {
            // Play alarm.mp3 2 times immediately
            alarm1.currentTime = 0;
            alarm1.play();

            // Wait briefly for the first sound to start playing before triggering the second
            setTimeout(() => {
                 alarm1.currentTime = 0;
                 alarm1.play();
            }, 50); 

        } else if (modeThatJustEnded === 'longBreak') {
            // Play alarm.mp3 1 time, then alarm2.mp3 1 time immediately
            alarm1.currentTime = 0;
            alarm1.play();

            // Wait briefly for the first sound to start playing before triggering the second
            setTimeout(() => {
                alarm2.currentTime = 0;
                alarm2.play();
            }, 50); 
        }
    }

    /**
     * Stops the timer and resets the display/reps after a full cycle.
     */
    function completeCycle(resetReps = true) {
        pauseTimer(); 
        totalSeconds = 0;
        if (resetReps) repsCompleted = 0;

        updateDisplay();
        stateLabel.textContent = 'POMODOROS COMPLETED';

        // Ensure state is cleared only if fully reset
        if (resetReps) localStorage.removeItem('timerState');
    }

    // --- Main Timer Logic ---

    /**
     * Handles the cycle transition when time is up.
     */
    function timeUp() {
        totalSeconds = 0; // Ensure it displays 00:00 temporarily
        pauseTimer(); 
        playAlarm(currentMode); 

        if (currentMode === 'pomodoro') {
            repsCompleted++;

            // Check for Long Break
            if (repsCompleted % settings.pomodorosBeforeLong === 0) {
                initTimer('longBreak');
            } else {
                initTimer('shortBreak');
            }
        } else if (currentMode === 'longBreak') { 
            // Stop after long break
            completeCycle();
            return; // Exit without starting next segment
        } else { // shortBreak
            initTimer('pomodoro');
        }

        // Auto-start the next segment
        startTimer();
    }

    /**
     * Decrements the timer every tick, accounting for browser throttling.
     */
    function tick() {
        const now = Date.now();
        // Calculate actual elapsed milliseconds since last tick
        const elapsedMs = now - lastTickTime;

        // Calculate actual elapsed seconds (floored)
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        // If less than a second has passed, wait for the next tick
        if (elapsedSeconds < 1) return;

        // Advance timer by the actual elapsed seconds
        totalSeconds -= elapsedSeconds;

        // Reset last tick time, accounting for the consumed time
        // E.g., if 1.5s passed, elapsedSeconds is 1. We only update lastTickTime by 1000ms.
        lastTickTime += elapsedSeconds * 1000;

        if (totalSeconds > 0) {
            updateDisplay();
            saveState(); 
        } else {
            // Ensure totalSeconds is not negative before calling timeUp
            totalSeconds = 0; 
            timeUp();
        }
    }

    /**
     * Starts the timer.
     */
    function startTimer() {
        if (isRunning) return; 
        isRunning = true;

        startPauseBtn.innerHTML = '<i class="fas fa-pause"></i> PAUSE';

        // Initialize last tick time when timer starts
        lastTickTime = Date.now(); 

        // Use a small interval (50ms) to ensure responsiveness, 
        // while the actual time decrease is calculated inside tick()
        intervalId = setInterval(tick, 50); 
        saveState();
    }

    /**
     * Pauses the timer.
     */
    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;

        startPauseBtn.innerHTML = '<i class="fas fa-play"></i> START';

        clearInterval(intervalId);
        intervalId = null;
        saveState();
    }

    /**
     * Resets the timer and reps to initial state.
     */
    function resetTimer() {
        pauseTimer();
        repsCompleted = 0;
        localStorage.removeItem('timerState'); 
        initTimer('pomodoro'); 
    }

    // --- Modal Handlers ---

    function showModal(modalEl) {
        modalEl.style.display = 'flex';
    }

    function hideModal(modalEl) {
        modalEl.style.display = 'none';
    }

    /**
     * Resets settings inputs to default values.
     */
    function resetSettingsToDefaults() {
        pomodoroDurationInput.value = DEFAULT_SETTINGS.pomodoro;
        smallBreakInput.value = DEFAULT_SETTINGS.shortBreak;
        pomodorosBeforeLongInput.value = DEFAULT_SETTINGS.pomodorosBeforeLong;
        longBreakInput.value = DEFAULT_SETTINGS.longBreak;
    }

    // --- Event Listeners ---

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

    // 7. Click handler for the 'X' (cross icon) in the Settings Modal
    settingsModalContent.addEventListener('click', (e) => {
        const rect = settingsModalContent.getBoundingClientRect();
        const padding = 20;
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (clickX > rect.width - padding*2 && clickY < padding*2) {
            // Restore input values (cancel unsaved settings)
            loadState(); 
            hideModal(settingsModal);
        }
    });

    // 8. Cancel Settings (via 'Cancel' button)
    cancelSettingsBtn.addEventListener('click', () => {
        // Restore input values from currently saved settings (cancel unsaved changes)
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

        // Re-initialize timer display with new durations if paused
        if (!isRunning) {
            initTimer(currentMode, false); // Force update to new duration
        }

        hideModal(settingsModal);
    });

    // --- Initialization ---
    loadState(); 

    // Auto-start timer if it was running before refresh
    if (isRunning) {
        startTimer();
    }
});

