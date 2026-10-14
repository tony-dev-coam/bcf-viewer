import * as THREE from 'three';
import * as OBF from '@thatopen/components-front';

/**
 * Upstream bug (components-front 3.4.x): Area.computePlane() uses the first three points. Face outlines
 * often start with three collinear vertices → zero normal → area 0 → "Area face" never creates a measurement.
 * Use the first non-collinear triple instead. Remove when fixed upstream.
 */
export function patchAreaPlane() {
  const proto = OBF.Area.prototype as unknown as { computePlane(): THREE.Plane | null; _plane: THREE.Plane; points: Iterable<THREE.Vector3> };
  proto.computePlane = function (this: typeof proto) {
    const pts = [...this.points];
    const a = pts[0];
    if (!a || pts.length < 3) return null;
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 1; i < pts.length - 1; i++) {
      ab.subVectors(pts[i], a);
      for (let j = i + 1; j < pts.length; j++) {
        n.crossVectors(ab, ac.subVectors(pts[j], a));
        if (n.lengthSq() > 1e-12) return (this._plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.normalize(), a));
      }
    }
    return null;
  };
}
