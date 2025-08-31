import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// renderer.setClearColor(0xffffff);
camera.position.set(0, 5.8, 25);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const leftLight = new THREE.DirectionalLight(0xffffff, 1, 0);
leftLight.position.set(10, 10, 10);
scene.add(leftLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // White light with 60% intensity
ambientLight.position.set(10,10,10);
scene.add(ambientLight);

const rightLight = new THREE.DirectionalLight(0xffffff, 1);
rightLight.position.set(-10, 10, 10);
scene.add(rightLight);

// const leftlightHelper = new THREE.DirectionalLightHelper(leftLight);
// scene.add(leftlightHelper);
// const rightlightHelper = new THREE.DirectionalLightHelper(rightLight);
// scene.add(rightlightHelper);

// const size = 100;
// const divisions = 100;
// const gridHelper = new THREE.GridHelper(size, divisions);
// scene.add(gridHelper);

const sphereGeometry = new THREE.SphereGeometry(5, 32, 16);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphere);

const capsuleGeometry = new THREE.CapsuleGeometry(1, 1, 1);
const capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
scene.add(capsule);

const starPoints = [];
const numPoints = 10; 
const outerRadius = 10;
const innerRadius = 5;
const rotationAngle = Math.PI / 2; 

for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2; 
    const radius = i % 2 === 0 ? outerRadius : innerRadius; 
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const z = 0; 
    
  
    const rotatedX = x * Math.cos(rotationAngle) - y * Math.sin(rotationAngle);
    const rotatedY = x * Math.sin(rotationAngle) + y * Math.cos(rotationAngle);

    starPoints.push(new THREE.Vector3(rotatedX, rotatedY, z));
}


const path = new THREE.CatmullRomCurve3(starPoints, true);
const pathGeometry = new THREE.BufferGeometry().setFromPoints(path.getPoints(100));
const pathMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
const pathObject = new THREE.Line(pathGeometry, pathMaterial);
// scene.add(pathObject);

// Select only the outer points
const outerStarPoints = [];
for (let i = 0; i < starPoints.length; i += 2) {
    outerStarPoints.push(starPoints[i]);
}

// Place capsules at each outer point
const capsules = [];
for (let i = 0; i < outerStarPoints.length; i++) {
    const capsuleGeometry = new THREE.CapsuleGeometry(0.5, 1); // Adjust size as needed
    const capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
    capsule.position.copy(outerStarPoints[i]);
    capsule.userData.sectionId = `section-${i}`;
    scene.add(capsule);
    capsules.push(capsule);
}



// // Raycaster and mouse for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredCapsule = null;
    
const onMouseMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth)* 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1; 
    raycaster.setFromCamera(pointer,camera)
    const intersects = raycaster.intersectObjects(scene.children);
  
    if (intersects.length > 0) {
        console.log(intersects);
        const hoveredObject = intersects[0].object; // Get the first intersected capsule
        const sectionId = hoveredObject.userData.sectionId;
        
        if (hoveredCapsule != hoveredObject){
          // If a new capsule is hovered
          if (hoveredCapsule) {
            // Hide the previous section
            document.getElementById(hoveredCapsule.userData.sectionId).classList.add('d-none');
            
        }

        // Show the new section
        document.getElementById(sectionId).classList.remove('d-none');
        hoveredCapsule = hoveredObject; // Update the currently hovered capsule
    }  
    } else {
        if(hoveredCapsule){
            document.getElementById(hoveredCapsule.userData.sectionId).classList.add('d-none');
        }
        hoveredCapsule = null; // Reset the hovered capsule
    }
    
};

window.addEventListener('mousemove', onMouseMove, false);
  



function animate() {
    controls.update();
    
    const time = Date.now();
    const t = ((time / 2000) % 1); // t should be between 0 and 1
    const position = path.getPointAt(t);
    console.log(position);
    if (position) {
        capsule.position.copy(position);
        const tangent = path.getTangentAt(t);
        if (tangent) {
            capsule.lookAt(position.clone().add(tangent));
               
        }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});



animate();

// optimize the html,json,javascript where is what how to organize 
// make the restricted path following work