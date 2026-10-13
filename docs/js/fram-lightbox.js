/**
 * The parts of the lightbox dialog that the component uses, by BEM element name.
 *
 * @typedef {object} LightboxParts
 * @property {HTMLButtonElement} close
 * @property {HTMLAnchorElement} download
 * @property {HTMLDivElement} frame
 * @property {HTMLButtonElement} fullscreen
 * @property {HTMLButtonElement} next
 * @property {HTMLButtonElement} previous
 * @property {HTMLButtonElement} slideshow
 * @property {HTMLUListElement} slides
 * @property {HTMLParagraphElement} status
 * @property {HTMLDivElement} strip
 */

/** @typedef {keyof typeof FramLightbox.ICON_PATHS} IconName */

/** @typedef {"s" | "l" | "xl"} ImageVariant */

/**
 * A lightbox for a list of links. Each link is in an item of the child list, points to an original
 * file, and holds a thumbnail image. Without JavaScript, the links open the original files.
 *
 * Each link gives its images in data attributes, named after the fram derivatives:
 * - `data-s-src`: The thumbnail image in the strip.
 * - `data-l-src`: The image that the lightbox shows. For a video, this image is the poster.
 * - `data-xl-src`: The image that the lightbox shows in fullscreen mode. Without it, fullscreen
 *   mode shows the `l` image.
 * - `data-l-width`, `data-l-height`, `data-s-width`, `data-s-height`, `data-xl-width` and
 *   `data-xl-height`: The image sizes. They keep the space for each image before it loads.
 *
 * A link with `type="video/..."` shows a video.
 *
 * Optional attributes on the element:
 * - `label`: The accessible name of the lightbox, for example the album title.
 * - `slideshow-delay-ms`: The time in milliseconds that the slideshow shows each slide. If it is
 *   absent or is not a positive whole number, the component uses the default value.
 *
 * Methods:
 * - `show(index)`: Opens the lightbox at the link with that index.
 */
class FramLightbox extends HTMLElement {
  /** The slideshow delay in milliseconds, if `slideshow-delay-ms` has no valid value. */
  static SLIDESHOW_DELAY_MS_DEFAULT = 5000;

  /** The time in milliseconds without activity before fullscreen mode hides the controls. */
  static CONTROLS_IDLE_MS = 2500;

  /** The part of a slide that must be in view for the slide to be the current slide. */
  static SLIDE_VISIBLE_RATIO = 0.5;

  /**
   * The motion setting of the user. A scripted smooth scroll ignores this setting, so the
   * component checks it. The value changes when the user changes the setting.
   */
  static REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)");

  /**
   * True if the main pointer can hover. A touch screen keeps the hover on the last control that the
   * user taps, so the component ignores the hover on such screens.
   */
  static CAN_HOVER = matchMedia("(hover: hover)");

  /** The controls that fullscreen mode shows over the slides. */
  static CONTROLS_SELECTOR =
    ":is(.lightbox__actions, .lightbox__close, .lightbox__previous, .lightbox__next)";

  /**
   * The number of slides that each arrow key moves.
   *
   * @type {Partial<Record<string, number>>}
   */
  static ARROW_KEY_DELTAS = { ArrowLeft: -1, ArrowRight: 1 };

  /** The SVG path data of the control icons, in a 640 by 640 box. */
  static ICON_PATHS = {
    close:
      "M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z",
    compress:
      "M256 128C256 110.3 241.7 96 224 96C206.3 96 192 110.3 192 128L192 192L128 192C110.3 192 96 206.3 96 224C96 241.7 110.3 256 128 256L224 256C241.7 256 256 241.7 256 224L256 128zM128 384C110.3 384 96 398.3 96 416C96 433.7 110.3 448 128 448L192 448L192 512C192 529.7 206.3 544 224 544C241.7 544 256 529.7 256 512L256 416C256 398.3 241.7 384 224 384L128 384zM448 128C448 110.3 433.7 96 416 96C398.3 96 384 110.3 384 128L384 224C384 241.7 398.3 256 416 256L512 256C529.7 256 544 241.7 544 224C544 206.3 529.7 192 512 192L448 192L448 128zM416 384C398.3 384 384 398.3 384 416L384 512C384 529.7 398.3 544 416 544C433.7 544 448 529.7 448 512L448 448L512 448C529.7 448 544 433.7 544 416C544 398.3 529.7 384 512 384L416 384z",
    download:
      "M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z",
    expand:
      "M128 96C110.3 96 96 110.3 96 128L96 224C96 241.7 110.3 256 128 256C145.7 256 160 241.7 160 224L160 160L224 160C241.7 160 256 145.7 256 128C256 110.3 241.7 96 224 96L128 96zM160 416C160 398.3 145.7 384 128 384C110.3 384 96 398.3 96 416L96 512C96 529.7 110.3 544 128 544L224 544C241.7 544 256 529.7 256 512C256 494.3 241.7 480 224 480L160 480L160 416zM416 96C398.3 96 384 110.3 384 128C384 145.7 398.3 160 416 160L480 160L480 224C480 241.7 494.3 256 512 256C529.7 256 544 241.7 544 224L544 128C544 110.3 529.7 96 512 96L416 96zM544 416C544 398.3 529.7 384 512 384C494.3 384 480 398.3 480 416L480 480L416 480C398.3 480 384 494.3 384 512C384 529.7 398.3 544 416 544L512 544C529.7 544 544 529.7 544 512L544 416z",
    info: "M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM288 224C288 206.3 302.3 192 320 192C337.7 192 352 206.3 352 224C352 241.7 337.7 256 320 256C302.3 256 288 241.7 288 224zM280 288L328 288C341.3 288 352 298.7 352 312L352 400L360 400C373.3 400 384 410.7 384 424C384 437.3 373.3 448 360 448L280 448C266.7 448 256 437.3 256 424C256 410.7 266.7 400 280 400L304 400L304 336L280 336C266.7 336 256 325.3 256 312C256 298.7 266.7 288 280 288z",
    next: "M566.6 342.6C579.1 330.1 579.1 309.8 566.6 297.3L406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3C348.8 149.8 348.8 170.1 361.3 182.6L466.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L466.7 352L361.3 457.4C348.8 469.9 348.8 490.2 361.3 502.7C373.8 515.2 394.1 515.2 406.6 502.7L566.6 342.7z",
    pause:
      "M176 96C149.5 96 128 117.5 128 144L128 496C128 522.5 149.5 544 176 544L240 544C266.5 544 288 522.5 288 496L288 144C288 117.5 266.5 96 240 96L176 96zM400 96C373.5 96 352 117.5 352 144L352 496C352 522.5 373.5 544 400 544L464 544C490.5 544 512 522.5 512 496L512 144C512 117.5 490.5 96 464 96L400 96z",
    play: "M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z",
    previous:
      "M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z",
  };

  /**
   * The links in the child list, one for each slide.
   *
   * @type {HTMLAnchorElement[]}
   */
  #links = [];

  /**
   * The slides, in the same order as the links.
   *
   * @type {HTMLLIElement[]}
   */
  #slides = [];

  /**
   * The strip thumbnails, in the same order as the links.
   *
   * @type {HTMLButtonElement[]}
   */
  #thumbnails = [];

  /** The index of the slide that fills the track. */
  #indexCurrent = 0;

  /**
   * The index of the slide that a scroll moves to, until that slide becomes current. Moves start
   * from this slide, so a key press during a scroll does not repeat the previous move.
   *
   * @type {number | null}
   */
  #indexTarget = null;

  /** The inline size of the track at its last change of size, or 0 while the lightbox is closed. */
  #trackInlineSize = 0;

  /** True while the slideshow plays. */
  #isSlideshowPlaying = false;

  /**
   * The timer for the next slideshow step.
   *
   * @type {number | undefined}
   */
  #slideshowTimer;

  /** True while the lightbox is in fullscreen mode. */
  #isFullscreen = false;

  /**
   * The timer that hides the controls in fullscreen mode.
   *
   * @type {number | undefined}
   */
  #controlsTimer;

  /**
   * True if the last focus move came from the Tab key, and not from a pointer. After a click, a
   * key press makes the focus of the clicked control visible, so `:focus-visible` cannot tell.
   */
  #isTabFocus = false;

  /** The lightbox dialog. The component fills it and adds it when the element first connects. */
  #dialog = document.createElement("dialog");

  /**
   * Makes the lightbox when the element connects for the first time. A later connect, for example
   * after a move in the page, keeps the lightbox that exists.
   */
  connectedCallback() {
    if (this.#dialog.isConnected) {
      return;
    }
    this.#links = /** @type {HTMLAnchorElement[]} */ ([
      ...this.querySelectorAll(":scope > ul > li > a"),
    ]);
    this.#build();
  }

  /**
   * Opens the lightbox at one item. The lightbox exists only after the element connects, so before
   * that every index is invalid.
   *
   * @param {number} index - The index of the link to show.
   * @throws {RangeError} If no item has the index.
   */
  show(index) {
    if (!this.#slides[index]) {
      throw new RangeError(`The lightbox has no item at index ${index}.`);
    }
    this.#dialog.showModal();
    this.#scrollToSlide(index, "instant");
  }

  /** Makes the lightbox and connects its events. */
  #build() {
    this.#buildDialog();
    this.#buildSlides();
    this.#buildStrip();
    this.#buildLinks();
    this.#buildControls();
    this.#buildFullscreen();
    this.#buildTrack();
  }

  /**
   * Fills the dialog with its controls, and adds it to the element. The controls are in a frame,
   * because the browser cannot show a dialog in fullscreen. In fullscreen mode, the frame goes
   * fullscreen.
   */
  #buildDialog() {
    Object.assign(this.#dialog, {
      ariaLabel: this.getAttribute("label"),
      className: "lightbox",
      closedBy: "any",
      innerHTML: `
      <div class="lightbox__frame">
        <div class="lightbox__actions">
          <!--button type="button" class="lightbox__info" aria-label="Info">
            ${this.#renderIcon("info")}
          </button-->
          <button type="button" class="lightbox__fullscreen" aria-label="Enter full screen">
            ${this.#renderIcon("expand")}
          </button>
          <button type="button" class="lightbox__slideshow" aria-label="Play slideshow">
            ${this.#renderIcon("play")}
          </button>
          <a class="lightbox__download" aria-label="Download original">
            ${this.#renderIcon("download")}
          </a>
        </div>
        <button type="button" class="lightbox__close" command="request-close" aria-label="Close">
          ${this.#renderIcon("close")}
        </button>
        <button type="button" class="lightbox__previous" aria-label="Previous">
          ${this.#renderIcon("previous")}
        </button>
        <ul class="lightbox__slides" tabindex="0" autofocus aria-label="Slides"></ul>
        <button type="button" class="lightbox__next" aria-label="Next">
          ${this.#renderIcon("next")}
        </button>
        <div class="lightbox__strip" role="group" aria-label="Nearby pictures"></div>
        <p class="lightbox__status" aria-live="polite"></p>
      </div>`,
    });
    this.append(this.#dialog);
  }

  /** Adds one slide for each link to the track. */
  #buildSlides() {
    this.#slides = this.#buildItems("slides", (link) => this.#renderSlide(link));
  }

  /** Adds one thumbnail for each link to the strip. */
  #buildStrip() {
    this.#thumbnails = this.#buildItems("strip", (link) => this.#renderThumbnail(link));
  }

  /**
   * Adds one item for each link to a part of the lightbox. The track and the strip both use it.
   *
   * @template {HTMLElement} T
   * @param {"slides" | "strip"} name - The part to add the items to.
   * @param {(link: HTMLAnchorElement) => T} render - Makes the item for one link.
   * @returns {T[]} The new items, in the same order as the links.
   */
  #buildItems(name, render) {
    const items = this.#links.map(render);
    this.#part(name).append(...items);
    return items;
  }

  /**
   * Makes the slide for a link. A video link gets a video, and all other links get an image.
   *
   * @param {HTMLAnchorElement} link - The link to show.
   * @returns {HTMLLIElement} The new slide.
   */
  #renderSlide(link) {
    const slide = Object.assign(document.createElement("li"), {
      className: "lightbox__slide",
    });
    slide.append(
      link.type.startsWith("video/")
        ? this.#renderSlideVideo(link)
        : this.#renderImage(link, "l", "lightbox__media"),
    );
    return slide;
  }

  /**
   * Makes the video for a video link. The video does not load until the user plays it, and its
   * poster does not load until `#loadPosters` sets it.
   *
   * @param {HTMLAnchorElement} link - The video link.
   * @returns {HTMLVideoElement} The new video.
   */
  #renderSlideVideo(link) {
    return Object.assign(document.createElement("video"), {
      ariaLabel: this.#titleOf(link),
      className: "lightbox__media",
      controls: true,
      height: Number(link.dataset.lHeight),
      preload: "none",
      src: link.href,
      width: Number(link.dataset.lWidth),
    });
  }

  /**
   * Makes the strip thumbnail for a link. Only the current thumbnail is in the tab order, so the
   * strip is one tab stop.
   *
   * @param {HTMLAnchorElement} link - The link to show.
   * @returns {HTMLButtonElement} The new thumbnail.
   */
  #renderThumbnail(link) {
    const thumbnail = Object.assign(document.createElement("button"), {
      className: "lightbox__strip-item",
      tabIndex: -1,
      type: "button",
    });
    thumbnail.append(this.#renderImage(link, "s", "lightbox__strip-image"));
    return thumbnail;
  }

  /** Opens the lightbox when the user clicks a link. */
  #buildLinks() {
    this.addEventListener("click", (evt) => {
      this.#handleLinkClick(evt);
    });
  }

  /**
   * Opens the lightbox at the clicked link, instead of the original file.
   *
   * @param {MouseEvent} evt - The click.
   */
  #handleLinkClick(evt) {
    const link = /** @type {Element} */ (evt.target).closest("a");
    const index = link ? this.#links.indexOf(link) : -1;
    if (index === -1) {
      return;
    }
    evt.preventDefault();
    this.show(index);
  }

  /**
   * Connects the controls and the keys, and stops the slideshow and fullscreen mode when the
   * lightbox closes.
   */
  #buildControls() {
    this.#part("close").commandForElement = this.#dialog;
    this.#part("previous").addEventListener("click", () => {
      this.#scrollBySlides(-1);
    });
    this.#part("next").addEventListener("click", () => {
      this.#scrollBySlides(1);
    });
    this.#part("strip").addEventListener("click", (evt) => {
      this.#handleStripClick(evt);
    });
    this.#dialog.addEventListener("keydown", (evt) => {
      this.#handleDialogKeydown(evt);
    });
    this.#part("slideshow").addEventListener("click", () => {
      this.#setSlideshowPlaying(!this.#isSlideshowPlaying);
    });
    this.#dialog.addEventListener("close", () => {
      this.#setSlideshowPlaying(false);
      this.#setFullscreen(false);
    });
  }

  /**
   * Moves to the item that the user clicks in the strip.
   *
   * @param {MouseEvent} evt - The click.
   */
  #handleStripClick(evt) {
    const thumbnail = /** @type {Element} */ (evt.target).closest("button");
    const index = thumbnail ? this.#thumbnails.indexOf(thumbnail) : -1;
    if (index !== -1) {
      this.#scrollToSlide(index);
    }
  }

  /**
   * Handles a key press anywhere in the lightbox: Esc, and the Left and Right arrow keys.
   *
   * @param {KeyboardEvent} evt - The key press.
   */
  #handleDialogKeydown(evt) {
    if (evt.key === "Escape") {
      this.#handleEscape(evt);
    } else {
      this.#handleArrowKey(evt);
    }
  }

  /**
   * Stops fullscreen mode, and keeps the lightbox open. Outside fullscreen mode, Esc closes the
   * lightbox. If the browser shows the lightbox in fullscreen, the browser uses Esc to leave
   * fullscreen, and the page does not get the key. Thus the first Esc stops fullscreen mode in all
   * browsers, and the next Esc closes the lightbox.
   *
   * @param {KeyboardEvent} evt - The key press.
   */
  #handleEscape(evt) {
    if (this.#isFullscreen) {
      evt.preventDefault();
      this.#setFullscreen(false);
    }
  }

  /**
   * Moves one slide when the user presses the Left or Right arrow key. The browser ignores an arrow
   * key during a scroll, so the component does the move. A focused video keeps its arrow keys.
   *
   * @param {KeyboardEvent} evt - The key press.
   */
  #handleArrowKey(evt) {
    const delta = FramLightbox.ARROW_KEY_DELTAS[evt.key];
    if (!delta || evt.target instanceof HTMLVideoElement || this.#hasModifier(evt)) {
      return;
    }
    evt.preventDefault();
    this.#scrollBySlides(delta);
  }

  /**
   * Tells if the user holds a modifier key. The browser keeps modified arrow keys, for example
   * Alt+Left to go back.
   *
   * @param {KeyboardEvent} evt - The key press.
   * @returns {boolean} True if Alt, Control, or Meta is down.
   */
  #hasModifier(evt) {
    return evt.altKey || evt.ctrlKey || evt.metaKey;
  }

  /**
   * Starts or stops the slideshow. The button shows the action that it does next: pause while the
   * slideshow plays, and play at all other times. The status is silent while the slideshow plays,
   * so a screen reader does not announce each step.
   *
   * @param {boolean} isPlaying - True to start the slideshow, false to stop it.
   */
  #setSlideshowPlaying(isPlaying) {
    this.#isSlideshowPlaying = isPlaying;
    this.#setButtonAction(
      this.#part("slideshow"),
      isPlaying ? "Pause slideshow" : "Play slideshow",
      isPlaying ? "pause" : "play",
    );
    this.#part("status").ariaLive = isPlaying ? "off" : "polite";
    this.#scheduleSlideshowStep();
  }

  /**
   * Starts a new wait for the next slideshow step, and cancels the current wait. `#select` also
   * calls this method, so a manual move starts a new full wait.
   */
  #scheduleSlideshowStep() {
    clearTimeout(this.#slideshowTimer);
    if (this.#isSlideshowPlaying) {
      this.#slideshowTimer = setTimeout(() => {
        this.#stepSlideshow();
      }, this.#scheduleSlideshowStepDelayMs());
    }
  }

  /**
   * Reads the slideshow delay from `slideshow-delay-ms`.
   *
   * @returns {number} The time in milliseconds that the slideshow shows each slide.
   */
  #scheduleSlideshowStepDelayMs() {
    return this.#positiveIntegerAttribute(
      "slideshow-delay-ms",
      FramLightbox.SLIDESHOW_DELAY_MS_DEFAULT,
    );
  }

  /** Does one slideshow step. The slideshow waits while a video plays, and stops at the end. */
  #stepSlideshow() {
    const video = this.#slides[this.#indexCurrent].querySelector("video");
    if (video && !video.paused && !video.ended) {
      this.#scheduleSlideshowStep();
    } else if (this.#indexCurrent === this.#links.length - 1) {
      this.#setSlideshowPlaying(false);
    } else {
      this.#scrollBySlides(1);
    }
  }

  /**
   * Connects the fullscreen button, the fullscreen of the browser, and the activity that shows the
   * controls in fullscreen mode.
   */
  #buildFullscreen() {
    this.#part("fullscreen").addEventListener("click", () => {
      this.#setFullscreen(!this.#isFullscreen);
    });
    this.#dialog.addEventListener("fullscreenchange", () => {
      this.#handleFullscreenChange();
    });
    this.#dialog.addEventListener("keydown", (evt) => {
      this.#handleActivity(evt);
    });
    this.#dialog.addEventListener("pointerdown", (evt) => {
      this.#handleActivity(evt);
    });
    this.#dialog.addEventListener("pointermove", (evt) => {
      this.#handleActivity(evt);
    });
    this.#part("slides").addEventListener("pointerup", (evt) => {
      this.#handleTrackPointerup(evt);
    });
  }

  /** Stops fullscreen mode when the user leaves the browser fullscreen, for example with Esc. */
  #handleFullscreenChange() {
    if (!this.#isBrowserFullscreen()) {
      this.#setFullscreen(false);
    }
  }

  /**
   * Shows the controls on activity: a key press, a pointer press, or a pointer move. A touch on the
   * track does not count, because a tap there shows or hides the controls, and a swipe moves the
   * slides.
   *
   * @param {KeyboardEvent | PointerEvent} evt - The activity.
   */
  #handleActivity(evt) {
    this.#noteFocusSource(evt);
    if (!this.#isTrackTouch(evt)) {
      this.#showControls();
    }
  }

  /**
   * Shows or hides the controls when the user taps the track. A swipe scrolls the track, so the
   * browser cancels the pointer and sends no `pointerup`.
   *
   * @param {PointerEvent} evt - The end of the pointer press.
   */
  #handleTrackPointerup(evt) {
    if (this.#isTrackTouch(evt)) {
      this.#toggleControls();
    }
  }

  /**
   * Notes if the next focus move comes from the Tab key or from a pointer.
   *
   * @param {KeyboardEvent | PointerEvent} evt - The activity.
   */
  #noteFocusSource(evt) {
    if (evt.type === "pointerdown") {
      this.#isTabFocus = false;
    } else if (evt instanceof KeyboardEvent && evt.key === "Tab") {
      this.#isTabFocus = true;
    }
  }

  /**
   * Tells if an event is a touch on the track.
   *
   * @param {KeyboardEvent | PointerEvent} evt - The event.
   * @returns {boolean} True if the event comes from a touch on the track.
   */
  #isTrackTouch(evt) {
    return (
      evt instanceof PointerEvent &&
      evt.pointerType === "touch" &&
      this.#part("slides").contains(/** @type {Node} */ (evt.target))
    );
  }

  /**
   * Starts or stops fullscreen mode. Fullscreen mode makes the lightbox fill the page, and asks the
   * browser to show the frame in fullscreen. If the browser has no fullscreen, or refuses it, the
   * lightbox still fills the page. The button shows the action that it does next.
   *
   * @param {boolean} isFullscreen - True to start fullscreen mode, false to stop it.
   */
  #setFullscreen(isFullscreen) {
    if (isFullscreen === this.#isFullscreen) {
      return;
    }
    this.#isFullscreen = isFullscreen;
    this.#dialog.classList.toggle("lightbox--fullscreen", isFullscreen);
    this.#setButtonAction(
      this.#part("fullscreen"),
      isFullscreen ? "Exit full screen" : "Enter full screen",
      isFullscreen ? "compress" : "expand",
    );
    this.#loadSlideImages();
    this.#showControls();
    this.#setBrowserFullscreen(isFullscreen);
  }

  /**
   * Asks the browser to show the frame in fullscreen, or to leave fullscreen. A refusal keeps
   * fullscreen mode in the page.
   *
   * @param {boolean} isFullscreen - True to show the frame in fullscreen, false to leave it.
   */
  #setBrowserFullscreen(isFullscreen) {
    const frame = this.#part("frame");
    if (isFullscreen && document.fullscreenEnabled) {
      frame.requestFullscreen().catch(() => {});
    } else if (!isFullscreen && this.#isBrowserFullscreen()) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * Tells if the browser shows the frame in fullscreen.
   *
   * @returns {boolean} True if the frame is the fullscreen element.
   */
  #isBrowserFullscreen() {
    return document.fullscreenElement === this.#part("frame");
  }

  /**
   * Sets the images of the slides for the mode. A slide image that is not near the view does not
   * load, because the image loads lazily. The browser keeps the previous image in view until the
   * new image loads.
   */
  #loadSlideImages() {
    for (const [i, slide] of this.#slides.entries()) {
      this.#loadSlideImage(slide, this.#links[i]);
    }
  }

  /**
   * Sets the image of one slide for the mode. A video without a poster keeps none, because
   * `#loadPosters` sets the posters near the current slide.
   *
   * @param {HTMLLIElement} slide - The slide.
   * @param {HTMLAnchorElement} link - The link of the slide.
   */
  #loadSlideImage(slide, link) {
    const media = /** @type {HTMLImageElement | HTMLVideoElement} */ (slide.firstElementChild);
    if (!(media instanceof HTMLVideoElement)) {
      Object.assign(media, this.#imageAttributes(link, this.#slideVariant(link)));
    } else if (media.poster) {
      media.poster = this.#posterSrc(link);
    }
  }

  /** Shows the controls. In fullscreen mode, a new wait then starts before they hide. */
  #showControls() {
    clearTimeout(this.#controlsTimer);
    this.#dialog.classList.remove("lightbox--idle");
    if (this.#isFullscreen) {
      this.#controlsTimer = setTimeout(() => {
        this.#hideUnusedControls();
      }, FramLightbox.CONTROLS_IDLE_MS);
    }
  }

  /**
   * Hides the controls. A hidden control loses the focus, and some browsers then move the focus out
   * of the lightbox, where the keys of the lightbox do not work. Thus the focus first moves from a
   * control to the track.
   */
  #hideControls() {
    clearTimeout(this.#controlsTimer);
    if (this.#dialog.querySelector(`${FramLightbox.CONTROLS_SELECTOR}:focus-within`)) {
      this.#part("slides").focus({ preventScroll: true });
    }
    this.#dialog.classList.add("lightbox--idle");
  }

  /** Shows the controls if they are hidden, and hides them if not. */
  #toggleControls() {
    if (this.#dialog.classList.contains("lightbox--idle")) {
      this.#showControls();
    } else {
      this.#hideControls();
    }
  }

  /** Hides the controls at the end of the wait, unless the user uses a control. */
  #hideUnusedControls() {
    if (this.#isControlInUse()) {
      this.#showControls();
    } else {
      this.#hideControls();
    }
  }

  /**
   * Tells if the user uses a control. A control is in use while the pointer is on it, or while it
   * has the focus from the Tab key.
   *
   * @returns {boolean} True if a control is in use.
   */
  #isControlInUse() {
    const states = [
      ...(FramLightbox.CAN_HOVER.matches ? [":hover"] : []),
      ...(this.#isTabFocus ? [":focus-within"] : []),
    ];
    const selector = `${FramLightbox.CONTROLS_SELECTOR}:is(${states.join(", ")})`;
    return states.length > 0 && this.#dialog.querySelector(selector) !== null;
  }

  /** Connects the scroll, size, and visibility events of the track. */
  #buildTrack() {
    const track = this.#part("slides");
    // A swipe can stop a scroll before the scroll gets to its target slide.
    track.addEventListener("scrollend", () => {
      this.#indexTarget = null;
    });
    this.#buildTrackResizeObserver(track);
    this.#buildTrackObserver(track);
  }

  /**
   * Watches the size of the track.
   *
   * @param {HTMLUListElement} track - The track of slides.
   */
  #buildTrackResizeObserver(track) {
    new ResizeObserver(([entry]) => {
      this.#handleTrackResize(entry);
    }).observe(track);
  }

  /**
   * Watches which slide fills the track.
   *
   * @param {HTMLUListElement} track - The track of slides.
   */
  #buildTrackObserver(track) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this.#handleSlideIntersection(entry);
        }
      },
      { root: track, threshold: FramLightbox.SLIDE_VISIBLE_RATIO },
    );
    for (const slide of this.#slides) {
      observer.observe(slide);
    }
  }

  /**
   * Keeps the target or current item in view when the track changes size, for example when
   * fullscreen mode starts or stops. A change of size moves the slides and the thumbnails. When the
   * lightbox opens, the track also gets a size, but `show` already scrolls to the slide.
   *
   * @param {ResizeObserverEntry} entry - The change of size.
   */
  #handleTrackResize(entry) {
    const inlineSizePrevious = this.#trackInlineSize;
    this.#trackInlineSize = entry.contentRect.width;
    if (inlineSizePrevious && this.#trackInlineSize) {
      this.#revealItem(this.#indexTargetOrCurrent(), "instant");
    }
  }

  /**
   * Makes the slide that fills the track the current slide. A slide that goes out of view stops
   * its video. This also occurs when the lightbox closes.
   *
   * @param {IntersectionObserverEntry} entry - The change for one slide.
   */
  #handleSlideIntersection(entry) {
    if (entry.isIntersecting) {
      this.#select(this.#slides.indexOf(/** @type {HTMLLIElement} */ (entry.target)));
    } else {
      entry.target.querySelector("video")?.pause();
    }
  }

  /**
   * Moves a number of slides from the target slide, or from the current slide if no scroll runs.
   *
   * @param {number} delta - The number of slides to move: -1 for previous, 1 for next.
   */
  #scrollBySlides(delta) {
    this.#scrollToSlide(this.#indexTargetOrCurrent() + delta);
  }

  /**
   * Scrolls the track and the strip to an item. An index that has no item does nothing.
   *
   * @param {number} index - The index of the item.
   * @param {ScrollBehavior} [behavior] - The scroll behavior.
   */
  #scrollToSlide(index, behavior = this.#scrollBehavior()) {
    if (!this.#slides[index]) {
      return;
    }
    this.#indexTarget = index;
    this.#revealItem(index, behavior);
  }

  /**
   * Scrolls the slide and the thumbnail of an item into view.
   *
   * @param {number} index - The index of the item.
   * @param {ScrollBehavior} behavior - The scroll behavior.
   */
  #revealItem(index, behavior) {
    this.#reveal(this.#slides[index], behavior);
    this.#reveal(this.#thumbnails[index], behavior);
  }

  /**
   * Scrolls a slide or a thumbnail to the center of its track. A slide fills the track, so its
   * center is also its start.
   *
   * @param {HTMLElement} element - The slide or the thumbnail.
   * @param {ScrollBehavior} behavior - The scroll behavior.
   */
  #reveal(element, behavior) {
    element.scrollIntoView({ behavior, block: "nearest", inline: "center" });
  }

  /**
   * Gets the slide that a scroll moves to, or the current slide if no scroll runs.
   *
   * @returns {number} The index of the slide.
   */
  #indexTargetOrCurrent() {
    return this.#indexTarget ?? this.#indexCurrent;
  }

  /**
   * Gets the scroll behavior for the motion setting of the user.
   *
   * @returns {ScrollBehavior} Instant if the user prefers reduced motion, and smooth if not.
   */
  #scrollBehavior() {
    return FramLightbox.REDUCED_MOTION.matches ? "instant" : "smooth";
  }

  /**
   * Makes a slide current, and updates the controls, the strip, the status, the posters, and the
   * slideshow wait for it.
   *
   * @param {number} index - The index of the new current slide.
   */
  #select(index) {
    this.#indexCurrent = index;
    if (index === this.#indexTarget) {
      this.#indexTarget = null;
    }
    this.#updateControls(index);
    this.#updateStrip(index);
    this.#updateStatus(index);
    this.#loadPosters(index);
    this.#scheduleSlideshowStep();
  }

  /**
   * Updates the previous, next, and download controls for the current slide.
   *
   * @param {number} index - The index of the current slide.
   */
  #updateControls(index) {
    const link = this.#links[index];
    this.#part("previous").disabled = index === 0;
    this.#part("next").disabled = index === this.#links.length - 1;
    Object.assign(this.#part("download"), {
      download: this.#titleOf(link),
      href: link.href,
    });
  }

  /**
   * Marks the current thumbnail and makes it the tab stop of the strip. If the strip has focus,
   * the focus moves to the current thumbnail, so the arrow keys work in the strip. After a swipe,
   * the strip scrolls to the current thumbnail. During a scroll to a target, the strip is already
   * on its way to the target.
   *
   * @param {number} index - The index of the current item.
   */
  #updateStrip(index) {
    const current = this.#thumbnails[index];
    const hasFocus = this.#part("strip").contains(document.activeElement);
    for (const thumbnail of this.#thumbnails) {
      thumbnail.ariaCurrent = thumbnail === current ? "true" : null;
      thumbnail.tabIndex = thumbnail === current ? 0 : -1;
    }
    if (hasFocus) {
      current.focus({ preventScroll: true });
    }
    if (this.#indexTarget === null) {
      this.#reveal(current, this.#scrollBehavior());
    }
  }

  /**
   * Tells a screen reader which slide is current. Arrow keys move the slides but keep the focus
   * on the track, so a screen reader does not announce the new slide on its own.
   *
   * @param {number} index - The index of the current slide.
   */
  #updateStatus(index) {
    this.#part("status").textContent =
      `${index + 1} of ${this.#links.length}: ${this.#titleOf(this.#links[index])}`;
  }

  /**
   * Sets the posters of the videos in a slide and its neighbors. The browser loads a poster as
   * soon as the video has one, even in a closed lightbox, so the videos get them only near the
   * current slide.
   *
   * @param {number} index - The index of the current slide.
   */
  #loadPosters(index) {
    for (const i of [index - 1, index, index + 1]) {
      const video = this.#slides[i]?.querySelector("video");
      if (video && !video.poster) {
        video.poster = this.#posterSrc(this.#links[i]);
      }
    }
  }

  /**
   * Sets the accessible name and the icon of a button that shows the action that it does next.
   *
   * @param {HTMLButtonElement} button - The button.
   * @param {string} label - The accessible name.
   * @param {IconName} icon - The icon.
   */
  #setButtonAction(button, label, icon) {
    button.ariaLabel = label;
    button.innerHTML = this.#renderIcon(icon);
  }

  /**
   * Makes the SVG markup for an icon. The icon is decoration, so the control around it gives the
   * accessible name.
   *
   * @param {IconName} name - The icon to make.
   * @returns {string} The SVG markup.
   */
  #renderIcon(name) {
    return `<svg class="lightbox__icon" viewBox="0 0 640 640" aria-hidden="true"><path d="${FramLightbox.ICON_PATHS[name]}"/></svg>`;
  }

  /**
   * Makes an image from one of the images that a link gives.
   *
   * @param {string} className - The class of the new image.
   * @param {HTMLAnchorElement} link - The link that gives the image.
   * @param {ImageVariant} variant - The image to use.
   * @returns {HTMLImageElement} The new image.
   */
  #renderImage(link, variant, className) {
    return Object.assign(document.createElement("img"), {
      ...this.#imageAttributes(link, variant),
      alt: this.#titleOf(link),
      className,
      loading: "lazy",
    });
  }

  /**
   * Gets the source and the size of one of the images that a link gives.
   *
   * @param {HTMLAnchorElement} link - The link that gives the image.
   * @param {ImageVariant} variant - The image to use.
   * @returns {{height: number, src: string, width: number}} The image attributes.
   */
  #imageAttributes(link, variant) {
    return {
      height: Number(link.dataset[`${variant}Height`]),
      src: link.dataset[`${variant}Src`] ?? "",
      width: Number(link.dataset[`${variant}Width`]),
    };
  }

  /**
   * Gets the image variant that a slide shows: the `xl` image in fullscreen mode, if the link gives
   * one, and the `l` image at all other times.
   *
   * @param {HTMLAnchorElement} link - The link of the slide.
   * @returns {ImageVariant} The variant.
   */
  #slideVariant(link) {
    return this.#isFullscreen && link.dataset.xlSrc ? "xl" : "l";
  }

  /**
   * Gets the poster of a video slide, for the mode.
   *
   * @param {HTMLAnchorElement} link - The video link.
   * @returns {string} The URL of the poster.
   */
  #posterSrc(link) {
    return link.dataset[`${this.#slideVariant(link)}Src`] ?? "";
  }

  /**
   * Gets the title of an item, from the alt text of its thumbnail.
   *
   * @param {HTMLAnchorElement} link - The link of the item.
   * @returns {string} The title.
   */
  #titleOf(link) {
    return /** @type {HTMLImageElement} */ (link.querySelector("img")).alt;
  }

  /**
   * Reads a positive whole number from an attribute. The component reads the attribute each time,
   * so a change while the page is open has an effect.
   *
   * @param {string} name - The name of the attribute.
   * @param {number} fallback - The value if the attribute is absent or invalid.
   * @returns {number} The number.
   */
  #positiveIntegerAttribute(name, fallback) {
    const value = Number(this.getAttribute(name));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  /**
   * Finds a part of the lightbox dialog.
   *
   * @template {keyof LightboxParts} K
   * @param {K} name - The BEM element name of the part.
   * @returns {LightboxParts[K]} The part.
   */
  #part(name) {
    return /** @type {LightboxParts[K]} */ (this.#dialog.querySelector(`.lightbox__${name}`));
  }
}

customElements.define("fram-lightbox", FramLightbox);
