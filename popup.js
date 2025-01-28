const questionContainer = document.querySelector('.question-container');
const difficultyContainer = document.querySelector('.difficulty-value');
const solveButton = document.querySelector('.solve-button');
const extensionToggle = document.getElementById('extensionToggle');
const toggleLabel = document.querySelector('.toggle-label');

async function getProblemFromStorage() {
    try {
        let result = await chrome.storage.local.get('problem');
        console.log("Retrieved problem from local storage:", result.problem);

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

async function updateToggleState() {
    try {
        let { isRedirectEnabled } = await chrome.storage.local.get('isRedirectEnabled');
        if (isRedirectEnabled === undefined) isRedirectEnabled = true; // Default state if not set
        
        // Invert the checkbox state to match desired behavior
        extensionToggle.checked = !isRedirectEnabled;
        
        // Update label based on redirect state, not checkbox state
        toggleLabel.textContent = isRedirectEnabled ? 'Redirect Enabled' : 'Redirect Disabled';
    } catch (error) {
        console.error("Error updating toggle state:", error);
    }
}

// Event listener for toggle changes
extensionToggle.addEventListener("change", async function () {
    try {
        // Invert the checkbox state to get the redirect state
        const newState = !extensionToggle.checked;
        
        // First update the storage and rules
        await chrome.runtime.sendMessage({action: "redirectRuleChanged"});
        await chrome.storage.local.set({ isRedirectEnabled: newState });
        console.log(`Extension redirect state set to: ${newState}`);
        
        // Then update the UI based on redirect state, not checkbox state
        toggleLabel.textContent = newState ? 'Redirect Enabled' : 'Redirect Disabled';
    } catch (error) {
        console.error("Error toggling extension state:", error);
        // Revert toggle state if there was an error
        extensionToggle.checked = !extensionToggle.checked;
    }
});

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

getProblemFromStorage();
updateToggleState();
loadStreakData();