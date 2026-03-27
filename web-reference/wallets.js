// frontend/wallets.js

let cfg;
const APPLE_BTN = document.getElementById("apple-pay");
const GOOGLE_BTN = document.getElementById("google-pay");
const logEl = document.getElementById("log");

function log(m) {
  if (!logEl) return;
  logEl.textContent += m + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

// Bootstrap wallets
(async function () {
  cfg = await (await fetch("/api/config")).json();

  if (APPLE_BTN) {
    APPLE_BTN.disabled = false;
    APPLE_BTN.addEventListener("click", onApplePayClick);
  }
  if (GOOGLE_BTN) {
    GOOGLE_BTN.disabled = false;
    GOOGLE_BTN.addEventListener("click", onGooglePayClick);
  }
})();

async function onApplePayClick() {
  alert(
    "Apple Pay demo only.\n\nTo make this live you must:\n" +
      "1) Register & verify your domain with Apple\n" +
      "2) Configure Apple Pay certificates in MPGS\n" +
      "3) Send the Apple paymentToken to MPGS in\n" +
      "   sourceOfFunds.provided.card.devicePayment.paymentToken\n" +
      "   with order.walletProvider = 'APPLE_PAY'."
  );
}

async function onGooglePayClick() {
  if (!window.google || !window.google.payments || !window.google.payments.api) {
    return alert("Google Pay library not loaded (ensure pay.js is included).");
  }

  const paymentsClient = new google.payments.api.PaymentsClient({
    environment: cfg.googlePayEnvironment || "TEST",
  });

  // Use the values from the form, fall back to sane defaults
  const amountInput = document.getElementById("amount");
  const currencyInput = document.getElementById("currency");
  const amount = (amountInput && amountInput.value) || "10.00";
  const currency = (currencyInput && currencyInput.value) || "AUD";

  const request = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
      {
        type: "CARD",
        parameters: {
          allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
          allowedCardNetworks: ["VISA", "MASTERCARD"],
        },
        tokenizationSpecification: {
          type: "PAYMENT_GATEWAY",
          parameters: {
            // Must align with your MPGS/Tyro config
            gateway: "mpgs",
            gatewayMerchantId: cfg.merchantId,
          },
        },
      },
    ],
    transactionInfo: {
      totalPriceStatus: "FINAL",
      totalPrice: amount,
      currencyCode: currency,
    },
    merchantInfo: {
      merchantName: "Tyro MPGS Sample",
    },
  };

  try {
    log("Opening Google Pay sheet...");
    const resp = await paymentsClient.loadPaymentData(request);

    // This is the tokenised payload from Google Pay (JSON string)
    const token = resp.paymentMethodData.tokenizationData.token;
    const orderId = `GPay-${Date.now()}`;
    const transactionId = orderId;

    log("Google Pay authorised, sending to backend...");

    // 🔑 No /api/3ds calls here – this is a wallet flow.
    // We pass the devicePaymentToken to a wallet-specific backend handler.
    const res = await fetch("/api/pay/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        transactionId,
        amount,
        currency,
        devicePaymentToken: token,    // raw Google token (string)
        walletProvider: "GOOGLE_PAY",
      }),
    }).then((r) => r.json());

    log("Google Pay /api/pay/google response:\n" + JSON.stringify(res, null, 2));

    if (res.result === "SUCCESS") {
      alert("Google Pay payment successful!");
    } else {
      const code = res.response?.gatewayCode || res.result || "UNKNOWN";
      alert("Google Pay payment result: " + code);
    }
  } catch (e) {
    if (e.statusCode === "CANCELED") {
      log("Google Pay cancelled by user.");
      return;
    }
    log("GPay error: " + e.message);
    alert("Google Pay failed: " + e.message);
  }
}
