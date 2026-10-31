"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, ChevronRight, ClipboardList, Heart, HelpCircle, Info, Settings, User } from "lucide-react";
import { getTradeDashboard, type CurrentProfile } from "@/lib/trade/api";

export function ProfileOverview({ profile, email, onEdit }: Readonly<{ profile: CurrentProfile | null; email: string; onEdit: () => void }>) {
  const [stats, setStats] = useState<{ listings: number; saved: number; views: number } | null>(null);
  useEffect(() => {
    let active = true;
    void getTradeDashboard().then((dashboard) => {
      if (active) setStats({ listings: dashboard.listings.length, saved: dashboard.favorites.length, views: dashboard.listings.reduce((total, item) => total + (item.view_count ?? 0), 0) });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const name = profile?.display_name || profile?.full_name || "Your profile";
  const verified = profile?.verified_um_email === true;
  return <div className="mx-auto w-full max-w-2xl space-y-5 pb-4">
    <div className="flex h-0 items-center justify-between md:h-auto"><h1 className="sr-only text-xl font-semibold md:not-sr-only">Profile</h1><button aria-label="Edit profile settings" className="nexus-icon-button fixed right-4 top-[calc(12px+env(safe-area-inset-top))] z-50 md:static" onClick={onEdit} type="button"><Settings className="h-5 w-5" /></button></div>
    <section className="flex items-center gap-4 py-3" aria-label="Your profile">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="h-20 w-20 rounded-full object-cover" height={80} src={profile.avatar_url} width={80} />
      ) : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#e9f3f0] text-2xl font-semibold text-[#145c55]">{name === "Your profile" ? <User aria-hidden="true" className="h-9 w-9" /> : name.slice(0, 2).toUpperCase()}</div>}
      <div className="min-w-0"><h2 className="flex items-center gap-2 text-lg font-semibold">{name}{verified ? <BadgeCheck aria-label="Verified UM email" className="h-4 w-4 text-emerald-600" /> : null}</h2><p className="mt-1 text-xs text-slate-500">{verified ? "Verified UM email" : "UM community member"}</p><p className="mt-2 break-all text-xs text-slate-500">{email}</p></div>
    </section>
    <dl className="grid grid-cols-3 rounded-xl border border-slate-200 py-4 text-center">
      {[{ label: "Listings", value: stats?.listings }, { label: "Saved", value: stats?.saved }, { label: "Views", value: stats?.views }].map((item) => <div className="border-r border-slate-200 last:border-0" key={item.label}><dd className="text-lg font-semibold">{item.value ?? "—"}</dd><dt className="mt-1 text-xs text-slate-500">{item.label}</dt></div>)}
    </dl>
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {[{ label: "My Listings", href: "/trade/dashboard?tab=listings", icon: ClipboardList }, { label: "Saved Items", href: "/trade/saved", icon: Heart }].map(({ label, href, icon: Icon }) => <Link className="nexus-menu-row" href={href} key={href}><Icon aria-hidden="true" className="h-5 w-5" /><span className="flex-1">{label}</span><ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-400" /></Link>)}
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button className="nexus-menu-row w-full" onClick={onEdit} type="button"><Settings aria-hidden="true" className="h-5 w-5" /><span className="flex-1 text-left">Account Settings</span><ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-400" /></button>
      <Link className="nexus-menu-row" href="/safety"><HelpCircle aria-hidden="true" className="h-5 w-5" /><span className="flex-1">Help &amp; Safety</span><ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-400" /></Link>
      <Link className="nexus-menu-row" href="/terms"><Info aria-hidden="true" className="h-5 w-5" /><span className="flex-1">About UM Nexus</span><ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-400" /></Link>
    </div>

  </div>;
}
