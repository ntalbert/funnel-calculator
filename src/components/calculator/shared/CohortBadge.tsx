import type { CampaignProfileId, ProfileCategory } from '../engine/types';
import { CAMPAIGN_PROFILES } from '../engine/defaults';
import { formatNum } from './formatters';

interface CohortBadgeProps {
  cohortName: string;
  profileId: CampaignProfileId;
  strategyType: ProfileCategory;
  owner?: string;
  totalAccounts: number;
  closedWon: number;
}

export function CohortBadge({ cohortName, profileId, strategyType, owner, totalAccounts, closedWon }: CohortBadgeProps) {
  const profile = CAMPAIGN_PROFILES[profileId];
  const isCold = strategyType === 'cold';
  const conversionPct = totalAccounts > 0 ? ((closedWon / totalAccounts) * 100).toFixed(1) : '0.0';

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-800 border-2 ${
      isCold ? 'border-blue-500/60' : 'border-orange-500/60'
    }`}>
      <div
        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
        style={{ backgroundColor: profile.chartColor }}
      />
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-white truncate">{cohortName}</span>
          <span className={`text-[9px] px-1 py-px rounded ${
            isCold ? 'text-blue-400 bg-blue-900/30' : 'text-orange-400 bg-orange-900/30'
          }`}>
            {isCold ? 'Cold' : 'Warm'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-400">
          {owner && <span className="truncate">{owner}</span>}
          <span>{formatNum(totalAccounts)} accts</span>
          <span>{conversionPct}% won</span>
        </div>
      </div>
    </div>
  );
}
