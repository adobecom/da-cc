export default function init(el) {
  const [imgRow, textRow] = el.children;

  const imgContainer = imgRow?.querySelector(':scope div');
  if (imgContainer) {
    imgContainer.classList.add('img-container');
    imgRow.replaceWith(imgContainer);
  }

  const authoredText = textRow?.querySelector(':scope div');
  if (!authoredText) return;

  const paragraphs = [...authoredText.querySelectorAll(':scope > p')]
    .filter((p) => p.textContent.trim());

  if (!paragraphs.length) {
    authoredText.classList.add('text-container');
    textRow.replaceWith(authoredText);
    return;
  }

  const quoteParagraph = paragraphs[0];
  const attributionParagraph = paragraphs[1] || null;
  const authoredStrong = quoteParagraph.querySelector('strong.tracking-header');

  const container = document.createElement('div');
  container.className = 'text-container';

  const blockquote = document.createElement('blockquote');
  if (authoredStrong) {
    blockquote.className = authoredStrong.className;
  }

  const quoteP = document.createElement('p');
  quoteP.textContent = quoteParagraph.textContent.trim();
  blockquote.appendChild(quoteP);
  container.appendChild(blockquote);

  if (attributionParagraph) {
    const attribution = document.createElement('p');
    attribution.className = 'quote-attribution';
    attribution.textContent = attributionParagraph.textContent.trim();
    container.appendChild(attribution);
  }

  paragraphs.slice(2).forEach((p) => {
    container.appendChild(p.cloneNode(true));
  });

  textRow.replaceWith(container);
}
