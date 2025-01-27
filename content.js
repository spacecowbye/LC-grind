let observer = new MutationObserver((mutations) => {
    const submitButton = document.querySelector('[data-e2e-locator="console-submit-button"]');

    if (submitButton) {

      submitButton.addEventListener("click", (event) => {
        console.log("Submit button clicked!");
        chrome.runtime.sendMessage({ action: "userClickedSubmit" })

      });

      observer.disconnect(); // Stop observing once button is found
    }
  });

  // Start observing the entire document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  