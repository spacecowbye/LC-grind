const questionContainer = document.querySelector('.question-container');
const difficultyContainer = document.querySelector('.difficulty-value');
const solveButton = document.querySelector('.solve-button')
const shutdownExtension = document.querySelector('.turn-off-button');

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

    solveButton.setAttribute("href",fullLink);
    solveButton.setAttribute("target", "_blank");

  } catch (error) {
    console.error("Error fetching problem from local storage:", error);
    questionContainer.innerHTML = `<p>Failed to load problem details.</p>`;
  }
}

shutdownExtension.addEventListener("click",()=>{
    
    try {
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1],
        })
        console.log("Redirect rule updated")
      } catch (error) {
        console.error("Error updating redirect rule:", error)
      }
      console.log("Extension shut down");
})
getProblemFromStorage();
