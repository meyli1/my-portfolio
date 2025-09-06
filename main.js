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

        // --- Work-in-progress pop-up logic ---
        const popup = document.getElementById('wip-popup');
        const closePopupButton = document.getElementById('close-popup');

        window.onload = () => {
            popup.style.opacity = '1';
            popup.style.pointerEvents = 'auto';
            init(); // Start the animation
        };

        closePopupButton.addEventListener('click', () => {
            popup.style.opacity = '0';
            popup.style.pointerEvents = 'none';
        });

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
                desc: 'Eco Fast Track is an innovative IoT tool designed to promote water conservation. It utilizes sensors to monitor water usage and employs AI to analyze data, offering personalized, real-time insights and recommendations for both property managers and tenants. By aggregating usage data and comparing it to global benchmarks, the platform encourages sustainability and accountability through a user-friendly interface.',
                img: '/my-portfolio/images/hackutd.png'
            },
            'Sam and Ellen Chang Scholarship': {
                desc: 'Recipient of the Sam and Ellen Chang Scholarship (2024), a merit-based award recognizing academic achievement.'
            },
            'Grace Hopper Celebration Attendee': {
                desc: 'Grace Hopper Celebration Scholarship (Virtual), 2024 Awarded a scholarship to attend the worlds largest gathering of women technologists.'
            },
            'NSF sponsored Reaserach Experience for Undergraduates': {
                desc: 'Awarded a highly competitive National Science Foundation Research Experience for Undergraduates (REU) position for 2024, providing a paid research opportunity in my field of study.'
            },
            'Management Leadership for Tomorrow Fellow': {
                desc: 'Selected as a Management Leadership for Tomorrow (MLT) Fellow, participating in two major conferences, including the MLT Tech Trek in San Francisco. This experience provided valuable opportunities to network with other fellows and attend workshops focused on career development and leadership.',
                img: '/my-portfolio/images/MLT.png'
            },
            'AWS Practitioners': {
                desc: 'Actively pursuing the AWS Certified Cloud Practitioner certification to demonstrate a foundational understanding of cloud computing and AWS services..'
            },
            'UTD Makeathon 2023': {
                desc: 'Developed a portable water filtration system on a team of five during a 2-day makeathon with a $100 budget. Engineered and built a custom impeller pump to serve as the core of the system.',
                img: '/my-portfolio/images/makeathon.jpg'
            },
            'FIRST Alumni/Volunteer': {
                desc: 'Actively involved in FIRST Robotics for over four years, participating in both FTC and FRC as a student. I continue to contribute to the FIRST community by mentoring my high schools robotics team and volunteering at various FRC, FTC, and FLL competitions. This has allowed me to help foster a passion for STEM in the next generation while developing my leadership and teamwork skills.',
                img: '/my-portfolio/images/robomentor.png'
            },
            'Griptape Challenger': {
                desc: ' as a Griptape Alumni, I completed a complex personal project by constructing a fully functional split mechanical keyboard. My responsibilities encompassed all aspects of the build: I designed the case using CAD, 3D printed the components, soldered all electronics, and programmed the firmware for the pro micro. I successfully produced three working units from my initial design.',
                img: '/my-portfolio/images/keeb.png'
            },
            'Bell': {
                desc: 'As a participant in the Bell Engineering Bootcamp, I collaborated on a team to develop a critical safety feature for a drone. We created a system that used the MQTT protocol to notify the pilot when the drones pitch and roll exceeded a set threshold. This communication between the drones Vehicle Management and peripheral control computers triggered the drones LED halo to change colors, providing the pilot with a real-time visual warning about its orientation.',
                img: '/my-portfolio/images/bellbootcamp.png'
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