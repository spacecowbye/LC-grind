chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startMonitoring") {
        console.log("Received message to start monitoring for the submit button.");

        // Example: Start looking for the submit button
        const observer = new MutationObserver(() => {
            const submitButton = document.querySelector("button[type='submit']");
            if (submitButton) {
                console.log("Submit button found!");
                observer.disconnect(); // Stop observing
                // Add logic to handle submit button click
                submitButton.addEventListener("click", () => {
                    console.log("Submit button clicked. Disabling restrictions...");
                    // Add your logic to turn off the restriction
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
});

