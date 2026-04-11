import "../lib/env.js";
import { resetStoreFromSeeds, summarizeStoreCounts } from "../lib/seeds.js";

async function loadSeeds() {
  const store = await resetStoreFromSeeds();
  console.log("Seeded local runtime store:");
  console.log(JSON.stringify(summarizeStoreCounts(store), null, 2));
}

void loadSeeds();
