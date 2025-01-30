
if (typeof window._leetcodeHelperObserver === 'undefined') {
  window._leetcodeHelperObserver = new MutationObserver((mutations) => {
      const submitButton = document.querySelector('[data-e2e-locator="console-submit-button"]');

      if (submitButton && !submitButton._hasClickListener) {
          submitButton._hasClickListener = true;
          submitButton.addEventListener("click", (event) => {
              console.log("Submit button clicked!");
              chrome.runtime.sendMessage({ action: "userClickedSubmit" });
          });

          window._leetcodeHelperObserver.disconnect(); 
      }
  });

  // Start observing the entire document
  window._leetcodeHelperObserver.observe(document.body, {
      childList: true,
      subtree: true
  });
}