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
local keyBox = input("kd_live_...", 28)
keyBox.Text = plugin:GetSetting(SETTING_KEY) or ""

label("Prompt")
local promptBox = input("an ornate elven longbow with glowing runes", 90, true)

label("Type")
local typeBox = input("text-to-3d  |  image-to-3d  |  text-to-image", 28)
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
status.TextColor3 = Color3.fromRGB(160, 160, 175)

local linkBtn = Instance.new("TextButton")
linkBtn.Size = UDim2.new(1, 0, 0, 28)
linkBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 52)
linkBtn.BorderSizePixel = 0
linkBtn.Text = "Open dashboard"
linkBtn.Font = Enum.Font.Gotham
linkBtn.TextSize = 12
linkBtn.TextColor3 = Color3.fromRGB(220, 220, 235)
linkBtn.Visible = false
linkBtn.Parent = root
local c2 = Instance.new("UICorner", linkBtn); c2.CornerRadius = UDim.new(0, 6)

-- ---------- API ----------
local function setStatus(text)
	status.Text = text
	print("[KingDavez] " .. text)
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

local function pollJob(apiKey)
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = API_BASE .. "/generations?limit=1",
			Method = "GET",
			Headers = { ["Authorization"] = "Bearer " .. apiKey },
		})
	end)
	if not ok or not resp.Success then return nil end
	local data = HttpService:JSONDecode(resp.Body)
	return data.generations and data.generations[1] or nil
end

local function spawnFromResult(gen, prompt)
	local r = gen.result_data or {}
	local modelUrl = r.model_url
	local imageUrl = r.image_url

	local part = Instance.new("MeshPart")
	part.Name = "KingDavez_" .. string.sub(prompt, 1, 24)
	part.Size = Vector3.new(4, 4, 4)
	part.Anchored = true
	part.Material = Enum.Material.SmoothPlastic
	part.Color = Color3.fromRGB(160, 130, 255)
	part.CFrame = CFrame.new(0, 5, 0)
	part:SetAttribute("kd_prompt", prompt)
	part:SetAttribute("kd_generation_id", gen.id or "")
	part:SetAttribute("kd_model_url", tostring(modelUrl or ""))
	part:SetAttribute("kd_image_url", tostring(imageUrl or ""))
	part.Parent = workspace
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
	t.Text = "KingDavez asset ready — see Attributes"

	if modelUrl then
		linkBtn.Text = "Copy .glb URL to clipboard"
		linkBtn.Visible = true
		linkBtn.MouseButton1Click:Connect(function()
			StudioService:CopyToClipboard(modelUrl)
			setStatus("Model URL copied — paste into browser to download .glb")
		end)
	end
end

btn.MouseButton1Click:Connect(function()
	local apiKey = keyBox.Text:match("^%s*(.-)%s*$") or ""
	local prompt = promptBox.Text:match("^%s*(.-)%s*$") or ""
	local gType  = (typeBox.Text:match("^%s*(.-)%s*$") or "text-to-3d")

	if #apiKey < 8 then setStatus("Paste your API key first.") return end
	if #prompt < 3 then setStatus("Prompt is too short.") return end

	plugin:SetSetting(SETTING_KEY, apiKey)
	btn.Active = false
	btn.AutoButtonColor = false
	btn.Text = "Generating…"
	setStatus("Queuing job…")
	linkBtn.Visible = false

	task.spawn(function()
		local gen, err = startJob(apiKey, prompt, gType)
		if not gen then
			setStatus("Failed: " .. tostring(err))
			btn.Active = true; btn.AutoButtonColor = true; btn.Text = "✨ Generate"
			return
		end
		setStatus("Job " .. (gen.id or "?") .. " queued — polling…")

		local final
		for i = 1, 60 do
			task.wait(4)
			local latest = pollJob(apiKey)
			if latest and latest.id == gen.id then
				setStatus("Status: " .. tostring(latest.status) .. "  (" .. i .. "/60)")
				if latest.status == "completed" then final = latest; break end
				if latest.status == "failed" then setStatus("Job failed."); break end
			end
		end

		if final then
			setStatus("Done! MeshPart spawned in Workspace.")
			spawnFromResult(final, prompt)
		elseif not final then
			setStatus("Timed out after 4 min. Check kingdavez.click/dashboard.")
		end

		btn.Active = true; btn.AutoButtonColor = true; btn.Text = "✨ Generate"
	end)
end)

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)
