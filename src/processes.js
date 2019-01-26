const THREE = require('three');
require('./CSS3DRenderer.js'); //INCLUDE THIS FROM THREE.JS EXAMPLES
const demonImage = require('../sketch/demon.png');
const OrbitControls = require('three-orbit-controls')(THREE)
const get = require('lodash.get');
const set = require('lodash.set');
const Worker = require('./physics.worker.js');
// worker.addEventListener("message", function (event) {});
// worker.terminate();

const ID = 'canvas';

const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = camera.fov * Math.PI / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

function ParticlesInBox(variables, indexToElement) {
  const worker = new Worker();
  // Create canvas element and attach to dom
  var renderer = new THREE.WebGLRenderer();
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  const container = document.getElementById(ID);
  container.appendChild(renderer.domElement);
  const WIDTH = container.clientWidth;
  const HEIGHT = container.clientHeight;
  var camera = new THREE.PerspectiveCamera(variables.camera.fov, WIDTH / HEIGHT, variables.camera.near, variables.camera.far);
  const depth = variables.camera.initial.position.z;
  let boxWidth = visibleWidthAtZDepth(depth, camera);
  let boxHeight = visibleHeightAtZDepth(depth, camera);
  variables.box.boxWidth = boxWidth;
  variables.box.boxHeight = boxHeight;
  console.debug(`WIDTH/HEIGHT: ${WIDTH}/${HEIGHT}`);
  var scene = new THREE.Scene();
  // const material = new THREE.LineBasicMaterial({
  //   color: 0x0000ff
  // });
  // // Create the lines
  // for(let key of indexToElement.keys()) {
  //   const el = indexToElement.get(key);
  //   const elCss = new THREE.CSS3DObject( el );
  //   // this.renderer = new THREE.CSS3DRenderer();
  //   console.debug(`${key} ::: ${JSON.stringify(elCss.position)}`);
  //   const geometry = new THREE.Geometry();
  //   geometry.vertices.push(
  //     new THREE.Vector3( 0, 0, 0 ),
  //     new THREE.Vector3( elCss.x, elCss.y, elCss.z )
  //   );
  //   var line = new THREE.Line( geometry, material );
  //   scene.add( line );
  // }

  //////////////////////// RENDERER CSS3D...........
  const cssScene = new THREE.Scene();
  var cssCamera = new THREE.PerspectiveCamera(variables.camera.fov, WIDTH / HEIGHT, variables.camera.near, variables.camera.far);
  cssCamera.position.z = depth;
  var cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.setSize( window.innerWidth, window.innerHeight );
  cssRenderer.domElement.style.position = 'absolute';
  // cssRenderer.domElement.style.top = 1;
  // renderer.domElement.style.top = 0;
  var material = new THREE.MeshBasicMaterial({ wireframe: true });
  var geometry = new THREE.PlaneGeometry();
  var planeMesh= new THREE.Mesh( geometry, material );
  // add it to the WebGL scene
  cssScene.add(planeMesh);
  var element = document.createElement( 'img' );
  // document.body.appendChild(element);
  element.src = demonImage;
  var cssObject = new THREE.CSS3DSprite( element );
  // we reference the same position and rotation 
  cssObject.position.set(planeMesh.position.x,0,0);
  cssObject.rotation.set(new THREE.Vector3( planeMesh.rotation.x, planeMesh.rotation.y, planeMesh.rotation.z));
  // cssObject.rotation = planeMesh.rotation;
  // add it to the css scene
  cssScene.add(cssObject);
  document.body.appendChild( cssRenderer.domElement );
  cssRenderer.render( cssScene, cssCamera );


  //////////////////////////////////



  let light
  switch (variables.light.type) {
    case 'point':
      light = new THREE.PointLight(variables.light.color, variables.light.intensity);
      light.position.set(variables.light.position.x, variables.light.position.y, variables.light.position.z);
      break;
    case 'directional':
      light = new THREE.DirectionalLight(variables.light.color, variables.light.intensity);
      light.position.set(variables.light.position.x, variables.light.position.y, variables.light.position.z);
      break;
    case 'ambient':
      light = new THREE.AmbientLight(0x404040);
      break;
  }
  scene.add(light);
  console.debug(`Width/Height: ${boxWidth}/${boxHeight} at visible at depth ${depth}`);
  renderer.setSize(WIDTH, HEIGHT);
  camera.position.z = depth; // Cant move this up without particles moving to fill screen. Why?
  const controls = new OrbitControls(camera);
  controls.target.set(0, 0, 0)

  // Set properties and object variables. 
  variables.spheres.properties = new Map();
  const indexToObject = new Map();


  const setInitialProperties = () => {
    for (let key = 0; key < variables.spheres.number; key++) {
      if (!variables.spheres.properties.has(key)) {
        variables.spheres.properties.set(key, {});
      }
      const property = variables.spheres.properties.get(key);
      set(property, 'velocity.x', getRandom() * variables.spheres.maxSpeed);
      set(property, 'velocity.y', getRandom() * variables.spheres.maxSpeed);
      set(property, 'velocity.z', getRandom() * variables.spheres.maxSpeed);
      set(property, 'position.x', getRandom() * variables.box.widthFactor * boxWidth);
      set(property, 'position.y', getRandom() * variables.box.heightFactor * boxHeight);
      set(property, 'position.z', getRandom() * variables.box.depth);
      variables.spheres.properties.set(key, property);
    }
  }

  const getSafe = (key, prop) => {
    return get(variables.spheres.properties.get(key), prop, get(variables.spheres.initial, prop));
  }

  const setObjects = () => {
    for (let i = 0; i < variables.spheres.number; i++) {
      const colors = variables.spheres.colors;
      var color = colors[Math.floor(Math.random() * colors.length)];
      let material;
      // const material = new THREE.MeshBasicMaterial({
      //   color: color
      // });
      switch (variables.spheres.material.type) {
        case 'standard':
          material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: variables.spheres.material.metalness,
            roughness: variables.spheres.material.roughness
          });
          break;
        case 'normal':
          material = new THREE.MeshNormalMaterial();
          break;
        case 'phong':
          material = new THREE.MeshPhongMaterial();
          break;
        case 'basic':
          material = new new THREE.MeshBasicMaterial({
            color
          });
          break;
      }
      const sphereGeometry = new THREE.SphereGeometry(
        variables.spheres.initial.radius,
        variables.spheres.initial.widthSegments,
        variables.spheres.initial.heightSegments,
        variables.spheres.initial.phiStart,
        variables.spheres.initial.phiLength,
        variables.spheres.initial.thetaStart,
        variables.spheres.initial.thetaLength
      );
      const sphereMesh = new THREE.Mesh(sphereGeometry, material)
      scene.add(sphereMesh);
      indexToObject.set(i, sphereMesh);
      indexToObject.get(i).position.set(getSafe(i, 'position.x'), getSafe(i, 'position.y'), getSafe(i, 'position.z'));
    }
  }

  const getRandom = () => {
    return -(Math.random() - 0.5);
  }
  setInitialProperties();
  setObjects();
  worker.postMessage({
    type: 'initial',
    variables
  });
  const update = () => {
    return new Promise((resolve, reject) => {
      worker.postMessage({}); // Post a message with the current variables
      worker.onmessage = function (event) {
        variables = event.data.variables; // Must set new value for next loop
        for (let key of variables.spheres.properties.keys()) { // Now set value in three js.
          if (indexToObject.has(key)) {
            const property = variables.spheres.properties.get(key);
            const mesh = indexToObject.get(key);
            // if(key === 0) {
            // console.debug(`${key} ${property.position.x} ${property.position.y} ${property.position.z}`)
            // }
            mesh.position.set(property.position.x, property.position.y, property.position.z);
            // mesh.position.set(2,2,2);        
          }
        }
      };
      resolve();
    })
  }
  // What ever we need to refresh do it here for these objects
  // window.addEventListener('resize', onWindowResize, false);

  // function onWindowResize() {
  //   boxWidth = visibleWidthAtZDepth(depth, camera);
  //   boxHeight = visibleHeightAtZDepth(depth, camera);
  //   setInitialProperties();
  //   camera.aspect = window.innerWidth / window.innerHeight;
  //   camera.updateProjectionMatrix();
  //   renderer.setSize(window.innerWidth, window.innerHeight);
  // }
  return {
    update,
    scene,
    camera,
    renderer
  }
}

export {
  ParticlesInBox
}