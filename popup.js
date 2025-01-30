const questionContainer = document.querySelector('.question-container');
const difficultyContainer = document.querySelector('.difficulty-value');
const solveButton = document.querySelector('.solve-button');

async function getProblemFromStorage() {
    try {
        let result = await chrome.storage.local.get('problem');

        const problemDetails = result.problem;
        const { title, difficulty, fullLink } = problemDetails;

        // Update the question section
        questionContainer.innerHTML = `
            <h2><strong>Title:</strong> ${title}</h2>
        `;

        // Style difficulty based on value
        let difficultyColor;
        switch (difficulty) {
            case "Easy":
                difficultyColor = "#4caf50"; // Cool green shade
                break;
            case "Medium":
                difficultyColor = "#ffc107"; // Muted yellow
                break;
            case "Hard":
                difficultyColor = "#ff5252"; // Bright red
                break;
            default:
                difficultyColor = "#b0b0b0"; // Default gray for unknown
        }

        difficultyContainer.innerHTML = `
            <p style="color: ${difficultyColor}; font-size: 1.2rem; font-weight: 600; display: flex; justify-content: center;">
                ${difficulty}
            </p>
        `;

        solveButton.setAttribute("href", fullLink);
        solveButton.setAttribute("target", "_blank");
    } catch (error) {
        console.error("Error fetching problem from local storage:", error);
        questionContainer.innerHTML = `<p>Failed to load problem details.</p>`;
    }
}

// Load streak data
async function loadStreakData() {
    try {
        const { currentStreak = 0, maxStreak = 0 } = await chrome.storage.local.get(['currentStreak', 'maxStreak']);
        
        document.querySelector('.streak-box.current .streak-value').textContent = currentStreak;
        document.querySelector('.streak-box.max .streak-value').textContent = maxStreak;
    } catch (error) {
        console.error("Error loading streak data:", error);
    }
}

function handleRedirectToggle() {
    const redirectCheckbox = document.getElementById("redirectCheckbox");

    // Load the saved state from storage when the script runs
    chrome.storage.local.get("isRedirectEnabled", (result) => {
        redirectCheckbox.checked = result.isRedirectEnabled ?? true; // Default to true if not set
    });

    // Listen for changes and update storage
    redirectCheckbox.addEventListener("change", async () => {
        const isChecked = redirectCheckbox.checked;
        await chrome.storage.local.set({ isRedirectEnabled: isChecked });

        // Send a message when the toggle is changed
        chrome.runtime.sendMessage({
            action: isChecked ? "redirectTurnedOn" : "redirectTurnedOff"
        });

        console.log("Redirect setting updated:", isChecked);
    });

}


// Initialize everything
getProblemFromStorage();
loadStreakData();
handleRedirectToggle();
