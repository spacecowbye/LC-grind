function createModal(currentStreak) {
    const snarkySayings = [
        "One problem a day, keeps unemployment away",
        "LeetCode today, Lambo tomorrow!",
        "One Pass Solution? More like pass the bottle",
        "Remember: Someone solved this in one line. That someone is not you",
        "Congrats! But can you do it in O(1) time?",
        "You definitely getting that return offer",
        "You definitely won't forget this in an interview ever",
        "hotshot 10x dev loading"
    ];
    
    const randomSaying = snarkySayings[Math.floor(Math.random() * snarkySayings.length)];
    
    const modalHTML = `
        <div id="lc-grind-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0, 0, 0, 0.7); z-index: 10000; display: flex; 
            justify-content: center; align-items: center;">
            <div style="background: rgba(32, 32, 32, 0.95); padding: 30px; border-radius: 12px; 
                box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3); max-width: 420px; text-align: center; 
                border: 2px solid #FFA500; font-family: 'Inter', Arial, sans-serif; color: #FFD700;">
                <h2 style="color: #FFA500; margin-bottom: 16px; font-size: 24px; font-weight: bold;">
                    🚀 Problem Solved! 🚀
                </h2>
                <div id="snarky-saying" style="font-size: 16px; font-weight: 500; color: #FFF; margin: 10px 0;">
                    ${randomSaying}
                </div>
                <div id="streak-info" style="margin: 15px 0; font-size: 18px; font-weight: bold; color: #FFD700;">
                    Current Streak: <span id="current-streak">
                        ${currentStreak}
                    </span>
                </div>
                <button id="close-modal" style="background-color: #FFA500; color: black; 
                    border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                    font-size: 16px; font-weight: bold; margin-top: 16px; transition: 0.3s;">
                    Continue Grinding 🔥
                </button>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    document.getElementById('lc-grind-modal').style.display = 'flex';
    document.addEventListener('click', () => {
        document.getElementById('lc-grind-modal').style.display = 'none';
    });
}
