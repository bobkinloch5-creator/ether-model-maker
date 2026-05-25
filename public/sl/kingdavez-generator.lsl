// ============================================================
// KingDavez Studios -- Second Life Generation HUD  (v3)
// ------------------------------------------------------------
// Drop this script into ANY in-world object -- a HUD, a sign,
// a vendor, a prim. Touch it to open a menu. From the menu
// you can:
//
//   - Generate     -- type a prompt, queue a 3D job
//   - Set API Key  -- paste your key right from inside SL
//   - Balance      -- see how many credits you have left
//   - Sign In      -- opens the KingDavez login page in browser
//   - Mode         -- switch between text-to-3d, image-to-3d,
//                     retexture
//   - Help         -- opens the docs page
//   - Website      -- opens https://www.kingdavez.click
//
// The API key is saved to the object's linkset data, so it
// persists across script resets and rezzes. No editing the
// script required after the first /key.
//
// API docs:  https://kingdavez.click/docs
// Dashboard: https://kingdavez.click/dashboard
// Website:   https://www.kingdavez.click
// Get help:  kinlochdavid8@gmail.com  --  SL: Kingdavez
// ============================================================

string  API_BASE        = "https://kingdavez.click/api/public/v1";
string  WEB_LOGIN       = "https://kingdavez.click/login";
string  WEB_DASHBOARD   = "https://kingdavez.click/dashboard";
string  WEB_DOCS        = "https://kingdavez.click/docs";
string  WEB_SITE        = "https://www.kingdavez.click";

string  KEY_STORE_NAME  = "kd_api_key";
integer DLG_CHAN        = -918273;
integer KEY_CHAN        = -918274;
integer URL_CHAN        = -918275;
integer PROMPT_CHAN     = -918276;

string  GEN_TYPE        = "text-to-3d";

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
    if (GEN_TYPE == "text-to-3d")    return "Text -> 3D";
    if (GEN_TYPE == "image-to-3d")   return "Image -> 3D";
    if (GEN_TYPE == "text-to-image") return "Text -> Image";
    if (GEN_TYPE == "retexture")     return "Retexture";
    return GEN_TYPE;
}

updateHover()
{
    string status = "Mode: " + modeLabel();
    if (!hasKey()) status = "No API key set - Touch to Set API Key";
    llSetText("KingDavez 3D\n" + status + "\nwww.kingdavez.click", <1.0, 0.55, 0.20>, 1.0);
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
        "Mode",     "Set Key", "Help",
        "Website"
    ];
    string keyStatus = "not set";
    if (hasKey()) keyStatus = "set";
    string txt = "KingDavez Studios -- In-World Generator\n"
        + "Mode: " + modeLabel() + "\n"
        + "Key: " + keyStatus + "\n"
        + "www.kingdavez.click";
    llDialog(user, txt, buttons, DLG_CHAN);
}

showModeMenu(key user)
{
    cleanupListens();
    dlgListen = llListen(DLG_CHAN, "", user, "");
    llDialog(user,
        "Pick generation mode:",
        ["Text->3D", "Image->3D", "Text->Img", "Retex", "<- Back"],
        DLG_CHAN);
}

askPrompt(key user)
{
    cleanupListens();
    promptListen = llListen(PROMPT_CHAN, "", user, "");
    string label = "Describe what you want to generate:";
    if (GEN_TYPE == "retexture")
        label = "Describe the new texture style:";
    llTextBox(user, "KingDavez -- " + modeLabel() + "\n" + label, PROMPT_CHAN);
}

askImageUrl(key user)
{
    cleanupListens();
    urlListen = llListen(URL_CHAN, "", user, "");
    llTextBox(user,
        "Image -> 3D\nPaste a public HTTPS image URL (jpg/png).\nUpload at https://www.kingdavez.click/generate",
        URL_CHAN);
}

askApiKey(key user)
{
    cleanupListens();
    keyListen = llListen(KEY_CHAN, "", user, "");
    llTextBox(user,
        "Paste your API key.\nGet one at https://kingdavez.click/dashboard\nStarts with kd_",
        KEY_CHAN);
}

// -------------------- API calls ---------------------

submit(string prompt, key user)
{
    if (!hasKey())
    {
        llInstantMessage(user, "[KingDavez] No API key. Touch -> Set Key.");
        return;
    }

    string body = "{"
        + "\"prompt\":" + jsonStr(prompt) + ","
        + "\"type\":\""  + GEN_TYPE + "\","
        + "\"source\":\"secondlife\","
        + "\"avatar\":" + jsonStr((string)user);
    if (GEN_TYPE == "image-to-3d" && pendingImageUrl != "")
        body += ",\"image_url\":" + jsonStr(pendingImageUrl);
    body += "}";

    httpId = llHTTPRequest(API_BASE + "/generations",
        [   HTTP_METHOD,         "POST",
            HTTP_MIMETYPE,       "application/json",
            HTTP_VERIFY_CERT,    TRUE,
            HTTP_CUSTOM_HEADER,  "Authorization", "Bearer " + getKey()
        ],
        body);

    llInstantMessage(user, "[KingDavez] Queued (" + modeLabel() + "): " + prompt + " -- View at https://www.kingdavez.click/dashboard");
    pendingImageUrl = "";
}

checkBalance(key user)
{
    if (!hasKey())
    {
        llInstantMessage(user, "[KingDavez] No API key. Touch -> Set Key.");
        return;
    }
    activeUser = user;
    httpIdBalance = llHTTPRequest(API_BASE + "/me",
        [   HTTP_METHOD,        "GET",
            HTTP_VERIFY_CERT,   TRUE,
            HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + getKey()
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
        key toucher = llDetectedKey(0);
        llInstantMessage(toucher, "[KingDavez] Welcome! Visit us at https://www.kingdavez.click");
        showMenu(toucher);
    }

    listen(integer chan, string name, key id, string msg)
    {
        if (chan == DLG_CHAN)
        {
            if (msg == "Generate")
            {
                if (!hasKey()) { llInstantMessage(id, "[KingDavez] Set your API key first."); askApiKey(id); return; }
                if (GEN_TYPE == "image-to-3d") askImageUrl(id);
                else                            askPrompt(id);
            }
            else if (msg == "Balance")   checkBalance(id);
            else if (msg == "Sign In")   { llLoadURL(id, "KingDavez Login", WEB_LOGIN); llInstantMessage(id, "[KingDavez] Opening login -- https://www.kingdavez.click/login"); }
            else if (msg == "Set Key")   askApiKey(id);
            else if (msg == "Help")      { llLoadURL(id, "KingDavez Docs", WEB_DOCS); llInstantMessage(id, "[KingDavez] Opening docs -- https://kingdavez.click/docs"); }
            else if (msg == "Website")   { llLoadURL(id, "KingDavez Studios", WEB_SITE); llInstantMessage(id, "[KingDavez] Opening website -- https://www.kingdavez.click"); }
            else if (msg == "Mode")      { showModeMenu(id); return; }
            else if (msg == "<- Back")   { showMenu(id); return; }
            else if (msg == "Text->3D")  { GEN_TYPE = "text-to-3d";    updateHover(); llInstantMessage(id, "[KingDavez] Mode: Text -> 3D"); }
            else if (msg == "Image->3D") { GEN_TYPE = "image-to-3d";   updateHover(); llInstantMessage(id, "[KingDavez] Mode: Image -> 3D"); }
            else if (msg == "Text->Img") { GEN_TYPE = "text-to-image"; updateHover(); llInstantMessage(id, "[KingDavez] Mode: Text -> Image"); }
            else if (msg == "Retex")     { GEN_TYPE = "retexture";     updateHover(); llInstantMessage(id, "[KingDavez] Mode: Retexture"); }
            cleanupListens();
            return;
        }

        if (chan == KEY_CHAN)
        {
            cleanupListens();
            string trimmed = llStringTrim(msg, STRING_TRIM);
            if (llSubStringIndex(trimmed, "kd_") != 0 || llStringLength(trimmed) < 16)
            {
                llInstantMessage(id, "[KingDavez] Invalid key. Get one at https://www.kingdavez.click/dashboard");
                return;
            }
            setKey(trimmed);
            updateHover();
            llInstantMessage(id, "[KingDavez] API key saved! Visit https://www.kingdavez.click/dashboard to manage your account.");
            return;
        }

        if (chan == URL_CHAN)
        {
            cleanupListens();
            string url = llStringTrim(msg, STRING_TRIM);
            if (llSubStringIndex(url, "https://") != 0)
            {
                llInstantMessage(id, "[KingDavez] Need a public HTTPS image URL. Upload at https://www.kingdavez.click/generate");
                return;
            }
            pendingImageUrl = url;
            askPrompt(id);
            return;
        }

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
                integer uIdx = llSubStringIndex(body, "\"unlimited\":true");
                if (uIdx != -1)
                {
                    llInstantMessage(activeUser, "[KingDavez] Owner account -- unlimited credits. Dashboard: https://www.kingdavez.click/dashboard");
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
                        llInstantMessage(activeUser, "[KingDavez] Credits remaining: " + n + " -- Top up at https://www.kingdavez.click/credits");
                        return;
                    }
                }
                llInstantMessage(activeUser, "[KingDavez] Balance response: " + body);
            }
            else if (status == 401)
                llInstantMessage(activeUser, "[KingDavez] Invalid API key. Get one at https://www.kingdavez.click/dashboard");
            else
                llInstantMessage(activeUser, "[KingDavez] Balance error " + (string)status);
            return;
        }

        if (rid == httpId)
        {
            if (status == 201 || status == 200)
                llInstantMessage(activeUser, "[KingDavez] Job queued! View results at https://www.kingdavez.click/dashboard");
            else if (status == 401)
                llInstantMessage(activeUser, "[KingDavez] Invalid API key. Get one at https://www.kingdavez.click/dashboard");
            else if (status == 402)
                llInstantMessage(activeUser, "[KingDavez] Out of credits. Top up at https://www.kingdavez.click/credits");
            else
                llInstantMessage(activeUser, "[KingDavez] Error " + (string)status + ": " + body);
            return;
        }
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
