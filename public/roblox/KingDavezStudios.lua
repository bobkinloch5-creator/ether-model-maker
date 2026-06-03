--!nocheck
-- =============================================================
-- KingDavez Studios — Roblox Studio Plugin
-- AI Text-to-3D / Image-to-3D inside Roblox Studio
--
-- Install (one-time):
--   1. In Roblox Studio open  View → Plugins Folder
--   2. Drop this file inside as  KingDavezStudios.lua
--   3. Restart Studio. A new "KingDavez Studios" button appears
--      in the Plugins tab.
--
-- Auth:
--   Get a personal API key at https://kingdavez.click/profile
--   (the page has a "Copy API key" button). Paste it in the
--   plugin's API Key field — it is stored per-machine via
--   plugin:SetSetting and never leaves your computer.
--
-- What the script does:
--   1. POSTs your prompt + API key to the public Generations API.
--   2. Polls every 4s until status = "completed".
--   3. Creates a MeshPart in Workspace with the model's metadata
--      (model_url, image_url, prompt) saved as Attributes, so you
--      can finish import via Asset Manager → Bulk Import (FBX/OBJ)
--      or by converting the .glb in Blender first.
--
-- NOTE: Roblox Studio cannot import .glb at runtime via a script —
-- that is a Roblox engine limitation, not ours. We give you the
-- direct .glb / .obj / .fbx URLs so you can drag them into the
-- Asset Manager in one click.
-- =============================================================

local HttpService    = game:GetService("HttpService")
local Selection      = game:GetService("Selection")
local StudioService  = game:GetService("StudioService")

local API_BASE   = "https://kingdavez.click/api/public/v1"
local SETTING_KEY = "kingdavez_api_key"
local STATUS_OFFLINE = Color3.fromRGB(255, 120, 120)
local STATUS_ONLINE  = Color3.fromRGB(120, 255, 160)
local STATUS_NEUTRAL = Color3.fromRGB(160, 160, 175)

-- ---------- UI ----------
local toolbar = plugin:CreateToolbar("KingDavez Studios")
local button  = toolbar:CreateButton(
	"AI 3D Generator",
	"Generate a 3D model from text or image using KingDavez Studios",
	"rbxasset://textures/ui/GuiImagePlaceholder.png"
)

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right, false, false, 360, 460, 320, 360
)
local widget = plugin:CreateDockWidgetPluginGui("KingDavezStudios", widgetInfo)
widget.Title = "KingDavez Studios — AI 3D"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(20, 20, 26)
root.BorderSizePixel = 0
root.Parent = widget

local pad = Instance.new("UIPadding", root)
pad.PaddingTop    = UDim.new(0, 10)
pad.PaddingBottom = UDim.new(0, 10)
pad.PaddingLeft   = UDim.new(0, 10)
pad.PaddingRight  = UDim.new(0, 10)

local layout = Instance.new("UIListLayout", root)
layout.Padding = UDim.new(0, 6)
layout.SortOrder = Enum.SortOrder.LayoutOrder

local function label(text, height)
	local l = Instance.new("TextLabel")
	l.Size = UDim2.new(1, 0, 0, height or 18)
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextColor3 = Color3.fromRGB(200, 200, 215)
	l.Font = Enum.Font.Gotham
	l.TextSize = 12
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.Parent = root
	return l
end

local function input(placeholder, height, multiline)
	local b = Instance.new("TextBox")
	b.Size = UDim2.new(1, 0, 0, height or 28)
	b.BackgroundColor3 = Color3.fromRGB(34, 34, 44)
	b.BorderSizePixel = 0
	b.PlaceholderText = placeholder
	b.PlaceholderColor3 = Color3.fromRGB(120, 120, 130)
	b.TextColor3 = Color3.fromRGB(240, 240, 250)
	b.Font = Enum.Font.Code
	b.TextSize = 13
	b.MultiLine = multiline == true
	b.ClearTextOnFocus = false
	b.TextXAlignment = Enum.TextXAlignment.Left
	b.TextYAlignment = Enum.TextYAlignment.Top
	b.Text = ""
	b.Parent = root
	local p = Instance.new("UIPadding", b)
	p.PaddingLeft  = UDim.new(0, 8)
	p.PaddingRight = UDim.new(0, 8)
	p.PaddingTop   = UDim.new(0, 6)
	p.PaddingBottom= UDim.new(0, 6)
	local c = Instance.new("UICorner", b)
	c.CornerRadius = UDim.new(0, 6)
	return b
end

label("API Key  (kingdavez.click → Profile)")
local keyBox = input("Paste your API key (from kingdavez.click → Profile)", 28)
keyBox.Text = plugin:GetSetting(SETTING_KEY) or ""

label("Prompt")
local promptBox = input("an ornate elven longbow with glowing runes", 90, true)

label("Type")
local typeBox = input("text-to-3d  |  image-to-3d", 28)
typeBox.Text = "text-to-3d"

local btn = Instance.new("TextButton")
btn.Size = UDim2.new(1, 0, 0, 36)
btn.BackgroundColor3 = Color3.fromRGB(120, 80, 255)
btn.BorderSizePixel = 0
btn.Text = "✨ Generate"
btn.Font = Enum.Font.GothamBold
btn.TextSize = 14
btn.TextColor3 = Color3.fromRGB(255, 255, 255)
btn.Parent = root
local c = Instance.new("UICorner", btn); c.CornerRadius = UDim.new(0, 8)

local status = label("Ready.", 18)
status.TextColor3 = STATUS_NEUTRAL

local balanceLabel = label("Offline — paste API key, then click Check Connection.", 34)
balanceLabel.TextColor3 = STATUS_OFFLINE

local linkBtn = Instance.new("TextButton")
linkBtn.Size = UDim2.new(1, 0, 0, 28)
linkBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 52)
linkBtn.BorderSizePixel = 0
linkBtn.Text = "Download GLB"
linkBtn.Font = Enum.Font.Gotham
linkBtn.TextSize = 12
linkBtn.TextColor3 = Color3.fromRGB(220, 220, 235)
linkBtn.Visible = false
linkBtn.Parent = root
local c2 = Instance.new("UICorner", linkBtn); c2.CornerRadius = UDim.new(0, 6)

local formatRow = Instance.new("Frame")
formatRow.Size = UDim2.new(1, 0, 0, 30)
formatRow.BackgroundTransparency = 1
formatRow.Visible = false
formatRow.Parent = root
local formatLayout = Instance.new("UIListLayout", formatRow)
formatLayout.FillDirection = Enum.FillDirection.Horizontal
formatLayout.Padding = UDim.new(0, 6)
formatLayout.SortOrder = Enum.SortOrder.LayoutOrder

local function smallButton(text)
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(1/3, -4, 1, 0)
	b.BackgroundColor3 = Color3.fromRGB(34, 34, 44)
	b.BorderSizePixel = 0
	b.Text = text
	b.Font = Enum.Font.GothamBold
	b.TextSize = 11
	b.TextColor3 = Color3.fromRGB(220, 220, 235)
	b.Parent = formatRow
	local corner = Instance.new("UICorner", b)
	corner.CornerRadius = UDim.new(0, 6)
	return b
end

local fbxBtn = smallButton("Download FBX")
local objBtn = smallButton("Download OBJ")
local copyBtn = smallButton("Copy URL")

local checkBtn = Instance.new("TextButton")
checkBtn.Size = UDim2.new(1, 0, 0, 30)
checkBtn.BackgroundColor3 = Color3.fromRGB(40, 80, 52)
checkBtn.BorderSizePixel = 0
checkBtn.Text = "Check Connection / Credits"
checkBtn.Font = Enum.Font.GothamBold
checkBtn.TextSize = 12
checkBtn.TextColor3 = Color3.fromRGB(220, 255, 230)
checkBtn.Parent = root
local c3 = Instance.new("UICorner", checkBtn); c3.CornerRadius = UDim.new(0, 6)

-- ---------- API ----------
local function setStatus(text)
	status.Text = text
	print("[KingDavez] " .. text)
end

local function setBalance(text, online)
	balanceLabel.Text = text
	balanceLabel.TextColor3 = online and STATUS_ONLINE or STATUS_OFFLINE
end

local function checkConnection(apiKey)
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = API_BASE .. "/me",
			Method = "GET",
			Headers = { ["Authorization"] = "Bearer " .. apiKey },
		})
	end)
	if not ok then return false, tostring(resp) end
	if not resp.Success then return false, ("HTTP %d: %s"):format(resp.StatusCode, resp.Body or "") end
	local data = HttpService:JSONDecode(resp.Body)
	local user = data.user or {}
	if user.unlimited then
		return true, "Online — owner account, unlimited credits."
	end
	return true, "Online — credits: " .. tostring(user.credits or 0) .. "."
end

local function startJob(apiKey, prompt, gType)
	local payload = HttpService:JSONEncode({
		prompt = prompt, type = gType, source = "roblox-studio", apiKey = apiKey,
	})
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = API_BASE .. "/generations",
			Method = "POST",
			Headers = {
				["Content-Type"]  = "application/json",
				["Authorization"] = "Bearer " .. apiKey,
			},
			Body = payload,
		})
	end)
	if not ok then return nil, tostring(resp) end
	if not resp.Success then
		return nil, ("HTTP %d: %s"):format(resp.StatusCode, resp.Body or "")
	end
	local data = HttpService:JSONDecode(resp.Body)
	return data.generation, nil
end

local function saveAndCheckKey()
	local apiKey = keyBox.Text:match("^%s*(.-)%s*$") or ""
	if #apiKey < 8 then
		setStatus("Paste your API key first.")
		setBalance("Offline — missing API key.", false)
		return false
	end
	plugin:SetSetting(SETTING_KEY, apiKey)
	setStatus("Checking KingDavez connection…")
	local ok, message = checkConnection(apiKey)
	setBalance(message, ok)
	if ok then
		setStatus("Connected.")
	else
		setStatus("Connection failed: " .. tostring(message))
	end
	return ok
end

local function pollJob(apiKey, generationId)
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = API_BASE .. "/generations/" .. tostring(generationId),
			Method = "GET",
			Headers = { ["Authorization"] = "Bearer " .. apiKey },
		})
	end)
	if not ok or not resp.Success then return nil end
	local data = HttpService:JSONDecode(resp.Body)
	if data and data.id then
		data.result_data = data.result_data or {}
		if data.model_url and not data.result_data.model_url then data.result_data.model_url = data.model_url end
		if data.preview_url and not data.result_data.image_url then data.result_data.image_url = data.preview_url end
		return data
	end
	return nil
end

local AssetService = game:GetService("AssetService")

local function tryImportMesh(modelUrl)
	-- Requires Roblox Studio Content API (rolled out 2024).
	-- AssetService:CreateMeshPartAsync(Content.fromUri(url)) downloads the
	-- mesh file (.glb / .obj / .fbx) and returns a real MeshPart.
	if typeof(Content) ~= "table" and typeof(Content) ~= "userdata" then
		return nil, "Studio is too old — update Roblox Studio to import meshes directly."
	end
	local ok, contentOrErr = pcall(function()
		return Content.fromUri(modelUrl)
	end)
	if not ok then return nil, "Content.fromUri failed: " .. tostring(contentOrErr) end

	local ok2, meshPartOrErr = pcall(function()
		return AssetService:CreateMeshPartAsync(contentOrErr)
	end)
	if not ok2 then return nil, "CreateMeshPartAsync failed: " .. tostring(meshPartOrErr) end
	return meshPartOrErr, nil
end

local function openUrl(url)
	local ok, err = pcall(function()
		plugin:OpenWikiPage(url)
	end)
	if ok then
		return true, nil
	end
	return false, tostring(err)
end

local function safeCopy(url)
	local ok, err = pcall(function()
		StudioService:CopyToClipboard(url)
	end)
	return ok, err
end

local function setDownloadButtons(glbUrl, fbxUrl, objUrl)
	linkBtn.Text = "Download GLB"
	linkBtn.Visible = true
	formatRow.Visible = true

	linkBtn.MouseButton1Click:Connect(function()
		local ok, err = openUrl(glbUrl)
		setStatus(ok and "Opening GLB download…" or ("Could not open browser: " .. tostring(err)))
	end)
	fbxBtn.MouseButton1Click:Connect(function()
		local ok, err = openUrl(fbxUrl)
		setStatus(ok and "Opening FBX download…" or ("FBX is not available or browser was blocked: " .. tostring(err)))
	end)
	objBtn.MouseButton1Click:Connect(function()
		local ok, err = openUrl(objUrl)
		setStatus(ok and "Opening OBJ download…" or ("OBJ is not available or browser was blocked: " .. tostring(err)))
	end)
	copyBtn.MouseButton1Click:Connect(function()
		local ok = safeCopy(glbUrl)
		setStatus(ok and "Model URL copied." or "Clipboard blocked — use Download GLB or read kd_model_url on the selected asset.")
	end)
end

local function spawnFromResult(gen, prompt, apiKey)
	local r = gen.result_data or {}
	local rawModelUrl = r.model_url
	local imageUrl = r.image_url

	if not rawModelUrl then
		setStatus("No model_url in result — cannot import.")
		return
	end

	-- Roblox MeshContentProvider fails on long signed Supabase URLs (tokens
	-- + query string trip its fetcher). Use the short proxy endpoint that
	-- streams the GLB with the correct Content-Type.
	local modelUrl = rawModelUrl
	if gen.id and apiKey and #apiKey > 0 then
		local encodedKey = HttpService:UrlEncode(apiKey)
		modelUrl = API_BASE .. "/generations/" .. gen.id .. "/model.glb?api_key=" .. encodedKey
	end
	local encodedKey = HttpService:UrlEncode(apiKey or "")
	local fbxUrl = API_BASE .. "/generations/" .. tostring(gen.id or "") .. "/model.fbx?api_key=" .. encodedKey
	local objUrl = API_BASE .. "/generations/" .. tostring(gen.id or "") .. "/model.obj?api_key=" .. encodedKey
	setDownloadButtons(modelUrl, fbxUrl, objUrl)

	setStatus("Downloading mesh into Studio…")
	local mesh, importErr = tryImportMesh(modelUrl)

	local part
	if mesh then
		part = mesh
		part.Name = "KingDavez_" .. string.sub(prompt, 1, 24)
		part.Anchored = true
		-- Scale to a sensible size (~6 studs on largest axis)
		local s = part.Size
		local maxAxis = math.max(s.X, s.Y, s.Z)
		if maxAxis > 0 then
			local scale = 6 / maxAxis
			part.Size = s * scale
		end
		part.CFrame = CFrame.new(0, part.Size.Y / 2 + 1, 0)
		part.Parent = workspace
		setStatus("Mesh imported successfully.")
	else
		setStatus("Mesh import failed: " .. tostring(importErr) .. " — no placeholder was spawned. Use Download GLB/FBX/OBJ, then import with Studio's 3D Importer.")
		warn("[KingDavez] Real mesh import failed for " .. tostring(modelUrl) .. ": " .. tostring(importErr))
		return
	end

	part:SetAttribute("kd_prompt", prompt)
	part:SetAttribute("kd_generation_id", gen.id or "")
	part:SetAttribute("kd_model_url", tostring(modelUrl or ""))
	part:SetAttribute("kd_source_url", tostring(rawModelUrl or ""))
	part:SetAttribute("kd_image_url", tostring(imageUrl or ""))
	Selection:Set({ part })

	local hint = Instance.new("BillboardGui", part)
	hint.Size = UDim2.fromOffset(220, 40)
	hint.AlwaysOnTop = true
	hint.StudsOffset = Vector3.new(0, 3, 0)
	local t = Instance.new("TextLabel", hint)
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 0.2
	t.BackgroundColor3 = Color3.fromRGB(20, 20, 26)
	t.TextColor3 = Color3.fromRGB(220, 220, 240)
	t.Font = Enum.Font.GothamBold
	t.TextSize = 12
	t.Text = mesh and ("KingDavez: " .. string.sub(prompt, 1, 24)) or "KingDavez asset — see Attributes"
	t.Parent = hint

end

btn.MouseButton1Click:Connect(function()
	local apiKey = keyBox.Text:match("^%s*(.-)%s*$") or ""
	local prompt = promptBox.Text:match("^%s*(.-)%s*$") or ""
	local gType  = (typeBox.Text:match("^%s*(.-)%s*$") or "text-to-3d")

	if #apiKey < 8 then setStatus("Paste your API key first."); setBalance("Offline — missing API key.", false); return end
	if #prompt < 3 then setStatus("Prompt is too short.") return end

	plugin:SetSetting(SETTING_KEY, apiKey)
	setBalance("Checking connection before generating…", false)
	btn.Active = false
	btn.AutoButtonColor = false
	btn.Text = "Generating…"
	setStatus("Queuing job…")
	linkBtn.Visible = false

	task.spawn(function()
		local connected, connectionMessage = checkConnection(apiKey)
		setBalance(connectionMessage, connected)
		if not connected then
			setStatus("Connection failed: " .. tostring(connectionMessage))
			btn.Active = true; btn.AutoButtonColor = true; btn.Text = "✨ Generate"
			return
		end
		local gen, err = startJob(apiKey, prompt, gType)
		if not gen then
			setStatus("Failed: " .. tostring(err))
			btn.Active = true; btn.AutoButtonColor = true; btn.Text = "✨ Generate"
			return
		end
		setStatus("Job " .. (gen.id or "?") .. " queued — polling…")

		-- Tripo text-to-3d can take 3-10 minutes. Poll up to 15 min.
		local final
		local MAX_POLLS = 225  -- 225 * 4s = 15 min
		for i = 1, MAX_POLLS do
			task.wait(4)
			local latest = pollJob(apiKey, gen.id)
			if latest and latest.id == gen.id then
				local mins = math.floor(i * 4 / 60)
				local secs = (i * 4) % 60
				setStatus(string.format("Status: %s  (%dm%02ds elapsed, %s)", tostring(latest.status), mins, secs, gType))
				if latest.status == "completed" then final = latest; break end
				if latest.status == "failed" then setStatus("Job failed."); break end
			end
		end

		if final then
			setStatus("Done! MeshPart spawned in Workspace.")
			spawnFromResult(final, prompt, apiKey)
		elseif not final then
			setStatus("Still rendering after 15 min. It will finish — check kingdavez.click/dashboard.")
		end

		btn.Active = true; btn.AutoButtonColor = true; btn.Text = "✨ Generate"
	end)
end)

keyBox.FocusLost:Connect(function()
	local apiKey = keyBox.Text:match("^%s*(.-)%s*$") or ""
	if #apiKey >= 8 then
		task.spawn(saveAndCheckKey)
	end
end)

checkBtn.MouseButton1Click:Connect(function()
	task.spawn(saveAndCheckKey)
end)

if (keyBox.Text:match("^%s*(.-)%s*$") or "") ~= "" then
	task.spawn(saveAndCheckKey)
end

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)
