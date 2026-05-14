import type {
  GrowthProviderContextEntity,
  GrowthProviderContextPacket,
  GrowthProviderWorkerLane,
} from "@bukeer/website-contract";
import type { SupabaseLike } from "@/lib/growth/autonomy/runtime-common";

export interface BuildGrowthProviderContextPacketOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  workerLane: GrowthProviderWorkerLane;
  workType: string;
  entity: Partial<GrowthProviderContextEntity> & Pick<GrowthProviderContextEntity, "type">;
  requiredProfileIds?: string[];
  allowedActions?: string[];
  now?: Date;
}

export type GrowthProviderContextPacketResult = GrowthProviderContextPacket;

export type GrowthProviderContextPacketTableRow = Record<string, unknown>;
