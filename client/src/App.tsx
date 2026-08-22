import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const AdminMode = lazy(() => import("@/pages/AdminMode"));
const Workspace = lazy(() => import("@/pages/Workspace"));

function RouteLoading() { return <main className="auth-shell"><div className="loading-mark" aria-live="polite">Loading Cleanvee workspace…</div></main>; }

function Router() { return <Suspense fallback={<RouteLoading />}><Switch><Route path="/" component={Workspace} /><Route path="/admin" component={AdminMode} /><Route component={Workspace} /></Switch></Suspense>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
