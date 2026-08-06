export default function init(el) {
  const [imgRow, textRow] = el.children;
  const imgContainer = imgRow.querySelector(':scope div');
  imgContainer.classList.add('img-container');
  imgRow.replaceWith(imgContainer);

  const textContainer = textRow.querySelector(':scope div');
  textContainer.classList.add('text-container');
  textRow.replaceWith(textContainer);

  // Convert strong tags to blockquote tags
  const strongTags = el.querySelectorAll('strong');
  strongTags.forEach((strong) => {
    const blockquote = document.createElement('blockquote');
    blockquote.innerHTML = strong.innerHTML;
    strong.innerHTML = '';
    strong.appendChild(blockquote);
  });
}
