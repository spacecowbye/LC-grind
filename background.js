const LEETCODE_URL = "https://leetcode.com";
const RULE_ID = 1;
const isLeetcodeUrl = (url) => {
    return url.includes(LEETCODE_URL);
}

const userState = {
    potd_solved : false,
    problem : {
        url : undefined,
        title : undefined,
        difficulty : undefined
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
      chrome.storage
  
      return data;
    } catch (error) {
      console.error("Failed to fetch POTD:", error);
      return null;
    }
  }
  

async function setRedirectRule(url) {
    const redirect_url = url;
    const redirectRule = {
        id : 1,
        priority : 1,
        action : {
            type : "redirect",
            redirect : {url : redirect_url}
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
    })
    console.log("Redirect rule updated")
  } catch (error) {
    console.error("Error updating redirect rule:", error)
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

function updateUserState(title,fullLink,difficulty){
    userState.potd_solved = false;
    userState.problem.difficulty = difficulty;
    userState.problem.title = title;
    userState.problem.url = fullLink;
}
async function updatePotd() {
    const { data } = await initializePOTD();
    const { link,question } = data.activeDailyCodingChallengeQuestion;
    const title = question.title;
    const fullLink = `${LEETCODE_URL}${link}`;
    const difficulty = question.difficulty;
    updateUserState(title,fullLink,difficulty);
    chrome.storage.local.set({problem : {title,fullLink,difficulty}},()=>{
        console.log("POTD put in storage");
    })
   
  
}

// THINGS TO DO WHEN THE EXTENSION IS INSTALLED

chrome.runtime.onInstalled.addListener(async () => {
    await updatePotd();
    await setRedirectRule(userState.problem.url);
    
  });


