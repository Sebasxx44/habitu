// @ts-check

// TYPES
/**
 * @typedef {HTMLElement & {
 *   play: () => void,
 *   pause: () => void,
 *   seek: (seconds: number) => void,
 *   readonly currentTime: number,
 *   readonly duration: number,
 *   readonly paused: boolean,
 *   readonly ready: boolean
 *   readonly iframeElement: HTMLIFrameElement
 * }} TourPlayer
 */

// HELPERS
/** @param {number} seconds */
const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// PLAYER
const initializeTour = () => {
  const element = document.getElementById("tour-player");
  const toggle = document.getElementById("play-toggle");
  const label = document.getElementById("play-label");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const seek = document.getElementById("tour-seek");
  const clock = document.getElementById("tour-time");
  const status = document.getElementById("tour-status");
  const fallback = document.getElementById("tour-fallback");
  const motionHint = document.getElementById("motion-hint");
  if (
    !(element instanceof HTMLElement) ||
    !(toggle instanceof HTMLButtonElement) ||
    !(seek instanceof HTMLInputElement) ||
    !label ||
    !playIcon ||
    !pauseIcon ||
    !clock ||
    !status ||
    !fallback ||
    !motionHint
  )
    return;
  const player = /** @type {TourPlayer} */ (element);
  const chapters = [...document.querySelectorAll("button[data-start]")].filter(
    (chapter) => chapter instanceof HTMLButtonElement,
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ready = false;
  let duration = 36;
  let failed = false;
  motionHint.hidden = !reducedMotion.matches;

  /** @param {number} time */
  const renderPosition = (time) => {
    const position = Number.isFinite(time)
      ? Math.min(duration, Math.max(0, time))
      : 0;
    seek.value = String(position);
    clock.textContent = `${formatTime(position)} / ${formatTime(duration)}`;
    seek.setAttribute(
      "aria-valuetext",
      `${formatTime(position)} de ${formatTime(duration)}`,
    );
    for (const chapter of chapters) {
      const start = Number(chapter.dataset.start);
      if (position >= start && position < start + 6)
        chapter.setAttribute("aria-current", "step");
      else if (position === duration && start === 30)
        chapter.setAttribute("aria-current", "step");
      else chapter.removeAttribute("aria-current");
    }
  };
  const renderPlayback = () => {
    const paused = player.paused;
    label.textContent = paused ? "Reproducir" : "Pausar";
    playIcon.hidden = !paused;
    pauseIcon.hidden = paused;
  };
  const fail = () => {
    failed = true;
    ready = false;
    toggle.disabled = true;
    seek.disabled = true;
    chapters.forEach((chapter) => {
      chapter.disabled = true;
    });
    fallback.hidden = false;
    status.textContent =
      "No pudimos cargar el recorrido visual. Los pasos escritos siguen disponibles.";
  };
  const loadingTimeout = window.setTimeout(() => {
    if (!ready) fail();
  }, 15000);
  const onReady = () => {
    window.clearTimeout(loadingTimeout);
    failed = false;
    ready = true;
    player.iframeElement.title = "Demostración visual de HABITÜ";
    // The visual frame duplicates the complete, accessible transcript below.
    player.iframeElement.setAttribute("aria-hidden", "true");
    player.iframeElement.tabIndex = -1;
    duration =
      Number.isFinite(player.duration) && player.duration > 0
        ? player.duration
        : 36;
    seek.max = String(duration);
    toggle.disabled = false;
    seek.disabled = false;
    chapters.forEach((chapter) => {
      chapter.disabled = Number(chapter.dataset.start) >= duration;
    });
    fallback.hidden = true;
    status.textContent = "Listo. Pulsa Reproducir o elige un capítulo.";
    renderPosition(player.currentTime);
    renderPlayback();
  };
  /** @param {number} time */
  const jumpTo = (time) => {
    if (!ready || failed || !Number.isFinite(time)) return;
    player.pause();
    player.seek(Math.max(0, Math.min(duration, time)));
    renderPosition(time);
    renderPlayback();
  };

  // CONTROLS
  toggle.addEventListener("click", () => {
    if (!ready || failed) return;
    if (player.paused) {
      if (player.currentTime >= duration) player.seek(0);
      player.play();
    } else player.pause();
  });
  seek.addEventListener("input", () => jumpTo(Number(seek.value)));
  for (const chapter of chapters)
    chapter.addEventListener("click", () => {
      jumpTo(Number(chapter.dataset.start));
      status.textContent = `Capítulo ${chapter.dataset.title}. En pausa; pulsa Reproducir para continuar.`;
    });

  // OFFICIAL PLAYER EVENTS
  player.addEventListener("ready", onReady);
  player.addEventListener("durationchange", () => {
    if (!Number.isFinite(player.duration) || player.duration <= 0) return;
    duration = player.duration;
    seek.max = String(duration);
    renderPosition(player.currentTime);
  });
  player.addEventListener("timeupdate", () =>
    renderPosition(player.currentTime),
  );
  player.addEventListener("play", () => {
    renderPlayback();
    status.textContent = "Reproduciendo. Puedes pausar en cualquier momento.";
  });
  player.addEventListener("pause", () => {
    renderPlayback();
    if (!failed)
      status.textContent = "En pausa. Elige un capítulo o pulsa Reproducir.";
  });
  player.addEventListener("ended", () => {
    renderPosition(duration);
    renderPlayback();
    status.textContent =
      "Recorrido terminado. Puedes volver a reproducirlo o abrir la app.";
  });
  player.addEventListener("error", fail);
  player.addEventListener("playbackerror", () => {
    renderPlayback();
    status.textContent =
      "La reproducción está en pausa. Pulsa Reproducir para intentarlo de nuevo o consulta los pasos escritos.";
  });
  reducedMotion.addEventListener("change", () => {
    motionHint.hidden = !reducedMotion.matches;
    if (reducedMotion.matches && ready) player.pause();
  });
  if (customElements.get("hyperframes-player") && player.ready) onReady();
};

initializeTour();
