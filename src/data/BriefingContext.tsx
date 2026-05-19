import { createContext, useContext } from 'react';
import type { BriefingData } from './briefing';
import { defaultBriefing } from './briefing';

export const BriefingContext = createContext<BriefingData>(defaultBriefing);

export function useBriefing(): BriefingData {
  return useContext(BriefingContext);
}

// Sheet 开关全局共享
interface SheetCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const SheetContext = createContext<SheetCtx>({ open: false, setOpen: () => {} });

export function useSheet(): SheetCtx {
  return useContext(SheetContext);
}
