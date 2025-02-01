const LEETCODE_URL = "https://leetcode.com";
const RULE_ID = 1;

const isLeetcodeUrl = (url) => {
  return url.includes(LEETCODE_URL);
};

const isLeetcodeSubmitUrl = (url) => {
  return isLeetcodeUrl(url) && url.includes("submissions");
};

const userState = {
  potd_solved: false,
  problem: {
    url: undefined,
    title: undefined,
    difficulty: undefined,
  },
  lastSubmissionDate: new Date(0),
  submitListenerActive: true,
};

function onMessageReceived(message, sender, sendResponse) {
  switch (message.action) {
    case "redirectTurnedOn":
      handleRedirectRule();
      break;
    case "redirectTurnedOff":
      handleRedirectRule();
      break;
    case "userClickedSubmit":
      console.log("User clicked submit, adding listener");
      userState.submitListenerActive = true;
      chrome.webRequest.onCompleted.addListener(checkIfUserSolvedProblem, {
        urls: ["*://leetcode.com/submissions/detail/*/check/"],
      });
      break;
    default:
      console.warn("Unknown message action:", message.action);
  }
}

async function getLeetCodePOTD() {
  const query = {
    query: `
            query questionOfToday {
                activeDailyCodingChallengeQuestion {
                    date
                    userStatus
                    link
                    question {
                        acRate
                        difficulty
                        freqBar
                        frontendQuestionId: questionFrontendId
                        isFavor
                        paidOnly: isPaidOnly
                        status
                        title
                        titleSlug
                        hasVideoSolution
                        hasSolution
                        topicTags {
                            name
                            id
                            slug
                        }
                    }
                }
            }
            `,
  };

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
      },
      body: JSON.stringify(query),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch POTD:", error);
    return null;
  }
}

async function setRedirectRule(url) {
  const redirectRule = {
    id: RULE_ID, // which is 1
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url },
    },
    condition: {
      urlFilter: "*://*/*",
      excludedInitiatorDomains: [
        "leetcode.com",
        "www.leetcode.com",
        "example.com",
      ],
      resourceTypes: ["main_frame"],
    },
  };

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [redirectRule],
    });

    console.log("Redirect rule updated successfully to:", url);
  } catch (error) {
    console.error("Error updating redirect rule:", error);
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID],
        addRules: [redirectRule],
      });
      console.log("Redirect rule updated on second attempt");
    } catch (secondError) {
      console.error("Failed to update rule on second attempt:", secondError);
    }
  }
}

const injectSuccessModal = async (tabId) => {
  const injectedScripts = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => Boolean(window._successModalInjected),
  });

  if (!injectedScripts[0].result) {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["successModal.js"],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        window._successModalInjected = true;
      },
    });
  }

  const { currentStreak = 0 } = await chrome.storage.local.get("currentStreak");
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (streak) => {
      createModal(streak);
    },
    args: [currentStreak],
  });
};

const injectFailureModal = async (tabId) => {
  const injectedScripts = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => Boolean(window._failureModalInjected),
  });

  if (!injectedScripts[0].result) {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["failureModal.js"],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        window._failureModalInjected = true;
      },
    });
  }

  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      createFailureModal();
    },
  });
};

function updateUserState(title, fullLink, difficulty) {
  userState.potd_solved = false;
  userState.problem.difficulty = difficulty;
  userState.problem.title = title;
  userState.problem.url = fullLink;
}
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    isLeetcodeUrl(tab.url) &&
    !isLeetcodeSubmitUrl(tab.url)
  ) {
    // Checking if script is already injected
    const injectedScripts = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => Boolean(window._scriptInjected),
    });

    if (!injectedScripts[0].result) {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });

      // Set a flag in the page context
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          window._scriptInjected = true;
        },
      });

      console.log("Content script injected on LeetCode problem page.");
    }
  }
});

const checkIfUserSolvedProblem = async (details) => {
  if (userState.potd_solved) {
    return;
  }

  let currentURL = "";
  try {
    const [activeTab] = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    currentURL = activeTab.url;
    console.log(currentURL);
  } catch (error) {
    console.error("Error getting active tab:", error);
    return;
  }
  const problemUrl = userState.problem.url;
  const sameUrl =
    problemUrl === currentURL || problemUrl + "description/" === currentURL;

  if (!sameUrl) {
    return;
  }

  if (userState.submitListenerActive) {
    userState.submitListenerActive = false;
    chrome.webRequest.onCompleted.removeListener(checkIfUserSolvedProblem);
    console.log("Submit listener turned off");
  }
  const url = details.url;

  if (isLeetcodeUrl(url) && url.includes("/check/")) {
    try {
      const response = await fetch(details.url);
      const data = await response.json();
      if (data.state === "STARTED" || data.state === "PENDING") {
        if (!userState.submitListenerActive) {
          userState.submitListenerActive = true;
          chrome.webRequest.onCompleted.addListener(checkIfUserSolvedProblem, {
            urls: ["*://leetcode.com/submissions/detail/*/check/"],
          });
        }
        return;
      }
      if (data.status_msg !== "Accepted") {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        injectFailureModal(tab.id);
        return;
      }
      if (
        data.status_msg === "Accepted" &&
        data.state === "SUCCESS" &&
        !data.code_answer
      ) {
        await updateStreak();
        userState.leetcodeProblemSolved = true;
        await chrome.storage.local.set({ lastSubmission: Date.now() });
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [RULE_ID],
        });
        chrome.webRequest.onCompleted.removeListener(checkIfUserSolvedProblem);
        chrome.storage.local.get(["problem"], (data) => {
          if (data.problem) {
            data.problem.status = true; // Update status here
            chrome.storage.local.set({ problem: data.problem });
          } else {
            console.log("Problem not found in storage");
          }
        });
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        await injectSuccessModal(tab.id);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
};

function createMidnightAlarm() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const timeUntilMidnight = midnight.getTime() - now.getTime() + 30 * 60 * 1000; // extra buffer for leetcode to update POTD
  chrome.alarms.create("midnightAlarm", {
    when: Date.now() + timeUntilMidnight,
  });
  console.log(
    `Midnight alarm created at ${now.toLocaleString()}  for: ${midnight.toLocaleString()}`
  );
}
async function updateStreak() {
  let { currentStreak } = await chrome.storage.local.get("currentStreak");
  let { maxStreak } = await chrome.storage.local.get("maxStreak");
  let currentStreakVal = Number(currentStreak) || 0;
  let maxStreakVal = Number(maxStreak) || 0;
  let newStreak = currentStreakVal + 1;
  let best = Math.max(newStreak, maxStreakVal);

  await chrome.storage.local.set({ currentStreak: newStreak });
  await chrome.storage.local.set({ maxStreak: best });
}
async function updateStorage() {
  const status = false;
  const { isRedirectEnabled = true } = await chrome.storage.local.get(
    "isRedirectEnabled"
  );
  const { data } = await getLeetCodePOTD();
  const { link, question } = data.activeDailyCodingChallengeQuestion;
  const title = question.title;
  const fullLink = `${LEETCODE_URL}${link}`;
  const difficulty = question.difficulty;
  updateUserState(title, fullLink, difficulty);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
  });
  if (!userState.potd_solved && isRedirectEnabled) {
    await setRedirectRule(fullLink);
  } else {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
    });
  }

  chrome.storage.local.set(
    { problem: { title, fullLink, difficulty, status } },
    () => {
      console.log("POTD put in storage");
      console.log(`Redirect Status : ${isRedirectEnabled}`);
    }
  );
}

async function handleRedirectRule() {
  try {
    // Fetch stored values
    const { isRedirectEnabled = true } = await chrome.storage.local.get(
      "isRedirectEnabled"
    );
    const { problem } = await chrome.storage.local.get("problem");

    if (!problem?.fullLink) {
      console.warn("No problem data found in storage.");
      return;
    }

    if (isRedirectEnabled && !problem.status) {
      await setRedirectRule(problem.fullLink);
    } else {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID],
      });
      console.log("Redirect rule removed");
    }
  } catch (error) {
    console.error("Error handling redirect rule:", error);
  }
}

async function setConstants() {
  await chrome.storage.local.set({ isRedirectEnabled: true });
  await chrome.storage.local.set({ currentStreak: 0 });
  await chrome.storage.local.set({ maxStreak: 0 });
  await chrome.storage.local.set({ lastSubmission: new Date(0) });
}
chrome.runtime.onInstalled.addListener(async () => {
  setConstants();
  createMidnightAlarm();
  updateStorage();
  tryResetStreak();
});

async function tryResetStreak() {
    const result = await chrome.storage.local.get("lastSubmission");
    const lastSubmissionDate = new Date(Number(result.lastSubmission));
    
    // Get current date & time
    const now = new Date();
    
    // Set both to midnight to only compare full days
    const lastSubmissionMidnight = new Date(lastSubmissionDate.setHours(0, 0, 0, 0));
    const yesterdayMidnight = new Date(now.setHours(0, 0, 0, 0) - 86400000); // 86400000ms = 1 day
  
    if (lastSubmissionMidnight < yesterdayMidnight) {
      await chrome.storage.local.set({ currentStreak: 0 });
    }
  
    console.log("From Try Reset Streak");
    console.log({ lastSubmissionDate, yesterdayMidnight });
  }
  

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "midnightAlarm") {
    console.log("Midnight alarm triggered!");
    try {
        updateStorage();
        createMidnightAlarm();
        tryResetStreak();
    } catch (error) {
      console.error("Error handling midnight alarm:", error);
    }
  }
});

chrome.runtime.onMessage.addListener(onMessageReceived);
