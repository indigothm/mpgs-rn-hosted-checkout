// frontend/checkout.js

const logEl = document.getElementById("log");
const PAY_BTN = document.getElementById("pay");
const SAVE_CB = document.getElementById("save-card");

let cfg, sessionId;
let currentOrderId = null;
let currentTransactionId = null;
let challengePollTimer = null;

// Anti-clickjack frame breaker (remove CSS if top-level)
(function () {
  if (self === top) {
    const anti = document.getElementById("antiClickjack");
    anti && anti.parentNode.removeChild(anti);
  } else {
    top.location = self.location;
  }
})();

function log(msg) {
  if (!logEl) return;
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

function clearCardErrors() {
  const box = document.getElementById("card-errors");
  if (box) {
    box.style.display = "none";
    box.innerHTML = "";
  }

  // remove visual highlight from inputs
  ["card-number", "expiry-month", "expiry-year", "security-code", "cardholder-name"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("field-error");
    });
}

async function bootstrap() {
  cfg = await (await fetch("/api/config")).json();

  const script = document.createElement("script");
  script.src = `${cfg.baseUrl}/form/version/${cfg.formVersion}/merchant/${cfg.merchantId}/session.js`;
  script.onload = onSessionJsLoaded;
  script.onerror = () => console.error("Failed to load session.js");
  document.head.appendChild(script);
}

async function onSessionJsLoaded() {
  const s = await (await fetch("/api/session", { method: "POST" })).json();
  sessionId = s.session.id;

  PaymentSession.configure({
    session: sessionId,
    fields: {
      card: {
        number: "#card-number",
        expiryMonth: "#expiry-month",
        expiryYear: "#expiry-year",
        securityCode: "#security-code",
        nameOnCard: "#cardholder-name"
      },
    },
    frameEmbeddingMitigation: ["javascript"],
    callbacks: {
      initialized: () => {
        console.log("Hosted Session initialised");
        log("Hosted Session initialised");
      },
      error: (e) => console.error("PaymentSession error:", e),
      formSessionUpdate: onFormSessionUpdate,
    },
  });

  log("\nSession ID: " + sessionId);
}

function showHostedFieldErrors(errors) {
  const box = document.getElementById("card-errors");
  if (!box) {
    alert("Please check your card details.");
    return;
  }

  // Map Hosted Session error keys to labels and input IDs.
  // We support both dotted names (card.number) and the camelCase ones you're seeing (cardNumber).
  const fieldMap = [
    { keys: ["card.number", "cardNumber"],       label: "Card number",   inputId: "card-number" },
    { keys: ["card.expiryMonth", "expiryMonth"], label: "Expiry month",  inputId: "expiry-month" },
    { keys: ["card.expiryYear", "expiryYear"],   label: "Expiry year",   inputId: "expiry-year" },
    { keys: ["card.securityCode", "securityCode"], label: "Security code", inputId: "security-code" },
    { keys: ["card.nameOnCard", "cardholderName"], label: "Name on card",  inputId: "cardholder-name" },
  ];

  // Map the reasons you're seeing ("missing", "invalid") to friendly text
  const reasonMap = {
    missing: "is required",
    invalid: "is invalid",
  };

  const messages = [];

  for (const { keys, label, inputId } of fieldMap) {
    // Find whichever key exists in the errors object
    const key = keys.find(k => Object.prototype.hasOwnProperty.call(errors, k));
    if (!key) continue;

    const reasonCode = errors[key];
    const reasonText = reasonMap[reasonCode] || "has an error";

    // Highlight the input
    const input = document.getElementById(inputId);
    if (input) input.classList.add("field-error");

    messages.push(`${label} ${reasonText}.`);
  }

  if (messages.length === 0) {
    // Fallback if for some reason we still didn't map anything
    messages.push("Please check your card details and try again.");
  }

  box.innerHTML = messages.map(m => `<div>${m}</div>`).join("");
  box.style.display = "block";
}

bootstrap();

if (PAY_BTN) {
  PAY_BTN.addEventListener("click", function () {
    clearCardErrors();
    PaymentSession.updateSessionFromForm("card");
  });
}

async function onFormSessionUpdate(res) {
  if (res.status === "ok") {
    if (res.session && res.session.id) {
      sessionId = res.session.id;
    }

    const amount = document.getElementById("amount").value;
    const currency = document.getElementById("currency").value;

    const ts = Date.now();
    currentOrderId = `ORD-${ts}`;
    const authTransactionId = `${currentOrderId}-AUTH`;
    const payTransactionId  = `${currentOrderId}-PAY`;

    const browser = buildBrowserDetails();

    try {
      if (cfg.enable3ds) {
        log("3DS enabled, starting 3DS flow...");
        await run3DSFlow({
          orderId: currentOrderId,
          authTransactionId,
          payTransactionId,
          amount,
          currency,
          sessionId,
          browser,
        });
      } else {
        log("3DS disabled, going straight to PAY...");
        await completePayment({
          orderId: currentOrderId,
          transactionId: payTransactionId,   // use PAY txn id
          amount,
          currency,
          sessionId,
          authenticationTransactionId: null,
        });
      }
    } catch (e) {
      console.warn("Error in payment flow:", e);
      log("Error in payment flow: " + e.message);
      alert("Payment failed before authorisation.");
    }
  } else if (res.status === "fields_in_error") {
    log("Field errors: " + JSON.stringify(res.errors));
    showHostedFieldErrors(res.errors);
  } else if (res.status === "request_timeout") {
    log("Session update timed out.");
  } else if (res.status === "system_error") {
    log("System error: " + res.message);
  }
}

// -----------------------------
// Browser details helper
// -----------------------------

function buildBrowserDetails() {
  return {
    acceptHeader: navigator.userAgent,
    javaEnabled:
      typeof navigator.javaEnabled === "function"
        ? navigator.javaEnabled()
        : false,
    language: (navigator.language || "en").split("-")[0],
    screenHeight: window.screen.height,
    screenWidth: window.screen.width,
    timeZone: new Date().getTimezoneOffset(),
    colorDepth: window.screen.colorDepth,
    userAgent: navigator.userAgent,
  };
}

// -----------------------------
// 3DS: Initiate + Authenticate
// -----------------------------

async function run3DSFlow({
  orderId,
  authTransactionId,
  payTransactionId,
  amount,
  currency,
  sessionId,
  browser,
}) {
  // INITIATE_AUTHENTICATION uses authTransactionId
  const initRes = await fetch("/api/3ds/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      transactionId: authTransactionId,
      amount,
      currency,
      sessionId,
      browser,
    }),
  }).then(r => r.json());

  log("3DS Initiate response: " + JSON.stringify(initRes));

  if (initRes.result !== "SUCCESS") {
    const msg =
      initRes.error?.explanation ||
      "3DS initiation failed with result=" + initRes.result;
    log(msg);
    alert(msg);
    return;
  }

  // AUTHENTICATE_PAYER also uses authTransactionId
  const authRes = await fetch("/api/3ds/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      transactionId: authTransactionId,
      amount,
      currency,
      sessionId,
      browser,
    }),
  }).then(r => r.json());

  const authentication = authRes.authentication || {};
  const auth3ds2 = authentication["3ds2"] || {};

  const transactionStatus = auth3ds2.transactionStatus;
  const result = authRes.result;

  // 🔑 This is the gateway's AUTH transaction id, which MPGS expects
  const authTxnIdForPay = authTransactionId;

  if (result === "SUCCESS" && transactionStatus === "Y") {
    log("3DS frictionless success, proceeding to PAY...");
    await completePayment({
      orderId,
      transactionId: payTransactionId,          // PAY txn id
      amount,
      currency,
      sessionId,
      authenticationTransactionId: authTxnIdForPay,  // <- ORD-...-AUTH
    });
    return;
  }

  if (
    authRes.result === "PENDING" &&
    authentication.redirect &&
    authentication.redirect.html
  ) {
    log("3DS challenge required, showing challenge iframe...");
    show3DSChallenge(authentication.redirect.html);

    await waitForChallengeAndCompletePayment({
      orderId,
      authTransactionId,             // still used for /api/3ds/status
      payTransactionId,
      amount,
      currency,
      sessionId,
      authenticationTransactionId: authTxnIdForPay, // <- ORD-...-AUTH
    });
    return;
  }

  // Anything else = do not proceed to PAY
  const msg =
    "3DS authentication not completed. Status=" +
    transactionStatus +
    ", result=" +
    result;
  log(msg);
  alert(msg);
}

// -----------------------------
// 3DS: Challenge UI + Polling
// -----------------------------
let last3DSChallengeHtml = null;

function show3DSChallenge(html) {
  const overlay = document.getElementById("challenge-overlay");
  const container = document.getElementById("challenge-container");

  if (!overlay || !container) {
    log("No challenge overlay/container found in DOM.");
    alert("3DS challenge cannot be displayed.");
    return;
  }

  // Save & log for debugging
  last3DSChallengeHtml = html;
  window.__last3DSChallengeHtml = html;

  const trimmed = html.replace(/\s+/g, " ").slice(0, 300);
  log("3DS challenge HTML (first 300 chars): " + trimmed + "...");

  console.log("Full 3DS challenge HTML:", html);

  // Inject the HTML
  container.innerHTML = html;
  overlay.style.display = "flex";

  // 🔑 Manually trigger the form submit in case the <script> doesn't run
  setTimeout(() => {
    const form = document.getElementById("threedsChallengeRedirectForm");
    if (form) {
      log("Submitting 3DS challenge form manually...");
      try {
        form.submit();
      } catch (e) {
        console.error("Error submitting 3DS challenge form:", e);
        log("Error submitting 3DS challenge form: " + e.message);
      }
    } else {
      log("3DS challenge form not found in DOM.");
    }
  }, 0);

  // Optional: debug window
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug3ds") === "1") {
      const win = window.open("", "threeDSDebug");
      if (win && win.document) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    }
  } catch (e) {
    console.warn("Unable to open 3DS debug window:", e);
  }
}

function hide3DSChallenge() {
  const overlay = document.getElementById("challenge-overlay");
  const container = document.getElementById("challenge-container");
  if (overlay) overlay.style.display = "none";
  if (container) container.innerHTML = "";
}

async function waitForChallengeAndCompletePayment({
  orderId,
  authTransactionId,
  payTransactionId,
  amount,
  currency,
  sessionId,
  authenticationTransactionId,
}) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      attempts += 1;
      try {
        const statusRes = await fetch(
    `/api/3ds/status?orderId=${encodeURIComponent(
            orderId
          )}&transactionId=${encodeURIComponent(authTransactionId)}`
        ).then(r => r.json());

        const authentication = statusRes.authentication || {};
        const auth3ds2 = authentication["3ds2"] || {};
        const ts = auth3ds2.transactionStatus;

        if (ts === "Y" || ts === "A") {
          clearInterval(challengePollTimer);
          challengePollTimer = null;
          hide3DSChallenge();

          completePayment({
            orderId,
            transactionId: payTransactionId,     // PAY transaction id
            amount,
            currency,
            sessionId,
            authenticationTransactionId,         // 3DS transactionId
          })
            .then(resolve)
            .catch(reject);
          return;
        }

        // Failure / rejected / unavailable
        if (ts === "N" || ts === "R" || ts === "U") {
          clearInterval(challengePollTimer);
          challengePollTimer = null;
          hide3DSChallenge();
          const msg = "3DS authentication failed or was rejected: " + ts;
          log(msg);
          alert(msg);
          reject(new Error(msg));
          return;
        }

        // Still pending
        if (attempts >= maxAttempts) {
          clearInterval(challengePollTimer);
          challengePollTimer = null;
          hide3DSChallenge();
          const msg = "3DS challenge polling timed out.";
          log(msg);
          alert(msg);
          reject(new Error(msg));
        }
      } catch (e) {
        clearInterval(challengePollTimer);
        challengePollTimer = null;
        hide3DSChallenge();
        log("Error while polling 3DS status: " + e.message);
        reject(e);
      }
    };

    challengePollTimer = setInterval(poll, 2000);
  });
}

// -----------------------------
// Tokenisation + PAY
// -----------------------------

async function completePayment({
  orderId,
  transactionId,
  amount,
  currency,
  sessionId,
  authenticationTransactionId,
}) {
  let token = null;

  const wantToSave = SAVE_CB && SAVE_CB.checked;

  if (wantToSave) {
    try {
      const tok = await fetch("/api/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerId: "cust-123",
        }),
      }).then((r) => r.json());

      token = tok.token;
      log("Token created: " + JSON.stringify(tok));
    } catch (e) {
      log("Tokenisation failed: " + e.message);
      // In a real app you might still let the user continue without saving.
    }
  }

  const payload = { orderId, transactionId, amount, currency, sessionId };

  // 👉 IMPORTANT:
  // If this transaction has 3DS auth, we must pay with the same
  // funding source that was authenticated (the session/card), not the token.
  if (!authenticationTransactionId && token) {
    // Only attach token when there is NO 3DS on this payment.
    payload.token = token;
  } else if (token) {
    log(
      "3DS is in use for this payment; token will be stored for future use, not used on this PAY request."
    );
  }

  if (authenticationTransactionId) {
    payload.authenticationTransactionId = authenticationTransactionId;
    payload.authentication = { transactionId: authenticationTransactionId };
  }

  log("Sending PAY with payload: " + JSON.stringify(payload));

  const payRes = await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());

  log("PAY response:\n" + JSON.stringify(payRes, null, 2));

  if (payRes.result === "SUCCESS") {
    alert("Payment successful!");
  } else {
    const code = payRes.response?.gatewayCode || payRes.result || "UNKNOWN";
    alert("Payment result: " + code);
  }

  return payRes;
}
