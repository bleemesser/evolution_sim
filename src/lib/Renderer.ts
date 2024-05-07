import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class SceneRenderer {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private controller: OrbitControls;
    private scene: THREE.Scene;
    private stats = new Stats();
    private floorSize = 20;

    private foodCollection: THREE.InstancedMesh | undefined;
    private creatureCollection: THREE.InstancedMesh | undefined;
    private wall: THREE.Mesh | undefined;

    private readonly PI2 = Math.PI * 2;

    private get aspectRatio(): number {
        return this.canvas.width / this.canvas.height;
    }

    private onResize() {
        this.canvas.style.width = '80vw';
        this.canvas.style.height = '100%';
        this.canvas.width = this.canvas.clientWidth / window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight / window.devicePixelRatio;

        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    constructor(canvas: HTMLCanvasElement) {
        // window.devicePixelRatio = 1;
        this.canvas = canvas;
        this.canvas.style.width = '80vw';
        this.canvas.style.height = '100%';
        this.canvas.width = this.canvas.clientWidth / window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight / window.devicePixelRatio;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.localClippingEnabled = true;

        this.camera = new THREE.PerspectiveCamera(75, this.aspectRatio, 0.1, 150);

        this.controller = new OrbitControls(this.camera, this.renderer.domElement);

        document.body.appendChild(this.stats.dom);

        this.scene = new THREE.Scene();

        this.renderer.setSize(this.canvas.width, this.canvas.height);
        window.addEventListener('resize', this.onResize.bind(this));
        this.init();
    }


    // init function to create geometry and add it to the scene
    private init() {
        const geometry = new THREE.BoxGeometry(this.floorSize, 0.1, this.floorSize);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: '#90EE90',
        });
        const ground = new THREE.Mesh(geometry, groundMaterial);
        ground.receiveShadow = true;
        ground.position.y = -0.05;
        this.scene.add(ground);
    

        const wallGeometry = new THREE.BoxGeometry(this.floorSize, 10, this.floorSize);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 'black',
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        // make wall invisible
        wall.material.transparent = true;
        wall.material.opacity = 0.2;
        wall.receiveShadow = false;
        wall.castShadow = false;

        wall.position.y = 5;
        this.wall = wall;
        this.scene.add(this.wall);


        // add directional light
        const light = new THREE.DirectionalLight(0xffffff, 2.5);
        light.position.set(40, 40, 40);
        light.castShadow = true;
        light.shadow.camera.top = 40;
        light.shadow.camera.bottom = -40;
        light.shadow.camera.left = -40;
        light.shadow.camera.right = 40;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 100;

        this.scene.add(light);
    
        // add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        ambientLight.intensity = 2;
        this.scene.add(ambientLight);
    
        this.camera.position.z = 20;
        this.camera.position.y = 15;
    }

    public spawnFood(count: number): void {
        // spawn a bunch of spheres in random positions on the ground
        const geometry = new THREE.SphereGeometry(0.2, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 'red',
        });
        // instancedmesh
        const food = new THREE.InstancedMesh(geometry, material, count);
        food.castShadow = true;
        food.receiveShadow = true;
        food.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
            position.set(
                (Math.random() - 0.5) * this.floorSize,
                0.2,
                (Math.random() - 0.5) * this.floorSize
            );
            // can ignore the quaternion food is a sphere
            scale.set(1, 1, 1);
            matrix.compose(position, quaternion, scale);
            food.setMatrixAt(i, matrix);
        }
        this.foodCollection = food;
        this.scene.add(this.foodCollection);

    }

    public spawnCreatures(count: number): void {
        const loader = new GLTFLoader();
        // instanced mesh load the gltf model
        loader.load('/src/assets/blob.gltf', (gltf) => {
            const creature = gltf.scene.children[0] as THREE.Mesh;
            const creatureMaterial = new THREE.MeshStandardMaterial({
                color: 'deepskyblue',
            });
            const instancedCreature = new THREE.InstancedMesh(creature.geometry, creatureMaterial, count);
            instancedCreature.castShadow = true;
            instancedCreature.receiveShadow = true;
            instancedCreature.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            for (let i = 0; i < count; i++) {
                position.set(
                    (Math.random() - 0.5) * this.floorSize,
                    -0.05,
                    (Math.random() - 0.5) * this.floorSize
                );
                scale.set(0.01, 0.01, 0.01);
                quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * this.PI2);
                matrix.compose(position, quaternion, scale);
                instancedCreature.setMatrixAt(i, matrix);
            }
            this.creatureCollection = instancedCreature;
            this.scene.add(this.creatureCollection);

        }, undefined, (error) => {
            console.error(error);
        });

    }
    

    // private update function that contains the animations
    private update(delta: number) {
        this.controller.update();
        this.stats.update();

        // animate the food hovering up and down in a sine wave
        if (this.foodCollection) {
            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            for (let i = 0; i < this.foodCollection.count; i++) {
                this.foodCollection.getMatrixAt(i, matrix);
                matrix.decompose(position, quaternion, scale);
                position.y = Math.sin(Date.now() * 0.005 + i) * 0.05 + 0.2;
                matrix.compose(position, quaternion, scale);
                this.foodCollection.setMatrixAt(i, matrix);
            }
            this.foodCollection.instanceMatrix.needsUpdate = true;
        }

        // animate the creatures moving around and collecting food if they touch it
        if (this.creatureCollection && this.foodCollection) {
            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            for (let i = 0; i < this.creatureCollection.count; i++) {
                this.creatureCollection.getMatrixAt(i, matrix);
                matrix.decompose(position, quaternion, scale);
                
                // choose a slightly randomized direction to move in, make it similar to the facing direction but as much as 90 degrees off
                quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * this.PI2);

                // have the creature move forward
                position.x += Math.sin(quaternion.y)  * delta;
                position.z += Math.cos(quaternion.y)  * delta;

                
                // recompose the matrix
                matrix.compose(position, quaternion, scale);
                this.creatureCollection.setMatrixAt(i, matrix);

            }
            this.creatureCollection.instanceMatrix.needsUpdate = true;
        }
    }

    // public render function to render the scene
    public render() {
        console.log(this.scene.children)

        const startTime = Date.now();
        let n = 0;
        let time = Date.now();
        
        const tick = () => {
            let delta = (Date.now() - time) / 1000;
            time = Date.now();            

            this.update(delta);
            this.renderer.render(this.scene, this.camera);
            n++;

            requestAnimationFrame(tick);

        }

        tick();
        
        

    }
    
}

export default SceneRenderer;