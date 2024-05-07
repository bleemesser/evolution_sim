import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'

class SceneRenderer {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private controller: OrbitControls;
    private scene: THREE.Scene;
    private stats = new Stats();
    private readonly PI2 = Math.PI * 2;

    private get aspectRatio(): number {
        return this.canvas.width / this.canvas.height;
    }

    private onResize() {
        this.canvas.style.width = '80vw';
        this.canvas.style.height = '100%';
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    constructor(canvas: HTMLCanvasElement) {

        this.canvas = canvas;
        this.canvas.style.width = '80vw';
        this.canvas.style.height = '100%';
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;

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
        const geometry = new THREE.BoxGeometry(20, 0.2, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 'lightgrey',
        });
        const ground = new THREE.Mesh(geometry, groundMaterial);
        ground.receiveShadow = true;
        ground.position.y = -0.1;
        this.scene.add(ground);
    
        // add directional light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(40, 40, 40);
        light.castShadow = true;
        this.scene.add(light);
    
        // add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
    
        this.camera.position.z = 20;
        this.camera.position.y = 15;
    }
    

    // private update function that contains the animations
    private update(delta: number) {
        this.controller.update();
        this.stats.update();
    }

    // public render function to render the scene
    public render() {
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