// @ts-nocheck — legacy ported file; full typing pending
import * as THREE from "three";

export class FBXExporter {
  parse(object: THREE.Object3D): string {
    const vertices: number[] = [];
    const indices: number[] = [];

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geom = child.geometry;
        const posAttr = geom.getAttribute("position");
        const indexAttr = geom.index;

        if (posAttr) {
          const vertexOffset = vertices.length / 3;
          for (let i = 0; i < posAttr.count; i++) {
            vertices.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
          }

          if (indexAttr) {
            for (let i = 0; i < indexAttr.count; i += 3) {
              const a = indexAttr.getX(i) + vertexOffset;
              const b = indexAttr.getY(i) + vertexOffset;
              const c = indexAttr.getZ(i) + vertexOffset;
              // FBX polygon indices: last index of triangle is bitwise NOT (represented as ~index in ASCII)
              indices.push(a, b, ~c);
            }
          } else {
            for (let i = 0; i < posAttr.count; i += 3) {
              const a = i + vertexOffset;
              const b = i + 1 + vertexOffset;
              const c = i + 2 + vertexOffset;
              indices.push(a, b, ~c);
            }
          }
        }
      }
    });

    const vStr = vertices.map(v => v.toFixed(4)).join(",");
    const iStr = indices.join(",");

    return `; FBX 7.4.0 project file
; ----------------------------------------------------

FBXHeaderExtension: {
	FBXHeaderVersion: 1003
	FBXVersion: 7400
}
GlobalSettings: {
	Version: 1000
	UpAxis: 1
	UpAxisSign: 1
	FrontAxis: 2
	FrontAxisSign: 1
	CoordAxis: 0
	CoordAxisSign: 1
	UnitScaleFactor: 1.0
}
Documents: {
	Count: 1
	Document: 123456, "", "Scene" {
	}
}
References: {
}
Definitions: {
	Version: 100
	Count: 2
	ObjectType: "Geometry" {
		Count: 1
	}
	ObjectType: "Model" {
		Count: 1
	}
}
Objects: {
	Geometry: 987654, "Geometry::", "Mesh" {
		Vertices: *${vertices.length} {
			a: ${vStr}
		}
		PolygonVertexIndex: *${indices.length} {
			a: ${iStr}
		}
	}
	Model: 1234567, "Model::model", "Mesh" {
		Version: 232
		Properties70: {
			P: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
			P: "Lcl Rotation", "Lcl Rotation", "", "A",0,0,0
			P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
		}
	}
}
Relations: {
	Model: 1234567, "Model::model", "Mesh" {
		Version: 232
	}
	Connection: "OO", 987654, 1234567
}
`;
  }
}
