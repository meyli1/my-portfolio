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

                // If the section is the word cloud, add the hover listeners
                if (sectionId === 'section-3') {
                    addAchievementHoverListeners();
                }

                // Start camera animation
                isAnimatingCamera = true;
                const targetPosition = new THREE.Vector3().copy(intersectedObject.position).add(new THREE.Vector3(5, 5, 5));
                
                const camAnimation = () => {
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
            const camAnimationBack = () => {
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

        const achievements = {
            'HACKUTD': {
                desc: 'Eco Fast Track is a tool that uses an IoT kit filled with multiple sensors used to monitor water temperature and flow, providing real-time insights into usage. It aggregates data over time, compares it to global benchmarks, and uses AI to offer personalized water-saving recommendations. Property managers can proactively address inefficiencies, while tenants receive automated email alerts if their usage exceeds the average. \n\n With an optional community-sharing feature and engaging, user-friendly visuals, the platform promotes accountability, sustainability, and collaboration. This project won first and third place in the most competitive HackUTD season with it being the largest hackathon in Texas.',
                img: '/images/hackutd.png'
            },
            'Scholarship': {
                desc: 'Received the Sam and Ellen Chang Scholarship and a scholarship to the Virtual Grace Hopper Celebration.',
                img: 'https://placehold.co/150x100/D8B4FE/000000?text=Scholarship'
            },
            'NSF REU': {
                desc: 'Recipient of the National Science Foundation Research Experience for Undergraduates.',
                img: 'https://placehold.co/150x100/FCA5A5/000000?text=NSF+REU'
            },
            'MLT Fellow': {
                desc: 'Selected as a fellow for the Management Leadership for Tomorrow program.',
                img: 'https://placehold.co/150x100/A7F3D0/000000?text=MLT+Fellow'
            },
            'AWS Cert': {
                desc: 'Currently working towards my AWS Certified Cloud Practitioner certification.',
                img: 'https://placehold.co/150x100/93C5FD/000000?text=AWS+Cert'
            },
            'Leadership': {
                desc: 'Led several group projects and served in leadership roles in student organizations.',
                img: 'https://placehold.co/150x100/FDBA74/000000?text=Leadership'
            },
            'Volunteering': {
                desc: 'Dedicated time to volunteering for causes related to technology education and community outreach.',
                img: 'https://placehold.co/150x100/A5F3FC/000000?text=Volunteer'
            },
            'Projects': {
                desc: 'Developed multiple personal projects to explore new technologies and build a portfolio.',
                img: 'https://placehold.co/150x100/E9D5FF/000000?text=Projects'
            },
            'Mentorship': {
                desc: 'Mentored junior students and peers in programming and career development.',
                img: 'https://placehold.co/150x100/C7D2FE/000000?text=Mentorship'
            }
        };

        function addAchievementHoverListeners() {
            const tooltip = document.getElementById('tooltip');
            const tooltipImg = document.getElementById('tooltip-img');
            const tooltipDesc = document.getElementById('tooltip-desc');
            
            document.querySelectorAll('[data-word]').forEach(item => {
                item.addEventListener('mouseenter', (e) => {
                    const word = e.target.dataset.word;
                    const data = achievements[word];
                    if (data) {
                        tooltipImg.src = data.img;
                        tooltipDesc.textContent = data.desc;
                        tooltip.classList.remove('opacity-0');
                        tooltip.classList.add('opacity-100');
                    }
                });

                item.addEventListener('mouseleave', () => {
                    tooltip.classList.remove('opacity-100');
                    tooltip.classList.add('opacity-0');
                });
            });
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