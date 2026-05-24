import io
import logging
import os
import tempfile
import time

import gradio as gr
import numpy as np
import rembg
import torch
from PIL import Image
from functools import partial
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse

from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground, to_gradio_3d_orientation

#HF_TOKEN = os.getenv("HF_TOKEN")

HEADER = """

"""


if torch.cuda.is_available():
    device = "cuda:0"
else:
    device = "cpu"

d = os.environ.get("DEVICE", None)
if d != None:
    device = d 

model = TSR.from_pretrained(
    "stabilityai/TripoSR",
    config_name="config.yaml",
    weight_name="model.ckpt",
#    token=HF_TOKEN
)
model.renderer.set_chunk_size(131072)
model.to(device)

rembg_session = rembg.new_session()


def check_input_image(input_image):
    if input_image is None:
        raise gr.Error("No image uploaded!")


def preprocess(input_image, do_remove_background, foreground_ratio):
    def fill_background(image):
        image = np.array(image).astype(np.float32) / 255.0
        image = image[:, :, :3] * image[:, :, 3:4] + (1 - image[:, :, 3:4]) * 0.5
        image = Image.fromarray((image * 255.0).astype(np.uint8))
        return image

    if do_remove_background:
        image = input_image.convert("RGB")
        image = remove_background(image, rembg_session)
        image = resize_foreground(image, foreground_ratio)
        image = fill_background(image)
    else:
        image = input_image
        if image.mode == "RGBA":
            image = fill_background(image)
    return image


def generate(image):
    scene_codes = model(image, device=device)
    mesh = model.extract_mesh(scene_codes)[0]
    mesh = to_gradio_3d_orientation(mesh)
    mesh_path = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
    mesh_path2 = tempfile.NamedTemporaryFile(suffix=".glb", delete=False)
    mesh.export(mesh_path.name)
    mesh.export(mesh_path2.name)
    return mesh_path.name, mesh_path2.name

def run_example(image_pil):
    preprocessed = preprocess(image_pil, False, 0.9)
    mesh_name, mesn_name2 = generate(preprocessed)
    return preprocessed, mesh_name, mesh_name2

with gr.Blocks() as demo:
    gr.Markdown(HEADER)
    with gr.Row(variant="panel"):
        with gr.Column():
            with gr.Row():
                input_image = gr.Image(
                    label="Input Image",
                    image_mode="RGBA",
                    sources="upload",
                    type="pil",
                    elem_id="content_image",
                )
                processed_image = gr.Image(label="Processed Image", interactive=False)
            with gr.Row():
                with gr.Group():
                    do_remove_background = gr.Checkbox(
                        label="Remove Background", value=True
                    )
                    foreground_ratio = gr.Slider(
                        label="Foreground Ratio",
                        minimum=0.5,
                        maximum=1.0,
                        value=0.85,
                        step=0.05,
                    )
            with gr.Row():
                submit = gr.Button("Generate", elem_id="generate", variant="primary")
        with gr.Column():
            with gr.Tab("obj"):
                output_model = gr.Model3D(
                    label="Output Model",
                    interactive=False,
                )
            with gr.Tab("glb"):
                output_model2 = gr.Model3D(
                    label="Output Model",
                    interactive=False,
                )
    # with gr.Row(variant="panel"):
    #     gr.Examples(
    #         examples=[
    #             os.path.join("examples", img_name) for img_name in sorted(os.listdir("examples"))
    #         ],
    #         inputs=[input_image],
    #         outputs=[processed_image, output_model, output_model2],
    #         #cache_examples=True,
    #         fn=partial(run_example),
    #         label="Examples",
    #         examples_per_page=20
    #     )
    submit.click(fn=check_input_image, inputs=[input_image]).success(
        fn=preprocess,
        inputs=[input_image, do_remove_background, foreground_ratio],
        outputs=[processed_image],
    ).success(
        fn=generate,
        inputs=[processed_image],
        outputs=[output_model, output_model2],
    )

def require_api_key(request: Request):
    api_key = os.environ.get("LOCAL_3D_API_KEY")
    if api_key:
        if request.headers.get("x-api-key") != api_key:
            return JSONResponse(
                {"detail": "Unauthorized: invalid or missing x-api-key."},
                status_code=401,
            )
    elif os.environ.get("ALLOW_LOCAL_3D_NO_KEY", "").lower() not in (
        "1",
        "true",
        "yes",
    ):
        return JSONResponse(
            {"detail": "LOCAL_3D_API_KEY is not configured."},
            status_code=500,
        )
    return None


async def parse_request_image(request: Request):
    form = await request.form()
    upload = form.get("image")
    if upload is not None:
        try:
            if hasattr(upload, "file"):
                return Image.open(upload.file).convert("RGBA")
            return Image.open(io.BytesIO(upload.read())).convert("RGBA")
        except Exception as e:
            raise ValueError(f"Invalid image data: {str(e)}")

    payload = await request.json()
    image_data = payload.get("image") or payload.get("image_base64")
    if not image_data:
        raise ValueError("Missing image file in form field 'image' or JSON key 'image'.")

    try:
        import base64

        decoded = base64.b64decode(image_data)
        return Image.open(io.BytesIO(decoded)).convert("RGBA")
    except Exception as e:
        raise ValueError(f"Invalid base64 image data: {str(e)}")


async def generate_3d_endpoint(request: Request):
    auth_error = require_api_key(request)
    if auth_error is not None:
        return auth_error

    try:
        image = await parse_request_image(request)
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)

    try:
        _, glb_path = generate(image)
        filename = os.path.basename(glb_path)
        return FileResponse(
            glb_path,
            media_type="model/gltf-binary",
            filename=filename,
        )
    except Exception as e:
        logging.exception("generate_3d_endpoint failed")
        return JSONResponse({"detail": str(e)}, status_code=500)


async def health_endpoint(request: Request):
    return JSONResponse({"ok": True})


async def routes_endpoint(request: Request):
    return JSONResponse(
        {
            "routes": [
                "/",
                "/health",
                "/generate-3d",
            ]
        }
    )


demo.app.add_api_route("/generate-3d", generate_3d_endpoint, methods=["POST"])

demo.app.add_api_route("/health", health_endpoint, methods=["GET"])

demo.app.add_api_route("/routes", routes_endpoint, methods=["GET"])

app = demo.app


@app.on_event("startup")
async def log_routes_on_startup():
    route_paths = [route.path for route in app.routes]
    logging.info("Starting TripoSR server with routes: %s", route_paths)


demo.queue(max_size=10)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)







