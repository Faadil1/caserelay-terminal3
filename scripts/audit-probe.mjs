import {
  T3nClient,
  loadWasmComponent,
  setEnvironment,
  createEthAuthInput,
  eth_get_address,
  metamask_sign,
} from "@terminal3/t3n-sdk";

const privateKey = process.env.T3N_DEMO_KEY;

if (!privateKey) {
  console.error("AUTH_PROBE_FAIL: T3N_DEMO_KEY is missing");
  process.exit(2);
}

try {
  setEnvironment("testnet");

  const address = eth_get_address(privateKey);
  const wasmComponent = await loadWasmComponent();

  const client = new T3nClient({
    wasmComponent,
    handlers: {
      EthSign: metamask_sign(address, undefined, privateKey),
    },
  });

  await client.handshake();
  console.log("HANDSHAKE_PASS");

  const did = await client.authenticate(
    createEthAuthInput(address)
  );

  console.log("AUTH_PASS");
  console.log("DID_CONFIRMED:", did.toString().startsWith("did:"));

  const usage = await client.getUsage();
  console.log("GET_USAGE_PASS");
  console.log(
    "BALANCE_JSON:",
    JSON.stringify(
      usage?.balance ?? null,
      (_, value) => typeof value === "bigint" ? value.toString() : value
    )
  );
  console.log(
    "ENTRY_COUNT:",
    Array.isArray(usage?.entries) ? usage.entries.length : "UNKNOWN"
  );

  const audit = await client.getAuditEvents({ limit: 10 });

  console.log("GET_AUDIT_PASS");
  console.log(
    "AUDIT_BATCH_COUNT:",
    Array.isArray(audit?.batches) ? audit.batches.length : "UNKNOWN"
  );
  console.log(
    "AUDIT_HAS_CURSOR:",
    Boolean(audit?.next_cursor)
  );

} catch (error) {
  console.error("AUTH_PROBE_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
