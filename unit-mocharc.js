// NOTE: Comment your file after the test.
const filesToTest = [
  // "tests/**/*.spec.ts",

  "tests/brokers/globalblock.spec.ts",

  // "tests/event-listener/d2-event-listener.spec.ts",
  // "tests/calculations/rebalance-calculation.spec.ts",
  // "tests/calculations/order-calculation.spec.ts",
  // "tests/notifications/notifications.spec.ts",
  // "tests/lit-actions/lit-actions-cases.spec.ts",
  // "tests/weavedb/weavedb-cases.spec.ts",
];

module.exports = {
  "extension": [
    "ts"
  ],
  "timeout": "99999999",
  "spec": filesToTest,
  "require": [
    "ts-node/register",
    "source-map-support/register"
  ],
  "recursive": "true",
  "exclude": []
}