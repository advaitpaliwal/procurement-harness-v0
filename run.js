const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const examplesDir = path.join(root, "examples");
const outDir = path.join(root, "out");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function event(runId, sequence, type, data) {
  return {
    run_id: runId,
    sequence,
    type,
    at: `dry-run-sequence-${String(sequence).padStart(3, "0")}`,
    data
  };
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function evaluate(input) {
  const candidate = input.candidate || {};
  const allowedMerchants = asList(input.allowed_merchants);
  const prohibitedCategories = asList(input.prohibited_categories);
  const price = Number(candidate.price_usd);
  const checkoutTotal = candidate.checkout_total_usd === undefined ? price : Number(candidate.checkout_total_usd);
  const maxBudget = Number(input.max_budget_usd);

  const merchantAllowed = allowedMerchants.includes(candidate.merchant);
  const categoryAllowed = !prohibitedCategories.includes(candidate.category);
  const withinBudget = Number.isFinite(price) && Number.isFinite(maxBudget) && price <= maxBudget;
  const checkoutWithinBudget = Number.isFinite(checkoutTotal) && Number.isFinite(maxBudget) && checkoutTotal <= maxBudget;
  const priceStable = checkoutTotal === price;
  const receiptFieldsConfigured = asList(input.required_receipt_fields).length > 0;
  const events = [
    event(input.run_id, 1, "policy_loaded", {
      max_budget_usd: maxBudget,
      allowed_merchants: allowedMerchants,
      prohibited_categories: prohibitedCategories
    }),
    event(input.run_id, 2, "candidate_selected", {
      merchant: candidate.merchant,
      item: candidate.item,
      category: candidate.category,
      price_usd: price
    }),
    event(input.run_id, 3, "checkout_total_seen", {
      checkout_total_usd: checkoutTotal
    }),
    event(input.run_id, 4, "policy_checked", {
      merchant_allowed: merchantAllowed,
      category_allowed: categoryAllowed,
      within_budget: withinBudget,
      checkout_within_budget: checkoutWithinBudget,
      price_stable: priceStable,
      receipt_fields_configured: receiptFieldsConfigured
    })
  ];

  let decision = "approval_required";
  let reason = "Candidate satisfies policy checks, but human approval is required before irreversible purchase.";

  if (!merchantAllowed) {
    decision = "rejected";
    reason = "Candidate merchant is not on the allowed merchants list.";
  } else if (!categoryAllowed) {
    decision = "rejected";
    reason = "Candidate category is prohibited by policy.";
  } else if (!withinBudget) {
    decision = "rejected";
    reason = "Candidate price exceeds the maximum budget.";
  } else if (!checkoutWithinBudget) {
    decision = "rejected";
    reason = "Checkout total exceeds the maximum budget.";
  } else if (!priceStable) {
    decision = "rejected";
    reason = "Checkout total differs from the selected candidate price.";
  } else if (!receiptFieldsConfigured) {
    decision = "rejected";
    reason = "Receipt fields are not configured.";
  } else if (!input.human_approval_required) {
    decision = "approved";
    reason = "Candidate satisfies policy checks and policy does not require manual approval.";
  }

  events.push(event(input.run_id, 5, "decision_recorded", { decision, reason }));

  const packet = {
    policy_version: "v0.2-evented",
    run_id: input.run_id,
    purchase_goal: input.purchase_goal,
    candidate_item: candidate.item,
    candidate_merchant: candidate.merchant,
    candidate_category: candidate.category,
    candidate_price_usd: price,
    checkout_total_usd: checkoutTotal,
    max_budget_usd: maxBudget,
    checks: {
      merchant_allowed: merchantAllowed,
      category_allowed: categoryAllowed,
      within_budget: withinBudget,
      checkout_within_budget: checkoutWithinBudget,
      price_stable: priceStable,
      receipt_fields_configured: receiptFieldsConfigured
    },
    decision,
    reason,
    approval_required: decision === "approval_required",
    receipt_redaction_status: decision === "rejected" ? "not_applicable" : "pending_purchase",
    required_receipt_fields: asList(input.required_receipt_fields),
    event_count: events.length,
    event_log_sha256: stableHash(events)
  };

  return { packet, events };
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(examplesDir).filter((file) => file.endsWith(".json")).sort();

  for (const file of files) {
    const inputPath = path.join(examplesDir, file);
    const input = readJson(inputPath);
    const { packet, events } = evaluate(input);
    const outputPath = path.join(outDir, file.replace(/\.json$/, ".audit.json"));
    const eventPath = path.join(outDir, file.replace(/\.json$/, ".events.json"));
    fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
    fs.writeFileSync(eventPath, `${JSON.stringify(events, null, 2)}\n`);
    console.log(`${file}: ${packet.decision} - ${packet.reason}`);
  }
}

main();
