const API_BASE = "http://localhost:4001";

const authStatusEl = document.getElementById("authStatus");
const connectBtn = document.getElementById("connectBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const replyPreferenceEl = document.getElementById("replyPreference");
const summaryEl = document.getElementById("summary");
const senderIntentEl = document.getElementById("senderIntent");
const actionItemsEl = document.getElementById("actionItems");
const deadlinesEl = document.getElementById("deadlines");
const suggestedReplyEl = document.getElementById("suggestedReply");
const createDraftBtn = document.getElementById("createDraftBtn");
const messageEl = document.getElementById("message");

let lastAnalysisMetadata = {
  suggestedTo: "",
  subject: ""
};

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function setList(element, items) {
  element.innerHTML = "";
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "None";
    element.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function refreshAuthStatus() {
  try {
    const data = await fetchJson(`${API_BASE}/auth/status`);
    authStatusEl.textContent = data.authenticated ? "Gmail connected" : "Gmail not connected";
  } catch (_error) {
    authStatusEl.textContent = "Backend unavailable";
  }
}

function openAuth() {
  chrome.runtime.sendMessage(
    { type: "OPEN_AUTH_TAB", url: `${API_BASE}/auth/google` },
    () => {
      setMessage("Complete Google login in the opened tab, then return.");
    }
  );
}

function isApiCompatibleThreadId(threadId) {
  return /^[a-f0-9]+$/i.test(threadId || "");
}

function getCurrentThreadContext() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "GET_THREAD_CONTEXT_FROM_ACTIVE_TAB" }, (response) => {
      if (!response) {
        reject(new Error("No response from extension background."));
        return;
      }

      if (response.error) {
        reject(new Error(response.error));
        return;
      }

      if (!response.isGmail) {
        reject(new Error("Open a Gmail tab first."));
        return;
      }

      const hasThreadId = Boolean(response.threadId);
      const hasText = Boolean((response.cleanedThreadText || "").trim());

      if (!hasThreadId && !hasText) {
        reject(new Error("Open a specific Gmail thread before analyzing."));
        return;
      }

      resolve(response);
    });
  });
}

async function analyzeCurrentThread() {
  analyzeBtn.disabled = true;
  setMessage("Analyzing current thread...");

  try {
    const threadContext = await getCurrentThreadContext();
    const payload = {};
    const replyPreference = replyPreferenceEl?.value?.trim() || "";

    if (threadContext.threadId && isApiCompatibleThreadId(threadContext.threadId)) {
      payload.threadId = threadContext.threadId;
    }

    if (threadContext.cleanedThreadText) {
      payload.cleanedThreadText = threadContext.cleanedThreadText;
    }

    if (replyPreference) {
      payload.replyPreference = replyPreference;
    }

    const data = await fetchJson(`${API_BASE}/ai/analyze-thread`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const analysis = data.analysis;
    const metadata = data.metadata || { suggestedTo: "", subject: "" };
    lastAnalysisMetadata = {
      suggestedTo: metadata.suggestedTo || threadContext.senderEmail || "",
      subject: metadata.subject || threadContext.subject || ""
    };

    summaryEl.textContent = analysis.summary || "No summary";
    senderIntentEl.textContent = analysis.sender_intent || "No sender intent";
    setList(actionItemsEl, analysis.action_items || []);
    setList(deadlinesEl, analysis.deadlines || []);
    suggestedReplyEl.value = analysis.suggested_reply || "";

    setMessage("Analysis complete.");
  } catch (error) {
    setMessage(error.message || "Failed to analyze thread.", true);
  } finally {
    analyzeBtn.disabled = false;
  }
}

async function createDraft() {
  const body = suggestedReplyEl.value.trim();

  if (!body) {
    setMessage("Suggested reply is empty.", true);
    return;
  }

  const to = lastAnalysisMetadata.suggestedTo;
  const subjectPrefix = lastAnalysisMetadata.subject ? `Re: ${lastAnalysisMetadata.subject}` : "Re: Follow-up";

  if (!to) {
    setMessage("Could not infer recipient address from the thread.", true);
    return;
  }

  createDraftBtn.disabled = true;
  setMessage("Creating Gmail draft...");

  try {
    await fetchJson(`${API_BASE}/gmail/draft`, {
      method: "POST",
      body: JSON.stringify({
        to,
        subject: subjectPrefix,
        body
      })
    });

    setMessage("Draft created successfully.");
  } catch (error) {
    setMessage(error.message || "Failed to create draft.", true);
  } finally {
    createDraftBtn.disabled = false;
  }
}

connectBtn.addEventListener("click", openAuth);
analyzeBtn.addEventListener("click", analyzeCurrentThread);
createDraftBtn.addEventListener("click", createDraft);

document.addEventListener("DOMContentLoaded", () => {
  refreshAuthStatus();
});
