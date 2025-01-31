function createFailureModal() {
    const failureSayings = [  
        "Expected: 42, Your Output: null. So close!",  
        "Passed 5/5 sample cases! Failed 98/100 hidden cases. Classic.",  
        "Edge cases? Never heard of her.",  
        "Your solution is O(n^n)... but at least it runs!",  
        "Runtime Error? Time to flip burgers.",  
        "Beats 100% of submissions... in memory usage. Congrats?",    
        "Memory Limit Exceeded? Just buy more RAM!",  
        "Brute force worked? Time to buy a lottery ticket.",  
        "Wrong Answer? Yeah, time to switch majors",  
    ];  
    
    
    const randomSaying = failureSayings[Math.floor(Math.random() * failureSayings.length)];

    const modalHTML = `
        <div id="lc-fail-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0, 0, 0, 0.7); z-index: 10000; display: flex; 
            justify-content: center; align-items: center;">
            <div style="background: rgba(50, 10, 10, 0.95); padding: 30px; border-radius: 12px; 
                box-shadow: 0 4px 12px rgba(255, 50, 50, 0.3); max-width: 420px; text-align: center; 
                border: 2px solid #FF3333; font-family: 'Inter', Arial, sans-serif; color: #FF6666;">
                <h2 style="color: #FF3333; margin-bottom: 16px; font-size: 24px; font-weight: bold;">
                    ❌ Submission Failed ❌
                </h2>
                <div id="failure-saying" style="font-size: 16px; font-weight: 500; color: #FFF; margin: 10px 0;">
                    ${randomSaying}
                </div>
                <button id="close-fail-modal" style="background-color: #FF3333; color: white; 
                    border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                    font-size: 16px; font-weight: bold; margin-top: 16px; transition: 0.3s;">
                    Try Again 🔄
                </button>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    document.getElementById('lc-fail-modal').style.display = 'flex';
    
    document.getElementById('close-fail-modal').addEventListener('click', () => {
        document.getElementById('lc-fail-modal').style.display = 'none';
    });
}
