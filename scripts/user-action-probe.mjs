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

  const usageBefore = await client.getUsage();
  const auditBefore = await client.getAuditEvents({ limit: 20 });

  const walletAddress = await client.getSelfEthAddress();
  console.log("GET_SELF_ETH_ADDRESS_PASS");
  console.log(
    "ADDRESS_MASKED:",
    walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "NULL"
  );

  const wallets = await client.listUserWallets();
  console.log("LIST_USER_WALLETS_PASS");
  console.log("PRIMARY_MATCH:", wallets.primary === walletAddress);
  console.log("SECONDARY_COUNT:", wallets.secondary.length);

  const usageAfter = await client.getUsage();
  const auditAfter = await client.getAuditEvents({ limit: 20 });

  const beforeAvailable = usageBefore?.balance?.available ?? null;
  const afterAvailable = usageAfter?.balance?.available ?? null;

  console.log("BALANCE_BEFORE:", beforeAvailable);
  console.log("BALANCE_AFTER:", afterAvailable);
  console.log(
    "BALANCE_DELTA:",
    typeof beforeAvailable === "number" && typeof afterAvailable === "number"
      ? afterAvailable - beforeAvailable
      : "UNKNOWN"
  );

  console.log(
    "USAGE_ENTRIES_BEFORE:",
    Array.isArray(usageBefore?.entries) ? usageBefore.entries.length : "UNKNOWN"
  );
  console.log(
    "USAGE_ENTRIES_AFTER:",
    Array.isArray(usageAfter?.entries) ? usageAfter.entries.length : "UNKNOWN"
  );
  console.log(
    "AUDIT_BATCHES_BEFORE:",
    Array.isArray(auditBefore?.batches) ? auditBefore.batches.length : "UNKNOWN"
  );
  console.log(
    "AUDIT_BATCHES_AFTER:",
    Array.isArray(auditAfter?.batches) ? auditAfter.batches.length : "UNKNOWN"
  );
} catch (error) {
  console.error("AUTH_PROBE_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
