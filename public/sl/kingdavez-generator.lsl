// ============================================================
// KingDavez Studios — Second Life Generation HUD
// ------------------------------------------------------------
// Drop this script into any in-world object (a HUD, a sign,
// or a vendor). Touch it to be prompted for a prompt; the
// script calls the KingDavez REST API and queues a 3D
// generation against YOUR credits.
//
// SETUP (one time):
//   1. Open the object, add a new script, paste this code.
//   2. Replace API_KEY below with your key from
//      https://kingdavez.click/dashboard
//   3. Save. Touch the object and type your prompt in chat.
//
// API docs: https://kingdavez.click/docs
// Get help: kinlochdavid8@gmail.com  •  SL: Kingdavez
// ============================================================

string API_KEY     = "kd_live_PASTE_YOUR_KEY_HERE";
string API_URL     = "https://kingdavez.click/api/public/v1/generations";
string GEN_TYPE    = "text-to-3d";   // or "image-to-3d", "text-to-image", "retexture"
integer LISTEN_CHAN = -918273;        // private channel for prompt entry

key httpRequestId;
integer listenHandle;

ask(key user)
{
    llListenRemove(listenHandle);
    listenHandle = llListen(LISTEN_CHAN, "", user, "");
    llTextBox(user,
        "KingDavez 3D Generator\n\nDescribe what you want to generate:",
        LISTEN_CHAN);
}

submit(string prompt, key user)
{
    if (API_KEY == "kd_live_PASTE_YOUR_KEY_HERE")
    {
        llInstantMessage(user,
            "[KingDavez] Please edit the script and paste your API key from https://kingdavez.click/dashboard");
        return;
    }

    string body = "{"
        + "\"prompt\":\"" + llEscapeURL(prompt) + "\","
        + "\"type\":\""   + GEN_TYPE + "\","
        + "\"source\":\"secondlife\""
        + "}";

    // Note: llEscapeURL is used for safety; KingDavez accepts the
    // raw string fine, but this prevents quotes from breaking JSON.
    body = "{"
        + "\"prompt\":" + jsonString(prompt) + ","
        + "\"type\":\""  + GEN_TYPE + "\","
        + "\"source\":\"secondlife\""
        + "}";

    httpRequestId = llHTTPRequest(API_URL,
        [   HTTP_METHOD,         "POST",
            HTTP_MIMETYPE,       "application/json",
            HTTP_CUSTOM_HEADER,  "Authorization", "Bearer " + API_KEY,
            HTTP_CUSTOM_HEADER,  "X-SL-Avatar",   (string)user,
            HTTP_VERIFY_CERT,    TRUE,
            HTTP_BODY_MAXLENGTH, 16384
        ],
        body);

    llInstantMessage(user, "[KingDavez] Queued: \"" + prompt + "\" — check your dashboard.");
}

// Tiny JSON string escaper (handles quotes, backslashes, newlines)
string jsonString(string s)
{
    s = llDumpList2String(llParseStringKeepNulls(s, ["\\"], []), "\\\\");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\""], []), "\\\"");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\n"], []), "\\n");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\r"], []), "\\r");
    s = llDumpList2String(llParseStringKeepNulls(s, ["\t"], []), "\\t");
    return "\"" + s + "\"";
}

default
{
    state_entry()
    {
        llSetText("KingDavez 3D\nTouch to generate", <0.55, 0.35, 1.0>, 1.0);
    }

    touch_start(integer total)
    {
        ask(llDetectedKey(0));
    }

    listen(integer ch, string name, key id, string msg)
    {
        llListenRemove(listenHandle);
        if (llStringLength(msg) < 3)
        {
            llInstantMessage(id, "[KingDavez] Prompt too short.");
            return;
        }
        submit(msg, id);
    }

    http_response(key id, integer status, list metadata, string body)
    {
        if (id != httpRequestId) return;

        if (status == 201 || status == 200)
        {
            llOwnerSay("[KingDavez] ✓ Generation queued. View at https://kingdavez.click/dashboard");
        }
        else if (status == 401)
        {
            llOwnerSay("[KingDavez] ✗ Invalid API key. Get one at https://kingdavez.click/dashboard");
        }
        else if (status == 402)
        {
            llOwnerSay("[KingDavez] ✗ Out of credits. Top up at https://kingdavez.click/credits");
        }
        else
        {
            llOwnerSay("[KingDavez] ✗ Error " + (string)status + ": " + body);
        }
    }

    on_rez(integer p) { llResetScript(); }
}
