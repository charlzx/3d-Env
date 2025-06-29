import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// Self-contained, ES6-compatible SimplexNoise class.
class SimplexNoise {
	constructor(r) {
		if (r === undefined) r = Math;
		this.grad3 = [
			[1, 1, 0],
			[-1, 1, 0],
			[1, -1, 0],
			[-1, -1, 0],
			[1, 0, 1],
			[-1, 0, 1],
			[1, 0, -1],
			[-1, 0, -1],
			[0, 1, 1],
			[0, -1, 1],
			[0, 1, -1],
			[0, -1, -1]
		];
		this.p = [];
		for (let i = 0; i < 256; i++) {
			this.p[i] = Math.floor(r.random() * 256);
		}
		this.perm = [];
		for (let i = 0; i < 512; i++) {
			this.perm[i] = this.p[i & 255];
		}
		this.dot = (g, x, y, z) => {
			return g[0] * x + g[1] * y + g[2] * z;
		};
	}

	noise(xin, yin, zin) {
		let n0, n1, n2, n3;
		let F2 = 0.5 * (Math.sqrt(3) - 1);
		let s = (xin + yin + zin) * F2;
		let i = Math.floor(xin + s);
		let j = Math.floor(yin + s);
		let k = Math.floor(zin + s);
		let G2 = (3 - Math.sqrt(3)) / 6;
		let t = (i + j + k) * G2;
		let X0 = i - t;
		let Y0 = j - t;
		let Z0 = k - t;
		let x0 = xin - X0;
		let y0 = yin - Y0;
		let z0 = zin - Z0;
		let i1, j1, k1;
		let i2, j2, k2;
		if (x0 >= y0) {
			if (y0 >= z0) {
				i1 = 1;
				j1 = 0;
				k1 = 0;
				i2 = 1;
				j2 = 1;
				k2 = 0;
			} else if (x0 >= z0) {
				i1 = 1;
				j1 = 0;
				k1 = 0;
				i2 = 1;
				j2 = 0;
				k2 = 1;
			} else {
				i1 = 0;
				j1 = 0;
				k1 = 1;
				i2 = 1;
				j2 = 0;
				k2 = 1;
			}
		} else {
			if (y0 < z0) {
				i1 = 0;
				j1 = 0;
				k1 = 1;
				i2 = 0;
				j2 = 1;
				k2 = 1;
			} else if (x0 < z0) {
				i1 = 0;
				j1 = 1;
				k1 = 0;
				i2 = 0;
				j2 = 1;
				k2 = 1;
			} else {
				i1 = 0;
				j1 = 1;
				k1 = 0;
				i2 = 1;
				j2 = 1;
				k2 = 0;
			}
		}
		let x1 = x0 - i1 + G2;
		let y1 = y0 - j1 + G2;
		let z1 = z0 - k1 + G2;
		let x2 = x0 - i2 + 2 * G2;
		let y2 = y0 - j2 + 2 * G2;
		let z2 = z0 - k2 + 2 * G2;
		let x3 = x0 - 1 + 3 * G2;
		let y3 = y0 - 1 + 3 * G2;
		let z3 = z0 - 1 + 3 * G2;
		let ii = i & 255;
		let jj = j & 255;
		let kk = k & 255;
		let gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
		let gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
		let gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
		let gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;
		let t0 = 0.5 - x0 * x0 - y0 * y0 - z0 * z0;
		if (t0 < 0) {
			n0 = 0;
		} else {
			t0 *= t0;
			n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
		}
		let t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
		if (t1 < 0) {
			n1 = 0;
		} else {
			t1 *= t1;
			n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
		}
		let t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
		if (t2 < 0) {
			n2 = 0;
		} else {
			t2 *= t2;
			n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
		}
		let t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
		if (t3 < 0) {
			n3 = 0;
		} else {
			t3 *= t3;
			n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
		}
		return 32 * (n0 + n1 + n2 + n3);
	}

	noise2D(x, y) {
		return this.noise(x, y, 0);
	}
}

// Main React App Component
export default function App() {
    const mountRef = useRef(null);

    useEffect(() => {
        // --- BASIC SETUP ---
        let scene, camera, renderer, controls, water, sun;
        const animationFrameId = { current: null };

        // --- SCENE INITIALIZATION ---
        const init = () => {
            scene = new THREE.Scene();

            // --- RENDERER SETUP ---
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            if (mountRef.current) {
                mountRef.current.appendChild(renderer.domElement);
            }

            // --- CAMERA SETUP ---
            camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
            camera.position.set(30, 30, 100);

            // --- SUN AND SKY SETUP ---
            sun = new THREE.Vector3();
            const sky = new Sky();
            sky.scale.setScalar(10000);
            scene.add(sky);

            const skyUniforms = sky.material.uniforms;
            skyUniforms['turbidity'].value = 10;
            skyUniforms['rayleigh'].value = 2;
            skyUniforms['mieCoefficient'].value = 0.005;
            skyUniforms['mieDirectionalG'].value = 0.8;

            const parameters = {
                elevation: 3,
                azimuth: 180
            };
            const pmremGenerator = new THREE.PMREMGenerator(renderer);

            function updateSun() {
                const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
                const theta = THREE.MathUtils.degToRad(parameters.azimuth);
                sun.setFromSphericalCoords(1, phi, theta);
                sky.material.uniforms['sunPosition'].value.copy(sun);
                if (water) {
                    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
                }
                scene.environment = pmremGenerator.fromScene(sky).texture;
            }

            // --- WATER SETUP ---
            const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
            const waterNormals = new THREE.TextureLoader().load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', 
                (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }
            );

            water = new Water(waterGeometry, {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: scene.fog !== undefined
            });
            water.rotation.x = -Math.PI / 2;
            scene.add(water);
            updateSun();

            // --- TERRAIN SETUP ---
            const terrainSize = 256;
            const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 100, 100);
            terrainGeometry.rotateX(-Math.PI / 2);
            
            const simplex = new SimplexNoise();
            const vertices = terrainGeometry.attributes.position;
            for (let i = 0; i < vertices.count; i++) {
                const v = new THREE.Vector3().fromBufferAttribute(vertices, i);
                const noise = simplex.noise2D(v.x / 50, v.z / 50);
                v.y = noise * 10;
                vertices.setY(i, v.y);
            }
            terrainGeometry.computeVertexNormals();
            
            const terrainMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x228B22,
                roughness: 0.9,
                metalness: 0.1
            });
            const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
            scene.add(terrain);

            // --- OBJECT PLACEMENT (TREES & HOUSES) ---
            const treeCount = 300;
            const houseCount = 50;

            const treeTrunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2);
            const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const treeFoliageGeo = new THREE.IcosahedronGeometry(2);
            const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x006400 });
            
            const houseBaseGeo = new THREE.BoxGeometry(2, 2, 3);
            const houseBaseMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
            const houseRoofGeo = new THREE.CylinderGeometry(0, 1.8, 1.5, 4);
            const houseRoofMat = new THREE.MeshStandardMaterial({ color: 0xA52A2A });
            houseRoofGeo.rotateY(Math.PI / 4);

            const trunkInstanced = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treeCount);
            const foliageInstanced = new THREE.InstancedMesh(treeFoliageGeo, treeFoliageMat, treeCount);
            const houseBaseInstanced = new THREE.InstancedMesh(houseBaseGeo, houseBaseMat, houseCount);
            const houseRoofInstanced = new THREE.InstancedMesh(houseRoofGeo, houseRoofMat, houseCount);

            scene.add(trunkInstanced, foliageInstanced, houseBaseInstanced, houseRoofInstanced);
            
            const dummy = new THREE.Object3D();
            for (let i = 0; i < treeCount; i++) {
                let x, z, y;
                do {
                   x = Math.random() * terrainSize * 0.9 - (terrainSize * 0.9) / 2;
                   z = Math.random() * terrainSize * 0.9 - (terrainSize * 0.9) / 2;
                   y = simplex.noise2D(x / 50, z / 50) * 10;
                } while (y < 1.0 || y > 10);

                const scale = 0.9 + Math.random() * 0.2;
                dummy.rotation.y = Math.random() * Math.PI * 2;
                
                dummy.position.set(x, y + 1 * scale, z);
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                trunkInstanced.setMatrixAt(i, dummy.matrix);

                dummy.position.y += 1.5 * scale;
                dummy.updateMatrix();
                foliageInstanced.setMatrixAt(i, dummy.matrix);
            }

            for (let i = 0; i < houseCount; i++) {
                let x, z, y;
                do {
                   x = Math.random() * terrainSize * 0.8 - (terrainSize * 0.8) / 2;
                   z = Math.random() * terrainSize * 0.8 - (terrainSize * 0.8) / 2;
                   y = simplex.noise2D(x / 50, z / 50) * 10;
                } while (y < 0.5 || y > 5.0);

                dummy.rotation.y = Math.round(Math.random() * 4) * (Math.PI / 2);
                dummy.scale.setScalar(1);

                dummy.position.set(x, y + 1, z);
                dummy.updateMatrix();
                houseBaseInstanced.setMatrixAt(i, dummy.matrix);

                dummy.position.y += 1.75;
                dummy.updateMatrix();
                houseRoofInstanced.setMatrixAt(i, dummy.matrix);
            }

            // --- CONTROLS ---
            controls = new OrbitControls(camera, renderer.domElement);
            controls.maxPolarAngle = Math.PI * 0.495;
            controls.target.set(0, 10, 0);
            controls.minDistance = 20.0;
            controls.maxDistance = 200.0;
            controls.update();

            // --- EVENT LISTENERS ---
            window.addEventListener('resize', onWindowResize);
        };

        const onWindowResize = () => {
            if (camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        };

        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);
            if (water) {
                water.material.uniforms['time'].value += 1.0 / 60.0;
            }
            if(renderer && scene && camera){
                renderer.render(scene, camera);
            }
        };
        
        init();
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            window.removeEventListener('resize', onWindowResize);
            if (renderer) {
                renderer.dispose();
                if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                    mountRef.current.removeChild(renderer.domElement);
                }
            }
            if (scene) {
                scene.traverse(object => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
        };
    }, []);

    return (
        <div>
            <style>{`
                body { margin: 0; overflow: hidden; background-color: #000; }
                .mountPoint { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
                .info-container {
                    position: absolute;
                    bottom: 10%;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                    color: white;
                    pointer-events: none;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                }
                .info-container h1 { font-size: 3rem; font-weight: bold; }
                .info-container p { font-size: 1.25rem; color: #e5e7eb; margin-top: 0.5rem; }
                 @media (min-width: 768px) { .info-container h1 { font-size: 3.75rem; } }
            `}</style>
            <div ref={mountRef} className="mountPoint" />
            <div className="info-container">
                <h1>Explore This World</h1>
                <p>Click and drag to look around. Scroll to zoom.</p>
            </div>
        </div>
    );
}
