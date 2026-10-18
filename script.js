/* =========================================================
   ARAN TECHNOCRAFTS - INDUSTRIAL MOTION & LOGIC SYSTEM
   ========================================================= */

(function () {
    "use strict";

    let isAppInitialized = false;

    function debounce(func, wait) {
        let timeout;

        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (isAppInitialized) return;
        isAppInitialized = true;
        document.documentElement.classList.add("js-enhanced");

        // DOM helpers
        function $(selector, context) {
            return (context || document).querySelector(selector);
        }

        function $$(selector, context) {
            return Array.from(
                (context || document).querySelectorAll(selector)
            );
        }

        const dialogReturnTargets = new WeakMap();
        let activeDialogElement = null;

        function showAccessibleDialog(dialog, returnTarget) {
            if (!dialog) return;
            dialogReturnTargets.set(dialog, returnTarget || document.activeElement);
            activeDialogElement = dialog;
            dialog.setAttribute("aria-hidden", "false");
            document.body.classList.add("no-scroll");

            const preferred = dialog.querySelector(
                "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
            );
            const focusTarget = preferred || dialog;
            window.requestAnimationFrame(() => {
                if (dialog.getAttribute("aria-hidden") !== "true") {
                    try { focusTarget.focus({ preventScroll: true }); }
                    catch (_) { focusTarget.focus(); }
                }
            });
        }

        function hideAccessibleDialog(dialog) {
            if (!dialog) return;
            dialog.setAttribute("aria-hidden", "true");
            if (activeDialogElement === dialog) activeDialogElement = null;

            const otherDialogOpen = [$("#projectModal"), $("#successModal")].some((item) =>
                item && item !== dialog && item.getAttribute("aria-hidden") !== "true"
            );
            if (!otherDialogOpen) document.body.classList.remove("no-scroll");

            const returnTarget = dialogReturnTargets.get(dialog);
            dialogReturnTargets.delete(dialog);
            if (returnTarget && returnTarget.isConnected && typeof returnTarget.focus === "function") {
                try { returnTarget.focus({ preventScroll: true }); }
                catch (_) { returnTarget.focus(); }
            }
        }

        function getVisibleDialog() {
            const project = $("#projectModal");
            if (project && project.classList.contains("active") && project.getAttribute("aria-hidden") !== "true") return project;
            const success = $("#successModal");
            if (success && success.classList.contains("show") && success.getAttribute("aria-hidden") !== "true") return success;
            return null;
        }

        function getDialogFocusable(dialog) {
            return Array.from(dialog.querySelectorAll(
                "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [contenteditable='true'], [tabindex]:not([tabindex='-1']), video[controls], audio[controls]"
            )).filter((element) => {
                return !element.hidden && element.getAttribute("aria-hidden") !== "true" &&
                    element.getClientRects().length > 0;
            });
        }

        document.addEventListener("keydown", (event) => {
            const dialog = getVisibleDialog();
            if (!dialog) return;

            if (event.key === "Escape") {
                event.preventDefault();
                if (dialog.id === "projectModal") window.closeProjectModal();
                else if (typeof closeSuccessModal === "function") closeSuccessModal();
                return;
            }

            if (event.key !== "Tab") return;
            const focusable = getDialogFocusable(dialog);
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        });

        // Current year
        const yearSpan = $("#currentYear");

        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }

        function matchesMedia(query) {
            return typeof window.matchMedia === "function"
                ? window.matchMedia(query).matches
                : false;
        }

        const motionPreference = document.documentElement.dataset.motion;
        const prefersReducedMotion =
            motionPreference === "off" ||
            (motionPreference !== "on" &&
                matchesMedia("(prefers-reduced-motion: reduce)"));
        const isLowPowerDevice =
            window.innerWidth <= 1024 ||
            matchesMedia("(pointer: coarse)");
        let processSequenceTween = null;
        let processSequenceObserver = null;
        const storySections = $$(".section-kicker")
            .map((kicker) => kicker.closest(".section"))
            .filter((section) => section && section.id);
        const storyChapterLinks = new Map();
        const storyChapterNav = document.createElement("nav");
        storyChapterNav.className = "story-chapters";
        storyChapterNav.setAttribute("aria-label", "Story chapters");
        const storyChapterList = document.createElement("ol");

        storySections.forEach((section) => {
            const kickerSpans = $$(".section-kicker span", section);
            const number = kickerSpans[0].textContent.trim();
            const title = kickerSpans[1].textContent.trim();
            const link = document.createElement("a");
            const item = document.createElement("li");

            link.className = "story-chapter-link";
            link.href = `#${section.id}`;
            link.textContent = number;
            link.setAttribute("aria-label", `${number} ${title}`);
            link.title = title;
            item.appendChild(link);
            storyChapterList.appendChild(item);
            storyChapterLinks.set(section.id, link);
        });

        storyChapterNav.appendChild(storyChapterList);
        document.body.appendChild(storyChapterNav);
        let currentStorySection = null;
        let sectionRegistryObserver = null;
        let registryViewportHeight = 0;

        function updateStorySectionRegistry() {
            const marker = window.innerHeight / 2;
            const currentSection = storySections.find((section) => {
                const bounds = section.getBoundingClientRect();
                return bounds.top <= marker && bounds.bottom > marker;
            });

            currentStorySection = currentSection ? currentSection.id : null;
            storyChapterLinks.forEach((link, sectionId) => {
                if (sectionId === currentStorySection) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
            if (currentStorySection) {
                document.documentElement.dataset.storyChapter =
                    currentStorySection;
                document.documentElement.dataset.storyTone =
                    currentSection.classList.contains("dark-surface") ||
                    currentSection.classList.contains("value-section")
                        ? "dark"
                        : "paper";
            } else {
                delete document.documentElement.dataset.storyChapter;
                delete document.documentElement.dataset.storyTone;
            }
        }

        function setupStorySectionRegistry() {
            if (!("IntersectionObserver" in window)) return false;
            if (sectionRegistryObserver) {
                sectionRegistryObserver.disconnect();
            }

            const topInset = Math.floor(window.innerHeight / 2);
            const bottomInset = Math.max(
                0,
                window.innerHeight - topInset - 1
            );
            sectionRegistryObserver = new IntersectionObserver(
                updateStorySectionRegistry,
                {
                    rootMargin:
                        `-${topInset}px 0px -${bottomInset}px 0px`,
                    threshold: 0
                }
            );
            storySections.forEach((section) =>
                sectionRegistryObserver.observe(section)
            );
            registryViewportHeight = window.innerHeight;
            updateStorySectionRegistry();
            return true;
        }

        if (!setupStorySectionRegistry()) {
            updateStorySectionRegistry();
        }

        const storyLayer = document.createElement("div");
        storyLayer.className = "story-layer";
        storyLayer.setAttribute("aria-hidden", "true");

        const storySvg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        storySvg.setAttribute("viewBox", "0 0 1000 1000");
        storySvg.setAttribute("preserveAspectRatio", "none");
        storySvg.setAttribute("focusable", "false");
        storySvg.innerHTML = `
            <path class="story-scroll-trace" pathLength="1" d="M80 535H920"></path>
            <g class="story-motif story-motif--baseline">
                <path d="M80 535H920"></path>
                <path class="story-fine-detail" d="M150 520v30M250 525v20M350 520v30M450 525v20M550 520v30M650 525v20M750 520v30M850 525v20"></path>
            </g>
            <g class="story-motif story-motif--grid">
                <path class="story-grid-base" d="M150 360H850M150 535H850M150 710H850M150 360V710M500 360V710M850 360V710"></path>
                <path class="story-grid-detail story-fine-detail" d="M325 360V710M675 360V710M150 447H850M150 622H850"></path>
            </g>
            <g class="story-motif story-motif--process">
                <path class="story-process-path" pathLength="1" d="M100 625H900"></path>
                <circle class="story-process-node" cx="100" cy="625" r="7"></circle>
                <circle class="story-process-node" cx="367" cy="625" r="7"></circle>
                <circle class="story-process-node" cx="633" cy="625" r="7"></circle>
                <circle class="story-process-node" cx="900" cy="625" r="7"></circle>
            </g>
            <g class="story-motif story-motif--modules">
                <path d="M160 390H410V640H160ZM460 390H710V640H460ZM760 390H840V640H760Z"></path>
                <path class="story-fine-detail" d="M285 390V640M585 390V640M160 515H410M460 515H710M760 515H840"></path>
            </g>
            <g class="story-motif story-motif--loop">
                <path d="M270 525C270 390 390 330 500 330S730 390 730 525 610 720 500 720 270 660 270 525Z"></path>
                <path class="story-fine-detail" d="M500 330V285M730 525H775M500 720V765M270 525H225"></path>
            </g>
        `;
        storyLayer.appendChild(storySvg);
        document.body.prepend(storyLayer);

        // GSAP animations
        if (
            typeof gsap !== "undefined" &&
            typeof ScrollTrigger !== "undefined"
        ) {
            gsap.registerPlugin(ScrollTrigger);
            if (!prefersReducedMotion) {
                document.documentElement.classList.add("motion-ready");
            }

            gsap.context(() => {
                initMotionSystem();
            });
        } else {
            initProcessObserver();
        }

        function setupProcessSequence() {
            if (processSequenceTween) {
                if (processSequenceTween.scrollTrigger) {
                    processSequenceTween.scrollTrigger.kill();
                }
                processSequenceTween.kill();
                processSequenceTween = null;
            }

            if (processSequenceObserver) {
                processSequenceObserver.disconnect();
                processSequenceObserver = null;
            }

            const progressLine = $("#processProgress");
            const isMobileView = matchesMedia("(max-width: 768px)");

            if (
                progressLine &&
                !isMobileView &&
                !prefersReducedMotion &&
                typeof gsap !== "undefined" &&
                typeof ScrollTrigger !== "undefined"
            ) {
                processSequenceTween = gsap.to(progressLine, {
                    scaleY: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".process-timeline-container",
                        start: "top 70%",
                        end: "bottom 60%",
                        scrub: true,
                        onUpdate: (self) => updateProcessNodes(self.progress)
                    }
                });
            } else {
                processSequenceObserver = initProcessObserver();
            }
        }

        function initMotionSystem() {
            setupProcessSequence();

            if (prefersReducedMotion) return;

            $$(".section-title").forEach((el) => {
                gsap.from(el, {
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%",
                        toggleActions: "play none none none"
                    },
                    y: 20,
                    opacity: 0,
                    duration: 0.8,
                    ease: "power3.out"
                });
            });

            const heroHeadline = $(".hero h1");
            if (heroHeadline) {
                gsap.from(heroHeadline, {
                    scrollTrigger: {
                        trigger: heroHeadline,
                        start: "top 82%",
                        toggleActions: "play none none none"
                    },
                    y: 24,
                    opacity: 0,
                    duration: 0.85,
                    ease: "power3.out"
                });
            }

            const aboutContent = $(".about-content");
            const aboutParagraphs = $$(".about-content > p");
            if (aboutContent && aboutParagraphs.length > 0) {
                gsap.from(aboutParagraphs, {
                    scrollTrigger: {
                        trigger: aboutContent,
                        start: "top 78%",
                        toggleActions: "play none none none"
                    },
                    y: 18,
                    opacity: 0,
                    stagger: 0.12,
                    duration: 0.65,
                    ease: "power2.out"
                });
            }

            const aboutStats = $$(".about-stats .stat-row");
            if (aboutStats.length > 0) {
                gsap.from(aboutStats, {
                    scrollTrigger: {
                        trigger: ".about-stats",
                        start: "top 82%",
                        toggleActions: "play none none none"
                    },
                    x: 18,
                    opacity: 0,
                    stagger: 0.1,
                    duration: 0.65,
                    ease: "power2.out"
                });
            }

            const grids = [
                ".core-grid",
                ".value-grid",
                ".technology-statements"
            ];

            grids.forEach((selector) => {
                const container = $(selector);

                if (!container) return;

                gsap.from(container.children, {
                    scrollTrigger: {
                        trigger: container,
                        start: "top 85%"
                    },
                    y: 30,
                    opacity: 0,
                    stagger: 0.1,
                    duration: 0.8,
                    ease: "power2.out"
                });
            });

            const formCard = $(".contact-form-container");

            if (formCard) {
                gsap.from(formCard, {
                    scrollTrigger: {
                        trigger: $(".contact-layout") || formCard,
                        start: "top 80%"
                    },
                    x: 30,
                    opacity: 0,
                    duration: 0.8,
                    ease: "power3.out"
                });
            }
        }

        function updateProcessNodes(progress) {
            const nodes = $$(".process-node");
            if (nodes.length === 0) return;

            const value = Math.max(0, Math.min(1, progress));
            const activeIndex = Math.min(
                nodes.length - 1,
                Math.floor(value * nodes.length)
            );
            const activeNode = nodes[activeIndex];
            const title = $("#processStepTitle");
            const description = $("#processStepDescription");
            const stepNumber = $("#processStepNumber");
            const progressLine = $("#processProgress");
            const progressValue = nodes.length > 1
                ? activeIndex / (nodes.length - 1)
                : 1;

            nodes.forEach((node, index) => {
                node.classList.toggle("active", index === activeIndex);
                node.classList.toggle("is-complete", index < activeIndex);
                if (index === activeIndex) node.setAttribute("aria-current", "step");
                else node.removeAttribute("aria-current");
            });

            if (activeNode) {
                const nodeTitle = activeNode.querySelector("strong");
                const nodeDescription = activeNode.querySelector("small");
                if (title && nodeTitle) title.textContent = nodeTitle.textContent;
                if (description && nodeDescription) {
                    description.textContent = nodeDescription.textContent;
                }
                if (stepNumber) {
                    stepNumber.innerHTML =
                        `${String(activeIndex + 1).padStart(2, "0")} <span>/ ${String(nodes.length).padStart(2, "0")}</span>`;
                }
            }

            if (progressLine) {
                progressLine.style.transform = `scaleY(${progressValue})`;
            }
            const storyProcessPath = $(".story-process-path");
            if (storyProcessPath) {
                storyProcessPath.style.strokeDashoffset = String(1 - value);
            }
            $$(".story-process-node").forEach((node, index) => {
                node.style.opacity = index <= activeIndex ? "1" : "0.18";
                node.classList.toggle("is-active", index === activeIndex);
            });
            const storyRule = $(".process-story-rule");
            if (storyRule) {
                storyRule.style.setProperty("--process-progress", String(progressValue));
            }
        }

        function initProcessObserver() {
            const nodes = $$(".process-node");
            if (!nodes.length) {
                updateProcessNodes(0);
                return null;
            }

            const updateNearestNode = () => {
                const viewportCenter = window.innerHeight / 2;
                let nearestIndex = 0;
                let nearestDistance = Infinity;

                nodes.forEach((node, index) => {
                    const bounds = node.getBoundingClientRect();
                    const distance = Math.abs(
                        (bounds.top + bounds.bottom) / 2 - viewportCenter
                    );
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                    }
                });

                updateProcessNodes((nearestIndex + 0.5) / nodes.length);
            };

            if (!("IntersectionObserver" in window)) {
                updateNearestNode();
                return null;
            }

            const observer = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    updateNearestNode();
                }
            }, {
                rootMargin: "-38% 0px -38% 0px",
                threshold: [0, 0.35, 0.7, 1]
            });

            nodes.forEach((node) => observer.observe(node));
            updateNearestNode();
            return observer;
        }

        window.addEventListener("resize", debounce(() => {
            if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
                setupProcessSequence();
            }
        }, 180), { passive: true });

        // Opening sequence and navbar
        const navbar = $("#navbar");
        const opening = $("#opening");
        const openingStage = opening?.querySelector(".opening-stage");
        const openingBlueprint = opening?.querySelector(".opening-blueprint");
        const bpCoords = openingBlueprint
            ? Array.from(openingBlueprint.querySelectorAll(".bp-coord")).map((el) => ({
                el,
                x: parseFloat(el.dataset.x),
                y: parseFloat(el.dataset.y),
                dx: parseFloat(el.dataset.dx),
                dy: parseFloat(el.dataset.dy),
                last: ""
            }))
            : [];

        // Blueprint state: zoom the grid in, bring marks into focus, then dissolve.
        function layoutBlueprint(zoom, zoomMarks, opacity, blur, t) {
            if (!openingBlueprint) return;
            const bs = openingBlueprint.style;
            bs.setProperty("--bp-zoom", zoom.toFixed(4));
            bs.setProperty("--bp-zoom-marks", zoomMarks.toFixed(4));
            bs.setProperty("--bp-opacity", opacity.toFixed(3));
            // Only use a filter while visibly out of focus (cheaper once sharp)
            bs.setProperty("--bp-filter", blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none");
            bs.setProperty("--bp-blur", `${blur.toFixed(2)}px`);
            if (opacity <= 0.01) return; // nothing visible, skip label work
            for (const c of bpCoords) {
                const text = `X:${(c.x + c.dx * t).toFixed(2)} Y:${(c.y + c.dy * t).toFixed(2)}`;
                if (text !== c.last) {
                    c.el.textContent = text;
                    c.last = text;
                }
            }
        }

        layoutBlueprint(1, 1, 1, 3, 0);
        const slideDownBtn = $("#slideDownBtn");
        const openingConfig = Object.freeze({
            questionIn: [0, 0.10],
            questionDrop: [0.30, 0.44],
            copyOut: [0.56, 0.74],
            arrowFadeOut: [0.83, 0.88],
            brandIn: [0.58, 0.86],
            blueprintZoom: [0, 0.90],
            blueprintFocus: [0, 0.40],
            blueprintDissolve: [0.60, 0.90],
            surface: [0.62, 0.88],
            navbarReveal: 0.88,
            arrowTarget: 0.90,
            answerRisePx: 16,
            blueprintZoomMax: 2.35,
            blueprintMarksZoomMax: 1.7,
            blueprintBlurPx: 3
        });
        const mobileNavMedia = typeof window.matchMedia === "function"
            ? window.matchMedia("(max-width: 1024px)")
            : { matches: false };
        const visualViewport = window.visualViewport || null;

        function syncMobileNavbarViewport() {
            if (!navbar) return;

            if (!mobileNavMedia.matches || !visualViewport) {
                navbar.style.removeProperty("--mobile-visual-viewport-top");
                return;
            }

            const offsetTop = Math.max(0, visualViewport.offsetTop || 0);
            navbar.style.setProperty(
                "--mobile-visual-viewport-top",
                `${offsetTop}px`
            );
        }

        syncMobileNavbarViewport();
        window.addEventListener("resize", debounce(syncMobileNavbarViewport, 150), {
            passive: true
        });

        if (visualViewport) {
            visualViewport.addEventListener(
                "resize",
                syncMobileNavbarViewport,
                { passive: true }
            );
            visualViewport.addEventListener(
                "scroll",
                syncMobileNavbarViewport,
                { passive: true }
            );
        }

        if (typeof mobileNavMedia.addEventListener === "function") {
            mobileNavMedia.addEventListener(
                "change",
                syncMobileNavbarViewport
            );
        } else if (typeof mobileNavMedia.addListener === "function") {
            mobileNavMedia.addListener(syncMobileNavbarViewport);
        }

        if (slideDownBtn) {
            slideDownBtn.addEventListener("click", () => {
                if (opening) {
                    const revealPoint = opening.offsetTop + Math.max(
                        0,
                        opening.offsetHeight - window.innerHeight
                    ) * openingConfig.arrowTarget;
                    window.scrollTo({
                        top: revealPoint,
                        behavior: prefersReducedMotion
                            ? "auto"
                            : "smooth"
                    });
                }
            });
        }

        let scrollTicking = false;
        function updateOpening(scrollY) {
            if (!opening || !openingStage) return 1;
            if (prefersReducedMotion) return 1;

            const config = openingConfig;
            const clamp01 = (value) => Math.max(0, Math.min(1, value));
            const openingScrollRange = Math.max(
                1,
                opening.offsetHeight - window.innerHeight
            );
            const progress = clamp01(
                (scrollY - opening.offsetTop) / openingScrollRange
            );
            const seg = ([start, end]) =>
                clamp01((progress - start) / (end - start));
            const easeOut = (t) => 1 - Math.pow(1 - t, 3);
            const easeInOut = (t) => (
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            );
            const questionReveal = 0.18 + 0.82 * easeOut(seg(config.questionIn));
            const questionDrop = 1 - 0.65 * easeOut(seg(config.questionDrop));
            const copyFade = 1 - easeInOut(seg(config.copyOut));
            const question = questionReveal * questionDrop * copyFade;
            const answerIn = easeOut(seg(config.questionDrop));
            const answerOut = 1 - easeInOut(seg(config.copyOut));
            const answer = answerIn * answerOut;
            const answerRise = config.answerRisePx * (1 - answerIn);
            const arrow = 1 - seg(config.arrowFadeOut);
            const brand = easeOut(seg(config.brandIn));
            const scale = 0.4 + 0.6 * brand;
            const surface = easeInOut(seg(config.surface));
            const bpZoom = 1 +
                (config.blueprintZoomMax - 1) *
                easeInOut(seg(config.blueprintZoom));
            const bpZoomMarks = 1 +
                (config.blueprintMarksZoomMax - 1) *
                easeInOut(seg(config.blueprintFocus));
            const bpBlur = config.blueprintBlurPx *
                (1 - easeOut(seg(config.blueprintFocus)));
            const bpOpacity = 1 -
                easeInOut(seg(config.blueprintDissolve));

            const style = openingStage.style;
            style.setProperty("--o-t", surface.toFixed(3));
            style.setProperty("--o-question", question.toFixed(3));
            style.setProperty("--o-answer", answer.toFixed(3));
            style.setProperty("--o-answer-rise", `${answerRise.toFixed(2)}px`);
            layoutBlueprint(bpZoom, bpZoomMarks, bpOpacity, bpBlur, progress);
            style.setProperty("--o-brand", brand.toFixed(3));
            style.setProperty("--o-scale", scale.toFixed(3));
            style.setProperty("--o-arrow", arrow.toFixed(3));
            style.setProperty("--o-arrow-shift", `${(12 * (1 - arrow)).toFixed(2)}px`);
            style.setProperty("--o-arrow-scale", (0.82 + 0.18 * arrow).toFixed(3));

            if (slideDownBtn) {
                const arrowVisible = arrow > 0.01;
                slideDownBtn.classList.toggle("is-visible", arrowVisible);

                if (arrowVisible) {
                    slideDownBtn.removeAttribute("aria-hidden");
                    slideDownBtn.setAttribute("tabindex", "0");
                } else {
                    if (document.activeElement === slideDownBtn) {
                        slideDownBtn.blur();
                    }
                    slideDownBtn.setAttribute("aria-hidden", "true");
                    slideDownBtn.setAttribute("tabindex", "-1");
                }
            }

            return progress;
        }

        function handleScroll() {
            const scrollY = window.scrollY;
            const openingProgress = updateOpening(scrollY);
            const scrollRange = Math.max(
                1,
                document.documentElement.scrollHeight - window.innerHeight
            );
            const storyProgress = Math.max(
                0,
                Math.min(1, scrollY / scrollRange)
            );
            document.documentElement.style.setProperty(
                "--story-progress",
                storyProgress.toFixed(4)
            );
            if (!sectionRegistryObserver) {
                updateStorySectionRegistry();
            } else if (registryViewportHeight !== window.innerHeight) {
                setupStorySectionRegistry();
            }

            if (navbar) {
                navbar.classList.toggle(
                    "opening-hidden",
                    openingProgress < openingConfig.navbarReveal
                );
            }

            if (navbar && opening) {
                navbar.classList.toggle(
                    "on-paper",
                    openingProgress >= openingConfig.navbarReveal &&
                        opening.getBoundingClientRect().bottom > 90
                );
            }

            const hero = $("#home");
            if (navbar && hero) {
                navbar.classList.toggle(
                    "transition-complete",
                    hero.getBoundingClientRect().bottom <= 120
                );
            }

            scrollTicking = false;
        }

        window.addEventListener("scroll", () => {
            if (!scrollTicking) {
                window.requestAnimationFrame(handleScroll);
                scrollTicking = true;
            }
        }, {
            passive: true
        });

        window.addEventListener("resize", debounce(() => {
            handleScroll();
        }, 150), { passive: true });

        const menuBtn = $("#menuButton");
        const navLinks = $("#navLinks");
        const motionToggle = $("#motionToggle");

        if (motionToggle) {
            const label = $(".motion-toggle-label", motionToggle);
            const motionOff = prefersReducedMotion;
            motionToggle.setAttribute("aria-pressed", String(motionOff));
            if (label) label.textContent = `Motion: ${motionOff ? "Off" : "On"}`;
            motionToggle.hidden = false;

            motionToggle.addEventListener("click", () => {
                const nextPreference =
                    motionToggle.getAttribute("aria-pressed") === "true"
                        ? "on"
                        : "off";

                try {
                    localStorage.setItem("aran-motion", nextPreference);
                } catch (error) {
                    console.error(
                        "Unable to save the motion preference.",
                        error
                    );
                    return;
                }

                window.location.reload();
            });
        }

        if (menuBtn && navLinks) {
            menuBtn.setAttribute("aria-expanded", "false");

            menuBtn.addEventListener("click", () => {
                const isOpen = navLinks.classList.toggle("open");

                menuBtn.classList.toggle("open", isOpen);
                menuBtn.setAttribute("aria-expanded", String(isOpen));
                if (isOpen) {
                    const firstLink = navLinks.querySelector("a[href]");
                    if (firstLink) firstLink.focus();
                }
            });

            const closeMobileMenu = (restoreFocus = false) => {
                navLinks.classList.remove("open");
                menuBtn.classList.remove("open");
                menuBtn.setAttribute("aria-expanded", "false");
                if (restoreFocus) menuBtn.focus();
            };

            $$("a", navLinks).forEach((link) => {
                link.addEventListener("click", () => closeMobileMenu(true));
            });
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && navLinks.classList.contains("open")) {
                    event.preventDefault();
                    closeMobileMenu(true);
                }
            });

            const navLogo = $(".nav-logo");
            if (navLogo) {
                navLogo.addEventListener("click", closeMobileMenu);
            }
        }

        document.body.classList.add("js-enhanced");
        handleScroll();

        const dynamicCapabilitiesData = [
            {
                title: "Pick & Place Robot",
                category: "robotics",
                description:
                    "High-speed articulated robotic integration for packaging.",
                mediaType: "video",
                videoSrc: "assets/videos/Media-optimized.mp4",
                posterSrc: "assets/images/gallery-pick-place.webp"
            },
            {
                title:"Automated Assembly Line",
                category: "assembly",
                description:
                    "Custom turnkey assembly line for automotive component manufacturing.",
                mediaType: "video",
                videoSrc: "assets/videos/Media1-optimized.mp4",
                posterSrc: "assets/images/gallery-assembly.webp"
            },
            {
                title: "3D Vision Inspection",
                category: "iiot",
                description:
                    "Defect detection using integrated 3D laser profiling.",
                mediaType: "video",
                videoSrc: "assets/videos/Media9-optimized.mp4",
                posterSrc: "assets/images/gallery-vision.webp"
            },
            {
                title: "Control Enclosures",
                category: "assembly",
                description:
                    "Custom industrial control panel configurations.",
                mediaType: "image",
                imageSrc: "assets/images/Img2.jpeg"
            },
            {
                title: "Sorting Systems",
                category: "robotics",
                description:
                    "Vision-guided robotic sorting mechanism.",
                mediaType: "video",
                videoSrc: "assets/videos/Media4-optimized.mp4",
                posterSrc: "assets/images/gallery-sorting.webp"
            }
        ];

        let currentCarousel = null;

        let activeModalMediaSize = null;

        function resetActiveVideo(video) {
            if (!video) return;

            try {
                video.pause();
            } catch (_) {
            }

            try {
                video.currentTime = 0;
            } catch (_) {
            }

            video.removeAttribute("src");
            video.load();
        }

        function adjustModalDimensions() {
            if (!activeModalMediaSize) return;

            const modal = $("#projectModal");
            const modalContent = $(
                ".project-modal__content",
                modal || document
            );
            const mediaContainer = $("#projectModalMedia");

            if (!modalContent || !mediaContainer) return;

            const { w, h } = activeModalMediaSize;

            if (
                !Number.isFinite(w) ||
                !Number.isFinite(h) ||
                w <= 0 ||
                h <= 0
            ) {
                return;
            }

            const isMobile = window.innerWidth <= 1024;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const ratio = w / h;

            const detailsDesktopW = 380;
            const maxModalW = Math.min(vw * 0.95, 1200);
            const maxModalH = vh * 0.9;

            if (isMobile) {
                const detailsMobileH = 220;
                const maxMediaW = vw * 0.9;
                const maxMediaH = Math.max(
                    maxModalH - detailsMobileH,
                    250
                );

                let targetW = maxMediaW;
                let targetH = targetW / ratio;

                if (targetH > maxMediaH) {
                    targetH = maxMediaH;
                    targetW = targetH * ratio;
                }

                mediaContainer.style.width = "100%";
                mediaContainer.style.height = `${targetH}px`;
                mediaContainer.style.minHeight = "0";

                modalContent.style.gridTemplateColumns = "1fr";
                modalContent.style.width =
                    `${Math.max(targetW, 280)}px`;
                modalContent.style.maxWidth = "95vw";
                modalContent.style.margin = "0 auto";
            } else {
                const maxMediaW = Math.max(
                    200,
                    maxModalW - detailsDesktopW
                );

                const maxMediaH = maxModalH;

                let targetW = maxMediaW;
                let targetH = targetW / ratio;

                if (targetH > maxMediaH) {
                    targetH = maxMediaH;
                    targetW = targetH * ratio;
                }

                mediaContainer.style.width = `${targetW}px`;
                mediaContainer.style.height = `${targetH}px`;
                mediaContainer.style.minHeight = "0";

                modalContent.style.gridTemplateColumns =
                    `${targetW}px 1fr`;

                modalContent.style.width =
                    `${targetW + detailsDesktopW}px`;

                modalContent.style.maxWidth = "95vw";
                modalContent.style.margin = "0 auto";
            }
        }

        window.openProjectModal = function (item, triggerElement) {
            const modal = $("#projectModal");

            if (!modal || !item) return;

            const mediaContainer = $("#projectModalMedia");
            const modalContent = $(
                ".project-modal__content",
                modal
            );

            if (!mediaContainer || !modalContent) return;

            activeModalMediaSize = null;
            mediaContainer.innerHTML = "";

            mediaContainer.style.width = "";
            mediaContainer.style.height = "";
            mediaContainer.style.minHeight = "";

            modalContent.style.gridTemplateColumns = "";
            modalContent.style.width = "";
            modalContent.style.maxWidth = "";
            modalContent.style.margin = "";

            const category = $("#projectModalCategory");
            const title = $("#projectModalTitle");
            const desc = $("#projectModalDesc");

            if (category) {
                category.textContent =
                    `[ ${(item.category || "").toUpperCase()} ]`;
            }

            if (title) title.textContent = item.title || "";
            if (desc) desc.textContent = item.description || "";

            let mediaElement;

            if (item.mediaType === "video") {
                mediaElement = document.createElement("video");

                mediaElement.preload = "metadata";
                mediaElement.poster = item.posterSrc;
                mediaElement.src = item.videoSrc;
                mediaElement.controls = true;
                mediaElement.autoplay = !prefersReducedMotion;
                mediaElement.muted = true;
                mediaElement.playsInline = true;
                mediaElement.disablePictureInPicture = true;
                mediaElement.setAttribute(
                    "controlsList",
                    "nodownload noremoteplayback"
                );

                mediaElement.addEventListener("contextmenu", (e) => e.preventDefault());
                mediaElement.addEventListener("loadstart", () => {
                    mediaContainer.classList.remove("media-error");
                    delete mediaContainer.dataset.error;
                });
                mediaElement.addEventListener("loadedmetadata", function () {
                    activeModalMediaSize = {
                        w: this.videoWidth,
                        h: this.videoHeight
                    };

                    adjustModalDimensions();
                    this.style.opacity = "1";
                });
                mediaElement.addEventListener("playing", () => {
                    mediaContainer.classList.remove("media-error");
                    delete mediaContainer.dataset.error;
                });
                mediaElement.addEventListener("waiting", () => {
                    mediaContainer.classList.remove("media-error");
                });
                mediaElement.addEventListener("canplay", () => {
                    if (mediaElement.autoplay) {
                        const playback = mediaElement.play();
                        if (playback && typeof playback.catch === "function") {
                            playback.catch(() => {});
                        }
                    }
                });
            } else {
                mediaElement = document.createElement("img");

                mediaElement.src = item.imageSrc;
                mediaElement.alt = item.title || "Project image";
                
                mediaElement.addEventListener("contextmenu", (e) => e.preventDefault());

                mediaElement.addEventListener("load", function () {
                    activeModalMediaSize = {
                        w: this.naturalWidth,
                        h: this.naturalHeight
                    };

                    adjustModalDimensions();
                    this.style.opacity = "1";
                });
            }

            mediaElement.style.opacity = "0";
            mediaElement.style.transition =
                "opacity 0.3s ease";

            mediaElement.addEventListener("error", () => {
                mediaElement.style.opacity = "1";
                mediaContainer.classList.add("media-error");
                mediaContainer.dataset.error = "Preview unavailable. Please check your connection or try again later.";
            });
            mediaElement.addEventListener("load", () => {
                mediaContainer.classList.remove("media-error");
                delete mediaContainer.dataset.error;
            });
            mediaElement.addEventListener("loadedmetadata", () => {
                mediaContainer.classList.remove("media-error");
                delete mediaContainer.dataset.error;
            });

            mediaContainer.appendChild(mediaElement);

            modal.classList.add("active");
            showAccessibleDialog(modal, triggerElement || document.activeElement);

            if (currentCarousel) currentCarousel.pauseVideos();

            if (typeof gsap !== "undefined" && !prefersReducedMotion) {
                gsap.fromTo(
                    modalContent,
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.4,
                        ease: "power3.out"
                    }
                );
            }
        };

        window.closeProjectModal = function () {
            const modal = $("#projectModal");

            const modalContent = modal
                ? $(".project-modal__content", modal)
                : null;

            if (!modal || !modal.classList.contains("active")) {
                return;
            }

            const finishClose = () => {
                modal.classList.remove("active");

                const mediaContainer = $("#projectModalMedia");

                if (mediaContainer) {
                    const video =
                        mediaContainer.querySelector("video");

                    if (video) {
                        resetActiveVideo(video);
                    }

                    mediaContainer.innerHTML = "";
                }

                if (
                    modalContent &&
                    typeof gsap !== "undefined"
                ) {
                    gsap.set(modalContent, {
                        clearProps: "all"
                    });
                } else if (modalContent) {
                    modalContent.style.opacity = "";
                    modalContent.style.transform = "";
                }

                hideAccessibleDialog(modal);
                activeModalMediaSize = null;

                if (currentCarousel) currentCarousel.syncVideoPlayback();
            };

            if (
                modalContent &&
                typeof gsap !== "undefined" &&
                !prefersReducedMotion
            ) {
                gsap.to(modalContent, {
                    opacity: 0,
                    y: 30,
                    duration: 0.25,
                    ease: "power2.in",
                    onComplete: finishClose
                });
            } else {
                finishClose();
            }
        };

        const modalCloseBtn = $("#modalCloseBtn");
        const modalBackdrop = $("#modalBackdrop");

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener(
                "click",
                window.closeProjectModal
            );
        }

        if (modalBackdrop) {
            modalBackdrop.addEventListener(
                "click",
                window.closeProjectModal
            );
        }

        window.addEventListener(
            "resize",
            debounce(() => {
                const modal = $("#projectModal");

                if (modal && modal.classList.contains("active")) {
                    adjustModalDimensions();
                }
            }, 150)
        );

        class VanillaDepthCarousel {
            constructor(container, items) {
                this.container = container;
                this.items = items;
                this.pos = 0;
                this.count = items.length;
                this.tween = null;
                this.scale = 1;
                this.isMobile = false;
                this.isHorizontal = true;
                this.rafPending = false;
                this.isDragging = false;
                this.galleryInView = false;
                this.activeVideoIndex = -1;
                this.mobileFocusIndex = 0;
                this.galleryObserver = null;

                this.handleVisibilityChange = () => {
                    if (document.visibilityState === "hidden") {
                        this.pauseVideos();
                    } else {
                        this.syncVideoPlayback();
                    }
                };

                this.cfg = {
                    depth: 220,
                    spread: 145,
                    tilt: 22,
                    visibleCards: 4,
                    falloff: 0.2,
                    blur: 6
                };

                this.handleDown =
                    this.onPointerDown.bind(this);

                this.handleMove =
                    this.onPointerMove.bind(this);

                this.handleEnd =
                    this.onPointerEnd.bind(this);

                this.handleWheel =
                    this.onWheel.bind(this);

                this.handleScrollHint =
                    this.onScroll.bind(this);
                this.scheduleMobileVideoSync = debounce(() => {
                    this.syncVideoPlayback(this.mobileFocusIndex);
                }, 180);

                this.handleResizeEvent = debounce(
                    this.handleResize.bind(this),
                    150
                );

                this.calculateDimensions();
                this.buildDOM();
                this.addEvents();
                this.layout(this.pos);

                if ("IntersectionObserver" in window) {
                    this.galleryObserver = new IntersectionObserver((entries) => {
                        const entry = entries[entries.length - 1];
                        this.galleryInView = Boolean(entry && entry.isIntersecting);
                        this.syncVideoPlayback();
                    }, { rootMargin: "300px 0px" });
                    this.galleryObserver.observe(this.container);
                } else {
                    this.galleryInView = true;
                    this.syncVideoPlayback();
                }

                document.addEventListener(
                    "visibilitychange",
                    this.handleVisibilityChange
                );
            }

            calculateDimensions() {
                const vw = window.innerWidth;
                this.isMobile =
                    matchesMedia("(max-width: 768px)") ||
                    (matchesMedia("(pointer: coarse)") && vw <= 1024);
                this.isHorizontal = this.isMobile;

                if (!this.isMobile) {
                    this.cfg.cardWidth = Math.min(
                        vw * 0.48,
                        680
                    );

                    this.cfg.cardHeight =
                        this.cfg.cardWidth * (9 / 16);

                    this.cfg.spread =
                        this.cfg.cardWidth * 0.5;

                    this.container.style.height =
                        `${this.cfg.cardHeight * 1.45}px`;
                } else {
                    this.cfg.cardWidth = Math.min(
                        vw * 0.78,
                        420
                    );

                    this.cfg.cardHeight =
                        this.cfg.cardWidth * (9 / 16);

                    this.container.style.height =
                        `${this.cfg.cardHeight + 66}px`;
                }
            }

            buildDOM() {
                this.container.innerHTML = "";

                this.stage = document.createElement("div");
                this.stage.className = "depth-carousel__stage";

                this.container.appendChild(this.stage);

                this.cards = this.items.map((item) => {
                    const card = document.createElement("div");

                    card.className = "depth-carousel__card";
                    card.setAttribute("role", "button");
                    card.setAttribute("tabindex", "0");
                    card.setAttribute("aria-label", `Open project: ${item.title || "Project details"}`);

                    card.style.width =
                        `${this.cfg.cardWidth}px`;

                    card.style.height =
                        `${this.cfg.cardHeight}px`;

                    let media;
                    let mediaPoster = null;

                    if (item.mediaType === "video") {
                        const video =
                            document.createElement("video");

                        video.className =
                            "depth-carousel__img depth-carousel__video";
                        video.dataset.src = item.videoSrc;
                        video.poster = item.posterSrc;
                        video.preload = "none";
                        video.loop = true;
                        video.muted = true;
                        video.autoplay = false;
                        video.playsInline = true;
                        video.setAttribute("muted", "");
                        video.setAttribute("playsinline", "");
                        video.setAttribute(
                            "disablePictureInPicture",
                            ""
                        );
                        video.addEventListener("loadeddata", () => {
                            if (
                                this.galleryInView &&
                                !document.hidden &&
                                this.activeVideoIndex === this.cards.indexOf(card)
                            ) {
                                video.classList.add("is-ready");

                                if (!prefersReducedMotion) {
                                    const playback = video.play();
                                    if (playback && typeof playback.catch === "function") {
                                        playback.catch(() => {});
                                    }
                                }
                            }
                        });
                        video.setAttribute(
                            "controlsList",
                            "nodownload"
                        );

                        media = video;
                        mediaPoster = document.createElement("img");
                        mediaPoster.className =
                            "depth-carousel__img depth-carousel__poster";
                        mediaPoster.src = item.posterSrc;
                        mediaPoster.alt = "";
                        mediaPoster.draggable = false;
                    } else {
                        const img =
                            document.createElement("img");

                        img.className = "depth-carousel__img";
                        img.src = item.imageSrc;
                        img.alt = item.title || "Project image";
                        img.draggable = false;

                        media = img;
                    }

                    const tint =
                        document.createElement("div");

                    tint.className = "depth-carousel__tint";

                    const title =
                        document.createElement("div");

                    title.className = "depth-carousel__title";
                    title.style.zIndex = "10";
                    title.textContent = item.title || "";

                    if (mediaPoster) card.appendChild(mediaPoster);
                    card.appendChild(media);
                    card.appendChild(tint);
                    card.appendChild(title);

                    card.addEventListener("click", () => {
                        window.openProjectModal(item, card);
                    });
                    card.addEventListener("keydown", (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            window.openProjectModal(item, card);
                        }
                    });

                    const handleMediaError = () => {
                        if (card.querySelector(".media-fallback")) return;
                        const fallback = document.createElement("div");
                        fallback.className = "media-fallback";
                        fallback.textContent = `${item.title || "Project"} preview is unavailable.`;
                        card.appendChild(fallback);
                    };
                    media.addEventListener("error", () => {
                        if (item.mediaType === "video" && media.error && media.error.code === 1) {
                            return;
                        }
                        handleMediaError();
                    });
                    media.addEventListener(
                        item.mediaType === "video" ? "loadeddata" : "load",
                        () => {
                            const fallback = card.querySelector(".media-fallback");
                            if (fallback) fallback.remove();
                        }
                    );

                    this.stage.appendChild(card);

                    return card;
                });

                this.dotsContainer =
                    document.createElement("div");

                this.dotsContainer.className =
                    "depth-carousel__dots";

                this.container.appendChild(this.dotsContainer);

                this.dots = this.items.map((_, index) => {
                    const dot = document.createElement("button");

                    dot.className =
                        "depth-carousel__dot" +
                        (index === 0 ? " is-active" : "");

                    dot.type = "button";

                    dot.setAttribute(
                        "aria-label",
                        `Go to card ${index + 1}`
                    );

                    dot.addEventListener("click", () => {
                        this.setFocus(index);
                    });

                    this.dotsContainer.appendChild(dot);

                    return dot;
                });
            }

            pauseVideos() {
                if (!this.cards) return;

                this.activeVideoIndex = -1;
                this.cards.forEach((card) => {
                    const video = card.querySelector("video");
                    if (video) video.pause();
                });
            }

            syncVideoPlayback(index = Math.round(this.pos)) {
                if (!this.cards || this.cards.length === 0) return;

                const modal = document.querySelector("#projectModal");
                if (modal && modal.classList.contains("active")) {
                    this.pauseVideos();
                    return;
                }

                if (!this.galleryInView) {
                    this.pauseVideos();
                    this.cards.forEach((card) => {
                        const video = card.querySelector("video");
                        if (video && video.hasAttribute("src")) {
                            video.classList.remove("is-ready");
                            video.removeAttribute("src");
                            video.load();
                        }
                    });
                    return;
                }

                if (document.visibilityState === "hidden") {
                    this.pauseVideos();
                    return;
                }

                if (this.isHorizontal) {
                    index = this.mobileFocusIndex;
                }
                index = Math.max(0, Math.min(this.count - 1, Math.round(index)));

                const activeChanged = index !== this.activeVideoIndex;

                this.cards.forEach((card, cardIndex) => {
                    const video = card.querySelector("video");
                    if (!video) return;

                    const isActive = cardIndex === index;
                    video.preload = isActive ? "auto" : "none";

                    if (isActive) {
                        if (!video.hasAttribute("src") && video.dataset.src) {
                            video.src = video.dataset.src;
                            video.load();
                        }
                    } else {
                        video.pause();
                        video.classList.remove("is-ready");
                        if (video.hasAttribute("src")) {
                            video.removeAttribute("src");
                            video.load();
                        }
                        try {
                            video.currentTime = 0;
                        } catch (_) {
                        }
                    }
                });

                if (activeChanged) {
                    this.activeVideoIndex = index;
                    const activeCard = this.cards[index];
                    const activeVideo = activeCard
                        ? activeCard.querySelector("video")
                        : null;

                    if (activeVideo && !prefersReducedMotion) {
                        const playback = activeVideo.play();
                        if (playback && typeof playback.catch === "function") {
                            playback.catch(() => {
                            });
                        }
                    }
                }
            }

            setActiveDot(index) {
                if (!this.dots) return;

                this.dots.forEach((dot, i) => {
                    dot.classList.toggle(
                        "is-active",
                        i === Math.round(index)
                    );
                });
            }

            layout(pos) {
                if (!this.cards || this.cards.length === 0) {
                    return;
                }

                if (this.isHorizontal) {
                    this.stage.style.display = "flex";
                    this.stage.style.flexDirection = "row";
                    this.stage.style.gap = "16px";
                    this.stage.style.overflowX = "auto";
                    this.stage.style.overflowY = "hidden";
                    this.stage.style.padding = "0 4vw 48px";
                    this.stage.style.position = "relative";
                    this.stage.style.transform = "none";
                    this.stage.style.left = "0";
                    this.stage.style.top = "0";
                    this.stage.style.width = "100%";
                    this.stage.style.scrollSnapType =
                        "x mandatory";
                    this.stage.style.scrollbarWidth = "none";

                    this.cards.forEach((card) => {
                        if (typeof gsap !== "undefined") {
                            gsap.killTweensOf(card);
                        }

                        card.style.transform = "none";
                        card.style.opacity = "1";
                        card.style.zIndex = "1";
                        card.style.filter = "none";
                        card.style.position = "relative";
                        card.style.flexShrink = "0";
                        card.style.flex = `0 0 ${this.cfg.cardWidth}px`;
                        card.style.maxWidth = `${this.cfg.cardWidth}px`;
                        card.style.width = "";
                        card.style.height =
                            `${this.cfg.cardHeight}px`;
                        card.style.pointerEvents = "auto";
                        card.style.scrollSnapAlign = "center";
                    });

                    this.syncVideoPlayback(this.mobileFocusIndex);
                    return;
                }

                this.stage.style.display = "";
                this.stage.style.flexDirection = "";
                this.stage.style.gap = "";
                this.stage.style.overflowX = "";
                this.stage.style.overflowY = "";
                this.stage.style.padding = "";
                this.stage.style.position = "absolute";
                this.stage.style.transform = "";
                this.stage.style.left = "";
                this.stage.style.top = "";

                this.cards.forEach((card, index) => {
                    const distance = index - pos;
                    const absDistance = Math.abs(distance);

                    const shown =
                        absDistance <=
                        this.cfg.visibleCards + 0.5;

                    const tz =
                        -this.cfg.depth * absDistance;

                    const tx =
                        this.cfg.spread * distance;

                    const ry =
                        this.cfg.tilt *
                        Math.max(
                            -1,
                            Math.min(1, distance)
                        );

                    const opacity = shown ? 1 : 0;

                    const brightness = Math.max(
                        0.15,
                        1 - absDistance * this.cfg.falloff
                    );

                    const blurPx =
                        this.cfg.blur > 0
                            ? Math.min(
                                this.cfg.blur,
                                (absDistance /
                                    Math.max(
                                        1,
                                        this.cfg.visibleCards
                                    )) * this.cfg.blur
                            )
                            : 0;

                    const zIndex = Math.round(
                        2000 - absDistance * 20
                    );

                    card.style.position = "absolute";
                    card.style.flex = "";
                    card.style.flexShrink = "";
                    card.style.maxWidth = "";
                    card.style.width =
                        `${this.cfg.cardWidth}px`;
                    card.style.height =
                        `${this.cfg.cardHeight}px`;

                    if (typeof gsap !== "undefined") {
                        gsap.set(card, {
                            xPercent: -50,
                            yPercent: -50,
                            x: tx * this.scale,
                            z: tz,
                            rotationY: ry,
                            scale: this.scale,
                            opacity,
                            zIndex,
                            filter:
                                `brightness(${brightness}) ` +
                                `blur(${blurPx}px)`,
                            pointerEvents:
                                shown && opacity > 0.05
                                    ? "auto"
                                    : "none"
                        });
                    } else {
                        card.style.left = "50%";
                        card.style.top = "50%";
                        card.style.transform =
                            `translate(-50%, -50%) ` +
                            `translateX(${tx}px)`;

                        card.style.opacity = String(opacity);
                        card.style.zIndex = String(zIndex);
                        card.style.pointerEvents =
                            shown ? "auto" : "none";
                    }
                });

                this.syncVideoPlayback(Math.round(pos));
            }

            handleResize() {
                this.calculateDimensions();

                if (this.cards) {
                    this.cards.forEach((card) => {
                        card.style.width =
                            `${this.cfg.cardWidth}px`;

                        card.style.height =
                            `${this.cfg.cardHeight}px`;
                    });
                }

                this.scale = 1;
                this.layout(this.pos);
            }

            setFocus(index) {
                index = Math.max(
                    0,
                    Math.min(index, this.count - 1)
                );

                this.setActiveDot(index);

                if (this.isHorizontal) {
                    this.mobileFocusIndex = index;
                    this.scheduleMobileVideoSync();
                    const card = this.cards[index];

                    if (card && this.stage) {
                        const centerPos =
                            card.offsetLeft -
                            this.stage.clientWidth / 2 +
                            card.offsetWidth / 2;

                        this.stage.scrollTo({
                            left: centerPos,
                            behavior: prefersReducedMotion
                                ? "auto"
                                : "smooth"
                        });
                    }

                    return;
                }

                if (this.tween) this.tween.kill();

                if (typeof gsap === "undefined") {
                    this.pos = index;
                    this.layout(this.pos);
                    return;
                }

                const proxy = { p: this.pos };

                this.tween = gsap.to(proxy, {
                    p: index,
                    duration: 0.7,
                    ease: "power3.out",
                    onUpdate: () => {
                        this.pos = proxy.p;
                        this.layout(this.pos);
                    }
                });
            }

            onScroll() {
                if (
                    !this.isHorizontal ||
                    !this.stage ||
                    !this.cards ||
                    this.cards.length === 0
                ) {
                    return;
                }

                const stageRect =
                    this.stage.getBoundingClientRect();

                const stageCenter =
                    stageRect.left + stageRect.width / 2;

                let closestIndex = 0;
                let minDistance = Infinity;

                this.cards.forEach((card, index) => {
                    const rect = card.getBoundingClientRect();

                    const cardCenter =
                        rect.left + rect.width / 2;

                    const distance = Math.abs(
                        stageCenter - cardCenter
                    );

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                });

                this.mobileFocusIndex = closestIndex;
                this.setActiveDot(closestIndex);
                this.scheduleMobileVideoSync();
            }

            onPointerDown(event) {
                if (this.isHorizontal || this.count < 2) {
                    return;
                }

                if (event.button !== 0) return;

                this.isDragging = true;

                if (
                    this.container.setPointerCapture &&
                    event.pointerId !== undefined
                ) {
                    this.container.setPointerCapture(
                        event.pointerId
                    );
                }

                this.startX = event.clientX;
                this.startPos = this.pos;

                this.startTarget = event.target.closest(
                    ".depth-carousel__card"
                );

                if (this.tween) this.tween.kill();
            }

            onPointerMove(event) {
                if (this.isHorizontal || !this.isDragging) {
                    return;
                }

                const dx = event.clientX - this.startX;

                const stepPx = Math.max(
                    this.cfg.cardWidth * 0.55 * this.scale,
                    40
                );

                this.pos = Math.max(
                    -0.2,
                    Math.min(
                        this.count - 0.8,
                        this.startPos - dx / stepPx
                    )
                );

                if (!this.rafPending) {
                    this.rafPending = true;

                    requestAnimationFrame(() => {
                        this.layout(this.pos);
                        this.rafPending = false;
                    });
                }
            }

            onPointerEnd(event) {
                if (this.isHorizontal || !this.isDragging) {
                    return;
                }

                this.isDragging = false;

                if (
                    this.container.hasPointerCapture &&
                    this.container.hasPointerCapture(
                        event.pointerId
                    )
                ) {
                    this.container.releasePointerCapture(
                        event.pointerId
                    );
                }

                const dragDistance = Math.abs(
                    event.clientX - this.startX
                );

                if (dragDistance < 5 && this.startTarget) {
                    const index =
                        this.cards.indexOf(this.startTarget);

                    if (index !== -1) {
                        if (Math.round(this.pos) === index) {
                            window.openProjectModal(
                                this.items[index],
                                this.startTarget
                            );
                        } else {
                            this.setFocus(index);
                        }
                    }
                } else {
                    this.setFocus(Math.round(this.pos));
                }
            }

            onWheel(event) {
                if (this.isHorizontal || this.count < 2) {
                    return;
                }

                event.preventDefault();

                if (this.tween) this.tween.kill();

                const rawDelta =
                    Math.abs(event.deltaX) >
                    Math.abs(event.deltaY)
                        ? event.deltaX
                        : event.deltaY;

                const delta =
                    event.deltaMode === 1
                        ? rawDelta * 24
                        : rawDelta;

                const step = Math.max(
                    -0.6,
                    Math.min(
                        0.6,
                        delta / (this.cfg.cardWidth * 0.8)
                    )
                );

                this.pos = Math.max(
                    -0.2,
                    Math.min(
                        this.count - 0.8,
                        this.pos + step
                    )
                );

                if (!this.rafPending) {
                    this.rafPending = true;

                    requestAnimationFrame(() => {
                        this.layout(this.pos);
                        this.rafPending = false;
                    });
                }

                clearTimeout(this.wheelTimer);

                this.wheelTimer = setTimeout(() => {
                    this.setFocus(Math.round(this.pos));
                }, 150);
            }

            addEvents() {
                this.stage.addEventListener(
                    "scroll",
                    this.handleScrollHint,
                    { passive: true }
                );

                this.container.addEventListener(
                    "pointerdown",
                    this.handleDown
                );

                this.container.addEventListener(
                    "pointermove",
                    this.handleMove
                );

                this.container.addEventListener(
                    "pointerup",
                    this.handleEnd
                );

                this.container.addEventListener(
                    "pointercancel",
                    this.handleEnd
                );

                this.container.addEventListener(
                    "wheel",
                    this.handleWheel,
                    { passive: false }
                );

                window.addEventListener(
                    "resize",
                    this.handleResizeEvent
                );
            }

            destroy() {
                if (this.tween) this.tween.kill();

                if (this.galleryObserver) {
                    this.galleryObserver.disconnect();
                    this.galleryObserver = null;
                }

                document.removeEventListener(
                    "visibilitychange",
                    this.handleVisibilityChange
                );

                this.cards?.forEach((card) => {
                    const video = card.querySelector("video");
                    if (video) {
                        video.pause();
                        video.removeAttribute("src");
                        video.load();
                    }
                });

                clearTimeout(this.wheelTimer);

                this.stage.removeEventListener(
                    "scroll",
                    this.handleScrollHint
                );

                this.container.removeEventListener(
                    "pointerdown",
                    this.handleDown
                );

                this.container.removeEventListener(
                    "pointermove",
                    this.handleMove
                );

                this.container.removeEventListener(
                    "pointerup",
                    this.handleEnd
                );

                this.container.removeEventListener(
                    "pointercancel",
                    this.handleEnd
                );

                this.container.removeEventListener(
                    "wheel",
                    this.handleWheel
                );

                window.removeEventListener(
                    "resize",
                    this.handleResizeEvent
                );

                this.container.innerHTML = "";
            }
        }

        function loadCarousel() {
            const container = $("#galleryGrid");

            if (!container) return;

            if (currentCarousel) {
                currentCarousel.destroy();
                currentCarousel = null;
            }

            currentCarousel = new VanillaDepthCarousel(
                container,
                dynamicCapabilitiesData
            );

            if (typeof gsap !== "undefined" && !prefersReducedMotion) {
                gsap.from(currentCarousel.cards, {
                    opacity: 0,
                    y: 12,
                    stagger: 0.08,
                    duration: 0.45,
                    ease: "power2.out"
                });
            }
        }

        loadCarousel();

        const FORM_ENDPOINT = "https://formspree.io/f/xdarywrz";

        const form = $("#contactForm");
        if (form) {
            form.method = "POST";
            form.action = FORM_ENDPOINT;
            form.setAttribute("novalidate", "novalidate");
        }
        const formMessage = $("#formStatus");
        const successModal = $("#successModal");

        let isSubmitting = false;
        let lastSubmitTime = 0;
        const SUBMIT_COOLDOWN_MS = 60000;

        function openSuccessModal() {
            if (!successModal) return;
            successModal.classList.add("show");
            showAccessibleDialog(successModal, document.activeElement);
        }

        function closeSuccessModal() {
            if (!successModal) return;
            successModal.classList.remove("show");
            hideAccessibleDialog(successModal);
        }

        if (successModal) {
            const closeBtn = successModal.querySelector(".close-modal");
            if (closeBtn) {
                closeBtn.addEventListener("click", closeSuccessModal);
            }
            successModal.addEventListener("click", (e) => {
                if (e.target === successModal) {
                    closeSuccessModal();
                }
            });
        }

        if (form && formMessage) {
            form.addEventListener("submit", function (event) {
                if (typeof window.fetch !== "function" || typeof window.FormData !== "function") {
                    return;
                }
                event.preventDefault();

                if (isSubmitting) return;

                const now = Date.now();
                if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                    const remaining = Math.ceil(
                        (SUBMIT_COOLDOWN_MS - (now - lastSubmitTime)) / 1000
                    );
                    formMessage.textContent =
                        `Please wait ${remaining}s before sending another enquiry.`;
                    formMessage.className = "form-message error";
                    return;
                }

                const honeypot = form.querySelector('input[name="_gotcha"]');
                if (honeypot && honeypot.value.trim() !== "") {
                    form.reset();
                    openSuccessModal();
                    return;
                }

                const inputs = Array.from(
                    form.querySelectorAll(
                        "input:not([name='_gotcha']):not([type='hidden']), textarea"
                    )
                );

                let isValid = true;
                let firstInvalid = null;
                const fieldNames = [];

                inputs.forEach((input) => {
                    input.style.borderBottomColor =
                        "var(--border)";

                    const value = input.value.trim();
                    const requiredMissing =
                        input.hasAttribute("required") && !value;

                    if (requiredMissing) {
                        isValid = false;
                        input.style.borderBottomColor =
                            "#dc2626";

                        if (!firstInvalid) {
                            firstInvalid = input;
                        }

                        const label =
                            (input.previousElementSibling && input.previousElementSibling.textContent)
                                || input.getAttribute("aria-label")
                                || input.name
                                || "This field";

                        const cleanedLabel = label
                            .replace(/\s*\*\s*$/, "")
                            .trim();

                        if (!fieldNames.includes(cleanedLabel)) {
                            fieldNames.push(cleanedLabel);
                        }
                    }

                    if (
                        input.type === "email" &&
                        value
                    ) {
                        const emailRegex =
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                        if (
                            !emailRegex.test(value)
                        ) {
                            isValid = false;

                            input.style.borderBottomColor =
                                "#dc2626";

                            if (!firstInvalid) {
                                firstInvalid = input;
                            }

                            const emailLabel =
                                (input.previousElementSibling && input.previousElementSibling.textContent)
                                    || input.getAttribute("aria-label")
                                    || "Email";

                            const cleanedEmailLabel = emailLabel
                                .replace(/\s*\*\s*$/, "")
                                .trim();

                            if (!fieldNames.includes(cleanedEmailLabel)) {
                                fieldNames.push(cleanedEmailLabel);
                            }
                        }
                    }
                });

                if (!isValid) {
                    formMessage.textContent =
                        "Please fill in the required fields.";

                    formMessage.className = "form-message error";

                    if (firstInvalid) {
                        firstInvalid.focus();
                        firstInvalid.scrollIntoView({
                            behavior: "smooth",
                            block: "center"
                        });
                    }

                    return;
                }

                const submitBtn = form.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

                const isButton =
                    submitBtn &&
                    submitBtn.tagName === "BUTTON";

                const originalText = submitBtn
                    ? isButton
                        ? submitBtn.innerHTML
                        : submitBtn.value
                    : "";

                isSubmitting = true;

                if (submitBtn) {
                    submitBtn.disabled = true;

                    if (isButton) {
                        submitBtn.textContent =
                            "SENDING...";
                    } else {
                        submitBtn.value = "SENDING...";
                    }
                }

                fetch(FORM_ENDPOINT, {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        Accept: "application/json"
                    }
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(
                                "Form submission failed."
                            );
                        }

                        lastSubmitTime = Date.now();
                        form.reset();
                        openSuccessModal();
                    })
                    .catch(() => {
                        formMessage.textContent =
                            "We could not send your enquiry. Check your connection and retry, or contact us by phone or email.";

                        formMessage.className =
                            "form-message error";
                    })
                    .finally(() => {
                        isSubmitting = false;

                        if (submitBtn) {
                            submitBtn.disabled = false;

                            if (isButton) {
                                submitBtn.innerHTML = originalText;
                            } else {
                                submitBtn.value = originalText;
                            }
                        }

                        setTimeout(() => {
                            formMessage.textContent = "";
                            formMessage.className = "form-message";
                        }, 5000);
                    });
            });
        }

        if (form && formMessage) {
            document.documentElement.classList.add("js-enabled");
        }
        
    });
})();