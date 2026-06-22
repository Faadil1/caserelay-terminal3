import {
  T3nClient,
  TenantClient,
  getNodeUrl,
  createOrgDataClientFromSession,
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

  const baseUrl = getNodeUrl();
  const tenantClient = new TenantClient({
    environment: "testnet",
    baseUrl,
    endpoint: baseUrl,
    t3n: client,
  });

  try {
    const me = await tenantClient.tenant.me();

    console.log("TENANT_ME_PASS");
    console.log(
      "TENANT_PRESENT:",
      Boolean(me && typeof me === "object" && me.tenant)
    );
    console.log(
      "TENANT_STATUS:",
      me && typeof me === "object" ? me.status ?? "UNKNOWN" : "UNKNOWN"
    );
    console.log(
      "TENANT_LABEL_PRESENT:",
      Boolean(me && typeof me === "object" && me.label)
    );

    const orgDid =
      me && typeof me === "object" && typeof me.tenant === "string"
        ? me.tenant
        : null;

    if (!orgDid) {
      throw new Error("TENANT_DID_MISSING");
    }

    console.log(
      "ORG_DID_MASKED:",
      `${orgDid.slice(0, 12)}...${orgDid.slice(-6)}`
    );

    const orgData = createOrgDataClientFromSession(client, baseUrl);
    let policy;

    try {
      policy = await orgData.policyGet({ orgDid });
      console.log("POLICY_ALREADY_INITIALISED");
    } catch (policyError) {
      const message =
        policyError instanceof Error
          ? policyError.message
          : String(policyError);

      if (!message.includes("OrgPolicyNotInitialised")) {
        throw policyError;
      }

      console.log("POLICY_NOT_INITIALISED_CONFIRMED");

      const created = await orgData.createPolicy({
        orgDid,
        initialAdminDid: did.toString(),
      });

      console.log("CREATE_POLICY_PASS");
      console.log("CREATE_POLICY_STATUS:", created.status);
      console.log(
        "CREATE_POLICY_TX_PRESENT:",
        Boolean(created.tx_hash)
      );

      policy = await orgData.policyGet({ orgDid });
    }

    console.log("POLICY_GET_PASS");
    console.log("ADMIN_COUNT:", policy.admins.length);
    console.log("MAX_ADMINS:", policy.max_admins);
    console.log(
      "CALLER_IS_ADMIN:",
      policy.admins.includes(did.toString())
    );
  } catch (tenantError) {
    console.log("ORG_POLICY_BOOTSTRAP_FAILED");
    console.log(
      "ORG_POLICY_BOOTSTRAP_ERROR:",
      tenantError instanceof Error
        ? tenantError.message.slice(0, 300)
        : String(tenantError).slice(0, 300)
    );
  }
} catch (error) {
  console.error("AUTH_PROBE_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
