import { randomUUID } from "node:crypto";
import {
  T3nClient,
  TenantClient,
  createEthAuthInput,
  eth_get_address,
  getNodeUrl,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
  validateTail,
} from "@terminal3/t3n-sdk";

let sessionPromise = null;

function getPrivateKey() {
  const privateKey = process.env.T3N_DEMO_KEY;
  if (!privateKey) {
    throw new Error("T3N_DEMO_KEY_MISSING");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("T3N_DEMO_KEY_INVALID");
  }
  return privateKey;
}

function maskDid(value) {
  if (typeof value !== "string" || value.length < 18) return "unavailable";
  return `${value.slice(0, 12)}...${value.slice(-6)}`;
}

function resultType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

export function terminal3SafeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/0x[0-9a-fA-F]{64}/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/did:t3n:[0-9a-fA-F]+/g, "[REDACTED_DID]")
    .replace(/0x[0-9a-fA-F]{40}/g, "[REDACTED_ADDRESS]")
    .slice(0, 500);
}

function toCaseTail(caseId) {
  const normalized = String(caseId ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  if (!normalized) {
    throw new Error("CASE_ID_INVALID");
  }

  return validateTail(`case-${normalized}`);
}

async function createSession() {
  setEnvironment("testnet");

  const privateKey = getPrivateKey();
  const address = eth_get_address(privateKey);
  const wasmComponent = await loadWasmComponent();

  const t3n = new T3nClient({
    wasmComponent,
    handlers: {
      EthSign: metamask_sign(address, undefined, privateKey),
    },
  });

  await t3n.handshake();
  const did = await t3n.authenticate(createEthAuthInput(address));
  const userDid = did.toString();
  const baseUrl = getNodeUrl();

  const lookupClient = new TenantClient({
    environment: "testnet",
    baseUrl,
    endpoint: baseUrl,
    t3n,
  });

  const me = await lookupClient.tenant.me();
  if (!me || typeof me !== "object") {
    throw new Error("TENANT_LOOKUP_INVALID");
  }

  const tenantDid = typeof me.tenant === "string" ? me.tenant : null;
  const tenantStatus = typeof me.status === "string" ? me.status : "unknown";

  if (!tenantDid) {
    throw new Error("TENANT_DID_MISSING");
  }
  if (tenantStatus !== "active") {
    throw new Error(`TENANT_NOT_ACTIVE:${tenantStatus}`);
  }

  const tenant = new TenantClient({
    environment: "testnet",
    baseUrl,
    endpoint: baseUrl,
    t3n,
    tenantDid,
  });

  return { tenant, tenantDid, tenantStatus, userDid };
}

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = createSession().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

function buildReceipt(action, tail, result, session) {
  return {
    receiptId: randomUUID(),
    provider: "Terminal 3",
    environment: "testnet",
    evidence: "LIVE",
    action,
    status: "SUCCESS",
    mapTail: tail,
    tenantStatus: session.tenantStatus,
    tenantDidMasked: maskDid(session.tenantDid),
    userDidMasked: maskDid(session.userDid),
    resultType: resultType(result),
    executedAt: new Date().toISOString(),
  };
}

export async function openCase(caseId) {
  const session = await getSession();
  const tail = toCaseTail(caseId);
  const result = await session.tenant.maps.create({
    tail,
    visibility: "private",
    writers: "all",
  });
  return buildReceipt("OPEN_CASE", tail, result, session);
}

export async function escalateCase(caseId) {
  const session = await getSession();
  const tail = toCaseTail(caseId);
  const result = await session.tenant.maps.update(tail, {
    readers: "all",
  });
  return buildReceipt("ESCALATE", tail, result, session);
}

export async function closeCase(caseId) {
  const session = await getSession();
  const tail = toCaseTail(caseId);
  const result = await session.tenant.maps.delete(tail);
  return buildReceipt("CLOSE_CASE", tail, result, session);
}

export async function terminal3Health() {
  const session = await getSession();
  return {
    connected: true,
    environment: "testnet",
    tenantStatus: session.tenantStatus,
    tenantDidMasked: maskDid(session.tenantDid),
    userDidMasked: maskDid(session.userDid),
  };
}
