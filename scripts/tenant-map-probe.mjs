import {
  T3nClient,
  TenantClient,
  getNodeUrl,
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

    const tenantDid =
      me && typeof me === "object" && typeof me.tenant === "string"
        ? me.tenant
        : null;

    if (!tenantDid) {
      throw new Error("TENANT_DID_MISSING");
    }

    const tenantControlClient = new TenantClient({
      environment: "testnet",
      baseUrl,
      endpoint: baseUrl,
      t3n: client,
      tenantDid,
    });

    const tail = `map-probe-${Date.now()}`;
    console.log("MAP_TAIL:", tail);
    let mapCreated = false;

    console.log("MAP_TAIL_FORMAT_VALID:", tail.startsWith("map-probe-"));
    console.log("MAP_VISIBILITY_CANDIDATE: private");

    try {
      const createResult = await tenantControlClient.maps.create({
        tail,
        visibility: "private",
        writers: "all",
      });

      mapCreated = true;
      console.log("MAP_CREATE_PASS");
      console.log(
        "MAP_CREATE_RESULT_TYPE:",
        Array.isArray(createResult) ? "array" : typeof createResult
      );
    } catch (mapError) {
      console.log("MAP_CREATE_FAILED");
      console.log(
        "MAP_CREATE_ERROR:",
        mapError instanceof Error
          ? mapError.message.slice(0, 500)
          : String(mapError).slice(0, 500)
      );
    } finally {
      if (mapCreated) {
        try {
          const deleteResult = await tenantControlClient.maps.delete(tail);

          console.log("MAP_DELETE_PASS");
          console.log(
            "MAP_DELETE_RESULT_TYPE:",
            Array.isArray(deleteResult) ? "array" : typeof deleteResult
          );
        } catch (deleteError) {
          console.log("MAP_DELETE_FAILED");
          console.log(
            "MAP_DELETE_ERROR:",
            deleteError instanceof Error
              ? deleteError.message.slice(0, 500)
              : String(deleteError).slice(0, 500)
          );
        }
      } else {
        console.log("MAP_DELETE_SKIPPED");
      }
    }
  } catch (tenantError) {
    console.log("TENANT_ME_NOT_AVAILABLE");
    console.log(
      "TENANT_ME_ERROR:",
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
