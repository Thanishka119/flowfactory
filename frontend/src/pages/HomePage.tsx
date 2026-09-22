import { useQuery } from '@tanstack/react-query';
import { healthService } from '@/services/health.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Globe, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Layers,
  FileCheck2,
  Workflow
} from 'lucide-react';

export function HomePage() {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.getHealth,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Hero Section — FlowFactory navy with warm beige accents */}
      <div className="rounded-2xl bg-[#2F344F] p-8 text-white shadow-xl shadow-[#2F344F]/10 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="home-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#home-grid)" />
          </svg>
        </div>
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#E5DCC0]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#ACBAC4]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#252A40]/80 border border-[#ACBAC4]/20 px-3 py-1 text-xs font-mono text-[#E5DCC0]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Core Stack Initialized
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            FlowFactory Foundation Ready
          </h1>
          <p className="text-[#ACBAC4] text-sm sm:text-base leading-relaxed">
            Smart Inventory Management System monorepo successfully initialized. The client-agnostic backend REST API and modern React frontend are configured for high-performance development.
          </p>
        </div>
      </div>

      {/* Grid of System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Backend Status Card */}
        <Card className="border-[#ACBAC4]/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-[#2F344F]" />
                Backend REST API
              </CardTitle>
              <CardDescription className="text-xs">
                Node.js + Express + TypeScript
              </CardDescription>
            </div>
            {isLoading ? (
              <Badge variant="secondary" className="font-mono text-xs">Checking...</Badge>
            ) : isError ? (
              <Badge variant="destructive" className="font-mono text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Offline
              </Badge>
            ) : (
              <Badge variant="success" className="font-mono text-xs gap-1">
                <CheckCircle className="h-3 w-3" /> Online
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="rounded-lg bg-[#F1F0DC]/50 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#2F344F]/60">Target URL:</span>
                <span className="font-medium text-[#2F344F]">
                  {import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#2F344F]/60">Service:</span>
                <span className="font-medium text-[#2F344F]">{health?.service || 'FlowFactory API'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#2F344F]/60">Environment:</span>
                <span className="font-medium uppercase text-[#2F344F]">
                  {health?.environment || 'development'}
                </span>
              </div>
              {health?.uptimeSeconds !== undefined && (
                <div className="flex justify-between">
                  <span className="text-[#2F344F]/60">Uptime:</span>
                  <span className="font-medium text-[#2F344F]">{health.uptimeSeconds}s</span>
                </div>
              )}
            </div>
            {isError && (
              <p className="text-xs text-rose-500">
                {error instanceof Error ? error.message : 'Could not reach backend server.'}
              </p>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-[#ACBAC4]/40 hover:bg-[#F1F0DC]/60 hover:text-[#2F344F]"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Pinging API...' : 'Ping Health Endpoint'}
            </Button>
          </CardFooter>
        </Card>

        {/* Frontend Architecture Card */}
        <Card className="border-[#ACBAC4]/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#2F344F]" />
              Frontend Client
            </CardTitle>
            <CardDescription className="text-xs">
              Vite + React 19 + Tailwind CSS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#ACBAC4]/20">
              <span className="text-[#2F344F]/60">UI System</span>
              <span className="font-medium text-[#2F344F]">shadcn/ui + Tailwind</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#ACBAC4]/20">
              <span className="text-[#2F344F]/60">Client Router</span>
              <span className="font-medium text-[#2F344F]">React Router 7</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#ACBAC4]/20">
              <span className="text-[#2F344F]/60">Server State</span>
              <span className="font-medium text-[#2F344F]">TanStack Query v5</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#2F344F]/60">Schema Validation</span>
              <span className="font-medium text-[#2F344F]">Zod + React Hook Form</span>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="w-full text-center text-[11px] text-[#ACBAC4]">
              Client-Agnostic REST Architecture
            </div>
          </CardFooter>
        </Card>

        {/* Core Invariants Card */}
        <Card className="border-[#ACBAC4]/30 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Core Invariants
            </CardTitle>
            <CardDescription className="text-xs">
              Architectural Constraints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2 text-xs">
            <div className="flex items-start gap-2 py-1">
              <Layers className="h-4 w-4 text-[#2F344F] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#2F344F]">Centralized Inventory Service</p>
                <p className="text-[#2F344F]/50 text-[11px]">All stock changes use one unified service</p>
              </div>
            </div>
            <div className="flex items-start gap-2 py-1">
              <FileCheck2 className="h-4 w-4 text-[#2F344F] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#2F344F]">Human-Verified OCR</p>
                <p className="text-[#2F344F]/50 text-[11px]">OCR never directly modifies inventory</p>
              </div>
            </div>
            <div className="flex items-start gap-2 py-1">
              <Database className="h-4 w-4 text-[#2F344F] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#2F344F]">Immutable Ledger</p>
                <p className="text-[#2F344F]/50 text-[11px]">InventoryTransaction is source of truth</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="w-full text-center text-[11px] text-[#ACBAC4]">
              Next Step: M2 Database Foundation
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Milestone Progression */}
      <Card className="border-[#ACBAC4]/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="h-5 w-5 text-[#2F344F]" />
            Milestone Progression
          </CardTitle>
          <CardDescription>
            FlowFactory is being engineered incrementally in structured phases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* M0 — Done */}
            <div className="rounded-lg p-3 bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-800">M0</span>
                <Badge variant="success" className="text-[10px] py-0 px-1.5">Done</Badge>
              </div>
              <p className="font-medium text-[#2F344F]">Architecture & Rules</p>
              <p className="text-[#2F344F]/50 text-[11px] mt-1">PRD, Architecture, AI Rules</p>
            </div>

            {/* M1 — Current */}
            <div className="rounded-lg p-3 bg-[#E5DCC0]/30 border border-[#E5DCC0]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#2F344F]">M1</span>
                <Badge variant="default" className="text-[10px] py-0 px-1.5 bg-[#2F344F]">Current</Badge>
              </div>
              <p className="font-medium text-[#2F344F]">Project Foundation</p>
              <p className="text-[#2F344F]/50 text-[11px] mt-1">Frontend + Backend Monorepo</p>
            </div>

            {/* M2 — Pending */}
            <div className="rounded-lg p-3 bg-[#F1F0DC]/50 border border-[#ACBAC4]/25">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#2F344F]/60">M2</span>
                <span className="text-[10px] text-[#ACBAC4]">Pending</span>
              </div>
              <p className="font-medium text-[#2F344F]">Database Foundation</p>
              <p className="text-[#2F344F]/50 text-[11px] mt-1">PostgreSQL & Prisma Ledger</p>
            </div>

            {/* M3 — Pending */}
            <div className="rounded-lg p-3 bg-[#F1F0DC]/50 border border-[#ACBAC4]/25">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#2F344F]/60">M3</span>
                <span className="text-[10px] text-[#ACBAC4]">Pending</span>
              </div>
              <p className="font-medium text-[#2F344F]">Backend Foundation</p>
              <p className="text-[#2F344F]/50 text-[11px] mt-1">Central Inventory Service Core</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
