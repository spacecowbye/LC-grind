
const LEETCODE_URL = "https://leetcode.com";
const RULE_ID = 1;

const isLeetcodeUrl = (url) => {
    return url.includes(LEETCODE_URL);
}

const isLeetcodeSubmitUrl = (url) => {
    return isLeetcodeUrl(url) && url.includes('submissions');
}

const userState = {
    potd_solved: false,
    problem: {
        url: undefined,
        title: undefined,
        difficulty: undefined
    },
    lastSubmissionDate: new Date(0),
    lastAttemptedUrl: null,
    submitListenerActive : undefined,

};




async function updateStorage() {
    const { isRedirectEnabled = true } = await chrome.storage.local.get('isRedirectEnabled');
    const { data } = await getLeetCodePOTD();
    const { link, question } = data.activeDailyCodingChallengeQuestion;
    const title = question.title;
    const fullLink = `${LEETCODE_URL}${link}`;
    const difficulty = question.difficulty;
    updateUserState(title, fullLink, difficulty);
    if (!userState.potd_solved && isRedirectEnabled)
        await setRedirectRule(fullLink)
    else{
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID]
          })
    }

    chrome.storage.local.set({ problem: { title, fullLink, difficulty } }, () => {
        console.log("POTD put in storage");
    })
}

function updateUserState(title, fullLink, difficulty) {
    userState.potd_solved = false;
    userState.problem.difficulty = difficulty;
    userState.problem.title = title;
    userState.problem.url = fullLink;
}

////// below this line nothing needs to be changed


function onMessageReceived(
    message,
    sender,
    sendResponse
) {
    
    switch (message.action) {
        case "redirectRuleChanged":
            updateStorage();
            break;
        case "userClickedSubmit":
            console.log(
                "User clicked submit, adding listener"
            )
            userState.submitListenerActive = true;
            chrome.webRequest.onCompleted.addListener(checkIfUserSolvedProblem, {
                urls: ["*://leetcode.com/submissions/detail/*/check/"]
            })
            break
        default:
            console.warn("Unknown message action:", message.action)
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
    const redirect_url = url;
    const redirectRule = {
        id: 1,
        priority: 1,
        action: {
            type: "redirect",
            redirect: { url: redirect_url }
        },
        condition: {
            urlFilter: "*://*/*",
            excludedInitiatorDomains: [
                "leetcode.com",
                "www.leetcode.com",
                "example.com"
            ],
            resourceTypes: ["main_frame"]
        }
    };

    try {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID],
            addRules: [redirectRule]
        });
        console.log("Redirect rule updated");
    } catch (error) {
        console.error("Error updating redirect rule:", error);
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && isLeetcodeUrl(tab.url) && !isLeetcodeSubmitUrl(tab.url)) {
        // Inject the content script only if it's a problem page and not a submission page
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"],
        });
        console.log("Content script injected on LeetCode problem page.");
    }
});

function createMidnightAlarm() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Set to midnight
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    chrome.alarms.create("midnightAlarm", { when: Date.now() + timeUntilMidnight });
    console.log(`Midnight alarm created at ${now.toLocaleString()}  for: ${midnight.toLocaleString()}`);
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "midnightAlarm") {
        console.log("Midnight alarm triggered!");

        
        updateStorage();
        createMidnightAlarm(); 
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
      problemUrl === currentURL || problemUrl + "description/" === currentURL
  
    if (!sameUrl) {
      return;
    }

    if(userState.submitListenerActive){
        userState.submitListenerActive = false;
        chrome.webRequest.onCompleted.removeListener(checkIfUserSolvedProblem)
        console.log("Submit listener turned off");
        
    }
    const url = details.url;

    if(isLeetcodeUrl(url) && url.includes('/check/')){
        try {
            const response = await fetch(details.url)
            const data = await response.json()
            if (data.state === "STARTED" || data.state === "PENDING") {
              if (!userState.submitListenerActive) {
                userState.submitListenerActive = true
                chrome.webRequest.onCompleted.addListener(checkIfUserSolvedProblem, {
                  urls: ["*://leetcode.com/submissions/detail/*/check/"]
                })
              }
              return
            }
            if (data.status_msg !== "Accepted") {   
                
              return
            }
            if (
              data.status_msg === "Accepted" &&
              data.state === "SUCCESS" &&
              !data.code_answer
            ) {

              userState.leetcodeProblemSolved = true
              chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [RULE_ID]
              })
              
              //await updateStorage();
              chrome.webRequest.onCompleted.removeListener(checkIfUserSolvedProblem)
             
            }
          } catch (error) {
            console.error("Error:", error)
          }   
    
        }
}


chrome.runtime.onInstalled.addListener(async () => {
    createMidnightAlarm();
    updateStorage();
});





chrome.runtime.onMessage.addListener(onMessageReceived)