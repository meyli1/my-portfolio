import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const canvas = document.getElementById('demo');
const overlay = document.getElementById('overlay');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
const initialCameraPosition = new THREE.Vector3(0, 5.8, 25);
camera.position.copy(initialCameraPosition);

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

// Non-static capsule
const unformedCapsuleGeometry = new THREE.CapsuleGeometry(1, 1, 1);
const unformedCapsuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const unformedCapsule = new THREE.Mesh(unformedCapsuleGeometry, unformedCapsuleMaterial);
scene.add(unformedCapsule);

// Capsules in the pentagon formation
const formationCapsules = [];
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
let wasHovering = false;
let isAnimatingCamera = false;

const onMouseMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
};
window.addEventListener('mousemove', onMouseMove, false);

const onClick = (event) => {
    const intersects = raycaster.intersectObjects(formationCapsules, false);
    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const sectionId = intersectedObject.userData.sectionId;

        // Show the modal
        const contentToInject = document.getElementById(sectionId).innerHTML;
        modalContent.innerHTML = contentToInject;
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';

        // Start camera animation
        isAnimatingCamera = true;
        const targetPosition = new THREE.Vector3().copy(intersectedObject.position).add(new THREE.Vector3(5, 5, 5));
        
        const camAnimation = (t) => {
             if (!isAnimatingCamera) return;
             camera.position.lerp(targetPosition, 0.05);
             camera.lookAt(intersectedObject.position);
             if (camera.position.distanceTo(targetPosition) < 0.1) {
                isAnimatingCamera = false;
                // Disable OrbitControls to lock camera position
                controls.enabled = false;
             } else {
                requestAnimationFrame(camAnimation);
             }
        };
        requestAnimationFrame(camAnimation);
    }
};
window.addEventListener('click', onClick, false);

// Close modal event listener
closeModalBtn.addEventListener('click', () => {
    overlay.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'auto';
    
    // Animate camera back to original position
    isAnimatingCamera = true;
    const camAnimationBack = (t) => {
        if (!isAnimatingCamera) return;
        camera.position.lerp(initialCameraPosition, 0.05);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(initialCameraPosition) < 0.1) {
           isAnimatingCamera = false;
           // Enable OrbitControls again
           controls.enabled = true;
        } else {
            requestAnimationFrame(camAnimationBack);
        }
    };
    requestAnimationFrame(camAnimationBack);
});

// Helper function to find the closest point on a curve
function findClosestPointOnCurve(curve, point, divisions = 100) {
    let closestPoint = null;
    let closestDistance = Infinity;
    let closestT = 0;
    
    for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const curvePoint = curve.getPointAt(t);
        const distance = curvePoint.distanceTo(point);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = curvePoint;
            closestT = t;
        }
    }
    return { point: closestPoint, t: closestT };
}

// Variables for animation timing
let animationTime = 0;
let lastFrameTime = performance.now();

function animate() {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    if (!isAnimatingCamera) {
        controls.update();

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(formationCapsules, false);
        
        if (intersects.length > 0) {
            wasHovering = true;
            unformedCapsule.position.lerp(intersects[0].point, 0.1);
        } else {
            if (wasHovering) {
                const { t } = findClosestPointOnCurve(starPath, unformedCapsule.position);
                animationTime = t * 2000;
            }
            wasHovering = false;
            
            animationTime += deltaTime;
            const t = (animationTime / 2000) % 1;

            const position = starPath.getPointAt(t);
            if (position) {
                unformedCapsule.position.copy(position);
                const tangent = starPath.getTangentAt(t);
                if (tangent) {
                    unformedCapsule.lookAt(position.clone().add(tangent));
                }
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
