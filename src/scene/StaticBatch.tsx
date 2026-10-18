import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Merge only opaque static meshes; return cleanup to preserve React's ownership. */
export function batchStaticChildren(g: THREE.Group) {
    g.updateWorldMatrix(true, true);
    const inverse = g.matrixWorld.clone().invert();
    const groups = new Map<string, THREE.Mesh[]>();
    g.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material) || !m.visible || m.userData.noShadow) return;
      const mat = m.material as THREE.MeshStandardMaterial & { gradientMap?: THREE.Texture; color?: THREE.Color };
      if (mat.transparent || mat.depthWrite === false) return;
      const key = JSON.stringify([mat.type, mat.color?.getHex(), mat.map?.uuid, mat.gradientMap?.uuid, mat.envMap?.uuid,
        mat.roughness, mat.metalness, mat.envMapIntensity, mat.side, mat.alphaTest, mat.vertexColors, mat.toneMapped,
        mat.emissive?.getHex(), mat.emissiveIntensity, mat.normalMap?.uuid, mat.roughnessMap?.uuid, mat.metalnessMap?.uuid,
        mat.alphaMap?.uuid, mat.flatShading, mat.depthTest, mat.colorWrite,
        Object.keys(m.geometry.attributes).sort(), !!m.geometry.index]);
      const list = groups.get(key) ?? []; list.push(m); groups.set(key,list);
    });
    const batches: THREE.Mesh[] = [];
    const originals: THREE.Mesh[] = [];
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map(m => m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld)));
      const merged = mergeGeometries(geometries, false);
      geometries.forEach(x => x.dispose());
      if (!merged) continue;
      const batch = new THREE.Mesh(merged, meshes[0].material);
      batch.castShadow = true; batch.receiveShadow = true;
      batch.name = `static-batch:${meshes.length}`;
      g.add(batch); batches.push(batch);
      meshes.forEach(m => { m.visible = false; originals.push(m); });
    }
    return () => { originals.forEach(m => { m.visible = true; }); batches.forEach(m => { g.remove(m); m.geometry.dispose(); }); };

}

export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (root.current) return batchStaticChildren(root.current);
  }, [children]);
  return <group ref={root}>{children}</group>;
}
