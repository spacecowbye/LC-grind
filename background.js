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
    }
};

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

async function initializePOTD() {
    try {
        const POTD = await getLeetCodePOTD();
        return POTD;
    } catch (error) {
        console.error("Error initializing POTD:", error);
    }
}

function updateUserState(title, fullLink, difficulty) {
    userState.potd_solved = false;
    userState.problem.difficulty = difficulty;
    userState.problem.title = title;
    userState.problem.url = fullLink;
}

async function updatePotd() {
    const { data } = await initializePOTD();
    const { link, question } = data.activeDailyCodingChallengeQuestion;
    const title = question.title;
    const fullLink = `${LEETCODE_URL}${link}`;
    const difficulty = question.difficulty;
    updateUserState(title, fullLink, difficulty);
    chrome.storage.local.set({ problem: { title, fullLink, difficulty } }, () => {
        console.log("POTD put in storage");
    });
}

// THINGS TO DO WHEN THE EXTENSION IS INSTALLED
chrome.runtime.onInstalled.addListener(async () => {
    const storedProblem = await new Promise((resolve) =>
        chrome.storage.local.get("problem", (data) => resolve(data.problem))
    );

    if (storedProblem) {
        // Initialize userState from stored data
        userState.problem = {
            url: storedProblem.fullLink,
            title: storedProblem.title,
            difficulty: storedProblem.difficulty,
        };
        console.log("POTD loaded from storage:", userState.problem);
    } else {
        // Fetch and store new POTD if not available in storage
        await updatePotd();
    }

    const redirectUrl = userState.problem.url;
    if (redirectUrl) {
        await setRedirectRule(redirectUrl);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && isLeetcodeUrl(tab.url) && !isLeetcodeSubmitUrl(tab.url)) {
        // Inject the content script only if it's a problem page and not a submission page
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"], // Replace with your actual content script file name
        });
        console.log("Content script injected on LeetCode problem page.");
    }
});