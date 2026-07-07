export default function init(el) {
  const [imgRow, textRow] = el.children;
  const imgContainer = imgRow.querySelector(':scope div');
  imgContainer.classList.add('img-container');
  imgRow.replaceWith(imgContainer);

  const textContainer = textRow.querySelector(':scope div');
  textContainer.classList.add('text-container');
  // If the author used a strong.tracking-header for quoted content,
  // replace it with a semantic blockquote for better screen reader announcement.
  const strong = textContainer.querySelector('strong.tracking-header');
  if (strong) {
    const blockquote = document.createElement('blockquote');
    const p = document.createElement('p');
    // Move children from strong into the paragraph
    while (strong.firstChild) p.appendChild(strong.firstChild);
    blockquote.appendChild(p);
    // Preserve any classes from the original strong on the blockquote container
    blockquote.className = strong.className;
    strong.replaceWith(blockquote);
  }
  textRow.replaceWith(textContainer);
}
