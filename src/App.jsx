import React, { useRef, useEffect, useState } from 'react';

// Self-contained, ES6-compatible SimplexNoise class.
// This class generates procedural noise, which is used to create the random-looking, natural terrain.
class SimplexNoise {
    constructor(r) {
        if (r === undefined) r = Math;
        this.grad3 = [
            [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
            [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
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
            if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
            else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
            else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
        } else {
            if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
            else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
            else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
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
        if (t0 < 0) { n0 = 0; }
        else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) { n1 = 0; }
        else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) { n2 = 0; }
        else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2); }
        let t3 = 0.5 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) { n3 = 0; }
        else { t3 *= t3; n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3); }
        return 32 * (n0 + n1 + n2 + n3);
    }

    noise2D(x, y) {
        return this.noise(x, y, 0);
    }
}


// Main React App Component
export default function App() {
    const mountRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // --- Refs for Three.js objects ---
        const threeRef = {
            THREE: null,
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            water: null,
            sun: null,
            terrain: null,
            player: null,
            clock: null,
            animationFrameId: null,
        };

        // --- State ---
        let isThirdPerson = false;
        const keys = {};
        const playerSpeed = 8.0; 
        const playerRotationSpeed = 2.5;
        let simplex;

        // --- SCRIPT LOADING ---
        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Script load error for ${src}`));
                document.head.appendChild(script);
            });
        };

        const loadThreeModules = async () => {
            try {
                await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
                await Promise.all([
                    loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'),
                    loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Water.js'),
                    loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Sky.js')
                ]);
                threeRef.THREE = window.THREE;
                return true;
            } catch (error) {
                console.error("Failed to load Three.js scripts:", error);
                return false;
            }
        };

        // --- SCENE INITIALIZATION ---
        const init = () => {
            const { THREE } = threeRef;
            
            simplex = new SimplexNoise();

            threeRef.clock = new THREE.Clock();
            threeRef.scene = new THREE.Scene();

            // --- RENDERER SETUP ---
            threeRef.renderer = new THREE.WebGLRenderer({ antialias: true });
            threeRef.renderer.setPixelRatio(window.devicePixelRatio);
            threeRef.renderer.setSize(window.innerWidth, window.innerHeight);
            threeRef.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            threeRef.renderer.shadowMap.enabled = true;
            threeRef.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            if (mountRef.current) {
                mountRef.current.appendChild(threeRef.renderer.domElement);
            }

            // --- CAMERA SETUP ---
            threeRef.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
            threeRef.camera.position.set(30, 30, 100);

            // --- PLAYER CHARACTER (GRADIENT SPHERE) ---
            const sphereRadius = 0.5;
            const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
            
            // Custom shader material for the gradient effect
            const gradientMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    colorA: { type: 'vec3', value: new THREE.Color(0x87CEEB) }, // Sky Blue
                    colorB: { type: 'vec3', value: new THREE.Color(0xFF69B4) }  // Hot Pink
                },
                vertexShader: `
                    varying vec3 vUv; 
                    void main() {
                      vUv = normalize(position); 
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 colorA;
                    uniform vec3 colorB;
                    varying vec3 vUv;
                    void main() {
                      gl_FragColor = vec4(mix(colorA, colorB, vUv.y * 0.5 + 0.5), 1.0);
                    }
                `
            });

            const sphere = new THREE.Mesh(sphereGeometry, gradientMaterial);
            sphere.castShadow = true;
            sphere.position.set(0, 0, 50);

            threeRef.player = sphere;
            threeRef.scene.add(threeRef.player);
            threeRef.player.visible = false;


            // --- SUN AND SKY SETUP ---
            threeRef.sun = new THREE.Vector3();
            const sky = new THREE.Sky();
            sky.scale.setScalar(10000);
            threeRef.scene.add(sky);
            const skyUniforms = sky.material.uniforms;
            skyUniforms['turbidity'].value = 10;
            skyUniforms['rayleigh'].value = 2;
            skyUniforms['mieCoefficient'].value = 0.005;
            skyUniforms['mieDirectionalG'].value = 0.8;
            const parameters = { elevation: 3, azimuth: 180 };
            const pmremGenerator = new THREE.PMREMGenerator(threeRef.renderer);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(100, 100, 50);
            directionalLight.castShadow = true;
            Object.assign(directionalLight.shadow, {
                mapSize: new THREE.Vector2(2048, 2048),
                camera: new THREE.OrthographicCamera(-100, 100, 100, -100, 0.5, 500)
            });
            threeRef.scene.add(directionalLight);

            function updateSun() {
                const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
                const theta = THREE.MathUtils.degToRad(parameters.azimuth);
                threeRef.sun.setFromSphericalCoords(1, phi, theta);
                sky.material.uniforms['sunPosition'].value.copy(threeRef.sun);
                if (threeRef.water) {
                    threeRef.water.material.uniforms['sunDirection'].value.copy(threeRef.sun).normalize();
                }
                threeRef.scene.environment = pmremGenerator.fromScene(sky).texture;
            }

            // --- WATER SETUP ---
            const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
            const waterNormals = new THREE.TextureLoader().load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
                (texture) => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; }
            );
            threeRef.water = new THREE.Water(waterGeometry, {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: threeRef.scene.fog !== undefined
            });
            threeRef.water.rotation.x = -Math.PI / 2;
            threeRef.water.position.y = -0.5;
            threeRef.water.receiveShadow = true;
            threeRef.scene.add(threeRef.water);
            updateSun();

            // --- TERRAIN SETUP ---
            const terrainSize = 256;
            const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 100, 100);
            terrainGeometry.rotateX(-Math.PI / 2);
            const vertices = terrainGeometry.attributes.position;
            for (let i = 0; i < vertices.count; i++) {
                const v = new THREE.Vector3().fromBufferAttribute(vertices, i);
                v.y = simplex.noise2D(v.x / 50, v.z / 50) * 10;
                vertices.setY(i, v.y);
            }
            terrainGeometry.computeVertexNormals();
            const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9, metalness: 0.1 });
            threeRef.terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
            threeRef.terrain.receiveShadow = true;
            threeRef.scene.add(threeRef.terrain);

            // --- INSTANCED OBJECT PLACEMENT ---
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
            [trunkInstanced, foliageInstanced, houseBaseInstanced, houseRoofInstanced].forEach(mesh => {
                mesh.castShadow = true;
                threeRef.scene.add(mesh);
            });
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
            threeRef.controls = new THREE.OrbitControls(threeRef.camera, threeRef.renderer.domElement);
            Object.assign(threeRef.controls, { maxPolarAngle: Math.PI * 0.495, minDistance: 20.0, maxDistance: 200.0 });
            threeRef.controls.target.set(0, 10, 0);
            threeRef.controls.update();

            // --- EVENT LISTENERS ---
            window.addEventListener('resize', onWindowResize);
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
        };

        const onKeyDown = (event) => {
            keys[event.code] = true;
            if (event.code === 'KeyV' && !event.repeat) {
                isThirdPerson = !isThirdPerson;
                
                if (!isThirdPerson) {
                    const targetPosition = threeRef.player.position.clone();
                    threeRef.controls.target.copy(targetPosition);
                    threeRef.controls.update();
                }

                threeRef.controls.enabled = !isThirdPerson;
                threeRef.player.visible = isThirdPerson;
            }
        };
        const onKeyUp = (event) => { keys[event.code] = false; };
        const onWindowResize = () => { if (threeRef.camera && threeRef.renderer) { threeRef.camera.aspect = window.innerWidth / window.innerHeight; threeRef.camera.updateProjectionMatrix(); threeRef.renderer.setSize(window.innerWidth, window.innerHeight); } };

        // --- UPDATE FUNCTIONS ---
        const updatePlayer = (deltaTime) => {
            if (!threeRef.player || !isThirdPerson || !simplex) return;
            const { THREE } = threeRef;
            
            // Handle rotation
            if (keys['KeyA'] || keys['ArrowLeft']) {
                threeRef.player.rotation.y += playerRotationSpeed * deltaTime;
            }
            if (keys['KeyD'] || keys['ArrowRight']) {
                threeRef.player.rotation.y -= playerRotationSpeed * deltaTime;
            }

            // Handle forward/backward movement
            const moveDirection = new THREE.Vector3(0, 0, 1);
            moveDirection.applyQuaternion(threeRef.player.quaternion);
            const moveDistance = playerSpeed * deltaTime;

            if (keys['KeyW'] || keys['ArrowUp']) {
                threeRef.player.position.addScaledVector(moveDirection, -moveDistance);
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
                threeRef.player.position.addScaledVector(moveDirection, moveDistance);
            }

            // Update player's Y position based on the stable terrain noise
            const sphereRadius = threeRef.player.geometry.parameters.radius;
            threeRef.player.position.y = (simplex.noise2D(threeRef.player.position.x / 50, threeRef.player.position.z / 50) * 10) + sphereRadius;

            // Camera follows the player
            const offset = new THREE.Vector3(0, 5, 12); 
            offset.applyQuaternion(threeRef.player.quaternion);
            threeRef.camera.position.copy(threeRef.player.position).add(offset);
            threeRef.camera.lookAt(threeRef.player.position);
        };

        // --- ANIMATION LOOP ---
        const animate = () => {
            threeRef.animationFrameId = requestAnimationFrame(animate);
            const deltaTime = threeRef.clock.getDelta();
            updatePlayer(deltaTime);
            if (threeRef.controls && threeRef.controls.enabled) {
                threeRef.controls.update();
            }
            if (threeRef.water) {
                threeRef.water.material.uniforms['time'].value += 1.0 / 60.0;
            }
            if (threeRef.renderer && threeRef.scene && threeRef.camera) {
                threeRef.renderer.render(threeRef.scene, threeRef.camera);
            }
        };

        // --- START AND CLEANUP ---
        const start = async () => {
            const success = await loadThreeModules();
            if (success) {
                init();
                setIsLoading(false);
                animate();
            } else {
                setIsLoading(false);
            }
        };

        start();

        return () => {
            if (threeRef.animationFrameId) {
                cancelAnimationFrame(threeRef.animationFrameId);
            }
            window.removeEventListener('resize', onWindowResize);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            if (threeRef.renderer) {
                threeRef.renderer.dispose();
                if (mountRef.current && mountRef.current.contains(threeRef.renderer.domElement)) {
                    mountRef.current.removeChild(threeRef.renderer.domElement);
                }
            }
            if (threeRef.scene) {
                threeRef.scene.traverse(object => {
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
                .info-container, .loading-container {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                }
                .loading-container { top: 50%; transform: translate(-50%, -50%); font-size: 2rem; }
                .info-container { bottom: 10%; pointer-events: none; }
                .info-container h1 { font-size: 2.5rem; font-weight: bold; margin: 0; }
                .info-container p { font-size: 1rem; color: #e5e7eb; margin-top: 0.5rem; }
                @media (max-width: 768px) { 
                    .info-container h1 { font-size: 1.8rem; } 
                    .info-container p { font-size: 0.9rem; }
                }
            `}</style>
            <div ref={mountRef} className="mountPoint" />
            {isLoading ? (
                <div className="loading-container">Loading...</div>
            ) : (
                <div className="info-container">
                    <h1>Enhanced World Explorer</h1>
                    <p>WASD/Arrows - Move • Click & Drag - Look Around • V - Toggle View</p>
                </div>
            )}
        </div>
    );
}
