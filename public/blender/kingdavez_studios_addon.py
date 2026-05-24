bl_info = {
    "name": "KingDavez Studios — AI 3D Generator",
    "author": "KingDavez Studios",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Sidebar > KingDavez",
    "description": "Generate AI 3D models from a text prompt and import them directly into Blender.",
    "category": "Add Mesh",
}

import bpy
import json
import os
import tempfile
import threading
import urllib.request
import urllib.error

API_BASE = "https://kingdavez.click/api/public/v1"


# ---------- Preferences ----------
class KDPrefs(bpy.types.AddonPreferences):
    bl_idname = __name__

    api_key: bpy.props.StringProperty(
        name="API Key",
        description="Your KingDavez Studios API key (kd_live_…). Get one at https://kingdavez.click/profile",
        subtype="PASSWORD",
        default="",
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "api_key")
        layout.operator("wm.url_open", text="Get your API key").url = "https://kingdavez.click/profile"


# ---------- Scene props ----------
class KDSceneProps(bpy.types.PropertyGroup):
    prompt: bpy.props.StringProperty(
        name="Prompt",
        description="Describe the 3D model you want to generate",
        default="low-poly stylized fox",
    )
    status: bpy.props.StringProperty(name="Status", default="")
    busy: bpy.props.BoolProperty(default=False)
    last_url: bpy.props.StringProperty(default="")


# ---------- HTTP helpers ----------
def _post(path, api_key, payload):
    req = urllib.request.Request(
        API_BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key,
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def _get(path, api_key):
    req = urllib.request.Request(
        API_BASE + path,
        method="GET",
        headers={"Authorization": "Bearer " + api_key},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def _download(url, suffix=".glb"):
    fd, path = tempfile.mkstemp(suffix=suffix, prefix="kd_")
    os.close(fd)
    urllib.request.urlretrieve(url, path)
    return path


# ---------- Worker ----------
class _GenState:
    result_path = None
    error = None
    status_msg = ""


def _worker(api_key, prompt, state):
    try:
        state.status_msg = "Queuing generation…"
        created = _post("/generations", api_key, {
            "prompt": prompt,
            "type": "text-to-3d",
            "source": "blender",
        })
        gen_id = created.get("id") or created.get("generation_id")
        # Poll until done
        import time
        for _ in range(120):  # ~10 minutes max
            time.sleep(5)
            state.status_msg = "Generating model…"
            listing = _get("/generations?limit=5", api_key)
            items = listing if isinstance(listing, list) else listing.get("data", [])
            match = None
            for it in items:
                if it.get("id") == gen_id:
                    match = it
                    break
            if match is None and items:
                match = items[0]
            if not match:
                continue
            status = (match.get("status") or "").lower()
            model_url = match.get("model_url") or match.get("modelUrl")
            if status in ("complete", "completed", "done", "success", "succeeded") and model_url:
                state.status_msg = "Downloading model…"
                state.result_path = _download(model_url, ".glb")
                return
            if status in ("failed", "error"):
                state.error = match.get("error") or "Generation failed."
                return
        state.error = "Timed out waiting for generation."
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8")
        except Exception:
            body = str(e)
        state.error = f"HTTP {e.code}: {body[:300]}"
    except Exception as e:
        state.error = str(e)


# ---------- Operator ----------
class KD_OT_Generate(bpy.types.Operator):
    bl_idname = "kingdavez.generate"
    bl_label = "Generate 3D Model"
    bl_description = "Generate a 3D model from your prompt and import it into the scene"

    _timer = None
    _thread = None
    _state = None

    def modal(self, context, event):
        props = context.scene.kd_props
        if event.type == "TIMER":
            props.status = self._state.status_msg or props.status
            if not self._thread.is_alive():
                self.cancel(context)
                if self._state.error:
                    props.status = "Error: " + self._state.error
                    props.busy = False
                    self.report({"ERROR"}, self._state.error)
                    return {"CANCELLED"}
                path = self._state.result_path
                try:
                    bpy.ops.import_scene.gltf(filepath=path)
                    props.status = "Imported ✓"
                    props.last_url = path
                except Exception as e:
                    props.status = "Import failed: " + str(e)
                    self.report({"ERROR"}, "Import failed: " + str(e))
                props.busy = False
                # redraw
                for area in context.screen.areas:
                    area.tag_redraw()
                return {"FINISHED"}
        return {"PASS_THROUGH"}

    def execute(self, context):
        prefs = context.preferences.addons[__name__].preferences
        props = context.scene.kd_props
        if not prefs.api_key:
            self.report({"ERROR"}, "Set your API key in Add-on Preferences first.")
            return {"CANCELLED"}
        if not props.prompt.strip():
            self.report({"ERROR"}, "Enter a prompt.")
            return {"CANCELLED"}
        if props.busy:
            self.report({"WARNING"}, "Already generating.")
            return {"CANCELLED"}

        props.busy = True
        props.status = "Starting…"
        self._state = _GenState()
        self._thread = threading.Thread(
            target=_worker, args=(prefs.api_key, props.prompt, self._state), daemon=True
        )
        self._thread.start()
        wm = context.window_manager
        self._timer = wm.event_timer_add(1.0, window=context.window)
        wm.modal_handler_add(self)
        return {"RUNNING_MODAL"}

    def cancel(self, context):
        wm = context.window_manager
        if self._timer:
            wm.event_timer_remove(self._timer)
            self._timer = None


# ---------- Panel ----------
class KD_PT_Panel(bpy.types.Panel):
    bl_label = "KingDavez Studios"
    bl_idname = "KD_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "KingDavez"

    def draw(self, context):
        layout = self.layout
        props = context.scene.kd_props
        prefs = context.preferences.addons[__name__].preferences

        if not prefs.api_key:
            layout.label(text="No API key set", icon="ERROR")
            layout.operator("screen.userpref_show", text="Open Preferences")
            layout.operator("wm.url_open", text="Get API key").url = "https://kingdavez.click/profile"
            return

        layout.label(text="Prompt:")
        layout.prop(props, "prompt", text="")
        row = layout.row()
        row.enabled = not props.busy
        row.operator("kingdavez.generate", icon="MESH_MONKEY")
        if props.status:
            layout.label(text=props.status)
        layout.separator()
        layout.operator("wm.url_open", text="Open dashboard").url = "https://kingdavez.click/dashboard"


classes = (KDPrefs, KDSceneProps, KD_OT_Generate, KD_PT_Panel)


def register():
    for c in classes:
        bpy.utils.register_class(c)
    bpy.types.Scene.kd_props = bpy.props.PointerProperty(type=KDSceneProps)


def unregister():
    for c in reversed(classes):
        bpy.utils.unregister_class(c)
    del bpy.types.Scene.kd_props


if __name__ == "__main__":
    register()
