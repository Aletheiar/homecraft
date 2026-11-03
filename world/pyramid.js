import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';

export const pyramidState = { ready: false, sceneryReady: false, error: null, triangles: 0, sceneryTriangles: 0 };

export function loadPyramid(scene, renderer) {
  return new GLTFLoader().loadAsync(new URL('../assets/models/newheaven-courtyard.glb', import.meta.url).href)
    .then(gltf => {
      const model = gltf.scene;
      model.name = 'NewHeaven-courtyard';
      model.position.y = .025;
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        pyramidState.triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
        const glass = mesh.name.includes('glass');
        mesh.castShadow = !glass && !mesh.name.includes('water');
        mesh.receiveShadow = !glass;
        mesh.material.side = THREE.DoubleSide;
        mesh.material.roughness = .86;
        if (mesh.name.includes('cyan_terracotta') || mesh.name.includes('andesite')) {
          mesh.material.map = null;
          mesh.material.color.setHex(0xc9d1cc);
          mesh.material.emissive.setHex(0x343c38);
          mesh.material.emissiveIntensity = .28;
        }
        if (mesh.material.map) {
          mesh.material.map.magFilter = THREE.NearestFilter;
          mesh.material.map.anisotropy = 2;
        }
        if (glass) {
          mesh.material.transparent = true;
          mesh.material.opacity = .44;
          mesh.material.depthWrite = false;
          mesh.renderOrder = 1;
        }
      });
      scene.add(model);
      renderer.shadowMap.needsUpdate = true;
      pyramidState.ready = true;
      new GLTFLoader().loadAsync(new URL('../assets/models/newheaven-scenery.glb', import.meta.url).href).then(background => {
        background.scene.name = 'NewHeaven-original-surroundings';
        background.scene.position.y = .025;
        background.scene.traverse(mesh => {
          if (!mesh.isMesh) return;
          pyramidState.sceneryTriangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
          // Distant scenery uses baked directional tones rather than one PBR
          // lighting pass per fragment. Its authored surface coverage remains.
          if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
          const normals = mesh.geometry.attributes.normal;
          const shades = new Float32Array(normals.count * 3);
          for (let i = 0; i < normals.count; i++) {
            const shade = .68 + .32 * Math.abs(normals.getY(i)) + .13 * Math.abs(normals.getX(i));
            shades[i * 3] = shades[i * 3 + 1] = shades[i * 3 + 2] = shade;
          }
          mesh.geometry.setAttribute('color', new THREE.BufferAttribute(shades, 3));
          const source = mesh.material;
          mesh.material = new THREE.MeshBasicMaterial({ color: source.color, vertexColors: true, side: THREE.DoubleSide });
          source.dispose();
        });
        scene.add(background.scene);
        pyramidState.sceneryReady = true;
      }).catch(error => { pyramidState.error = `Scenery: ${error.message}`; console.error('Scenery load failed:', error); });
      return model;
    }).catch(error => {
      pyramidState.error = error.message;
      console.error('NewHeaven model failed to load:', error);
      return null;
    });
}
