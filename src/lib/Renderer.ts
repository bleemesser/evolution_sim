import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controller: OrbitControls;
  private scene: THREE.Scene;
  private stats = new Stats();
  private floorSize = 15;
  private foodCount = 20;

  private creatureCollection: THREE.InstancedMesh | undefined;
  private wall: THREE.Mesh | undefined;

  private foodPositions: THREE.Vector3[] = new Array();
  private foodMeshes: THREE.Mesh[] = new Array();

  private debugSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 32, 32),
    new THREE.MeshStandardMaterial({ color: "yellow" })
  );
  private debugRing = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.05, 32),
    new THREE.MeshStandardMaterial({
      color: "blue",
      transparent: false,
      opacity: 0.5,
    })
  );

  private readonly PI2 = Math.PI * 2;

  private get aspectRatio(): number {
    return this.canvas.width / this.canvas.height;
  }

  private onResize() {
    this.canvas.style.width = "80vw";
    this.canvas.style.height = "100%";
    this.canvas.width = this.canvas.clientWidth / window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight / window.devicePixelRatio;

    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  constructor(canvas: HTMLCanvasElement) {
    // window.devicePixelRatio = 1; // set 1 on Mac/retina displays if performance is bad, otherwise leave it as is
    this.canvas = canvas;
    this.canvas.style.width = "80vw";
    this.canvas.style.height = "100%";
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
    window.addEventListener("resize", this.onResize.bind(this));
  }

  public reset() {
    if (this.creatureCollection) {
      this.scene.remove(this.creatureCollection);
    }
    this.scene.children = [];
  }

  // init function to create geometry and add it to the scene
  public init(floorSize = 15) {
    this.floorSize = floorSize;
    const geometry = new THREE.BoxGeometry(this.floorSize, 0.1, this.floorSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: "#90EE90",
    });
    const ground = new THREE.Mesh(geometry, groundMaterial);
    ground.receiveShadow = true;
    ground.position.y = -0.05;
    this.scene.add(ground);

    const wallGeometry = new THREE.BoxGeometry(
      this.floorSize,
      10,
      this.floorSize
    );
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "black",
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

    // DEBUG ONLY
    // this.scene.add(this.debugSphere);
    // this.scene.add(this.debugRing);

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
    this.foodCount = count;
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: "red",
    });

    for (let i = 0; i < count; i++) {
      const food = new THREE.Mesh(geometry, material);
      food.castShadow = true;
      food.receiveShadow = true;
      food.position.set(
        (Math.random() - 0.5) * this.floorSize,
        0.2,
        (Math.random() - 0.5) * this.floorSize
      );
      this.foodPositions.push(food.position.clone());
      this.foodMeshes.push(food);
      this.scene.add(food);
    }
  }

  public spawnCreatures(
    count: number,
    facings?: number[],
    positions?: THREE.Vector3[],
    creatureInfos?: any[]
  ): void {
    const loader = new GLTFLoader();

    // Use an instanced mesh to render multiple creatures with the same geometry and use fewer draw calls
    loader.load(
      "/src/assets/blob.gltf",
      (gltf) => {
        const creature = gltf.scene.children[0] as THREE.Mesh;
        const creatureMaterial = new THREE.MeshStandardMaterial({
          color: "deepskyblue",
        });

        const instancedCreature = new THREE.InstancedMesh(
          creature.geometry,
          creatureMaterial,
          count
        );
        instancedCreature.castShadow = true;
        instancedCreature.receiveShadow = true;
        instancedCreature.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instancedCreature.userData = {
          facings: new Array(count).fill(0),
          creatureInfo: new Array(count),
        };

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
          if (facings && positions && creatureInfos) {
            position.copy(positions[i]);
            scale.set(0.01, 0.01, 0.01);
            instancedCreature.userData.facings[i] = facings[i];
            instancedCreature.userData.creatureInfo[i] = creatureInfos[i];
          } else {
            position.set(
              (Math.random() - 0.5) * this.floorSize,
              -0.05,
              (Math.random() - 0.5) * this.floorSize
            );
            scale.set(0.01, 0.01, 0.01);
            instancedCreature.userData.facings[i] = Math.random() * this.PI2;
            let newSpeed = Math.random() * 0.1 + 0.01;
            let newViewRadius = Math.random() * 2 + 1;
            instancedCreature.userData.creatureInfo[i] = {
              speed: newSpeed,
              viewRadius: newViewRadius,
              isTargetingFood: false,
              willSurvive: false,
              willReproduce: false,
              requiredReproductionFood: Math.floor(
                10 * newSpeed + newViewRadius * 2
              ),
              eatenFood: 0,
              age: 0,
            };
          }

          matrix.compose(position, quaternion, scale);
          instancedCreature.setMatrixAt(i, matrix);
          instancedCreature.instanceMatrix.needsUpdate = true;
        }
        this.creatureCollection = instancedCreature;
        this.scene.add(this.creatureCollection);
      },
      undefined,
      (error) => {
        console.error(error);
      }
    );
  }

  // private update function that contains the animations
  private update(delta: number) {
    this.controller.update();
    this.stats.update();

    if (this.creatureCollection) {
      // Day end logic
      if (this.foodPositions.length === 0) {
        // once there is no food left, the day is over. save the positions and facings of the creatures that will survive
        // and spawn all surviving creatures again by deleting the old ones and creating new ones with the saved positions and facings
        const survivingCreatures = [];
        for (let i = 0; i < this.creatureCollection.count; i++) {
          let creatureInfo = this.creatureCollection.userData.creatureInfo[i];
          if (creatureInfo.willSurvive) {
            creatureInfo.age += 1;
            creatureInfo.willSurvive = false;
            let position = new THREE.Vector3();
            let quaternion = new THREE.Quaternion();
            let scale = new THREE.Vector3();
            let matrix = new THREE.Matrix4();
            this.creatureCollection.getMatrixAt(i, matrix);
            matrix.decompose(position, quaternion, scale);
            survivingCreatures.push({
              position,
              facing: this.creatureCollection.userData.facings[i],
              creatureInfo,
            });

            if (creatureInfo.willReproduce) {
              // create a new creature with a random position and facing, but similar stats
              let newPosition = new THREE.Vector3(
                (Math.random() - 0.5) * this.floorSize,
                -0.05,
                (Math.random() - 0.5) * this.floorSize
              );
              let newFacing = Math.random() * this.PI2;
              let newCreatureInfo = {
                speed: creatureInfo.speed + (Math.random() - 0.5) * 0.01,
                viewRadius:
                  creatureInfo.viewRadius + (Math.random() - 0.5) * 0.5,
                isTargetingFood: false,
                willSurvive: false,
                willReproduce: false,
                requiredReproductionFood: Math.floor(
                  10 * creatureInfo.speed + creatureInfo.viewRadius * 2
                ),
                eatenFood: 0,
                age: 0,
              };
              survivingCreatures.push({
                position: newPosition,
                facing: newFacing,
                creatureInfo: newCreatureInfo,
              });
            }
          }
        }

        // spawn new creatures
        this.scene.remove(this.creatureCollection);
        this.spawnCreatures(
          survivingCreatures.length,
          survivingCreatures.map(
            (creature: { facing: any }) => creature.facing
          ),
          survivingCreatures.map(
            (creature: { position: any }) => creature.position
          ),
          survivingCreatures.map(
            (creature: { creatureInfo: any }) => creature.creatureInfo
          )
        );

        // spawn food again
        this.spawnFood(this.foodCount);
      }

      // Standard creature movement logic
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
        const speed = creatureInfo.speed * 80 * delta;
        let dx = new THREE.Vector3(Math.cos(facing) * speed, 0, 0);
        let dz = new THREE.Vector3(0, 0, Math.sin(facing) * speed);
        let tempPosX = position.clone();
        let tempPosZ = position.clone();

        tempPosX.add(dx);
        tempPosZ.add(dz);
        if (
          tempPosX.x < -this.floorSize / 2 ||
          tempPosX.x > this.floorSize / 2
        ) {
          dx.x = -dx.x;
          facing = Math.PI - facing;
        } else if (
          tempPosZ.z < -this.floorSize / 2 ||
          tempPosZ.z > this.floorSize / 2
        ) {
          dz.z = -dz.z;
          facing = -facing;
        }
        position.add(dx);
        position.add(dz);

        // add some randomnes to the creature's movement
        if (Math.random() < 0.1 && !creatureInfo.isTargetingFood) {
          facing += (Math.PI / 4) * (Math.random() - 0.5);
        }

        // Target food and eat it
        // use filter to find food in view radius
        const foodInView = this.foodPositions.filter((foodPosition) => {
          return position.distanceTo(foodPosition) < creatureInfo.viewRadius;
        });

        // if there is food in view, target the closest one
        if (foodInView.length > 0) {
          const closestFood = foodInView.reduce((prev, curr) => {
            return position.distanceTo(curr) < position.distanceTo(prev)
              ? curr
              : prev;
          });
          creatureInfo.isTargetingFood = true;
          facing = Math.atan2(
            closestFood.z - position.z,
            closestFood.x - position.x
          );

          if (position.distanceTo(closestFood) <= 0.5) {
            let index = this.foodPositions.findIndex(
              (foodPosition) => foodPosition === closestFood
            );

            let foodMesh = this.foodMeshes[index];
            if (foodMesh) {
              this.scene.remove(foodMesh);
              this.foodMeshes.splice(index, 1); // Remove the food mesh from the array
            }

            // remove the food from the foodPositions array
            this.foodPositions.splice(index, 1);
            creatureInfo.isTargetingFood = false;
            creatureInfo.willSurvive = true;
            creatureInfo.eatenFood += 1;
            if (
              creatureInfo.eatenFood >= creatureInfo.requiredReproductionFood
            ) {
              creatureInfo.willReproduce = true;
            }
          }
        } else {
          creatureInfo.isTargetingFood = false;
        }

        // Update facing angle
        this.creatureCollection.userData.facings[i] = facing;
        this.creatureCollection.userData.creatureInfo[i] = creatureInfo;

        const debugElement = document.getElementById(
          "debugInfo"
        ) as HTMLElement;
        debugElement.innerHTML = `
                food left: ${this.foodPositions.length}
                <br>creatures surviving: ${
                  this.creatureCollection.userData.creatureInfo.filter(
                    (info: { willSurvive: any }) => info.willSurvive
                  ).length
                } / ${this.creatureCollection.count}
                <br>creatures reproducing: ${
                  this.creatureCollection.userData.creatureInfo.filter(
                    (info: { willReproduce: any }) => info.willReproduce
                  ).length
                }
                <br>average age: ${(
                  this.creatureCollection.userData.creatureInfo.reduce(
                    (prev: any, curr: { age: any }) => prev + curr.age,
                    0
                  ) / this.creatureCollection.count
                ).toFixed(2)}
                <br>average speed: ${(
                  this.creatureCollection.userData.creatureInfo.reduce(
                    (prev: any, curr: { speed: any }) => prev + curr.speed,
                    0
                  ) / this.creatureCollection.count
                ).toFixed(2)}
                <br>average view radius: ${(
                  this.creatureCollection.userData.creatureInfo.reduce(
                    (prev: any, curr: { viewRadius: any }) =>
                      prev + curr.viewRadius,
                    0
                  ) / this.creatureCollection.count
                ).toFixed(2)}
                <br>average required reproduction food: ${(
                  this.creatureCollection.userData.creatureInfo.reduce(
                    (prev: any, curr: { requiredReproductionFood: any }) =>
                      prev + curr.requiredReproductionFood,
                    0
                  ) / this.creatureCollection.count
                ).toFixed(2)}
                `;

        // set debug sphere position to radius of 1 in front of creature's facing direction
        const debugRadius = 0.5;
        const debugPosition = new THREE.Vector3(
          position.x + Math.cos(facing) * debugRadius,
          0.6,
          position.z + Math.sin(facing) * debugRadius
        );
        if (creatureInfo.isTargetingFood) {
          this.debugSphere.material.color.set("green");
        } else {
          this.debugSphere.material.color.set("yellow");
        }
        this.debugSphere.position.copy(debugPosition);

        // set debug ring to creature's position, with radius of view radius
        this.debugRing.position.copy(position);
        this.debugRing.position.y = 0.6;
        this.debugRing.rotation.x = -Math.PI / 2;
        this.debugRing.scale.set(
          creatureInfo.viewRadius,
          creatureInfo.viewRadius,
          1
        );

        // Recompose the matrix
        matrix.compose(position, quaternion, scale);
        this.creatureCollection.setMatrixAt(i, matrix);
      }

      this.creatureCollection.instanceMatrix.needsUpdate = true;
    }
  }

  // public render function to render the scene
  public render() {
    console.log(this.scene.children);

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
    };
    tick();
  }
}

export default SceneRenderer;
