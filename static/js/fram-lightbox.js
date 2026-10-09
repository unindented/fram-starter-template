/**
 * The parts of the lightbox dialog that the component uses, by BEM element name.
 *
 * @typedef {object} LightboxParts
 * @property {HTMLButtonElement} close
 * @property {HTMLAnchorElement} download
 * @property {HTMLButtonElement} next
 * @property {HTMLButtonElement} previous
 * @property {HTMLButtonElement} slideshow
 * @property {HTMLUListElement} slides
 * @property {HTMLDivElement} strip
 */

/** @typedef {keyof typeof FramLightbox.ICON_PATHS} IconName */

/**
 * A lightbox for a list of links. Each link is in an item of the child list, points to an original
 * file, and holds a thumbnail image. Without JavaScript, the links open the original files.
 *
 * Each link gives its images in data attributes:
 * - `data-large-src`: the image that the lightbox shows. For a video, this image is the poster.
 * - `data-small-src`: the thumbnail image in the strip.
 * - `data-large-width`, `data-large-height`, `data-small-width` and `data-small-height`: the image
 *   sizes. They keep the space for each image before it loads.
 *
 * A link with `type="video/..."` shows a video.
 *
 * Optional attributes on the element:
 * - `label`: the accessible name of the lightbox, for example the album title.
 * - `slideshow-delay-ms`: the time in milliseconds that the slideshow shows each slide. If it is
 *   absent or is not a positive whole number, the component uses the default value.
 *
 * Methods:
 * - `show(index)`: opens the lightbox at the link with that index.
 */
class FramLightbox extends HTMLElement {
  /** The slideshow delay in milliseconds, if `slideshow-delay-ms` has no valid value. */
  static SLIDESHOW_DELAY_MS_DEFAULT = 5000;

  /** The part of a slide that must be in view for the slide to be the current slide. */
  static SLIDE_VISIBLE_RATIO = 0.5;

  /**
   * The motion setting of the user. A scripted smooth scroll ignores this setting, so the
   * component checks it. The value changes when the user changes the setting.
   */
  static REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)");

  /** The SVG path data of the control icons, in a 640 by 640 box. */
  static ICON_PATHS = {
    close:
      "M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z",
    download:
      "M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z",
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

  /** True while the slideshow plays. */
  #isSlideshowPlaying = false;

  /**
   * The timer for the next slideshow step.
   *
   * @type {number | undefined}
   */
  #slideshowTimer;

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
    this.#links = /** @type {HTMLAnchorElement[]} */ ([...this.querySelectorAll(":scope > ul > li > a")]);
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
    this.#slides = this.#buildItems("slides", (link) => this.#renderSlide(link));
    this.#thumbnails = this.#buildItems("strip", (link) => this.#renderThumbnail(link));
    this.#buildLinks();
    this.#buildControls();
    this.#buildTrack();
  }

  /** Fills the dialog with its controls, and adds it to the element. */
  #buildDialog() {
    Object.assign(this.#dialog, {
      ariaLabel: this.getAttribute("label"),
      className: "lightbox",
      closedBy: "any",
      innerHTML: `
      <div class="lightbox__actions">
        <!--button type="button" class="lightbox__info" aria-label="Info">
          ${this.#renderIcon("info")}
        </button-->
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
      <ul class="lightbox__slides" tabindex="0" autofocus></ul>
      <button type="button" class="lightbox__next" aria-label="Next">
        ${this.#renderIcon("next")}
      </button>
      <div class="lightbox__strip" role="group" aria-label="Nearby pictures"></div>`,
    });
    this.append(this.#dialog);
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
        : this.#renderImage(link, "large", "lightbox__media"),
    );
    return slide;
  }

  /**
   * Makes the video for a video link. The video does not load until the user plays it.
   *
   * @param {HTMLAnchorElement} link - The video link.
   * @returns {HTMLVideoElement} The new video.
   */
  #renderSlideVideo(link) {
    return Object.assign(document.createElement("video"), {
      ariaLabel: this.#titleOf(link),
      className: "lightbox__media",
      controls: true,
      height: Number(link.dataset.largeHeight),
      poster: link.dataset.largeSrc,
      preload: "none",
      src: link.href,
      width: Number(link.dataset.largeWidth),
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
    thumbnail.append(this.#renderImage(link, "small", "lightbox__strip-image"));
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
    const link = /** @type {Element} */ (evt.target).closest("a"),
      index = link ? this.#links.indexOf(link) : -1;
    if (index === -1) {
      return;
    }
    evt.preventDefault();
    this.show(index);
  }

  /** Connects the controls and the arrow keys, and stops the slideshow when the lightbox closes. */
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
    });
  }

  /**
   * Moves one slide when the user presses the Left or Right arrow key anywhere in the lightbox. The
   * browser ignores an arrow key during a scroll, so the component does the move. A focused video
   * keeps its arrow keys.
   *
   * @param {KeyboardEvent} evt - The key press.
   */
  #handleDialogKeydown(evt) {
    const delta = /** @type {Partial<Record<string, number>>} */ ({
      ArrowLeft: -1,
      ArrowRight: 1,
    })[evt.key];
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
   * Moves to the item that the user clicks in the strip.
   *
   * @param {MouseEvent} evt - The click.
   */
  #handleStripClick(evt) {
    const thumbnail = /** @type {Element} */ (evt.target).closest("button"),
      index = thumbnail ? this.#thumbnails.indexOf(thumbnail) : -1;
    if (index !== -1) {
      this.#scrollToSlide(index);
    }
  }

  /**
   * Starts or stops the slideshow. The button shows the action that it does next: pause while the
   * slideshow plays, and play at all other times.
   *
   * @param {boolean} isPlaying - True to start the slideshow, false to stop it.
   */
  #setSlideshowPlaying(isPlaying) {
    const button = this.#part("slideshow");
    this.#isSlideshowPlaying = isPlaying;
    button.ariaLabel = isPlaying ? "Pause slideshow" : "Play slideshow";
    button.innerHTML = this.#renderIcon(isPlaying ? "pause" : "play");
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

  /** Connects the scroll and visibility events of the track. */
  #buildTrack() {
    const track = this.#part("slides");
    // A swipe can stop a scroll before the scroll gets to its target slide.
    track.addEventListener("scrollend", () => {
      this.#indexTarget = null;
    });
    this.#buildTrackObserver(track);
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
    this.#scrollToSlide((this.#indexTarget ?? this.#indexCurrent) + delta);
  }

  /**
   * Scrolls the track and the strip to an item. An index that has no item does nothing.
   *
   * @param {number} index - The index of the item.
   * @param {ScrollBehavior} [behavior] - The scroll behavior.
   */
  #scrollToSlide(index, behavior = this.#scrollBehavior()) {
    const slide = this.#slides[index];
    if (!slide) {
      return;
    }
    this.#indexTarget = index;
    this.#reveal(slide, behavior);
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
   * Gets the scroll behavior for the motion setting of the user.
   *
   * @returns {ScrollBehavior} Instant if the user prefers reduced motion, and smooth if not.
   */
  #scrollBehavior() {
    return FramLightbox.REDUCED_MOTION.matches ? "instant" : "smooth";
  }

  /**
   * Makes a slide current, and updates the controls, the strip, and the slideshow wait for it.
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
    const current = this.#thumbnails[index],
      hasFocus = this.#part("strip").contains(document.activeElement);
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
   * Makes an image from one of the images that a link gives.
   *
   * @param {string} className - The class of the new image.
   * @param {HTMLAnchorElement} link - The link that gives the image.
   * @param {"large" | "small"} variant - The image to use.
   * @returns {HTMLImageElement} The new image.
   */
  #renderImage(link, variant, className) {
    return Object.assign(document.createElement("img"), {
      alt: this.#titleOf(link),
      className,
      height: Number(link.dataset[`${variant}Height`]),
      loading: "lazy",
      src: link.dataset[`${variant}Src`],
      width: Number(link.dataset[`${variant}Width`]),
    });
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
