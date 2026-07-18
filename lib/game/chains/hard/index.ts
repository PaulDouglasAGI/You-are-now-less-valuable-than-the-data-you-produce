import type { ChainDef } from "../../types";
import { hardChain } from "./level1";
import { hardLevel2 } from "./level2";
import { hardLevel3 } from "./level3";
import { hardLevel4 } from "./level4";

export const hardMissions: ChainDef[] = [hardChain, hardLevel2, hardLevel3, hardLevel4];
