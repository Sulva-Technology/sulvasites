-- Sulva Sites promo: builds a DaVinci Resolve project from the rendered promo.
-- Run from Resolve: Workspace > Scripts > Sulva Promo Builder
-- Creates project "Sulva Sites Promo" with two timelines (16x9 and 9x16):
--   V1  rendered picture (video only)
--   A1  drums stem   A2  bass stem   A3  music stem   A4  fx stem  (balance these in Fairlight)
-- plus coloured markers on every scene change and sound cue (120 BPM grid).

local ROOT = "C:\\server\\soothecontrols\\promo\\"
local FPS = 30

local resolve = Resolve()
local pm = resolve:GetProjectManager()
local project = pm:CreateProject("Sulva Sites Promo")
if not project then
  pm:LoadProject("Sulva Sites Promo")
  project = pm:GetCurrentProject()
end
if not project then print("Could not create or open project") return end

project:SetSetting("timelineFrameRate", tostring(FPS))
project:SetSetting("timelinePlaybackFrameRate", tostring(FPS))
project:SetSetting("timelineResolutionWidth", "1920")
project:SetSetting("timelineResolutionHeight", "1080")

local mp = project:GetMediaPool()
local root = mp:GetRootFolder()
mp:SetCurrentFolder(root)

local function import(path)
  local items = mp:ImportMedia({ path })
  if not items or not items[1] then print("Import failed: " .. path) return nil end
  return items[1]
end

local video169 = import(ROOT .. "out\\promo_16x9.mp4")
local video916 = import(ROOT .. "out\\promo_9x16.mp4")
local stems = {
  import(ROOT .. "audio\\stem_drums.wav"),
  import(ROOT .. "audio\\stem_bass.wav"),
  import(ROOT .. "audio\\stem_music.wav"),
  import(ROOT .. "audio\\stem_fx.wav"),
}

-- seconds -> marker list (colour, name)
local MARKERS = {
  { 0.0, "Blue", "Hook", "Search bar types, kinetic type on claps" },
  { 2.0, "Cyan", "Can they find you?", "Riser starts" },
  { 4.0, "Red", "IMPACT - logo", "Sub boom + crash" },
  { 6.0, "Red", "DROP - montage", "Template cuts on every beat from 9s" },
  { 13.0, "Yellow", "17 designs wall", "" },
  { 14.0, "Blue", "Editor", "Light scene" },
  { 14.5, "Purple", "Click name field", "" },
  { 15.0, "Purple", "Typing", "15.0 - 16.5" },
  { 17.0, "Purple", "Colour swap", "17.0 and 17.5" },
  { 18.0, "Purple", "Dark mode toggle", "" },
  { 19.0, "Purple", "Publish", "Toast: your site is live" },
  { 20.0, "Red", "Live in minutes", "Badges pop 21.0 - 23.0" },
  { 24.0, "Yellow", "Snare roll", "Drop-out at 25.5" },
  { 26.0, "Red", "CTA HIT", "Start free" },
  { 26.5, "Green", "URL ding", "" },
  { 29.0, "Red", "Final hit", "Fade 29.5 - 30" },
}

local function build(name, video, w, h)
  if not video then return end
  local tl = mp:CreateEmptyTimeline(name)
  if not tl then print("Timeline exists or failed: " .. name) return end
  project:SetCurrentTimeline(tl)
  tl:SetSetting("useCustomSettings", "1")
  tl:SetSetting("timelineResolutionWidth", tostring(w))
  tl:SetSetting("timelineResolutionHeight", tostring(h))
  tl:SetSetting("timelineFrameRate", tostring(FPS))
  local start = tl:GetStartFrame()
  for _ = 2, 4 do tl:AddTrack("audio", "stereo") end
  mp:AppendToTimeline({ { mediaPoolItem = video, mediaType = 1, trackIndex = 1, recordFrame = start } })
  for i, stem in ipairs(stems) do
    if stem then
      mp:AppendToTimeline({ { mediaPoolItem = stem, mediaType = 2, trackIndex = i, recordFrame = start } })
    end
  end
  local names = { "Drums", "Bass", "Music", "FX" }
  for i, n in ipairs(names) do tl:SetTrackName("audio", i, n) end
  tl:SetTrackName("video", 1, "Promo")
  for _, m in ipairs(MARKERS) do
    tl:AddMarker(math.floor(m[1] * FPS + 0.5), m[2], m[3], m[4], 1)
  end
  print("Built " .. name)
end

build("Promo 16x9", video169, 1920, 1080)
build("Promo 9x16", video916, 1080, 1920)
resolve:OpenPage("edit")
print("Done. Export: Deliver page > YouTube / TikTok presets, 30 fps.")
