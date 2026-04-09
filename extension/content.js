function extractThreadIdFromUrl(currentUrl) {
  if (!currentUrl || !currentUrl.includes("mail.google.com")) {
    return null;
  }

  const threadParam = new URL(currentUrl).searchParams.get("th");
  if (threadParam) {
    return threadParam;
  }

  const hash = window.location.hash || "";

  // Gmail URLs often include thread identifiers in hash segments.
  const parts = hash.split("/").filter(Boolean);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (/^[a-zA-Z0-9_-]{8,}$/.test(last)) {
      return last;
    }
  }

  const legacyThreadElement = document.querySelector("[data-legacy-thread-id]");
  const legacyThreadId = legacyThreadElement?.getAttribute("data-legacy-thread-id") || "";
  if (legacyThreadId) {
    const normalized = legacyThreadId.split(":").pop();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function extractVisibleThreadText() {
  const messageBodies = Array.from(document.querySelectorAll("div.a3s.aiL, div.a3s"));
  const parts = messageBodies
    .map((node) => node.innerText?.trim() || "")
    .filter((text) => text.length > 0);

  return parts.join("\n\n---\n\n");
}

function extractSubject() {
  return document.querySelector("h2.hP")?.textContent?.trim() || "";
}

function extractSenderEmail() {
  const senderNode = document.querySelector(".gD[email], span[email]");
  return senderNode?.getAttribute("email") || "";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_GMAIL_THREAD_ID") {
    const currentUrl = window.location.href;
    const isGmail = currentUrl.includes("mail.google.com");

    if (!isGmail) {
      sendResponse({ isGmail: false, threadId: null });
      return;
    }

    const threadId = extractThreadIdFromUrl(currentUrl);
    sendResponse({ isGmail: true, threadId });
    return;
  }

  if (message?.type === "GET_GMAIL_THREAD_CONTEXT") {
    const currentUrl = window.location.href;
    const isGmail = currentUrl.includes("mail.google.com");

    if (!isGmail) {
      sendResponse({ isGmail: false, threadId: null, cleanedThreadText: "", subject: "", senderEmail: "" });
      return;
    }

    const threadId = extractThreadIdFromUrl(currentUrl);
    const cleanedThreadText = extractVisibleThreadText();
    const subject = extractSubject();
    const senderEmail = extractSenderEmail();

    sendResponse({
      isGmail: true,
      threadId,
      cleanedThreadText,
      subject,
      senderEmail
    });
  }
});
