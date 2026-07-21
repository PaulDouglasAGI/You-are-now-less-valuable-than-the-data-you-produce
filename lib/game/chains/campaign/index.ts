import type { ChainDef } from "../../types";
import { campaignLevel1 } from "./level1";
import { campaignLevel2 } from "./level2";
import { campaignLevel3 } from "./level3";
import { campaignLevel4 } from "./level4";
import { campaignLevel5 } from "./level5";
import { campaignLevel6 } from "./level6";

export const campaignMissions: ChainDef[] = [
  campaignLevel1,
  campaignLevel2,
  campaignLevel3,
  campaignLevel4,
  campaignLevel5,
  campaignLevel6,
];

export { transmissionsByAfter, campaignTransmissions } from "./transmissions";

/** the campaign mission that follows `missionId` in sequence, or null after the finale */
export function nextCampaignMissionId(missionId: string): string | null {
  const idx = campaignMissions.findIndex((m) => m.id === missionId);
  if (idx === -1 || idx === campaignMissions.length - 1) return null;
  return campaignMissions[idx + 1].id;
}
