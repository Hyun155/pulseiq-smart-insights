import { Link, useRouterState } from '@tanstack/react-router';
import { Activity, ChartNoAxesCombined, HeartPulse, History, House, MessageCircle, Play, RotateCcw, ShieldCheck, UserRound, Menu, X, FileText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { usePulse } from '@/pulseiq/store';
import { actionLevel } from '@/pulseiq/engine';

const nav = [
  { to: '/', label: 'Overview', icon: House }, { to: '/health-data', label: 'Health Data', icon: HeartPulse }, { to: '/insights', label: 'Insights', icon: ChartNoAxesCombined },
  { to: '/companion', label: 'AI Companion', icon: MessageCircle }, { to: '/timeline', label: 'Health Story', icon: History }, { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/profile', label: 'Health profile', icon: UserRound }, { to: '/support', label: 'Trusted support', icon: ShieldCheck },
] as const;
export function Shell({ children }: { children: ReactNode }) {
  const { state, run, reset, addSymptom, notify } = usePulse();
  const level = actionLevel(state);
  const canNotify = !!state.contact.name.trim() && ((level === 'orange' && state.scenario === 'persistent' && state.contact.persistent) || (level === 'red' && state.contact.highConcern));
  const [open, setOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const title = nav.find(n => n.to === pathname)?.label ?? 'Overview';
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={22} strokeWidth={2.5} /></div><span>Pulse<span className="brand-accent">IQ</span></span></div>
      <div className="sidebar-section-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{nav.map(({ to, label, icon: Icon }) => <Link key={to} to={to} onClick={() => setOpen(false)} className={`nav-item ${pathname === to ? 'nav-active' : ''}`}><Icon size={19} strokeWidth={1.8}/><span>{label}</span>{label === 'AI Companion' && state.scenario === 'change' && state.step < 3 && <i className="nav-dot"/>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-profile"><div className="avatar">AM</div><div><strong>Alex Morgan</strong><small>Simulated profile</small></div></div><p className="sidebar-disclaimer">Simulation only. PulseIQ identifies changes in personal patterns; it does not provide a diagnosis.</p></div>
    </aside>
    {open && <div className="mobile-backdrop" onClick={() => setOpen(false)} />}
    <div className="main-column"><header className="topbar"><div className="topbar-left"><Button variant="ghost" size="icon" className="mobile-menu" onClick={() => setOpen(v => !v)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X/> : <Menu/>}</Button><span className="breadcrumb">PulseIQ <span>/</span> {title}</span></div><div className="topbar-right"><span className="demo-pill"><span/> LIVE DEMO</span><span className="topbar-date">Simulated data</span><div className="avatar avatar-small">AM</div></div></header>
      <main className="page-content">{children}</main>
    </div>
    <div className={`simulation-bar ${simulationOpen ? 'simulation-open' : ''}`}><button className="sim-toggle" onClick={() => setSimulationOpen(v => !v)} aria-expanded={simulationOpen}><div className="sim-label"><div className="sim-icon"><Play size={16} fill="currentColor"/></div><div><strong>Simulation Mode {simulationOpen ? '▴' : '▾'}</strong><span>Drive the PulseIQ story</span></div></div></button>{simulationOpen && <div className="sim-actions"><Button size="sm" variant="simOutline" onClick={() => run('stable')}>Stable</Button><Button size="sm" onClick={() => run('change')}><Play size={14}/> Detect persistent change</Button><Button size="sm" variant="simOutline" disabled={state.scenario === 'stable'} onClick={() => addSymptom('fatigue')}>Add fatigue</Button><Button size="sm" variant="simOutline" disabled={state.scenario === 'stable'} onClick={() => addSymptom('dizziness')}>Add dizziness</Button><Button size="sm" variant="simOutline" disabled={state.scenario === 'stable'} onClick={() => run('improved')}>Recheck: improved</Button><Button size="sm" variant="simOutline" disabled={state.scenario === 'stable'} onClick={() => run('persistent')}>Recheck: persistent</Button><Button size="sm" variant="simOutline" disabled={state.scenario === 'stable'} onClick={() => run('worsening')}>Worsening</Button><Button size="sm" variant="simOutline" disabled={!canNotify} onClick={notify}>Trigger trusted support</Button><Button size="icon" variant="ghost" title="Reset simulation" aria-label="Reset simulation" onClick={reset}><RotateCcw size={17}/></Button></div>}</div>
  </div>;
}
