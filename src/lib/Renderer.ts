import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { Raycaster } from 'three/src/core/Raycaster.js';

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

    private foodPositions: THREE.Vector3[] = new Array();

    private debugSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 32), new THREE.MeshStandardMaterial({ color: 'yellow' }));
    private debugRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.05, 32), new THREE.MeshStandardMaterial({ color: 'blue', transparent: false, opacity: 0.5}));

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
            // side: THREE.DoubleSide,
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

        this.scene.add(this.debugSphere);
        this.scene.add(this.debugRing);

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

        let matrix = new THREE.Matrix4();
        let position = new THREE.Vector3();
        let quaternion = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
            position.set(
                (Math.random() - 0.5) * this.floorSize,
                0.2,
                (Math.random() - 0.5) * this.floorSize
            );
            this.foodPositions.push(position.clone()); // VERY important to clone the position otherwise it will be a reference
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
            instancedCreature.userData = { facings: new Array(count).fill(0), creatureInfo: new Array(count)};

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
                instancedCreature.userData.facings[i] = Math.random() * this.PI2;
                instancedCreature.userData.creatureInfo[i] = { 
                    speed: Math.random() * 0.1 + 0.01,
                    viewRadius: Math.random() * 2 + 1,

                    isTargetingFood: false,
                    willSurvive: false,
                    willReproduce: false,
                    age: 0,

                 };

                matrix.compose(position, quaternion, scale);
                instancedCreature.setMatrixAt(i, matrix);
                instancedCreature.instanceMatrix.needsUpdate = true;
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
            let matrix = new THREE.Matrix4();
            let position = new THREE.Vector3();
            let quaternion = new THREE.Quaternion();
            let scale = new THREE.Vector3();
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

            let matrix = new THREE.Matrix4();
            let position = new THREE.Vector3();
            let quaternion = new THREE.Quaternion();
            let scale = new THREE.Vector3();

            for (let i = 0; i < this.creatureCollection.count; i++) {
                this.creatureCollection.getMatrixAt(i, matrix);
                matrix.decompose(position, quaternion, scale);         

                // Get creature facing and info
                let facing = this.creatureCollection.userData.facings[i];
                let creatureInfo = this.creatureCollection.userData.creatureInfo[i];

                // Check for collisions with walls and move the creature
                const speed = creatureInfo.speed;
                let dx = new THREE.Vector3(Math.cos(facing) * speed, 0, 0);
                let dz = new THREE.Vector3(0, 0, Math.sin(facing) * speed);
                let tempPosX = position.clone();
                let tempPosZ = position.clone();

                tempPosX.add(dx);
                tempPosZ.add(dz);
                if (tempPosX.x < -this.floorSize / 2 || tempPosX.x > this.floorSize / 2) {
                    dx.x = -dx.x;
                    facing = Math.PI - facing;
                } else if (tempPosZ.z < -this.floorSize / 2 || tempPosZ.z > this.floorSize / 2) {
                    dz.z = -dz.z;
                    facing = -facing;
                }
                position.add(dx);
                position.add(dz); 

                // add some randomnes to the creature's movement
                if (Math.random() < 0.1 && !creatureInfo.isTargetingFood) {
                    facing += Math.PI / 4 * (Math.random() - 0.5);
                }

                // Target food and eat it
                // use filter to find food in view radius
                const foodInView = this.foodPositions.filter((foodPosition) => {
                    return position.distanceTo(foodPosition) < creatureInfo.viewRadius;
                });

                console.log(foodInView)

                // if there is food in view, target the closest one
                if (foodInView.length > 0) {
                    const closestFood = foodInView.reduce((prev, curr) => {
                        return position.distanceTo(curr) < position.distanceTo(prev) ? curr : prev;
                    });
                    creatureInfo.isTargetingFood = true;
                    facing = Math.atan2(closestFood.z - position.z, closestFood.x - position.x);

                    if (position.distanceTo(closestFood) <= 0.5) {
                        // eat the food (put it very very far away)
                        let index = this.foodPositions.indexOf(closestFood);
                        let matrix = new THREE.Matrix4();
                        let position = new THREE.Vector3();
                        let quaternion = new THREE.Quaternion();
                        let scale = new THREE.Vector3();
                        this.foodCollection.getMatrixAt(index, matrix);
                        matrix.decompose(position, quaternion, scale);
                        position.set(100, 100, 100);
                        matrix.compose(position, quaternion, scale);
                        this.foodCollection.setMatrixAt(index, matrix);
                        this.foodCollection.instanceMatrix.needsUpdate = true;

                        // remove the food from the foodPositions array
                        this.foodPositions.splice(index, 1);
                        creatureInfo.isTargetingFood = false;
                    }
                }

                
                
                // Update facing angle
                this.creatureCollection.userData.facings[i] = facing;
                this.creatureCollection.userData.creatureInfo[i] = creatureInfo;

                const debugElement = document.getElementById('debugInfo') as HTMLElement;
                debugElement.innerHTML = `
                x: ${position.x.toFixed(2)}, z: ${position.z.toFixed(2)}, y: ${position.y.toFixed(2)}
                <br>dx: ${dx.x.toFixed(2)}, dz: ${dz.z.toFixed(2)}
                <br>angle: ${facing.toFixed(2) * 180/Math.PI}
                <br>food left: ${this.foodPositions.length}
                `;

                // set debug sphere position to radius of 1 in front of creature's facing direction
                const debugRadius = 0.5;
                const debugPosition = new THREE.Vector3(
                    position.x + Math.cos(facing) * debugRadius,
                    0.6,
                    position.z + Math.sin(facing) * debugRadius
                );
                if (creatureInfo.isTargetingFood) {
                    this.debugSphere.material.color.set('green');
                }
                this.debugSphere.position.copy(debugPosition);
                
                // set debug ring to creature's position, with radius of view radius
                this.debugRing.position.copy(position);
                this.debugRing.position.y = 0.6;
                this.debugRing.rotation.x = -Math.PI / 2;
                this.debugRing.scale.set(creatureInfo.viewRadius, creatureInfo.viewRadius, 1);



                // Recompose the matrix
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