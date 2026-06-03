// @ts-nocheck
// Minimal Collada (.dae) exporter — produces a valid 1.4.1 document containing
// the merged triangle geometry of every Mesh in the given Object3D. Output is
// importable by Blender, Maya, Unity, Unreal, and Second Life's mesh uploader.
import * as THREE from "three";

export class DAEExporter {
  parse(object: THREE.Object3D, name = "model"): string {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;
    let hasNormals = false;
    let hasUVs = false;

    object.updateMatrixWorld(true);
    object.traverse((child: any) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);
      const pos = geom.getAttribute("position");
      const nrm = geom.getAttribute("normal");
      const uv = geom.getAttribute("uv");
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (nrm) {
          normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
          hasNormals = true;
        }
        if (uv) {
          uvs.push(uv.getX(i), uv.getY(i));
          hasUVs = true;
        }
      }
      const idx = geom.index;
      if (idx) {
        for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + vertexOffset);
      } else {
        for (let i = 0; i < pos.count; i++) indices.push(i + vertexOffset);
      }
      vertexOffset += pos.count;
    });

    const date = new Date().toISOString();
    const posStr = positions.map((v) => v.toFixed(6)).join(" ");
    const nrmStr = normals.map((v) => v.toFixed(6)).join(" ");
    const uvStr = uvs.map((v) => v.toFixed(6)).join(" ");
    const triCount = indices.length / 3;

    // Build interleaved <p> indices per input stream
    let stride = 1;
    let inputs = `<input semantic="VERTEX" source="#${name}-vertices" offset="0"/>`;
    if (hasNormals) {
      inputs += `<input semantic="NORMAL" source="#${name}-normals" offset="${stride}"/>`;
      stride++;
    }
    if (hasUVs) {
      inputs += `<input semantic="TEXCOORD" source="#${name}-uvs" offset="${stride}" set="0"/>`;
      stride++;
    }
    const pData: number[] = [];
    for (let i = 0; i < indices.length; i++) {
      const v = indices[i];
      pData.push(v);
      if (hasNormals) pData.push(v);
      if (hasUVs) pData.push(v);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor><authoring_tool>KingDavez 3D</authoring_tool></contributor>
    <created>${date}</created>
    <modified>${date}</modified>
    <unit name="meter" meter="1"/>
    <up_axis>Y_UP</up_axis>
  </asset>
  <library_effects>
    <effect id="${name}-effect">
      <profile_COMMON>
        <technique sid="common">
          <lambert><diffuse><color>0.8 0.8 0.8 1</color></diffuse></lambert>
        </technique>
      </profile_COMMON>
    </effect>
  </library_effects>
  <library_materials>
    <material id="${name}-material" name="${name}-material">
      <instance_effect url="#${name}-effect"/>
    </material>
  </library_materials>
  <library_geometries>
    <geometry id="${name}-mesh" name="${name}">
      <mesh>
        <source id="${name}-positions">
          <float_array id="${name}-positions-array" count="${positions.length}">${posStr}</float_array>
          <technique_common>
            <accessor source="#${name}-positions-array" count="${positions.length / 3}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        ${
          hasNormals
            ? `<source id="${name}-normals">
          <float_array id="${name}-normals-array" count="${normals.length}">${nrmStr}</float_array>
          <technique_common>
            <accessor source="#${name}-normals-array" count="${normals.length / 3}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>`
            : ""
        }
        ${
          hasUVs
            ? `<source id="${name}-uvs">
          <float_array id="${name}-uvs-array" count="${uvs.length}">${uvStr}</float_array>
          <technique_common>
            <accessor source="#${name}-uvs-array" count="${uvs.length / 2}" stride="2">
              <param name="S" type="float"/><param name="T" type="float"/>
            </accessor>
          </technique_common>
        </source>`
            : ""
        }
        <vertices id="${name}-vertices">
          <input semantic="POSITION" source="#${name}-positions"/>
        </vertices>
        <triangles material="${name}-material" count="${triCount}">
          ${inputs}
          <p>${pData.join(" ")}</p>
        </triangles>
      </mesh>
    </geometry>
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="Scene" name="Scene">
      <node id="${name}-node" name="${name}">
        <instance_geometry url="#${name}-mesh">
          <bind_material>
            <technique_common>
              <instance_material symbol="${name}-material" target="#${name}-material"/>
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>`;
  }
}
