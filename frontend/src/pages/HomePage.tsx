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
      {/* Hero Section */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Core Stack Initialized
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            FlowFactory Foundation Ready
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Smart Inventory Management System monorepo successfully initialized. The client-agnostic backend REST API and modern React frontend are configured for high-performance development.
          </p>
        </div>
      </div>

      {/* Grid of System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Backend Status Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
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
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Target URL:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-medium">{health?.service || 'FlowFactory API'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Environment:</span>
                <span className="font-medium uppercase text-blue-600 dark:text-blue-400">
                  {health?.environment || 'development'}
                </span>
              </div>
              {health?.uptimeSeconds !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Uptime:</span>
                  <span className="font-medium">{health.uptimeSeconds}s</span>
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
              className="w-full gap-2 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Pinging API...' : 'Ping Health Endpoint'}
            </Button>
          </CardFooter>
        </Card>

        {/* Frontend Architecture Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Frontend Client
            </CardTitle>
            <CardDescription className="text-xs">
              Vite + React 19 + Tailwind CSS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">UI System</span>
              <span className="font-medium">shadcn/ui + Tailwind</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Client Router</span>
              <span className="font-medium">React Router 7</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Server State</span>
              <span className="font-medium">TanStack Query v5</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Schema Validation</span>
              <span className="font-medium">Zod + React Hook Form</span>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="w-full text-center text-[11px] text-slate-400">
              Client-Agnostic REST Architecture
            </div>
          </CardFooter>
        </Card>

        {/* Planned Architecture Principles Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
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
              <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Centralized Inventory Service</p>
                <p className="text-slate-500 text-[11px]">All stock changes use one unified service</p>
              </div>
            </div>
            <div className="flex items-start gap-2 py-1">
              <FileCheck2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Human-Verified OCR</p>
                <p className="text-slate-500 text-[11px]">OCR never directly modifies inventory</p>
              </div>
            </div>
            <div className="flex items-start gap-2 py-1">
              <Database className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Immutable Ledger</p>
                <p className="text-slate-500 text-[11px]">InventoryTransaction is source of truth</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="w-full text-center text-[11px] text-slate-400">
              Next Step: M2 Database Foundation
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Development Roadmap Preview */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Milestone Progression
          </CardTitle>
          <CardDescription>
            FlowFactory is being engineered incrementally in structured phases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-400">M0</span>
                <Badge variant="success" className="text-[10px] py-0 px-1.5">Done</Badge>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">Architecture & Rules</p>
              <p className="text-slate-500 text-[11px] mt-1">PRD, Architecture, AI Rules</p>
            </div>

            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-800 dark:text-blue-400">M1</span>
                <Badge variant="default" className="text-[10px] py-0 px-1.5">Current</Badge>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">Project Foundation</p>
              <p className="text-slate-500 text-[11px] mt-1">Frontend + Backend Monorepo</p>
            </div>

            <div className="rounded-lg p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">M2</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">Database Foundation</p>
              <p className="text-slate-500 text-[11px] mt-1">PostgreSQL & Prisma Ledger</p>
            </div>

            <div className="rounded-lg p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">M3</span>
                <span className="text-[10px] text-slate-400">Pending</span>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">Backend Foundation</p>
              <p className="text-slate-500 text-[11px] mt-1">Central Inventory Service Core</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
