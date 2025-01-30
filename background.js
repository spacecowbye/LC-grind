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
    submitListenerActive: true,
};

function onMessageReceived(
    message,
    sender,
    sendResponse
) {
    switch (message.action) {
        case "redirectTurnedOn":
            handleRedirectRule();
            break;
        case "redirectTurnedOff":
            handleRedirectRule();
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



function updateUserState(title, fullLink, difficulty) {
    userState.potd_solved = false;
    userState.problem.difficulty = difficulty;
    userState.problem.title = title;
    userState.problem.url = fullLink;
}
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && isLeetcodeUrl(tab.url) && !isLeetcodeSubmitUrl(tab.url)) {
        // Checking if script is already injected
        const injectedScripts = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => Boolean(window._scriptInjected)
        });
        
        if (!injectedScripts[0].result) {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["content.js"]
            });
            
            // Set a flag in the page context
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => { window._scriptInjected = true; }
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
        problemUrl === currentURL || problemUrl + "description/" === currentURL

    if (!sameUrl) {
        return;
    }

    if (userState.submitListenerActive) {
        userState.submitListenerActive = false;
        chrome.webRequest.onCompleted.removeListener(checkIfUserSolvedProblem)
        console.log("Submit listener turned off");

    }
    const url = details.url;

    if (isLeetcodeUrl(url) && url.includes('/check/')) {
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
                await updateStreak();
                userState.leetcodeProblemSolved = true
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [RULE_ID]
                })
                chrome.webRequest.onCompleted.removeListener(checkIfUserSolvedProblem)
    
            }
        } catch (error) {
            console.error("Error:", error)
        }
    }

}


function createMidnightAlarm() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); 
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


async function updateStreak() {
    let { currentStreak } = await chrome.storage.local.get('currentStreak');
    let { maxStreak } = await chrome.storage.local.get('maxStreak');

    console.log("Retrieved values:", currentStreak, maxStreak); 

    let currentStreakVal = Number(currentStreak) || 0;
    let maxStreakVal = Number(maxStreak) || 0;

    console.log("Processed values:", currentStreakVal, maxStreakVal); 

    let newStreak = currentStreakVal + 1;
    let best = Math.max(newStreak, maxStreakVal);

    await chrome.storage.local.set({ 'currentStreak': newStreak });
    await chrome.storage.local.set({ 'maxStreak': best });
}
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
    else {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID]
        })
    }
    
    chrome.storage.local.set({ problem: { title, fullLink, difficulty } }, () => {
        console.log("POTD put in storage");
        console.log(`Redirect Status : ${isRedirectEnabled}`);
    })

}

async function handleRedirectRule() {
    try {
        // Fetch stored values
        const { isRedirectEnabled = true } = await chrome.storage.local.get('isRedirectEnabled');
        const { problem } = await chrome.storage.local.get('problem');

        if (!problem?.fullLink) {
            console.warn("No problem data found in storage.");
            return;
        }

        if (isRedirectEnabled) {
            await setRedirectRule(problem.fullLink);
        } else {
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [RULE_ID]
            });
            console.log("Redirect rule removed");
        }
    } catch (error) {
        console.error("Error handling redirect rule:", error);
    }
}


async function setConstants(){
    await chrome.storage.local.set({'isRedirectEnabled' : true});
    await chrome.storage.local.set({'currentStreak' : 0});
    await chrome.storage.local.set({'maxStreak' : 0});

}

chrome.runtime.onInstalled.addListener(async () => {
    setConstants();
    createMidnightAlarm();
    updateStorage();
});


chrome.runtime.onMessage.addListener(onMessageReceived)
