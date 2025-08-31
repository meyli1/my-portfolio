import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Get the existing canvas element
const canvas = document.getElementById('demo');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Initialize the renderer with your canvas element
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
// Don't append to body, it's already there
// document.body.appendChild(renderer.domElement); 

// ... (Rest of your existing setup code is fine) ...
camera.position.set(0, 5.8, 25);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const leftLight = new THREE.DirectionalLight(0xffffff, 1);
leftLight.position.set(10, 10, 10);
scene.add(leftLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const rightLight = new THREE.DirectionalLight(0xffffff, 1);
rightLight.position.set(-10, 10, 10);
scene.add(rightLight);

// **This sphere and static capsule are not used in your logic; I've commented them out to avoid confusion.**
// const sphereGeometry = new THREE.SphereGeometry(5, 32, 16);
// const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
// const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
// scene.add(sphere);

// const capsuleGeometry = new THREE.CapsuleGeometry(1, 1, 1);
// const capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
// const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
// scene.add(capsule);

// Star path for the non-static capsule's default movement
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

const starPath = new THREE.CatmullRomCurve3(starPoints, true);

// Non-static capsule, named unformedCapsule for clarity
const unformedCapsuleGeometry = new THREE.CapsuleGeometry(1, 1, 1);
const unformedCapsuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const unformedCapsule = new THREE.Mesh(unformedCapsuleGeometry, unformedCapsuleMaterial);
scene.add(unformedCapsule);

// Capsules in the pentagon formation
const formationCapsules = [];
// Select only the outer points
const outerStarPoints = [];
for (let i = 0; i < starPoints.length; i += 2) {
    outerStarPoints.push(starPoints[i]);
}

for (let i = 0; i < outerStarPoints.length; i++) {
    const capsuleGeometry = new THREE.CapsuleGeometry(0.5, 1);
    const capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
    capsule.position.copy(outerStarPoints[i]);
    capsule.userData.sectionId = `section-${i}`;
    scene.add(capsule);
    formationCapsules.push(capsule);
}

// Raycaster and mouse for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredCapsule = null;
let isHovering = false; // Add a flag to manage state

const onMouseMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
};
window.addEventListener('mousemove', onMouseMove, false);

function animate() {
    controls.update();

    // Perform the raycast inside the animation loop
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(formationCapsules, false);

    if (intersects.length > 0) {
        isHovering = true;
        const intersectedObject = intersects[0].object;

        if (hoveredCapsule !== intersectedObject) {
            // A new capsule is hovered, hide previous section and show current
            if (hoveredCapsule) {
                document.getElementById(hoveredCapsule.userData.sectionId).classList.add('d-none');
            }
            hoveredCapsule = intersectedObject;
            document.getElementById(hoveredCapsule.userData.sectionId).classList.remove('d-none');
        }

        // Move the unformed capsule towards the intersection point
        const targetPosition = intersects[0].point;
        unformedCapsule.position.lerp(targetPosition, 0.1);
    } else {
        isHovering = false;
        // No capsule is hovered, hide any visible sections
        if (hoveredCapsule) {
            document.getElementById(hoveredCapsule.userData.sectionId).classList.add('d-none');
            hoveredCapsule = null;
        }
    }

    // Only move along the star path if not hovering
    if (!isHovering) {
        const time = Date.now();
        const t = ((time / 2000) % 1);
        const position = starPath.getPointAt(t);
        if (position) {
            unformedCapsule.position.copy(position);
            const tangent = starPath.getTangentAt(t);
            if (tangent) {
                unformedCapsule.lookAt(position.clone().add(tangent));
            }
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