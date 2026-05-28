import { createTag, getLibs } from '../../scripts/utils.js';

// Constants
const GNAV_HEIGHT = 64;
const LANA_OPTIONS = { tags: 'firefly-model-showcase', errorType: 'i' };
const GALLERY_FALLBACK_URL = '/cc-shared/ff-gallery-assets.json';
const CHICKET_ICONS = [
  {
    name: 'adobe',
    // eslint-disable-next-line quotes
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 30" fill="none"><path d="M0 4.67188H16.3318V9.9804H6.21133V13.8173H15.1672V19.1259H6.21133V27.0435H0V4.67188Z" fill="white"/><path d="M18.9414 9.61035H24.7916V27.0526H18.9414V9.61035Z" fill="white"/><path d="M22.8671 6.387L24.9525 6.85646C25.7741 7.03703 26.3429 6.06199 25.7651 5.44808L24.3206 3.88622C24.131 3.67857 24.0497 3.3987 24.1129 3.11883L24.5824 1.04237C24.763 0.22984 23.7879 -0.33893 23.165 0.229841L21.5941 1.67434C21.3864 1.86393 21.0975 1.93615 20.8267 1.88198L18.7412 1.41252C17.9197 1.23196 17.3509 2.20699 17.9287 2.8209L19.3732 4.38277C19.5628 4.59041 19.644 4.87028 19.5808 5.15015L19.1114 7.22662C18.9308 8.03915 19.9058 8.60792 20.5288 8.03915L22.0997 6.59465C22.3073 6.40506 22.5962 6.33284 22.8671 6.387Z" fill="white"/></svg>`,
  },
  {
    name: 'openai',
    // eslint-disable-next-line quotes
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 28" fill="none"><path d="M24.9988 11.2965C25.6142 9.4171 25.4023 7.35827 24.4182 5.64876C22.9382 3.02671 19.9631 1.67773 17.0575 2.31254C15.7649 0.830733 13.9077 -0.0119472 11.9607 0.000128018C8.9907 -0.00677213 6.35545 1.93907 5.44172 4.81471C3.53373 5.21233 1.88681 6.42762 0.923073 8.15007C-0.567886 10.7652 -0.227992 14.0618 1.76391 16.3043C1.14854 18.1837 1.36044 20.2426 2.34453 21.9521C3.82447 24.5741 6.7996 25.9231 9.70524 25.2883C10.997 26.7701 12.855 27.6128 14.802 27.5999C17.7737 27.6076 20.4098 25.6601 21.3235 22.7818C23.2315 22.3842 24.8784 21.1689 25.8422 19.4465C27.3314 16.8313 26.9907 13.5374 24.9996 11.2948L24.9988 11.2965ZM14.8037 25.7963C13.6144 25.7981 12.4625 25.3746 11.5497 24.5992C11.5912 24.5767 11.6632 24.5362 11.7099 24.5069L17.1109 21.3328C17.3872 21.1732 17.5567 20.8739 17.555 20.5505V12.8025L19.8377 14.1437C19.8622 14.1558 19.8783 14.1799 19.8817 14.2075V20.6238C19.8783 23.477 17.6076 25.7903 14.8037 25.7963ZM3.88295 21.0499C3.28708 20.0028 3.07263 18.7754 3.27691 17.5843C3.31674 17.6084 3.3871 17.6524 3.43711 17.6818L8.83812 20.8558C9.1119 21.0188 9.45095 21.0188 9.72558 20.8558L16.3192 16.9814V19.6638C16.3209 19.6914 16.3082 19.7182 16.287 19.7354L10.8275 22.9431C8.39567 24.368 5.29 23.521 3.8838 21.0499H3.88295ZM2.4615 9.05312C3.05483 8.0043 3.99145 7.20216 5.10691 6.78556C5.10691 6.833 5.10437 6.91666 5.10437 6.97532V13.3243C5.10267 13.6469 5.2722 13.9462 5.54767 14.1058L12.1413 17.9793L9.85865 19.3205C9.83577 19.3361 9.80695 19.3387 9.78152 19.3274L4.32117 16.1171C1.89444 14.6871 1.06208 11.5277 2.46065 9.05398L2.4615 9.05312ZM21.2159 13.4942L14.6223 9.6198L16.9049 8.27944C16.9278 8.26392 16.9566 8.26133 16.982 8.27254L22.4424 11.4802C24.8734 12.9094 25.7066 16.074 24.3021 18.5477C23.7079 19.5948 22.7721 20.397 21.6575 20.8144V14.2757C21.66 13.9531 21.4914 13.6547 21.2167 13.4942H21.2159ZM23.4875 10.0148C23.4477 9.98982 23.3773 9.94669 23.3273 9.91737L17.9263 6.7433C17.6525 6.58028 17.3134 6.58028 17.0388 6.7433L10.4452 10.6177V7.9353C10.4435 7.9077 10.4562 7.88096 10.4774 7.86371L15.9369 4.65859C18.3687 3.23112 21.4778 4.0807 22.8798 6.55613C23.4722 7.6015 23.6867 8.82542 23.4858 10.0148H23.4875ZM9.20429 14.7958L6.92081 13.4546C6.89623 13.4425 6.88013 13.4183 6.87674 13.3907V6.97445C6.87843 4.11779 9.15598 1.80279 11.9633 1.80452C13.1508 1.80452 14.3002 2.22888 15.2131 3.00169C15.1715 3.02412 15.1003 3.06466 15.0529 3.09398L9.65184 6.26805C9.37551 6.42762 9.20599 6.72605 9.20768 7.04949L9.20429 14.794V14.7958ZM10.4444 12.0754L13.3814 10.3495L16.3183 12.0745V15.5255L13.3814 17.2505L10.4444 15.5255V12.0754Z" fill="black"/></svg>`,
  },
  {
    name: 'google',
    // eslint-disable-next-line quotes
    svg: `<?xml version="1.0" encoding="utf-8"?><svg viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>`,
  },
  {
    name: 'ideogram',
    // eslint-disable-next-line quotes
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" style="fill: none; stroke: rgb(0, 0, 0); stroke-width: 68; stroke-linecap: round; stroke-linejoin: round;"><path d="M377.87 204.445H237.224M377.87 696.305H237.224M44.007 450.582h334.226M390.122 816.411H355.82zm0-244.024c67.386 0 122.013 54.627 122.013 122.012 0 67.386-54.627 122.012-122.013 122.012m0-732.922H355.82zm0 488.898H117.421m272.701-244.874H117.421m272.701 0c9.259 0 18.276 1.88 26.944 3.834 54.421 12.267 95.069 60.9 95.069 119.028 0 67.385-54.627 122.012-122.013 122.012m0-488.898c67.386 0 122.013 54.627 122.013 122.012 0 67.386-54.627 122.012-122.013 122.012"></path><path d="M665.607 313.656c0-36.554-20.93-69.879-53.858-85.751a95.194 95.194 0 0 0-100.631 11.28m297.28-7.97a95.194 95.194 0 0 0-95.193 0 95.194 95.194 0 0 0-47.598 82.441M667.655 523.686a95.193 95.193 0 0 0-140.773-64.862l.046.02a95.03 95.03 0 0 0-16.274 11.72m157.001 53.122c8.904 42.224 45 72.918 87.63 75.374l-.017.11a95.154 95.154 0 0 0 26.509-2.166"></path><path d="M474.213 798.357a95.597 95.597 0 0 1-4.59-10.63m306.374-567.765A210.825 210.825 0 0 0 673.055 76.897a210.824 210.824 0 0 0-222.857 9.3M760.802 408.85c38.502 0 73.214-23.193 87.948-58.766 14.734-35.571 6.588-76.516-20.637-103.741a95.194 95.194 0 0 0-52.116-26.38M651.123 730.766c22.06 33.771 63.01 49.972 102.204 40.435 39.194-9.537 68.122-42.74 72.199-82.872 3.713-36.594-13.99-72.054-45.469-91.08 46.652-9.636 78.999-52.274 75.71-99.796-3.462-49.897-44.948-88.605-94.965-88.604M474.526 798.955c22.257 43.26 73.552 62.778 118.936 45.253 45.385-17.524 70.253-66.45 57.661-113.441M450.198 86.197a210.67 210.67 0 0 0-8.922 6.704"></path></svg>`,
  },
  {
    name: 'runway',
    // eslint-disable-next-line quotes
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none"><path d="M16.1459 21.1639C13.5943 21.3984 11.4607 18.3919 9.82522 16.867C8.99826 22.8584 -0.00614527 22.2905 3.14725e-06 16.2126C0.00307742 13.6599 3.14725e-06 7.4215 3.14725e-06 4.94899C3.14725e-06 4.06 0.242866 3.16483 0.697852 2.40549C1.56171 0.933096 3.23101 -0.0176296 4.93106 0.000891075C7.49189 0.00397785 13.6587 -0.0021957 16.1459 0.000891075C22.1959 0.000891075 22.7708 9.05131 16.7914 9.86622L19.629 12.7154C22.7461 15.6631 20.4067 21.2935 16.1459 21.1639ZM14.7717 17.5985C16.5301 19.4198 19.3369 16.5985 17.5261 14.8328L12.6073 9.894H9.85597C9.85597 10.1625 9.85597 12.4652 9.85597 12.6598L14.1076 16.9287L14.7717 17.5985ZM2.97892 16.2157C2.93896 18.7468 6.91393 18.7562 6.87397 16.2157V4.94899C6.90779 3.6865 5.57972 2.6833 4.38077 3.07223C4.32851 3.08766 4.27933 3.10309 4.2332 3.12162C3.48003 3.40251 2.95741 4.17729 2.97892 4.98603V16.2157ZM16.1459 6.90292C18.6729 6.94304 18.6698 2.95184 16.1459 2.99197H9.46553C9.97278 4.06617 9.84367 5.7392 9.85289 6.90292C10.2157 6.90292 15.9675 6.90292 16.1459 6.90292Z" fill="black"/></svg>`,
  },
  {
    name: 'luma',
    // eslint-disable-next-line quotes
    svg: `<svg viewBox="0 0 121 141" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 35.6017L60.5 0.607422V140.607L0 105.606V35.6017Z" fill="black" fill-opacity="0.3"></path><path d="M60.5 140.598L0 105.596L60.5 70.594L121 105.596L60.5 140.598Z" fill="black" fill-opacity="0.3"></path><path d="M60.5 140.598L0 105.596L60.5 70.594L121 105.596L60.5 140.598Z" fill="black" fill-opacity="0.3"></path><path d="M0 35.6017L60.5 0.607422V140.607L0 105.606V35.6017Z" fill="black" fill-opacity="0.3"></path><path d="M60.5 140.598L0 105.596L60.5 70.594L121 105.596L60.5 140.598Z" fill="black" fill-opacity="0.3"></path><path d="M0 35.6017L60.5 0.607422V140.607L0 105.606V35.6017Z" fill="black" fill-opacity="0.3"></path></svg>`,
  },
  {
    name: 'kling',
    // eslint-disable-next-line quotes
    svg: `<svg viewBox="0 0 32 32" fill="none" role="img" aria-label="Kling"><path fill="black" fill-rule="evenodd" d="m26.166 4.454.106.105.003-.003c2.04 2.048 1.455 6.163-1.503 10.828l5.818 5.82-.25.487a17.3 17.3 0 0 1-3.905 5.04 17 17 0 0 1-7.414 3.864l-.1.024-.143.034-.103.023h-.001l-.226.05-.188.037-.141.027c-.15.03-.307.058-.46.084l-.128.019-.097.012q-.207.028-.412.052a15.49 15.49 0 0 1-12.605-4.361l-.096-.093c-2.044-2.048-1.465-6.166 1.497-10.834L0 9.849l.25-.487a17.1 17.1 0 0 1 3.908-5.036A17.2 17.2 0 0 1 9.774.992c.48-.173.982-.324 1.475-.452A15 15 0 0 1 12.48.265c.14-.028.298-.057.451-.083a15.45 15.45 0 0 1 13.235 4.272m-1.967.25h-.006l.006.003c-1.977-.612-5.114.377-8.43 2.562 2.523-.703 4.963-.339 6.54 1.239 1.494 1.497 1.903 3.769 1.337 6.156q-.04.191-.1.387c2.707-4.095 3.573-7.926 1.859-9.637a1 1 0 0 0-.09-.087l-.013-.012-.019-.017-.057-.044q-.037-.03-.077-.058l-.042-.03a3 3 0 0 0-.908-.462m-1.357 9.205c-.349 2.082-1.5 4.186-3.245 5.929-1.74 1.744-3.848 2.896-5.933 3.248-1.951.33-3.634-.1-4.737-1.2-1.1-1.101-1.53-2.778-1.2-4.739.349-2.08 1.497-4.185 3.234-5.926 0 0 .003 0 .01-.01l.006-.01C12.72 9.469 14.82 8.32 16.9 7.972c1.951-.33 3.63.098 4.737 1.2 1.1 1.1 1.53 2.78 1.2 4.738zm-17.68-8.46a15.6 15.6 0 0 0-3.307 4.118l-.01.003 5.048 5.036q.617-.869 1.32-1.718.246-.294.506-.598l.066-.075.24-.268c.007-.006.014-.019.014-.019l.044-.05.023-.027.035-.038.09-.1q.094-.108.195-.213c0-.007.01-.017.01-.017l.108-.118.077-.08q.005-.008.006-.006.009-.008.007-.01l.014-.018.014-.017a.2.2 0 0 0 .033-.032l.019-.02c.041-.041.09-.089.134-.137q.035-.043.08-.086l.041-.042c.007-.01.026-.029.026-.029l.077-.076.15-.148.05-.053.056-.059a33 33 0 0 1 3.457-3.017l.16-.117h.001v-.001l.002-.001.16-.118q.268-.201.54-.393.29-.198.58-.39c2.622-1.748 5.19-2.797 7.286-3.005a13.95 13.95 0 0 0-9.35-1.84c-.14.022-.274.045-.418.074-.091.016-.17.032-.25.048l-.048.01a16 16 0 0 0-2.165.607 15.6 15.6 0 0 0-5.12 3.04m.278 20.408q.42.32.957.486H6.39c1.99.608 5.115-.384 8.419-2.563-2.52.7-4.955.336-6.532-1.242-1.487-1.49-1.896-3.769-1.333-6.156q.042-.191.099-.387c-2.706 4.096-3.57 7.926-1.858 9.638q.058.057.124.115.062.056.131.109m23.292-4.37v.002a15.7 15.7 0 0 1-3.305 4.115 15.7 15.7 0 0 1-6.972 3.576l-.032.008-.086.02a3 3 0 0 1-.295.064q-.097.021-.198.037a8 8 0 0 1-.42.07l-.117.02-.133.017q-.16.022-.328.04a13.97 13.97 0 0 1-8.767-1.913c2.018-.199 4.475-1.184 6.995-2.813l.144-.094.144-.095.196-.132h.001v-.001l.379-.257q.275-.192.54-.393.166-.119.326-.237a34 34 0 0 0 3.458-3.018q.039-.04.073-.078l.03-.034q.08-.075.15-.147l.076-.076s.02-.02.023-.03q.015-.013.029-.028l.012-.013.087-.086.067-.07q.034-.032.067-.068l.018-.02a.2.2 0 0 1 .033-.031l.015-.018.014-.017s.01-.01.016-.013l.027-.029.027-.029.026-.025q-.042.044-.08.092l.062-.065.001-.002q.065-.07.129-.134s0-.01.01-.01q.088-.094.171-.19l.113-.126a.1.1 0 0 0 .035-.039l.064-.077.016-.019q.117-.125.229-.253l.078-.09q.188-.219.374-.441l.15-.179.047-.058q.09-.113.178-.22.075-.09.147-.184.045-.06.093-.117c.29-.374.569-.742.838-1.12zm0 0q0-.005.006-.008v.016l-.007-.006h.003z"/></svg>`,
  },
  {
    name: 'blackforestlabs',
    // eslint-disable-next-line quotes
    svg: `<svg viewBox="0 0 42 29.58"><path d="M29.95,12.61h-4.47l-4.47-6.29L7.08,25.93h4.48l9.46-13.32h4.47l-9.46,13.32h4.49l9.44-13.32,12.05,16.97h-7.05s0-3.64,0-3.64l-5-7.04-4.97,7.02v3.65H0L21.01,0l8.93,12.61h0Z"/></svg>`,
  },
];

// Services
async function fetchGalleryAssets(url) {
  const res = await fetch(url);
  const response = await res.json();
  return response.data;
}

function getGalleryIcon(name) {
  return CHICKET_ICONS.find((icon) => icon.name === name)?.svg;
}

function getTransformedPath(assetUrl) {
  try {
    const { pathname } = new URL(assetUrl);
    return `${window.origin}${pathname}`;
  } catch (err) {
    window.lana?.log(`Error transforming path: ${err}`, LANA_OPTIONS);
    // return non-transformed path
    return assetUrl;
  }
}

function createResponsiveImage(imageUrl, altText) {
  // Create picture element
  const picture = createTag('picture', {});
  // Add WebP sources for different screen sizes
  const sourceWebpLarge = createTag('source', {
    type: 'image/webp',
    srcset: `${imageUrl}?width=1000&format=webply&optimize=medium`,
    media: '(min-width: 600px)',
  });

  const sourceWebpSmall = createTag('source', {
    type: 'image/webp',
    srcset: `${imageUrl}?width=500&format=webply&optimize=medium`,
  });

  // JPEG fallback
  const sourceJpegLarge = createTag('source', {
    type: 'image/jpeg',
    srcset: `${imageUrl}?width=1000&format=jpg&optimize=medium`,
    media: '(min-width: 600px)',
  });

  // img fallback
  const img = createTag('img', {
    src: `${imageUrl}?width=500&format=jpg&optimize=medium`,
    alt: altText,
    class: 'gallery-cell-asset',
    width: '750',
    loading: 'eager',
    fetchpriority: 'high',
  });

  picture.appendChild(sourceWebpLarge);
  picture.appendChild(sourceWebpSmall);
  picture.appendChild(sourceJpegLarge);
  picture.appendChild(img);

  return picture;
}

function createResponsiveVideo(videoUrl, imageUrl, altText) {
  const isDesktop = window.matchMedia('(min-width: 900px)');
  const video = createTag('video', {
    src: videoUrl,
    poster: `${imageUrl}?width=${isDesktop.matches ? 1000 : 500}&format=jpg&optimize=medium`,
    alt: altText,
    class: 'gallery-cell-asset',
    autoplay: '',
    muted: '',
    loop: '',
    playsinline: '',
    preload: 'auto',
    loading: 'eager',
    tabindex: '-1',
  });

  // Play video as soon as it's loaded
  video.addEventListener('loadeddata', () => {
    video.muted = true;
    video.play().catch((err) => {
      window.lana?.log(`Error autoplaying video on load: ${err}`, LANA_OPTIONS);
    });
  });

  // Handle playing/pausing when video enters/leaves viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (video.paused) {
            video.muted = true;
            video.play().catch((err) => {
              window.lana?.log(
                `Error autoplaying video in viewport: ${err}`,
                LANA_OPTIONS,
              );
            });
          }
        } else if (!video.paused) {
          video.pause();
        }
      });
    },
    { threshold: 0.5 }, // Play with 50% of video is visible
  );

  observer.observe(video);

  return video;
}

async function populateGalleryCells(parentElem, jsonUrl) {
  const galleryCells = parentElem.querySelectorAll('.gallery-cell');
  const galleryAssets = await fetchGalleryAssets(jsonUrl);
  galleryCells.forEach((cell, index) => {
    const asset = galleryAssets[index];
    let galleryMedia;
    if (asset.asset_type === 'video') {
      galleryMedia = createResponsiveVideo(
        getTransformedPath(asset.video_url),
        getTransformedPath(asset.img_url),
        asset.alt_text,
      );
    } else {
      galleryMedia = createResponsiveImage(
        getTransformedPath(asset.img_url),
        asset.alt_text,
      );
    }

    const aiModelName = asset.ai_model;
    const iconSvg = getGalleryIcon(aiModelName);
    cell.appendChild(galleryMedia);
    if (iconSvg) {
      const cellIconElem = createTag('div', { class: `gallery-cell-icon bg-${aiModelName}` });
      cellIconElem.insertAdjacentHTML('afterbegin', iconSvg);
      cell.appendChild(cellIconElem);
    }
  });
}

function buildGalleryOutline(parentElem) {
  // Gallery will be a masonry grid with 4 columns
  const galleryOutline = createTag('div', { class: 'firefly-model-showcase-gallery' });

  // Create 4 columns
  for (let i = 0; i < 4; i += 1) {
    const column = createTag('div', { class: 'gallery-column' });

    const cellCount = i < 2 ? 2 : 3;
    for (let j = 0; j < cellCount; j += 1) {
      const cell = createTag('div', { class: 'gallery-cell' });
      column.appendChild(cell);
    }

    galleryOutline.appendChild(column);
  }

  parentElem.appendChild(galleryOutline);
}

// function decorateParallax() {}

export default async function init(el) {
  const miloLibs = getLibs('/libs');
  const { decorateButtons } = await import(`${miloLibs}/utils/decorate.js`);

  const galleryConfigRow = el.querySelector(':scope > div:nth-child(2)');
  let galleryJsonUrl = GALLERY_FALLBACK_URL;

  if (galleryConfigRow) {
    const urlCell = galleryConfigRow.querySelector(':scope > div');
    if (urlCell?.querySelector('a')?.href?.trim()) {
      galleryJsonUrl = urlCell.querySelector('a').href.trim();
    }
    galleryConfigRow.remove();
  }

  // currently using last row for parallax configs
  const parallaxConfigRow = el.querySelector(':scope > div:last-child');
  if (parallaxConfigRow.children.length >= 3) parallaxConfigRow.remove();

  const showcaseContentElem = el.querySelector(':scope > div');
  // Add class to container for styling
  showcaseContentElem.classList.add('firefly-model-showcase-content');
  showcaseContentElem
    .querySelector(':scope > div')
    .classList.add('content-container');
  // Decorate buttons
  el.classList.add('l-button');
  await decorateButtons(el);

  buildGalleryOutline(el);
  populateGalleryCells(el, galleryJsonUrl);

  new IntersectionObserver(async (entries, ob) => {
    if (entries[0].isIntersecting) {
      ob.disconnect();
      const { default: addParallaxProgress } = await import('../../features/parallax.js');
      // TODO: Handle optional feds-promo-aside
      addParallaxProgress(el, GNAV_HEIGHT, true, [{ name: 'disable-pointer', threshold: 20, type: 'exit' }]);
    }
  }).observe(el);
  const configs = Array.from(parallaxConfigRow.children).map(
    (col) => col.textContent,
  );
  const galleryColumns = [...el.querySelectorAll('.gallery-column')];
  const validKeys = [
    'base-offset',
    'parallax-distance',
    'tablet-base-offset',
    'tablet-parallax-distance',
  ];
  configs.forEach((config, index) => {
    if (index >= galleryColumns.length) return;
    const pairs = config
      .split(/\s/)
      .filter(Boolean)
      .map((line) => line
        .toLowerCase()
        .split('=')
        .filter(Boolean)
        .map((s) => s.trim()));
    pairs.forEach(([k, v]) => {
      if (!validKeys.includes(k)) return;
      galleryColumns[index].style.setProperty(`--${k}`, v);
    });
  });
}
