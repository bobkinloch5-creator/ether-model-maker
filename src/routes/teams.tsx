import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Users,
  Plus,
  Loader2,
  Crown,
  Mail,
  Trash2,
  Check,
  X,
  Sparkles,
  UserPlus,
  Folder,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams — Collaborate on AI 3D Projects | KingDavez Studios (Beta)" },
      { name: "description", content: "Create or join teams to collaborate with friends on shared AI 3D model projects, manage permissions, and pool credits for larger generations." },
      { name: "keywords", content: "3D collaboration team, AI mesh team project, shared 3D models, team workspace, game dev collaboration" },
      { property: "og:title", content: "Teams — Collaborate on AI 3D Projects | KingDavez Studios" },
      { property: "og:description", content: "Create or join teams to collaborate on shared AI 3D model projects." },
      { property: "og:url", content: "https://kingdavez.click/teams" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/teams" }],
  }),
  component: TeamsPage,
});

type Team = { id: string; name: string; owner_id: string; created_at: string };
type Member = { id: string; team_id: string; user_id: string; role: string; created_at: string };
type Invite = {
  id: string;
  team_id: string;
  email: string;
  role: string;
  invited_by: string;
  accepted: boolean;
  expires_at: string;
  created_at: string;
};
type Project = { id: string; name: string; team_id: string | null; created_at: string };

function TeamsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitesForMe, setInvitesForMe] = useState<Invite[]>([]);
  const [teamInvites, setTeamInvites] = useState<Invite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!user || !profile) return;
    setLoading(true);

    const [{ data: t }, { data: m }, { data: meInv }, { data: prj }] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: false }),
      supabase.from("team_members").select("*"),
      supabase.from("team_invites").select("*").ilike("email", profile.email).eq("accepted", false),
      supabase.from("projects").select("id,name,team_id,created_at").not("team_id", "is", null),
    ]);

    setTeams((t as Team[]) ?? []);
    setMembers((m as Member[]) ?? []);
    setInvitesForMe((meInv as Invite[]) ?? []);
    setProjects((prj as Project[]) ?? []);

    // Resolve member emails
    const ids = Array.from(new Set((m as Member[] | null)?.map((x) => x.user_id) ?? []));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,email")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profs as { id: string; email: string }[] | null)?.forEach((p) => (map[p.id] = p.email));
      setMemberEmails(map);
    }

    if (!selectedId && (t as Team[] | null)?.length) {
      setSelectedId((t as Team[])[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && profile) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.email]);

  // Realtime: refresh data when teams/members/invites/projects change anywhere
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("teams-collab")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_invites" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!selectedId) {
      setTeamInvites([]);
      return;
    }
    supabase
      .from("team_invites")
      .select("*")
      .eq("team_id", selectedId)
      .eq("accepted", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTeamInvites((data as Invite[]) ?? []));
  }, [selectedId, busy]);

  const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedId), [teams, selectedId]);
  const selectedMembers = useMemo(
    () => members.filter((m) => m.team_id === selectedId),
    [members, selectedId],
  );
  const selectedProjects = useMemo(
    () => projects.filter((p) => p.team_id === selectedId),
    [projects, selectedId],
  );
  const isOwnerOfSelected = useMemo(
    () =>
      !!selectedTeam &&
      selectedMembers.some((m) => m.user_id === user?.id && m.role === "owner"),
    [selectedTeam, selectedMembers, user?.id],
  );

  const createTeam = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.rpc("create_team", { _name: newName.trim() });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Team created", { description: newName });
    setNewName("");
    setSelectedId(data as string);
    await load();
  };

  const sendInvite = async () => {
    if (!selectedId || !inviteEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("invite_to_team", {
      _team_id: selectedId,
      _email: inviteEmail.trim(),
      _role: inviteRole,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Invite sent", { description: inviteEmail });
    setInviteEmail("");
  };

  const acceptInvite = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("accept_team_invite", { _invite_id: id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome aboard!", { description: "You're now a team member." });
    await load();
  };

  const removeMember = async (memberId: string, userId: string) => {
    if (userId === user?.id) {
      if (!confirm("Leave this team?")) return;
    } else {
      if (!confirm("Remove this member?")) return;
    }
    setBusy(true);
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(userId === user?.id ? "Left team" : "Member removed");
    await load();
  };

  const cancelInvite = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("team_invites").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setTeamInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const deleteTeam = async () => {
    if (!selectedTeam) return;
    if (!confirm(`Delete "${selectedTeam.name}"? Projects stay but lose team link.`)) return;
    setBusy(true);
    const { error } = await supabase.from("teams").delete().eq("id", selectedTeam.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Team deleted");
    setSelectedId(null);
    await load();
  };

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-glow" />
            <span className="font-display font-semibold">Teams</span>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              <span className="gradient-text">Teams</span>
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Build together. Invite friends, share a project workspace, and watch each other&apos;s creations come to life.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Real-time sync · changes appear instantly
            </div>
          </div>
        </div>

        {/* Pending invites for me */}
        {invitesForMe.length > 0 && (
          <div className="mb-6 glass rounded-2xl border border-primary/30 p-5 animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <PartyPopper className="h-5 w-5 text-primary-glow" />
              <h2 className="font-display font-semibold">You&apos;ve been invited!</h2>
            </div>
            <ul className="space-y-2">
              {invitesForMe.map((inv) => {
                const team = teams.find((t) => t.id === inv.team_id);
                return (
                  <li key={inv.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                    <div>
                      <div className="font-medium">{team?.name ?? "A team"}</div>
                      <div className="text-xs text-muted-foreground">As {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={() => acceptInvite(inv.id)}
                      disabled={busy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--gradient-primary)] px-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Create a team</h3>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTeam()}
                  placeholder="My squad"
                  maxLength={80}
                  className="h-10 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
                />
                <button
                  onClick={createTeam}
                  disabled={creating || !newName.trim()}
                  className="h-10 rounded-xl bg-[var(--gradient-primary)] px-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl p-2">
              <h3 className="px-2 pt-2 pb-1 text-xs uppercase tracking-wider text-muted-foreground">Your teams ({teams.length})</h3>
              {loading ? (
                <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary/60" /></div>
              ) : teams.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">No teams yet — create one above.</p>
              ) : (
                <ul className="space-y-1 p-1">
                  {teams.map((t) => {
                    const count = members.filter((m) => m.team_id === t.id).length;
                    const iAmOwner = members.some((m) => m.team_id === t.id && m.user_id === user?.id && m.role === "owner");
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => setSelectedId(t.id)}
                          className={`w-full text-left rounded-xl px-3 py-2.5 transition ${
                            selectedId === t.id
                              ? "bg-primary/15 border border-primary/30"
                              : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{t.name}</span>
                            {iAmOwner && <Crown className="h-3.5 w-3.5 text-amber-300 shrink-0" />}
                          </div>
                          <div className="text-xs text-muted-foreground">{count} member{count === 1 ? "" : "s"}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Detail */}
          <section>
            {!selectedTeam ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-primary-glow" />
                <p className="mt-3 text-sm text-muted-foreground">Pick a team or create one to start collaborating.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">{selectedTeam.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Created {new Date(selectedTeam.created_at).toLocaleDateString()} · {selectedMembers.length} member{selectedMembers.length === 1 ? "" : "s"} · {selectedProjects.length} project{selectedProjects.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {isOwnerOfSelected && (
                      <button
                        onClick={deleteTeam}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 h-9 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete team
                      </button>
                    )}
                  </div>
                </div>

                {/* Invite */}
                {isOwnerOfSelected && (
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <UserPlus className="h-4 w-4 text-primary-glow" />
                      <h3 className="font-display font-semibold">Invite a teammate</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-[220px]">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                          placeholder="friend@example.com"
                          type="email"
                          maxLength={255}
                          className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                        className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={sendInvite}
                        disabled={busy || !inviteEmail.trim()}
                        className="h-10 rounded-xl bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Invite
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      They&apos;ll see the invite next time they open the Teams page (must sign up with that email first).
                    </p>

                    {teamInvites.length > 0 && (
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <p className="text-xs text-muted-foreground mb-2">Pending invites</p>
                        <ul className="space-y-1.5">
                          {teamInvites.map((i) => (
                            <li key={i.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                              <span><span className="text-muted-foreground">{i.role}</span> · {i.email}</span>
                              <button onClick={() => cancelInvite(i.id)} className="rounded p-1 hover:bg-white/10 text-muted-foreground" title="Cancel">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Members */}
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary-glow" /> Members
                  </h3>
                  <ul className="space-y-1.5">
                    {selectedMembers.map((m) => (
                      <li key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gradient-primary)] text-xs font-semibold text-white">
                            {(memberEmails[m.user_id] ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {memberEmails[m.user_id] ?? m.user_id.slice(0, 8)}
                              {m.user_id === user?.id && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              {m.role === "owner" && <Crown className="h-3 w-3 text-amber-300" />}
                              {m.role}
                            </div>
                          </div>
                        </div>
                        {(isOwnerOfSelected && m.role !== "owner") || m.user_id === user?.id ? (
                          <button
                            onClick={() => removeMember(m.id, m.user_id)}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-rose-300"
                            title={m.user_id === user?.id ? "Leave team" : "Remove"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Team projects */}
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary-glow" /> Shared projects
                    </h3>
                    <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">Manage in dashboard →</Link>
                  </div>
                  {selectedProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team projects yet. In the dashboard, set a project&apos;s team to{" "}
                      <span className="font-medium text-foreground">{selectedTeam.name}</span> and everyone here can use it.
                    </p>
                  ) : (
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {selectedProjects.map((p) => (
                        <li key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
