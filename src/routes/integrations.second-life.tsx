import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Box, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/integrations/second-life")({
  head: () => ({
    meta: [
      { title: "Second Life — AI Mesh & DAE Export | KingDavez" },
      {
        name: "description",
        content:
          "SL-ready pipeline: low Land Impact, watertight mesh, DAE/COLLADA export, in-world delivery and an LSL HUD that mirrors the website.",
      },
      { property: "og:title", content: "Second Life — AI mesh upload guide" },
      {
        property: "og:description",
        content:
          "Generate 3D models from text or images directly inside Second Life with our LSL HUD.",
      },
      { property: "og:url", content: "https://kingdavez.click/integrations/second-life" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Second Life — AI Mesh & Texture Generator" },
      {
        name: "twitter:description",
        content:
          "Generate AI 3D models and textures optimized for Second Life mesh upload and delivery.",
      },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/second-life" }],
  }),
  component: SecondLifePage,
});

const LSL_SCRIPT = String.raw`// =====================================================================
// KingDavez Studios — In-world AI 3D HUD (Beta)
// Mirrors the website: text-to-3D, image-to-3D, balance, history.
// Get an API key:  https://kingdavez.click/dashboard  -> API
// =====================================================================

string API_BASE = "https://kingdavez.click/api/public/v1";
string API_KEY  = "";          // <-- paste your KingDavez API key here
integer CHAN    = 42;          // listen channel for commands
key    gReq;                   // current http request
integer gMode  = 0;            // 0=idle 1=create 2=me 3=list 4=poll
string  gLastId = "";

owner_say(string s) { llOwnerSay(s); }

post_create(string type, string prompt, string imageUrl) {
    string body = "{\"type\":\"" + type + "\",\"prompt\":\"" + prompt + "\"";
    if (imageUrl != "") body += ",\"image_url\":\"" + imageUrl + "\"";
    body += ",\"source\":\"sl-hud\"}";
    list params = [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + API_KEY,
        HTTP_BODY_MAXLENGTH, 16384,
        HTTP_VERIFY_CERT, TRUE
    ];
    gMode = 1;
    gReq = llHTTPRequest(API_BASE + "/generations", params, body);
    owner_say("⏳ Submitting " + type + "...");
}

get_me() {
    list params = [
        HTTP_METHOD, "GET",
        HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + API_KEY,
        HTTP_VERIFY_CERT, TRUE
    ];
    gMode = 2;
    gReq = llHTTPRequest(API_BASE + "/me", params, "");
}

get_list() {
    list params = [
        HTTP_METHOD, "GET",
        HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + API_KEY,
        HTTP_VERIFY_CERT, TRUE
    ];
    gMode = 3;
    gReq = llHTTPRequest(API_BASE + "/generations?limit=5", params, "");
}

default {
    state_entry() {
        llListen(CHAN, "", llGetOwner(), "");
        owner_say("KingDavez HUD ready on /" + (string)CHAN);
        owner_say("Commands:");
        owner_say("  /key <API_KEY>            — set your API key");
        owner_say("  /3d <prompt>              — text-to-3D");
        owner_say("  /img <URL> | <prompt>     — image-to-3D (paste an https image URL)");
        owner_say("  /balance                  — show your credit balance");
        owner_say("  /history                  — list recent generations");
    }

    touch_start(integer n) {
        if (llDetectedKey(0) != llGetOwner()) return;
        get_me();
    }

    listen(integer ch, string name, key id, string msg) {
        if (id != llGetOwner()) return;
        msg = llStringTrim(msg, STRING_TRIM);

        if (llSubStringIndex(msg, "/key ") == 0) {
            API_KEY = llGetSubString(msg, 5, -1);
            owner_say("🔑 API key set (" + (string)llStringLength(API_KEY) + " chars).");
            return;
        }

        if (API_KEY == "") {
            owner_say("⚠️  Set your API key first:  /key <your-key>");
            return;
        }

        if (msg == "/balance") { get_me(); return; }
        if (msg == "/history") { get_list(); return; }

        if (llSubStringIndex(msg, "/3d ") == 0) {
            string p = llGetSubString(msg, 4, -1);
            post_create("text-to-3d", p, "");
            return;
        }

        if (llSubStringIndex(msg, "/img ") == 0) {
            string rest = llGetSubString(msg, 5, -1);
            integer pipe = llSubStringIndex(rest, "|");
            if (pipe < 0) {
                owner_say("Usage:  /img https://example.com/photo.jpg | a stone gargoyle");
                return;
            }
            string url    = llStringTrim(llGetSubString(rest, 0, pipe - 1), STRING_TRIM);
            string prompt = llStringTrim(llGetSubString(rest, pipe + 1, -1), STRING_TRIM);
            if (llSubStringIndex(url, "https://") != 0) {
                owner_say("⚠️  Image URL must start with https://");
                return;
            }
            post_create("image-to-3d", prompt, url);
            return;
        }
    }

    http_response(key req, integer status, list meta, string body) {
        if (req != gReq) return;
        if (status != 200) {
            owner_say("❌ HTTP " + (string)status + ": " + llGetSubString(body, 0, 240));
            gMode = 0;
            return;
        }
        if (gMode == 1) {
            owner_say("✅ Submitted. Track progress at https://kingdavez.click/dashboard");
            owner_say(llGetSubString(body, 0, 400));
        } else if (gMode == 2) {
            owner_say("👤 Account: " + llGetSubString(body, 0, 400));
        } else if (gMode == 3) {
            owner_say("📜 Recent: " + llGetSubString(body, 0, 600));
        }
        gMode = 0;
    }
}
`;

function SecondLifePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(LSL_SCRIPT);
      setCopied(true);
      toast.success("LSL script copied — paste into a Second Life script.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select the text and copy manually.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/15 border border-pink-400/30">
            <Box className="h-6 w-6 text-pink-300" />
          </div>
          <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-pink-500/15 border border-pink-400/30 text-pink-300">
            Beta
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          AI mesh built for Second Life
        </h1>
        <p className="mt-3 text-muted-foreground">
          Generations exported through our SL pipeline are watertight, low-LI, and shipped as DAE /
          COLLADA — the format the Firestorm and official SL viewers expect.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Upload to Second Life</h2>
          <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
            <li>
              Generate a model, then click <strong>Export → DAE (Second Life)</strong> on the
              result.
            </li>
            <li>
              In the SL viewer: <code className="text-foreground">Build → Upload → Model…</code> and
              pick the DAE.
            </li>
            <li>
              On the Physics tab, choose <strong>Lowest</strong> for furniture / props, or upload
              our generated low-poly physics shape.
            </li>
            <li>
              Calculate weights &amp; fees — typical KingDavez exports come in under 1.0 LI for a
              single-link prop.
            </li>
            <li>Upload, then rez in-world.</li>
          </ol>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">SL-optimized defaults</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Geometry:</strong> watertight, manifold, &lt; 21,844 verts per face (SL
              limit).
            </li>
            <li>
              <strong>UVs:</strong> single channel, 0–1 space, no overlaps.
            </li>
            <li>
              <strong>Textures:</strong> 1024² or 512² PBR baked to diffuse + normal for classic SL
              materials.
            </li>
            <li>
              <strong>Scale:</strong> meters — matches SL's world unit, no rescaling on upload.
            </li>
            <li>
              <strong>LODs:</strong> 4 levels auto-generated to keep Land Impact low.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display text-2xl font-semibold">
              In-world LSL HUD{" "}
              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-pink-500/15 border border-pink-400/30 text-pink-300 align-middle">
                Beta
              </span>
            </h2>
            <Button onClick={handleCopy} size="sm" variant="secondary" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy script"}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Paste this LSL script into any prim or HUD attachment to mirror the website inside
            Second Life. Supports text-to-3D, <strong>image-to-3D</strong>, balance, and history —
            all gated by your personal API key (issued in your{" "}
            <Link to="/dashboard" className="underline">
              dashboard
            </Link>
            ).
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 text-xs text-muted-foreground flex items-center justify-between">
              <span>kingdavez_hud.lsl</span>
              <span>LSL · paste into a SL script</span>
            </div>
            <pre className="overflow-x-auto p-4 text-[11.5px] leading-relaxed text-foreground/90 max-h-[420px]">
              <code>{LSL_SCRIPT}</code>
            </pre>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground space-y-2">
            <p className="text-foreground font-medium">How it works in-world</p>
            <p>
              1. Rez a prim, drop in the script, then channel-chat{" "}
              <code className="text-foreground">/42 /key YOUR_KEY</code>.
            </p>
            <p>
              2. Generate from text:{" "}
              <code className="text-foreground">/42 /3d a stone gargoyle</code>
            </p>
            <p>
              3. Generate from an image (paste any https URL):{" "}
              <code className="text-foreground">
                /42 /img https://i.imgur.com/abc.jpg | gothic gargoyle
              </code>
            </p>
            <p>
              4. Check balance / history: <code className="text-foreground">/42 /balance</code> ·{" "}
              <code className="text-foreground">/42 /history</code>
            </p>
            <p className="pt-2 text-xs">
              Credits are deducted exactly as they are on the website (image-to-3D = 3, text-to-3D =
              2). Owners are unlimited.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">In-world delivery</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We're piloting in-world delivery via a CasperVend-compatible script. If you want early
            access, head to{" "}
            <Link to="/community" className="underline">
              the community hub
            </Link>{" "}
            and ping us.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
