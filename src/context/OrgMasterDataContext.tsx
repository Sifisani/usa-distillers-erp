import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DepartmentGroup,
  OrgMasterDataConfig,
  OrgShiftConfigItem,
  OrgTradeConfigItem,
  StandbyRosterEntry,
  UserProfile
} from '../types';
import {
  DEFAULT_ORG_MASTER_DATA,
  mergeOrgMasterData,
  resolveStandbyRosterEntries
} from '../core/master-data/orgMasterData';
import { saveOrgMasterData, subscribeOrgMasterData } from '../services/orgMasterDataService';
import { useAuth } from './AuthContext';

interface OrgMasterDataContextValue {
  config: OrgMasterDataConfig;
  departmentsByCategory: DepartmentGroup[];
  activeTrades: OrgTradeConfigItem[];
  activeShifts: OrgShiftConfigItem[];
  standbyRoster: StandbyRosterEntry[];
  loading: boolean;
  updateOrgMasterData: (nextConfig: OrgMasterDataConfig) => Promise<OrgMasterDataConfig>;
}

const OrgMasterDataContext = createContext<OrgMasterDataContextValue | undefined>(undefined);

export const OrgMasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [config, setConfig] = useState<OrgMasterDataConfig>(() => mergeOrgMasterData(null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setConfig(mergeOrgMasterData(null));
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeOrgMasterData(
      (next) => {
        setConfig(next);
        setLoading(false);
      },
      (err) => {
        console.warn('Org master data subscription error; falling back to defaults:', err);
        setConfig(mergeOrgMasterData(DEFAULT_ORG_MASTER_DATA));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const value = useMemo<OrgMasterDataContextValue>(() => {
    const activeTrades = config.trades.filter((t) => t.active !== false);
    const activeShifts = config.shifts.filter((s) => s.active !== false);
    const standbyRoster = resolveStandbyRosterEntries(config);

    return {
      config,
      departmentsByCategory: config.departments,
      activeTrades: activeTrades.length > 0 ? activeTrades : DEFAULT_ORG_MASTER_DATA.trades,
      activeShifts: activeShifts.length > 0 ? activeShifts : DEFAULT_ORG_MASTER_DATA.shifts,
      standbyRoster,
      loading,
      updateOrgMasterData: async (nextConfig: OrgMasterDataConfig) => {
        return saveOrgMasterData(nextConfig, {
          userName: userProfile?.displayName || currentUser?.email || 'Engineering Admin',
          userRole: userProfile?.role as UserProfile['role'],
          userEmail: userProfile?.email || currentUser?.email
        });
      }
    };
  }, [config, loading, currentUser, userProfile]);

  return (
    <OrgMasterDataContext.Provider value={value}>
      {children}
    </OrgMasterDataContext.Provider>
  );
};

export function useOrgMasterData(): OrgMasterDataContextValue {
  const ctx = useContext(OrgMasterDataContext);
  if (!ctx) {
    return {
      config: DEFAULT_ORG_MASTER_DATA,
      departmentsByCategory: DEFAULT_ORG_MASTER_DATA.departments,
      activeTrades: DEFAULT_ORG_MASTER_DATA.trades,
      activeShifts: DEFAULT_ORG_MASTER_DATA.shifts,
      standbyRoster: resolveStandbyRosterEntries(DEFAULT_ORG_MASTER_DATA),
      loading: false,
      updateOrgMasterData: async () => DEFAULT_ORG_MASTER_DATA
    };
  }
  return ctx;
}
