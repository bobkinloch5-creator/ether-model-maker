// ============================================================
// KingDavez Studios — Second Life Generation HUD  (v2)
// ------------------------------------------------------------
// Drop this script into ANY in-world object — a HUD, a sign,
// a vendor, a prim. Touch it to open a menu. From the menu
// you can:
//
//   • Generate     — type a prompt, queue a 3D / image job
//   • Set API Key  — paste your key right from inside SL
//   • Balance      — see how many credits you have left
//   • Sign In      — opens the KingDavez login page in browser
//   • Mode         — switch between text-to-3d, image-to-3d,
//                    text-to-image, retexture
//   • Help         — opens the docs page
//
// The API key is saved to the object's linkset data, so it
// persists across script resets and rezzes. No editing the
// script required after the first /key.
//
// API docs:  https://kingdavez.click/docs
// Dashboard: https://kingdavez.click/dashboard
// Get help:  kinlochdavid8@gmail.com  •  SL: Kingdavez
// ============================================================

string  API_BASE        = "https://kingdavez.click/api/public/v1";
string  WEB_LOGIN       = "https://kingdavez.click/login";
string  WEB_DASHBOARD   = "https://kingdavez.click/dashboard";
string  WEB_DOCS        = "https://kingdavez.click/docs";

string  KEY_STORE_NAME  = "kd_api_key";   // linkset-data slot
integer DLG_CHAN        = -918273;
integer KEY_CHAN        = -918274;
integer URL_CHAN        = -918275;
integer PROMPT_CHAN     = -918276;

string  GEN_TYPE        = "text-to-3d";   // current mode

key     httpId;
key     httpIdBalance;
integer dlgListen;
integer keyListen;
integer urlListen;
integer promptListen;
key     activeUser;
string  pendingImageUrl;

// -------------------- helpers ---------------------

string getKey()
{
    return llLinksetDataRead(KEY_STORE_NAME);
}

setKey(string k)
{
    llLinksetDataWrite(KEY_STORE_NAME, k);
}

integer hasKey()
{
    string k = getKey();
    return (k != "" && llSubStringIndex(k, "kd_") == 0);
}

string jsonStr(string s)
{
    s = llDumpList2String(llParseStringKeepNulls(s, ["\\"], []), "\\\\");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\""], []), "\\\"");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\n"], []), "\\n");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\r"], []), "\\r");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\t"], []), "\\t");
    return "\"" + s + "\"";
}

string modeLabel()
{
    if (GEN_TYPE == "text-to-3d")    return "Text → 3D";
    if (GEN_TYPE == "image-to-3d")   return "Image → 3D";
    if (GEN_TYPE == "text-to-image") return "Text → Image";
    if (GEN_TYPE == "retexture")     return "Retexture";
    return GEN_TYPE;
}

updateHover()
{
    string status = "Mode: " + modeLabel();
    if (!hasKey()) status = "No API key set\nTouch → Set API Key";
    llSetText("KingDavez 3D\n" + status + "\nTouch me", <1.0, 0.55, 0.20>, 1.0);
}

cleanupListens()
{
    if (dlgListen)    { llListenRemove(dlgListen);    dlgListen = 0; }
    if (keyListen)    { llListenRemove(keyListen);    keyListen = 0; }
    if (urlListen)    { llListenRemove(urlListen);    urlListen = 0; }
    if (promptListen) { llListenRemove(promptListen); promptListen = 0; }
}

// -------------------- menus ---------------------

showMenu(key user)
{
    activeUser = user;
    cleanupListens();
    dlgListen = llListen(DLG_CHAN, "", user, "");
    list buttons = [
        "Generate", "Balance", "Sign In",
        "Mode",     "Set Key", "Help"
    ];
    string txt = "KingDavez Studios — In-World Generator\n\n"
        + "Mode: " + modeLabel() + "\n"
        + "API Key: " + (hasKey() ? "set ✓" : "not set ✗");
    llDialog(user, txt, buttons, DLG_CHAN);
}

showModeMenu(key user)
{
    cleanupListens();
    dlgListen = llListen(DLG_CHAN, "", user, "");
    llDialog(user,
        "Pick generation mode:",
        ["Text→3D", "Image→3D", "Text→Img", "Retex", "← Back"],
        DLG_CHAN);
}

askPrompt(key user)
{
    cleanupListens();
    promptListen = llListen(PROMPT_CHAN, "", user, "");
    string label = "Describe what you want to generate:";
    if (GEN_TYPE == "retexture")
        label = "Describe the new texture (the source image must already be uploaded on the website):";
    llTextBox(user, "KingDavez — " + modeLabel() + "\n\n" + label, PROMPT_CHAN);
}

askImageUrl(key user)
{
    cleanupListens();
    urlListen = llListen(URL_CHAN, "", user, "");
    llTextBox(user,
        "Image → 3D\n\nPaste a public HTTPS image URL (jpg/png).\n"
      + "Tip: upload on https://kingdavez.click/generate first to host it.",
        URL_CHAN);
}

askApiKey(key user)
{
    cleanupListens();
    keyListen = llListen(KEY_CHAN, "", user, "");
    llTextBox(user,
        "Paste your API key\n\n"
      + "Get one at " + WEB_DASHBOARD + "\n"
      + "Starts with 'kd_'. It is stored privately in this object.",
        KEY_CHAN);
}

// -------------------- API calls ---------------------

submit(string prompt, key user)
{
    if (!hasKey())
    {
        llInstantMessage(user, "[KingDavez] No API key. Touch → Set Key.");
        return;
    }

    string body = "{"
        + "\"prompt\":" + jsonStr(prompt) + ","
        + "\"type\":\""  + GEN_TYPE + "\","
        + "\"source\":\"secondlife\"";
    if (GEN_TYPE == "image-to-3d" && pendingImageUrl != "")
        body += ",\"image_url\":" + jsonStr(pendingImageUrl);
    body += "}";

    httpId = llHTTPRequest(API_BASE + "/generations",
        [   HTTP_METHOD,         "POST",
            HTTP_MIMETYPE,       "application/json",
            HTTP_CUSTOM_HEADER,  "Authorization", "Bearer " + getKey(),
            HTTP_CUSTOM_HEADER,  "X-SL-Avatar",   (string)user,
            HTTP_VERIFY_CERT,    TRUE,
            HTTP_BODY_MAXLENGTH, 16384
        ],
        body);

    llInstantMessage(user, "[KingDavez] Queued (" + modeLabel() + "): \"" + prompt + "\"");
    pendingImageUrl = "";
}

checkBalance(key user)
{
    if (!hasKey())
    {
        llInstantMessage(user, "[KingDavez] No API key. Touch → Set Key.");
        return;
    }
    activeUser = user;
    httpIdBalance = llHTTPRequest(API_BASE + "/me",
        [   HTTP_METHOD,        "GET",
            HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + getKey(),
            HTTP_VERIFY_CERT,   TRUE
        ],
        "");
}

// -------------------- main ---------------------

default
{
    state_entry()
    {
        updateHover();
    }

    on_rez(integer p) { llResetScript(); }

    touch_start(integer total)
    {
        showMenu(llDetectedKey(0));
    }

    listen(integer chan, string name, key id, string msg)
    {
        // ----- main dialog -----
        if (chan == DLG_CHAN)
        {
            if (msg == "Generate")
            {
                if (!hasKey()) { llInstantMessage(id, "[KingDavez] Set your API key first."); askApiKey(id); return; }
                if (GEN_TYPE == "image-to-3d") askImageUrl(id);
                else                            askPrompt(id);
            }
            else if (msg == "Balance")     checkBalance(id);
            else if (msg == "Sign In")     llLoadURL(id, "Open the KingDavez login page", WEB_LOGIN);
            else if (msg == "Set Key")     askApiKey(id);
            else if (msg == "Help")        llLoadURL(id, "Open the KingDavez docs", WEB_DOCS);
            else if (msg == "Mode")        { showModeMenu(id); return; }
            else if (msg == "← Back")      { showMenu(id); return; }
            else if (msg == "Text→3D")     { GEN_TYPE = "text-to-3d";    updateHover(); llInstantMessage(id, "[KingDavez] Mode: Text → 3D"); }
            else if (msg == "Image→3D")    { GEN_TYPE = "image-to-3d";   updateHover(); llInstantMessage(id, "[KingDavez] Mode: Image → 3D"); }
            else if (msg == "Text→Img")    { GEN_TYPE = "text-to-image"; updateHover(); llInstantMessage(id, "[KingDavez] Mode: Text → Image"); }
            else if (msg == "Retex")       { GEN_TYPE = "retexture";     updateHover(); llInstantMessage(id, "[KingDavez] Mode: Retexture"); }
            cleanupListens();
            return;
        }

        // ----- API key entry -----
        if (chan == KEY_CHAN)
        {
            cleanupListens();
            string trimmed = llStringTrim(msg, STRING_TRIM);
            if (llSubStringIndex(trimmed, "kd_") != 0 || llStringLength(trimmed) < 16)
            {
                llInstantMessage(id, "[KingDavez] That doesn't look like a valid key. Get one at " + WEB_DASHBOARD);
                return;
            }
            setKey(trimmed);
            updateHover();
            llInstantMessage(id, "[KingDavez] ✓ API key saved. Touch again to generate.");
            return;
        }

        // ----- image URL -----
        if (chan == URL_CHAN)
        {
            cleanupListens();
            string url = llStringTrim(msg, STRING_TRIM);
            if (llSubStringIndex(url, "https://") != 0)
            {
                llInstantMessage(id, "[KingDavez] Need a public HTTPS image URL.");
                return;
            }
            pendingImageUrl = url;
            askPrompt(id);
            return;
        }

        // ----- prompt -----
        if (chan == PROMPT_CHAN)
        {
            cleanupListens();
            string p = llStringTrim(msg, STRING_TRIM);
            if (llStringLength(p) < 3)
            {
                llInstantMessage(id, "[KingDavez] Prompt too short.");
                return;
            }
            submit(p, id);
            return;
        }
    }

    http_response(key rid, integer status, list metadata, string body)
    {
        if (rid == httpIdBalance)
        {
            if (status == 200)
            {
                // crude JSON parse: pull "credits":N or "unlimited":true
                integer uIdx = llSubStringIndex(body, "\"unlimited\":true");
                if (uIdx != -1)
                {
                    llInstantMessage(activeUser, "[KingDavez] ✓ Owner account — unlimited credits.");
                    return;
                }
                integer cIdx = llSubStringIndex(body, "\"credits\":");
                if (cIdx != -1)
                {
                    string tail = llGetSubString(body, cIdx + 10, -1);
                    integer end = llSubStringIndex(tail, ",");
                    integer end2 = llSubStringIndex(tail, "}");
                    if (end == -1 || (end2 != -1 && end2 < end)) end = end2;
                    if (end > 0)
                    {
                        string n = llStringTrim(llGetSubString(tail, 0, end - 1), STRING_TRIM);
                        llInstantMessage(activeUser, "[KingDavez] Credits remaining: " + n);
                        return;
                    }
                }
                llInstantMessage(activeUser, "[KingDavez] Balance: " + body);
            }
            else if (status == 401)
                llInstantMessage(activeUser, "[KingDavez] ✗ Invalid API key. Touch → Set Key.");
            else
                llInstantMessage(activeUser, "[KingDavez] ✗ Balance error " + (string)status);
            return;
        }

        if (rid == httpId)
        {
            if (status == 201 || status == 200)
                llInstantMessage(activeUser, "[KingDavez] ✓ Queued. View at " + WEB_DASHBOARD);
            else if (status == 401)
                llInstantMessage(activeUser, "[KingDavez] ✗ Invalid API key. Touch → Set Key.");
            else if (status == 402)
                llInstantMessage(activeUser, "[KingDavez] ✗ Out of credits. Top up at https://kingdavez.click/credits");
            else
                llInstantMessage(activeUser, "[KingDavez] ✗ Error " + (string)status + ": " + body);
            return;
        }
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
