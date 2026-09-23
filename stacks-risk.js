/** Read-only sBTC holder concentration snapshot. No keys, wallet connection, or transactions. */
export const SBTC_ASSET = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token";
const API = "https://api.hiro.so/extended/v3/tokens/ft";

function amount(value, label) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${label} must be a nonnegative integer string`);
  }
  return BigInt(value);
}

function percent(part, whole) {
  // Hundredths of one percent, avoiding floating-point loss for token base units.
  return Number((part * 10000n + whole / 2n) / whole) / 100;
}

export function analyzeSbtcHolders(supplyResponse, holdersResponse) {
  if (supplyResponse?.asset_identifier !== SBTC_ASSET) throw new Error("Unexpected token supply response");
  const supply = amount(supplyResponse.total, "total supply");
  if (supply === 0n) throw new Error("Total supply must be positive");
  if (!Array.isArray(holdersResponse?.results) || !Number.isSafeInteger(holdersResponse.total)) {
    throw new Error("Malformed holders response");
  }
  if (holdersResponse.total < holdersResponse.results.length) throw new Error("Holder count is inconsistent");

  const seen = new Set();
  const holders = holdersResponse.results.map(({ principal, balance }) => {
    if (typeof principal !== "string" || !/^(SP|SM)[A-Z0-9]+(?:\.[a-zA-Z0-9_-]+)?$/.test(principal)) {
      throw new Error("Malformed principal");
    }
    if (seen.has(principal)) throw new Error("Duplicate principal");
    seen.add(principal);
    return { principal, balance: amount(balance, "holder balance") };
  });
  holders.sort((a, b) => a.balance === b.balance ? a.principal.localeCompare(b.principal) : a.balance > b.balance ? -1 : 1);
  const sampledBalance = holders.reduce((sum, row) => sum + row.balance, 0n);
  if (sampledBalance > supply) throw new Error("Sampled balances exceed supply");
  const share = (n) => percent(holders.slice(0, n).reduce((sum, row) => sum + row.balance, 0n), supply);
  return {
    asset: SBTC_ASSET,
    totalSupplyBaseUnits: supply.toString(),
    reportedHolderCount: holdersResponse.total,
    sampledHolderCount: holders.length,
    sampledSharePct: percent(sampledBalance, supply),
    top1SharePct: share(1),
    top10SharePct: share(10),
    top25SharePct: share(25),
    sampledContractPrincipalCount: holders.filter(({ principal }) => principal.includes(".")).length,
    topHolders: holders.slice(0, 10).map(({ principal, balance }) => ({
      principal,
      balanceBaseUnits: balance.toString(),
      sharePct: percent(balance, supply),
      isContractPrincipal: principal.includes("."),
    })),
    interpretation: "Raw on-chain principal balances only. Custodial and contract principals may aggregate many beneficial owners; these shares do not measure DEX liquidity, trading performance, or market manipulation.",
  };
}

async function getJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Hiro API HTTP ${response.status}`);
  return response.json();
}

export async function fetchSbtcSnapshot({ limit = 100, fetchImpl = fetch } = {}) {
  if (!Number.isInteger(limit) || limit < 25 || limit > 200) throw new Error("limit must be 25–200");
  const startedAt = new Date().toISOString();
  const path = `${API}/${encodeURIComponent(SBTC_ASSET)}`;
  const [supply, holders] = await Promise.all([
    getJson(`${path}/supply`, fetchImpl),
    getJson(`${path}/holders?limit=${limit}`, fetchImpl),
  ]);
  return {
    source: "Hiro Stacks Blockchain API v3, mainnet",
    endpoint: path,
    startedAt,
    completedAt: new Date().toISOString(),
    ...analyzeSbtcHolders(supply, holders),
  };
}
