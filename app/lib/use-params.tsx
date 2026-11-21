"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultParams, type Params } from "@/lib/params";

const ParamsContext = createContext(defaultParams);

export function ParamsProvider({ params, children }: { params: Params; children: ReactNode }) {
  return <ParamsContext value={params}>{children}</ParamsContext>;
}

export const useParamsConfig = () => useContext(ParamsContext);
