// src/checkout/checkoutHtml.ts — Generates self-contained HTML for WebView checkout
//
// This is adapted from the reference frontend/checkout.js + frontend/index.html.
// The entire card capture → 3DS → PAY flow runs inside the WebView.
// Results are posted to React Native via window.ReactNativeWebView.postMessage().

interface CheckoutHtmlConfig {
  baseUrl: string;       // MPGS gateway base URL
  merchantId: string;    // MPGS merchant ID
  formVersion: string;   // MPGS form version (e.g. "100")
  sessionId: string;     // Pre-created session ID
  backendUrl: string;    // Backend API base URL (absolute, e.g. http://localhost:3001)
  amount: string;        // Payment amount
  currency: string;      // Currency code (e.g. "AUD")
  enable3ds: boolean;    // Whether 3DS is enabled
}

export function getCheckoutHtml(config: CheckoutHtmlConfig): string {
  const { baseUrl, merchantId, formVersion, sessionId, backendUrl, amount, currency, enable3ds } = config;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>MPGS Checkout</title>

  <!-- Anti-clickjack for MPGS -->
  <style id="antiClickjack">body{display:none !important;}</style>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #020617;
      color: #e5e7eb;
      padding: 16px;
      -webkit-text-size-adjust: 100%;
    }

    .card {
      background: #0b1120;
      border-radius: 16px;
      border: 1px solid #1f2937;
      padding: 20px 16px;
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top right, rgba(99,102,241,0.15), transparent 60%),
        radial-gradient(circle at bottom left, rgba(16,185,129,0.12), transparent 60%);
      pointer-events: none;
    }

    .card-inner { position: relative; z-index: 1; }

    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 16px;
    }

    .amount-display {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 16px;
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(15,23,42,0.9);
      border: 1px solid #1f2937;
    }

    .amount-display strong {
      color: #e5e7eb;
      font-size: 16px;
    }

    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #6b7280;
      margin-bottom: 6px;
      margin-top: 12px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    input {
      width: 100%;
      height: 44px;
      border-radius: 999px;
      border: 1px solid #1f2937;
      background: #020617;
      color: #e5e7eb;
      font-size: 15px;
      padding: 0 14px;
      margin-bottom: 12px;
      outline: none;
      -webkit-appearance: none;
    }

    input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
    }

    .row {
      display: flex;
      gap: 8px;
    }

    .row input { flex: 1; }

    .error-box {
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      font-size: 13px;
      margin-bottom: 12px;
      display: none;
    }

    .field-error {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 1px rgba(239,68,68,0.25);
    }

    .pay-btn {
      width: 100%;
      height: 48px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      -webkit-appearance: none;
    }

    .pay-btn:active {
      opacity: 0.8;
    }

    .pay-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #challenge-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
    }

    #challenge-container {
      width: 100%;
      height: 90vh;
      background: #fff;
      overflow: hidden;
      border-radius: 12px;
    }

    .spinner-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2,6,23,0.8);
      z-index: 9998;
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #1f2937;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .spinner-text {
      color: #9ca3af;
      font-size: 14px;
    }

    #log {
      margin-top: 12px;
      white-space: pre-wrap;
      background: #020617;
      border-radius: 10px;
      border: 1px solid #1e293b;
      padding: 8px;
      font-size: 11px;
      max-height: 150px;
      overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #6b7280;
    }
  </style>
</head>
<body>

<div class="card">
  <div class="card-inner">
    <h2>Card Payment</h2>
    <div class="subtitle">Hosted Session · Secure</div>

    <div class="amount-display">
      Amount: <strong>${currency} ${amount}</strong>
    </div>

    <div id="card-errors" class="error-box"></div>

    <div class="section-label">Card Details</div>

    <label for="card-number">Card number</label>
    <input id="card-number" readonly />

    <label>Expiry (MM / YY)</label>
    <div class="row">
      <input id="expiry-month" readonly />
      <input id="expiry-year" readonly />
    </div>

    <label for="security-code">CVV</label>
    <input id="security-code" readonly />

    <label for="cardholder-name">Name on card</label>
    <input id="cardholder-name" readonly />

    <button id="pay" class="pay-btn" type="button">Pay ${currency} ${amount}</button>
  </div>
</div>

<div id="challenge-overlay">
  <div id="challenge-container"></div>
</div>

<div id="spinner-overlay" class="spinner-overlay">
  <div class="spinner"></div>
  <div class="spinner-text" id="spinner-text">Processing…</div>
</div>

<div id="log">Initialising…</div>

<script>
// =========================================================
// MPGS Hosted Session Checkout — WebView Edition
// Adapted from reference checkout.js
// =========================================================

const API_BASE = "${backendUrl}";
const ENABLE_3DS = ${enable3ds};
const SESSION_ID = "${sessionId}";

const logEl = document.getElementById("log");
const PAY_BTN = document.getElementById("pay");

let sessionId = SESSION_ID;
let challengePollTimer = null;
let paymentInProgress = false;
let resultSent = false;

// Anti-clickjack
(function() {
  if (self === top) {
    const anti = document.getElementById("antiClickjack");
    if (anti) anti.parentNode.removeChild(anti);
  }
})();

function log(msg) {
  if (logEl) {
    logEl.textContent += msg + "\\n";
    logEl.scrollTop = logEl.scrollHeight;
  }
  // Forward logs to native
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "LOG", message: msg }));
  } catch(e) {}
}

function postResult(result, data) {
  if (resultSent) return;
  resultSent = true;
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: "PAYMENT_RESULT",
    result: result,
    data: data
  }));
}

function postError(message) {
  if (resultSent) return;
  resultSent = true;
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: "ERROR",
    message: message
  }));
}

function showSpinner(text) {
  const el = document.getElementById("spinner-overlay");
  const textEl = document.getElementById("spinner-text");
  if (el) el.style.display = "flex";
  if (textEl) textEl.textContent = text || "Processing…";
}

function hideSpinner() {
  const el = document.getElementById("spinner-overlay");
  if (el) el.style.display = "none";
}

function clearCardErrors() {
  const box = document.getElementById("card-errors");
  if (box) { box.style.display = "none"; box.innerHTML = ""; }
  ["card-number","expiry-month","expiry-year","security-code","cardholder-name"]
    .forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove("field-error");
    });
}

function showHostedFieldErrors(errors) {
  const box = document.getElementById("card-errors");
  if (!box) return;

  const fieldMap = [
    { keys: ["card.number","cardNumber"],         label: "Card number",   inputId: "card-number" },
    { keys: ["card.expiryMonth","expiryMonth"],   label: "Expiry month",  inputId: "expiry-month" },
    { keys: ["card.expiryYear","expiryYear"],     label: "Expiry year",   inputId: "expiry-year" },
    { keys: ["card.securityCode","securityCode"], label: "Security code", inputId: "security-code" },
    { keys: ["card.nameOnCard","cardholderName"], label: "Name on card",  inputId: "cardholder-name" }
  ];

  const reasonMap = { missing: "is required", invalid: "is invalid" };
  const messages = [];

  for (const { keys, label, inputId } of fieldMap) {
    const key = keys.find(function(k) { return errors.hasOwnProperty(k); });
    if (!key) continue;
    const reasonText = reasonMap[errors[key]] || "has an error";
    const input = document.getElementById(inputId);
    if (input) input.classList.add("field-error");
    messages.push(label + " " + reasonText + ".");
  }

  if (messages.length === 0) messages.push("Please check your card details.");
  box.innerHTML = messages.map(function(m) { return "<div>" + m + "</div>"; }).join("");
  box.style.display = "block";
}

// ---- Browser details ----

function buildBrowserDetails() {
  return {
    acceptHeader: navigator.userAgent,
    javaEnabled: typeof navigator.javaEnabled === "function" ? navigator.javaEnabled() : false,
    language: (navigator.language || "en").split("-")[0],
    screenHeight: window.screen.height,
    screenWidth: window.screen.width,
    timeZone: new Date().getTimezoneOffset(),
    colorDepth: window.screen.colorDepth,
    userAgent: navigator.userAgent
  };
}

// ---- Bootstrap: load MPGS session.js ----

(function bootstrap() {
  var script = document.createElement("script");
  script.src = "${baseUrl}/form/version/${formVersion}/merchant/${merchantId}/session.js";
  script.onload = onSessionJsLoaded;
  script.onerror = function() {
    log("Failed to load MPGS session.js");
    postError("Failed to load payment library");
  };
  document.head.appendChild(script);
})();

function onSessionJsLoaded() {
  PaymentSession.configure({
    session: sessionId,
    fields: {
      card: {
        number: "#card-number",
        expiryMonth: "#expiry-month",
        expiryYear: "#expiry-year",
        securityCode: "#security-code",
        nameOnCard: "#cardholder-name"
      }
    },
    frameEmbeddingMitigation: ["javascript"],
    callbacks: {
      initialized: function() {
        log("Hosted Session initialised");
      },
      error: function(e) {
        log("PaymentSession error: " + JSON.stringify(e));
      },
      formSessionUpdate: onFormSessionUpdate
    }
  });
  log("Session ID: " + sessionId);
}

// ---- Pay button ----

if (PAY_BTN) {
  PAY_BTN.addEventListener("click", function() {
    if (paymentInProgress) return;
    clearCardErrors();
    PaymentSession.updateSessionFromForm("card");
  });
}

// ---- Form session update callback ----

async function onFormSessionUpdate(res) {
  if (res.status === "ok") {
    if (paymentInProgress) return;
    paymentInProgress = true;

    if (res.session && res.session.id) sessionId = res.session.id;

    var ts = Date.now();
    var orderId = "ORD-" + ts;
    var authTransactionId = orderId + "-AUTH";
    var payTransactionId = orderId + "-PAY";
    var browser = buildBrowserDetails();

    PAY_BTN.disabled = true;
    showSpinner("Processing payment…");

    try {
      if (ENABLE_3DS) {
        log("3DS enabled, starting flow…");
        await run3DSFlow({
          orderId: orderId,
          authTransactionId: authTransactionId,
          payTransactionId: payTransactionId,
          amount: "${amount}",
          currency: "${currency}",
          sessionId: sessionId,
          browser: browser
        });
      } else {
        log("3DS disabled, paying directly…");
        await completePayment({
          orderId: orderId,
          transactionId: payTransactionId,
          amount: "${amount}",
          currency: "${currency}",
          sessionId: sessionId,
          authenticationTransactionId: null
        });
      }
    } catch(e) {
      log("Error: " + e.message);
      hideSpinner();
      postError("Payment failed: " + e.message);
    } finally {
      PAY_BTN.disabled = false;
    }
  } else if (res.status === "fields_in_error") {
    log("Field errors: " + JSON.stringify(res.errors));
    showHostedFieldErrors(res.errors);
  } else if (res.status === "request_timeout") {
    log("Session update timed out.");
    postError("Payment session timed out. Please try again.");
  } else if (res.status === "system_error") {
    log("System error: " + res.message);
    postError("System error. Please try again.");
  }
}

// ---- 3DS flow ----

async function run3DSFlow(opts) {
  // INITIATE
  showSpinner("Verifying card…");
  var initRes = await fetch(API_BASE + "/api/3ds/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: opts.orderId,
      transactionId: opts.authTransactionId,
      amount: opts.amount,
      currency: opts.currency,
      sessionId: opts.sessionId,
      browser: opts.browser
    })
  }).then(function(r) { return r.json(); });

  log("3DS Initiate: " + JSON.stringify(initRes).substring(0, 200));

  if (initRes.result !== "SUCCESS") {
    var msg = (initRes.error && initRes.error.explanation) ||
              "3DS initiation failed: " + initRes.result;
    hideSpinner();
    postError(msg);
    return;
  }

  // AUTHENTICATE
  showSpinner("Authenticating…");
  var authRes = await fetch(API_BASE + "/api/3ds/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: opts.orderId,
      transactionId: opts.authTransactionId,
      amount: opts.amount,
      currency: opts.currency,
      sessionId: opts.sessionId,
      browser: opts.browser
    })
  }).then(function(r) { return r.json(); });

  var authentication = authRes.authentication || {};
  var auth3ds2 = authentication["3ds2"] || {};
  var transactionStatus = auth3ds2.transactionStatus;
  var result = authRes.result;

  // Frictionless success
  if (result === "SUCCESS" && transactionStatus === "Y") {
    log("3DS frictionless success");
    showSpinner("Completing payment…");
    await completePayment({
      orderId: opts.orderId,
      transactionId: opts.payTransactionId,
      amount: opts.amount,
      currency: opts.currency,
      sessionId: opts.sessionId,
      authenticationTransactionId: opts.authTransactionId
    });
    return;
  }

  // Challenge required
  if (result === "PENDING" && authentication.redirect && authentication.redirect.html) {
    log("3DS challenge required");
    hideSpinner();
    show3DSChallenge(authentication.redirect.html);

    await waitForChallengeAndCompletePayment({
      orderId: opts.orderId,
      authTransactionId: opts.authTransactionId,
      payTransactionId: opts.payTransactionId,
      amount: opts.amount,
      currency: opts.currency,
      sessionId: opts.sessionId,
      authenticationTransactionId: opts.authTransactionId
    });
    return;
  }

  // Failed
  hideSpinner();
  postError("3DS authentication not completed. Status=" + transactionStatus + ", result=" + result);
}

// ---- 3DS Challenge UI ----

function show3DSChallenge(html) {
  var overlay = document.getElementById("challenge-overlay");
  var container = document.getElementById("challenge-container");
  if (!overlay || !container) {
    postError("3DS challenge cannot be displayed.");
    return;
  }
  container.innerHTML = html;
  overlay.style.display = "flex";

  // Submit the challenge form if present
  setTimeout(function() {
    var form = document.getElementById("threedsChallengeRedirectForm");
    if (form) {
      log("Submitting 3DS challenge form…");
      try { form.submit(); } catch(e) { log("Error submitting form: " + e.message); }
    }
  }, 0);
}

function hide3DSChallenge() {
  var overlay = document.getElementById("challenge-overlay");
  var container = document.getElementById("challenge-container");
  if (overlay) overlay.style.display = "none";
  if (container) container.innerHTML = "";
}

function waitForChallengeAndCompletePayment(opts) {
  return new Promise(function(resolve, reject) {
    var attempts = 0;
    var maxAttempts = 30;

    var poll = async function() {
      attempts++;
      try {
        var statusRes = await fetch(
          API_BASE + "/api/3ds/status?orderId=" + encodeURIComponent(opts.orderId) +
          "&transactionId=" + encodeURIComponent(opts.authTransactionId)
        ).then(function(r) { return r.json(); });

        var auth = statusRes.authentication || {};
        var auth3ds2 = auth["3ds2"] || {};
        var ts = auth3ds2.transactionStatus;

        if (ts === "Y" || ts === "A") {
          clearInterval(challengePollTimer);
          challengePollTimer = null;
          hide3DSChallenge();
          showSpinner("Completing payment…");

          completePayment({
            orderId: opts.orderId,
            transactionId: opts.payTransactionId,
            amount: opts.amount,
            currency: opts.currency,
            sessionId: opts.sessionId,
            authenticationTransactionId: opts.authenticationTransactionId
          }).then(resolve).catch(reject);
          return;
        }

        if (ts === "N" || ts === "R" || ts === "U") {
          clearInterval(challengePollTimer);
          challengePollTimer = null;
          hide3DSChallenge();
          var msg = "3DS authentication failed: " + ts;
          log(msg);
          postError(msg);
          reject(new Error(msg));
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(challengePollTimer);
          challengePollTimer = null;
          hide3DSChallenge();
          var tmsg = "3DS challenge timed out.";
          log(tmsg);
          postError(tmsg);
          reject(new Error(tmsg));
        }
      } catch(e) {
        clearInterval(challengePollTimer);
        challengePollTimer = null;
        hide3DSChallenge();
        log("Error polling 3DS: " + e.message);
        postError("3DS verification failed: " + e.message);
        reject(e);
      }
    };

    challengePollTimer = setInterval(poll, 2000);
  });
}

// ---- Complete payment ----

async function completePayment(opts) {
  var payload = {
    orderId: opts.orderId,
    transactionId: opts.transactionId,
    amount: opts.amount,
    currency: opts.currency,
    sessionId: opts.sessionId
  };

  if (opts.authenticationTransactionId) {
    payload.authenticationTransactionId = opts.authenticationTransactionId;
    payload.authentication = { transactionId: opts.authenticationTransactionId };
  }

  log("Sending PAY with payload: " + JSON.stringify(payload));

  var payRes = await fetch(API_BASE + "/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function(r) { return r.json(); });

  var gatewayCode = (payRes.response && payRes.response.gatewayCode) || "N/A";
  log("PAY result=" + payRes.result + ", gatewayCode=" + gatewayCode);
  log("PAY response: " + JSON.stringify(payRes).substring(0, 500));
  hideSpinner();

  if (payRes.result === "SUCCESS") {
    postResult("SUCCESS", payRes);
  } else {
    postResult("FAILED", { gatewayCode: gatewayCode, raw: payRes });
  }

  return payRes;
}
</script>

</body>
</html>`;
}
